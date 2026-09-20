const express = require('express');
const router = express.Router();
const db = require('../db');
const engine = require('../services/recommendationEngine');
const { asyncHandler, ok, fail } = require('../utils/helpers');

// GET /api/recommendations — today's plan with each lead joined in. Never triggers a
// fetch itself (that takes a while); the daily cron or POST /refresh does.
router.get('/', asyncHandler(async (req, res) => ok(res, await engine.getToday())));

// POST /api/recommendations/refresh — run a batch now. Appends to today's plan, and
// never re-recommends anything already seen, so "find more" is safe to click.
router.post('/refresh', asyncHandler(async (req, res) => {
  await engine.generateBatch();
  ok(res, await engine.getToday());
}));

// POST /api/recommendations/assist { text, url? } — paste a post you found anywhere; get a verdict,
// the need in one line, and a helpful reply to post yourself. Nothing is posted for you.
router.post('/assist', asyncHandler(async (req, res) => {
  ok(res, await engine.assistReply({ text: req.body && req.body.text, url: req.body && req.body.url }));
}));

// POST /api/recommendations/:leadId/dismiss { reason } — "not a fit": feeds the source weighting.
router.post('/:leadId/dismiss', asyncHandler(async (req, res) => {
  const lead = await engine.dismiss(req.params.leadId, (req.body && req.body.reason) || 'not a fit');
  if (!lead) return fail(res, 404, 'Lead not found');
  ok(res, lead);
}));

// GET /api/recommendations/sources — which sources are actually producing replies.
router.get('/sources', asyncHandler(async (req, res) => {
  ok(res, engine.sourceStats(await db.list('leads')));
}));

router.get('/icp', asyncHandler(async (req, res) => ok(res, await engine.getIcp())));

router.put('/icp', asyncHandler(async (req, res) => {
  const b = req.body || {};
  const list = (v) => (Array.isArray(v) ? v.map((s) => String(s).trim().toLowerCase()).filter(Boolean).slice(0, 80) : undefined);
  const next = {};
  if (list(b.keywords)) next.keywords = list(b.keywords);
  if (list(b.exclude)) next.exclude = list(b.exclude);
  if (b.minScore != null) next.minScore = Math.max(0, Math.min(90, Number(b.minScore) || 0));
  if (b.count != null) next.count = Math.max(3, Math.min(25, Math.round(Number(b.count)) || 10));
  const current = await engine.getIcp();
  await db.updateSettings({ icp: { ...current, ...next } });
  ok(res, await engine.getIcp());
}));

module.exports = router;
