const db = require('../db');
const twitterService = require('../services/twitterService');
const publishEngine = require('../services/publishEngine');
const logger = require('../utils/logger');

// Runs every 5 minutes — the part of "schedule a post" that was previously
// missing: something that actually fires at scheduled_for. Handles both the
// legacy `scheduled_posts` table (Twitter-only, thread-aware) and the new
// unified `content_calendar` (any platform combination).
async function run() {
  const now = new Date().toISOString();

  const [legacyDue, calendarDue] = await Promise.all([
    db.list('scheduled_posts', { filters: { status: 'scheduled' } }),
    db.list('content_calendar', { filters: { status: 'scheduled' } }),
  ]);

  let posted = 0;
  let failed = 0;

  for (const post of legacyDue.filter((p) => p.scheduled_for <= now)) {
    try {
      const result = Array.isArray(post.thread) && post.thread.length
        ? await twitterService.postThread(post.thread)
        : await twitterService.postTweet(post.content);

      const sample = result.sample === true;
      const status = sample ? 'scheduled' : (result.status === 'failed' ? 'failed' : 'posted');
      await db.update('scheduled_posts', post.id, {
        status,
        posted_tweet_id: result.id || result.tweetIds?.[0] || null,
      });
      if (status === 'posted') posted += 1;
      if (status === 'failed') failed += 1;
    } catch (e) {
      logger.error('cron: postScheduler legacy post failed', { id: post.id, error: e.message });
      await db.update('scheduled_posts', post.id, { status: 'failed' });
      failed += 1;
    }
  }

  for (const entry of calendarDue.filter((e) => e.scheduled_for <= now)) {
    try {
      const { overall, results } = await publishEngine.publishCalendarEntry(entry);
      await db.update('content_calendar', entry.id, { status: overall, results });
      if (overall === 'posted') posted += 1;
      if (overall === 'failed') failed += 1;
    } catch (e) {
      logger.error('cron: postScheduler calendar entry failed', { id: entry.id, error: e.message });
      await db.update('content_calendar', entry.id, { status: 'failed', results: [{ error: e.message }] });
      failed += 1;
    }
  }

  logger.info(`cron: postScheduler posted ${posted}, failed ${failed} (checked ${legacyDue.length + calendarDue.length} due entries)`);
  return { posted, failed };
}

module.exports = { run };
