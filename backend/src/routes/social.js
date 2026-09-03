const express = require('express');
const router = express.Router();
const multer = require('multer');
const { randomUUID } = require('crypto');
const linkedinService = require('../services/linkedinService');
const instagramService = require('../services/instagramService');
const twitterService = require('../services/twitterService');
const redditService = require('../services/redditService');
const storageService = require('../services/storageService');
const config = require('../config');
const db = require('../db');
const { asyncHandler, ok, fail } = require('../utils/helpers');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/social/upload-image — hosts a picked photo publicly so Instagram's
// Graph API (which fetches image_url itself, no raw upload) can reach it.
// The Flutter app calls this before /publish when Instagram is selected.
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
  const [linkedin, instagram] = await Promise.all([linkedinService.status(), instagramService.status()]);
  const twitterFeatures = twitterService.features();
  ok(res, {
    linkedin,
    instagram,
    twitter: {
      appConfigured: config.isConfigured('twitter'),
      connected: twitterService.canPost(),
      features: twitterFeatures,
    },
    reddit: redditService.status(),
  });
}));

// GET /api/social/:platform/auth-url — the app calls this (authenticated),
// then opens the returned URL in the phone's browser to complete OAuth.
// `state` isn't persisted/validated server-side — acceptable for a
// single-user tool where the only party that can complete the flow is
// whoever is logged into Prince's own LinkedIn/Meta account in that browser.
router.get('/:platform/auth-url', (req, res) => {
  const { platform } = req.params;
  const state = randomUUID();
  try {
    if (platform === 'linkedin') return ok(res, { url: linkedinService.getAuthUrl(state) });
    if (platform === 'instagram') return ok(res, { url: instagramService.getAuthUrl(state) });
    return fail(res, 400, `Unknown platform "${platform}". Expected linkedin or instagram.`);
  } catch (e) {
    return fail(res, e.status || 400, e.message);
  }
});

router.post('/:platform/disconnect', asyncHandler(async (req, res) => {
  const { platform } = req.params;
  if (platform === 'linkedin') return ok(res, await linkedinService.disconnect());
  if (platform === 'instagram') return ok(res, await instagramService.disconnect());
  return fail(res, 400, `Unknown platform "${platform}". Expected linkedin or instagram.`);
}));

// POST /api/social/publish — the "Publish Everywhere" trigger. Runs every
// requested platform in parallel; one platform failing (e.g. Instagram with
// no image) doesn't block the others from publishing.
router.post('/publish', asyncHandler(async (req, res) => {
  const { text, imageUrl, platforms } = req.body || {};
  if (!text) return fail(res, 400, 'text is required');
  const targets = Array.isArray(platforms) && platforms.length ? platforms : ['twitter', 'linkedin', 'instagram'];
  const batchId = randomUUID();

  const runners = {
    twitter: async () => {
      const result = await twitterService.postTweet(text);
      return result.sample
        ? { status: 'skipped', reason: result.message }
        : { status: 'success', externalPostId: result.id };
    },
    linkedin: () => linkedinService.postText(text),
    instagram: () => instagramService.postImage(imageUrl, text),
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

// ---- Instagram advanced ----------------------------------------------------

router.get('/instagram/insights', asyncHandler(async (req, res) => {
  ok(res, await instagramService.getAccountInsights());
}));

router.get('/instagram/media', asyncHandler(async (req, res) => {
  ok(res, await instagramService.getMedia({ limit: req.query.limit ? Number(req.query.limit) : undefined }));
}));

router.get('/instagram/media/:id/insights', asyncHandler(async (req, res) => {
  ok(res, await instagramService.getMediaInsights(req.params.id));
}));

router.get('/instagram/comments', asyncHandler(async (req, res) => {
  const { mediaId } = req.query;
  if (!mediaId) return fail(res, 400, 'mediaId query param is required');
  ok(res, await instagramService.getComments(mediaId));
}));

router.post('/publish-carousel', asyncHandler(async (req, res) => {
  const { imageUrls, caption } = req.body || {};
  if (!Array.isArray(imageUrls) || imageUrls.length < 2) return fail(res, 400, 'imageUrls must have at least 2 URLs');
  const result = await instagramService.postCarousel(imageUrls, caption || '');
  ok(res, result);
}));

router.post('/publish-reel', asyncHandler(async (req, res) => {
  const { videoUrl, caption } = req.body || {};
  if (!videoUrl) return fail(res, 400, 'videoUrl is required');
  const result = await instagramService.postReel(videoUrl, caption || '');
  ok(res, result);
}));

router.post('/publish-story', asyncHandler(async (req, res) => {
  const { imageUrl, videoUrl } = req.body || {};
  if (!imageUrl && !videoUrl) return fail(res, 400, 'imageUrl or videoUrl is required');
  const result = await instagramService.postStory({ imageUrl, videoUrl });
  ok(res, result);
}));

module.exports = router;
