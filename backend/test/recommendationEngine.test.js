const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/db');
const notificationService = require('../src/services/notificationService');
const aiService = require('../src/services/aiService');
const engine = require('../src/services/recommendationEngine');
const { htmlToText, findEmail } = require('../src/services/leadSources');

engine.tuning.retryMs = 0;
const NOW = new Date('2026-09-20T12:00:00.000Z').getTime();
const hoursAgo = (h) => new Date(NOW - h * 3600000).toISOString();

const seeking = (over = {}) => ({
  key: 'hn_freelancer:1',
  source: 'hn_freelancer',
  kind: 'seeking',
  company: 'Acme',
  name: 'acme_cto',
  title: 'Need a backend developer for a Python API',
  text: 'SEEKING FREELANCER | Acme | Remote\nWe need a Python backend developer to build a REST API and Stripe integration. Budget $8,000. Email jobs@acme.io',
  url: 'https://news.ycombinator.com/item?id=1',
  postedAt: hoursAgo(3),
  email: 'jobs@acme.io',
  ...over,
});

const fte = (over = {}) => ({
  key: 'wwr:1',
  source: 'wwr',
  kind: 'hiring_fte',
  company: 'BigCo',
  title: 'Senior Backend Engineer',
  text: 'Senior Backend Engineer. Python, Postgres, AWS. Full-time, benefits, 401k.',
  url: 'https://weworkremotely.com/1',
  postedAt: hoursAgo(30),
  ...over,
});

test('someone directly asking for a freelancer outranks a full-time listing', () => {
  const a = engine.scoreCandidate(seeking(), { now: NOW });
  const b = engine.scoreCandidate(fte(), { now: NOW });
  assert.ok(a.score > b.score + 25, `${a.score} vs ${b.score}`);
  assert.ok(a.reasons.includes('Directly asking for a freelancer'));
  assert.ok(a.reasons.some((r) => r.startsWith('Budget mentioned')));
  assert.ok(a.reasons.includes('Contact email in the post'));
});

test('freshness matters: the same post scores lower as it ages', () => {
  const fresh = engine.scoreCandidate(seeking({ postedAt: hoursAgo(2) }), { now: NOW }).score;
  const old = engine.scoreCandidate(seeking({ postedAt: hoursAgo(24 * 20) }), { now: NOW }).score;
  assert.ok(fresh > old);
  assert.equal(engine.scoreCandidate(seeking({ postedAt: hoursAgo(24 * 45) }), { now: NOW }), null);
});

test('competitors advertising their own services are never leads', () => {
  assert.equal(engine.scoreCandidate(seeking({ text: 'SEEKING WORK | Remote | Python dev, available now' }), { now: NOW }), null);
});

test('a lone buzzword or the wrong role is not a fit', () => {
  assert.equal(engine.scoreCandidate(fte({ title: 'AI Trainer Image QA Evaluator', text: 'Label images for AI models.' }), { now: NOW }), null);
  assert.equal(engine.scoreCandidate(fte({ title: 'Shopify Developer', text: 'Shopify, Python, API' }), { now: NOW }), null);
  assert.equal(engine.scoreCandidate(fte({ title: 'Office Manager', text: 'We use email and AI tools.' }), { now: NOW }), null);
});

test('keywords match whole words only ("ai" must not match "email")', () => {
  const r = engine.scoreCandidate(fte({ title: 'Engineer', text: 'Send your email and maintain our tools.' }), { now: NOW });
  assert.equal(r, null);
});

test('red flags cut the score hard', () => {
  const clean = engine.scoreCandidate(seeking(), { now: NOW }).score;
  const flagged = engine.scoreCandidate(seeking({ text: 'Unpaid trial project, need a Python backend developer' }), { now: NOW });
  assert.ok(flagged.score < clean - 30);
  assert.ok(flagged.reasons.some((r) => r.startsWith('Red flag')));
});

test('"contract" buried in a full-time listing does not upgrade it', () => {
  const buried = fte({ text: `${'Senior Backend Engineer. Python, Postgres, AWS. '.repeat(12)} Benefits: W2 or contract to hire.` });
  assert.equal(engine.scoreCandidate(buried, { now: NOW }).kind, 'hiring_fte');
  const upfront = fte({ title: 'Contract Backend Engineer (Python)' });
  assert.equal(engine.scoreCandidate(upfront, { now: NOW }).kind, 'hiring_contract');
});

test('source weights only kick in with enough history, and stay within bounds', () => {
  const mk = (n, status, extra = {}) => Array.from({ length: n }, () => ({ source: 'remoteok', status, raw: { rec: { ...extra } } }));
  const few = engine.sourceStats([...mk(3, 'replied'), ...mk(2, 'new')]);
  assert.equal(few.remoteok.weight, 1);
  const good = engine.sourceStats([...mk(8, 'replied'), ...mk(2, 'new')]);
  assert.ok(good.remoteok.weight > 1 && good.remoteok.weight <= 1.25);
  const bad = engine.sourceStats(mk(10, 'closed_lost', { dismissed: true }));
  assert.ok(bad.remoteok.weight < 1 && bad.remoteok.weight >= 0.85);
  // Leads that did not come from the engine are ignored.
  assert.deepEqual(engine.sourceStats([{ source: 'apollo', status: 'replied', raw: {} }]), {});
});

