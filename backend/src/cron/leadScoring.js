const db = require('../db');
const aiService = require('../services/aiService');
const logger = require('../utils/logger');
const { clampScore } = require('../utils/helpers');

// Runs hourly — re-scores leads created since the last run so score isn't stuck at the
// creation-time heuristic once more signal (replies, enrichment) has landed on the record.
async function run() {
  const leads = await db.list('leads', { filters: { status: 'new' } });
  let rescored = 0;
  for (const lead of leads) {
    const { score } = await aiService.scoreLead(lead).catch(() => ({ score: lead.score }));
    const next = clampScore(score);
    if (next !== lead.score) {
      await db.update('leads', lead.id, { score: next });
      rescored += 1;
    }
  }
  logger.info(`cron: leadScoring rescored ${rescored}/${leads.length} new leads`);
  return { rescored, checked: leads.length };
}

module.exports = { run };
