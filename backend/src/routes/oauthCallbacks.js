const express = require('express');
const router = express.Router();
const linkedinService = require('../services/linkedinService');
const instagramService = require('../services/instagramService');
const logger = require('../utils/logger');

// LinkedIn/Meta redirect the USER'S BROWSER here directly after they approve
// the connection — no custom headers can be attached to that redirect, so
// this must stay reachable without the app's own X-API-Key (same reasoning
// as routes/webhooks.js). Returns a plain HTML page since a real browser
// lands here, not the Flutter app or a JSON client.
function resultPage(res, { ok, message }) {
  res.status(ok ? 200 : 400).send(`<!doctype html>
<html><body style="font-family: system-ui; text-align: center; padding: 60px 20px; background: #122436; color: #f8f4ec;">
  <h2>${ok ? '✅ Connected' : '⚠️ Connection failed'}</h2>
  <p>${message}</p>
  <p style="opacity: 0.6; font-size: 14px;">You can close this tab and go back to CLA.</p>
</body></html>`);
}

router.get('/linkedin/callback', async (req, res) => {
  const { code, error, error_description: errorDescription } = req.query;
  if (error) return resultPage(res, { ok: false, message: errorDescription || error });
  try {
    const result = await linkedinService.handleCallback(code);
    resultPage(res, { ok: true, message: `LinkedIn connected as ${result.name}.` });
  } catch (e) {
    logger.error('LinkedIn OAuth callback failed', { error: e.response?.data || e.message });
    resultPage(res, { ok: false, message: e.message });
  }
});

router.get('/instagram/callback', async (req, res) => {
  const { code, error, error_description: errorDescription } = req.query;
  if (error) return resultPage(res, { ok: false, message: errorDescription || error });
  try {
    const result = await instagramService.handleCallback(code);
    resultPage(res, { ok: true, message: `Instagram connected via Page "${result.name}".` });
  } catch (e) {
    logger.error('Instagram OAuth callback failed', { error: e.response?.data || e.message });
    resultPage(res, { ok: false, message: e.message });
  }
});

module.exports = router;
