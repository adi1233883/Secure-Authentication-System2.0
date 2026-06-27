// Centralized environment variable loader.
// Importing this file (instead of calling process.env directly everywhere)
// means every other file gets validated, typed values, and one place to
// see the full configuration surface of the app.

require('dotenv').config();

function required(name, fallback = undefined) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const env = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5500',

  DB_HOST: required('DB_HOST', 'localhost'),
  DB_PORT: parseInt(process.env.DB_PORT || '3306', 10),
  DB_USER: required('DB_USER', 'root'),
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_NAME: required('DB_NAME', 'secure_auth_system'),

  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '30m',

  MAX_FAILED_ATTEMPTS: parseInt(process.env.MAX_FAILED_ATTEMPTS || '5', 10),
  LOCKOUT_DURATION_MINUTES: parseInt(process.env.LOCKOUT_DURATION_MINUTES || '15', 10),
  SESSION_DURATION_MINUTES: parseInt(process.env.SESSION_DURATION_MINUTES || '30', 10),
  OTP_EXPIRY_MINUTES: parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10),

  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASSWORD: process.env.SMTP_PASSWORD || '',
  SMTP_FROM_NAME: process.env.SMTP_FROM_NAME || 'Secure Auth System',
  SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL || 'no-reply@secureauth.com',

  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',

  ADMIN_FULL_NAME: process.env.ADMIN_FULL_NAME || 'System Admin',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@example.com',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'ChangeMe123!',
};

env.isProduction = env.NODE_ENV === 'production';
env.isEmailConfigured = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD);
env.isAiConfigured = Boolean(env.GEMINI_API_KEY);

module.exports = env;
