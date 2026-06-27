// Generates random 6-digit numeric OTP codes for email verification,
// password reset, and (optionally) login 2FA.

function generateOtp() {
  // 100000-999999 inclusive: always exactly 6 digits, never starts with 0
  // dropping a digit (which would happen if we allowed 000000-099999 and
  // displayed it as a 5-digit number).
  return String(Math.floor(100000 + Math.random() * 900000));
}

module.exports = { generateOtp };
