// services/mail/templates.js

export const emailTemplates = {
  OTP: ({ name, otp }) => ({
    subject: "Your VEMS Verification Code",
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>VEMS OTP</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

          <!-- Header -->
          <tr>
            <td style="background:#c0000085;padding:28px 40px;text-align:center;">
              <img
                src="https://cms-complaint-avidence.s3.eu-north-1.amazonaws.com/pg-logo-Photoroom.png"
                alt="VEMS Logo"
                width="110"
                style="display:block;margin:0 auto;"
              />
            </td>
          </tr>

          <!-- Red accent bar -->
          <tr>
            <td style="background:#C00000;height:4px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">

              <p style="margin:0 0 6px;font-size:13px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:#C00000;">
                Vehicle Management System
              </p>

              <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111827;line-height:1.3;">
                Your verification code
              </h1>

              <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">
                Hi ${name || "there"}, use the code below to complete your sign-in.
                Do not share this code with anyone.
              </p>

              <!-- OTP Box -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:0 0 28px;">
                    <div style="
                      display:inline-block;
                      background:#fff5f5;
                      border:1.5px solid #fca5a5;
                      border-radius:12px;
                      padding:22px 40px;
                    ">
                      <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#9ca3af;">
                        One-time password
                      </p>
                      <p style="margin:0;font-size:42px;font-weight:800;letter-spacing:14px;color:#C00000;font-family:'Courier New',monospace;">
                        ${otp}
                      </p>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Expiry notice -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#f9fafb;border-radius:8px;padding:14px 18px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-right:10px;vertical-align:middle;">
                          <div style="width:8px;height:8px;background:#C00000;border-radius:50%;"></div>
                        </td>
                        <td style="font-size:13px;color:#6b7280;vertical-align:middle;">
                          This code expires in <strong style="color:#111827;">5 minutes</strong>. If you didn't request this, please ignore this email.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="border-top:1px solid #f3f4f6;"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">
                This is an automated message from <strong style="color:#374151;">VEMS</strong>. Please do not reply.
              </p>
              <p style="margin:0;font-size:12px;color:#d1d5db;">
                © ${new Date().getFullYear()} VEMS · Vehicle Management System
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
    `,
  }),

  WELCOME: ({ name }) => ({
    subject: "Welcome to VEMS 🎉",
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome to VEMS</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

          <tr>
            <td style="background:#C00000;padding:28px 40px;text-align:center;">
              <img
                src="https://cms-complaint-avidence.s3.eu-north-1.amazonaws.com/pg-logo-Photoroom.png"
                alt="VEMS Logo"
                width="110"
                style="display:block;margin:0 auto;"
              />
            </td>
          </tr>
          <tr>
            <td style="background:#9b0000;height:4px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 6px;font-size:13px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:#C00000;">
                Vehicle Management System
              </p>
              <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111827;">
                Welcome aboard, ${name} 👋
              </h1>
              <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">
                Your VEMS account is ready. You can now manage your fleet, track vehicles, and streamline operations — all from one place.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#fff5f5;border-left:3px solid #C00000;border-radius:0 8px 8px 0;padding:16px 20px;">
                    <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">
                      If you have any questions, reach out to your system administrator.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px;">
              <div style="border-top:1px solid #f3f4f6;"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">
                This is an automated message from <strong style="color:#374151;">VEMS</strong>. Please do not reply.
              </p>
              <p style="margin:0;font-size:12px;color:#d1d5db;">
                © ${new Date().getFullYear()} VEMS · Vehicle Management System
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
    `,
  }),

  ALERT: ({ message }) => ({
    subject: "VEMS — Important Notification",
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>VEMS Alert</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

          <tr>
            <td style="background:#C00000;padding:28px 40px;text-align:center;">
              <img
                src="https://cms-complaint-avidence.s3.eu-north-1.amazonaws.com/pg-logo-Photoroom.png"
                alt="VEMS Logo"
                width="110"
                style="display:block;margin:0 auto;"
              />
            </td>
          </tr>
          <tr>
            <td style="background:#9b0000;height:4px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 6px;font-size:13px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:#C00000;">
                System Alert
              </p>
              <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111827;">
                Important Notification
              </h1>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#fff5f5;border:1px solid #fca5a5;border-radius:10px;padding:20px 24px;">
                    <p style="margin:0;font-size:15px;color:#374151;line-height:1.7;">
                      ${message}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px;">
              <div style="border-top:1px solid #f3f4f6;"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">
                This is an automated message from <strong style="color:#374151;">VEMS</strong>. Please do not reply.
              </p>
              <p style="margin:0;font-size:12px;color:#d1d5db;">
                © ${new Date().getFullYear()} VEMS · Vehicle Management System
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
    `,
  }),
};