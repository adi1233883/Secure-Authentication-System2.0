// Raw SQL queries for the `ai_analysis_cache` table — avoids re-calling the
// AI API on every single admin dashboard page load. Analysis is cached and
// only re-run on demand (button click) or on a schedule.

const { pool } = require('../config/db');

async function save(summary, findings) {
  const [result] = await pool.execute(
    'INSERT INTO ai_analysis_cache (summary, findings) VALUES (?, ?)',
    [summary, JSON.stringify(findings)]
  );
  return result.insertId;
}

async function getLatest() {
  const [rows] = await pool.execute(
    'SELECT * FROM ai_analysis_cache ORDER BY created_at DESC LIMIT 1'
  );
  if (!rows[0]) return null;
  return { ...rows[0], findings: typeof rows[0].findings === 'string' ? JSON.parse(rows[0].findings) : rows[0].findings };
}

module.exports = { save, getLatest };
