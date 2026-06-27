// Verifies the JWT on protected routes AND checks the `sessions` table to
// make sure the session hasn't been revoked (logout) or server-side expired.
// This hybrid approach is what makes "logout" and "session timeout" actually
// work — a bare JWT verification alone can't be revoked early.

const { verifyToken } = require('../utils/generateToken');
const sessionModel = require('../models/session.model');
const userModel = require('../models/user.model');

async function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }

  try {
    const session = await sessionModel.findById(payload.jti);

    if (!session || session.is_revoked || new Date() > new Date(session.expires_at)) {
      return res.status(401).json({ success: false, message: 'Session expired or invalid. Please log in again.' });
    }

    const user = await userModel.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists' });
    }
    if (user.is_locked) {
      return res.status(423).json({ success: false, message: 'Account is locked' });
    }

    // Attach a clean user context to the request for downstream handlers.
    req.user = { id: user.id, role: user.role, email: user.email, fullName: user.full_name, jti: payload.jti };
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = authenticateJWT;
