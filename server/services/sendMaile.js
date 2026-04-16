// services/mail/sendMail.js
import { transporter } from "./transporter.js";
import { emailTemplates } from "../Templates/Emails/emailsTemplates.js";

export const sendMail = async ({to, type, payload }) => {
  try {
    const template = emailTemplates[type];

    if (!template) {
      throw new Error(`Invalid email type: ${type}`);
    }

    const { subject, html } = template(payload);

    const mailOptions = {
      from: process.env.NODE_MAILER_USER,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("Mail Error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};