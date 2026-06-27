// Auth controller — handles HTTP request/response shape only. All real
// decision-making lives in auth.service.js. Every handler is wrapped to
// forward errors to the centralized error handler via next(err).

const authService = require('../services/auth.service');
const userModel = require('../models/user.model');

function getClientIp(req) {
  // Respect X-Forwarded-For if behind a reverse proxy (Nginx/Render/Railway),
  // otherwise fall back to the direct connection IP.
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress;
}

async function register(req, res, next) {
  try {
    const { fullName, email, password } = req.body;
    const result = await authService.register({ fullName, email, password });
    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email for a verification code.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function verifyOtp(req, res, next) {
  try {
    const { email, otp } = req.body;
    const result = await authService.verifyRegistration(email, otp);
    res.json({
      success: true,
      message: result.alreadyVerified ? 'Account already verified.' : 'Email verified successfully. You can now log in.',
    });
  } catch (err) {
    next(err);
  }
}

async function resendOtp(req, res, next) {
  try {
    const { email, purpose } = req.body;
    await authService.resendOtp(email, purpose);
    res.json({ success: true, message: 'A new verification code has been sent to your email.' });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'];

    const result = await authService.login({ email, password, ip, userAgent });
    res.json({ success: true, token: result.token, user: result.user });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    await authService.logout(req.user.jti);
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    await authService.forgotPassword(email);
    // Generic response regardless of whether the email exists, on purpose.
    res.json({ success: true, message: 'If an account exists for this email, a reset code has been sent.' });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { email, otp, newPassword } = req.body;
    await authService.resetPassword({ email, otp, newPassword });
    res.json({ success: true, message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({
      success: true,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        isVerified: !!user.is_verified,
        passwordScore: user.password_score,
        lastLoginAt: user.last_login_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, verifyOtp, resendOtp, login, logout, forgotPassword, resetPassword, me };
