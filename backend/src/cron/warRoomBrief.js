const db = require('../db');
const logger = require('../utils/logger');
const { buildMissions } = require('../routes/warRoom');

// Runs at 7am daily — pre-generates the day's 3 missions so the War Room screen loads instantly.
async function run() {
  const today = new Date().toISOString().slice(0, 10);
  const missions = await buildMissions();
  await db.updateSettings({ [`warroom_missions_${today}`]: missions });
  logger.info(`cron: warRoomBrief generated ${missions.length} missions for ${today}`);
  return missions;
}

module.exports = { run };
