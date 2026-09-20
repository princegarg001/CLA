const db = require('../db');
const config = require('../config');
const aiService = require('./aiService');
const leadSources = require('./leadSources');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');
const { clampScore } = require('../utils/helpers');

// The daily recommendation engine: pull fresh demand signals from every source,
// throw away what we've already seen or can't serve, score the rest on intent /
// fit / freshness / contactability, and hand the founder a short ranked list with
// the reason each one is there and a ready-to-send opening message.
//
// Everything that scores is pure and deterministic (so it is testable and cheap);
// AI is used only to *write* — the "why" line and the first message — and the
// engine degrades to templates when AI is unavailable.

const DEFAULT_ICP = {
  // What AlphoTech sells. A post mentioning these is a fit.
  keywords: [
    'backend', 'back-end', 'api', 'python', 'node', 'django', 'fastapi', 'flask', 'microservice', 'devops',
    'automation', 'integration', 'stripe', 'saas', 'mvp', 'postgres', 'aws', 'kubernetes', 'docker',
    'scraping', 'web app', 'typescript', 'ci/cd', 'data pipeline', 'ai', 'llm',
  ],
  // Hard no's — each one is a heavy penalty.
  exclude: ['unpaid', 'equity only', 'equity-only', 'internship', 'intern', 'volunteer', 'no agencies', 'no recruiters', 'recruiter', 'wordpress only', 'on-site only', 'onsite only'],
  minScore: 40, // out of 100
  count: 10, // per batch
};

// Contract intent is only trusted in the title / opening lines: "contract" deep in a
// full-time listing is usually benefits boilerplate ("W2 or contract", "contract to hire").
const CONTRACT_RE = /\b(contractor|contract basis|contract role|contract position|freelanc\w*|consultant|consulting|project[- ]based|short[- ]term|fixed[- ]price|one[- ]off|1099)\b|\bcontract\b(?! to hire)/i;
const URGENT_RE = /\b(urgent\w*|asap|immediately|right away|this week|as soon as possible|start (?:now|today|immediately))\b/i;
const BUDGET_RE = /(?:\$|usd\s?|€|£)\s?\d[\d,.]*\s?k?(?:\s?(?:\/|per)\s?(?:hr|hour|h|day|month|mo))?/i;
const ONSITE_RE = /\b(on-?site|in[- ]office)\b/i;
const REMOTE_RE = /\bremote\b/i;

// Roles that are not what AlphoTech sells, whatever else the post says.
const WRONG_ROLE_RE = /\b(trainer|evaluator|annotator|labeler|data entry|customer (support|success)|sales|marketing|designer|recruiter|shopify|wordpress|content writer|copywriter|virtual assistant)\b/i;

// Adjustable so tests do not wait on the AI retry delay.
const tuning = { retryMs: 6000, maxRunMs: 70000 };

const WEAK_KEYWORDS = new Set(['ai', 'llm', 'saas', 'mvp', 'integration', 'automation', 'web app']);

const KIND_BASE = { seeking: 40, hiring_contract: 30, hiring_fte: 12 };
const MAX_AGE_DAYS = 30;

// Whole-word match ("ai" must not hit "email"); tolerates plurals and ".js".
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordRe = (kw) => new RegExp(`(?:^|[^a-z0-9])${escapeRe(kw)}(?:s|\\.js)?(?![a-z0-9])`, 'i');
const has = (text, kw) => wordRe(kw).test(text);

function hoursOld(postedAt, now) {
  const t = new Date(postedAt).getTime();
  return Number.isFinite(t) ? Math.max(0, (now - t) / 3600000) : 999;
}

function recencyPoints(h) {
  if (h <= 24) return 10;
  if (h <= 72) return 6;
  if (h <= 168) return 2;
  if (h <= 336) return 0;
  return -15;
}

