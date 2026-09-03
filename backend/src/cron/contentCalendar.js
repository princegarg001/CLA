const db = require('../db');
const config = require('../config');
const aiService = require('../services/aiService');
const twitterService = require('../services/twitterService');
const redditService = require('../services/redditService');
const logger = require('../utils/logger');

// Runs Sunday night — "The Publisher". Pulls a light snapshot of last
// week's engagement, asks AI to plan 5 posts for the coming week, and drops
// them into content_calendar as drafts (not scheduled) so nothing goes out
// without the one-tap approval the plan calls for on Monday morning.
async function run() {
  const [twitterAnalytics, redditKarma] = await Promise.all([
    twitterService.getAnalytics().catch(() => null),
    redditService.getKarma().catch(() => null),
  ]);

  const items = await aiService.generateWeeklyContentPlan({ twitter: twitterAnalytics, reddit: redditKarma });

  const created = [];
  const now = new Date();
  for (const item of items.slice(0, 5)) {
    const scheduledFor = new Date(now);
    scheduledFor.setDate(scheduledFor.getDate() + Math.max(1, Math.min(7, Number(item.dayOffset) || 1)));
    scheduledFor.setHours(9, 0, 0, 0); // default 9am local slot; user can drag-reschedule

    const entry = await db.insert('content_calendar', {
      content: item.content || '',
      media_urls: [],
      platforms: [item.platform || 'twitter'],
      post_type: item.postType || 'post',
      scheduled_for: scheduledFor.toISOString(),
      timezone: config.defaultTimezone,
      status: 'draft', // waits for one-tap approval before the scheduler will touch it
      ai_generated: true,
      results: [],
      engagement: {},
      raw: {},
    });
    created.push(entry);
  }

  await db.insert('agent_runs', {
    agent: 'publisher',
    trigger: 'cron',
    status: 'success',
    input: { twitterAnalytics, redditKarma },
    output: { created: created.length },
    finished_at: new Date().toISOString(),
  });

  logger.info(`cron: contentCalendar drafted ${created.length} posts for the coming week`);
  return { created: created.length };
}

module.exports = { run };
