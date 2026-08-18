const express = require('express');
const router = express.Router();
const db = require('../db');
const rssService = require('../services/rssService');
const aiService = require('../services/aiService');
const config = require('../config');
const { asyncHandler, ok, fail } = require('../utils/helpers');

// SolidGigs and Contra have no public API — jobs arrive via forwarded-email webhook
// (see routes/webhooks.js) and are stored as leads with source='solidgigs'|'contra'.
router.get('/solidgigs', asyncHandler(async (req, res) => {
  const jobs = await db.list('leads', { filters: { source: 'solidgigs' }, orderBy: { column: 'created_at', ascending: false } });
  ok(res, jobs.length ? jobs : SAMPLE_SOLIDGIGS);
}));

router.get('/contra', asyncHandler(async (req, res) => {
  const jobs = await db.list('leads', { filters: { source: 'contra' }, orderBy: { column: 'created_at', ascending: false } });
  ok(res, jobs.length ? jobs : SAMPLE_CONTRA);
}));

router.get('/startupsrip', asyncHandler(async (req, res) => {
  const items = await rssService.fetchFeed(config.startupsRipRss, SAMPLE_STARTUPSRIP);
  ok(res, items);
}));

// POST /api/freelance/pitch — one-tap: generate a personalised cover letter / proposal
router.post('/pitch', asyncHandler(async (req, res) => {
  const { leadId, platform } = req.body || {};
  if (!leadId || !platform) return fail(res, 400, 'leadId and platform are required');
  const lead = await db.get('leads', leadId);
  if (!lead) return fail(res, 404, 'Lead not found');

  const channel = platform === 'contra' ? 'contra' : 'solidgigs';
  const tone = channel === 'contra' ? 'casual' : 'technical';
  const pitch = await aiService.generateOutreachMessage({
    lead,
    tone,
    market: lead.region || 'US',
    channel,
    context:
      channel === 'contra'
        ? 'Write a short Contra proposal (2-3 sentences, direct).'
        : 'Write a SolidGigs application cover letter referencing the job posting details.',
  });
  ok(res, { leadId, platform, pitch });
}));

const SAMPLE_SOLIDGIGS = [
  {
    id: 'sample-solidgigs-1', source: 'solidgigs', status: 'new', company: 'PayLoop',
    intent_signal: 'Backend automation for D2C fintech app', region: 'US', score: 8,
    raw: { budget: '$4-6K', tags: ['Python', 'FastAPI'] }, sample: true,
  },
];
const SAMPLE_CONTRA = [
  {
    id: 'sample-contra-1', source: 'contra', status: 'new', company: 'Nimbly',
    intent_signal: 'SaaS Backend Development', region: 'US', score: 8,
    raw: { budget: '$6K', postedLabel: '3h ago' }, sample: true,
  },
];
const SAMPLE_STARTUPSRIP = [
  { title: 'TechVault shut down — founder starting a new company', link: '', publishedAt: new Date().toISOString(), sample: true },
];

module.exports = router;