function agoLabel(h) {
  if (h < 1) return 'under an hour ago';
  if (h < 24) return `${Math.round(h)}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

// Score one candidate against the ICP. Returns null when it should never be shown.
function scoreCandidate(c, { icp = DEFAULT_ICP, now = Date.now(), sourceWeight = 1 } = {}) {
  const text = `${c.title || ''}\n${c.text || ''}`.toLowerCase();
  const title = (c.title || '').toLowerCase();
  const reasons = [];
  const h = hoursOld(c.postedAt, now);
  if (h > MAX_AGE_DAYS * 24) return null;

  // Someone advertising their own services is a competitor, not a lead.
  if (/^\s*seeking\s+work/i.test(c.text || '')) return null;

  if (c.kind !== 'seeking' && WRONG_ROLE_RE.test(c.title || '')) return null;

  let kind = c.kind;
  const head = `${c.title || ''}\n${(c.text || '').slice(0, 400)}`;
  const contract = c.kind !== 'seeking' && (CONTRACT_RE.test(head) || c.jobType === 'contract' || c.jobType === 'freelance');
  if (kind === 'hiring_fte' && contract) kind = 'hiring_contract';

  let score = KIND_BASE[kind] ?? 12;
  if (kind === 'seeking') reasons.push('Directly asking for a freelancer');
  else if (kind === 'hiring_contract') reasons.push('Contract / freelance work mentioned up front');

  // Fit: keywords in the title count triple.
  const inTitle = icp.keywords.filter((k) => has(title, k));
  const inBody = icp.keywords.filter((k) => !inTitle.includes(k) && has(text, k));
  const fit = Math.min(18, inTitle.length * 6) + Math.min(12, inBody.length * 2);
  // "ai", "saas", "integration" etc. appear in almost everything, so a post needs at least one
  // concrete skill of ours (or several mentions) — a lone buzzword is not a fit.
  const coreTitle = inTitle.filter((k) => !WEAK_KEYWORDS.has(k));
  const coreBody = inBody.filter((k) => !WEAK_KEYWORDS.has(k));
  if (kind === 'seeking' ? coreTitle.length + coreBody.length === 0 : coreTitle.length === 0 && coreBody.length < 2) return null;
  score += fit;
  const matched = [...inTitle, ...inBody].slice(0, 5);
  if (matched.length) reasons.push(`Matches your services: ${matched.join(', ')}`);

  if (URGENT_RE.test(text)) {
    score += 6;
    reasons.push('Sounds urgent');
  }
  const budget = kind === 'hiring_fte' ? null : c.salary || (text.match(BUDGET_RE) || [])[0];
  if (budget) {
    score += 5;
    reasons.push(`Budget mentioned: ${String(budget).trim()}`);
  }
  if (c.email) {
    score += 8;
    reasons.push('Contact email in the post');
  } else if (c.twitter) {
    score += 2;
  }

  const rec = recencyPoints(h);
  score += rec;
  if (rec >= 6) reasons.push(`Posted ${agoLabel(h)}`);

  // Penalties.
  const hitExclude = icp.exclude.filter((x) => has(text, x.trim()));
  if (hitExclude.length) {
    score -= 40;
    reasons.push(`Red flag: "${hitExclude[0].trim()}"`);
  }
  if (ONSITE_RE.test(text) && !REMOTE_RE.test(text)) {
    score -= 15;
    reasons.push('On-site only');
  }
  if (kind === 'hiring_fte') reasons.push('Full-time role: pitch contract help instead of applying');

  score = Math.round(Math.max(0, Math.min(100, score * sourceWeight)));
  return { score, kind, reasons, hoursOld: h, budget: budget ? String(budget).trim() : null };
}

// What to do next, given what we know about how to reach them.
function recommendAction(c, kind) {
  const linkedinSearchUrl = c.company
    ? `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${c.company} founder OR CTO`)}`
    : null;
  if (c.email) return { channel: 'email', action: `Email ${c.company || 'them'} now: replies drop fast after the first day.`, linkedinSearchUrl };
  if (c.source === 'hn_freelancer') return { channel: 'hn_reply', action: `Reply on the HN thread and check @${c.name || 'the poster'}'s profile for contact details.`, linkedinSearchUrl };
  if (kind === 'hiring_fte') return { channel: 'linkedin', action: `Find the founder/CTO of ${c.company || 'this company'} on LinkedIn and pitch project-based help.`, linkedinSearchUrl };
  return { channel: 'apply', action: `Apply on the listing, then message the hiring manager on LinkedIn.`, linkedinSearchUrl };
}

function templateMessage(c, kind) {
  const ask = kind === 'seeking' ? 'saw your post looking for help' : `saw ${c.company ? `${c.company}'s` : 'your'} listing for backend help`;
  return (
    `Hi, ${ask}. I run AlphoTech, a small backend and automation studio (Python/Node, APIs, integrations, DevOps). ` +
    `Happy to take this on as a fixed-scope project or short contract. If it helps, I can send a quick plan and a fixed quote by tomorrow. ` +
    `Is this still open?`
  );
}

