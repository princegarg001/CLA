const cron = require('node-cron');
const config = require('../config');
const logger = require('../utils/logger');

const warRoomBrief = require('./warRoomBrief');
const jobFetch = require('./jobFetch');
const rssFetch = require('./rssFetch');
const leadScoring = require('./leadScoring');
const weeklyReport = require('./weeklyReport');
const redditMonitor = require('./redditMonitor');
const postScheduler = require('./postScheduler');
const contentCalendar = require('./contentCalendar');
const clientHealth = require('./clientHealth');
const gumroadFollowUp = require('./gumroadFollowUp');

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
    cron.schedule('0 7 * * *', wrap('warRoomBrief', warRoomBrief)),          // daily 7am
    cron.schedule('0 */6 * * *', wrap('jobFetch', jobFetch)),                // every 6 hours
    cron.schedule('0 */4 * * *', wrap('rssFetch', rssFetch)),                // every 4 hours
    cron.schedule('0 * * * *', wrap('leadScoring', leadScoring)),            // hourly
    cron.schedule('0 7 * * 1', wrap('weeklyReport', weeklyReport)),          // Monday 7am
    cron.schedule('0 */6 * * *', wrap('redditMonitor', redditMonitor)),      // every 6 hours — "The Prospector" (Reddit half)
    cron.schedule('*/5 * * * *', wrap('postScheduler', postScheduler)),      // every 5 min — fires anything due in scheduled_posts/content_calendar
    cron.schedule('0 20 * * 0', wrap('contentCalendar', contentCalendar)),   // Sunday 8pm — "The Publisher" weekly auto-fill
    cron.schedule('0 8 * * *', wrap('clientHealth', clientHealth)),          // daily 8am — "The Client Guardian"
    cron.schedule('0 */6 * * *', wrap('gumroadFollowUp', gumroadFollowUp)),  // every 6 hours — Workflow 4's 48h Gumroad auto-follow-up
  ];

  logger.info(`cron: ${tasks.length} scheduled jobs started`);
}

function stop() {
  tasks.forEach((t) => t.stop());
  tasks = [];
}

module.exports = { start, stop };
