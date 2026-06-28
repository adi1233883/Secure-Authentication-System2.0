const nodemailer = require("nodemailer");
const env = require("./env");

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: Number(env.SMTP_PORT),
  secure: env.SMTP_SECURE,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASSWORD,
  },
});

transporter.verify((err) => {
  if (err) {
    console.error("❌ Gmail SMTP Connection Failed");
    console.error(err);
  } else {
    console.log("✅ Gmail SMTP Connected Successfully");
  }
});

async function sendEmail({ to, subject, text, html }) {
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