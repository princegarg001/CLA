const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

function client() {
  return axios.create({
    baseURL: 'https://api.headai.com/v1',
    headers: { Authorization: `Bearer ${config.headaiKey}` },
    timeout: 15000,
  });
}

async function getHiringSignals({ region = 'US', minRoles = 5, days = 30 } = {}) {
  if (!config.isConfigured('headai')) {
    return [
      { company: 'SnapData', hires: 5, roles: ['Backend Engineer', 'DevOps'], region: 'US', sample: true },
      { company: 'Ledgerly', hires: 7, roles: ['Backend Engineer x3', 'SRE'], region: 'UK', sample: true },
    ];
  }
  try {
    const { data } = await client().get('/hiring-signals', { params: { region, minRoles, days } });
    return data.companies || [];
  } catch (e) {
    logger.error('headaiService.getHiringSignals failed', { error: e.message });
    throw Object.assign(new Error(`HeadAI hiring signals fetch failed: ${e.message}`), { status: 502 });
  }
}

module.exports = { getHiringSignals };
