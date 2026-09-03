const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');
const { asyncHandler, ok, fail } = require('../utils/helpers');

// POST /api/notifications/register-token — the Flutter app calls this once
// per launch after auth, with its current FCM token.
router.post('/register-token', asyncHandler(async (req, res) => {
  const { token, platform } = req.body || {};
  if (!token) return fail(res, 400, 'token is required');
  const saved = await notificationService.registerToken(token, platform || 'android');
  ok(res, saved);
}));

// POST /api/notifications/test — send yourself a test push, for verifying
// the Firebase setup actually works end to end.
router.post('/test', asyncHandler(async (req, res) => {
  const result = await notificationService.sendPush({
    title: req.body?.title || 'CLA test notification',
    body: req.body?.body || 'If you got this, push notifications are working.',
    data: { type: 'test' },
  });
  ok(res, result);
}));

module.exports = router;