async function writeCopy(c, scored, brandVoice) {
  const fallback = { why: scored.reasons.slice(0, 3).join(' · '), message: templateMessage(c, scored.kind) };
  const ask = () => aiService.safeComplete(
    {
      system:
        'You help a solo backend-engineering founder win clients for AlphoTech, a small backend and automation studio ' +
        '(APIs, integrations, Python/Node, DevOps). You are given a public post or job listing. Reply in EXACTLY this format:\n' +
        'FIT: <strong | maybe | no. strong = they want outside help with backend/automation work. maybe = a company hiring engineers, where a studio could pitch project or contract help. no = the author is a job seeker or a freelancer offering services, or the work is not backend/automation at all>\n' +
        'WHY: <one sentence: what this person actually needs, and whether a backend/automation studio can do it>\n' +
        'MESSAGE: <a 50-80 word first message to them: mention one specific detail from their post, offer one concrete next step>\n' +
        'Rules for MESSAGE: never invent experience, past clients, results, numbers or credentials; describe AlphoTech only in general terms. ' +
        'Write from the founder ("I"), no hype, no emojis, no placeholders like [name]. ' +
        'If the post is clearly not backend/automation work, still write a short neutral message and say so in WHY.' +
        (brandVoice ? ` Voice: ${brandVoice}` : ''),
      prompt: JSON.stringify({ company: c.company, title: c.title, kind: scored.kind, text: (c.text || '').slice(0, 1500) }),
      maxTokens: 1500, // gpt-oss is a reasoning model: hidden reasoning counts against this, and a low cap returns an empty answer
    },
    null
  );
  let text = await ask();
  if (!text) {
    // Usually a rate limit (429): wait a few seconds and try once more before falling back to the template.
    await new Promise((r) => setTimeout(r, tuning.retryMs));
    text = await ask();
  }
  const parsed = text && parseCopy(text);
  return parsed ? { ...parsed, ai: true } : { ...fallback, ai: false };
}

