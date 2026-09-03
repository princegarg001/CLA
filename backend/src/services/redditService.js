const axios = require('axios');
const config = require('../config');
const aiService = require('./aiService');
const logger = require('../utils/logger');

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

async function submitPost({ subreddit, title, text }) {
  if (!subreddit || !title) throw Object.assign(new Error('subreddit and title are required'), { status: 400 });
  if (!isConfigured()) {
    return { status: 'skipped', reason: 'Reddit not connected — set REDDIT_* env vars to post live.', sample: true };
  }
  try {
    const http = await client();
    const { data } = await http.post(
      '/api/submit',
      new URLSearchParams({ api_type: 'json', sr: subreddit, kind: 'self', title, text: text || '', resubmit: 'true' })
    );
    const errors = data.json?.errors;
    if (errors && errors.length) throw new Error(errors.map((e) => e.join(' ')).join('; '));
    return { status: 'success', url: data.json?.data?.url || null, id: data.json?.data?.id || null };
  } catch (e) {
    logger.error('redditService.submitPost failed', { error: e.response?.data || e.message });
    return { status: 'failed', error: e.response?.data?.message || e.message };
  }
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
  submitPost,
  getKarma,
};
