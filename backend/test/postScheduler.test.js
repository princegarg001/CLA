const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/db');
const engine = require('../src/services/publishEngine');
const scheduler = require('../src/cron/postScheduler');

const NOW = new Date('2026-09-20T12:00:00.000Z');
const minutes = (n) => new Date(NOW.getTime() + n * 60000).toISOString();

// In-memory stand-in for the two tables the scheduler touches.
function fakeDb(t, entries) {
  const rows = new Map(entries.map((e) => [e.id, { raw: {}, results: [], updated_at: minutes(-1), ...e }]));
  const updates = [];
  t.mock.method(db, 'list', async (table, { filters = {} } = {}) => {
    if (table !== 'content_calendar') return [];
    return [...rows.values()].filter((r) => Object.entries(filters).every(([k, v]) => r[k] === v));
  });
  t.mock.method(db, 'claim', async (table, id, { where, patch }) => {
    const row = rows.get(id);
    if (!row || Object.entries(where).some(([k, v]) => row[k] !== v)) return null;
    const next = { ...row, ...patch };
    rows.set(id, next);
    return next;
  });
  t.mock.method(db, 'update', async (table, id, patch) => {
    const next = { ...rows.get(id), ...patch };
    rows.set(id, next);
    updates.push({ id, patch });
    return next;
  });
  return { rows, updates };
}

test('a due entry is claimed, published and marked posted', async (t) => {
  const { rows } = fakeDb(t, [{ id: 'a', status: 'scheduled', scheduled_for: minutes(-5), platforms: ['twitter'] }]);
  const pub = t.mock.method(engine, 'publishCalendarEntry', async () => ({
    overall: 'posted', results: [{ platform: 'twitter', status: 'success' }], retry: { needed: false, platforms: [] },
  }));
  const out = await scheduler.run({ now: NOW });
  assert.equal(pub.mock.callCount(), 1);
  assert.equal(rows.get('a').status, 'posted');
  assert.equal(out.posted, 1);
});

test('entries scheduled in the future (or waiting on a retry delay) are left alone', async (t) => {
  fakeDb(t, [
    { id: 'future', status: 'scheduled', scheduled_for: minutes(30), platforms: ['twitter'] },
    { id: 'waiting', status: 'scheduled', scheduled_for: minutes(-60), raw: { next_attempt_at: minutes(10) }, platforms: ['twitter'] },
  ]);
  const pub = t.mock.method(engine, 'publishCalendarEntry', async () => assert.fail('must not publish'));
  await scheduler.run({ now: NOW });
  assert.equal(pub.mock.callCount(), 0);
});

test('an entry someone else already claimed is skipped (no double post)', async (t) => {
  const { rows } = fakeDb(t, [{ id: 'a', status: 'scheduled', scheduled_for: minutes(-5), platforms: ['twitter'] }]);
  // Simulate a racing publisher flipping it between our list and our claim.
  const realClaim = db.claim;
  t.mock.method(db, 'claim', async (...args) => {
    rows.set('a', { ...rows.get('a'), status: 'publishing' });
    return realClaim(...args);
  });
  const pub = t.mock.method(engine, 'publishCalendarEntry', async () => assert.fail('must not publish'));
  await scheduler.run({ now: NOW });
  assert.equal(pub.mock.callCount(), 0);
});

test('a transient failure is re-queued with backoff; a later attempt cap makes it final', async (t) => {
  const { rows } = fakeDb(t, [{ id: 'a', status: 'scheduled', scheduled_for: minutes(-5), platforms: ['linkedin'] }]);
  t.mock.method(engine, 'publishCalendarEntry', async () => ({
    overall: 'failed',
    results: [{ platform: 'linkedin', status: 'failed', retriable: true, error: '503' }],
    retry: { needed: true, platforms: ['linkedin'], retryAfterSec: null },
  }));

  let out = await scheduler.run({ now: NOW });
  assert.equal(out.retried, 1);
  assert.equal(rows.get('a').status, 'scheduled');
  assert.equal(rows.get('a').raw.attempts, 1);
  assert.equal(new Date(rows.get('a').raw.next_attempt_at).getTime(), NOW.getTime() + 2 * 60000, 'first backoff is 2 minutes');

  // Still inside the backoff window → not retried yet.
  out = await scheduler.run({ now: new Date(NOW.getTime() + 60000) });
  assert.equal(out.retried, 0);

  // Exhaust the attempts: attempt 2 (10 min backoff), attempt 3 is final.
  out = await scheduler.run({ now: new Date(NOW.getTime() + 3 * 60000) });
  assert.equal(rows.get('a').raw.attempts, 2);
  assert.equal(rows.get('a').status, 'scheduled');
  out = await scheduler.run({ now: new Date(NOW.getTime() + 20 * 60000) });
  assert.equal(rows.get('a').raw.attempts, 3);
  assert.equal(rows.get('a').status, 'failed', 'gives up after MAX_ATTEMPTS');
  assert.equal(out.failed, 1);
});

test("a platform's own retry-after (e.g. Reddit rate limit) beats the default backoff", async (t) => {
  const { rows } = fakeDb(t, [{ id: 'a', status: 'scheduled', scheduled_for: minutes(-5), platforms: ['reddit'] }]);
  t.mock.method(engine, 'publishCalendarEntry', async () => ({
    overall: 'failed',
    results: [{ platform: 'reddit', status: 'failed', retriable: true }],
    retry: { needed: true, platforms: ['reddit'], retryAfterSec: 900 },
  }));
  await scheduler.run({ now: NOW });
  assert.equal(new Date(rows.get('a').raw.next_attempt_at).getTime(), NOW.getTime() + 900 * 1000);
});

test('non-retriable failure is final immediately; partial success counts as posted', async (t) => {
  const { rows } = fakeDb(t, [
    { id: 'bad', status: 'scheduled', scheduled_for: minutes(-5), platforms: ['linkedin'] },
    { id: 'half', status: 'scheduled', scheduled_for: minutes(-4), platforms: ['twitter', 'linkedin'] },
  ]);
  t.mock.method(engine, 'publishCalendarEntry', async (entry) =>
    entry.id === 'bad'
      ? { overall: 'failed', results: [{ platform: 'linkedin', status: 'failed', retriable: false }], retry: { needed: false, platforms: [] } }
      : { overall: 'partial', results: [{ platform: 'twitter', status: 'success' }, { platform: 'linkedin', status: 'failed', retriable: false }], retry: { needed: false, platforms: [] } }
  );
  const out = await scheduler.run({ now: NOW });
  assert.equal(rows.get('bad').status, 'failed');
  assert.equal(rows.get('half').status, 'partial');
  assert.equal(out.posted, 1);
  assert.equal(out.failed, 1);
});

test('entries stuck in "publishing" after a crash are failed, not silently re-sent', async (t) => {
  const { rows } = fakeDb(t, [{ id: 'stuck', status: 'publishing', scheduled_for: minutes(-60), updated_at: minutes(-30), platforms: ['twitter'] }]);
  const pub = t.mock.method(engine, 'publishCalendarEntry', async () => assert.fail('must not publish'));
  await scheduler.run({ now: NOW });
  assert.equal(rows.get('stuck').status, 'failed');
  assert.match(rows.get('stuck').results[0].error, /Interrupted/);
  assert.equal(pub.mock.callCount(), 0);
});
