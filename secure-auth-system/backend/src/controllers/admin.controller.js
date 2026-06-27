// Admin controller — all routes here are mounted behind authenticateJWT +
// authorizeRole('admin') in the routes file, so req.user.role === 'admin'
// is guaranteed by the time these handlers run.

const userModel = require('../models/user.model');
const loginLogModel = require('../models/loginLog.model');
const sessionModel = require('../models/session.model');
const alertModel = require('../models/alert.model');

async function listUsers(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const offset = parseInt(req.query.offset, 10) || 0;
    const status = req.query.status || null; // 'locked' | 'unverified' | null

    const users = await userModel.findAll({ limit, offset, status });
    const total = await userModel.countAll();
    res.json({ success: true, data: users, meta: { total, limit, offset } });
  } catch (err) {
    next(err);
  }
}

async function getUser(req, res, next) {
  try {
    const user = await userModel.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const recentLogins = await loginLogModel.findByUser(user.id, { limit: 10 });
    const { password_hash, ...safeUser } = user;
    res.json({ success: true, data: { ...safeUser, recentLogins } });
  } catch (err) {
    next(err);
  }
}

async function lockUser(req, res, next) {
  try {
    const lockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h manual lock
    await userModel.lockAccount(req.params.id, lockedUntil);
    await alertModel.create(req.params.id, 'account_locked', 'Your account was locked by an administrator.', 'high');
    res.json({ success: true, message: 'User account locked.' });
  } catch (err) {
    next(err);
  }
}

async function unlockUser(req, res, next) {
  try {
    await userModel.unlockAccount(req.params.id);
    res.json({ success: true, message: 'User account unlocked and failed-attempt counter reset.' });
  } catch (err) {
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    if (parseInt(req.params.id, 10) === req.user.id) {
      return res.status(400).json({ success: false, message: "You can't delete your own admin account." });
    }
    await userModel.deleteUser(req.params.id);
    res.json({ success: true, message: 'User deleted.' });
  } catch (err) {
    next(err);
  }
}

async function getLoginLogs(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const offset = parseInt(req.query.offset, 10) || 0;
    const { status, ip } = req.query;

    const logs = await loginLogModel.findAll({ limit, offset, status: status || null, ip: ip || null });
    res.json({ success: true, data: logs, meta: { limit, offset } });
  } catch (err) {
    next(err);
  }
}

async function getFailedAttempts(req, res, next) {
  try {
    const bruteForceIPs = await loginLogModel.findBruteForceIPs();
    const credentialStuffing = await loginLogModel.findCredentialStuffingAccounts();
    res.json({ success: true, data: { bruteForceIPs, credentialStuffing } });
  } catch (err) {
    next(err);
  }
}

async function getLockedAccounts(req, res, next) {
  try {
    const lockedUsers = await userModel.findAll({ limit: 200, status: 'locked' });
    res.json({ success: true, data: lockedUsers });
  } catch (err) {
    next(err);
  }
}

async function getAnalyticsSummary(req, res, next) {
  try {
    const [totalUsers, lockedAccounts, activeSessions, failedToday, successToday, alertCounts] = await Promise.all([
      userModel.countAll(),
      userModel.countLocked(),
      sessionModel.countAllActive(),
      loginLogModel.countToday('failed_password'),
      loginLogModel.countToday('success'),
      alertModel.countRecentBySeverity(24),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        lockedAccounts,
        activeSessions,
        failedLoginsToday: failedToday,
        successfulLoginsToday: successToday,
        alertsBySeverity: alertCounts,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getAnalyticsTrends(req, res, next) {
  try {
    const days = Math.min(parseInt(req.query.days, 10) || 7, 30);
    const trends = await loginLogModel.findDailyTrends(days);
    res.json({ success: true, data: trends });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listUsers,
  getUser,
  lockUser,
  unlockUser,
  deleteUser,
  getLoginLogs,
  getFailedAttempts,
  getLockedAccounts,
  getAnalyticsSummary,
  getAnalyticsTrends,
};
