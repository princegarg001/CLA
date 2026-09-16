const express = require('express');
const router = express.Router();
const config = require('../config');
const db = require('../db');
const { asyncHandler, ok } = require('../utils/helpers');

// GET /api/settings/integrations — the Settings screen's 17-platform toggle grid
router.get('/integrations', (req, res) => {
  const status = config.integrationStatus();
  ok(res, Object.entries(status).map(([name, connected]) => ({ name, connected })));
});

// GET /api/settings/account — name/username of every login account, no
// password hashes. Behind the same X-API-Key gate as everything else in
// this router, which already grants full read access to every other table
// (leads, clients, revenue...) — listing usernames here adds no new
// exposure. Exists so a forgotten username can be recovered without a
// direct database query.
router.get('/account', asyncHandler(async (req, res) => {
  const users = await db.list('app_users');
  ok(res, users.map((u) => ({ name: u.name, username: u.username })));
}));

router.get('/', asyncHandler(async (req, res) => {
  const settings = await db.getSettings();
  ok(res, settings);
}));

router.post('/', asyncHandler(async (req, res) => {
  const settings = await db.updateSettings(req.body || {});
  ok(res, settings);
}));

module.exports = router;
