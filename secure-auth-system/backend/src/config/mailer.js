const { Resend } = require("resend");
const env = require("./env");

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail({ to, subject, text, html }) {
  try {
    const { data, error } = await resend.emails.send({
      from: "Secure Auth <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
      text,
    });

    if (error) {
      console.error("EMAIL SEND FAILED");
      console.error(error);
      throw new Error(error.message);
    }

    console.log("====================================");
    console.log("EMAIL SENT SUCCESSFULLY");
    console.log(data);
    console.log("====================================");

    return {
      sent: true,
      messageId: data?.id,
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