// Core security logic: account lockout on repeated failures, brute-force /
// credential-stuffing pattern detection, and new-device/new-location
// suspicious login detection. This is the heart of the "security monitoring"
// part of the project — deterministic rules, not AI guesswork (the AI layer
// only explains what these rules already found).

const userModel = require('../models/user.model');
const loginLogModel = require('../models/loginLog.model');
const alertModel = require('../models/alert.model');
const env = require('../config/env');

/**
 * Call this when a login attempt fails due to wrong password.
 * Increments the counter and locks the account if the threshold is hit.
 */
async function handleFailedLogin(user) {
  const newCount = (user.failed_attempts || 0) + 1;

  if (newCount >= env.MAX_FAILED_ATTEMPTS) {
    const lockedUntil = new Date(Date.now() + env.LOCKOUT_DURATION_MINUTES * 60 * 1000);
    await userModel.lockAccount(user.id, lockedUntil);
    await alertModel.create(
      user.id,
      'account_locked',
      `Your account was locked after ${newCount} failed login attempts. It will automatically unlock at ${lockedUntil.toLocaleString()}.`,
      'high'
    );
    return { locked: true, lockedUntil, failedAttempts: newCount };
  }

  await userModel.incrementFailedAttempts(user.id, newCount);
  return { locked: false, failedAttempts: newCount, remainingAttempts: env.MAX_FAILED_ATTEMPTS - newCount };
}

/**
 * Checks whether a user's account is currently locked. If the lock has
 * naturally expired, auto-unlocks it and returns false so login can proceed.
 */
async function checkLockStatus(user) {
  if (!user.is_locked) return { locked: false };

  if (user.locked_until && new Date() > new Date(user.locked_until)) {
    await userModel.unlockAccount(user.id);
    return { locked: false, autoUnlocked: true };
  }

  return { locked: true, lockedUntil: user.locked_until };
}

/**
 * Resets the failed-attempt counter after a successful login.
 */
async function handleSuccessfulLogin(user) {
  await userModel.resetFailedAttempts(user.id);
}

/**
 * New-device / new-location detection: compares this login's IP+user-agent
 * against the user's prior successful logins. If neither has been seen
 * before in the lookback window, flags this login as suspicious and creates
 * an alert. This is intentionally simple (no external geo-IP dependency)
 * but follows the same principle production systems use.
 */
async function detectSuspiciousLogin(user, ip, userAgent) {
  const seenBefore = await loginLogModel.hasPriorSuccessfulLogin(user.id, ip, userAgent);
  if (seenBefore) return { suspicious: false };

  // First-ever login for a brand-new account isn't suspicious — it's just new.
  const priorLoginCount = await loginLogModel.findByUser(user.id, { limit: 1 });
  const isFirstLoginEver = priorLoginCount.length === 0;
  if (isFirstLoginEver) return { suspicious: false };

  await alertModel.create(
    user.id,
    'new_device_login',
    `A login to your account was detected from a new device or location (IP: ${ip}). If this wasn't you, please change your password immediately.`,
    'medium'
  );

  return { suspicious: true };
}

/**
 * Runs the deterministic brute-force / credential-stuffing detection
 * queries. Returns structured findings — this is exactly what gets handed
 * to the AI layer to summarize in plain English (see ai.service.js).
 */
async function detectAttackPatterns() {
  const [bruteForceIPs, credentialStuffingAccounts, suspiciousLogins] = await Promise.all([
    loginLogModel.findBruteForceIPs({ windowMinutes: 10, minAttempts: 10, minAccounts: 3 }),
    loginLogModel.findCredentialStuffingAccounts({ windowMinutes: 10, minIps: 5 }),
    loginLogModel.findSuspicious({ hours: 24, limit: 20 }),
  ]);

  return { bruteForceIPs, credentialStuffingAccounts, suspiciousLogins };
}

module.exports = {
  handleFailedLogin,
  checkLockStatus,
  handleSuccessfulLogin,
  detectSuspiciousLogin,
  detectAttackPatterns,
};
