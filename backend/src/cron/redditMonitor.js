const db = require('../db');
const redditService = require('../services/redditService');
const logger = require('../utils/logger');

// Runs every 6 hours — "The Prospector" (Reddit half). Scans monitored
// subreddits for ICP-keyword matches, AI-drafts a reply for the strongest
// ones, and logs the batch as an agent_run so it shows up next to the other
// automation activity. Nothing is posted automatically — drafts wait for a
// one-tap approval in the app (POST /api/reddit/reply).
const SCORE_THRESHOLD = 4;
const MAX_DRAFTS = 5;

async function run() {
  const opportunities = await redditService.getOpportunities({ limit: 25 });
  const top = opportunities.filter((p) => p.keywordScore >= SCORE_THRESHOLD).slice(0, MAX_DRAFTS);

  const drafted = [];
  for (const post of top) {
    try {
      const draft = await redditService.draftReply(post);
      drafted.push({ ...post, draft });
    } catch (e) {
      logger.warn('cron: redditMonitor draft failed', { postId: post.id, error: e.message });
    }
  }

  await db.insert('agent_runs', {
    agent: 'prospector',
    trigger: 'cron',
    status: 'success',
    input: { subreddits: 'monitored', scoreThreshold: SCORE_THRESHOLD },
    output: { scanned: opportunities.length, drafted: drafted.length, posts: drafted },
    finished_at: new Date().toISOString(),
  });

  logger.info(`cron: redditMonitor scanned ${opportunities.length} posts, drafted ${drafted.length} replies`);
  return { scanned: opportunities.length, drafted: drafted.length };
}

module.exports = { run };
