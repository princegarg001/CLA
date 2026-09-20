const engine = require('../services/recommendationEngine');
const logger = require('../utils/logger');

// Runs every morning — builds today's ranked lead list before the founder sits down.
async function run() {
  const plan = await engine.generateBatch();
  logger.info(`cron: dailyRecommendations picked ${plan.stats.picked} leads`);
  return { picked: plan.stats.picked };
}

module.exports = { run };
