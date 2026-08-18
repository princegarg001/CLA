const config = require('../config');

// Protects the API with a single shared key (CLA_API_KEY) sent as `X-API-Key`.
// If CLA_API_KEY is unset, auth is skipped entirely — useful for local development.
// Webhook routes mount their own signature/secret checks and skip this middleware.
function apiKeyAuth(req, res, next) {
  if (!config.claApiKey) return next();
  const provided = req.header('X-API-Key');
  if (provided && provided === config.claApiKey) return next();
  return res.status(401).json({ ok: false, error: 'Missing or invalid X-API-Key' });
}

module.exports = apiKeyAuth;
