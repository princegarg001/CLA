const axios = require('axios');
const crypto = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');

// Read-only calls (v2 GET endpoints) work fine with the app-only bearer token.
function readClient() {
  return axios.create({
    baseURL: 'https://api.twitter.com/2',
    headers: { Authorization: `Bearer ${config.twitterBearer}` },
    timeout: 15000,
  });
}

// Twitter's v2 write endpoints (POST /tweets, etc.) reject an app-only bearer
// token — they require user-context auth. OAuth 1.0a user-context (the
// classic API key/secret + access token/secret) is what the free tier
// actually supports for posting, so writes are signed by hand here rather
// than relying on the bearer client above.
function oauth1Header(method, url, extraParams = {}) {
  const oauthParams = {
    oauth_consumer_key: config.twitterApiKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: config.twitterAccessToken,
    oauth_version: '1.0',
  };
  const allParams = { ...oauthParams, ...extraParams };
  const paramString = Object.keys(allParams)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(allParams[k])}`)
    .join('&');
  const baseString = ['POST', encodeURIComponent(url), encodeURIComponent(paramString)].join('&');
  const signingKey = `${encodeURIComponent(config.twitterApiSecret)}&${encodeURIComponent(config.twitterAccessSecret)}`;
  const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');
  const signedParams = { ...oauthParams, oauth_signature: signature };
  const header = 'OAuth ' + Object.keys(signedParams)
    .sort()
    .map((k) => `${encodeURIComponent(k)}="${encodeURIComponent(signedParams[k])}"`)
    .join(', ');
  return header;
}

async function writePost(path, body) {
  const url = `https://api.twitter.com/2${path}`;
  const authHeader = oauth1Header('POST', url);
  const { data } = await axios.post(url, body, {
    headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
    timeout: 15000,
  });
  return data.data;
}

const TIER_FEATURES = {
  free: { post: true, read: false, dms: false, analytics: false, search: false },
  basic: { post: true, read: true, dms: true, analytics: true, search: false },
  pro: { post: true, read: true, dms: true, analytics: true, search: true },
};

function features() {
  return TIER_FEATURES[config.twitterTier] || TIER_FEATURES.free;
}

function canPost() {
  return config.isConfigured('twitterWrite');
}

async function postTweet(text, { replyToId } = {}) {
  if (!canPost()) {
    return {
      id: `sample_${Date.now()}`, text, sample: true,
      message: canPost() ? undefined : 'Twitter posting needs TWITTER_API_KEY/SECRET + TWITTER_ACCESS_TOKEN/SECRET (OAuth 1.0a user context) — returning sample response',
    };
  }
  try {
    const body = replyToId ? { text, reply: { in_reply_to_tweet_id: replyToId } } : { text };
    return await writePost('/tweets', body);
  } catch (e) {
    logger.error('twitterService.postTweet failed', { error: e.response?.data || e.message });
    throw Object.assign(new Error(`Tweet post failed: ${e.response?.data?.detail || e.message}`), { status: 502 });
  }
}

// Chains tweets as replies to each other so they render as one thread.
// Stops and returns what succeeded so far if a middle tweet fails, rather
// than silently dropping the rest of the thread.
async function postThread(tweets) {
  if (!Array.isArray(tweets) || !tweets.length) {
    throw Object.assign(new Error('tweets must be a non-empty array'), { status: 400 });
  }
  if (!canPost()) {
    return {
      status: 'skipped', sample: true,
      message: 'Twitter posting needs OAuth 1.0a user-context credentials — returning sample response',
      tweetIds: tweets.map((_, i) => `sample_${Date.now()}_${i}`),
    };
  }
  const posted = [];
  let replyToId;
  for (const text of tweets) {
    try {
      const tweet = await postTweet(text, { replyToId });
      posted.push(tweet);
      replyToId = tweet.id;
    } catch (e) {
      return { status: posted.length ? 'partial' : 'failed', posted, error: e.message };
    }
  }
  return { status: 'success', posted, tweetIds: posted.map((t) => t.id) };
}

async function postReply(tweetId, text) {
  if (!tweetId || !text) throw Object.assign(new Error('tweetId and text are required'), { status: 400 });
  return postTweet(text, { replyToId: tweetId });
}

async function getDMs() {
  if (!features().dms) {
    return { available: false, tier: config.twitterTier, message: 'DMs require Basic tier or higher.', data: [] };
  }
  if (!config.isConfigured('twitter')) {
    return { available: true, sample: true, data: [{ from: '@founder_ux', text: 'Saw your thread, can we talk pricing?', time: '1h ago' }] };
  }
  try {
    const { data } = await readClient().get('/dm_events', { params: { 'dm_event.fields': 'text,created_at' } });
    return { available: true, data: data.data || [] };
  } catch (e) {
    logger.error('twitterService.getDMs failed', { error: e.message });
    throw Object.assign(new Error(`Twitter DM fetch failed: ${e.message}`), { status: 502 });
  }
}

async function getAnalytics() {
  if (!features().analytics) {
    return { available: false, tier: config.twitterTier, message: 'Analytics require Basic tier or higher.' };
  }
  if (!config.isConfigured('twitter')) {
    return {
      available: true, sample: true,
      followers: 1240, followersDelta7d: 38,
      topTweets: [{ text: 'Backend reliability isn’t optional...', impressions: 18400, engagements: 620 }],
      geography: { US: 52, UK: 18, EU: 20, other: 10 },
    };
  }
  try {
    const { data } = await readClient().get('/users/me', { params: { 'user.fields': 'public_metrics' } });
    return { available: true, followers: data.data?.public_metrics?.followers_count };
  } catch (e) {
    logger.error('twitterService.getAnalytics failed', { error: e.message });
    throw Object.assign(new Error(`Twitter analytics fetch failed: ${e.message}`), { status: 502 });
  }
}

module.exports = { features, canPost, postTweet, postThread, postReply, getDMs, getAnalytics };
