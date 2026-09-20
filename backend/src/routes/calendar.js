const express = require('express');
const router = express.Router();
const db = require('../db');
const publishEngine = require('../services/publishEngine');
const rules = require('../services/socialRules');
const contentCalendarCron = require('../cron/contentCalendar');
const { asyncHandler, ok, fail } = require('../utils/helpers');

const EDITABLE = ['draft', 'scheduled', 'failed', 'partial'];
const PUBLISHABLE = ['draft', 'scheduled', 'failed', 'partial'];

function invalid(res, validation) {
  return res.status(400).json({
    ok: false,
    error: validation.errors.map((e) => (e.platform ? `${e.platform}: ${e.message}` : e.message)).join(' · '),
    details: validation,
  });
}

// Runs an entry through the engine under an atomic claim so two clicks (or a
// click racing the scheduler) can't publish it twice.
async function publishClaimed(entry, only) {
  const claimed = await db.claim('content_calendar', entry.id, { where: { status: entry.status }, patch: { status: 'publishing' } });
  if (!claimed) return null;
  const { overall, results } = await publishEngine.publishCalendarEntry(claimed, { only });
  return db.update('content_calendar', entry.id, {
    status: overall,
    results,
    raw: { ...(claimed.raw || {}), attempts: (claimed.raw?.attempts || 0) + 1, next_attempt_at: null },
  });
}

// GET /api/calendar — the unified week-view. Optional from/to (ISO dates),
// status filter, and hideCancelled=1 to drop soft-deleted rows.
router.get('/', asyncHandler(async (req, res) => {
  const { status, from, to, hideCancelled } = req.query;
  let entries = await db.list('content_calendar', { orderBy: { column: 'scheduled_for', ascending: true } });
  if (status) entries = entries.filter((e) => e.status === status);
  if (hideCancelled === '1' || hideCancelled === 'true') entries = entries.filter((e) => e.status !== 'cancelled');
  if (from) entries = entries.filter((e) => e.scheduled_for >= from);
  if (to) entries = entries.filter((e) => e.scheduled_for <= to);
  ok(res, entries);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const entry = await db.get('content_calendar', req.params.id);
  if (!entry) return fail(res, 404, 'Calendar entry not found');
  ok(res, entry);
}));

// POST /api/calendar — compose once, tailor per platform (variants), attach
// media, and either save as a draft, schedule for later, or publish right now.
router.post('/', asyncHandler(async (req, res) => {
  const { content, mediaUrls, media, platforms, postType, scheduledFor, timezone, variants, raw, status, publishNow } = req.body || {};
  if (!Array.isArray(platforms) || !platforms.length) return fail(res, 400, 'platforms must be a non-empty array');

  const mediaItems = Array.isArray(media) ? media : (mediaUrls || []).map((url) => ({ url, type: rules.inferMediaType(url) }));
  const target = publishNow ? 'publishing' : status === 'draft' ? 'draft' : 'scheduled';
  if (target === 'scheduled' && !scheduledFor) return fail(res, 400, 'scheduledFor is required to schedule a post');
  const when = scheduledFor ? new Date(scheduledFor) : new Date();
  if (Number.isNaN(when.getTime())) return fail(res, 400, 'scheduledFor is not a valid date');

  const row = {
    content: content || '',
    media_urls: mediaItems.map((m) => m.url),
    platforms,
    post_type: postType || 'post',
    scheduled_for: when.toISOString(),
    timezone: timezone || undefined,
    status: target,
    ai_generated: false,
    results: [],
    engagement: {},
    raw: { ...(raw || {}), media: mediaItems, variants: variants || {} },
  };

  // Drafts may be half-written; everything that will actually send must pass.
  if (target !== 'draft') {
    const validation = rules.validateEntry(row);
    if (!validation.ok) return invalid(res, validation);
  }

  const entry = await db.insert('content_calendar', row);
  if (!publishNow) return ok(res, entry);

  const { overall, results } = await publishEngine.publishCalendarEntry(entry);
  const updated = await db.update('content_calendar', entry.id, { status: overall, results, raw: { ...row.raw, attempts: 1 } });
  ok(res, updated);
}));

