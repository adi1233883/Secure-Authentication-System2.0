// One-time setup script: creates the first admin account using the
// ADMIN_FULL_NAME / ADMIN_EMAIL / ADMIN_PASSWORD values from .env.
// Run with: npm run create-admin
//
// This exists because there's no UI to "promote" a user to admin yet —
// you need at least one admin account to log into the admin dashboard
// in the first place.

const env = require('../config/env');
const { pool, testConnection } = require('../config/db');
const hashUtil = require('../utils/hash');
const { analyzePasswordStrength } = require('../services/passwordAnalyzer.service');

async function run() {
  await testConnection();

  const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [env.ADMIN_EMAIL]);
  if (existing.length > 0) {
    console.log(`An account with email ${env.ADMIN_EMAIL} already exists. Updating its role to 'admin' and verifying it.`);
    await pool.execute(
      'UPDATE users SET role = ?, is_verified = TRUE WHERE email = ?',
      ['admin', env.ADMIN_EMAIL]
    );
    console.log('Done. You can now log in with this account as an admin.');
    process.exit(0);
  }

  const { score } = analyzePasswordStrength(env.ADMIN_PASSWORD);
  const passwordHash = await hashUtil.hash(env.ADMIN_PASSWORD);

  await pool.execute(
    `INSERT INTO users (full_name, email, password_hash, role, is_verified, password_score)
     VALUES (?, ?, ?, 'admin', TRUE, ?)`,
    [env.ADMIN_FULL_NAME, env.ADMIN_EMAIL, passwordHash, score]
  );

  console.log('Admin account created successfully:');
  console.log(`  Email: ${env.ADMIN_EMAIL}`);
  console.log(`  Password: ${env.ADMIN_PASSWORD} (change this after first login)`);
  process.exit(0);
}

run().catch((err) => {
  console.error('Failed to create admin account:', err);
  process.exit(1);
});
