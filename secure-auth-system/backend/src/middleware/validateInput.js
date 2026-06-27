// express-validator rule sets for every route that accepts input, plus a
// shared handler that turns validation errors into a consistent JSON shape.
// Combined with parameterized queries (see models/*), this is the app's
// defense against SQL injection and XSS via stored input.

const { body, validationResult } = require('express-validator');

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

const registerValidation = [
  body('fullName').trim().isLength({ min: 2, max: 100 }).withMessage('Full name must be 2-100 characters').escape(),
  body('email').trim().isEmail().withMessage('Must be a valid email address').normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
  handleValidationErrors,
];

const loginValidation = [
  body('email').trim().isEmail().withMessage('Must be a valid email address').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors,
];

const otpValidation = [
  body('email').trim().isEmail().normalizeEmail(),
  body('otp').trim().isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be a 6-digit code'),
  handleValidationErrors,
];

const resendOtpValidation = [
  body('email').trim().isEmail().normalizeEmail(),
  body('purpose').isIn(['email_verification', 'password_reset']).withMessage('Invalid OTP purpose'),
  handleValidationErrors,
];

const forgotPasswordValidation = [
  body('email').trim().isEmail().normalizeEmail(),
  handleValidationErrors,
];

const resetPasswordValidation = [
  body('email').trim().isEmail().normalizeEmail(),
  body('otp').trim().isLength({ min: 6, max: 6 }).isNumeric(),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
  handleValidationErrors,
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
  handleValidationErrors,
];

const updateProfileValidation = [
  body('fullName').trim().isLength({ min: 2, max: 100 }).escape(),
  body('email').trim().isEmail().normalizeEmail(),
  handleValidationErrors,
];

const chatMessageValidation = [
  body('message').trim().isLength({ min: 1, max: 1000 }).withMessage('Message must be 1-1000 characters'),
  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  registerValidation,
  loginValidation,
  otpValidation,
  resendOtpValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
  updateProfileValidation,
  chatMessageValidation,
};
