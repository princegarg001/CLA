const db = require('../db');
const leadPipelineService = require('../services/leadPipelineService');
const logger = require('../utils/logger');

// Runs every 6 hours — the back half of Workflow 4's Gumroad branch: a
// score-8+ Gumroad download that's still sitting in 'new' 48h later gets
// auto-queued into the default Apollo sequence (config.apolloDefaultSequenceId)
// rather than going cold, since silence usually just means they haven't
// seen the AI-drafted follow-up yet.
async function run() {
  const { checked, queued } = await leadPipelineService.autoQueueStaleHighScoreGumroadLeads();

  await db.insert('agent_runs', {
    agent: 'lead_pipeline',
    trigger: 'cron',
    status: 'success',
    input: { rule: 'gumroad score>=8, status=new, 48h+' },
    output: { checked, queued },
    finished_at: new Date().toISOString(),
  });

  logger.info(`cron: gumroadFollowUp checked ${checked} stale high-score Gumroad leads, queued ${queued}`);
  return { checked, queued };
}

module.exports = { run };
