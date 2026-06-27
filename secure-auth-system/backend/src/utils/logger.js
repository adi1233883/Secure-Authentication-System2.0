// Lightweight app-level logger. This is for server/application logs
// (startup, errors, debug info) — NOT to be confused with the `login_logs`
// database table, which is the security audit trail for login attempts.
//
// Kept dependency-free (no Winston) to keep the project simple; swap this
// out for Winston/Pino in production if you want file rotation, log levels
// shipped to a log aggregator, etc. (see "Future Scope" in the blueprint).

const env = require('../config/env');

function timestamp() {
  return new Date().toISOString();
}

const logger = {
  info: (...args) => console.log(`[${timestamp()}] [INFO]`, ...args),
  warn: (...args) => console.warn(`[${timestamp()}] [WARN]`, ...args),
  error: (...args) => console.error(`[${timestamp()}] [ERROR]`, ...args),
  debug: (...args) => {
    if (!env.isProduction) console.debug(`[${timestamp()}] [DEBUG]`, ...args);
  },
};

module.exports = logger;
