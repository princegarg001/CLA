const express = require('express');
const router = express.Router();
const db = require('../db');
const publishEngine = require('../services/publishEngine');
const contentCalendarCron = require('../cron/contentCalendar');
const { asyncHandler, ok, fail } = require('../utils/helpers');

// GET /api/calendar — the unified week-view. Optional from/to (ISO dates) and status filter.
router.get('/', asyncHandler(async (req, res) => {
  const { status, from, to } = req.query;
  let entries = await db.list('content_calendar', { orderBy: { column: 'scheduled_for', ascending: true } });
  if (status) entries = entries.filter((e) => e.status === status);
  if (from) entries = entries.filter((e) => e.scheduled_for >= from);
  if (to) entries = entries.filter((e) => e.scheduled_for <= to);
  ok(res, entries);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const entry = await db.get('content_calendar', req.params.id);
  if (!entry) return fail(res, 404, 'Calendar entry not found');
  ok(res, entry);
}));

// POST /api/calendar — compose once, target multiple platforms, schedule for later.
router.post('/', asyncHandler(async (req, res) => {
  const { content, mediaUrls, platforms, postType, scheduledFor, timezone, raw } = req.body || {};
  if (!content && !(mediaUrls && mediaUrls.length)) return fail(res, 400, 'content or mediaUrls is required');
  if (!Array.isArray(platforms) || !platforms.length) return fail(res, 400, 'platforms must be a non-empty array');
  if (!scheduledFor) return fail(res, 400, 'scheduledFor is required');

  const entry = await db.insert('content_calendar', {
    content: content || '',
    media_urls: mediaUrls || [],
    platforms,
    post_type: postType || 'post',
    scheduled_for: scheduledFor,
    timezone: timezone || undefined,
    status: 'scheduled',
    ai_generated: false,
    results: [],
    engagement: {},
    raw: raw || {},
  });
  ok(res, entry);
}));

// PATCH /api/calendar/:id — edit content/platform/time, or drag-to-reschedule.
router.patch('/:id', asyncHandler(async (req, res) => {
  const { content, mediaUrls, platforms, postType, scheduledFor, timezone, status, raw } = req.body || {};
  const patch = {};
  if (content !== undefined) patch.content = content;
  if (mediaUrls !== undefined) patch.media_urls = mediaUrls;
  if (platforms !== undefined) patch.platforms = platforms;
  if (postType !== undefined) patch.post_type = postType;
  if (scheduledFor !== undefined) patch.scheduled_for = scheduledFor;
  if (timezone !== undefined) patch.timezone = timezone;
  if (status !== undefined) patch.status = status;
  if (raw !== undefined) patch.raw = raw;
  const updated = await db.update('content_calendar', req.params.id, patch);
  if (!updated) return fail(res, 404, 'Calendar entry not found');
  ok(res, updated);
}));

// POST /api/calendar/:id/approve — flips an AI-drafted post from 'draft' to
// 'scheduled' so the postScheduler cron will pick it up at its scheduled_for.
router.post('/:id/approve', asyncHandler(async (req, res) => {
  const updated = await db.update('content_calendar', req.params.id, { status: 'scheduled' });
  if (!updated) return fail(res, 404, 'Calendar entry not found');
  ok(res, updated);
}));

// POST /api/calendar/:id/publish — publish right now instead of waiting for scheduled_for.
router.post('/:id/publish', asyncHandler(async (req, res) => {
  const entry = await db.get('content_calendar', req.params.id);
  if (!entry) return fail(res, 404, 'Calendar entry not found');
  const { overall, results } = await publishEngine.publishCalendarEntry(entry);
  const updated = await db.update('content_calendar', entry.id, { status: overall, results });
  ok(res, updated);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await db.update('content_calendar', req.params.id, { status: 'cancelled' });
  ok(res, { id: req.params.id, status: 'cancelled' });
}));

// POST /api/calendar/fill-week — the "One-tap Fill Week" trigger; runs the
// same AI planning the Sunday-night cron runs, on demand.
router.post('/fill-week', asyncHandler(async (req, res) => {
  const result = await contentCalendarCron.run();
  ok(res, result);
}));

module.exports = router;
