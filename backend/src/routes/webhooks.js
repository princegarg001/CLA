const express = require('express');
const router = express.Router();
const config = require('../config');
const db = require('../db');
const aiService = require('../services/aiService');
const emailService = require('../services/emailService');
const upworkService = require('../services/upworkService');
const leadPipelineService = require('../services/leadPipelineService');
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
  const candidate = { source: 'betalist', email, name, intent_signal: 'BetaList SaaS subscriber' };
  const { score } = await aiService.scoreLead(candidate).catch(() => ({ score: aiService.heuristicScore(candidate) }));
  const lead = await db.insert('leads', { status: 'new', ...candidate, score: clampScore(score) });
  leadPipelineService.onLeadCreated(lead).catch(() => {});
  ok(res, lead);
}));

// POST /api/webhooks/gumroad — sale notification -> capture email, score, feed Workflow 4's
// 48h auto-follow-up (cron/gumroadFollowUp.js) if it scores high and goes quiet.
router.post('/gumroad', asyncHandler(async (req, res) => {
  const { email, product_name: product } = req.body || {};
  if (!email) return fail(res, 400, 'email is required');
  const candidate = { source: 'gumroad', email, intent_signal: `Downloaded ${product || 'a Gumroad resource'}` };
  const { score } = await aiService.scoreLead(candidate).catch(() => ({ score: aiService.heuristicScore(candidate) }));
  const lead = await db.insert('leads', { status: 'new', ...candidate, score: clampScore(score) });
  leadPipelineService.onLeadCreated(lead).catch(() => {});
  ok(res, lead);
}));

// POST /api/webhooks/upwork — real-time job alert from a third-party watcher
// (Vollna's own webhook payload shape, most commonly). Scores + drafts a
// proposal immediately so the app can push-notify on score 8+ jobs the
// moment they land — speed-to-apply is the whole game on Upwork.
router.post('/upwork', asyncHandler(async (req, res) => {
  const secret = req.header('X-Upwork-Secret') || req.query.secret;
  if (config.upworkWebhookSecret && secret !== config.upworkWebhookSecret) return fail(res, 401, 'Invalid webhook secret');

  const parsed = upworkService.parseJobWebhook(req.body || {}, 'vollna');
  if (!parsed.title) return fail(res, 400, 'title is required in the webhook payload');

  const { score, reason } = await upworkService.scoreJob(parsed);
  const proposal = score >= 6 ? await upworkService.generateProposal(parsed) : null;
  const job = await db.insert('upwork_jobs', {
    ...parsed,
    ai_score: clampScore(score),
    ai_score_reason: reason,
    ai_proposal: proposal,
    status: 'new',
  });
  ok(res, job);
}));

// POST /api/webhooks/email — inbound parsed email (SolidGigs / Contra job forwards, or contact form via email)
// Only known `leads` columns are set at top level; everything email-specific
// (raw body, sender, forward timestamp) goes into `raw` so this works against
// the fixed-column Supabase schema, not just the schema-less JSON fallback.
router.post('/email', asyncHandler(async (req, res) => {
  const parsed = emailService.parseInboundJobEmail(req.body || {});
  const source = req.query.source || req.body.source || 'email';

  // Upwork job forwards land in upwork_jobs (scored + proposal-drafted), not
  // the generic leads table other email sources use — different shape, different screen.
  if (source === 'upwork') {
    const job = upworkService.parseJobWebhook({ title: parsed.subject, description: parsed.body }, 'email');
    const { score, reason } = await upworkService.scoreJob(job);
    const proposal = score >= 6 ? await upworkService.generateProposal(job) : null;
    const inserted = await db.insert('upwork_jobs', { ...job, ai_score: clampScore(score), ai_score_reason: reason, ai_proposal: proposal, status: 'new' });
    return ok(res, inserted);
  }

  const candidate = {
    source,
    intent_signal: parsed.subject || 'Inbound email lead',
    raw: { body: parsed.body, from: parsed.from, receivedAt: parsed.receivedAt },
  };
  const { score } = await aiService.scoreLead(candidate).catch(() => ({ score: aiService.heuristicScore(candidate) }));
  const lead = await db.insert('leads', { status: 'new', ...candidate, score: clampScore(score) });
  leadPipelineService.onLeadCreated(lead).catch(() => {});
  ok(res, lead);
}));

module.exports = router;
