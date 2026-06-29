// Centralized environment variable loader.

require("dotenv").config();

function required(name, fallback = undefined) {
  const value = process.env[name] ?? fallback;

  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

const env = {
  // Server
  PORT: parseInt(process.env.PORT || "3000", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5500",

  // Database
  DB_HOST: required("DB_HOST"),
  DB_PORT: parseInt(process.env.DB_PORT || "3306", 10),
  DB_USER: required("DB_USER"),
  DB_PASSWORD: required("DB_PASSWORD"),
  DB_NAME: required("DB_NAME"),

  // JWT
  JWT_SECRET: required("JWT_SECRET"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "30m",

  // Security
  MAX_FAILED_ATTEMPTS: parseInt(
    process.env.MAX_FAILED_ATTEMPTS || "5",
    10
  ),

  LOCKOUT_DURATION_MINUTES: parseInt(
    process.env.LOCKOUT_DURATION_MINUTES || "15",
    10
  ),

  SESSION_DURATION_MINUTES: parseInt(
    process.env.SESSION_DURATION_MINUTES || "30",
    10
  ),

  OTP_EXPIRY_MINUTES: parseInt(
    process.env.OTP_EXPIRY_MINUTES || "10",
    10
  ),

  // Resend
  RESEND_API_KEY: required("RESEND_API_KEY"),

  EMAIL_FROM: process.env.EMAIL_FROM || "Secure Auth <onboarding@resend.dev>",

  // Gemini
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",

  // Admin
  ADMIN_FULL_NAME:
    process.env.ADMIN_FULL_NAME || "System Admin",

  ADMIN_EMAIL:
    process.env.ADMIN_EMAIL || "admin@example.com",

  ADMIN_PASSWORD:
    process.env.ADMIN_PASSWORD || "ChangeMe123!",
};

env.isProduction = env.NODE_ENV === "production";

env.isEmailConfigured = Boolean(env.RESEND_API_KEY);

env.isAiConfigured = Boolean(env.GEMINI_API_KEY);

module.exports = env;