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

router.get('/', asyncHandler(async (req, res) => {
  const settings = await db.getSettings();
  ok(res, settings);
}));

router.post('/', asyncHandler(async (req, res) => {
  const settings = await db.updateSettings(req.body || {});
  ok(res, settings);
}));

module.exports = router;
