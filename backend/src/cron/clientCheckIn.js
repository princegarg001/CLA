const db = require('../db');
const referralService = require('../services/referralService');
const logger = require('../utils/logger');

// Runs monthly — active/past clients with no logged communication in 30+
// days get a check-in message drafted (never auto-sent). Monthly cadence
// itself prevents re-drafting the same client repeatedly, unlike
// referralFollowUp.js which needs its own dedup since it runs daily.
async function run() {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const clients = await db.list('clients', {});
  const relevant = clients.filter((c) => c.status === 'active' || c.status === 'completed');

  let drafted = 0;
  for (const client of relevant) {
    try {
      const recentComms = await db.list('communication_log', {
        filters: { client_id: client.id },
        orderBy: { column: 'created_at', ascending: false },
        limit: 1,
      });
      const lastContact = recentComms[0]?.created_at ? new Date(recentComms[0].created_at).getTime() : 0;
      if (lastContact > cutoff) continue;

      const body = await referralService.draftMonthlyCheckIn({ client });
      await db.insert('messages', {
        client_id: client.id,
        channel: client.preferred_channel || 'email',
        tone: 'founder_to_founder',
        body,
        direction: 'outbound',
        ai_generated: true,
        status: 'draft',
      });
      drafted += 1;
    } catch (e) {
      logger.warn('clientCheckIn: failed for one client', { clientId: client.id, error: e.message });
    }
  }

  logger.info(`cron: clientCheckIn drafted ${drafted}/${relevant.length} check-ins`);
  return { checked: relevant.length, drafted };
}

module.exports = { run };
