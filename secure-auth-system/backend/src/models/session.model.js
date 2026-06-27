// Raw SQL queries for the `sessions` table. This is what allows us to
// revoke a JWT before its natural expiry (logout, admin force-logout) and
// enforce a sliding session timeout.

const { pool } = require('../config/db');

async function create({ jti, userId, ipAddress, userAgent, expiresAt }) {
  await pool.execute(
    `INSERT INTO sessions (id, user_id, ip_address, user_agent, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [jti, userId, ipAddress, userAgent || null, expiresAt]
  );
}

async function findById(jti) {
  const [rows] = await pool.execute('SELECT * FROM sessions WHERE id = ?', [jti]);
  return rows[0] || null;
}

async function revoke(jti) {
  await pool.execute('UPDATE sessions SET is_revoked = TRUE WHERE id = ?', [jti]);
}

async function revokeAllForUser(userId) {
  await pool.execute('UPDATE sessions SET is_revoked = TRUE WHERE user_id = ?', [userId]);
}

async function countActiveForUser(userId) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS count FROM sessions
     WHERE user_id = ? AND is_revoked = FALSE AND expires_at > NOW()`,
    [userId]
  );
  return rows[0].count;
}

async function countAllActive() {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS count FROM sessions WHERE is_revoked = FALSE AND expires_at > NOW()`
  );
  return rows[0].count;
}

module.exports = {
  create,
  findById,
  revoke,
  revokeAllForUser,
  countActiveForUser,
  countAllActive,
};
