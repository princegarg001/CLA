const express = require('express');
const router = express.Router();
const db = require('../db');
const aiService = require('../services/aiService');
const leadPipelineService = require('../services/leadPipelineService');
const { asyncHandler, ok, fail, clampScore } = require('../utils/helpers');

// GET /api/leads?status=&source=&minScore=
router.get('/', asyncHandler(async (req, res) => {
  const { status, source, minScore } = req.query;
  let leads = await db.list('leads', { orderBy: { column: 'created_at', ascending: false } });
  if (status) leads = leads.filter((l) => l.status === status);
  if (source) leads = leads.filter((l) => l.source === source);
  if (minScore) leads = leads.filter((l) => (l.score || 0) >= Number(minScore));
  ok(res, leads);
}));

// GET /api/leads/pipeline — counts by status, used by War Room + Revenue Command
router.get('/pipeline', asyncHandler(async (req, res) => {
  const leads = await db.list('leads');
  const stages = ['new', 'contacted', 'replied', 'call_booked', 'proposal_sent', 'closed_won', 'closed_lost'];
  const pipeline = stages.reduce((acc, stage) => {
    acc[stage] = leads.filter((l) => l.status === stage).length;
    return acc;
  }, {});
  ok(res, pipeline);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const lead = await db.get('leads', req.params.id);
  if (!lead) return fail(res, 404, 'Lead not found');
  ok(res, lead);
}));

// POST /api/leads — create a lead from any source; auto-scores it on creation.
router.post('/', asyncHandler(async (req, res) => {
  const body = req.body || {};
  const { score } = await aiService.scoreLead(body).catch(() => ({ score: aiService.heuristicScore(body) }));
  const lead = await db.insert('leads', { status: 'new', ...body, score: clampScore(score) });
  // Fire-and-forget: score 8+ gets a brief + outreach draft prepared in the
  // background (Workflow 4) without holding up the response for two AI calls.
  leadPipelineService.onLeadCreated(lead).catch(() => {});
  ok(res, lead);
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const updated = await db.update('leads', req.params.id, req.body || {});
  if (!updated) return fail(res, 404, 'Lead not found');
  ok(res, updated);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await db.remove('leads', req.params.id);
  ok(res, { id: req.params.id });
}));

// POST /api/leads/:id/score — re-run AI scoring on an existing lead
router.post('/:id/score', asyncHandler(async (req, res) => {
  const lead = await db.get('leads', req.params.id);
  if (!lead) return fail(res, 404, 'Lead not found');
  const { score, reason } = await aiService.scoreLead(lead);
  const updated = await db.update('leads', req.params.id, { score: clampScore(score) });
  ok(res, { ...updated, scoreReason: reason });
}));

module.exports = router;
