const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

function client() {
  return axios.create({
    baseURL: 'https://api.twitter.com/2',
    headers: { Authorization: `Bearer ${config.twitterBearer}` },
    timeout: 15000,
  });
}

const TIER_FEATURES = {
  free: { post: true, read: false, dms: false, analytics: false, search: false },
  basic: { post: true, read: true, dms: true, analytics: true, search: false },
  pro: { post: true, read: true, dms: true, analytics: true, search: true },
};

function features() {
  return TIER_FEATURES[config.twitterTier] || TIER_FEATURES.free;
}

async function postTweet(text) {
  if (!config.isConfigured('twitter')) {
    return { id: `sample_${Date.now()}`, text, sample: true, message: 'No Twitter token set — returning sample response' };
  }
  try {
    const { data } = await client().post('/tweets', { text });
    return data.data;
  } catch (e) {
    logger.error('twitterService.postTweet failed', { error: e.message });
    throw Object.assign(new Error(`Tweet post failed: ${e.message}`), { status: 502 });
  }
}

async function getDMs() {
  if (!features().dms) {
    return { available: false, tier: config.twitterTier, message: 'DMs require Basic tier or higher.', data: [] };
  }
  if (!config.isConfigured('twitter')) {
    return { available: true, sample: true, data: [{ from: '@founder_ux', text: 'Saw your thread, can we talk pricing?', time: '1h ago' }] };
  }
  try {
    const { data } = await client().get('/dm_events', { params: { 'dm_event.fields': 'text,created_at' } });
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
    const { data } = await client().get('/users/me', { params: { 'user.fields': 'public_metrics' } });
    return { available: true, followers: data.data?.public_metrics?.followers_count };
  } catch (e) {
    logger.error('twitterService.getAnalytics failed', { error: e.message });
    throw Object.assign(new Error(`Twitter analytics fetch failed: ${e.message}`), { status: 502 });
  }
}

module.exports = { features, postTweet, getDMs, getAnalytics };
