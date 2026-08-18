const express = require('express');
const router = express.Router();
const db = require('../db');
const aiService = require('../services/aiService');
const { asyncHandler, ok, fail } = require('../utils/helpers');

// GET /api/outreach/inbox?channel=&status= — unified inbox across every channel
router.get('/inbox', asyncHandler(async (req, res) => {
  const { channel, status } = req.query;
  let messages = await db.list('messages', { orderBy: { column: 'created_at', ascending: false } });
  if (channel) messages = messages.filter((m) => m.channel === channel);
  if (status) messages = messages.filter((m) => m.status === status);
  ok(res, messages);
}));

// POST /api/outreach/generate — AI drafts a message for a lead in the requested tone/market
router.post('/generate', asyncHandler(async (req, res) => {
  const { leadId, tone, market, channel } = req.body || {};
  if (!leadId || !channel) return fail(res, 400, 'leadId and channel are required');
  const lead = await db.get('leads', leadId);
  if (!lead) return fail(res, 404, 'Lead not found');

  const body = await aiService.generateOutreachMessage({ lead, tone, market, channel });
  const draft = await db.insert('messages', {
    leadId, channel, tone, market, body, direction: 'outbound', aiGenerated: true, status: 'draft',
  });
  ok(res, draft);
}));

router.post('/messages', asyncHandler(async (req, res) => {
  const message = await db.insert('messages', { direction: 'outbound', status: 'draft', ...req.body });
  ok(res, message);
}));

// PATCH /api/outreach/messages/:id — approve/edit, and send when status becomes "sent"
router.patch('/messages/:id', asyncHandler(async (req, res) => {
  const existing = await db.get('messages', req.params.id);
  if (!existing) return fail(res, 404, 'Message not found');

  const patch = { ...req.body };
  if (patch.status === 'sent' && existing.channel === 'twitter_dm') {
    // Twitter DMs require Basic tier+; postTweet path only applies to public tweets, not DMs —
    // sending logic for DMs is a placeholder until Basic tier credentials are wired in.
    patch.sentAt = new Date().toISOString();
  } else if (patch.status === 'sent') {
    patch.sentAt = new Date().toISOString();
  }
  const updated = await db.update('messages', req.params.id, patch);
  ok(res, updated);
}));

router.get('/templates', asyncHandler(async (req, res) => {
  const templates = await db.list('templates');
  ok(res, templates);
}));

router.post('/templates', asyncHandler(async (req, res) => {
  const template = await db.insert('templates', req.body || {});
  ok(res, template);
}));

module.exports = router;
