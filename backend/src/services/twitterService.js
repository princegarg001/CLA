const axios = require('axios');
const crypto = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');
const { isRetriable, upstreamMessage } = require('../utils/http');
const { splitThread } = require('./socialRules');

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
  const baseString = [method.toUpperCase(), encodeURIComponent(url), encodeURIComponent(paramString)].join('&');
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

async function postTweet(text, { replyToId, mediaIds } = {}) {
  if (!canPost()) {
    return {
      id: `sample_${Date.now()}`, text, sample: true,
      message: canPost() ? undefined : 'Twitter posting needs TWITTER_API_KEY/SECRET + TWITTER_ACCESS_TOKEN/SECRET (OAuth 1.0a user context) — returning sample response',
    };
  }
  try {
    const body = {};
    if (text) body.text = text;
    if (replyToId) body.reply = { in_reply_to_tweet_id: replyToId };
    if (mediaIds && mediaIds.length) body.media = { media_ids: mediaIds };
    return await writePost('/tweets', body);
  } catch (e) {
    logger.error('twitterService.postTweet failed', { error: e.response?.data || e.message });
    throw Object.assign(new Error(`Tweet post failed: ${upstreamMessage(e)}`), { status: 502, retriable: isRetriable(e) });
  }
}

// ---- Media upload (X API v2) -------------------------------------------------
// Images ≤5MB go up in one request; GIFs and videos use the chunked
// initialize → append → finalize flow and then poll until X finishes
// processing. Multipart/JSON bodies aren't part of an OAuth1 signature, so
// only the URL (and, for the GET status check, its query) is signed.
const MEDIA_URL = 'https://api.x.com/2/media/upload';
const MEDIA_CATEGORY = { image: 'tweet_image', gif: 'tweet_gif', video: 'tweet_video' };
const CHUNK_BYTES = 4 * 1024 * 1024;

async function multipartPost(url, fields, { file, fileField = 'media', filename = 'media', mime } = {}) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, String(v));
  if (file) form.append(fileField, new Blob([file], { type: mime || 'application/octet-stream' }), filename);
  const res = await fetch(url, { method: 'POST', headers: { Authorization: oauth1Header('POST', url) }, body: form });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* empty body on append */
  }
  if (!res.ok) {
    const err = new Error(json?.detail || json?.title || `X media upload failed (${res.status})`);
    err.response = { status: res.status, data: json || text };
    throw err;
  }
  return json;
}

async function waitForProcessing(mediaId, info) {
  let processing = info;
  for (let i = 0; i < 30 && processing; i++) {
    if (processing.state === 'succeeded') return;
    if (processing.state === 'failed') throw new Error(processing.error?.message || 'X could not process the media');
    await new Promise((resolve) => setTimeout(resolve, Math.max(1, processing.check_after_secs || 3) * 1000));
    const params = { command: 'STATUS', media_id: mediaId };
    const { data } = await axios.get(MEDIA_URL, {
      params,
      headers: { Authorization: oauth1Header('GET', MEDIA_URL, params) },
      timeout: 15000,
    });
    processing = data.data?.processing_info;
  }
}

// `m` is a downloaded media item: { buffer, mime, type: 'image'|'gif'|'video', name }.
async function uploadMedia(m) {
  const category = MEDIA_CATEGORY[m.type] || 'tweet_image';

  if (m.type === 'image') {
    const data = await multipartPost(MEDIA_URL, { media_category: category, media_type: m.mime }, { file: m.buffer, filename: m.name, mime: m.mime });
    return String(data.data.id);
  }

  const init = await axios.post(
    `${MEDIA_URL}/initialize`,
    { media_type: m.mime, total_bytes: m.buffer.length, media_category: category },
    { headers: { Authorization: oauth1Header('POST', `${MEDIA_URL}/initialize`), 'Content-Type': 'application/json' }, timeout: 30000 }
  );
  const mediaId = String(init.data.data.id);

  for (let i = 0, segment = 0; i < m.buffer.length; i += CHUNK_BYTES, segment++) {
    await multipartPost(
      `${MEDIA_URL}/${mediaId}/append`,
      { segment_index: segment },
      { file: m.buffer.subarray(i, i + CHUNK_BYTES), filename: m.name, mime: m.mime }
    );
  }

  const fin = await axios.post(`${MEDIA_URL}/${mediaId}/finalize`, null, {
    headers: { Authorization: oauth1Header('POST', `${MEDIA_URL}/${mediaId}/finalize`) },
    timeout: 30000,
  });
  await waitForProcessing(mediaId, fin.data?.data?.processing_info);
  return mediaId;
}

// One entry point for calendar/scheduler posts: text, images/GIF/video, or a
// whole thread (media rides on the first tweet).
async function publish({ text = '', media = [], postType = 'post' } = {}) {
  if (!canPost()) {
    return {
      status: 'skipped',
      sample: true,
      reason: 'Twitter posting needs TWITTER_API_KEY/SECRET + TWITTER_ACCESS_TOKEN/SECRET (OAuth 1.0a user context).',
    };
  }
  const posted = [];
  try {
    const mediaIds = [];
    for (const m of media) mediaIds.push(await uploadMedia(m));

    const tweets = postType === 'thread' ? splitThread(text) : [text];
    let replyToId;
    for (let i = 0; i < tweets.length; i++) {
      const tweet = await postTweet(tweets[i], { replyToId, mediaIds: i === 0 ? mediaIds : undefined });
      posted.push(tweet.id);
      replyToId = tweet.id;
    }
    return { status: 'success', externalPostId: posted[0], url: `https://x.com/i/status/${posted[0]}`, ids: posted };
  } catch (e) {
    logger.error('twitterService.publish failed', { error: e.response?.data || e.message });
    // If part of a thread is already live, retrying from the top would
    // duplicate it — flag it for a manual finish instead.
    if (posted.length) {
      return {
        status: 'failed',
        retriable: false,
        externalPostId: posted[0],
        url: `https://x.com/i/status/${posted[0]}`,
        error: `Thread stopped after ${posted.length} tweet(s): ${e.message}. The posted part is live — finish the rest manually.`,
      };
    }
    return { status: 'failed', error: upstreamMessage(e), retriable: e.retriable === true || isRetriable(e) };
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

module.exports = { features, canPost, postTweet, postThread, postReply, publish, uploadMedia, getDMs, getAnalytics };
