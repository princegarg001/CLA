const express = require('express');
const router = express.Router();
const db = require('../db');
const clientService = require('../services/clientService');
const aiService = require('../services/aiService');
const { asyncHandler, ok, fail } = require('../utils/helpers');

// GET /api/clients?status=&search= — list, newest first.
router.get('/', asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  let clients = await db.list('clients', { orderBy: { column: 'created_at', ascending: false } });
  if (status) clients = clients.filter((c) => c.status === status);
  if (search) {
    const q = String(search).toLowerCase();
    clients = clients.filter((c) => `${c.name} ${c.company || ''}`.toLowerCase().includes(q));
  }
  ok(res, clients);
}));

// GET /api/clients/health — AI-rescore every active client right now (also runs daily via cron).
router.get('/health', asyncHandler(async (req, res) => {
  ok(res, await clientService.rescoreAllActiveClients());
}));

// POST /api/clients/convert/:leadId — the locking transition: lead becomes a
// client, the source lead is locked so it stops resurfacing anywhere else.
router.post('/convert/:leadId', asyncHandler(async (req, res) => {
  const lead = await db.get('leads', req.params.leadId);
  if (!lead) return fail(res, 404, 'Lead not found');

  const client = await db.insert('clients', {
    lead_id: lead.id,
    name: lead.name || lead.company || 'Unnamed client',
    company: lead.company || null,
    email: lead.email || null,
    region: lead.region || null,
    status: 'active',
    health_score: 8,
    locked: true,
    ...(req.body || {}),
  });

  await db.update('leads', lead.id, { status: 'closed_won', locked: true });
  ok(res, client);
}));

// POST /api/clients — create directly (manual entry, not from a lead).
router.post('/', asyncHandler(async (req, res) => {
  const body = req.body || {};
  if (!body.name) return fail(res, 400, 'name is required');
  const client = await db.insert('clients', { status: 'active', health_score: 8, locked: true, ...body });
  ok(res, client);
}));

// GET /api/clients/:id — full profile: client + projects + invoices + recent timeline.
router.get('/:id', asyncHandler(async (req, res) => {
  const client = await db.get('clients', req.params.id);
  if (!client) return fail(res, 404, 'Client not found');
  const [projects, invoices, communications] = await Promise.all([
    db.list('projects', { filters: { client_id: client.id }, orderBy: { column: 'created_at', ascending: false } }),
    db.list('invoices', { filters: { client_id: client.id }, orderBy: { column: 'created_at', ascending: false } }),
    db.list('communication_log', { filters: { client_id: client.id }, orderBy: { column: 'created_at', ascending: false }, limit: 20 }),
  ]);
  ok(res, { ...client, projects, invoices, recentTimeline: communications });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const updated = await db.update('clients', req.params.id, req.body || {});
  if (!updated) return fail(res, 404, 'Client not found');
  ok(res, updated);
}));

// POST /api/clients/:id/reengage-draft — AI drafts a follow-up for a client whose health has dropped.
router.post('/:id/reengage-draft', asyncHandler(async (req, res) => {
  const client = await db.get('clients', req.params.id);
  if (!client) return fail(res, 404, 'Client not found');
  const draft = await aiService.generateOutreachMessage({
    lead: { name: client.name, company: client.company },
    tone: 'founder_to_founder',
    market: client.region || 'US',
    channel: client.preferred_channel || 'email',
    context: `Re-engagement check-in. Health score ${client.health_score}/10. Reason: ${client.health_reason || 'no recent contact'}.`,
  });
  ok(res, { draft });
}));

// ---- Projects ---------------------------------------------------------------

router.post('/:id/projects', asyncHandler(async (req, res) => {
  const client = await db.get('clients', req.params.id);
  if (!client) return fail(res, 404, 'Client not found');
  const body = req.body || {};
  if (!body.title) return fail(res, 400, 'title is required');
  const project = await db.insert('projects', { client_id: client.id, status: 'scoping', currency: 'USD', payment_type: 'fixed', hours_logged: 0, ...body });
  await db.update('clients', client.id, { total_projects: (client.total_projects || 0) + 1 });
  ok(res, project);
}));

router.patch('/:id/projects/:pid', asyncHandler(async (req, res) => {
  const updated = await db.update('projects', req.params.pid, req.body || {});
  if (!updated) return fail(res, 404, 'Project not found');
  ok(res, updated);
}));

// POST /api/clients/:id/projects/:pid/timer/start|stop — simple elapsed-time logging.
router.post('/:id/projects/:pid/timer/start', asyncHandler(async (req, res) => {
  const updated = await db.update('projects', req.params.pid, { timer_started_at: new Date().toISOString() });
  if (!updated) return fail(res, 404, 'Project not found');
  ok(res, updated);
}));

