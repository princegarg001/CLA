const test = require('node:test');
const assert = require('node:assert/strict');
const twitter = require('../src/services/twitterService');
const linkedin = require('../src/services/linkedinService');
const reddit = require('../src/services/redditService');
const engine = require('../src/services/publishEngine');

const base = (over) => ({ id: 'e1', content: 'hello world', platforms: ['twitter'], post_type: 'post', results: [], raw: {}, ...over });

test('each platform receives its own variant text', async (t) => {
  const tw = t.mock.method(twitter, 'publish', async ({ text }) => ({ status: 'success', externalPostId: '1', url: 'u', sentText: text }));
  const li = t.mock.method(linkedin, 'publish', async ({ text }) => ({ status: 'success', externalPostId: '2', sentText: text }));
  const entry = base({
    platforms: ['twitter', 'linkedin'],
    content: 'shared',
    raw: { variants: { twitter: { text: 'tweet version' }, linkedin: { text: 'linkedin version' } } },
  });
  const out = await engine.publishCalendarEntry(entry);
  assert.equal(tw.mock.calls[0].arguments[0].text, 'tweet version');
  assert.equal(li.mock.calls[0].arguments[0].text, 'linkedin version');
  assert.equal(out.overall, 'posted');
});

test('platforms that already succeeded are never re-sent (safe retry)', async (t) => {
  const tw = t.mock.method(twitter, 'publish', async () => ({ status: 'success' }));
  const li = t.mock.method(linkedin, 'publish', async () => ({ status: 'success', externalPostId: 'new' }));
  const entry = base({
    platforms: ['twitter', 'linkedin'],
    results: [
      { platform: 'twitter', status: 'success', externalPostId: 'old', url: 'https://x.com/i/status/old' },
      { platform: 'linkedin', status: 'failed', error: 'boom', retriable: true },
    ],
  });
  const out = await engine.publishCalendarEntry(entry);
  assert.equal(tw.mock.callCount(), 0, 'twitter must not be posted twice');
  assert.equal(li.mock.callCount(), 1);
  assert.equal(out.overall, 'posted');
  assert.equal(out.results.find((r) => r.platform === 'twitter').externalPostId, 'old', 'earlier success preserved');
});

test('one platform failing makes the entry partial and flags transient failures for retry', async (t) => {
  t.mock.method(twitter, 'publish', async () => ({ status: 'success', externalPostId: '1' }));
  t.mock.method(linkedin, 'publish', async () => ({ status: 'failed', error: 'LinkedIn 503', retriable: true }));
  const out = await engine.publishCalendarEntry(base({ platforms: ['twitter', 'linkedin'] }));
  assert.equal(out.overall, 'partial');
  assert.deepEqual(out.retry.platforms, ['linkedin']);
  assert.equal(out.retry.needed, true);
});

test('non-retriable failures are not queued for retry', async (t) => {
  t.mock.method(linkedin, 'publish', async () => ({ status: 'failed', error: 'expired', retriable: false }));
  const out = await engine.publishCalendarEntry(base({ platforms: ['linkedin'] }));
  assert.equal(out.overall, 'failed');
  assert.equal(out.retry.needed, false);
});

test('invalid content is rejected before any platform API is called', async (t) => {
  const tw = t.mock.method(twitter, 'publish', async () => ({ status: 'success' }));
  const out = await engine.publishCalendarEntry(base({ content: 'a'.repeat(400) }));
  assert.equal(tw.mock.callCount(), 0);
  assert.equal(out.overall, 'failed');
  assert.match(out.results[0].error, /400\/280/);
});

test('reddit gets subreddit/title/kind from its variant; retryAfter propagates', async (t) => {
  const rd = t.mock.method(reddit, 'submit', async () => ({ status: 'failed', error: 'slow down', retriable: true, retryAfterSec: 700 }));
  const entry = base({
    platforms: ['reddit'],
    content: 'body text',
    raw: { variants: { reddit: { subreddit: 'SaaS', title: 'My title' } } },
  });
  const out = await engine.publishCalendarEntry(entry);
  const args = rd.mock.calls[0].arguments[0];
  assert.equal(args.subreddit, 'SaaS');
  assert.equal(args.title, 'My title');
  assert.equal(args.kind, 'self');
  assert.equal(args.text, 'body text');
  assert.equal(out.retry.retryAfterSec, 700);
});

test('media that was not uploaded through the app fails cleanly instead of crashing', async (t) => {
  t.mock.method(twitter, 'publish', async () => ({ status: 'success' }));
  const entry = base({ raw: { media: [{ url: 'https://evil.example/x.png', type: 'image', size: 10 }] } });
  const out = await engine.publishCalendarEntry(entry);
  assert.equal(out.overall, 'failed');
  assert.match(out.results[0].error, /uploaded through the app/);
});

test('retrying with `only` limits which platforms run', async (t) => {
  const tw = t.mock.method(twitter, 'publish', async () => ({ status: 'success' }));
  const li = t.mock.method(linkedin, 'publish', async () => ({ status: 'success' }));
  await engine.publishCalendarEntry(base({ platforms: ['twitter', 'linkedin'] }), { only: ['linkedin'] });
  assert.equal(tw.mock.callCount(), 0);
  assert.equal(li.mock.callCount(), 1);
});
