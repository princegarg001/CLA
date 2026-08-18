const cron = require('node-cron');
const config = require('../config');
const logger = require('../utils/logger');

const warRoomBrief = require('./warRoomBrief');
const jobFetch = require('./jobFetch');
const rssFetch = require('./rssFetch');
const leadScoring = require('./leadScoring');
const weeklyReport = require('./weeklyReport');

function wrap(name, job) {
  return async () => {
    logger.info(`cron: ${name} starting`);
    try {
      await job.run();
    } catch (e) {
      logger.error(`cron: ${name} failed`, { error: e.message });
    }
  };
}

let tasks = [];

function start() {
  if (!config.cronEnabled) {
    logger.info('cron: CRON_ENABLED is not true — automation is off. Set CRON_ENABLED=true in .env to enable.');
    return;
  }

  tasks = [
    cron.schedule('0 7 * * *', wrap('warRoomBrief', warRoomBrief)),        // daily 7am
    cron.schedule('0 */6 * * *', wrap('jobFetch', jobFetch)),             // every 6 hours
    cron.schedule('0 */4 * * *', wrap('rssFetch', rssFetch)),             // every 4 hours
    cron.schedule('0 * * * *', wrap('leadScoring', leadScoring)),         // hourly
    cron.schedule('0 7 * * 1', wrap('weeklyReport', weeklyReport)),       // Monday 7am
  ];

  logger.info(`cron: ${tasks.length} scheduled jobs started`);
}

function stop() {
  tasks.forEach((t) => t.stop());
  tasks = [];
}

module.exports = { start, stop };
