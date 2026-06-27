// express-rate-limit configs. Separate, stricter limiters on sensitive
// auth-related routes specifically — a generic global limiter alone isn't
// tight enough to meaningfully slow down credential-stuffing or OTP brute-forcing.

const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per IP per window on the login route
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts from this IP. Please try again later.' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many registration attempts from this IP. Please try again later.' },
});

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // OTP space is only 1 million combos — must be tightly limited
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many OTP attempts. Please wait before trying again.' },
});

const otpResendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many OTP resend requests. Please wait before requesting another.' },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many password reset requests. Please try again later.' },
});

const aiChatLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20, // generous, but caps API spend if something loops
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many AI requests. Please slow down.' },
});

// A loose global limiter as a baseline safety net on top of the route-specific ones.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  loginLimiter,
  registerLimiter,
  otpLimiter,
  otpResendLimiter,
  forgotPasswordLimiter,
  aiChatLimiter,
  globalLimiter,
};
