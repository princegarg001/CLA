const db = require('../db');
const config = require('../config');
const aiService = require('./aiService');
const mailService = require('./mailService');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');

// Outreach that is real end to end: drafts are sent through the founder's own mailbox, follow-ups
// are queued and (optionally) sent on a schedule, and the same mailbox is read to detect replies,
// bounces and unsubscribes. Every send is guarded: daily cap, suppression list, no double contact.
//
// Extra fields live in messages.meta (one jsonb column) so the table needs a single migration:
//   outbound: { to, messageId, threadId, followupStep, followupOf, nextFollowupAt, inReplyTo,
//               references, manual, lastError, repliedAt, bounced }
//   inbound:  { messageId, from, kind, threadId, inReplyTo, intent, next }

const DAY = 86400000;
const EMAIL_CHANNELS = new Set(['apollo_email', 'email']);

const DEFAULTS = {
  dailyCap: 25, // emails per rolling 24h. Cold mail from a personal mailbox gets flagged past this.
  minDaysBetweenContacts: 14, // never cold-email the same lead again inside this window
  followupDays: [3, 7], // days after the previous send
  maxFollowups: 2,
  autoSendFollowups: false, // off: follow-ups wait as drafts for your approval
  signature: '',
  footer: 'If this is not relevant, just reply "no thanks" and I will not email again.',
  postalAddress: '',
};

async function getSettings() {
  const s = await db.getSettings();
  return { ...DEFAULTS, ...(s.outreach || {}) };
}

async function saveSettings(patch = {}) {
  const current = await getSettings();
  const next = { ...current };
  const num = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v))));
  if (patch.dailyCap != null && Number.isFinite(Number(patch.dailyCap))) next.dailyCap = num(patch.dailyCap, 1, 200);
  if (patch.minDaysBetweenContacts != null && Number.isFinite(Number(patch.minDaysBetweenContacts))) next.minDaysBetweenContacts = num(patch.minDaysBetweenContacts, 0, 180);
  if (Array.isArray(patch.followupDays)) next.followupDays = patch.followupDays.map((d) => num(d, 1, 60)).filter(Number.isFinite).slice(0, 4);
  if (patch.maxFollowups != null && Number.isFinite(Number(patch.maxFollowups))) next.maxFollowups = num(patch.maxFollowups, 0, 4);
  if (typeof patch.autoSendFollowups === 'boolean') next.autoSendFollowups = patch.autoSendFollowups;
  for (const k of ['signature', 'footer', 'postalAddress']) if (typeof patch[k] === 'string') next[k] = patch[k].slice(0, 600);
  await db.updateSettings({ outreach: next });
  return next;
}

// ---- pure helpers (unit tested) ---------------------------------------------------

const meta = (m) => (m && m.meta) || {};
const norm = (s) => String(s || '').trim().toLowerCase();

function firstName(lead) {
  const n = String(lead.name || '').trim();
  if (!n || n.includes('@')) return 'there';
  return n.split(/\s+/)[0];
}

// {{name}} {{first_name}} {{company}} {{role}} — unknown variables are left visible so a
// missing value is noticed in the preview instead of going out as an empty gap.
function renderTemplate(text, lead = {}) {
  const vars = { name: lead.name || 'there', first_name: firstName(lead), company: lead.company || 'your company', role: lead.role || '' };
  return String(text || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (k in vars ? vars[k] : m));
}

// The first line "Subject: ..." of a template/draft body becomes the subject.
function splitSubject(body) {
  const m = /^\s*subject:\s*(.+)\n+([\s\S]*)$/i.exec(String(body || ''));
  return m ? { subject: m[1].trim(), body: m[2].trim() } : { subject: null, body: String(body || '').trim() };
}

// What is actually emailed: the body plus signature and the opt-out footer.
function composeEmailText(body, settings) {
  const parts = [String(body || '').trim()];
  if (settings.signature) parts.push(settings.signature.trim());
  const foot = [settings.footer, settings.postalAddress].filter((x) => x && x.trim()).map((x) => x.trim());
  if (foot.length) parts.push(`--\n${foot.join('\n')}`);
  return parts.join('\n\n');
}

function nextFollowupAt(sentAt, step, settings) {
  if (step >= settings.maxFollowups || step >= settings.followupDays.length) return null;
  return new Date(new Date(sentAt).getTime() + settings.followupDays[step] * DAY).toISOString();
}

