const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

function client() {
  return axios.create({
    baseURL: config.agentscopeUrl,
    headers: { Authorization: `Bearer ${config.agentscopeKey}` },
    timeout: 20000,
  });
}

const AGENTS = ['prospector', 'publisher', 'researcher'];

async function getStatus() {
  if (!config.isConfigured('agentscope')) {
    return {
      running: 2, queued: 1, sample: true,
      agents: [
        { name: 'prospector', status: 'running', lastRun: new Date(Date.now() - 3600e3).toISOString() },
        { name: 'publisher', status: 'idle', lastRun: new Date(Date.now() - 86400e3).toISOString() },
        { name: 'researcher', status: 'running', lastRun: new Date(Date.now() - 600e3).toISOString() },
      ],
    };
  }
  try {
    const { data } = await client().get('/agents/status');
    return data;
  } catch (e) {
    logger.error('agentscopeService.getStatus failed', { error: e.message });
    throw Object.assign(new Error(`AgentScope status fetch failed: ${e.message}`), { status: 502 });
  }
}

async function triggerAgent(agent, input = {}) {
  if (!AGENTS.includes(agent)) {
    throw Object.assign(new Error(`Unknown agent "${agent}". Expected one of: ${AGENTS.join(', ')}`), { status: 400 });
  }
  if (!config.isConfigured('agentscope')) {
    return { agent, status: 'success', sample: true, output: { message: `Simulated run of ${agent} (AgentScope not configured).` } };
  }
  try {
    const { data } = await client().post(`/agents/${agent}/run`, input);
    return data;
  } catch (e) {
    logger.error('agentscopeService.triggerAgent failed', { agent, error: e.message });
    throw Object.assign(new Error(`AgentScope agent run failed: ${e.message}`), { status: 502 });
  }
}

module.exports = { AGENTS, getStatus, triggerAgent };
