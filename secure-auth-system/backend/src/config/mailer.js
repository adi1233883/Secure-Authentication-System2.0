// backend/src/config/mailer.js

const nodemailer = require("nodemailer");
const env = require("./env");

let transporter = null;

console.log("====================================");
console.log("SMTP USER:", env.SMTP_USER);
console.log("SMTP PASSWORD EXISTS:", !!env.SMTP_PASSWORD);
console.log("SMTP HOST:", env.SMTP_HOST);
console.log("SMTP PORT:", env.SMTP_PORT);
console.log("SMTP SECURE:", env.SMTP_SECURE);
console.log("EMAIL CONFIGURED:", env.isEmailConfigured);
console.log("====================================");

// Create transporter only if SMTP credentials exist
if (env.isEmailConfigured) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
    },
  });

  transporter.verify((error) => {
    if (error) {
      console.error("====================================");
      console.error("SMTP CONNECTION FAILED");
      console.error(error);
      console.error("====================================");
    } else {
      console.log("====================================");
      console.log("SMTP SERVER READY");
      console.log("Brevo SMTP connection successful.");
      console.log("====================================");
    }
  });
} else {
  console.warn(`
====================================
SMTP NOT CONFIGURED
Emails will NOT be sent.
====================================
`);
}

async function sendEmail({ to, subject, html, text }) {
  if (!transporter) {
    throw new Error("SMTP transporter is not configured.");
  }

  try {
    const info = await transporter.sendMail({
      from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`,
      to,
      subject,
      text,
      html,
    });

    console.log("====================================");
    console.log("EMAIL SENT SUCCESSFULLY");
    console.log("Message ID:", info.messageId);
    console.log("Accepted:", info.accepted);
    console.log("Rejected:", info.rejected);
    console.log("====================================");

    return {
      sent: true,
      messageId: info.messageId,
    };
  } catch (err) {
    console.error("====================================");
    console.error("EMAIL SEND FAILED");
    console.error(err);
    console.error("====================================");

    throw err;
  }
}

module.exports = {
  sendEmail,
};