const axios = require('axios');
const config = require('../config');
const aiService = require('./aiService');
const logger = require('../utils/logger');
const { isRetriable, upstreamMessage } = require('../utils/http');

// "Script" app OAuth2 (password grant) — the right app type for a single
// account acting as itself (not on behalf of other users), which is exactly
// this use case. Free, 100 requests/minute. See
// github.com/reddit-archive/reddit/wiki/OAuth2#getting-started
const TOKEN_URL = 'https://www.reddit.com/api/v1/access_token';
const API_BASE = 'https://oauth.reddit.com';

let cachedToken = null; // { accessToken, expiresAt }

function isConfigured() {
  return config.isConfigured('reddit');
}

async function getToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30000) {
    return cachedToken.accessToken;
  }
  if (!isConfigured()) {
    throw Object.assign(new Error('Reddit not configured — set REDDIT_CLIENT_ID/SECRET/USERNAME/PASSWORD'), { status: 503 });
  }
  const { data } = await axios.post(
    TOKEN_URL,
    new URLSearchParams({ grant_type: 'password', username: config.redditUsername, password: config.redditPassword }),
    {
      auth: { username: config.redditClientId, password: config.redditClientSecret },
      headers: { 'User-Agent': config.redditUserAgent, 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000,
    }
  );
  cachedToken = { accessToken: data.access_token, expiresAt: Date.now() + (data.expires_in || 3600) * 1000 };
  return cachedToken.accessToken;
}

async function client() {
  const token = await getToken();
  return axios.create({
    baseURL: API_BASE,
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': config.redditUserAgent },
    timeout: 15000,
  });
}

function normalizePost(child) {
  const d = child.data || {};
  return {
    id: d.id,
    fullname: d.name, // t3_xxxxx — needed for comment/reply targets
    subreddit: d.subreddit,
    title: d.title,
    body: d.selftext || '',
    author: d.author,
    url: `https://reddit.com${d.permalink}`,
    score: d.score,
    numComments: d.num_comments,
    createdAt: d.created_utc ? new Date(d.created_utc * 1000).toISOString() : null,
    isSelf: !!d.is_self,
  };
}

// Score 0-10: how many configured keywords appear in the title/body,
// weighted so a title hit counts more than a body hit. Cheap pre-filter run
// before the (paid) AI scoring pass so we don't burn AI calls on noise.
function keywordScore(post, keywords) {
  const title = (post.title || '').toLowerCase();
  const body = (post.body || '').toLowerCase();
  let hits = 0;
  for (const kw of keywords) {
    const k = kw.toLowerCase();
    if (title.includes(k)) hits += 2;
    else if (body.includes(k)) hits += 1;
  }
  return Math.min(10, hits);
}

async function getHotPosts({ subreddits, limit = 25 } = {}) {
  const subs = subreddits && subreddits.length ? subreddits : config.redditMonitoredSubs;
  if (!isConfigured()) {
    return subs.slice(0, 3).flatMap((sub) => SAMPLE_POSTS(sub));
  }
  const http = await client();
  const results = await Promise.all(
    subs.map(async (sub) => {
      try {
        const { data } = await http.get(`/r/${sub}/hot`, { params: { limit } });
        return (data.data?.children || []).map(normalizePost);
      } catch (e) {
        logger.warn('redditService.getHotPosts: subreddit fetch failed', { sub, error: e.response?.data || e.message });
        return [];
      }
    })
  );
  return results.flat();
}

// The lead-gen surface: hot posts pre-filtered + ranked by keyword match,
// so the app only shows posts actually worth a human glance.
async function getOpportunities({ subreddits, keywords, limit = 25 } = {}) {
  const kws = keywords && keywords.length ? keywords : config.redditKeywords;
  const posts = await getHotPosts({ subreddits, limit });
  return posts
    .map((p) => ({ ...p, keywordScore: keywordScore(p, kws) }))
    .filter((p) => p.keywordScore > 0)
    .sort((a, b) => b.keywordScore - a.keywordScore);
}

async function searchPosts({ query, subreddit, limit = 25 } = {}) {
  if (!query) throw Object.assign(new Error('query is required'), { status: 400 });
  if (!isConfigured()) return SAMPLE_POSTS(subreddit || 'SaaS').filter((p) => p.title.toLowerCase().includes(query.toLowerCase()));
  const http = await client();
  const path = subreddit ? `/r/${subreddit}/search` : '/search';
  const { data } = await http.get(path, { params: { q: query, limit, restrict_sr: subreddit ? 'on' : undefined, sort: 'new' } });
  return (data.data?.children || []).map(normalizePost);
}

