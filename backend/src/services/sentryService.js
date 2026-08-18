const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

function client() {
  return axios.create({
    baseURL: 'https://sentry.io/api/0',
    headers: { Authorization: `Bearer ${config.sentryAuthToken}` },
    timeout: 15000,
  });
}

async function getIssues() {
  if (!config.isConfigured('sentry')) {
    return {
      errorsToday: 2, critical: 1, warnings: 1, resolved: 5,
      recent: [{ title: 'Contact form failing for Safari users', level: 'error', time: '2h ago' }],
      sample: true,
    };
  }
  try {
    const { data } = await client().get(`/projects/${config.sentryOrg}/${config.sentryProject}/issues/`, {
      params: { statsPeriod: '24h', query: 'is:unresolved' },
    });
    const critical = data.filter((i) => i.level === 'fatal' || i.level === 'error').length;
    const warnings = data.filter((i) => i.level === 'warning').length;
    return {
      errorsToday: data.length,
      critical,
      warnings,
      resolved: 0,
      recent: data.slice(0, 10).map((i) => ({ title: i.title, level: i.level, time: i.lastSeen })),
    };
  } catch (e) {
    logger.error('sentryService.getIssues failed', { error: e.message });
    throw Object.assign(new Error(`Sentry issues fetch failed: ${e.message}`), { status: 502 });
  }
}

module.exports = { getIssues };
