=const SibApiV3Sdk = require("@getbrevo/brevo");
const env = require("./env");

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

apiInstance.setApiKey(
  SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

async function sendEmail({ to, subject, text, html }) {
  const email = {
    sender: {
      name: env.SMTP_FROM_NAME,
      email: env.SMTP_FROM_EMAIL,
    },
    to: [
      {
        email: to,
      },
    ],
    subject,
    textContent: text,
    htmlContent: html,
  };

  try {
    const result = await apiInstance.sendTransacEmail(email);

    console.log("====================================");
    console.log("EMAIL SENT SUCCESSFULLY");
    console.log(result);
    console.log("====================================");

    return {
      sent: true,
      messageId: result.messageId || null,
    };
  } catch (err) {
    console.error("====================================");
    console.error("EMAIL SEND FAILED");
    console.error(err.response?.body || err);
    console.error("====================================");

    throw err;
  }
}

module.exports = {
  sendEmail,
};