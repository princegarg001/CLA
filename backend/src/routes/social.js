const express = require('express');
const router = express.Router();
const multer = require('multer');
const { randomUUID } = require('crypto');
const linkedinService = require('../services/linkedinService');
const facebookService = require('../services/facebookService');
const twitterService = require('../services/twitterService');
const redditService = require('../services/redditService');
const storageService = require('../services/storageService');
const config = require('../config');
const db = require('../db');
const { asyncHandler, ok, fail } = require('../utils/helpers');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/social/upload-image — hosts a picked photo publicly so a Facebook
// photo post (which fetches the `url` param itself, no raw upload) can reach
// it. The app calls this before /publish when an image is attached.
router.post('/upload-image', upload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) return fail(res, 400, 'image file is required (multipart field name: "image")');
  const url = await storageService.uploadImage({
    buffer: req.file.buffer,
    filename: req.file.originalname || 'upload.jpg',
    mimeType: req.file.mimetype,
  });
  ok(res, { url });
}));

// GET /api/social/status — connection state for every platform the
// Automation Engine can publish to; drives Settings' "Connected Accounts"
// section and the platform toggle chips on the compose screen.
router.get('/status', asyncHandler(async (req, res) => {
  const [linkedin, facebook] = await Promise.all([linkedinService.status(), facebookService.status()]);
  const twitterFeatures = twitterService.features();
  ok(res, {
    linkedin,
    facebook,
    twitter: {
      appConfigured: config.isConfigured('twitter'),
      connected: twitterService.canPost(),
      features: twitterFeatures,
    },
    reddit: redditService.status(),
  });
}));

// GET /api/social/:platform/auth-url — the app calls this (authenticated),
// then opens the returned URL in the browser to complete OAuth. `state`
// isn't persisted/validated server-side — acceptable for a single-user tool
// where the only party that can complete the flow is whoever is logged into
// the founder's own LinkedIn/Meta account in that browser.
router.get('/:platform/auth-url', (req, res) => {
  const { platform } = req.params;
  const state = randomUUID();
  try {
    if (platform === 'linkedin') return ok(res, { url: linkedinService.getAuthUrl(state) });
    if (platform === 'facebook') return ok(res, { url: facebookService.getAuthUrl(state) });
    return fail(res, 400, `Unknown platform "${platform}". Expected linkedin or facebook.`);
  } catch (e) {
    return fail(res, e.status || 400, e.message);
  }
});

router.post('/:platform/disconnect', asyncHandler(async (req, res) => {
  const { platform } = req.params;
  if (platform === 'linkedin') return ok(res, await linkedinService.disconnect());
  if (platform === 'facebook') return ok(res, await facebookService.disconnect());
  return fail(res, 400, `Unknown platform "${platform}". Expected linkedin or facebook.`);
}));

// POST /api/social/publish — the "Publish Everywhere" trigger. Runs every
// requested platform in parallel; one platform failing doesn't block the others.
router.post('/publish', asyncHandler(async (req, res) => {
  const { text, imageUrl, platforms } = req.body || {};
  if (!text) return fail(res, 400, 'text is required');
  const targets = Array.isArray(platforms) && platforms.length ? platforms : ['twitter', 'linkedin', 'facebook'];
  const batchId = randomUUID();

  const runners = {
    twitter: async () => {
      const result = await twitterService.postTweet(text);
      return result.sample
        ? { status: 'skipped', reason: result.message }
        : { status: 'success', externalPostId: result.id };
    },
    linkedin: () => linkedinService.postText(text),
    facebook: () => facebookService.postText(text, imageUrl),
  };

  const results = await Promise.allSettled(
    targets.map(async (platform) => {
      const runner = runners[platform];
      if (!runner) return { platform, status: 'failed', error: `Unknown platform "${platform}"` };
      const outcome = await runner();
      return { platform, ...outcome };
    })
  );

  const settled = results.map((r) => (r.status === 'fulfilled' ? r.value : { status: 'failed', error: r.reason?.message || 'Unknown error' }));

  await Promise.all(
    settled.map((r) =>
      db.insert('social_posts', {
        batch_id: batchId,
        platform: r.platform,
        content: text,
        image_url: imageUrl || null,
        status: r.status === 'success' ? 'success' : r.status === 'skipped' ? 'pending' : 'failed',
        external_post_id: r.externalPostId || null,
        error: r.error || r.reason || null,
      })
    )
  );

  ok(res, { batchId, results: settled });
}));

module.exports = router;
