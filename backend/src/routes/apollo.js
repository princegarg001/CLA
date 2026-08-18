const express = require('express');
const router = express.Router();
const apolloService = require('../services/apolloService');
const db = require('../db');
const aiService = require('../services/aiService');
const { asyncHandler, ok, clampScore } = require('../utils/helpers');
const { strictLimiter } = require('../middleware/rateLimiter');

// GET /api/apollo/search — ICP-based people search
router.get('/search', strictLimiter, asyncHandler(async (req, res) => {
  const { titles, regions, techStack, employeeRanges, limit } = req.query;
  const results = await apolloService.searchPeople({
    titles: titles ? titles.split(',') : undefined,
    regions: regions ? regions.split(',') : undefined,
    techStack: techStack ? techStack.split(',') : undefined,
    employeeRanges: employeeRanges ? employeeRanges.split(',') : undefined,
    limit: limit ? Number(limit) : undefined,
  });
  ok(res, results);
}));

// POST /api/apollo/import — swipe-right: import a search result into the CLA pipeline as a lead
router.post('/import', asyncHandler(async (req, res) => {
  const candidate = req.body || {};
  const { score } = await aiService.scoreLead(candidate).catch(() => ({ score: aiService.heuristicScore(candidate) }));
  const lead = await db.insert('leads', { source: 'apollo', status: 'new', ...candidate, score: clampScore(score) });
  ok(res, lead);
}));

router.post('/enrich', strictLimiter, asyncHandler(async (req, res) => {
  const { email } = req.body || {};
  const enriched = await apolloService.enrichPerson(email);
  ok(res, enriched);
}));

router.get('/sequences', asyncHandler(async (req, res) => {
  const sequences = await apolloService.listSequences();
  ok(res, sequences);
}));

// POST /api/apollo/sequences/:id/launch — attach a lead's Apollo contact to a sequence
router.post('/sequences/:id/launch', strictLimiter, asyncHandler(async (req, res) => {
  const { contactId } = req.body || {};
  const result = await apolloService.launchSequence({ sequenceId: req.params.id, contactId });
  ok(res, result);
}));

// ICP profile persistence (Apollo Hunter "save your ICP")
router.get('/icp', asyncHandler(async (req, res) => {
  const profiles = await db.list('icp_profiles', { orderBy: { column: 'created_at', ascending: false } });
  ok(res, profiles);
}));

router.post('/icp', asyncHandler(async (req, res) => {
  const profile = await db.insert('icp_profiles', req.body || {});
  ok(res, profile);
}));

module.exports = router;