// AI drafts a genuinely helpful reply — answers the question first, mentions
// AlphoTech only as a natural aside, no hard sell. Falls back to a manual
// placeholder if AI is unavailable so the app still shows *something* to edit.
async function draftReply(post) {
  return aiService.safeComplete(
    {
      system:
        'You write Reddit comments for a backend engineering/automation studio founder (AlphoTech) doing organic lead generation. ' +
        'Read the post and write a genuinely helpful, specific reply that actually answers their question or problem — reddit users ' +
        'downvote and call out anything that reads as an ad. Only mention that you build this kind of thing if it flows naturally from ' +
        'the answer, and only as one soft aside near the end (e.g. "happy to share more if useful"), never a hard CTA, never a link. ' +
        'Match the subreddit\'s casual, no-fluff tone. 3-6 sentences.',
      prompt: `Subreddit: r/${post.subreddit}\nTitle: ${post.title}\nBody: ${post.body}`,
      maxTokens: 350,
    },
    `[AI draft unavailable right now — write this reply manually]\nPost: "${post.title}" in r/${post.subreddit}`
  );
}

async function postComment({ parentFullname, text }) {
  if (!parentFullname || !text) throw Object.assign(new Error('parentFullname and text are required'), { status: 400 });
  if (!isConfigured()) {
    return { status: 'skipped', reason: 'Reddit not connected — set REDDIT_* env vars to post live.', sample: true };
  }
  try {
    const http = await client();
    const { data } = await http.post('/api/comment', new URLSearchParams({ api_type: 'json', thing_id: parentFullname, text }));
    const errors = data.json?.errors;
    if (errors && errors.length) throw new Error(errors.map((e) => e.join(' ')).join('; '));
    const thing = data.json?.data?.things?.[0]?.data;
    return { status: 'success', externalId: thing?.name || null, permalink: thing?.permalink ? `https://reddit.com${thing.permalink}` : null };
  } catch (e) {
    logger.error('redditService.postComment failed', { error: e.response?.data || e.message });
    return { status: 'failed', error: e.response?.data?.message || e.message };
  }
}

// Reddit reports submit failures as [CODE, message, field] triples inside a
// 200 response. Turn the common ones into something actionable, and pull the
// wait time out of RATELIMIT so the scheduler can retry at the right moment.
function interpretSubmitErrors(errors) {
  const first = errors[0] || [];
  const code = first[0];
  const raw = errors.map((e) => e.slice(0, 2).join(': ')).join('; ');
  const friendly = {
    SUBREDDIT_NOEXIST: "That subreddit doesn't exist.",
    SUBREDDIT_NOTALLOWED: "You're not allowed to post in that subreddit (banned, or it's restricted/private).",
    SUBREDDIT_REQUIRED: 'Choose a subreddit to post in.',
    NO_SELFS: "That subreddit doesn't allow text posts — use a link or image post.",
    NO_LINKS: "That subreddit doesn't allow link posts — use a text post.",
    SUBMIT_VALIDATION_FLAIR_REQUIRED: 'That subreddit requires a post flair — pick one before posting.',
    TOO_LONG: 'The title or body is too long for Reddit.',
    ALREADY_SUB: 'That link has already been submitted to this subreddit.',
    USER_REQUIRED: 'Reddit rejected the login — check REDDIT_USERNAME/PASSWORD (and 2FA) on the server.',
  };
  let retriable = false;
  let retryAfterSec;
  if (code === 'RATELIMIT') {
    retriable = true;
    const m = /(\d+)\s*(minute|second)/i.exec(first[1] || '');
    retryAfterSec = m ? Number(m[1]) * (m[2].toLowerCase() === 'minute' ? 60 : 1) + 30 : 600;
  }
  return { message: friendly[code] || raw, retriable, retryAfterSec };
}

