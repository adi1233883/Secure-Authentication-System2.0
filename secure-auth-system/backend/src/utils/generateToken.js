// JWT helper: signs tokens with a unique session id (jti) so each token maps
// to a row in the `sessions` table. This is what lets us revoke a session on
// logout even though JWTs are normally "stateless" / can't be invalidated early.

const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const env = require('../config/env');

function signToken(user) {
  const jti = uuidv4();
  const token = jwt.sign(
    { sub: user.id, role: user.role, jti },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
  return { token, jti };
}

function verifyToken(token) {
  // Throws if invalid/expired — caller should catch.
  return jwt.verify(token, env.JWT_SECRET);
}

module.exports = { signToken, verifyToken };
