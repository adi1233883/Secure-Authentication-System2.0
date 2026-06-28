// backend/src/services/otp.service.js

const hashUtil = require("../utils/hash");
const { generateOtp } = require("../utils/otpGenerator");
const otpModel = require("../models/otp.model");
const userModel = require("../models/user.model");
const { sendEmail } = require("../config/mailer");
const env = require("../config/env");

async function issueOtp(userId, purpose) {
  console.log("====================================");
  console.log("OTP SERVICE START");
  console.log("User ID:", userId);
  console.log("Purpose:", purpose);
  console.log("====================================");

  const user = await userModel.findById(userId);

  if (!user) {
    throw Object.assign(new Error("User not found"), {
      statusCode: 404,
    });
  }

  console.log("User found:", user.email);

  // Remove previous active OTP
  await otpModel.invalidateActive(userId, purpose);

  // Generate OTP
  const plainOtp = generateOtp();
  console.log("Generated OTP:", plainOtp);

  const otpHash = await hashUtil.hash(plainOtp);

  const expiresAt = new Date(
    Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000
  );

  await otpModel.create({
    userId,
    otpHash,
    purpose,
    expiresAt,
  });

  console.log("OTP saved into database.");

  const subjects = {
    email_verification: "Verify your email - Secure Auth System",
    password_reset: "Password Reset Code",
    login_2fa: "Login Verification Code",
  };

  const body = `
Hello ${user.full_name},

Your verification code is:

${plainOtp}

This code expires in ${env.OTP_EXPIRY_MINUTES} minutes.

If you didn't request this email, simply ignore it.

Regards,
Secure Auth System
`;

  try {
    console.log("Sending email...");

    const result = await sendEmail({
      to: user.email,
      subject: subjects[purpose] || "Verification Code",
      text: body,
      html: `
        <h2>Secure Auth System</h2>
        <p>Hello ${user.full_name},</p>

        <p>Your verification code is:</p>

        <h1 style="letter-spacing:5px;">${plainOtp}</h1>

        <p>
        This code expires in
        ${env.OTP_EXPIRY_MINUTES} minutes.
        </p>

        <p>If you didn't request this email, ignore it.</p>
      `,
    });

    console.log("Email Result:", result);
  } catch (err) {
    console.error("EMAIL ERROR");
    console.error(err);

    throw err;
  }

  console.log("OTP SERVICE FINISHED");

  return {
    issued: true,
  };
}

async function verifyOtp(userId, purpose, submittedOtp) {
  console.log("Verifying OTP...");

  const record = await otpModel.findLatestActive(userId, purpose);

  if (!record) {
    return {
      valid: false,
      reason: "No active OTP found.",
    };
  }

  const matches = await hashUtil.compare(
    submittedOtp,
    record.otp_hash
  );

  if (!matches) {
    return {
      valid: false,
      reason: "Incorrect OTP.",
    };
  }

  await otpModel.markUsed(record.id);

  console.log("OTP verified successfully.");

  return {
    valid: true,
  };
}

module.exports = {
  issueOtp,
  verifyOtp,
};