const aiService = require('./aiService');
const db = require('../db');
const { clampScore } = require('../utils/helpers');

// Builds the signal bundle a health score is judged from, then asks AI for a
// score + one-line explanation (with a heuristic fallback so this never hard-fails).
function buildSignals({ client, projects = [], invoices = [], communications = [] }) {
  const lastComm = communications[0]; // communications passed in newest-first
  const daysSinceContact = lastComm
    ? Math.floor((Date.now() - new Date(lastComm.created_at).getTime()) / 86400000)
    : null;

  const overdueInvoices = invoices.filter((i) => i.status === 'overdue');
  const paidInvoices = invoices.filter((i) => i.status === 'paid');

  const today = new Date().toISOString().slice(0, 10);
  const overdueMilestonesOrProjects = projects.filter(
    (p) => p.status === 'active' && p.due_date && p.due_date < today
  );

  const recentSentiments = communications.slice(0, 5).map((c) => c.sentiment).filter(Boolean);
  const negativeCount = recentSentiments.filter((s) => s === 'negative').length;

  return {
    clientName: client.name,
    daysSinceLastContact: daysSinceContact,
    activeProjects: projects.filter((p) => p.status === 'active').length,
    overdueProjectsOrTimelines: overdueMilestonesOrProjects.length,
    overdueInvoiceCount: overdueInvoices.length,
    overdueInvoiceTotal: overdueInvoices.reduce((sum, i) => sum + Number(i.amount || 0), 0),
    paidInvoiceCount: paidInvoices.length,
    recentNegativeSentimentCount: negativeCount,
    recentCommunicationCount: communications.length,
  };
}

function heuristicHealthScore(signals) {
  let score = 8;
  if (signals.daysSinceLastContact !== null) {
    if (signals.daysSinceLastContact > 14) score -= 3;
    else if (signals.daysSinceLastContact > 7) score -= 2;
    else if (signals.daysSinceLastContact > 4) score -= 1;
  }
  score -= Math.min(3, signals.overdueInvoiceCount * 2);
  score -= Math.min(2, signals.overdueProjectsOrTimelines);
  score -= Math.min(2, signals.recentNegativeSentimentCount);
  return Math.max(1, Math.min(10, Math.round(score)));
}

function heuristicReason(signals, score) {
  const parts = [];
  if (signals.daysSinceLastContact !== null && signals.daysSinceLastContact > 4) {
    parts.push(`no contact in ${signals.daysSinceLastContact} days`);
  }
  if (signals.overdueInvoiceCount > 0) parts.push(`${signals.overdueInvoiceCount} overdue invoice(s)`);
  if (signals.overdueProjectsOrTimelines > 0) parts.push(`${signals.overdueProjectsOrTimelines} project(s) past due date`);
  if (signals.recentNegativeSentimentCount > 0) parts.push('recent negative sentiment');
  if (!parts.length) return `${signals.clientName} looks healthy — responsive, on schedule, no overdue payments.`;
  return `${signals.clientName}: ${parts.join(', ')}.`;
}

async function scoreClientHealth({ client, projects, invoices, communications }) {
  const signals = buildSignals({ client, projects, invoices, communications });
  const fallbackScore = heuristicHealthScore(signals);
  const fallbackReason = heuristicReason(signals, fallbackScore);

  const text = await aiService.safeComplete(
    {
      system:
        'You score client health for a solo backend engineering freelancer (AlphoTech), 1-10, based on: days since last ' +
        'contact, overdue invoices, projects past their due date, and recent communication sentiment. Weight overdue ' +
        'payments and long silences most heavily. Respond with ONLY a JSON object: ' +
        '{"score": <1-10 integer>, "reason": "<one specific sentence citing the actual signals>"}.',
      prompt: JSON.stringify(signals),
      json: true,
      maxTokens: 200,
    },
    JSON.stringify({ score: fallbackScore, reason: fallbackReason })
  );
  try {
    const parsed = JSON.parse(text);
    return { score: Math.max(1, Math.min(10, Math.round(parsed.score))), reason: parsed.reason };
  } catch {
    return { score: fallbackScore, reason: fallbackReason };
  }
}

// Shared by GET /api/clients/health (on-demand) and the daily clientHealth
// cron ("The Client Guardian") — one place that re-scores every active
// client so the two callers can't drift apart.
async function rescoreAllActiveClients() {
  const clients = await db.list('clients', { filters: { status: 'active' } });
  const results = [];
  for (const client of clients) {
    const [projects, invoices, communications] = await Promise.all([
      db.list('projects', { filters: { client_id: client.id } }),
      db.list('invoices', { filters: { client_id: client.id } }),
      db.list('communication_log', { filters: { client_id: client.id }, orderBy: { column: 'created_at', ascending: false } }),
    ]);
    const { score, reason } = await scoreClientHealth({ client, projects, invoices, communications });
    const updated = await db.update('clients', client.id, { health_score: clampScore(score), health_reason: reason });
    results.push(updated);
  }
  return results;
}

module.exports = { buildSignals, heuristicHealthScore, heuristicReason, scoreClientHealth, rescoreAllActiveClients };
