// Raw SQL queries for the `security_alerts` table.

const { pool } = require('../config/db');

async function create(userId, alertType, message, severity = 'medium') {
  const [result] = await pool.execute(
    `INSERT INTO security_alerts (user_id, alert_type, message, severity)
     VALUES (?, ?, ?, ?)`,
    [userId, alertType, message, severity]
  );
  return result.insertId;
}

async function findByUser(userId, { limit = 20, unreadOnly = false } = {}) {
  let query = 'SELECT * FROM security_alerts WHERE user_id = ?';
  const params = [userId];

  if (unreadOnly) {
    query += ' AND is_read = FALSE';
  }
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  const [rows] = await pool.execute(query, params);
  return rows;
}

async function markRead(id, userId) {
  // userId included in WHERE clause so a user can't mark someone else's alert read
  await pool.execute(
    'UPDATE security_alerts SET is_read = TRUE WHERE id = ? AND user_id = ?',
    [id, userId]
  );
}

async function countRecentBySeverity(hours = 24) {
  const [rows] = await pool.execute(
    `SELECT severity, COUNT(*) AS count FROM security_alerts
     WHERE created_at > NOW() - INTERVAL ? HOUR
     GROUP BY severity`,
    [hours]
  );
  return rows;
}

module.exports = {
  create,
  findByUser,
  markRead,
  countRecentBySeverity,
};
