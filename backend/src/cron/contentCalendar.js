const db = require('../db');
const config = require('../config');
const aiService = require('../services/aiService');
const twitterService = require('../services/twitterService');
const redditService = require('../services/redditService');
const logger = require('../utils/logger');

const PLAN_PLATFORMS = ['twitter', 'linkedin', 'reddit'];

// Runs Sunday night — "The Publisher". Pulls a light snapshot of last
// week's engagement, asks AI to plan 5 posts for the coming week, and drops
// them into content_calendar as drafts (not scheduled) so nothing goes out
// without one-tap approval. If the AI is unavailable it creates nothing —
// placeholder drafts are one tap from being published by mistake.
async function run() {
  const [twitterAnalytics, redditKarma, settings] = await Promise.all([
    twitterService.getAnalytics().catch(() => null),
    redditService.getKarma().catch(() => null),
    db.getSettings().catch(() => ({})),
  ]);

  const items = await aiService.generateWeeklyContentPlan({ twitter: twitterAnalytics, reddit: redditKarma }, { voice: settings.brand_voice });

  const created = [];
  const now = new Date();
  for (const item of items.slice(0, 5)) {
    const platform = PLAN_PLATFORMS.includes(item.platform) ? item.platform : null;
    const content = String(item.content || '').trim();
    if (!platform || !content) continue;

    const scheduledFor = new Date(now);
    scheduledFor.setDate(scheduledFor.getDate() + Math.max(1, Math.min(7, Number(item.dayOffset) || 1)));
    scheduledFor.setHours(9, 0, 0, 0); // default 9am slot; editable in the calendar

    const raw = { media: [], variants: {} };
    if (platform === 'reddit') {
      // Reddit needs a subreddit and title too — pre-fill the best guess so
      // the draft is one edit away from valid.
      raw.variants.reddit = {
        subreddit: config.redditMonitoredSubs[0] || '',
        title: String(item.title || content.split('\n')[0]).slice(0, 300),
        text: content,
      };
    }

    const entry = await db.insert('content_calendar', {
      content,
      media_urls: [],
      platforms: [platform],
      post_type: item.postType === 'thread' ? 'thread' : 'post',
      scheduled_for: scheduledFor.toISOString(),
      timezone: config.defaultTimezone,
      status: 'draft', // waits for approval before the scheduler will touch it
      ai_generated: true,
      results: [],
      engagement: {},
      raw,
    });
    created.push(entry);
  }

  await db.insert('agent_runs', {
    agent: 'publisher',
    trigger: 'cron',
    status: created.length ? 'success' : 'failed',
    input: { twitterAnalytics, redditKarma },
    output: { created: created.length },
    error: created.length ? null : 'AI content plan unavailable — nothing was drafted.',
    finished_at: new Date().toISOString(),
  });

  logger.info(`cron: contentCalendar drafted ${created.length} posts for the coming week`);
  return { created: created.length, aiAvailable: items.length > 0 };
}

module.exports = { run };
