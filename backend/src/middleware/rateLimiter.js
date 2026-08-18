const rateLimit = require('express-rate-limit');

// Generous general limit — this is a solo-founder personal tool, not a public API,
// but we still guard against a runaway client (e.g. a polling bug in the app) hammering
// paid upstream APIs (Apollo, OpenAI) through our proxy routes.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many requests, slow down.' },
});

// Tighter limit for routes that call metered/paid third-party APIs directly.
const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Rate limit exceeded for this endpoint.' },
});

module.exports = { apiLimiter, strictLimiter };
