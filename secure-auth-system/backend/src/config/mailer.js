// Nodemailer transport setup for sending OTP / alert emails.
// If SMTP isn't configured (no credentials in .env yet), we don't crash the
// app — we fall back to logging the email content to the console so OTP
// flows are still testable end-to-end during development.

const nodemailer = require('nodemailer');
const env = require('./env');

let transporter = null;

if (env.isEmailConfigured) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE, // true for port 465, false for 587/25
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
    },
  });
} else {
  console.warn(
    '[mailer] SMTP not configured — emails will be logged to console instead of sent. ' +
    'Add SMTP_HOST, SMTP_USER, SMTP_PASSWORD to your .env to send real emails.'
  );
}

/**
 * Sends an email, or logs it to console if SMTP isn't configured.
 * @param {{to: string, subject: string, html: string, text?: string}} options
 */
async function sendEmail({ to, subject, html, text }) {
  if (!transporter) {
    console.log('\n========== [DEV MODE] EMAIL NOT SENT (no SMTP configured) ==========');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${text || html}`);
    console.log('======================================================================\n');
    return { sent: false, devMode: true };
  }

  try {
    await transporter.sendMail({
      from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`,
      to,
      subject,
      html,
      text,
    });
    return { sent: true, devMode: false };
  } catch (err) {
    console.error('[mailer] Failed to send email:', err.message);
    // Still log it so the flow is testable even if SMTP creds are wrong.
    console.log(`[mailer] Email content (failed to send) — To: ${to}, Subject: ${subject}, Body: ${text || html}`);
    return { sent: false, devMode: false, error: err.message };
  }
}

module.exports = { sendEmail };
