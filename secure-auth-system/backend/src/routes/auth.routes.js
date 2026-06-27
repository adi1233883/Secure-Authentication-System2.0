const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const authenticateJWT = require('../middleware/authenticateJWT');
const {
  registerValidation,
  loginValidation,
  otpValidation,
  resendOtpValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} = require('../middleware/validateInput');
const {
  loginLimiter,
  registerLimiter,
  otpLimiter,
  otpResendLimiter,
  forgotPasswordLimiter,
} = require('../middleware/rateLimiter');

router.post('/register', registerLimiter, registerValidation, authController.register);
router.post('/verify-otp', otpLimiter, otpValidation, authController.verifyOtp);
router.post('/resend-otp', otpResendLimiter, resendOtpValidation, authController.resendOtp);
router.post('/login', loginLimiter, loginValidation, authController.login);
router.post('/logout', authenticateJWT, authController.logout);
router.post('/forgot-password', forgotPasswordLimiter, forgotPasswordValidation, authController.forgotPassword);
router.post('/reset-password', otpLimiter, resetPasswordValidation, authController.resetPassword);
router.get('/me', authenticateJWT, authController.me);

module.exports = router;
