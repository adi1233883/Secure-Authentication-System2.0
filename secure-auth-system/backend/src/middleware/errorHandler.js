// Centralized error handler — must be registered LAST in app.js (after all
// routes). Ensures unexpected errors never leak stack traces or internal
// details to the client in production, while still logging full detail
// server-side for debugging.

const env = require('../config/env');
const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error(`${req.method} ${req.originalUrl} —`, err.stack || err.message);

  const statusCode = err.statusCode || 500;
  const response = {
    success: false,
    message: statusCode === 500 ? 'An unexpected error occurred. Please try again.' : err.message,
  };

  if (!env.isProduction && statusCode === 500) {
    response.debug = err.message;
  }

  res.status(statusCode).json(response);
}

// 404 handler for unmatched routes — registered just before errorHandler.
function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

module.exports = { errorHandler, notFoundHandler };
