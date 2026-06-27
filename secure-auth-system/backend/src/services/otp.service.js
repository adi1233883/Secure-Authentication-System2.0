// OTP business logic: generate a code, hash it before storing (same
// principle as password hashing — never store a verifiable secret in plaintext),
// email the plain code to the user, and verify submissions against the hash.

const hashUtil = require('../utils/hash');
const { generateOtp } = require('../utils/otpGenerator');
const otpModel = require('../models/otp.model');
const userModel = require('../models/user.model');
const { sendEmail } = require('../config/mailer');
const env = require('../config/env');

async function issueOtp(userId, purpose) {
  const user = await userModel.findById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  // Invalidate any previously active OTP of this purpose so only one valid
  // code exists at a time — narrows the brute-force window.
  await otpModel.invalidateActive(userId, purpose);

  const plainOtp = generateOtp();
  const otpHash = await hashUtil.hash(plainOtp);
  const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);

  await otpModel.create({ userId, otpHash, purpose, expiresAt });

  const subjectMap = {
    email_verification: 'Verify your email — Secure Auth System',
    password_reset: 'Password reset code — Secure Auth System',
    login_2fa: 'Your login verification code — Secure Auth System',
  };
  const messageMap = {
    email_verification: `Welcome, ${user.full_name}! Your email verification code is:`,
    password_reset: `Hi ${user.full_name}, your password reset code is:`,
    login_2fa: `Hi ${user.full_name}, your login verification code is:`,
  };

  await sendEmail({
    to: user.email,
    subject: subjectMap[purpose] || 'Your verification code',
    text: `${messageMap[purpose]}\n\n${plainOtp}\n\nThis code expires in ${env.OTP_EXPIRY_MINUTES} minutes. If you didn't request this, you can safely ignore this email.`,
    html: `<p>${messageMap[purpose]}</p><h2 style="letter-spacing:4px;">${plainOtp}</h2><p>This code expires in ${env.OTP_EXPIRY_MINUTES} minutes. If you didn't request this, you can safely ignore this email.</p>`,
  });

  return { issued: true };
}

async function verifyOtp(userId, purpose, submittedOtp) {
  const record = await otpModel.findLatestActive(userId, purpose);
  if (!record) {
    return { valid: false, reason: 'No active code found. Please request a new one.' };
  }

  const matches = await hashUtil.compare(submittedOtp, record.otp_hash);
  if (!matches) {
    return { valid: false, reason: 'Incorrect code.' };
  }

  await otpModel.markUsed(record.id);
  return { valid: true };
}

module.exports = { issueOtp, verifyOtp };
