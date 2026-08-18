const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

function client() {
  return axios.create({
    baseURL: config.apolloBaseUrl,
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': config.apolloApiKey },
    timeout: 15000,
  });
}

const SAMPLE_LEADS = [
  { name: 'David Chen', role: 'CTO', company: 'Finova Technologies', email: 'david@finova.example', company_size: 42, region: 'US', tech_stack: ['Python', 'Postgres', 'AWS'] },
  { name: 'Sarah Williams', role: 'VP Engineering', company: 'BuildFast', email: 'sarah@buildfast.example', company_size: 88, region: 'UK', tech_stack: ['Node.js', 'Kubernetes'] },
  { name: 'Lukas Weber', role: 'Founder & CTO', company: 'Kredix', email: 'lukas@kredix.example', company_size: 15, region: 'EU', tech_stack: ['Django', 'fintech'] },
];

async function searchPeople(icp = {}) {
  if (!config.isConfigured('apollo')) {
    return SAMPLE_LEADS.map((l) => ({ ...l, source: 'apollo', sample: true }));
  }
  try {
    const { data } = await client().post('/mixed_people/search', {
      person_titles: icp.titles,
      organization_num_employees_ranges: icp.employeeRanges,
      organization_locations: icp.regions,
      q_organization_keyword_tags: icp.techStack,
      per_page: icp.limit || 25,
    });
    return (data.people || []).map((p) => ({
      name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
      role: p.title,
      company: p.organization?.name,
      email: p.email,
      linkedin_url: p.linkedin_url,
      company_size: p.organization?.estimated_num_employees,
      region: p.organization?.country,
      source: 'apollo',
    }));
  } catch (e) {
    logger.error('apolloService.searchPeople failed', { error: e.message });
    throw Object.assign(new Error(`Apollo search failed: ${e.message}`), { status: 502 });
  }
}

async function enrichPerson(email) {
  if (!config.isConfigured('apollo')) {
    return { email, funding: '$2.1M Seed', headcount: 24, techStack: ['Python', 'React'], recentNews: 'Sample data — Apollo not configured', sample: true };
  }
  try {
    const { data } = await client().post('/people/match', { email });
    return data.person || {};
  } catch (e) {
    logger.error('apolloService.enrichPerson failed', { error: e.message });
    throw Object.assign(new Error(`Apollo enrich failed: ${e.message}`), { status: 502 });
  }
}

async function launchSequence({ sequenceId, contactId }) {
  if (!config.isConfigured('apollo')) {
    return { ok: true, sample: true, message: 'Apollo not configured — sequence launch simulated.' };
  }
  try {
    const { data } = await client().post(`/emailer_campaigns/${sequenceId}/add_contact_ids`, { contact_ids: [contactId] });
    return data;
  } catch (e) {
    logger.error('apolloService.launchSequence failed', { error: e.message });
    throw Object.assign(new Error(`Apollo sequence launch failed: ${e.message}`), { status: 502 });
  }
}

async function listSequences() {
  if (!config.isConfigured('apollo')) {
    return [
      { id: 'seq_1', name: 'Fintech CTO — Cold Open v3', openRate: 0.42, replyRate: 0.11, bookedCalls: 2, sample: true },
      { id: 'seq_2', name: 'UK VP Eng — Follow-up chain', openRate: 0.31, replyRate: 0.0, bookedCalls: 0, sample: true },
    ];
  }
  try {
    const { data } = await client().get('/emailer_campaigns');
    return data.emailer_campaigns || [];
  } catch (e) {
    logger.error('apolloService.listSequences failed', { error: e.message });
    throw Object.assign(new Error(`Apollo sequences fetch failed: ${e.message}`), { status: 502 });
  }
}

module.exports = { searchPeople, enrichPerson, launchSequence, listSequences };
