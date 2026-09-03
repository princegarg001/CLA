const express = require('express');
const router = express.Router();
const redditService = require('../services/redditService');
const db = require('../db');
const { asyncHandler, ok, fail } = require('../utils/helpers');
const { strictLimiter } = require('../middleware/rateLimiter');

router.get('/status', (req, res) => ok(res, redditService.status()));

// GET /api/reddit/feed — hot posts across monitored subreddits, unfiltered.
router.get('/feed', asyncHandler(async (req, res) => {
  const subreddits = req.query.subreddits ? String(req.query.subreddits).split(',').map((s) => s.trim()) : undefined;
  const posts = await redditService.getHotPosts({ subreddits, limit: req.query.limit ? Number(req.query.limit) : undefined });
  ok(res, posts);
}));

// GET /api/reddit/opportunities — hot posts pre-scored against ICP keywords, ranked.
router.get('/opportunities', asyncHandler(async (req, res) => {
  const subreddits = req.query.subreddits ? String(req.query.subreddits).split(',').map((s) => s.trim()) : undefined;
  const keywords = req.query.keywords ? String(req.query.keywords).split(',').map((s) => s.trim()) : undefined;
  const posts = await redditService.getOpportunities({ subreddits, keywords, limit: req.query.limit ? Number(req.query.limit) : undefined });
  ok(res, posts);
}));

router.get('/search', asyncHandler(async (req, res) => {
  const { q, subreddit, limit } = req.query;
  if (!q) return fail(res, 400, 'q is required');
  const posts = await redditService.searchPosts({ query: q, subreddit, limit: limit ? Number(limit) : undefined });
  ok(res, posts);
}));

// POST /api/reddit/draft-reply — AI drafts a helpful reply to a specific post
// (does NOT post it — the app shows this for one-tap approval first).
router.post('/draft-reply', strictLimiter, asyncHandler(async (req, res) => {
  const { post } = req.body || {};
  if (!post || !post.title) return fail(res, 400, 'post (with at least a title) is required');
  const draft = await redditService.draftReply(post);
  ok(res, { draft });
}));

// POST /api/reddit/reply — post an (AI-drafted or edited) reply, one tap after approval.
router.post('/reply', strictLimiter, asyncHandler(async (req, res) => {
  const { parentFullname, text, postId, subreddit, postTitle } = req.body || {};
  if (!text) return fail(res, 400, 'text is required');
  if (!parentFullname) return fail(res, 400, 'parentFullname is required (the post/comment fullname, e.g. t3_xxxxx)');
  const result = await redditService.postComment({ parentFullname, text });
  await db.insert('social_posts', {
    batch_id: require('crypto').randomUUID(),
    platform: 'reddit',
    content: text,
    image_url: null,
    status: result.status === 'success' ? 'success' : result.status === 'skipped' ? 'pending' : 'failed',
    external_post_id: result.externalId || null,
    error: result.error || result.reason || null,
  }).catch(() => {});
  ok(res, { ...result, postId, subreddit, postTitle });
}));

// POST /api/reddit/schedule — schedule a self-post to a subreddit via the
// same content_calendar the other platforms use (platforms: ['reddit']).
router.post('/schedule', asyncHandler(async (req, res) => {
  const { subreddit, title, text, scheduledFor } = req.body || {};
  if (!subreddit || !title || !scheduledFor) return fail(res, 400, 'subreddit, title and scheduledFor are required');
  const entry = await db.insert('content_calendar', {
    content: text || '',
    media_urls: [],
    platforms: ['reddit'],
    post_type: 'post',
    scheduled_for: scheduledFor,
    status: 'scheduled',
    ai_generated: false,
    results: [],
    engagement: {},
    raw: { subreddit, title },
  });
  ok(res, entry);
}));

router.get('/analytics', asyncHandler(async (req, res) => {
  ok(res, await redditService.getKarma());
}));

module.exports = router;
