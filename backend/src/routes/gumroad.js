const express = require('express');
const router = express.Router();
const gumroadService = require('../services/gumroadService');
const { asyncHandler, ok } = require('../utils/helpers');

router.get('/products', asyncHandler(async (req, res) => {
  ok(res, await gumroadService.getProducts());
}));

router.get('/sales', asyncHandler(async (req, res) => {
  ok(res, await gumroadService.getSales());
}));

// GET /api/gumroad/stats — downloads today + conversion rate, for Growth Studio
router.get('/stats', asyncHandler(async (req, res) => {
  const [products, sales] = await Promise.all([gumroadService.getProducts(), gumroadService.getSales()]);
  const totalDownloads = products.reduce((sum, p) => sum + (p.downloads || 0), 0);
  const top = [...products].sort((a, b) => (b.downloads || 0) - (a.downloads || 0))[0];
  ok(res, {
    totalDownloads,
    salesCount: sales.length,
    topResource: top ? top.name : null,
    products,
  });
}));

module.exports = router;
