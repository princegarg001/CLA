const logger = require('../utils/logger');

function notFoundHandler(req, res) {
  res.status(404).json({ ok: false, error: `Not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  logger.error(`${req.method} ${req.originalUrl} -> ${err.message}`, {
    stack: status >= 500 ? err.stack : undefined,
  });
  res.status(status).json({
    ok: false,
    error: err.message || 'Internal server error',
  });
}

module.exports = { notFoundHandler, errorHandler };
