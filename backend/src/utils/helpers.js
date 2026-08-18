const { randomUUID } = require('crypto');

function newId() {
  return randomUUID();
}

function nowIso() {
  return new Date().toISOString();
}

// Wraps an async express handler so thrown errors reach errorHandler middleware
// instead of crashing the process or hanging the request.
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function ok(res, data, extra = {}) {
  return res.json({ ok: true, data, ...extra });
}

function fail(res, status, message) {
  return res.status(status).json({ ok: false, error: message });
}

// Clamp a raw AI/heuristic score into the 1-10 lead scoring scale used across every source.
function clampScore(n) {
  const num = Number(n);
  if (Number.isNaN(num)) return 1;
  return Math.max(1, Math.min(10, Math.round(num)));
}

module.exports = { newId, nowIso, asyncHandler, ok, fail, clampScore };
