const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const config = require('../config');
const { asyncHandler, ok, fail } = require('../utils/helpers');

// This whole router is mounted OUTSIDE the X-API-Key gate (see index.js) —
// it's what bootstraps that key in the first place. Setup is a one-time,
// single-admin flow: once any app_users row exists, /setup refuses to create
// another, so the public URL can't be used to self-register.

// A real (syntactically valid) bcrypt hash of a value nothing will ever type,
// so bcrypt.compare has something to hash against for a nonexistent username
// instead of throwing on a malformed string — keeps the timing (and code
// path) the same as a real user with a wrong password.
const DUMMY_HASH = bcrypt.hashSync('no-such-user-placeholder', 12);

// GET /api/auth/status — lets the web app decide "show setup" vs "show login"
// before it has any credentials at all.
router.get('/status', asyncHandler(async (req, res) => {
  const users = await db.list('app_users');
  ok(res, { hasUser: users.length > 0 });
}));

router.post('/setup', asyncHandler(async (req, res) => {
  const { name, username, password } = req.body || {};
  if (!name || !username || !password) return fail(res, 400, 'name, username and password are required');
  if (String(password).length < 8) return fail(res, 400, 'Password must be at least 8 characters');

  const existing = await db.list('app_users');
  if (existing.length > 0) return fail(res, 403, 'An account already exists — log in instead');

  const password_hash = await bcrypt.hash(password, 12);
  const user = await db.insert('app_users', { name, username: String(username).trim().toLowerCase(), password_hash });

  ok(res, { name: user.name, username: user.username, apiKey: config.claApiKey });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return fail(res, 400, 'username and password are required');

  const users = await db.list('app_users', { filters: { username: String(username).trim().toLowerCase() } });
  const user = users[0];
  // Compare against a real (if bogus) hash either way, so a nonexistent
  // username doesn't respond measurably faster than a wrong password.
  const match = await bcrypt.compare(password, user?.password_hash || DUMMY_HASH);
  if (!user || !match) return fail(res, 401, 'Wrong username or password');

  ok(res, { name: user.name, username: user.username, apiKey: config.claApiKey });
}));

module.exports = router;
