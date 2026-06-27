// MySQL connection pool.
// A pool (rather than one long-lived connection) lets multiple requests
// run concurrent queries safely and automatically reconnects dropped connections.

const mysql = require('mysql2/promise');
const env = require('./env');

const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: false,
});

// Quick startup check so failures are obvious immediately instead of on
// the first request a user happens to make.
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log(`[db] Connected to MySQL database "${env.DB_NAME}" at ${env.DB_HOST}:${env.DB_PORT}`);
  } catch (err) {
    console.error('[db] Failed to connect to MySQL:', err.message);
    console.error('[db] Check DB_HOST, DB_USER, DB_PASSWORD, DB_NAME in your .env file, and that schema.sql has been run.');
    process.exit(1);
  }
}

module.exports = { pool, testConnection };
