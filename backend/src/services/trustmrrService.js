const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

function client() {
  return axios.create({
    baseURL: config.trustmrrBase,
    headers: { Authorization: `Bearer ${config.trustmrrKey}` },
    timeout: 15000,
  });
}

async function getMrr() {
  if (!config.isConfigured('trustmrr')) {
    return { mrr: 340, arr: 4080, newMrr: 90, churnRate: 0.02, expansionMrr: 20, netRevenueRetention: 1.06, sample: true };
  }
  try {
    const { data } = await client().get('/mrr');
    return data;
  } catch (e) {
    logger.error('trustmrrService.getMrr failed', { error: e.message });
    throw Object.assign(new Error(`TrustMRR fetch failed: ${e.message}`), { status: 502 });
  }
}

async function getTrend(weeks = 12) {
  if (!config.isConfigured('trustmrr')) {
    return Array.from({ length: weeks }, (_, i) => ({
      week: i + 1,
      mrr: Math.round(150 + i * 18 + Math.sin(i) * 15),
    }));
  }
  try {
    const { data } = await client().get('/mrr/trend', { params: { weeks } });
    return data;
  } catch (e) {
    logger.error('trustmrrService.getTrend failed', { error: e.message });
    throw Object.assign(new Error(`TrustMRR trend fetch failed: ${e.message}`), { status: 502 });
  }
}

module.exports = { getMrr, getTrend };