function sentInLast24h(messages, now = Date.now()) {
  return messages.filter((m) => m.direction === 'outbound' && ['sent', 'replied'].includes(m.status) && m.sent_at && now - new Date(m.sent_at).getTime() < DAY && !meta(m).manual).length;
}

// Everything that must stop a send, and things worth a warning. force=true overrides only the
// soft rules (recent contact); the cap, suppression and address checks can never be forced.
function sendCheck({ lead, to, settings, suppressed = [], messages = [], isFollowup = false, force = false, now = Date.now() }) {
  const blockers = [];
  const warnings = [];
  if (!mailService.isEmail(to)) blockers.push('There is no valid email address for this lead.');
  if (suppressed.map(norm).includes(norm(to))) blockers.push('This address opted out or bounced, so it is on the do-not-contact list.');
  const sent = sentInLast24h(messages, now);
  if (sent >= settings.dailyCap) blockers.push(`Daily limit reached (${sent}/${settings.dailyCap} in the last 24 hours).`);

  const recent = messages.filter(
    (m) => m.direction === 'outbound' && m.lead_id && lead && m.lead_id === lead.id && ['sent', 'replied'].includes(m.status) && m.sent_at && now - new Date(m.sent_at).getTime() < settings.minDaysBetweenContacts * DAY
  );
  if (!isFollowup && recent.length && !force) blockers.push(`You already emailed this lead ${Math.round((now - new Date(recent[0].sent_at).getTime()) / DAY)} day(s) ago. Wait, or send anyway.`);
  if (lead && lead.status === 'closed_lost') warnings.push('This lead is marked lost.');
  if (lead && ['replied', 'call_booked', 'proposal_sent'].includes(lead.status) && !isFollowup) warnings.push('This lead has already replied: continue the thread instead of a cold message.');
  return { ok: blockers.length === 0, blockers, warnings, sentLast24h: sent };
}

function inSendWindow(now = Date.now(), tz = config.defaultTimezone) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false, weekday: 'short' }).formatToParts(new Date(now));
    const hour = Number(parts.find((p) => p.type === 'hour').value) % 24;
    const day = parts.find((p) => p.type === 'weekday').value;
    return !['Sat', 'Sun'].includes(day) && hour >= 9 && hour < 18;
  } catch {
    return true;
  }
}

function matchInbound(mail, outbound) {
  const emailed = outbound.filter((m) => meta(m).messageId);
  const byId = new Map(emailed.map((m) => [meta(m).messageId, m]));
  for (const ref of [mail.inReplyTo, ...(mail.references || [])].filter(Boolean)) {
    if (byId.has(ref)) return byId.get(ref);
  }
  const latest = (arr) => arr.sort((a, b) => new Date(b.sent_at || 0) - new Date(a.sent_at || 0))[0] || null;
  if (mail.kind === 'bounce') {
    const inBody = emailed.filter((m) => (mail.rawText || '').includes(meta(m).messageId));
    if (inBody.length) return latest(inBody);
    const who = mailService.bouncedRecipient(mail.rawText);
    if (who) return latest(emailed.filter((m) => norm(meta(m).to) === who));
    return null;
  }
  return latest(emailed.filter((m) => norm(meta(m).to) === norm(mail.from)));
}

function stats(messages, settings, now = Date.now()) {
  const out = messages.filter((m) => m.direction === 'outbound');
  const contacted = new Set(out.filter((m) => ['sent', 'replied'].includes(m.status)).map((m) => m.lead_id || m.id));
  const replied = new Set(messages.filter((m) => (m.direction === 'inbound' && meta(m).kind === 'reply') || (m.direction === 'outbound' && m.status === 'replied')).map((m) => m.lead_id || m.id));
  return {
    drafts: out.filter((m) => m.status === 'draft').length,
    followupsWaiting: out.filter((m) => m.status === 'draft' && meta(m).followupOf).length,
    sent: out.filter((m) => ['sent', 'replied'].includes(m.status)).length,
    peopleContacted: contacted.size,
    replies: replied.size,
    replyRate: contacted.size ? Math.round((replied.size / contacted.size) * 100) : 0,
    bounced: out.filter((m) => meta(m).bounced).length,
    failed: out.filter((m) => m.status === 'failed').length,
    sentLast24h: sentInLast24h(messages, now),
    dailyCap: settings.dailyCap,
    followupsDue: out.filter((m) => m.status === 'sent' && meta(m).nextFollowupAt && new Date(meta(m).nextFollowupAt).getTime() <= now).length,
  };
}

