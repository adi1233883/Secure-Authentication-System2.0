// Core authentication business logic. Controllers stay thin (HTTP-only
// concerns); all the actual decision-making lives here so it's independently
// testable and reusable.

const userModel = require('../models/user.model');
const sessionModel = require('../models/session.model');
const alertModel = require('../models/alert.model');
const hashUtil = require('../utils/hash');
const { signToken } = require('../utils/generateToken');
const otpService = require('./otp.service');
const securityService = require('./security.service');
const loginLoggerService = require('./loginLogger.service');
const { analyzePasswordStrength } = require('./passwordAnalyzer.service');
const env = require('../config/env');

function httpError(message, statusCode) {
  return Object.assign(new Error(message), { statusCode });
}

async function register({ fullName, email, password }) {
  const existing = await userModel.findByEmail(email);
  if (existing) {
    throw httpError('An account with this email already exists.', 409);
  }

  const { score } = analyzePasswordStrength(password);
  const passwordHash = await hashUtil.hash(password);
  const user = await userModel.create({ fullName, email, passwordHash, passwordScore: score });

  await otpService.issueOtp(user.id, 'email_verification');

  return { userId: user.id, email: user.email };
}

async function verifyRegistration(email, otp) {
  const user = await userModel.findByEmail(email);
  if (!user) throw httpError('No account found with this email.', 404);
  if (user.is_verified) return { alreadyVerified: true };

  const result = await otpService.verifyOtp(user.id, 'email_verification', otp);
  if (!result.valid) throw httpError(result.reason, 400);

  await userModel.setVerified(user.id, true);
  return { verified: true };
}

async function resendOtp(email, purpose) {
  const user = await userModel.findByEmail(email);
  if (!user) throw httpError('No account found with this email.', 404);
  if (purpose === 'email_verification' && user.is_verified) {
    throw httpError('This account is already verified.', 400);
  }
  await otpService.issueOtp(user.id, purpose);
  return { issued: true };
}

async function login({ email, password, ip, userAgent }) {
console.log("STEP 1 - findByEmail");
const user = await userModel.findByEmail(email);
console.log("DONE STEP 1");
  

  if (!user) {
    // Generic logging + generic error — never reveal whether the email exists.
    await loginLoggerService.logAttempt({ userId: null, email, ip, userAgent, status: 'failed_no_user' });
    throw httpError('Invalid email or password', 401);
  }

  console.log("STEP 2 - checkLockStatus");
const lockStatus = await securityService.checkLockStatus(user);
console.log("DONE STEP 2");
  if (lockStatus.locked) {
    await loginLoggerService.logAttempt({ userId: user.id, email, ip, userAgent, status: 'failed_locked' });
    throw httpError(
      `Account temporarily locked due to multiple failed attempts. Try again after ${new Date(lockStatus.lockedUntil).toLocaleTimeString()}.`,
      423
    );
  }

  if (!user.is_verified) {
    throw httpError('Please verify your email before logging in.', 403);
  }

  console.log("STEP 3 - bcrypt");
const passwordMatches = await hashUtil.compare(password, user.password_hash);
console.log("DONE STEP 3");
  if (!passwordMatches) {
    const failResult = await securityService.handleFailedLogin(user);
    await loginLoggerService.logAttempt({ userId: user.id, email, ip, userAgent, status: 'failed_password' });

    if (failResult.locked) {
      throw httpError(
        `Account locked due to ${failResult.failedAttempts} failed attempts. Try again in ${env.LOCKOUT_DURATION_MINUTES} minutes.`,
        423
      );
    }
    throw httpError(
      `Invalid email or password. ${failResult.remainingAttempts} attempt(s) remaining before lockout.`,
      401
    );
  }

  // Success path.
  console.log("STEP 4 - suspicious");
const suspiciousResult = await securityService.detectSuspiciousLogin(user, ip, userAgent);
console.log("DONE STEP 4");
  await loginLoggerService.logAttempt({
    userId: user.id, email, ip, userAgent,
    status: 'success', isSuspicious: suspiciousResult.suspicious,
  });
  console.log("STEP 5");
await securityService.handleSuccessfulLogin(user);
console.log("DONE STEP 5");
console.log("STEP 6");
await userModel.recordSuccessfulLogin(user.id, ip);
console.log("DONE STEP 6");
  console.log("STEP 7");
const { token, jti } = signToken(user);
console.log("DONE STEP 7");
  const expiresAt = new Date(Date.now() + env.SESSION_DURATION_MINUTES * 60 * 1000);
  console.log("STEP 8");
  await sessionModel.create({ jti, userId: user.id, ipAddress: ip, userAgent, expiresAt });
console.log("DONE STEP 8");
  return {
    token,
    user: { id: user.id, fullName: user.full_name, email: user.email, role: user.role },
  };
}

async function logout(jti) {
  await sessionModel.revoke(jti);
  return { loggedOut: true };
}

async function forgotPassword(email) {
  const user = await userModel.findByEmail(email);
  // Always respond the same way regardless of whether the account exists,
  // to avoid leaking account existence via response timing/content.
  if (user) {
    await otpService.issueOtp(user.id, 'password_reset');
  }
  return { requested: true };
}

async function resetPassword({ email, otp, newPassword }) {
  const user = await userModel.findByEmail(email);
  if (!user) throw httpError('Invalid request.', 400);

  const result = await otpService.verifyOtp(user.id, 'password_reset', otp);
  if (!result.valid) throw httpError(result.reason, 400);

  const { score } = analyzePasswordStrength(newPassword);
  const passwordHash = await hashUtil.hash(newPassword);
  await userModel.updatePasswordHash(user.id, passwordHash, score);
  await sessionModel.revokeAllForUser(user.id); // force re-login everywhere after a reset
  await alertModel.create(user.id, 'password_changed', 'Your password was reset successfully.', 'low');

  return { reset: true };
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = await userModel.findById(userId);
  if (!user) throw httpError('User not found', 404);

  const matches = await hashUtil.compare(currentPassword, user.password_hash);
  if (!matches) throw httpError('Current password is incorrect.', 401);

  const { score } = analyzePasswordStrength(newPassword);
  const passwordHash = await hashUtil.hash(newPassword);
  await userModel.updatePasswordHash(userId, passwordHash, score);
  await alertModel.create(userId, 'password_changed', 'Your password was changed successfully.', 'low');

  return { changed: true, newScore: score };
}

module.exports = {
  register,
  verifyRegistration,
  resendOtp,
  login,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
};
