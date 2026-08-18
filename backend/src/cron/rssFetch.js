const config = require('../config');
const db = require('../db');
const rssService = require('../services/rssService');
const logger = require('../utils/logger');

// Runs every 4 hours — pulls BetaList + Startups.rip. Startups.rip items become
// content-angle raw material (logged as a researcher agent_run) rather than leads,
// since the feed itself has no contact info to act on directly.
async function run() {
  const [betalist, startupsRip] = await Promise.all([
    rssService.fetchFeed(config.betalistRss, []),
    rssService.fetchFeed(config.startupsRipRss, []),
  ]);

  await db.insert('agent_runs', {
    agent: 'researcher',
    trigger: 'cron',
    status: 'success',
    input: { feeds: ['betalist', 'startupsrip'] },
    output: { betalist: betalist.slice(0, 10), startupsRip: startupsRip.slice(0, 10) },
    finished_at: new Date().toISOString(),
  });

  logger.info(`cron: rssFetch pulled ${betalist.length} BetaList + ${startupsRip.length} Startups.rip items`);
  return { betalist: betalist.length, startupsRip: startupsRip.length };
}

module.exports = { run };
