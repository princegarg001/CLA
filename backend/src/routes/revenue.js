const express = require('express');
const router = express.Router();
const db = require('../db');
const trustmrrService = require('../services/trustmrrService');
const { asyncHandler, ok, fail } = require('../utils/helpers');

router.get('/trustmrr', asyncHandler(async (req, res) => {
  ok(res, await trustmrrService.getMrr());
}));

router.get('/trend', asyncHandler(async (req, res) => {
  const { weeks } = req.query;
  ok(res, await trustmrrService.getTrend(weeks ? Number(weeks) : undefined));
}));

router.get('/deals', asyncHandler(async (req, res) => {
  const deals = await db.list('deals', { orderBy: { column: 'closed_at', ascending: false } });
  ok(res, deals);
}));

router.post('/deals', asyncHandler(async (req, res) => {
  const { title, value } = req.body || {};
  if (!title || value === undefined) return fail(res, 400, 'title and value are required');
  const deal = await db.insert('deals', req.body);
  ok(res, deal);
}));

// GET /api/revenue/summary — combined MRR + project revenue + international split + runway
router.get('/summary', asyncHandler(async (req, res) => {
  const [mrr, deals] = await Promise.all([trustmrrService.getMrr(), db.list('deals')]);
  const projectRevenue = deals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
  const bySource = deals.reduce((acc, d) => {
    const key = d.source || 'direct';
    acc[key] = (acc[key] || 0) + (Number(d.value) || 0);
    return acc;
  }, {});
  const avgDealSize = deals.length ? projectRevenue / deals.length : 0;

  ok(res, {
    mrr: mrr.mrr,
    arr: mrr.arr,
    projectRevenue,
    totalRevenue: mrr.mrr + projectRevenue,
    avgDealSize,
    dealCount: deals.length,
    revenueBySource: bySource,
  });
}));

module.exports = router;
