const express = require('express');
const router = express.Router();
const sentryService = require('../services/sentryService');
const { asyncHandler, ok } = require('../utils/helpers');

router.get('/issues', asyncHandler(async (req, res) => {
  const issues = await sentryService.getIssues();
  ok(res, issues);
}));

// GET /api/sentry/health — combined red/amber/green summary used by Analytics Tower + War Room
router.get('/health', asyncHandler(async (req, res) => {
  const issues = await sentryService.getIssues();
  const status = issues.critical > 0 ? 'red' : issues.warnings > 0 ? 'amber' : 'green';
  ok(res, { status, ...issues });
}));

module.exports = router;
