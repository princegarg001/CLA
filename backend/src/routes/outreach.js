const express = require('express');
const router = express.Router();
const db = require('../db');
const outreach = require('../services/outreachService');
const mailService = require('../services/mailService');
const { asyncHandler, ok, fail } = require('../utils/helpers');
const { strictLimiter } = require('../middleware/rateLimiter');

// GET /api/outreach/overview — everything the Outreach screen needs in one call:
// real stats, conversation threads, mailbox status and settings.
router.get('/overview', asyncHandler(async (req, res) => ok(res, await outreach.overview())));

// GET /api/outreach/inbox?channel=&status= — flat message list (kept for older callers)
router.get('/inbox', asyncHandler(async (req, res) => {
  const { channel, status } = req.query;
  let messages = await db.list('messages', { orderBy: { column: 'created_at', ascending: false } });
  if (channel) messages = messages.filter((m) => m.channel === channel);
  if (status) messages = messages.filter((m) => m.status === status);
  ok(res, messages);
}));

// ---- mailbox ----------------------------------------------------------------------

router.get('/status', asyncHandler(async (req, res) => ok(res, { mail: mailService.status(), settings: await outreach.getSettings() })));

// POST /api/outreach/email/verify — actually connects to SMTP and IMAP and reports each result.
router.post('/email/verify', strictLimiter, asyncHandler(async (req, res) => ok(res, await mailService.verify())));

router.get('/settings', asyncHandler(async (req, res) => ok(res, await outreach.getSettings())));
router.put('/settings', asyncHandler(async (req, res) => ok(res, await outreach.saveSettings(req.body || {}))));

// POST /api/outreach/sync — check the mailbox for replies right now (a cron also does this).
router.post('/sync', strictLimiter, asyncHandler(async (req, res) => ok(res, await outreach.syncReplies())));

// POST /api/outreach/followups/run — build due follow-up drafts right now.
router.post('/followups/run', strictLimiter, asyncHandler(async (req, res) => ok(res, await outreach.runFollowups())));

// ---- do-not-contact list ----------------------------------------------------------

router.get('/suppressed', asyncHandler(async (req, res) => ok(res, await outreach.getSuppressed())));
router.delete('/suppressed/:email', asyncHandler(async (req, res) => {
  await outreach.unsuppress(decodeURIComponent(req.params.email));
  ok(res, await outreach.getSuppressed());
}));

// ---- messages ---------------------------------------------------------------------

// POST /api/outreach/generate — AI (or a template) drafts an email for a lead.
router.post('/generate', asyncHandler(async (req, res) => {
  const { leadId, tone, market, channel, templateId } = req.body || {};
  if (!leadId || !channel) return fail(res, 400, 'leadId and channel are required');
  ok(res, await outreach.createDraft({ leadId, channel, tone, market, templateId }));
}));

// POST /api/outreach/messages — save a hand-written draft.
router.post('/messages', asyncHandler(async (req, res) => {
  const { leadId, channel = 'apollo_email', subject, body, to, tone, market } = req.body || {};
  if (!body || !String(body).trim()) return fail(res, 400, 'body is required');
  ok(res, await outreach.createDraft({ leadId, channel, subject, body, to, tone, market }));
}));

// POST /api/outreach/from-lead — used by Daily Leads: turn a lead's drafted message into an email,
// and optionally send it in the same step.
router.post('/from-lead', strictLimiter, asyncHandler(async (req, res) => {
  const { leadId, subject, body, send, force } = req.body || {};
  if (!leadId || !body) return fail(res, 400, 'leadId and body are required');
  const draft = await outreach.createDraft({ leadId, channel: 'email', subject: subject || 'Quick question', body });
  if (!send) return ok(res, { message: draft });
  ok(res, await outreach.sendMessage(draft.id, { force: !!force }));
}));

// POST /api/outreach/threads/:leadId/draft-reply — AI suggests the next reply (nothing is sent).
router.post('/threads/:leadId/draft-reply', strictLimiter, asyncHandler(async (req, res) => ok(res, await outreach.draftThreadReply(req.params.leadId))));

// POST /api/outreach/threads/:leadId/reply { body, subject? } — answer inside the conversation and send it.
router.post('/threads/:leadId/reply', strictLimiter, asyncHandler(async (req, res) => {
  ok(res, await outreach.replyToThread(req.params.leadId, { body: req.body && req.body.body, subject: req.body && req.body.subject }));
}));

// PATCH /api/outreach/messages/:id — edit a draft. Status changes go through the explicit actions
// below, so nothing can be marked "sent" without actually being sent.
router.patch('/messages/:id', asyncHandler(async (req, res) => {
  const existing = await db.get('messages', req.params.id);
  if (!existing) return fail(res, 404, 'Message not found');
  if (req.body && req.body.status) return fail(res, 400, 'Use /send, /mark-sent or /replied to change a message status');
  if (!['draft', 'failed'].includes(existing.status)) return fail(res, 409, `A ${existing.status} message can no longer be edited`);
  const { subject, body, channel, tone, market, to } = req.body || {};
  const patch = {};
  if (typeof subject === 'string') patch.subject = subject.slice(0, 300);
  if (typeof body === 'string') patch.body = body;
  if (typeof channel === 'string') patch.channel = channel;
  if (typeof tone === 'string') patch.tone = tone;
  if (typeof market === 'string') patch.market = market;
  if (typeof to === 'string') patch.meta = { ...(existing.meta || {}), to: to.trim() };
  ok(res, await db.update('messages', req.params.id, patch));
}));

// POST /api/outreach/messages/:id/send { force? } — really sends the email.
router.post('/messages/:id/send', strictLimiter, asyncHandler(async (req, res) => {
  ok(res, await outreach.sendMessage(req.params.id, { force: !!(req.body && req.body.force) }));
}));

// POST /api/outreach/messages/:id/mark-sent — for LinkedIn/Twitter/Reddit/etc: you sent it there.
router.post('/messages/:id/mark-sent', asyncHandler(async (req, res) => ok(res, await outreach.markSent(req.params.id))));

// POST /api/outreach/messages/:id/replied { text? } — record a reply that arrived outside the mailbox.
router.post('/messages/:id/replied', asyncHandler(async (req, res) => ok(res, await outreach.recordReply(req.params.id, { text: req.body && req.body.text }))));

router.delete('/messages/:id', asyncHandler(async (req, res) => {
  const existing = await db.get('messages', req.params.id);
  if (!existing) return fail(res, 404, 'Message not found');
  if (!['draft', 'failed'].includes(existing.status)) return fail(res, 409, 'Only drafts can be deleted; sent messages are your record');
  await db.remove('messages', req.params.id);
  ok(res, { id: req.params.id });
}));

// ---- templates --------------------------------------------------------------------

router.get('/templates', asyncHandler(async (req, res) => ok(res, await db.list('templates'))));

router.post('/templates', asyncHandler(async (req, res) => {
  const { name, category, tone, market, body } = req.body || {};
  if (!name || !body) return fail(res, 400, 'name and body are required');
  ok(res, await db.insert('templates', { name, category: category || null, tone: tone || null, market: market || null, body }));
}));

router.put('/templates/:id', asyncHandler(async (req, res) => {
  const { name, category, tone, market, body } = req.body || {};
  const updated = await db.update('templates', req.params.id, { name, category, tone, market, body });
  if (!updated) return fail(res, 404, 'Template not found');
  ok(res, updated);
}));

router.delete('/templates/:id', asyncHandler(async (req, res) => {
  await db.remove('templates', req.params.id);
  ok(res, { id: req.params.id });
}));

module.exports = router;