test('recommendAction prefers email, then the source-specific route', () => {
  assert.equal(engine.recommendAction({ email: 'a@b.co', company: 'X' }, 'seeking').channel, 'email');
  assert.equal(engine.recommendAction({ source: 'hn_freelancer', name: 'bob' }, 'seeking').channel, 'hn_reply');
  assert.equal(engine.recommendAction({ source: 'wwr', company: 'X' }, 'hiring_fte').channel, 'linkedin');
});

test('htmlToText and findEmail handle HN-style markup', () => {
  assert.equal(htmlToText('Hi<p>it&#x27;s &amp; done<p>bye'), "Hi\nit's & done\nbye");
  assert.equal(findEmail('mail me: Jane.Doe@Example.com'), 'jane.doe@example.com');
  assert.equal(findEmail('jane at example dot com'), 'jane@example.com');
  assert.equal(findEmail('no contact here'), null);
});

test('followups: quiet contacted leads surface, fresh ones do not', async () => {
  const day = 86400000;
  const leads = [
    { id: 'a', status: 'contacted', score: 7, updated_at: new Date(NOW - 5 * day).toISOString() },
    { id: 'b', status: 'contacted', score: 9, updated_at: new Date(NOW - 1 * day).toISOString() },
    { id: 'c', status: 'proposal_sent', score: 6, updated_at: new Date(NOW - 6 * day).toISOString() },
    { id: 'd', status: 'closed_won', score: 10, updated_at: new Date(NOW - 6 * day).toISOString() },
    { id: 'e', status: 'contacted', score: 5, updated_at: new Date(NOW - 60 * day).toISOString() },
  ];
  const out = await engine.findFollowups(leads, NOW);
  assert.deepEqual(out.map((f) => f.leadId), ['c', 'a']);
});

// ---- generateBatch against an in-memory db -------------------------------------

function fakeStore(t, { leads = [], settings = {} } = {}) {
  const store = { leads: [...leads], settings: { ...settings }, inserted: [] };
  t.mock.method(db, 'getSettings', async () => store.settings);
  t.mock.method(db, 'updateSettings', async (patch) => {
    store.settings = { ...store.settings, ...patch };
    return store.settings;
  });
  t.mock.method(db, 'list', async (table) => (table === 'leads' ? store.leads : []));
  t.mock.method(db, 'get', async (table, id) => store.leads.find((l) => l.id === id) || null);
  t.mock.method(db, 'insert', async (table, row) => {
    const rec = { id: `L${store.leads.length + 1}`, created_at: new Date(NOW).toISOString(), updated_at: new Date(NOW).toISOString(), ...row };
    store.leads.push(rec);
    store.inserted.push(rec);
    return rec;
  });
  t.mock.method(db, 'update', async (table, id, patch) => {
    const i = store.leads.findIndex((l) => l.id === id);
    store.leads[i] = { ...store.leads[i], ...patch };
    return store.leads[i];
  });
  t.mock.method(notificationService, 'sendPush', async () => ({ sent: 0 }));
  t.mock.method(aiService, 'safeComplete', async (_args, fallback) => fallback); // AI off
  return store;
}

const fetcherOf = (candidates) => async () => ({ candidates, report: { test: { ok: true, fetched: candidates.length } } });

test('generateBatch saves ranked leads with a reason, action and draft; AI off still works', async (t) => {
  const store = fakeStore(t);
  const plan = await engine.generateBatch({ now: NOW, fetcher: fetcherOf([seeking(), fte(), fte({ key: 'wwr:2', company: 'Other', title: 'Office Manager', text: 'hello' })]) });

  assert.equal(plan.stats.picked, 2);
  assert.equal(store.inserted[0].company, 'Acme'); // strongest first
  const rec = store.inserted[0].raw.rec;
  assert.equal(rec.channel, 'email');
  assert.ok(rec.draft.includes('AlphoTech'));
  assert.equal(rec.draftByAi, false);
  assert.ok(store.inserted[0].score >= 1 && store.inserted[0].score <= 10);
  assert.equal(store.inserted[0].status, 'new');

  const today = await engine.getToday(NOW);
  assert.equal(today.items.length, 2);
  assert.equal(today.items[0].lead.company, 'Acme');
});

test('running again never re-recommends what was already shown', async (t) => {
  const store = fakeStore(t);
  const candidates = [seeking(), fte()];
  await engine.generateBatch({ now: NOW, fetcher: fetcherOf(candidates) });
  const second = await engine.generateBatch({ now: NOW + 3600000, fetcher: fetcherOf(candidates) });
  assert.equal(second.stats.picked, 0);
  assert.equal(second.stats.skippedKnown, 2);
  assert.equal(store.inserted.length, 2);
  assert.equal(second.items.length, 2); // today's plan keeps the first batch
});