// Conversation view: one entry per lead, oldest message first, newest conversation first.
function buildThreads(messages, leads) {
  const byLead = new Map();
  for (const m of messages) {
    const key = m.lead_id || `msg:${m.id}`;
    if (!byLead.has(key)) byLead.set(key, []);
    byLead.get(key).push(m);
  }
  const leadById = new Map(leads.map((l) => [l.id, l]));
  const threads = [];
  for (const [key, list] of byLead) {
    list.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    const last = list[list.length - 1];
    const lead = leadById.get(list[0].lead_id);
    const lastInbound = [...list].reverse().find((m) => m.direction === 'inbound' && meta(m).kind === 'reply');
    const lastOutbound = [...list].reverse().find((m) => m.direction === 'outbound' && ['sent', 'replied'].includes(m.status));
    threads.push({
      key,
      lead: lead ? { id: lead.id, name: lead.name, company: lead.company, email: lead.email, status: lead.status, score: lead.score } : null,
      messages: list,
      // A message is "active" when it was sent or received, not when its draft was first saved.
      lastActivity: list.map((m) => m.sent_at || m.created_at).filter(Boolean).sort().pop() || last.created_at,
      awaitingYou: !!lastInbound && (!lastOutbound || new Date(lastInbound.created_at) > new Date(lastOutbound.sent_at || 0)),
      hasDraft: list.some((m) => m.status === 'draft'),
    });
  }
  return threads.sort((a, b) => new Date(b.lastActivity || 0) - new Date(a.lastActivity || 0));
}

// "INTENT: ... NEXT: ..." from the AI; deliberately plain text (JSON mode is unreliable here).
function parseReplyInsight(text) {
  const intent = /(?:^|\n)\s*INTENT:\s*(interested|question|not_now|no|other)\b/i.exec(text || '');
  const next = /(?:^|\n)\s*NEXT:\s*([\s\S]*?)$/i.exec(text || '');
  if (!intent) return null;
  return { intent: intent[1].toLowerCase(), next: next ? next[1].trim().slice(0, 300) : '' };
}

