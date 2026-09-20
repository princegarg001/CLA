const db = require('../db');
const twitterService = require('../services/twitterService');
const publishEngine = require('../services/publishEngine');
const logger = require('../utils/logger');

const MAX_ATTEMPTS = 3;
const BACKOFF_MINUTES = [2, 10, 30]; // wait before attempt 2, 3 (index = attempts already made - 1)
const STALE_PUBLISHING_MS = 15 * 60 * 1000;

const ms = (iso) => new Date(iso).getTime();

// When an entry becomes due: its scheduled time, pushed later if a previous
// attempt asked to be retried after a delay.
function dueAt(entry) {
  const retryAt = entry.raw?.next_attempt_at;
  return Math.max(ms(entry.scheduled_for), retryAt ? ms(retryAt) : 0);
}

// Runs every 5 minutes. Legacy `scheduled_posts` (Twitter-only) keep their
// original path; `content_calendar` gets the careful treatment: each entry is
// atomically claimed before sending (so an overlapping run or a second
// instance can't post it twice), platforms that already succeeded are never
// re-sent, and transient failures are retried with backoff.
async function run({ now = new Date() } = {}) {
  const nowMs = now.getTime();
  let posted = 0;
  let failed = 0;
  let retried = 0;

  // ---- Legacy Twitter scheduler ----------------------------------------------
  const legacyDue = (await db.list('scheduled_posts', { filters: { status: 'scheduled' } })).filter((p) => ms(p.scheduled_for) <= nowMs);
  for (const post of legacyDue) {
    try {
      const result = Array.isArray(post.thread) && post.thread.length
        ? await twitterService.postThread(post.thread)
        : await twitterService.postTweet(post.content);

      const sample = result.sample === true;
      const status = sample ? 'scheduled' : (result.status === 'failed' ? 'failed' : 'posted');
      await db.update('scheduled_posts', post.id, { status, posted_tweet_id: result.id || result.tweetIds?.[0] || null });
      if (status === 'posted') posted += 1;
      if (status === 'failed') failed += 1;
    } catch (e) {
      logger.error('cron: postScheduler legacy post failed', { id: post.id, error: e.message });
      await db.update('scheduled_posts', post.id, { status: 'failed' });
      failed += 1;
    }
  }

  // ---- Unstick entries orphaned by a crash/redeploy mid-publish --------------
  // We can't know which platforms went out before the process died, so don't
  // guess (that risks a double post) — mark failed and let the human check.
  const publishing = await db.list('content_calendar', { filters: { status: 'publishing' } });
  for (const stuck of publishing.filter((e) => nowMs - ms(e.updated_at) > STALE_PUBLISHING_MS)) {
    await db.update('content_calendar', stuck.id, {
      status: 'failed',
      results: [{ platform: 'all', status: 'failed', error: 'Interrupted mid-publish (server restart?). Check the platforms before retrying to avoid a duplicate.' }],
    });
    failed += 1;
  }

  // ---- Unified calendar --------------------------------------------------------
  const scheduled = await db.list('content_calendar', { filters: { status: 'scheduled' } });
  const due = scheduled.filter((e) => dueAt(e) <= nowMs).sort((a, b) => dueAt(a) - dueAt(b));

  for (const candidate of due) {
    const entry = await db.claim('content_calendar', candidate.id, { where: { status: 'scheduled' }, patch: { status: 'publishing' } });
    if (!entry) continue; // someone else took it

    try {
      const { overall, results, retry } = await publishEngine.publishCalendarEntry(entry);
      const attempts = (entry.raw?.attempts || 0) + 1;
      const canRetry = retry.needed && attempts < MAX_ATTEMPTS;

      if (canRetry) {
        const waitSec = Math.max((BACKOFF_MINUTES[attempts - 1] || 30) * 60, retry.retryAfterSec || 0);
        await db.update('content_calendar', entry.id, {
          status: 'scheduled',
          results,
          raw: { ...(entry.raw || {}), attempts, next_attempt_at: new Date(nowMs + waitSec * 1000).toISOString() },
        });
        retried += 1;
      } else {
        await db.update('content_calendar', entry.id, {
          status: overall,
          results,
          raw: { ...(entry.raw || {}), attempts, next_attempt_at: null },
        });
        if (overall === 'posted' || overall === 'partial') posted += 1;
        if (overall === 'failed') failed += 1;
      }
    } catch (e) {
      logger.error('cron: postScheduler calendar entry failed', { id: entry.id, error: e.message });
      await db.update('content_calendar', entry.id, { status: 'failed', results: [{ platform: 'all', status: 'failed', error: e.message }] });
      failed += 1;
    }
  }

  logger.info(`cron: postScheduler posted ${posted}, failed ${failed}, queued-for-retry ${retried} (${legacyDue.length + due.length} due)`);
  return { posted, failed, retried };
}

module.exports = { run, dueAt, MAX_ATTEMPTS };
