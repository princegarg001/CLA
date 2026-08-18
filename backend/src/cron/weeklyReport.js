const db = require('../db');
const aiService = require('../services/aiService');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

// Runs Monday 7am — the weekly performance push notification described in the master plan.
async function run() {
  const [leads, deals] = await Promise.all([db.list('leads'), db.list('deals')]);
  const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const newLeads = leads.filter((l) => new Date(l.created_at).getTime() >= since);
  const newDeals = deals.filter((d) => new Date(d.closed_at || d.created_at).getTime() >= since);
  const callsBooked = newLeads.filter((l) => l.status === 'call_booked' || l.status === 'closed_won').length;

  const metrics = {
    newLeads: newLeads.length,
    callsBooked,
    dealsClosed: newDeals.length,
    revenueClosed: newDeals.reduce((s, d) => s + (Number(d.value) || 0), 0),
  };
  const insight = await aiService.weeklyStrategicInsight(metrics);
  const summary = `New leads: ${metrics.newLeads} · Calls booked: ${metrics.callsBooked} · Deals closed: ${metrics.dealsClosed} · Revenue: $${metrics.revenueClosed}\n\n${insight}`;

  await db.updateSettings({ last_weekly_report: { ...metrics, insight, generatedAt: new Date().toISOString() } });
  await emailService.sendAlert('Weekly performance report', summary);
  logger.info('cron: weeklyReport generated and sent');
  return { ...metrics, insight };
}

module.exports = { run };
