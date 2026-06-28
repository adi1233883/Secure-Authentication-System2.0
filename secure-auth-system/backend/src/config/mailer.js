// backend/src/config/mailer.js

const nodemailer = require("nodemailer");
const env = require("./env");

console.log("====================================");
console.log("SMTP USER:", env.SMTP_USER);
console.log("SMTP HOST:", env.SMTP_HOST);
console.log("SMTP PORT:", env.SMTP_PORT);
console.log("EMAIL CONFIGURED:", env.isEmailConfigured);
console.log("====================================");

let transporter = null;

if (env.isEmailConfigured) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT),
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
    },
  });

  transporter.verify()
    .then(() => {
      console.log("====================================");
      console.log("BREVO SMTP SERVER READY");
      console.log("SMTP Connection Successful");
      console.log("====================================");
    })
    .catch((err) => {
      console.error("====================================");
      console.error("SMTP CONNECTION FAILED");
      console.error(err);
      console.error("====================================");
    });
} else {
  console.warn(`
====================================
SMTP NOT CONFIGURED
Emails will NOT be sent.
====================================
`);
}

async function sendEmail({ to, subject, text, html }) {
  if (!transporter) {
    console.error("Transporter not initialized.");
    return {
      sent: false,
      error: "SMTP not configured",
    };
  }

  try {
    console.log("====================================");
    console.log("SENDING EMAIL...");
    console.log("TO:", to);
    console.log("SUBJECT:", subject);
    console.log("====================================");

    const info = await transporter.sendMail({
      from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`,
      to,
      subject,
      text,
      html,
    });

    console.log("====================================");
    console.log("EMAIL SENT SUCCESSFULLY");
    console.log(info);
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