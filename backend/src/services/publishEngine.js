const twitterService = require('./twitterService');
const linkedinService = require('./linkedinService');
const facebookService = require('./facebookService');
const redditService = require('./redditService');
const storageService = require('./storageService');
const rules = require('./socialRules');
const logger = require('../utils/logger');

// Shared by the manual publish/retry buttons and the scheduler cron — the one
// place that knows how to turn a content_calendar row into real platform
// calls, so those callers can't drift apart.

// Downloads each media file at most once per publish, however many platforms
// use it (a video going to both X and LinkedIn is fetched a single time).
async function loadMedia(items, cache) {
  const out = [];
  for (const m of items) {
    if (!cache.has(m.url)) cache.set(m.url, storageService.download(m.url));
    out.push({ ...m, buffer: await cache.get(m.url) });
  }
  return out;
}

function fail(error, extra = {}) {
  return { status: 'failed', error, retriable: false, ...extra };
}

async function publishToPlatform(platform, entry, cache = new Map()) {
  const check = rules.validateEntry({ ...entry, platforms: [platform] });
  if (!check.ok) return fail(check.errors.map((e) => e.message).join('; '));

  const v = rules.variantFor(platform, entry);
  const postType = entry.post_type || 'post';
  const rawMedia = rules.entryMedia(entry);

  try {
    switch (platform) {
      case 'twitter': {
        const media = await loadMedia(rawMedia, cache);
        return await twitterService.publish({ text: v.text, media, postType });
      }
      case 'linkedin': {
        const media = await loadMedia(rawMedia, cache);
        return await linkedinService.publish({ text: v.text, media, linkUrl: v.linkUrl });
      }
      case 'reddit': {
        const raw = entry.raw || {};
        // A comment reply (from the Reddit tab) carries its target in raw.
        if (postType === 'comment') {
          if (!raw.parentFullname) return { status: 'skipped', reason: 'Reddit comment needs raw.parentFullname.' };
          const r = await redditService.postComment({ parentFullname: raw.parentFullname, text: v.text });
          return r.status === 'success' ? { status: 'success', externalPostId: r.externalId, url: r.permalink || null } : r;
        }
        const kind = rules.redditKind(entry);
        const media = kind === 'image' ? await loadMedia(rawMedia.slice(0, 1), cache) : [];
        return await redditService.submit({
          subreddit: v.subreddit,
          title: v.title,
          kind,
          text: v.text,
          linkUrl: v.linkUrl,
          media: media[0],
          flairId: v.flairId,
        });
      }
      case 'facebook': {
        const r = await facebookService.postText(v.text, rawMedia[0]?.url);
        return r;
      }
      default:
        return fail(`Unknown platform "${platform}"`);
    }
  } catch (e) {
    // Thrown by media download / our own code — not an upstream response.
    logger.error('publishEngine: platform publish threw', { platform, error: e.message });
    return fail(e.message, { retriable: e.retriable === true });
  }
}

// Publishes an entry to its platforms and returns per-platform results plus an
// overall status. Platforms that already succeeded on an earlier attempt are
// carried over untouched and never re-sent — that's what makes "retry failed"
// safe. `only` limits the run to specific platforms.
async function publishCalendarEntry(entry, { only } = {}) {
  const platforms = entry.platforms || [];
  const previous = Array.isArray(entry.results) ? entry.results : [];
  const prevByPlatform = Object.fromEntries(previous.filter((r) => r && r.platform).map((r) => [r.platform, r]));

  const toRun = platforms.filter((p) => prevByPlatform[p]?.status !== 'success' && (!only || only.includes(p)));
  const cache = new Map();
  const settled = await Promise.allSettled(toRun.map((p) => publishToPlatform(p, entry, cache)));
  const fresh = Object.fromEntries(
    settled.map((r, i) => [
      toRun[i],
      { platform: toRun[i], ...(r.status === 'fulfilled' ? r.value : fail(r.reason?.message || 'Unknown error')) },
    ])
  );

  const results = platforms.map((p) => fresh[p] || prevByPlatform[p] || { platform: p, status: 'skipped', reason: 'Not attempted' });
  const succeeded = results.filter((r) => r.status === 'success').length;
  const overall = succeeded === results.length ? 'posted' : succeeded > 0 ? 'partial' : 'failed';

  // Anything worth another automatic attempt: failed with a transient cause.
  const retryable = results.filter((r) => r.status === 'failed' && r.retriable);
  const retryAfterSec = retryable.reduce((max, r) => Math.max(max, r.retryAfterSec || 0), 0) || null;

  return { overall, results, retry: { needed: retryable.length > 0, platforms: retryable.map((r) => r.platform), retryAfterSec } };
}

module.exports = { publishToPlatform, publishCalendarEntry };
