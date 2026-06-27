// User controller — authenticated user's own data: dashboard summary,
// login history, security alerts, profile updates, password change.

const userModel = require('../models/user.model');
const loginLogModel = require('../models/loginLog.model');
const alertModel = require('../models/alert.model');
const authService = require('../services/auth.service');
const { analyzePasswordStrength } = require('../services/passwordAnalyzer.service');

async function getDashboard(req, res, next) {
  try {
    const user = await userModel.findById(req.user.id);
    const recentLogins = await loginLogModel.findByUser(req.user.id, { limit: 5 });
    const alerts = await alertModel.findByUser(req.user.id, { limit: 5 });

    res.json({
      success: true,
      data: {
        account: {
          fullName: user.full_name,
          email: user.email,
          role: user.role,
          isVerified: !!user.is_verified,
          memberSince: user.created_at,
          lastLoginAt: user.last_login_at,
          lastLoginIp: user.last_login_ip,
        },
        passwordScore: user.password_score,
        recentLogins,
        alerts,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getLoginHistory(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const offset = parseInt(req.query.offset, 10) || 0;
    const history = await loginLogModel.findByUser(req.user.id, { limit, offset });
    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
}

async function getSecurityAlerts(req, res, next) {
  try {
    const unreadOnly = req.query.unread === 'true';
    const alerts = await alertModel.findByUser(req.user.id, { limit: 50, unreadOnly });
    res.json({ success: true, data: alerts });
  } catch (err) {
    next(err);
  }
}

async function markAlertRead(req, res, next) {
  try {
    await alertModel.markRead(req.params.id, req.user.id);
    res.json({ success: true, message: 'Alert marked as read.' });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { fullName, email } = req.body;
    const updated = await userModel.updateProfile(req.user.id, { fullName, email });
    res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: { fullName: updated.full_name, email: updated.email },
    });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
    res.json({ success: true, message: 'Password changed successfully.', data: { newScore: result.newScore } });
  } catch (err) {
    next(err);
  }
}

async function getPasswordScore(req, res, next) {
  try {
    const user = await userModel.findById(req.user.id);
    const label = user.password_score >= 80 ? 'Excellent' : user.password_score >= 60 ? 'Strong' : user.password_score >= 40 ? 'Fair' : 'Weak';
    res.json({ success: true, data: { score: user.password_score, label } });
  } catch (err) {
    next(err);
  }
}

// Utility endpoint: live strength check while typing on the frontend
// (no auth required for this one specifically — used on the register page
// before an account exists; mounted separately, see routes file).
async function checkPasswordStrength(req, res) {
  const { password } = req.body;
  const result = analyzePasswordStrength(password || '');
  res.json({ success: true, data: result });
}

module.exports = {
  getDashboard,
  getLoginHistory,
  getSecurityAlerts,
  markAlertRead,
  updateProfile,
  changePassword,
  getPasswordScore,
  checkPasswordStrength,
};
