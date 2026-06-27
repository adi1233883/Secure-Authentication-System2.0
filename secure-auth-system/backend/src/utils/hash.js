// Thin wrapper around bcrypt so the rest of the app doesn't import bcrypt
// directly everywhere, and so the salt rounds constant lives in one place.

const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12;

async function hash(plainText) {
  return bcrypt.hash(plainText, SALT_ROUNDS);
}

async function compare(plainText, hashed) {
  return bcrypt.compare(plainText, hashed);
}

module.exports = { hash, compare };