router.post('/:id/projects/:pid/timer/stop', asyncHandler(async (req, res) => {
  const project = await db.get('projects', req.params.pid);
  if (!project) return fail(res, 404, 'Project not found');
  if (!project.timer_started_at) return fail(res, 400, 'No timer is running for this project');
  const elapsedHours = (Date.now() - new Date(project.timer_started_at).getTime()) / 3600000;
  const updated = await db.update('projects', project.id, {
    hours_logged: Math.round(((project.hours_logged || 0) + elapsedHours) * 100) / 100,
    timer_started_at: null,
  });
  ok(res, updated);
}));

// ---- Milestones ---------------------------------------------------------------

router.post('/:id/milestones', asyncHandler(async (req, res) => {
  const body = req.body || {};
  if (!body.projectId || !body.title) return fail(res, 400, 'projectId and title are required');
  const project = await db.get('projects', body.projectId);
  if (!project || project.client_id !== req.params.id) return fail(res, 404, 'Project not found for this client');
  const milestone = await db.insert('milestones', {
    project_id: body.projectId, title: body.title, description: body.description, amount: body.amount,
    status: 'pending', due_date: body.dueDate,
  });
  ok(res, milestone);
}));

router.patch('/:id/milestones/:mid', asyncHandler(async (req, res) => {
  const { status } = req.body || {};
  const patch = { ...(req.body || {}) };
  if (status === 'delivered' && !patch.delivered_at) patch.delivered_at = new Date().toISOString();
  if (status === 'paid' && !patch.paid_at) patch.paid_at = new Date().toISOString();
  const updated = await db.update('milestones', req.params.mid, patch);
  if (!updated) return fail(res, 404, 'Milestone not found');
  ok(res, updated);
}));

// ---- Invoices ---------------------------------------------------------------

router.post('/:id/invoices', asyncHandler(async (req, res) => {
  const client = await db.get('clients', req.params.id);
  if (!client) return fail(res, 404, 'Client not found');
  const body = req.body || {};
  if (!body.amount) return fail(res, 400, 'amount is required');
  const invoice = await db.insert('invoices', { client_id: client.id, currency: 'USD', status: 'pending', ...body });
  ok(res, invoice);
}));

router.patch('/:id/invoices/:iid', asyncHandler(async (req, res) => {
  const existing = await db.get('invoices', req.params.iid);
  if (!existing) return fail(res, 404, 'Invoice not found');
  const { status } = req.body || {};
  const patch = { ...(req.body || {}) };
  if (status === 'paid' && !patch.paid_at) patch.paid_at = new Date().toISOString();
  const updated = await db.update('invoices', req.params.iid, patch);

  // Only credit revenue on the pending/sent/overdue -> paid transition, so
  // re-saving an already-paid invoice can't double-count it.
  if (status === 'paid' && existing.status !== 'paid') {
    const client = await db.get('clients', req.params.id);
    if (client) {
      await db.update('clients', client.id, { total_revenue: (client.total_revenue || 0) + Number(updated.amount || 0) });
      // Feeds Revenue Command's existing deals-based dashboard so a paid
      // client invoice shows up there without a separate revenue pipeline.
      await db.insert('deals', {
        lead_id: client.lead_id || null,
        title: `${client.name} — invoice payment`,
        value: Number(updated.amount || 0),
        currency: updated.currency || 'USD',
        source: 'client_vault',
        closed_at: updated.paid_at,
      });
    }
  }
  ok(res, updated);
}));

// ---- Timeline / communications ------------------------------------------------

router.get('/:id/timeline', asyncHandler(async (req, res) => {
  const communications = await db.list('communication_log', {
    filters: { client_id: req.params.id },
    orderBy: { column: 'created_at', ascending: false },
  });
  ok(res, communications);
}));

// POST /api/clients/:id/log — log a communication; AI summarizes + sentiment-scores it
// when full_content is given and summary/sentiment aren't already provided.
router.post('/:id/log', asyncHandler(async (req, res) => {
  const client = await db.get('clients', req.params.id);
  if (!client) return fail(res, 404, 'Client not found');
  const body = req.body || {};
  if (!body.channel) return fail(res, 400, 'channel is required');

  let { summary, sentiment } = body;
  if (!summary && body.fullContent) {
    const text = await aiService.safeComplete(
      {
        system:
          'Summarize this client communication in ONE short sentence, then rate its sentiment. ' +
          'Respond with ONLY a JSON object: {"summary": "<one sentence>", "sentiment": "positive|neutral|negative"}.',
        prompt: body.fullContent,
        json: true,
        maxTokens: 150,
      },
      null
    );
    if (text) {
      try {
        const parsed = JSON.parse(text);
        summary = parsed.summary;
        sentiment = sentiment || parsed.sentiment;
      } catch {
        // fall through to raw text below
      }
    }
  }

  const entry = await db.insert('communication_log', {
    client_id: client.id,
    channel: body.channel,
    direction: body.direction || 'outbound',
    summary: summary || body.fullContent?.slice(0, 140) || 'Logged interaction',
    full_content: body.fullContent || null,
    sentiment: sentiment || null,
  });
  ok(res, entry);
}));

module.exports = router;
