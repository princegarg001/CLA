const express = require('express');
const router = express.Router();
const config = require('../config');
const db = require('../db');
const aiService = require('../services/aiService');
const emailService = require('../services/emailService');
const { asyncHandler, ok, fail, clampScore } = require('../utils/helpers');

// POST /api/webhooks/gro — Gro.app automation flow output (e.g. "no reply in 5 days -> flag warm re-engage")
router.post('/gro', asyncHandler(async (req, res) => {
  const secret = req.header('X-Gro-Secret') || req.query.secret;
  if (config.groSecret && secret !== config.groSecret) return fail(res, 401, 'Invalid webhook secret');
  const run = await db.insert('agent_runs', { agent: 'gro_flow', trigger: 'webhook', status: 'success', input: req.body, finished_at: new Date().toISOString() });
  ok(res, run);
}));

// POST /api/webhooks/betalist — new subscriber signup on the AlphoTech BetaList listing
router.post('/betalist', asyncHandler(async (req, res) => {
  const { email, name } = req.body || {};
  if (!email) return fail(res, 400, 'email is required');
  const lead = await db.insert('leads', {
    source: 'betalist', status: 'new', email, name, intent_signal: 'BetaList SaaS subscriber', score: 5,
  });
  ok(res, lead);
}));

// POST /api/webhooks/gumroad — sale notification -> capture email, score, add to Apollo sequence later
router.post('/gumroad', asyncHandler(async (req, res) => {
  const { email, product_name: product } = req.body || {};
  if (!email) return fail(res, 400, 'email is required');
  const lead = await db.insert('leads', {
    source: 'gumroad', status: 'new', email, intent_signal: `Downloaded ${product || 'a Gumroad resource'}`, score: 5,
  });
  ok(res, lead);
}));

// POST /api/webhooks/email — inbound parsed email (SolidGigs / Contra job forwards, or contact form via email)
// Only known `leads` columns are set at top level; everything email-specific
// (raw body, sender, forward timestamp) goes into `raw` so this works against
// the fixed-column Supabase schema, not just the schema-less JSON fallback.
router.post('/email', asyncHandler(async (req, res) => {
  const parsed = emailService.parseInboundJobEmail(req.body || {});
  const source = req.query.source || req.body.source || 'email';
  const candidate = {
    source,
    intent_signal: parsed.subject || 'Inbound email lead',
    raw: { body: parsed.body, from: parsed.from, receivedAt: parsed.receivedAt },
  };
  const { score } = await aiService.scoreLead(candidate).catch(() => ({ score: aiService.heuristicScore(candidate) }));
  const lead = await db.insert('leads', { status: 'new', ...candidate, score: clampScore(score) });
  ok(res, lead);
}));

module.exports = router;
