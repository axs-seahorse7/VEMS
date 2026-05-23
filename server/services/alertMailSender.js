// services/mail/alertMailSender.js
import { transporter } from "./transporter.js";
import {cancelledTripsTemplate} from "../Templates/Emails/Alert-Emails/cancelledTripsTemplate.js";

const ALERT_TYPES = {
  TRIP_CANCELLED: "trip_cancelled",
  TRIP_DELAYED:   "trip_delayed",
  VEHICLE_ISSUE:  "vehicle_issue",
};

export const alertMailSender = async ({ to, alertType, payload, cc, priority = "medium" }) => {
  try {
    const template = cancelledTripsTemplate(payload);

    if (!template) {
      throw new Error(`Unknown alert type: "${alertType}". Valid types: ${Object.values(ALERT_TYPES).join(", ")}`);
    }

    const { subject, html } = template;

    const mailOptions = {
      from:     `"PG Group - VEMS Trip Alerts" <${process.env.NODE_MAILER_USER}>`,
      to,
      ...(cc && { cc }),
      subject:  `ALERT: ${subject}`,
      html,
      headers: {
        "X-Priority":       priority === "high" ? "1" : "3",
        "X-Alert-Type":     alertType,
        "X-VEMS-Generated": "true",
      },
    };

    const info = await transporter.sendMail(mailOptions);

    console.info(`[ALERT MAIL] type=${alertType} | to=${to} | msgId=${info.messageId}`);

    return {
      success:   true,
      alertType,
      messageId: info.messageId,
      sentAt:    new Date().toISOString(),
    };

  } catch (error) {
    console.error(`[ALERT MAIL ERROR] type=${alertType} | to=${to} |`, error);
    return {
      success:   false,
      alertType,
      error:     error.message,
      failedAt:  new Date().toISOString(),
    };
  }
};

export { ALERT_TYPES };