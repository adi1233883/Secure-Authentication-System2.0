// Entry point — starts the HTTP server after confirming the database is reachable.

const app = require('./src/app');
const env = require('./src/config/env');
const { testConnection } = require('./src/config/db');
const logger = require('./src/utils/logger');

async function start() {
  await testConnection();

  app.listen(env.PORT, () => {
    logger.info(`Secure Authentication System API listening on port ${env.PORT} (${env.NODE_ENV})`);
    logger.info(`Health check: http://localhost:${env.PORT}/api/health`);
    if (!env.isEmailConfigured) {
      logger.warn('SMTP not configured — OTP emails will be logged to console instead of sent. See .env.example.');
    }
    if (!env.isAiConfigured) {
      logger.warn('GEMINI_API_KEY not set — AI features will return fallback responses. See .env.example.');
    }
  });
}

start();
