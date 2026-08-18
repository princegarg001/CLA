const db = require('../db');
const webrobotsService = require('../services/webrobotsService');
const headaiService = require('../services/headaiService');
const aiService = require('../services/aiService');
const logger = require('../utils/logger');
const { clampScore } = require('../utils/helpers');

// Runs every 6 hours — WebRobots job-posting scrape + HeadAI hiring signals become new leads.
// A company hiring backend/DevOps roles it can't fill is AlphoTech's exact ICP (Screen 2 spec).
async function run() {
  const [postings, hiring] = await Promise.all([
    webrobotsService.scrapeJobPostings({ keywords: ['backend engineer', 'devops', 'infrastructure'] }),
    headaiService.getHiringSignals({ minRoles: 5 }),
  ]);

  const existing = await db.list('leads', { filters: {} });
  const existingCompanies = new Set(existing.map((l) => (l.company || '').toLowerCase()));

  let created = 0;
  for (const posting of postings) {
    const company = (posting.company || '').toLowerCase();
    if (!company || existingCompanies.has(company)) continue;
    const candidate = {
      source: 'webrobots', company: posting.company, role: posting.title, region: posting.region,
      intent_signal: `Open job posting: ${posting.title}`,
    };
    const { score } = await aiService.scoreLead(candidate).catch(() => ({ score: aiService.heuristicScore(candidate) }));
    await db.insert('leads', { status: 'new', ...candidate, score: clampScore(score) });
    existingCompanies.add(company);
    created += 1;
  }

  for (const h of hiring) {
    const company = (h.company || '').toLowerCase();
    if (!company || existingCompanies.has(company)) continue;
    const candidate = {
      source: 'headai', company: h.company, region: h.region,
      intent_signal: `Hiring ${h.hires} roles: ${(h.roles || []).join(', ')}`,
      urgency: 'high',
    };
    const { score } = await aiService.scoreLead(candidate).catch(() => ({ score: aiService.heuristicScore(candidate) }));
    await db.insert('leads', { status: 'new', ...candidate, score: clampScore(score) });
    existingCompanies.add(company);
    created += 1;
  }

  logger.info(`cron: jobFetch created ${created} new leads from WebRobots + HeadAI`);
  return { created };
}

module.exports = { run };
