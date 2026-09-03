const express = require('express');
const router = express.Router();
const twitterService = require('../services/twitterService');
const aiService = require('../services/aiService');
const db = require('../db');
const { asyncHandler, ok, fail } = require('../utils/helpers');
const { strictLimiter } = require('../middleware/rateLimiter');

router.get('/features', (req, res) => ok(res, { ...twitterService.features(), canPost: twitterService.canPost() }));

router.post('/post', strictLimiter, asyncHandler(async (req, res) => {
  const { text } = req.body || {};
  if (!text) return fail(res, 400, 'text is required');
  const tweet = await twitterService.postTweet(text);
  ok(res, tweet);
}));

// POST /api/twitter/thread — post a multi-tweet thread now (each tweet chained
// as a reply to the previous one). Body: { tweets: string[] }
router.post('/thread', strictLimiter, asyncHandler(async (req, res) => {
  const { tweets } = req.body || {};
  if (!Array.isArray(tweets) || !tweets.length) return fail(res, 400, 'tweets must be a non-empty array of strings');
  const result = await twitterService.postThread(tweets);
  ok(res, result);
}));

// POST /api/twitter/reply — reply to a specific tweet by ID or full URL.
router.post('/reply', strictLimiter, asyncHandler(async (req, res) => {
  const { text } = req.body || {};
  let { tweetId, tweetUrl } = req.body || {};
  if (!tweetId && tweetUrl) {
    const match = String(tweetUrl).match(/status\/(\d+)/);
    tweetId = match ? match[1] : null;
  }
  if (!tweetId) return fail(res, 400, 'tweetId or a tweetUrl containing /status/<id> is required');
  if (!text) return fail(res, 400, 'text is required');
  const tweet = await twitterService.postReply(tweetId, text);
  ok(res, tweet);
}));

router.get('/dms', asyncHandler(async (req, res) => {
  const dms = await twitterService.getDMs();
  ok(res, dms);
}));

router.get('/analytics', asyncHandler(async (req, res) => {
  const analytics = await twitterService.getAnalytics();
  ok(res, analytics);
}));

// AI thread builder — tap a topic, get hook + 6-8 tweets + CTA
router.post('/thread/generate', strictLimiter, asyncHandler(async (req, res) => {
  const { topic } = req.body || {};
  if (!topic) return fail(res, 400, 'topic is required');
  const raw = await aiService.generateTwitterThread(topic);
  const tweets = raw.split('\n').map((t) => t.trim()).filter(Boolean);
  ok(res, { topic, tweets });
}));

// Scheduled posts (post scheduler with timezone targeting)
router.get('/scheduled', asyncHandler(async (req, res) => {
  const posts = await db.list('scheduled_posts', { orderBy: { column: 'scheduled_for', ascending: true } });
  ok(res, posts);
}));

router.post('/scheduled', asyncHandler(async (req, res) => {
  const { content, thread, scheduled_for: scheduledFor } = req.body || {};
  if (!scheduledFor) return fail(res, 400, 'scheduled_for is required');
  const post = await db.insert('scheduled_posts', { content, thread, scheduled_for: scheduledFor, status: 'scheduled' });
  ok(res, post);
}));

router.patch('/scheduled/:id', asyncHandler(async (req, res) => {
  const { content, thread, scheduled_for: scheduledFor, status } = req.body || {};
  const patch = {};
  if (content !== undefined) patch.content = content;
  if (thread !== undefined) patch.thread = thread;
  if (scheduledFor !== undefined) patch.scheduled_for = scheduledFor;
  if (status !== undefined) patch.status = status;
  const updated = await db.update('scheduled_posts', req.params.id, patch);
  if (!updated) return fail(res, 404, 'Scheduled post not found');
  ok(res, updated);
}));

router.delete('/scheduled/:id', asyncHandler(async (req, res) => {
  await db.remove('scheduled_posts', req.params.id);
  ok(res, { id: req.params.id });
}));

module.exports = router;
