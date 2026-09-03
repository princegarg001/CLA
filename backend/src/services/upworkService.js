const config = require('../config');
const aiService = require('./aiService');
const logger = require('../utils/logger');

// Upwork killed RSS in 2024 and bans automated applying — the only leverage
// left is being the fastest, best-prepared human. Jobs arrive from whatever
// watcher the founder wires up (Vollna webhook, forwarded email, manual
// paste); this file only cares about turning "raw job text" into a scored,
// proposal-ready candidate, regardless of where it came from.

// Normalizes payloads from different sources into one shape. Vollna's own
// webhook schema varies by plan/config, so this is deliberately permissive —
// it reads a handful of common field name variants rather than asserting one.
function parseJobWebhook(body = {}, source = 'vollna') {
  const skills = body.skills || body.tags || [];
  return {
    title: body.title || body.job_title || 'Untitled Upwork job',
    description: body.description || body.snippet || body.body || '',
    client_name: body.client_name || body.client?.name || null,
    budget_min: numOrNull(body.budget_min ?? body.budget?.min),
    budget_max: numOrNull(body.budget_max ?? body.budget?.max ?? body.budget?.amount),
    budget_type: body.budget_type || body.job_type || (body.hourly ? 'hourly' : 'fixed'),
    skills: Array.isArray(skills) ? skills.map(String) : String(skills).split(',').map((s) => s.trim()).filter(Boolean),
    country: body.country || body.client?.country || null,
    client_history: body.client_history || {
      jobsPosted: body.client?.jobs_posted ?? null,
      hireRate: body.client?.hire_rate ?? null,
      totalSpent: body.client?.total_spent ?? null,
    },
    upwork_url: body.url || body.job_url || body.link || null,
    source,
  };
}

function numOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Cheap pre-filter before the AI scoring call: does the job even mention a
// skill AlphoTech offers, and does the budget clear the configured floor?
function passesBaseline(job) {
  const skillsBlob = (job.skills || []).join(' ').toLowerCase();
  const textBlob = `${job.title} ${job.description}`.toLowerCase();
  const hasSkillMatch = config.upworkSkills.some((s) => skillsBlob.includes(s.toLowerCase()) || textBlob.includes(s.toLowerCase()));
  const budget = job.budget_max ?? job.budget_min ?? 0;
  const meetsBudget = job.budget_type === 'hourly' || budget === 0 || budget >= config.upworkMinBudget;
  return hasSkillMatch && meetsBudget;
}

async function scoreJob(job) {
  const fallback = heuristicScore(job);
  const text = await aiService.safeComplete(
    {
      system:
        'You score Upwork job posts for AlphoTech, a backend engineering/automation studio. Score 1-10 using: budget adequacy, ' +
        'technical fit (Python/Node/microservices/DevOps/automation), client quality signals (hire rate, total spent, jobs posted), ' +
        'and how well-specified the scope is (vague posts score lower — high client-management risk). ' +
        'Respond with ONLY a JSON object: {"score": <1-10 integer>, "reason": "<one sentence>"}.',
      prompt: JSON.stringify(job),
      json: true,
      maxTokens: 200,
    },
    JSON.stringify({ score: fallback, reason: 'Heuristic fallback score (AI call unavailable — see server logs for why).' })
  );
  try {
    const parsed = JSON.parse(text);
    return { score: Math.max(1, Math.min(10, Math.round(parsed.score))), reason: parsed.reason };
  } catch {
    return { score: fallback, reason: 'Heuristic fallback score (AI response unparsable).' };
  }
}

function heuristicScore(job = {}) {
  let score = 3;
  const budget = job.budget_max ?? job.budget_min ?? 0;
  if (job.budget_type === 'hourly' || budget >= config.upworkMinBudget) score += 2;
  if (budget >= config.upworkMinBudget * 3) score += 1;
  const skillsBlob = (job.skills || []).join(' ').toLowerCase();
  const textBlob = `${job.title || ''} ${job.description || ''}`.toLowerCase();
  const skillHits = config.upworkSkills.filter((s) => skillsBlob.includes(s.toLowerCase()) || textBlob.includes(s.toLowerCase())).length;
  score += Math.min(2, skillHits);
  const hireRate = job.client_history?.hireRate;
  if (typeof hireRate === 'number' && hireRate >= 0.5) score += 1;
  const totalSpent = job.client_history?.totalSpent;
  if (typeof totalSpent === 'number' && totalSpent > 1000) score += 1;
  return Math.max(1, Math.min(10, score));
}

async function generateProposal(job) {
  return aiService.safeComplete(
    {
      system:
        'You write Upwork proposals for AlphoTech, a backend engineering/automation studio for funded startups. ' +
        'Structure: (1) one-sentence hook addressing their specific problem, (2) a short proof line referencing relevant ' +
        'experience (backend architecture, APIs, microservices, automation — no fabricated client names), (3) a 3-bullet ' +
        'technical approach specific to THIS job, not generic, (4) a realistic timeline estimate, (5) a direct CTA ' +
        '("I can start this week" or "happy to hop on a quick call"). Adapt tone: more technical if the post reads like ' +
        'a dev/CTO wrote it, more business-framed if it reads like a founder. Stay under 3500 characters (Upwork\'s limit is 5000).',
      prompt: JSON.stringify(job),
      maxTokens: 700,
    },
    '[AI proposal unavailable right now — draft this one manually. See server logs for why.]'
  );
}

module.exports = { parseJobWebhook, passesBaseline, scoreJob, heuristicScore, generateProposal };
