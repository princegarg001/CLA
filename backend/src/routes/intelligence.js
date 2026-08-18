const express = require('express');
const router = express.Router();
const db = require('../db');
const aiService = require('../services/aiService');
const { asyncHandler, ok, fail, clampScore } = require('../utils/helpers');

// POST /api/intelligence/score — score an arbitrary lead payload without persisting it
router.post('/score', asyncHandler(async (req, res) => {
  const result = await aiService.scoreLead(req.body || {});
  ok(res, { ...result, score: clampScore(result.score) });
}));

// POST /api/intelligence/brief/:leadId — generate and store the pre-call AI brief for a lead
router.post('/brief/:leadId', asyncHandler(async (req, res) => {
  const lead = await db.get('leads', req.params.leadId);
  if (!lead) return fail(res, 404, 'Lead not found');
  const brief = await aiService.generateLeadBrief(lead);
  const updated = await db.update('leads', lead.id, { ai_brief: brief });
  ok(res, updated);
}));

// GET /api/intelligence/weekly-report — Monday 7am push notification content, also fetchable on demand
router.get('/weekly-report', asyncHandler(async (req, res) => {
  const [leads, deals] = await Promise.all([db.list('leads'), db.list('deals')]);
  const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const newLeads = leads.filter((l) => new Date(l.created_at).getTime() >= since);
  const newDeals = deals.filter((d) => new Date(d.closed_at || d.created_at).getTime() >= since);
  const callsBooked = newLeads.filter((l) => l.status === 'call_booked' || l.status === 'closed_won').length;

  const metrics = {
    newLeads: newLeads.length,
    callsBooked,
    dealsClosed: newDeals.length,
    revenueClosed: newDeals.reduce((s, d) => s + (Number(d.value) || 0), 0),
  };
  const insight = await aiService.weeklyStrategicInsight(metrics);
  ok(res, { ...metrics, insight });
}));

module.exports = router;