function parseEmailDraft(text) {
  const subject = /(?:^|\n)\s*SUBJECT:\s*(.+)/i.exec(text || '');
  const body = /(?:^|\n)\s*BODY:\s*([\s\S]*)$/i.exec(text || '');
  if (!subject || !body) return null;
  const out = { subject: subject[1].trim().replace(/^["']|["']$/g, ''), body: body[1].trim() };
  return out.subject && out.body.length > 40 ? out : null;
}

// ---- drafting ---------------------------------------------------------------------

const FALLBACK_BODY =
  'Hi {{first_name}},\n\nI run AlphoTech, a small backend and automation studio (APIs, integrations, Python/Node, DevOps). ' +
  'I came across {{company}} and thought we might be able to help. If it is useful, I can send a short plan and a fixed quote by tomorrow.\n\nWould that be worth a look?';

async function draftEmail({ lead, tone = 'founder_to_founder', market = 'US', template = null }) {
  if (template) {
    const rendered = splitSubject(renderTemplate(template.body, lead));
    return { subject: rendered.subject || `Quick question, ${lead.company || firstName(lead)}`, body: rendered.body, ai: false };
  }
  const rec = (lead.raw && lead.raw.rec) || null;
  const settings = await db.getSettings();
  const raw = await aiService.safeComplete(
    {
      system:
        'You write a cold email for a solo founder at AlphoTech, a small backend and automation studio (APIs, integrations, Python/Node, DevOps). ' +
        `Tone: ${tone}. Market: ${market} (US = ROI-driven, UK = credibility-driven, EU = process/compliance-driven). ` +
        'Reply in EXACTLY this format:\nSUBJECT: <under 8 words, specific, no clickbait>\nBODY: <70-110 words, plain text, no signature>\n' +
        'Rules: reference one specific detail about them; one clear, low-pressure call to action; never invent experience, clients, results, numbers or credentials; ' +
        'no flattery, no hype, no emojis, no placeholders like [name].' +
        (settings.brand_voice ? ` Voice: ${settings.brand_voice}` : ''),
      prompt: JSON.stringify({
        name: lead.name, company: lead.company, role: lead.role, signal: lead.intent_signal,
        about_the_post: rec ? rec.why : undefined, their_post: rec ? String(lead.intent_signal || '').slice(0, 600) : undefined,
      }),
      maxTokens: 1500,
    },
    null
  );
  const parsed = raw && parseEmailDraft(raw);
  if (parsed) return { ...parsed, ai: true };
  const fb = splitSubject(renderTemplate(FALLBACK_BODY, lead));
  return { subject: `Quick question, ${lead.company || firstName(lead)}`, body: fb.body, ai: false };
}

const FOLLOWUP_FALLBACK = [
  'Hi {{first_name}},\n\nJust floating this back up in case it got buried. If a short plan and fixed quote would help, I can have one to you within a day. If now is not the time, no problem.',
  'Hi {{first_name}},\n\nLast note from me: if backend or automation work comes up at {{company}}, I am happy to help. Otherwise I will leave you be.',
];

async function draftFollowup({ lead, previous, step }) {
  const raw = await aiService.safeComplete(
    {
      system:
        'You write a short follow-up email for a solo founder at AlphoTech (backend and automation studio). It is follow-up number ' + step + '. ' +
        'Reply in EXACTLY this format:\nBODY: <40-70 words, plain text>\n' +
        'Rules: add ONE new useful thing (a specific idea, question or offer), not "just checking in"; keep it kind and low-pressure; ' +
        'step 2 should make it easy to say no; never invent experience or results; no emojis, no placeholders.',
      prompt: JSON.stringify({ name: lead.name, company: lead.company, first_email: String(previous.body || '').slice(0, 900) }),
      maxTokens: 1200,
    },
    null
  );
  const m = raw && /(?:^|\n)\s*BODY:\s*([\s\S]*)$/i.exec(raw);
  if (m && m[1].trim().length > 30) return { body: m[1].trim(), ai: true };
  return { body: renderTemplate(FOLLOWUP_FALLBACK[Math.min(step - 1, FOLLOWUP_FALLBACK.length - 1)], lead), ai: false };
}

async function summarizeReply(lead, text) {
  const raw = await aiService.safeComplete(
    {
      system:
        'You read a reply to a cold email sent by a backend-engineering founder. Reply in EXACTLY this format:\n' +
        'INTENT: <interested | question | not_now | no | other>\nNEXT: <one sentence: the best next step for the founder>',
      prompt: JSON.stringify({ company: lead && lead.company, reply: String(text).slice(0, 1500) }),
      maxTokens: 800,
    },
    null
  );
  return raw ? parseReplyInsight(raw) : null;
}

// ---- persistence ------------------------------------------------------------------

function explainDbError(e) {
  if (/meta/i.test(e.message || '') && /column|schema/i.test(e.message || '')) {
    return Object.assign(new Error('The database needs one small update for outreach. Run the "outreach" SQL at the bottom of supabase_schema.sql in the Supabase SQL editor, then try again.'), { status: 503 });
  }
  return e;
}

async function getSuppressed() {
  const s = await db.getSettings();
  return Array.isArray(s.outreach_suppressed) ? s.outreach_suppressed : [];
}

async function suppress(email, reason) {
  const e = norm(email);
  if (!e) return;
  const list = await getSuppressed();
  if (list.includes(e)) return;
  await db.updateSettings({ outreach_suppressed: [...list, e].slice(-5000) });
  logger.info(`outreach: suppressed ${e} (${reason})`);
}

async function unsuppress(email) {
  const e = norm(email);
  await db.updateSettings({ outreach_suppressed: (await getSuppressed()).filter((x) => x !== e) });
}

async function createDraft({ leadId, channel = 'apollo_email', tone, market, templateId, subject, body, to }) {
  const lead = leadId ? await db.get('leads', leadId) : null;
  if (leadId && !lead) throw Object.assign(new Error('Lead not found'), { status: 404 });
  let draft = { subject, body, ai: false };
  if (!body) {
    const template = templateId ? (await db.list('templates')).find((t) => t.id === templateId) : null;
    draft = await draftEmail({ lead: lead || {}, tone, market, template });
    if (subject) draft.subject = subject;
  }
  try {
    return await db.insert('messages', {
      lead_id: leadId || null, channel, direction: 'outbound', tone: tone || null, market: market || null,
      subject: draft.subject || null, body: draft.body, ai_generated: !!draft.ai, status: 'draft',
      meta: { to: to || (lead && lead.email) || null },
    });
  } catch (e) {
    throw explainDbError(e);
  }
}

// The one place email leaves the app.
async function sendMessage(id, { force = false, now = Date.now() } = {}) {
  const msg = await db.get('messages', id);
  if (!msg) throw Object.assign(new Error('Message not found'), { status: 404 });
  if (msg.direction !== 'outbound') throw Object.assign(new Error('Only outbound messages can be sent'), { status: 400 });
  if (!['draft', 'failed'].includes(msg.status)) throw Object.assign(new Error(`This message is already ${msg.status}`), { status: 409 });
  if (!EMAIL_CHANNELS.has(msg.channel)) throw Object.assign(new Error('This channel cannot be sent from CLA. Copy the text, send it there, then use "I sent it".'), { status: 400 });
  if (!String(msg.subject || '').trim()) throw Object.assign(new Error('Add a subject before sending'), { status: 400 });
  if (!String(msg.body || '').trim()) throw Object.assign(new Error('The message is empty'), { status: 400 });

  const lead = msg.lead_id ? await db.get('leads', msg.lead_id) : null;
  const m = meta(msg);
  const to = m.to || (lead && lead.email);
  const settings = await getSettings();
  const isFollowup = !!m.followupOf;
  const check = sendCheck({ lead, to, settings, suppressed: await getSuppressed(), messages: await db.list('messages'), isFollowup, force, now });
  if (!check.ok) throw Object.assign(new Error(check.blockers[0]), { status: 422, blockers: check.blockers });

  // Claim first so a double click (or the follow-up cron racing a click) cannot send twice.
  const claimed = await db.claim('messages', id, { where: { status: msg.status }, patch: { status: 'sending' } });
  if (!claimed) throw Object.assign(new Error('This message is already being sent'), { status: 409 });

  try {
    const result = await mailService.send({
      to, subject: msg.subject, text: composeEmailText(msg.body, settings),
      inReplyTo: m.inReplyTo, references: m.references,
    });
    const sentAt = new Date(now).toISOString();
    const step = m.followupStep || 0;
    const updated = await db.update('messages', id, {
      status: 'sent', sent_at: sentAt,
      meta: { ...m, to, messageId: result.messageId, threadId: m.threadId || id, followupStep: step, nextFollowupAt: nextFollowupAt(sentAt, step, settings), lastError: null },
    });
    if (lead && lead.status === 'new') await db.update('leads', lead.id, { status: 'contacted' });
    return { message: updated, warnings: check.warnings };
  } catch (e) {
    await db.update('messages', id, { status: 'failed', meta: { ...m, to, lastError: e.message } }).catch(() => {});
    throw e;
  }
}

// For channels CLA cannot send on (LinkedIn, Twitter DM, Reddit, contact forms): the founder
// sends it there, then records it here so follow-ups and stats still work.
async function markSent(id, { now = Date.now() } = {}) {
  const msg = await db.get('messages', id);
  if (!msg) throw Object.assign(new Error('Message not found'), { status: 404 });
  if (!['draft', 'failed'].includes(msg.status)) throw Object.assign(new Error(`This message is already ${msg.status}`), { status: 409 });
  const settings = await getSettings();
  const m = meta(msg);
  const sentAt = new Date(now).toISOString();
  const updated = await db.update('messages', id, {
    status: 'sent', sent_at: sentAt,
    meta: { ...m, manual: true, threadId: m.threadId || id, followupStep: m.followupStep || 0, nextFollowupAt: nextFollowupAt(sentAt, m.followupStep || 0, settings) },
  });
  if (msg.lead_id) {
    const lead = await db.get('leads', msg.lead_id);
    if (lead && lead.status === 'new') await db.update('leads', lead.id, { status: 'contacted' });
  }
  return updated;
}

async function cancelThreadFollowups(threadId, exceptId) {
  const all = await db.list('messages');
  for (const m of all) {
    if (m.id !== exceptId && meta(m).threadId === threadId && meta(m).nextFollowupAt) {
      await db.update('messages', m.id, { meta: { ...meta(m), nextFollowupAt: null } });
    }
    if (meta(m).threadId === threadId && m.status === 'draft' && meta(m).followupOf) await db.remove('messages', m.id);
  }
}

// A reply that arrived somewhere CLA cannot see (LinkedIn, phone, another inbox).
async function recordReply(id, { text } = {}) {
  const msg = await db.get('messages', id);
  if (!msg) throw Object.assign(new Error('Message not found'), { status: 404 });
  const m = meta(msg);
  const threadId = m.threadId || id;
  await db.update('messages', id, { status: 'replied', meta: { ...m, repliedAt: new Date().toISOString(), nextFollowupAt: null } });
  await cancelThreadFollowups(threadId, id);
  if (text && text.trim()) {
    await db.insert('messages', { lead_id: msg.lead_id, channel: msg.channel, direction: 'inbound', subject: msg.subject, body: text.trim(), status: 'received', meta: { kind: 'reply', threadId, manual: true } });
  }
  if (msg.lead_id) {
    const lead = await db.get('leads', msg.lead_id);
    if (lead && ['new', 'contacted'].includes(lead.status)) await db.update('leads', lead.id, { status: 'replied' });
  }
  return db.get('messages', id);
}

// ---- scheduled work ---------------------------------------------------------------

// Hourly: turn "no reply after N days" into a follow-up draft, and send it if the founder turned
// auto-send on (business hours only).
async function runFollowups({ now = Date.now() } = {}) {
  const settings = await getSettings();
  const messages = await db.list('messages');
  const leads = new Map((await db.list('leads')).map((l) => [l.id, l]));
  const suppressed = (await getSuppressed()).map(norm);
  const due = messages.filter((m) => m.direction === 'outbound' && m.status === 'sent' && meta(m).nextFollowupAt && new Date(meta(m).nextFollowupAt).getTime() <= now);

  let drafted = 0;
  let sent = 0;
  for (const m of due) {
    const lead = leads.get(m.lead_id);
    const mm = meta(m);
    const stop = !lead || ['replied', 'call_booked', 'proposal_sent', 'closed_won', 'closed_lost'].includes(lead.status) || suppressed.includes(norm(mm.to));
    if (stop) {
      await db.update('messages', m.id, { meta: { ...mm, nextFollowupAt: null } });
      continue;
    }
    const step = (mm.followupStep || 0) + 1;
    const body = await draftFollowup({ lead, previous: m, step });
    const isEmail = EMAIL_CHANNELS.has(m.channel);
    const draft = await db.insert('messages', {
      lead_id: m.lead_id, channel: m.channel, direction: 'outbound', tone: m.tone || null, market: m.market || null,
      subject: isEmail ? `Re: ${String(m.subject || '').replace(/^re:\s*/i, '')}` : null, body: body.body, ai_generated: body.ai, status: 'draft',
      meta: { to: mm.to || null, threadId: mm.threadId || m.id, followupOf: m.id, followupStep: step, inReplyTo: mm.messageId || null, references: mm.messageId ? [...(mm.references || []), mm.messageId] : [] },
    });
    await db.update('messages', m.id, { meta: { ...mm, nextFollowupAt: null } });
    drafted += 1;
    if (isEmail && settings.autoSendFollowups && mailService.canSend() && inSendWindow(now)) {
      try {
        await sendMessage(draft.id, { now });
        sent += 1;
      } catch (e) {
        logger.warn('outreach: auto follow-up not sent', { id: draft.id, error: e.message });
      }
    }
  }
  if (drafted - sent > 0) {
    notificationService
      .sendPush({ title: `${drafted - sent} follow-up${drafted - sent === 1 ? '' : 's'} ready`, body: 'Review and send them in Outreach.', data: { type: 'followups' } })
      .catch(() => {});
  }
  return { due: due.length, drafted, sent };
}

let syncing = false;

// Every few minutes: read the mailbox, attach replies to the right conversation, stop follow-ups
// for people who answered, honour unsubscribes, and record bounces.
async function syncReplies({ now = Date.now(), fetcher = mailService.fetchInbound } = {}) {
  if (!mailService.imapConfigured()) return { skipped: 'Reading replies is not set up (needs the mailbox login).' };
  if (syncing) return { skipped: 'A sync is already running.' };
  syncing = true;
  try {
    const settings = await db.getSettings();
    const last = settings.outreach_last_sync ? new Date(settings.outreach_last_sync).getTime() : now - 3 * DAY;
    const inbound = await fetcher({ since: new Date(last - DAY) });

    const all = await db.list('messages');
    const outbound = all.filter((m) => m.direction === 'outbound' && ['sent', 'replied'].includes(m.status) && meta(m).messageId);
    const seen = new Set(all.filter((m) => m.direction === 'inbound').map((m) => meta(m).messageId).filter(Boolean));
    const result = { checked: inbound.length, replies: 0, bounces: 0, unsubscribes: 0, ignored: 0 };
    let insights = 0;

    for (const mail of inbound.sort((a, b) => new Date(a.date) - new Date(b.date))) {
      if (!mail.messageId || seen.has(mail.messageId) || norm(mail.from) === norm(config.smtpUser)) continue;
      const match = matchInbound(mail, outbound);
      if (!match) {
        result.ignored += 1;
        continue;
      }
      seen.add(mail.messageId);
      const mm = meta(match);
      const threadId = mm.threadId || match.id;
      const lead = match.lead_id ? await db.get('leads', match.lead_id) : null;

      if (mail.kind === 'auto_reply') {
        result.ignored += 1;
        continue;
      }
      if (mail.kind === 'bounce') {
        await db.update('messages', match.id, { status: 'failed', meta: { ...mm, bounced: true, lastError: 'Bounced: the address does not accept mail', nextFollowupAt: null } });
        await suppress(mm.to, 'bounce');
        await cancelThreadFollowups(threadId, match.id);
        result.bounces += 1;
        continue;
      }

      const insight = mail.kind === 'reply' && insights < 5 ? await summarizeReply(lead, mail.text) : null;
      if (insight) insights += 1;
      await db.insert('messages', {
        lead_id: match.lead_id, channel: match.channel, direction: 'inbound', subject: mail.subject, body: mail.text || mail.rawText || '(empty reply)', status: 'received',
        meta: { messageId: mail.messageId, from: mail.from, kind: mail.kind, threadId, inReplyTo: mail.inReplyTo, receivedAt: mail.date, ...(insight || {}) },
      });
      await db.update('messages', match.id, { status: 'replied', meta: { ...mm, repliedAt: mail.date, nextFollowupAt: null } });
      await cancelThreadFollowups(threadId, match.id);

      if (mail.kind === 'unsubscribe') {
        await suppress(mm.to || mail.from, 'unsubscribe');
        if (lead && !['closed_won'].includes(lead.status)) await db.update('leads', lead.id, { status: 'closed_lost' });
        result.unsubscribes += 1;
      } else {
        if (lead && ['new', 'contacted'].includes(lead.status)) await db.update('leads', lead.id, { status: 'replied' });
        result.replies += 1;
        notificationService
          .sendPush({
            title: `${(lead && (lead.name || lead.company)) || mail.from} replied`,
            body: insight && insight.next ? insight.next : String(mail.text || '').slice(0, 120),
            data: { type: 'outreach_reply', leadId: match.lead_id || '' },
          })
          .catch(() => {});
      }
    }
    await db.updateSettings({ outreach_last_sync: new Date(now).toISOString() });
    return result;
  } finally {
    syncing = false;
  }
}

async function overview() {
  const [messages, leads, settings, suppressed] = await Promise.all([db.list('messages'), db.list('leads'), getSettings(), getSuppressed()]);
  const mail = mailService.status();
  const s = await db.getSettings();
  return { stats: stats(messages, settings), settings, mail, suppressedCount: suppressed.length, lastSync: s.outreach_last_sync || null, threads: buildThreads(messages, leads) };
}

module.exports = {
  DEFAULTS, getSettings, saveSettings, renderTemplate, splitSubject, composeEmailText, nextFollowupAt, sentInLast24h, sendCheck, inSendWindow,
  matchInbound, stats, buildThreads, parseReplyInsight, parseEmailDraft, draftEmail, draftFollowup, createDraft, sendMessage, markSent, recordReply,
  runFollowups, syncReplies, overview, getSuppressed, suppress, unsuppress, cancelThreadFollowups,
};
