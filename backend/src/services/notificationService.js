const config = require('../config');
const db = require('../db');
const logger = require('../utils/logger');

let app = null;
function getApp() {
  if (!app) {
    const admin = require('firebase-admin');
    const serviceAccount = JSON.parse(config.firebaseServiceAccountJson);
    app = admin.apps.length ? admin.app() : admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  return app;
}

async function registerToken(token, platform = 'android') {
  const existing = (await db.list('device_tokens', { filters: { token } }))[0];
  if (existing) return db.update('device_tokens', existing.id, { platform, updated_at: new Date().toISOString() });
  return db.insert('device_tokens', { token, platform });
}

// Sends to every registered device (a solo-founder tool, but "every device
// this founder carries" — phone + tablet, say — not just one fixed token).
// Degrades to a log line when Firebase isn't configured or there are no
// registered devices yet, same convention as every other service here.
async function sendPush({ title, body, data = {} }) {
  const tokens = (await db.list('device_tokens')).map((t) => t.token);
  if (!tokens.length) {
    logger.info(`notificationService: no registered devices — would have sent "${title}"`);
    return { sent: 0, sample: true };
  }
  if (!config.isConfigured('firebase')) {
    logger.info(`notificationService: Firebase not configured — would have sent "${title}" to ${tokens.length} device(s)`);
    return { sent: 0, sample: true };
  }

  try {
    const admin = require('firebase-admin');
    getApp();
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])), // FCM data payload values must be strings
    });

    // Clean up tokens FCM reports as no-longer-valid (uninstalled app, etc.)
    // so future sends don't keep failing against them.
    const deadTokens = response.responses
      .map((r, i) => (!r.success && ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(r.error?.code) ? tokens[i] : null))
      .filter(Boolean);
    if (deadTokens.length) {
      const rows = await db.list('device_tokens');
      await Promise.all(rows.filter((r) => deadTokens.includes(r.token)).map((r) => db.remove('device_tokens', r.id)));
    }

    logger.info(`notificationService: sent "${title}" to ${response.successCount}/${tokens.length} device(s)`);
    return { sent: response.successCount, failed: response.failureCount };
  } catch (e) {
    logger.error('notificationService.sendPush failed', { error: e.message });
    return { sent: 0, error: e.message };
  }
}

module.exports = { registerToken, sendPush };
