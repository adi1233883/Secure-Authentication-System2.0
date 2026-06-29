// Raw SQL queries for the `login_logs` table — the security audit trail.
// This table is append-only by design (see schema notes); no update/delete
// functions are exposed here on purpose.

const { pool } = require('../config/db');

async function record({
  userId,
  emailAttempted,
  ipAddress,
  userAgent,
  status,
  isSuspicious = false,
}) {
  const [result] = await pool.execute(
    `INSERT INTO login_logs
      (user_id, email_attempted, ip_address, user_agent, status, is_suspicious)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      userId,
      emailAttempted,
      ipAddress,
      userAgent || null,
      status,
      isSuspicious,
    ]
  );

  return result.insertId;
}

async function findByUser(userId) {
  const [rows] = await pool.execute(
    `SELECT *
     FROM login_logs
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );

  return rows;
}

// Has this user successfully logged in from this IP + User-Agent before?
async function hasPriorSuccessfulLogin(
  userId,
  ipAddress,
  userAgent,
  lookbackDays = 30
) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS count
     FROM login_logs
     WHERE user_id = ?
       AND status = 'success'
       AND ip_address = ?
       AND user_agent = ?
       AND created_at > NOW() - INTERVAL ? DAY`,
    [
      userId,
      ipAddress,
      userAgent || '',
      lookbackDays,
    ]
  );

  return rows[0].count > 0;
}

async function findAll({
  limit = 50,
  offset = 0,
  status = null,
  ip = null,
} = {}) {
  let query = `
    SELECT *
    FROM login_logs
    WHERE 1=1
  `;

  const params = [];

  if (status) {
    query += ` AND status = ?`;
    params.push(status);
  }

  if (ip) {
    query += ` AND ip_address = ?`;
    params.push(ip);
  }

  query += ` ORDER BY created_at DESC LIMIT ?, ?`;
  params.push(Number(offset), Number(limit));

  const [rows] = await pool.execute(query, params);

  return rows;
}

async function countToday(status = null) {
  let query = `
    SELECT COUNT(*) AS count
    FROM login_logs
    WHERE created_at >= CURDATE()
  `;

  const params = [];

  if (status) {
    query += ` AND status = ?`;
    params.push(status);
  }

  const [rows] = await pool.execute(query, params);

  return rows[0].count;
}

async function findBruteForceIPs({
  windowMinutes = 10,
  minAttempts = 10,
  minAccounts = 3,
} = {}) {
  const [rows] = await pool.execute(
    `SELECT
        ip_address,
        COUNT(*) AS attempts,
        COUNT(DISTINCT email_attempted) AS distinct_accounts,
        MAX(created_at) AS last_attempt
     FROM login_logs
     WHERE status != 'success'
       AND created_at > NOW() - INTERVAL ? MINUTE
     GROUP BY ip_address
     HAVING attempts >= ?
        AND distinct_accounts >= ?
     ORDER BY attempts DESC`,
    [windowMinutes, minAttempts, minAccounts]
  );

  return rows;
}

async function findCredentialStuffingAccounts({
  windowMinutes = 10,
  minIps = 5,
} = {}) {
  const [rows] = await pool.execute(
    `SELECT
        email_attempted,
        COUNT(DISTINCT ip_address) AS distinct_ips,
        COUNT(*) AS attempts,
        MAX(created_at) AS last_attempt
     FROM login_logs
     WHERE status != 'success'
       AND created_at > NOW() - INTERVAL ? MINUTE
     GROUP BY email_attempted
     HAVING distinct_ips >= ?
     ORDER BY distinct_ips DESC`,
    [windowMinutes, minIps]
  );

  return rows;
}

async function findSuspicious({
  hours = 24,
  limit = 50,
} = {}) {
  const [rows] = await pool.execute(
    `SELECT *
     FROM login_logs
     WHERE is_suspicious = TRUE
       AND created_at > NOW() - INTERVAL ? HOUR
     ORDER BY created_at DESC
     LIMIT ?`,
    [hours, Number(limit)]
  );

  return rows;
}

async function findDailyTrends(days = 7) {
  const [rows] = await pool.execute(
    `SELECT
        DATE(created_at) AS day,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS successes,
        SUM(CASE WHEN status != 'success' THEN 1 ELSE 0 END) AS failures
     FROM login_logs
     WHERE created_at > NOW() - INTERVAL ? DAY
     GROUP BY DATE(created_at)
     ORDER BY day ASC`,
    [days]
  );

  return rows;
}

module.exports = {
  record,
  findByUser,
  hasPriorSuccessfulLogin,
  findAll,
  countToday,
  findBruteForceIPs,
  findCredentialStuffingAccounts,
  findSuspicious,
  findDailyTrends,
};