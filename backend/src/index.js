const express = require('express');
const cors = require('cors');
const config = require('./config');
const logger = require('./utils/logger');
const apiKeyAuth = require('./middleware/apiKeyAuth');
const { apiLimiter } = require('./middleware/rateLimiter');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const scheduler = require('./cron/scheduler');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => res.json({ ok: true, service: 'cla-v2-backend', env: config.nodeEnv }));
app.get('/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

// Webhooks carry their own per-provider secret checks and must stay reachable
// without the app's own X-API-Key (external services can't send it).
app.use('/api/webhooks', apiLimiter, require('./routes/webhooks'));

// OAuth callbacks (LinkedIn/Instagram redirect the user's browser here
// directly) — same reasoning as webhooks, must stay reachable unauthenticated.
app.use('/api/oauth', apiLimiter, require('./routes/oauthCallbacks'));

// Everything else requires X-API-Key when CLA_API_KEY is set.
const api = express.Router();
api.use(apiKeyAuth, apiLimiter);
api.use('/leads', require('./routes/leads'));
api.use('/apollo', require('./routes/apollo'));
api.use('/umami', require('./routes/umami'));
api.use('/sentry', require('./routes/sentry'));
api.use('/twitter', require('./routes/twitter'));
api.use('/gumroad', require('./routes/gumroad'));
api.use('/freelance', require('./routes/freelance'));
api.use('/revenue', require('./routes/revenue'));
api.use('/agents', require('./routes/agents'));
api.use('/outreach', require('./routes/outreach'));
api.use('/settings', require('./routes/settings'));
api.use('/warroom', require('./routes/warRoom'));
api.use('/intelligence', require('./routes/intelligence'));
api.use('/social', require('./routes/social'));
app.use('/api', api);

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(config.port, () => {
  logger.info(`CLA backend listening on port ${config.port}`);
  scheduler.start();
});

function shutdown(signal) {
  logger.info(`${signal} received — shutting down gracefully`);
  scheduler.stop();
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason: reason?.message || reason });
});
