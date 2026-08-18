const express = require('express');
const router = express.Router();
const agentscopeService = require('../services/agentscopeService');
const verdentService = require('../services/verdentService');
const headaiService = require('../services/headaiService');
const db = require('../db');
const { asyncHandler, ok, fail } = require('../utils/helpers');

router.get('/status', asyncHandler(async (req, res) => {
  ok(res, await agentscopeService.getStatus());
}));

router.get('/runs', asyncHandler(async (req, res) => {
  const { agent } = req.query;
  const runs = await db.list('agent_runs', {
    filters: agent ? { agent } : {},
    orderBy: { column: 'started_at', ascending: false },
    limit: 50,
  });
  ok(res, runs);
}));

// POST /api/agents/:agent/trigger — run Prospector / Publisher / Researcher on demand
router.post('/:agent/trigger', asyncHandler(async (req, res) => {
  const { agent } = req.params;
  if (!agentscopeService.AGENTS.includes(agent)) return fail(res, 400, `Unknown agent. Expected: ${agentscopeService.AGENTS.join(', ')}`);

  const run = await db.insert('agent_runs', { agent, trigger: 'manual', status: 'running', input: req.body || {} });
  try {
    const output = await agentscopeService.triggerAgent(agent, req.body || {});
    const finished = await db.update('agent_runs', run.id, { status: 'success', output, finished_at: new Date().toISOString() });
    ok(res, finished);
  } catch (e) {
    await db.update('agent_runs', run.id, { status: 'failed', error: e.message, finished_at: new Date().toISOString() });
    throw e;
  }
}));

router.get('/verdent/insights', asyncHandler(async (req, res) => {
  const metrics = req.query;
  ok(res, await verdentService.getInsights(metrics));
}));

router.get('/headai/signals', asyncHandler(async (req, res) => {
  const { region, minRoles, days } = req.query;
  ok(res, await headaiService.getHiringSignals({
    region,
    minRoles: minRoles ? Number(minRoles) : undefined,
    days: days ? Number(days) : undefined,
  }));
}));

module.exports = router;
