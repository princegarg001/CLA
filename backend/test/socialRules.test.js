const test = require('node:test');
const assert = require('node:assert/strict');
const rules = require('../src/services/socialRules');

const entry = (over) => ({ content: '', platforms: [], post_type: 'post', raw: {}, ...over });
const msgs = (result, platform) => result.errors.filter((e) => e.platform === platform).map((e) => e.message);

test('tweetLength counts every URL as 23 characters', () => {
  const url = 'https://example.com/a/very/long/path/that/goes/on/and/on/and/on/forever/and/ever';
  assert.equal(rules.tweetLength(`hi ${url}`), 3 + 23);
});

test('twitter: 280 ok, 281 rejected', () => {
  const ok280 = rules.validateEntry(entry({ platforms: ['twitter'], content: 'a'.repeat(280) }));
  assert.equal(ok280.ok, true);
  const bad = rules.validateEntry(entry({ platforms: ['twitter'], content: 'a'.repeat(281) }));
  assert.equal(bad.ok, false);
  assert.match(msgs(bad, 'twitter')[0], /281\/280/);
});

test('twitter thread: names the offending tweet and caps length', () => {
  const thread = `${'a'.repeat(100)}\n\n${'b'.repeat(300)}`;
  const r = rules.validateEntry(entry({ platforms: ['twitter'], post_type: 'thread', content: thread }));
  assert.equal(r.ok, false);
  assert.match(msgs(r, 'twitter')[0], /Tweet 2 is 300\/280/);
  const tooMany = Array.from({ length: 26 }, (_, i) => `tweet ${i}`).join('\n\n');
  const r2 = rules.validateEntry(entry({ platforms: ['twitter'], post_type: 'thread', content: tooMany }));
  assert.match(msgs(r2, 'twitter')[0], /capped at 25/);
});

test('twitter media rules: max 4 images, no mixing video with images', () => {
  const img = (i) => ({ url: `u${i}`, type: 'image', size: 1000 });
  const five = rules.validateEntry(entry({ platforms: ['twitter'], content: 'x', raw: { media: [1, 2, 3, 4, 5].map(img) } }));
  assert.match(msgs(five, 'twitter').join(' '), /At most 4 images/);
  const mixed = rules.validateEntry(entry({ platforms: ['twitter'], content: 'x', raw: { media: [img(1), { url: 'v', type: 'video', size: 10 }] } }));
  assert.match(msgs(mixed, 'twitter').join(' '), /can't be combined/);
  const big = rules.validateEntry(entry({ platforms: ['twitter'], content: 'x', raw: { media: [{ url: 'u', type: 'image', size: 6 * 1048576, name: 'big.png' }] } }));
  assert.match(msgs(big, 'twitter').join(' '), /big\.png is 6\.0MB — limit is 5\.0MB/);
});

test('twitter: empty text with no media is rejected, media-only is fine', () => {
  assert.equal(rules.validateEntry(entry({ platforms: ['twitter'], content: '' })).ok, false);
  assert.equal(rules.validateEntry(entry({ platforms: ['twitter'], content: '', raw: { media: [{ url: 'u', type: 'image', size: 5 }] } })).ok, true);
});

test('per-platform variants override the shared content', () => {
  const e = entry({
    platforms: ['twitter', 'linkedin'],
    content: 'a'.repeat(1000),
    raw: { variants: { twitter: { text: 'short tweet' } } },
  });
  const r = rules.validateEntry(e);
  assert.equal(r.platforms.twitter.errors.length, 0, 'twitter uses its own short variant');
  assert.equal(r.platforms.linkedin.errors.length, 0, 'linkedin falls back to the 1000-char content');
});

test('linkedin: 3000 limit, link+media conflict, video+image conflict', () => {
  assert.equal(rules.validateEntry(entry({ platforms: ['linkedin'], content: 'a'.repeat(3000) })).ok, true);
  assert.equal(rules.validateEntry(entry({ platforms: ['linkedin'], content: 'a'.repeat(3001) })).ok, false);
  const linkMedia = rules.validateEntry(entry({
    platforms: ['linkedin'], content: 'x',
    raw: { media: [{ url: 'u', type: 'image', size: 5 }], variants: { linkedin: { linkUrl: 'https://a.com' } } },
  }));
  assert.match(msgs(linkMedia, 'linkedin').join(' '), /link preview and media/);
  const mixed = rules.validateEntry(entry({
    platforms: ['linkedin'], content: 'x',
    raw: { media: [{ url: 'u', type: 'image', size: 5 }, { url: 'v', type: 'video', size: 5 }] },
  }));
  assert.match(msgs(mixed, 'linkedin').join(' '), /can't be mixed/);
});

test('reddit: needs subreddit and title, validates by post kind', () => {
  const none = rules.validateEntry(entry({ platforms: ['reddit'], content: 'body' }));
  assert.match(msgs(none, 'reddit').join(' '), /Pick a subreddit/);
  assert.match(msgs(none, 'reddit').join(' '), /need a title/);

  const goodSelf = rules.validateEntry(entry({ platforms: ['reddit'], content: 'body', raw: { variants: { reddit: { subreddit: 'SaaS', title: 'Hello' } } } }));
  assert.equal(goodSelf.ok, true);

  const linkNoUrl = rules.validateEntry(entry({ platforms: ['reddit'], raw: { variants: { reddit: { subreddit: 'SaaS', title: 't', kind: 'link' } } } }));
  assert.match(msgs(linkNoUrl, 'reddit').join(' '), /Add the link/);

  const badName = rules.validateEntry(entry({ platforms: ['reddit'], raw: { variants: { reddit: { subreddit: 'not valid!', title: 't' } } } }));
  assert.match(msgs(badName, 'reddit').join(' '), /2–21 letters/);

  const longTitle = rules.validateEntry(entry({ platforms: ['reddit'], raw: { variants: { reddit: { subreddit: 'SaaS', title: 'x'.repeat(301) } } } }));
  assert.match(msgs(longTitle, 'reddit').join(' '), /301\/300/);
});

test('reddit: video is rejected with a helpful alternative; single image accepted', () => {
  const video = rules.validateEntry(entry({
    platforms: ['reddit'],
    raw: { media: [{ url: 'v', type: 'video', size: 5 }], variants: { reddit: { subreddit: 'SaaS', title: 't' } } },
  }));
  assert.match(msgs(video, 'reddit').join(' '), /share a link to the video/);
  const image = rules.validateEntry(entry({
    platforms: ['reddit'],
    raw: { media: [{ url: 'i', type: 'image', size: 5 }], variants: { reddit: { subreddit: 'SaaS', title: 't' } } },
  }));
  assert.equal(image.ok, true);
});

test('validateEntry: no platforms and unknown platforms are errors', () => {
  assert.equal(rules.validateEntry(entry({})).ok, false);
  assert.match(rules.validateEntry(entry({ platforms: ['myspace'], content: 'x' })).errors[0].message, /Unknown platform/);
});

test('media inferred from media_urls when raw.media is absent', () => {
  const m = rules.entryMedia({ media_urls: ['https://x/a.MP4', 'https://x/b.png?x=1', 'https://x/c.gif'] });
  assert.deepEqual(m.map((i) => i.type), ['video', 'image', 'gif']);
});
