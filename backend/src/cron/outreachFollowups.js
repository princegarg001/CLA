const outreach = require('../services/outreachService');
const logger = require('../utils/logger');

// Hourly — anyone who has not replied after the configured number of days gets a follow-up draft
// (or an automatic send, if that is switched on and it is business hours).
async function run() {
  const r = await outreach.runFollowups();
  if (r.drafted) logger.info(`cron: outreachFollowups ${JSON.stringify(r)}`);
  return r;
}

module.exports = { run };
