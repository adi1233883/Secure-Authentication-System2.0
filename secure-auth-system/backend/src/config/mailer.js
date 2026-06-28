const brevo = require("@getbrevo/brevo");
const env = require("./env");

const apiInstance = new brevo.TransactionalEmailsApi();

apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

async function sendEmail({ to, subject, text, html }) {
  try {
    const email = new brevo.SendSmtpEmail();

    email.sender = {
      name: env.SMTP_FROM_NAME,
      email: env.SMTP_FROM_EMAIL,
    };

    email.to = [
      {
        email: to,
      },
    ];

    email.subject = subject;
    email.htmlContent = html;
    email.textContent = text;

    const result = await apiInstance.sendTransacEmail(email);

    console.log("EMAIL SENT");
    console.log(result);

    return {
      sent: true,
    };
  } catch (err) {
    console.error("EMAIL ERROR");
    console.error(
      err.response?.body || err.response?.text || err.message || err
    );

    throw err;
  }
}

module.exports = {
  sendEmail,
};