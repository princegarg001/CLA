const db = require('../db');
const clientService = require('../services/clientService');
const logger = require('../utils/logger');

// Runs daily at 8am — "The Client Guardian". Re-scores every active client's
// health, then checks for milestones due this week and overdue invoices.
// Nothing is auto-sent: results just make the signal available (client
// health_score/health_reason on the client record; the rest in this run's
// agent_runs log) for the War Room feed and Client Vault screen to surface.
async function run() {
  const rescored = await clientService.rescoreAllActiveClients();

  const today = new Date().toISOString().slice(0, 10);
  const weekOut = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const [projects, invoices] = await Promise.all([db.list('projects'), db.list('invoices')]);

  const milestonesDueThisWeek = (await db.list('milestones'))
    .filter((m) => m.status !== 'paid' && m.due_date && m.due_date >= today && m.due_date <= weekOut);
  const overdueInvoices = invoices.filter((i) => i.status !== 'paid' && i.due_date && i.due_date < today);
  const lowHealthClients = rescored.filter((c) => c.health_score < 6);

  await db.insert('agent_runs', {
    agent: 'client_guardian',
    trigger: 'cron',
    status: 'success',
    input: { clientsChecked: rescored.length, projectsChecked: projects.length },
    output: {
      lowHealthClients: lowHealthClients.map((c) => ({ id: c.id, name: c.name, score: c.health_score, reason: c.health_reason })),
      milestonesDueThisWeek: milestonesDueThisWeek.length,
      overdueInvoices: overdueInvoices.length,
    },
    finished_at: new Date().toISOString(),
  });

  logger.info(
    `cron: clientHealth rescored ${rescored.length} clients — ${lowHealthClients.length} below 6/10, ` +
    `${milestonesDueThisWeek.length} milestones due this week, ${overdueInvoices.length} overdue invoices`
  );
  return { rescored: rescored.length, lowHealthClients: lowHealthClients.length, milestonesDueThisWeek: milestonesDueThisWeek.length, overdueInvoices: overdueInvoices.length };
}

module.exports = { run };
