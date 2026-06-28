// backend/src/config/mailer.js

const nodemailer = require("nodemailer");
const env = require("./env");

let transporter = null;
console.log("SMTP USER:", env.SMTP_USER);
console.log("SMTP PASSWORD EXISTS:", !!env.SMTP_PASSWORD);
console.log("SMTP HOST:", env.SMTP_HOST);
console.log("EMAIL CONFIGURED:", env.isEmailConfigured);

// Create transporter only if SMTP credentials exist
if (env.isEmailConfigured) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
    },
  });

  // Verify SMTP connection
  transporter.verify((error, success) => {
    if (error) {
      console.error("====================================");
      console.error("SMTP CONNECTION FAILED");
      console.error(error);
      console.error("====================================");
    } else {
      console.log("====================================");
      console.log("SMTP SERVER READY");
      console.log("Gmail connection successful.");
      console.log("====================================");
    }
  });
} else {
  console.warn(`
====================================
SMTP NOT CONFIGURED
Emails will NOT be sent.
OTP codes will be printed in Render Logs.
====================================
`);
}

/**
 * Send Email
 */

async function sendEmail({ to, subject, html, text }) {
  if (!transporter) {
    console.log(`
========== EMAIL (DEV MODE) ==========
To: ${to}

Subject:
${subject}

Body:
${text || html}

======================================
`);

    return {
      sent: false,
      devMode: true,
    };
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

    console.log(`
========== EMAIL CONTENT ==========
To: ${to}

Subject:
${subject}

Body:
${text || html}

==================================
`);

    return {
      sent: false,
      error: err.message,
    };
  }
}

module.exports = {
  sendEmail,
};