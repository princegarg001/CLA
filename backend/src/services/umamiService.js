const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

function client() {
  return axios.create({
    baseURL: config.umamiBaseUrl,
    headers: { Authorization: `Bearer ${config.umamiToken}` },
    timeout: 15000,
  });
}

async function getStats({ startAt, endAt } = {}) {
  if (!config.isConfigured('umami')) {
    return {
      pageviews: 87, visitors: 543, bounceRate: 0.38,
      topSources: [{ name: 'Google', pct: 34 }, { name: 'Twitter', pct: 28 }, { name: 'Direct', pct: 20 }],
      topPages: [{ path: '/', views: 210 }, { path: '/contact', views: 64 }],
      geography: { US: 44, UK: 21, EU: 19, other: 16 },
      sample: true,
    };
  }
  try {
    const end = endAt || Date.now();
    const start = startAt || end - 7 * 24 * 60 * 60 * 1000;
    const { data } = await client().get(`/websites/${config.umamiSiteId}/stats`, { params: { startAt: start, endAt: end } });
    return data;
  } catch (e) {
    logger.error('umamiService.getStats failed', { error: e.message });
    throw Object.assign(new Error(`Umami stats fetch failed: ${e.message}`), { status: 502 });
  }
}

async function getActiveVisitors() {
  if (!config.isConfigured('umami')) return { visitors: 3, sample: true };
  try {
    const { data } = await client().get(`/websites/${config.umamiSiteId}/active`);
    return data;
  } catch (e) {
    logger.error('umamiService.getActiveVisitors failed', { error: e.message });
    throw Object.assign(new Error(`Umami active visitors fetch failed: ${e.message}`), { status: 502 });
  }
}

module.exports = { getStats, getActiveVisitors };
