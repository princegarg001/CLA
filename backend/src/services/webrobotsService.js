const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

function client() {
  return axios.create({
    baseURL: 'https://api.webrobots.io/v1',
    headers: { Authorization: `Bearer ${config.webrobotsKey}` },
    timeout: 20000,
  });
}

// Scrapes job postings — a company posting "Backend Engineer" and struggling to fill it
// is a strong AlphoTech signal, per the Apollo Hunter screen spec.
async function scrapeJobPostings({ keywords = ['backend engineer', 'devops'], region = 'US' } = {}) {
  if (!config.isConfigured('webrobots')) {
    return [
      { company: 'Fintra', title: 'Backend Engineer (Python)', postedDaysAgo: 12, region: 'US', sample: true },
      { company: 'Cargofy', title: 'DevOps / Infrastructure Engineer', postedDaysAgo: 21, region: 'UK', sample: true },
    ];
  }
  try {
    const { data } = await client().get('/scrape/job-postings', { params: { keywords: keywords.join(','), region } });
    return data.results || [];
  } catch (e) {
    logger.error('webrobotsService.scrapeJobPostings failed', { error: e.message });
    throw Object.assign(new Error(`WebRobots scrape failed: ${e.message}`), { status: 502 });
  }
}

async function scrapeCompanyPage(url) {
  if (!config.isConfigured('webrobots')) {
    return { url, headcount: 34, techStack: ['Ruby on Rails', 'Postgres'], sample: true };
  }
  try {
    const { data } = await client().get('/scrape/company', { params: { url } });
    return data;
  } catch (e) {
    logger.error('webrobotsService.scrapeCompanyPage failed', { error: e.message });
    throw Object.assign(new Error(`WebRobots company scrape failed: ${e.message}`), { status: 502 });
  }
}

module.exports = { scrapeJobPostings, scrapeCompanyPage };
