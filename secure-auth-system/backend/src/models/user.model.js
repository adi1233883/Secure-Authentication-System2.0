// All raw SQL queries for the `users` table live here. Controllers/services
// should never write SQL directly — they call these functions instead.
// This keeps SQL in one place, makes the rest of the app testable without
// a DB, and is exactly where parameterized queries are enforced.

const { pool } = require('../config/db');

async function create({ fullName, email, passwordHash, passwordScore = null }) {
  const [result] = await pool.execute(
    `INSERT INTO users (full_name, email, password_hash, password_score)
     VALUES (?, ?, ?, ?)`,
    [fullName, email, passwordHash, passwordScore]
  );
  return findById(result.insertId);
}

async function findByEmail(email) {
  const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
  return rows[0] || null;
}

async function setVerified(id, isVerified = true) {
  await pool.execute('UPDATE users SET is_verified = ? WHERE id = ?', [isVerified, id]);
}

async function updatePasswordHash(id, passwordHash, passwordScore = null) {
  await pool.execute(
    'UPDATE users SET password_hash = ?, password_score = ?, failed_attempts = 0, is_locked = FALSE, locked_until = NULL WHERE id = ?',
    [passwordHash, passwordScore, id]
  );
}

async function incrementFailedAttempts(id, newCount) {
  await pool.execute('UPDATE users SET failed_attempts = ? WHERE id = ?', [newCount, id]);
}

async function resetFailedAttempts(id) {
  await pool.execute(
    'UPDATE users SET failed_attempts = 0, is_locked = FALSE, locked_until = NULL WHERE id = ?',
    [id]
  );
}

async function lockAccount(id, lockedUntil) {
  await pool.execute(
    'UPDATE users SET is_locked = TRUE, locked_until = ? WHERE id = ?',
    [lockedUntil, id]
  );
}

async function unlockAccount(id) {
  await pool.execute(
    'UPDATE users SET is_locked = FALSE, locked_until = NULL, failed_attempts = 0 WHERE id = ?',
    [id]
  );
}

async function recordSuccessfulLogin(id, ip) {
  await pool.execute(
    'UPDATE users SET last_login_at = NOW(), last_login_ip = ? WHERE id = ?',
    [ip, id]
  );
}

async function updateProfile(id, { fullName, email }) {
  await pool.execute('UPDATE users SET full_name = ?, email = ? WHERE id = ?', [fullName, email, id]);
  return findById(id);
}

async function findAll({ limit = 50, offset = 0, status = null } = {}) {
  let query = 'SELECT id, full_name, email, role, is_verified, is_locked, failed_attempts, password_score, last_login_at, created_at FROM users';
  const params = [];

  if (status === 'locked') {
    query += ' WHERE is_locked = TRUE';
  } else if (status === 'unverified') {
    query += ' WHERE is_verified = FALSE';
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows] = await pool.execute(query, params);
  return rows;
}

async function countAll() {
  const [rows] = await pool.execute('SELECT COUNT(*) AS count FROM users');
  return rows[0].count;
}

async function countLocked() {
  const [rows] = await pool.execute('SELECT COUNT(*) AS count FROM users WHERE is_locked = TRUE');
  return rows[0].count;
}

async function deleteUser(id) {
  await pool.execute('DELETE FROM users WHERE id = ?', [id]);
}

module.exports = {
  create,
  findByEmail,
  findById,
  setVerified,
  updatePasswordHash,
  incrementFailedAttempts,
  resetFailedAttempts,
  lockAccount,
  unlockAccount,
  recordSuccessfulLogin,
  updateProfile,
  findAll,
  countAll,
  countLocked,
  deleteUser,
};
