const express = require('express');
const router = express.Router();
const db = require('../db');
const upworkService = require('../services/upworkService');
const config = require('../config');
const { asyncHandler, ok, fail, clampScore } = require('../utils/helpers');
const { strictLimiter } = require('../middleware/rateLimiter');

const SAMPLE_JOBS = [
  {
    id: 'sample-upwork-1', title: 'Backend engineer to rebuild our payments microservice', client_name: 'PayLoop',
    budget_min: 4000, budget_max: 7000, budget_type: 'fixed', skills: ['Python', 'FastAPI', 'PostgreSQL'],
    country: 'United States', client_history: { jobsPosted: 12, hireRate: 0.75, totalSpent: 48000 },
    upwork_url: 'https://upwork.com', ai_score: 9, ai_score_reason: 'Strong budget, direct fit, high-spend repeat client.',
    ai_proposal: null, status: 'new', source: 'manual', sample: true,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
];

// GET /api/upwork/jobs?status=&minScore= — sorted by fit score, newest first as tiebreak.
router.get('/jobs', asyncHandler(async (req, res) => {
  const { status, minScore } = req.query;
  let jobs = await db.list('upwork_jobs', { orderBy: { column: 'created_at', ascending: false } });
  if (!jobs.length) jobs = SAMPLE_JOBS;
  if (status) jobs = jobs.filter((j) => j.status === status);
  if (minScore) jobs = jobs.filter((j) => (j.ai_score || 0) >= Number(minScore));
  jobs = [...jobs].sort((a, b) => (b.ai_score || 0) - (a.ai_score || 0));
  ok(res, jobs);
}));

router.get('/jobs/:id', asyncHandler(async (req, res) => {
  const job = await db.get('upwork_jobs', req.params.id);
  if (!job) return fail(res, 404, 'Job not found');
  ok(res, job);
}));

// POST /api/upwork/jobs — manual add (paste URL + details); scores + drafts a proposal immediately.
router.post('/jobs', strictLimiter, asyncHandler(async (req, res) => {
  const body = req.body || {};
  if (!body.title) return fail(res, 400, 'title is required');
  const parsed = upworkService.parseJobWebhook(body, 'manual');
  const { score, reason } = await upworkService.scoreJob(parsed);
  const proposal = await upworkService.generateProposal(parsed);
  const job = await db.insert('upwork_jobs', {
    ...parsed,
    ai_score: clampScore(score),
    ai_score_reason: reason,
    ai_proposal: proposal,
    status: 'new',
  });
  upworkService.notifyIfHot(job);
  ok(res, job);
}));

// POST /api/upwork/proposal — (re)generate a proposal for an existing job, or a raw job body.
router.post('/proposal', strictLimiter, asyncHandler(async (req, res) => {
  const { jobId, job: rawJob } = req.body || {};
  let job = rawJob;
  if (jobId) {
    job = await db.get('upwork_jobs', jobId);
    if (!job) return fail(res, 404, 'Job not found');
  }
  if (!job) return fail(res, 400, 'jobId or job is required');
  const proposal = await upworkService.generateProposal(job);
  if (jobId) await db.update('upwork_jobs', jobId, { ai_proposal: proposal });
  ok(res, { jobId, proposal });
}));

// PATCH /api/upwork/jobs/:id — status transitions (applied/interviewing/hired/rejected), proposal edits, outcome value.
router.patch('/jobs/:id', asyncHandler(async (req, res) => {
  const { status, proposalText, outcomeValue, appliedAt } = req.body || {};
  const patch = {};
  if (status !== undefined) patch.status = status;
  if (proposalText !== undefined) patch.proposal_text = proposalText;
  if (outcomeValue !== undefined) patch.outcome_value = outcomeValue;
  if (status === 'applied') patch.applied_at = appliedAt || new Date().toISOString();
  const updated = await db.update('upwork_jobs', req.params.id, patch);
  if (!updated) return fail(res, 404, 'Job not found');
  ok(res, updated);
}));

// GET /api/upwork/stats — win rate, avg deal size, avg time-to-apply, pipeline counts.
router.get('/stats', asyncHandler(async (req, res) => {
  const jobs = await db.list('upwork_jobs');
  if (!jobs.length) {
    return ok(res, { sample: true, winRate: 0.32, avgDealSize: 5200, avgApplyDelayHours: 3.4, pipeline: { new: 4, applied: 6, interviewing: 2, hired: 3, rejected: 5 } });
  }
  const decided = jobs.filter((j) => ['hired', 'rejected'].includes(j.status));
  const hired = jobs.filter((j) => j.status === 'hired');
  const winRate = decided.length ? hired.length / decided.length : 0;
  const dealValues = hired.map((j) => j.outcome_value).filter((v) => typeof v === 'number');
  const avgDealSize = dealValues.length ? dealValues.reduce((a, b) => a + b, 0) / dealValues.length : 0;
  const applyDelays = jobs
    .filter((j) => j.applied_at)
    .map((j) => (new Date(j.applied_at).getTime() - new Date(j.created_at).getTime()) / 3600000)
    .filter((h) => h >= 0);
  const avgApplyDelayHours = applyDelays.length ? applyDelays.reduce((a, b) => a + b, 0) / applyDelays.length : 0;
  const pipeline = ['new', 'applied', 'interviewing', 'hired', 'rejected', 'expired'].reduce((acc, s) => {
    acc[s] = jobs.filter((j) => j.status === s).length;
    return acc;
  }, {});
  ok(res, { winRate, avgDealSize, avgApplyDelayHours, pipeline });
}));

module.exports = router;
