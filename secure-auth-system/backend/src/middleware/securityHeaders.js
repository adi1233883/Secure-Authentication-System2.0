// Helmet security headers configuration — sets HSTS, X-Frame-Options,
// X-Content-Type-Options, and a Content-Security-Policy appropriate for an
// API server that also serves a small set of pages during local dev.

const helmet = require('helmet');

const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com', 'https://cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
    },
  },
  // Cross-origin embedding policy can break some CDN assets in dev; relax slightly.
  crossOriginEmbedderPolicy: false,
});

module.exports = securityHeaders;