// Plain "WHY:/MESSAGE:" text instead of JSON mode: long free-text answers with quotes and
// line breaks make some providers' JSON validators reject the whole completion.
function parseCopy(text) {
  const fit = /(?:^|\n)\s*FIT:\s*(strong|maybe|no)\b/i.exec(text);
  const why = /(?:^|\n)\s*WHY:\s*([\s\S]*?)(?=\n\s*MESSAGE:|$)/i.exec(text);
  const msg = /(?:^|\n)\s*MESSAGE:\s*([\s\S]*)$/i.exec(text);
  if (!why || !msg) return null;
  const clean = (v) => v.trim().replace(/^["']|["']$/g, '').trim();
  const out = { why: clean(why[1]), message: clean(msg[1]), fit: fit ? fit[1].toLowerCase() : null };
  return out.why.length > 10 && out.message.length > 40 ? out : null;
}

// Learned from outcomes: sources whose leads actually reply / convert get a small
// boost, sources that only get dismissed get a small cut. Needs enough history to
// mean anything, otherwise every source is neutral.
const POSITIVE = new Set(['replied', 'call_booked', 'proposal_sent', 'closed_won']);

function sourceStats(leads) {
  const stats = {};
  for (const l of leads) {
    if (!l.raw?.rec) continue;
    const s = (stats[l.source] ||= { total: 0, acted: 0, positive: 0, dismissed: 0 });
    s.total += 1;
    if (l.raw.rec.dismissed) s.dismissed += 1;
    if (l.status !== 'new' || l.raw.rec.dismissed) s.acted += 1;
    if (POSITIVE.has(l.status)) s.positive += 1;
  }
  for (const s of Object.values(stats)) {
    const enough = s.acted >= 8;
    const rate = enough ? s.positive / s.acted : null;
    s.positiveRate = rate;
    s.weight = enough ? Math.round(Math.max(0.85, Math.min(1.25, 1 + (rate - 0.15) * 1.5)) * 100) / 100 : 1;
  }
  return stats;
}

const norm = (s) => String(s || '').trim().toLowerCase();

async function getIcp() {
  const settings = await db.getSettings();
  return { ...DEFAULT_ICP, ...(settings.icp || {}) };
}

let running = false;

// One batch: fetch → filter → score → pick → write copy → save as leads.
async function generateBatch({ now = Date.now(), fetcher = leadSources.fetchAll, notify = true } = {}) {
  if (running) throw Object.assign(new Error('A recommendation run is already in progress'), { status: 409 });
  running = true;
  const startedAt = Date.now();
  try {
    const settings = await db.getSettings();
    const icp = { ...DEFAULT_ICP, ...(settings.icp || {}) };
    const today = new Date(now).toISOString().slice(0, 10);

    const { candidates, report } = await fetcher();
    const leads = await db.list('leads');
    const weights = sourceStats(leads);

    // Already-known: same source key, same URL, or a company we already have a lead for.
    const seen = settings.rec_seen || {};
    const knownUrls = new Set(leads.map((l) => l.raw?.rec?.url).filter(Boolean));
    const knownCompanies = new Set(leads.map((l) => norm(l.company)).filter(Boolean));

    const scored = [];
    let skippedKnown = 0;
    for (const c of candidates) {
      if (!c.url && !c.key) continue;
      if (seen[c.key] || knownUrls.has(c.url) || (c.company && knownCompanies.has(norm(c.company)))) {
        skippedKnown += 1;
        continue;
      }
      const s = scoreCandidate(c, { icp, now, sourceWeight: weights[`${c.source}`]?.weight ?? 1 });
      // Full-time listings are a weaker signal on their own, so their bar is 10 lower; they still rank below
      // direct requests and contract work because the score already reflects the kind.
      if (!s || s.score < (s.kind === 'hiring_fte' ? icp.minScore - 10 : icp.minScore)) continue;
      scored.push({ c, s });
    }
    scored.sort((a, b) => b.s.score - a.s.score);

    // Ranked queue, one per company. The batch is filled from the front of it: the AI can still
    // reject a candidate after reading the post, and a rejection must be replaced, not shrink the list.
    const perCompany = new Set();
    const queue = [];
    for (const item of scored) {
      const co = norm(item.c.company);
      if (co && perCompany.has(co)) continue;
      perCompany.add(co);
      queue.push(item);
    }

    const created = [];
    const brandVoice = settings.brand_voice || '';
    let rejectedByAi = 0;
    const rejected = [];
    // No single source may crowd out the rest.
    const cap = Math.max(3, Math.ceil(icp.count * 0.6));
    const perSource = {};
    const eligible = () => queue.filter((x) => !x.done && (perSource[x.c.source] || 0) < cap);
    // Two at a time: the free Groq tier allows ~8k tokens/minute and this model reasons before it answers.
    // The attempt limit bounds AI cost and run time when most of the queue is being rejected.
    let attempts = 0;
    // Hosts cut HTTP requests off around 100s, so a manual run stops drafting after ~70s and returns what it has.
    while (created.length < icp.count && attempts < icp.count * 2 && Date.now() - startedAt < tuning.maxRunMs) {
      const tentative = { ...perSource };
      const chunk = [];
      for (const x of eligible()) {
        if (chunk.length >= Math.min(2, icp.count - created.length)) break;
        if ((tentative[x.c.source] || 0) >= cap) continue;
        tentative[x.c.source] = (tentative[x.c.source] || 0) + 1;
        chunk.push(x);
      }
      if (!chunk.length) break;
      chunk.forEach((x) => { x.done = true; });
      attempts += chunk.length;
      const copies = await Promise.all(chunk.map(({ c, s }) => writeCopy(c, s, brandVoice)));
      for (let j = 0; j < chunk.length; j += 1) {
        const { c, s } = chunk[j];
        const copy = copies[j];
        if (copy.fit === 'no') {
          // The AI read the post and says it is not a buyer (a job seeker, an employee-only role, off-topic).
          seen[c.key] = today;
          rejectedByAi += 1;
          if (rejected.length < 15) rejected.push({ company: c.company, title: (c.title || '').slice(0, 80), why: copy.why, url: c.url });
          continue;
        }
        const action = recommendAction(c, s.kind);
        const lead = await db.insert('leads', {
          source: c.source,
          status: 'new',
          name: c.name || null,
          email: c.email || null,
          company: c.company || null,
          role: c.title ? String(c.title).slice(0, 160) : null,
          region: null,
          intent_signal: (c.text || '').replace(/\s+/g, ' ').slice(0, 300),
          urgency: URGENT_RE.test(c.text || '') ? 'high' : 'medium',
          score: clampScore(s.score / 10),
          ai_brief: copy.why,
          raw: {
            rec: {
              key: c.key,
              date: today,
              score100: s.score,
              kind: s.kind,
              reasons: s.reasons,
              why: copy.why,
              draft: copy.message,
              draftByAi: copy.ai,
              fit: copy.fit || null,
              url: c.url,
              postedAt: c.postedAt,
              twitter: c.twitter || null,
              budget: s.budget,
              location: c.location || null,
              ...action,
            },
          },
        });
        created.push(lead);
        perSource[c.source] = (perSource[c.source] || 0) + 1;
        seen[c.key] = today;
      }
    }

    // Keep the "seen" ledger bounded (90 days).
    const cutoff = new Date(now - 90 * 86400000).toISOString().slice(0, 10);
    for (const k of Object.keys(seen)) if (seen[k] < cutoff) delete seen[k];

    const followups = await findFollowups(leads, now);

    const prev = settings[`recs_${today}`] || { date: today, items: [], batches: 0 };
    const items = [
      ...prev.items,
      ...created.map((l, idx) => ({ leadId: l.id, kind: 'new', rank: prev.items.length + idx + 1 })),
    ];
    const plan = {
      date: today,
      generatedAt: new Date(now).toISOString(),
      batches: (prev.batches || 0) + 1,
      items,
      followups: prev.followups?.length ? prev.followups : followups,
      stats: {
        fetched: candidates.length,
        skippedKnown,
        qualified: scored.length,
        picked: created.length,
        sources: report,
        aiWritten: created.filter((l) => l.raw.rec.draftByAi).length,
        rejectedByAi,
        rejected,
        tookMs: Date.now() - startedAt,
      },
    };
    await db.updateSettings({ [`recs_${today}`]: plan, rec_seen: seen });

    if (notify && created.length) {
      notificationService
        .sendPush({
          title: `${created.length} new leads for today`,
          body: `Top: ${created[0].company || created[0].role} (${created[0].raw.rec.reasons[0] || 'good fit'})`,
          data: { type: 'daily_recs' },
        })
        .catch((e) => logger.warn('recommendations: push failed', { error: e.message }));
    }

    logger.info(`recommendations: ${created.length} new (${candidates.length} fetched, ${skippedKnown} already known, ${scored.length} qualified)`);
    return plan;
  } finally {
    running = false;
  }
}

// Leads we already contacted that have gone quiet: the follow-up is usually where the money is.
async function findFollowups(leads, now = Date.now()) {
  const day = 86400000;
  const out = [];
  for (const l of leads) {
    if (l.locked && l.status === 'new') continue;
    const idle = (now - new Date(l.updated_at || l.created_at).getTime()) / day;
    if (l.status === 'contacted' && idle >= 3 && idle <= 21) out.push({ leadId: l.id, kind: 'followup', reason: `Contacted ${Math.round(idle)} days ago, no reply`, score: l.score || 0 });
    else if ((l.status === 'replied' || l.status === 'call_booked') && idle >= 2 && idle <= 14) out.push({ leadId: l.id, kind: 'followup', reason: `${l.status === 'replied' ? 'They replied' : 'Call booked'} ${Math.round(idle)} days ago, nothing since`, score: (l.score || 0) + 2 });
    else if (l.status === 'proposal_sent' && idle >= 3 && idle <= 21) out.push({ leadId: l.id, kind: 'followup', reason: `Proposal sent ${Math.round(idle)} days ago, no decision`, score: (l.score || 0) + 3 });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 5);
}

// Today's plan with each lead joined in, so status changes made anywhere show up here.
async function getToday(now = Date.now()) {
  const today = new Date(now).toISOString().slice(0, 10);
  const settings = await db.getSettings();
  const plan = settings[`recs_${today}`];
  if (!plan) return { date: today, generated: false, items: [], followups: [], stats: null };
  const leads = await db.list('leads');
  const byId = new Map(leads.map((l) => [l.id, l]));
  const join = (it) => ({ ...it, lead: byId.get(it.leadId) || null });
  return {
    ...plan,
    generated: true,
    items: plan.items.map(join).filter((i) => i.lead),
    followups: (plan.followups || []).map(join).filter((i) => i.lead && ['contacted', 'replied', 'call_booked', 'proposal_sent'].includes(i.lead.status)),
  };
}

async function dismiss(leadId, reason = 'not a fit') {
  const lead = await db.get('leads', leadId);
  if (!lead) return null;
  return db.update('leads', leadId, {
    status: 'closed_lost',
    raw: { ...(lead.raw || {}), rec: { ...(lead.raw?.rec || {}), dismissed: true, dismissReason: reason, dismissedAt: new Date().toISOString() } },
  });
}

module.exports = { DEFAULT_ICP, tuning, parseCopy, scoreCandidate, recommendAction, templateMessage, sourceStats, findFollowups, generateBatch, getToday, getIcp, dismiss };