test('a company we already have a lead for is skipped', async (t) => {
  const store = fakeStore(t, { leads: [{ id: 'old', company: 'ACME', status: 'contacted', source: 'apollo', raw: {} }] });
  const plan = await engine.generateBatch({ now: NOW, fetcher: fetcherOf([seeking()]) });
  assert.equal(plan.stats.picked, 0);
  assert.equal(store.inserted.length, 0);
});

test('one lead per company and per-source cap keep the list varied', async (t) => {
  const store = fakeStore(t, { settings: { icp: { count: 5 } } });
  const many = Array.from({ length: 8 }, (_, i) => fte({ key: `wwr:${i}`, company: `Co${i}` }));
  const dup = fte({ key: 'wwr:dup', company: 'Co0', title: 'Backend Engineer (Python)' });
  const plan = await engine.generateBatch({ now: NOW, fetcher: fetcherOf([...many, dup]) });
  assert.ok(plan.stats.picked <= 3, `source cap: ${plan.stats.picked}`); // ceil(5 * 0.6) = 3
  assert.equal(new Set(store.inserted.map((l) => l.company)).size, store.inserted.length);
});

test('dismiss closes the lead and records why, so the source weighting can learn', async (t) => {
  const store = fakeStore(t);
  await engine.generateBatch({ now: NOW, fetcher: fetcherOf([seeking()]) });
  const lead = store.inserted[0];
  const out = await engine.dismiss(lead.id, 'too small');
  assert.equal(out.status, 'closed_lost');
  assert.equal(out.raw.rec.dismissed, true);
  assert.equal(out.raw.rec.dismissReason, 'too small');
  assert.equal(await engine.dismiss('nope'), null);
});

test('a source that is down does not stop the run', async (t) => {
  fakeStore(t);
  const fetcher = async () => ({ candidates: [seeking()], report: { hn_freelancer: { ok: true, fetched: 1 }, remoteok: { ok: false, fetched: 0, error: 'boom' } } });
  const plan = await engine.generateBatch({ now: NOW, fetcher });
  assert.equal(plan.stats.picked, 1);
  assert.equal(plan.stats.sources.remoteok.ok, false);
});

test('concurrent runs are refused instead of double-inserting', async (t) => {
  fakeStore(t);
  let release;
  const gate = new Promise((r) => (release = r));
  const slow = async () => {
    await gate;
    return { candidates: [], report: {} };
  };
  const first = engine.generateBatch({ now: NOW, fetcher: slow });
  await assert.rejects(engine.generateBatch({ now: NOW, fetcher: slow }), /already in progress/);
  release();
  await first;
});

test('parseCopy reads the WHY/MESSAGE format and rejects anything malformed', () => {
  const ok = engine.parseCopy('WHY: They need a Python API built quickly.\nMESSAGE: "Hi, I saw your post about the billing API. I run AlphoTech, a small backend studio. Happy to send a fixed-scope plan by tomorrow."');
  assert.equal(ok.why, 'They need a Python API built quickly.');
  assert.ok(ok.message.startsWith('Hi, I saw your post') && !ok.message.startsWith('"'));
  assert.equal(engine.parseCopy('Sure! Here is a message for you.'), null);
  assert.equal(engine.parseCopy('WHY: ok\nMESSAGE: short'), null);
});

test('parseCopy exposes the AI fit verdict and generateBatch drops "no" fits', async (t) => {
  assert.equal(engine.parseCopy('FIT: no\nWHY: This is a job seeker, not a buyer.\nMESSAGE: Hi there, I saw your profile and wanted to reach out about something relevant to you.').fit, 'no');
  const store = fakeStore(t);
  t.mock.method(aiService, 'safeComplete', async () => 'FIT: no\nWHY: This is a job seeker, not a buyer.\nMESSAGE: Hi there, I saw your profile and wanted to reach out about something relevant to you.');
  const plan = await engine.generateBatch({ now: NOW, fetcher: fetcherOf([seeking()]) });
  assert.equal(plan.stats.picked, 0);
  assert.equal(plan.stats.rejectedByAi, 1);
  assert.equal(store.inserted.length, 0);
  assert.ok(store.settings.rec_seen['hn_freelancer:1'], 'rejected posts are remembered so they are not re-judged tomorrow');
});

test('a run stops drafting once its time budget is spent and still returns what it has', async (t) => {
  const store = fakeStore(t);
  const many = Array.from({ length: 6 }, (_, i) => fte({ key: `wwr:${i}`, company: `Co${i}` }));
  const before = engine.tuning.maxRunMs;
  engine.tuning.maxRunMs = -1; // budget already spent
  try {
    const plan = await engine.generateBatch({ now: NOW, fetcher: fetcherOf(many) });
    assert.equal(plan.stats.picked, 0);
    assert.equal(store.inserted.length, 0);
  } finally {
    engine.tuning.maxRunMs = before;
  }
});
