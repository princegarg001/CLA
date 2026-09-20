const Parser = require('rss-parser');
const redditService = require('./redditService');
const logger = require('../utils/logger');

// Free, keyless lead sources. Each fetcher returns candidates in ONE shape so the
// recommendation engine never cares where something came from:
//
//   { key, source, kind, company, name, title, text, url, postedAt, email, twitter,
//     location, jobType, salary }
//
// kind: 'seeking'         — someone is directly asking for a freelancer/developer (strongest)
//       'hiring_contract' — a company hiring on a contract/freelance basis
//       'hiring_fte'      — a full-time role (weak signal on its own; the engine can upgrade it)
//
// A source that is down or changes format must never break the daily run, so every
// fetcher is isolated by fetchAll() and reports its own error.

const UA = 'AlphoTech-CLA/1.0 (lead research; contact via alphotech)';
const TIMEOUT_MS = 20000;

async function getJson(url, headers = {}) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json', ...headers }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${new URL(url).hostname} responded ${res.status}`);
  return res.json();
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function htmlToText(html = '') {
  return String(html)
    .replace(/<\s*(br|\/p|\/li|\/div)\s*\/?>/gi, '\n')
    .replace(/<\s*p\s*>/gi, '\n')
    .replace(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, (_, href, label) => (label.includes(href.slice(0, 20)) ? label : `${label} (${href})`))
    .replace(/<[^>]+>/g, '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

function findEmail(text) {
  const direct = text.match(EMAIL_RE);
  if (direct) return direct[0].toLowerCase();
  // People obfuscate on HN: "name at company dot com".
  const obf = text.match(/([A-Za-z0-9._-]+)\s*(?:\[at\]|\(at\)|\sat\s)\s*([A-Za-z0-9-]+)\s*(?:\[dot\]|\(dot\)|\sdot\s)\s*([A-Za-z]{2,})/i);
  return obf ? `${obf[1]}@${obf[2]}.${obf[3]}`.toLowerCase() : null;
}

function findTwitter(text) {
  const m = text.match(/(?:twitter\.com|x\.com)\/([A-Za-z0-9_]{2,15})\b/i);
  return m ? m[1] : null;
}

// ---- Hacker News (Algolia) ----------------------------------------------------

const HN = 'https://hn.algolia.com/api/v1';

// The monthly threads come from different accounts (whoishiring posts "Who is hiring",
// individual users post "Freelancer? Seeking freelancer?"), so the author tag is optional.
// Only threads from the last 45 days count: a stale thread's leads are long gone.
async function latestThreadIds(titleQuery, count = 1, { author } = {}) {
  const tags = author ? `story,author_${author}` : 'story';
  const data = await getJson(`${HN}/search_by_date?query=${encodeURIComponent(titleQuery)}&tags=${tags}&hitsPerPage=10`);
  const needle = titleQuery.toLowerCase().split('?')[0];
  const cutoff = Date.now() - 45 * 86400000;
  return (data.hits || []).filter((h) => (h.title || '').toLowerCase().includes(needle) && new Date(h.created_at).getTime() >= cutoff).slice(0, count);
}

async function threadComments(storyId) {
  const data = await getJson(`${HN}/search_by_date?tags=comment,story_${storyId}&hitsPerPage=1000`);
  // Top-level comments only; replies are chatter.
  return (data.hits || []).filter((h) => String(h.parent_id) === String(storyId) && h.comment_text);
}

// "Ask HN: Freelancer? Seeking freelancer?" — comments start with SEEKING WORK (a
// competitor, skipped) or SEEKING FREELANCER (a buyer, exactly who we want).
async function hnSeekingFreelancer() {
  const threads = await latestThreadIds('Freelancer? Seeking freelancer?', 3);
  const out = [];
  for (const t of threads) {
    for (const c of await threadComments(t.objectID)) {
      const text = htmlToText(c.comment_text);
      const firstLine = text.split('\n')[0];
      if (!/^\s*seeking\s+freelancer/i.test(firstLine)) continue;
      const parts = firstLine.split('|').map((s) => s.trim()).filter(Boolean);
      out.push({
        key: `hn_freelancer:${c.objectID}`,
        source: 'hn_freelancer',
        kind: 'seeking',
        company: parts[1] || c.author,
        name: c.author,
        title: parts.slice(1).join(' | ') || 'Seeking freelancer',
        text,
        url: `https://news.ycombinator.com/item?id=${c.objectID}`,
        postedAt: c.created_at,
        email: findEmail(text),
        twitter: findTwitter(text),
        location: parts[2] || null,
      });
    }
  }
  return out;
}

// "Ask HN: Who is hiring?" — mostly full-time, but the engine upgrades posts that
// mention contract/freelance work and scores the rest low.
async function hnWhoIsHiring() {
  const [thread] = await latestThreadIds('Who is hiring?', 1, { author: 'whoishiring' });
  if (!thread) return [];
  return (await threadComments(thread.objectID)).map((c) => {
    const text = htmlToText(c.comment_text);
    const firstLine = text.split('\n')[0];
    const parts = firstLine.split('|').map((s) => s.trim()).filter(Boolean);
    // Formats vary: "Company | Role | Location", but some lead with "Location: X".
    const company = parts.find((p) => !/^(location|remote|onsite|hybrid|full[- ]?time|part[- ]?time|apply)/i.test(p)) || c.author;
    return {
      key: `hn_hiring:${c.objectID}`,
      source: 'hn_hiring',
      kind: 'hiring_fte',
      company,
      name: c.author,
      title:
        parts.filter((p) => p !== company && !/^(location|remote|onsite|hybrid)/i.test(p)).slice(0, 2).join(' | ') ||
        (text.split('\n').find((l, i) => i > 0 && l.trim().length > 15) || firstLine).slice(0, 120),
      text,
      url: `https://news.ycombinator.com/item?id=${c.objectID}`,
      postedAt: c.created_at,
      email: findEmail(text),
      twitter: findTwitter(text),
      location: parts.find((p) => /remote|onsite|hybrid/i.test(p)) || null,
    };
  });
}

// People asking for a developer in ordinary HN comments and Ask HN posts. Noisy by
// nature, so it only forwards posts that sound like a buyer and not a seller.
const HN_QUERIES = ['"looking for a freelance"', '"need a backend developer"', '"hire a freelance"', '"looking for a contractor"', '"need a developer"', '"looking for a developer"'];
const SELLER_RE = /\b(i am|i'm|we are|we're)\s+(a |an )?(freelance|available|independent|full[- ]?stack|senior)\b|\bavailable for (hire|work)\b|\bseeking work\b|\bfor hire\b/i;

// "looking for / need / hire" followed (within a few words) by a technical role. This is what
// separates "I need a backend developer" from "I'm looking for a contractor to pour concrete".
const BUYER_RE = new RegExp(
  String.raw`\b(looking for|need|needs|hiring|hire|seeking|want)\b.{0,40}\b(developer|engineer|programmer|freelancer|contractor|consultant|dev|agency|cto|devops|sre)\b`,
  'i'
);
const TECH_RE = /\b(software|backend|back-end|api|python|node|django|web|app|saas|devops|cloud|aws|automation|integration|scraper|scraping|mvp|startup|full[- ]?stack)\b/i;

async function hnPhraseSearch() {
  const since = Math.floor((Date.now() - 14 * 86400000) / 1000);
  const batches = await Promise.allSettled(
    HN_QUERIES.map((q) => getJson(`${HN}/search_by_date?query=${encodeURIComponent(q)}&tags=(story,comment)&numericFilters=created_at_i>${since}&hitsPerPage=30`))
  );
  const seen = new Set();
  const out = [];
  for (const b of batches) {
    if (b.status !== 'fulfilled') continue;
    for (const h of b.value.hits || []) {
      if (seen.has(h.objectID)) continue;
      seen.add(h.objectID);
      const text = htmlToText(h.comment_text || h.story_text || h.title || '');
      if (text.length < 40 || SELLER_RE.test(text) || !BUYER_RE.test(text) || !TECH_RE.test(text)) continue;
      out.push({
        key: `hn_search:${h.objectID}`,
        source: 'hn_search',
        kind: 'seeking',
        company: h.author,
        name: h.author,
        title: (h.title || text.split('\n')[0]).slice(0, 140),
        text,
        url: `https://news.ycombinator.com/item?id=${h.objectID}`,
        postedAt: h.created_at,
        email: findEmail(text),
        twitter: findTwitter(text),
        location: null,
      });
    }
  }
  return out;
}

// Reddit, through the official API (needs REDDIT_* keys; returns nothing without them).
// Subreddits are the ones in REDDIT_MONITORED_SUBS plus r/forhire, where "[HIRING]" posts are
// exactly what we want. Only posts that read like a buyer are forwarded.
async function reddit() {
  if (!redditService.isConfigured()) return [];
  const config = require('../config');
  const subs = [...new Set([...config.redditMonitoredSubs, 'forhire'])];
  const posts = await redditService.getNewPosts({ subreddits: subs, limit: 40 });
  const out = [];
  for (const p of posts) {
    const text = `${p.title}
${p.body || ''}`;
    const tagged = /^s*[?s*hirings*]?/i.test(p.title);
    const forHire = /[s*for hires*]/i.test(p.title);
    if (forHire || SELLER_RE.test(text)) continue;
    if (!(tagged || BUYER_RE.test(text)) || !TECH_RE.test(text)) continue;
    out.push({
      key: `reddit:${p.id}`,
      source: 'reddit',
      kind: 'seeking',
      company: p.author,
      name: p.author,
      title: p.title.slice(0, 140),
      text,
      url: p.url,
      postedAt: p.createdAt,
      email: findEmail(text),
      twitter: findTwitter(text),
      location: `r/${p.subreddit}`,
    });
  }
  return out;
}

// ---- Job boards -----------------------------------------------------------------

async function remoteok() {
  const rows = await getJson('https://remoteok.com/api');
  return rows
    .filter((r) => r && r.id && r.position)
    .map((r) => {
      const text = htmlToText(r.description || '');
      return {
        key: `remoteok:${r.id}`,
        source: 'remoteok',
        kind: 'hiring_fte',
        company: r.company,
        name: null,
        title: r.position,
        text: `${r.position}. ${(r.tags || []).join(', ')}. ${text}`,
        url: r.url || r.apply_url,
        postedAt: r.date,
        email: findEmail(text),
        twitter: null,
        location: r.location || 'Remote',
        salary: r.salary_min ? `$${r.salary_min}-${r.salary_max}` : null,
      };
    });
}

async function remotive() {
  const searches = ['backend', 'devops', 'python', 'node'];
  const batches = await Promise.allSettled(
    searches.map((s) => getJson(`https://remotive.com/api/remote-jobs?category=software-dev&search=${s}&limit=40`))
  );
  const seen = new Set();
  const out = [];
  for (const b of batches) {
    if (b.status !== 'fulfilled') continue;
    for (const j of b.value.jobs || []) {
      if (seen.has(j.id)) continue;
      seen.add(j.id);
      const text = htmlToText(j.description || '');
      out.push({
        key: `remotive:${j.id}`,
        source: 'remotive',
        kind: j.job_type === 'contract' || j.job_type === 'freelance' ? 'hiring_contract' : 'hiring_fte',
        company: j.company_name,
        name: null,
        title: j.title,
        text: `${j.title}. ${(j.tags || []).join(', ')}. ${text}`,
        url: j.url,
        postedAt: j.publication_date,
        email: findEmail(text),
        twitter: null,
        location: j.candidate_required_location || 'Remote',
        jobType: j.job_type,
        salary: j.salary || null,
      });
    }
  }
  return out;
}

const rss = new Parser({ timeout: TIMEOUT_MS, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AlphoTech-CLA/1.0)' } });

async function weWorkRemotely() {
  const feeds = ['remote-back-end-programming-jobs', 'remote-devops-sysadmin-jobs', 'remote-full-stack-programming-jobs'];
  const results = await Promise.allSettled(feeds.map((f) => rss.parseURL(`https://weworkremotely.com/categories/${f}.rss`)));
  const out = [];
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    for (const item of r.value.items || []) {
      const [company, ...rest] = String(item.title || '').split(':');
      const text = htmlToText(item.content || item['content:encoded'] || item.contentSnippet || '');
      out.push({
        key: `wwr:${item.guid || item.link}`,
        source: 'wwr',
        kind: 'hiring_fte',
        company: company.trim(),
        name: null,
        title: rest.join(':').trim() || item.title,
        text: `${item.title}. ${text}`,
        url: item.link,
        postedAt: item.isoDate || item.pubDate,
        email: findEmail(text),
        twitter: null,
        location: 'Remote',
      });
    }
  }
  return out;
}

const SOURCES = { hn_freelancer: hnSeekingFreelancer, hn_search: hnPhraseSearch, reddit, hn_hiring: hnWhoIsHiring, remoteok, remotive, wwr: weWorkRemotely };

// Runs every source in parallel; one failing never affects the rest.
async function fetchAll(only) {
  const names = Object.keys(SOURCES).filter((n) => !only || only.includes(n));
  const settled = await Promise.allSettled(names.map((n) => SOURCES[n]()));
  const candidates = [];
  const report = {};
  settled.forEach((r, i) => {
    const name = names[i];
    if (r.status === 'fulfilled') {
      candidates.push(...r.value);
      report[name] = { ok: true, fetched: r.value.length };
    } else {
      logger.warn(`leadSources: ${name} failed`, { error: r.reason?.message });
      report[name] = { ok: false, fetched: 0, error: r.reason?.message || 'failed' };
    }
  });
  return { candidates, report };
}

module.exports = { fetchAll, SOURCES, htmlToText, findEmail, findTwitter };
