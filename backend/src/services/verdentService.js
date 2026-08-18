const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

function client() {
  return axios.create({
    baseURL: 'https://api.verdent.ai/v1',
    headers: { Authorization: `Bearer ${config.verdentKey}` },
    timeout: 15000,
  });
}

async function getInsights(metrics = {}) {
  if (!config.isConfigured('verdent')) {
    return [
      { text: 'Apollo sequence #3 has a 0% reply rate. Replace the subject line — try a specific pain point instead of a generic pitch.', sample: true },
      { text: "You've had leads from the UK this month but little from the US despite US-targeted content. Shift post times to 9am EST.", sample: true },
    ];
  }
  try {
    const { data } = await client().post('/insights', metrics);
    return data.insights || [];
  } catch (e) {
    logger.error('verdentService.getInsights failed', { error: e.message });
    throw Object.assign(new Error(`Verdent insights fetch failed: ${e.message}`), { status: 502 });
  }
}

module.exports = { getInsights };