// PATCH /api/calendar/:id — edit content/platforms/media/variants/time.
router.patch('/:id', asyncHandler(async (req, res) => {
  const existing = await db.get('content_calendar', req.params.id);
  if (!existing) return fail(res, 404, 'Calendar entry not found');
  if (!EDITABLE.includes(existing.status)) return fail(res, 409, `A ${existing.status} post can't be edited`);

  const { content, mediaUrls, media, platforms, postType, scheduledFor, timezone, variants, status, raw } = req.body || {};
  const patch = {};
  if (content !== undefined) patch.content = content;
  if (platforms !== undefined) patch.platforms = platforms;
  if (postType !== undefined) patch.post_type = postType;
  if (timezone !== undefined) patch.timezone = timezone;
  if (scheduledFor !== undefined) {
    const when = new Date(scheduledFor);
    if (Number.isNaN(when.getTime())) return fail(res, 400, 'scheduledFor is not a valid date');
    patch.scheduled_for = when.toISOString();
  }
  if (status !== undefined) {
    if (!['draft', 'scheduled', 'cancelled'].includes(status)) return fail(res, 400, 'status can only be draft, scheduled or cancelled');
    patch.status = status;
  }

  const nextRaw = { ...(existing.raw || {}), ...(raw || {}) };
  if (media !== undefined) {
    nextRaw.media = media;
    patch.media_urls = media.map((m) => m.url);
  } else if (mediaUrls !== undefined) {
    nextRaw.media = mediaUrls.map((url) => ({ url, type: rules.inferMediaType(url) }));
    patch.media_urls = mediaUrls;
  }
  if (variants !== undefined) nextRaw.variants = variants;
  // Changing anything resets retry bookkeeping so an edit gets a clean run.
  nextRaw.attempts = 0;
  nextRaw.next_attempt_at = null;
  patch.raw = nextRaw;

  const merged = { ...existing, ...patch };
  if (merged.status === 'scheduled') {
    const validation = rules.validateEntry(merged);
    if (!validation.ok) return invalid(res, validation);
  }
  // Editing a failed/partial post puts it back in play.
  if (['failed', 'partial'].includes(existing.status) && patch.status === undefined) patch.status = 'draft';

  ok(res, await db.update('content_calendar', existing.id, patch));
}));

// POST /api/calendar/:id/approve — draft → scheduled (validated first).
router.post('/:id/approve', asyncHandler(async (req, res) => {
  const entry = await db.get('content_calendar', req.params.id);
  if (!entry) return fail(res, 404, 'Calendar entry not found');
  const validation = rules.validateEntry(entry);
  if (!validation.ok) return invalid(res, validation);
  ok(res, await db.update('content_calendar', entry.id, { status: 'scheduled' }));
}));

// POST /api/calendar/:id/publish and /retry — send now. Platforms that already
// succeeded are skipped by the engine, so retrying a partial post only
// re-sends what failed.
async function sendNow(req, res) {
  const entry = await db.get('content_calendar', req.params.id);
  if (!entry) return fail(res, 404, 'Calendar entry not found');
  if (!PUBLISHABLE.includes(entry.status)) return fail(res, 409, `A ${entry.status} post can't be published`);
  const only = Array.isArray(req.body?.platforms) && req.body.platforms.length ? req.body.platforms : undefined;
  const updated = await publishClaimed(entry, only);
  if (!updated) return fail(res, 409, 'This post is already being published');
  ok(res, updated);
}
router.post('/:id/publish', asyncHandler(sendNow));
router.post('/:id/retry', asyncHandler(sendNow));

// POST /api/calendar/:id/duplicate — copy as a fresh draft (reuse a winner).
router.post('/:id/duplicate', asyncHandler(async (req, res) => {
  const entry = await db.get('content_calendar', req.params.id);
  if (!entry) return fail(res, 404, 'Calendar entry not found');
  const copy = await db.insert('content_calendar', {
    content: entry.content,
    media_urls: entry.media_urls || [],
    platforms: entry.platforms,
    post_type: entry.post_type,
    scheduled_for: new Date(Date.now() + 86400000).toISOString(),
    timezone: entry.timezone,
    status: 'draft',
    ai_generated: false,
    results: [],
    engagement: {},
    raw: { ...(entry.raw || {}), attempts: 0, next_attempt_at: null },
  });
  ok(res, copy);
}));

// DELETE /api/calendar/:id — soft-cancel by default; ?permanent=true removes
// the row (not allowed mid-publish).
router.delete('/:id', asyncHandler(async (req, res) => {
  const entry = await db.get('content_calendar', req.params.id);
  if (!entry) return fail(res, 404, 'Calendar entry not found');
  if (entry.status === 'publishing') return fail(res, 409, "This post is being published right now — wait for it to finish");
  if (req.query.permanent === 'true') {
    await db.remove('content_calendar', entry.id);
    return ok(res, { id: entry.id, deleted: true });
  }
  await db.update('content_calendar', entry.id, { status: 'cancelled' });
  ok(res, { id: entry.id, status: 'cancelled' });
}));

// POST /api/calendar/fill-week — the "One-tap Fill Week" trigger; runs the
// same AI planning the Sunday-night cron runs, on demand.
router.post('/fill-week', asyncHandler(async (req, res) => {
  const result = await contentCalendarCron.run();
  ok(res, result);
}));

module.exports = router;
