const express = require('express');
const router = express.Router();
const umamiService = require('../services/umamiService');
const { asyncHandler, ok } = require('../utils/helpers');

router.get('/stats', asyncHandler(async (req, res) => {
  const { startAt, endAt } = req.query;
  const stats = await umamiService.getStats({
    startAt: startAt ? Number(startAt) : undefined,
    endAt: endAt ? Number(endAt) : undefined,
  });
  ok(res, stats);
}));

router.get('/active', asyncHandler(async (req, res) => {
  const active = await umamiService.getActiveVisitors();
  ok(res, active);
}));

module.exports = router;
