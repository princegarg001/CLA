const outreach = require('../services/outreachService');
const logger = require('../utils/logger');

// Every 10 minutes — reads the outreach mailbox for replies, bounces and unsubscribes.
async function run() {
  const r = await outreach.syncReplies();
  if (r.skipped) return r;
  if (r.replies || r.bounces || r.unsubscribes) logger.info(`cron: outreachSync ${JSON.stringify(r)}`);
  return r;
}

module.exports = { run };