// Reddit image posts: lease an S3 upload slot, upload the bytes there, then
// submit with the resulting hosted URL.
async function uploadImageAsset(http, { buffer, mime, filename }) {
  const lease = await http.post('/api/media/asset.json', new URLSearchParams({ filepath: filename, mimetype: mime }));
  const args = lease.data?.args;
  if (!args?.action) throw new Error('Reddit did not return an upload slot');
  const action = args.action.startsWith('//') ? `https:${args.action}` : args.action;

  const form = new FormData();
  for (const f of args.fields || []) form.append(f.name, f.value);
  form.append('file', new Blob([buffer], { type: mime }), filename);
  const res = await fetch(action, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Reddit image upload failed (${res.status})`);

  const key = (args.fields || []).find((f) => f.name === 'key')?.value;
  return `${action}/${key}`;
}

// kind: 'self' (text) | 'link' | 'image'. For images pass `media` = { buffer,
// mime, name }. flairId is optional but some subreddits require one.
async function submit({ subreddit, title, kind = 'self', text, linkUrl, media, flairId }) {
  if (!subreddit || !title) throw Object.assign(new Error('subreddit and title are required'), { status: 400 });
  if (!isConfigured()) {
    return { status: 'skipped', reason: 'Reddit not connected — set REDDIT_* env vars to post live.', sample: true };
  }
  const sr = String(subreddit).replace(/^r\//i, '');
  try {
    const http = await client();
    const params = { api_type: 'json', sr, kind, title, resubmit: 'true', sendreplies: 'true' };
    if (flairId) params.flair_id = flairId;

    if (kind === 'self') params.text = text || '';
    else if (kind === 'link') params.url = linkUrl;
    else if (kind === 'image') {
      params.url = await uploadImageAsset(http, { buffer: media.buffer, mime: media.mime, filename: media.name || 'image' });
    }

    const { data } = await http.post('/api/submit', new URLSearchParams(params));
    const errors = data.json?.errors;
    if (errors && errors.length) {
      const { message, retriable, retryAfterSec } = interpretSubmitErrors(errors);
      return { status: 'failed', error: message, retriable, retryAfterSec };
    }
    const d = data.json?.data || {};
    return {
      status: 'success',
      externalPostId: d.name || d.id || null,
      id: d.id || null,
      // Image posts finish processing asynchronously and only return the
      // account's submissions page until then.
      url: d.url || d.user_submitted_page || null,
    };
  } catch (e) {
    logger.error('redditService.submit failed', { error: e.response?.data || e.message });
    return { status: 'failed', error: upstreamMessage(e), retriable: isRetriable(e) };
  }
}

// Back-compat wrapper for the original text-only signature.
function submitPost({ subreddit, title, text }) {
  return submit({ subreddit, title, kind: 'self', text });
}

// What a subreddit allows and requires — shown in the composer so a post
// isn't rejected for a missing flair or a forbidden post type.
async function getSubredditInfo(subreddit) {
  const sr = String(subreddit || '').replace(/^r\//i, '');
  if (!sr) throw Object.assign(new Error('subreddit is required'), { status: 400 });
  if (!isConfigured()) {
    return {
      sample: true,
      name: sr,
      subscribers: null,
      submissionType: 'any',
      over18: false,
      rules: [{ name: 'Sample rule', description: 'Connect Reddit to see this subreddit\'s real rules.' }],
      flairs: [],
    };
  }
  const http = await client();
  const [about, rules, flairs] = await Promise.all([
    http.get(`/r/${sr}/about`).then((r) => r.data?.data || {}).catch(() => ({})),
    http.get(`/r/${sr}/about/rules`).then((r) => r.data?.rules || []).catch(() => []),
    http.get(`/r/${sr}/api/link_flair_v2`).then((r) => (Array.isArray(r.data) ? r.data : [])).catch(() => []),
  ]);
  return {
    name: about.display_name || sr,
    subscribers: about.subscribers ?? null,
    submissionType: about.submission_type || 'any',
    over18: !!about.over18,
    rules: rules.map((r) => ({ name: r.short_name, description: (r.description || '').slice(0, 300) })),
    flairs: flairs.map((f) => ({ id: f.id, text: f.text })),
  };
}

async function getKarma() {
  if (!isConfigured()) {
    return { sample: true, linkKarma: 142, commentKarma: 890, accountAgeDays: 640 };
  }
  const http = await client();
  const { data } = await http.get('/api/v1/me');
  const createdDays = data.created_utc ? Math.floor((Date.now() / 1000 - data.created_utc) / 86400) : null;
  return { linkKarma: data.link_karma, commentKarma: data.comment_karma, accountAgeDays: createdDays, username: data.name };
}

function status() {
  return { appConfigured: isConfigured(), connected: isConfigured(), monitoredSubs: config.redditMonitoredSubs, keywords: config.redditKeywords };
}

function SAMPLE_POSTS(sub) {
  return [
    {
      id: `sample-${sub}-1`,
      fullname: `t3_sample${sub}1`,
      subreddit: sub,
      title: 'How do I structure a backend for a fintech MVP that needs to scale fast?',
      body: 'We just raised a seed round and need to move from a prototype to something production-ready. Node or Python? Microservices from day one or monolith first?',
      author: 'throwaway_founder',
      url: 'https://reddit.com/r/sample',
      score: 24,
      numComments: 11,
      createdAt: new Date(Date.now() - 3600e3 * 3).toISOString(),
      isSelf: true,
      sample: true,
    },
  ];
}

module.exports = {
  isConfigured,
  status,
  getHotPosts,
  getOpportunities,
  searchPosts,
  draftReply,
  postComment,
  submit,
  submitPost,
  getSubredditInfo,
  getKarma,
};
