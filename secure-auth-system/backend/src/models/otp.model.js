// Raw SQL queries for the `otp_codes` table.

const { pool } = require('../config/db');

async function create({ userId, otpHash, purpose, expiresAt }) {
  const [result] = await pool.execute(
    `INSERT INTO otp_codes (user_id, otp_hash, purpose, expires_at)
     VALUES (?, ?, ?, ?)`,
    [userId, otpHash, purpose, expiresAt]
  );
  return result.insertId;
}

// Get the most recent, unused, non-expired OTP for a user+purpose.
async function findLatestActive(userId, purpose) {
  const [rows] = await pool.execute(
    `SELECT * FROM otp_codes
     WHERE user_id = ? AND purpose = ? AND is_used = FALSE AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [userId, purpose]
  );
  return rows[0] || null;
}

async function markUsed(id) {
  await pool.execute('UPDATE otp_codes SET is_used = TRUE WHERE id = ?', [id]);
}

// Invalidate any previously-issued, still-active OTPs of this purpose for a
// user before issuing a new one — prevents multiple valid codes existing
// at once (which would widen the brute-force attack surface).
async function invalidateActive(userId, purpose) {
  await pool.execute(
    `UPDATE otp_codes SET is_used = TRUE
     WHERE user_id = ? AND purpose = ? AND is_used = FALSE`,
    [userId, purpose]
  );
}

// Count verification attempts in a recent window (we track this via a
// separate counter table-free approach: count rows created in the window,
// which works because we invalidate + recreate on each "resend").
// For attempt-rate-limiting we instead rely on express-rate-limit at the
// route level (see middleware/rateLimiter.js) — kept here as a hook in case
// per-account OTP attempt counting is added later.

module.exports = {
  create,
  findLatestActive,
  markUsed,
  invalidateActive,
};
