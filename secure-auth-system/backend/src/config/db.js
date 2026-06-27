const mysql = require('mysql2/promise');
const env = require('./env');

const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,

  ssl: {
    rejectUnauthorized: true
  },

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: false,
});

async function testConnection() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();

    console.log(
      `[db] Connected to MySQL database "${env.DB_NAME}" at ${env.DB_HOST}:${env.DB_PORT}`
    );
  } catch (err) {
    console.error('[db] Failed to connect to MySQL:', err.message);
    process.exit(1);
  }
}

module.exports = {
  pool,
  testConnection,
};