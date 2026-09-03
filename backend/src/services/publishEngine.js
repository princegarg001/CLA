const twitterService = require('./twitterService');
const linkedinService = require('./linkedinService');
const instagramService = require('./instagramService');
const redditService = require('./redditService');
const logger = require('../utils/logger');

// Shared by the manual "Publish Everywhere" flow and the content-calendar
// scheduler cron — one place that knows how to turn a calendar entry into
// actual platform API calls, so the two callers can't drift out of sync.
async function publishToPlatform(platform, entry) {
  const { content, media_urls: mediaUrls = [], post_type: postType = 'post', raw = {} } = entry;

  switch (platform) {
    case 'twitter': {
      if (postType === 'thread') {
        const tweets = content.split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean);
        const result = await twitterService.postThread(tweets.length ? tweets : [content]);
        return result.status === 'success'
          ? { status: 'success', externalPostId: result.tweetIds?.[0] || null }
          : { status: result.status === 'skipped' ? 'skipped' : 'failed', error: result.error, reason: result.message };
      }
      const tweet = await twitterService.postTweet(content);
      return tweet.sample ? { status: 'skipped', reason: tweet.message } : { status: 'success', externalPostId: tweet.id };
    }
    case 'linkedin':
      return linkedinService.postText(content);
    case 'instagram': {
      if (postType === 'carousel') return instagramService.postCarousel(mediaUrls, content);
      if (postType === 'reel') return instagramService.postReel(mediaUrls[0], content);
      if (postType === 'story') return instagramService.postStory({ imageUrl: mediaUrls[0] });
      return instagramService.postImage(mediaUrls[0], content);
    }
    case 'reddit': {
      if (postType === 'comment') {
        if (!raw.parentFullname) return { status: 'skipped', reason: 'Reddit comment needs raw.parentFullname.' };
        const result = await redditService.postComment({ parentFullname: raw.parentFullname, text: content });
        return result.status === 'success' ? { status: 'success', externalPostId: result.externalId } : result;
      }
      if (!raw.subreddit || !raw.title) return { status: 'skipped', reason: 'Reddit post needs raw.subreddit and raw.title.' };
      const result = await redditService.submitPost({ subreddit: raw.subreddit, title: raw.title, text: content });
      return result.status === 'success' ? { status: 'success', externalPostId: result.id } : result;
    }
    default:
      return { status: 'failed', error: `Unknown platform "${platform}"` };
  }
}

// Publishes one content_calendar row to every platform it targets, in
// parallel, and returns the per-platform results plus an overall status.
async function publishCalendarEntry(entry) {
  const platforms = entry.platforms || [];
  const settled = await Promise.allSettled(platforms.map((p) => publishToPlatform(p, entry)));
  const results = settled.map((r, i) => ({
    platform: platforms[i],
    ...(r.status === 'fulfilled' ? r.value : { status: 'failed', error: r.reason?.message || 'Unknown error' }),
  }));
  const overall = results.every((r) => r.status === 'success')
    ? 'posted'
    : results.some((r) => r.status === 'success')
    ? 'posted' // partial success still counts as posted; per-platform detail lives in `results`
    : results.every((r) => r.status === 'skipped')
    ? 'scheduled' // nothing configured yet — leave it scheduled rather than marking it failed
    : 'failed';
  return { overall, results };
}

module.exports = { publishToPlatform, publishCalendarEntry };
