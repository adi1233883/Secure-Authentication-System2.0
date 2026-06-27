// Express app setup — wires together security middleware, routes, and
// error handling. server.js imports this and starts listening.

const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const securityHeaders = require('./middleware/securityHeaders');
const { globalLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const adminRoutes = require('./routes/admin.routes');
const aiRoutes = require('./routes/ai.routes');
const reportRoutes = require('./routes/report.routes');

const app = express();

// --- Core security middleware (applied globally, before routes) ---
app.use(securityHeaders);
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '10kb' })); // small limit — auth payloads are tiny, blocks oversized body attacks
app.use(globalLimiter);

// Lightweight request logging in development.
if (!env.isProduction) {
  app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.originalUrl}`);
    next();
  });
}

// --- Health check (useful for deployment platforms + quick sanity testing) ---
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Secure Authentication System API is running', timestamp: new Date().toISOString() });
});

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/reports', reportRoutes);

// --- 404 + centralized error handling (must be registered last) ---
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
