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
          <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@500&family=Playfair+Display:wght@700&display=swap" rel="stylesheet"/>
        </head>
        <body style="margin:0;padding:0;background:#f0eeeb;font-family:'DM Sans',Arial,sans-serif;">

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0eeeb;padding:48px 0;">
            <tr>
              <td align="center">
                <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 40px rgba(0,0,0,0.08),0 1px 3px rgba(0,0,0,0.04);">

                  <!-- Header -->
                  <tr>
                    <td style="padding:36px 48px 28px;border-bottom:1px solid #f1eeea;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td>
                            <img
                              src="https://cms-complaint-avidence.s3.eu-north-1.amazonaws.com/pg-logo-Photoroom.png"
                              alt="VEMS"
                              height="36"
                              style="display:block;"
                            />
                          </td>
                          <td align="right">
                            <span style="font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#b0a89e;font-family:'DM Sans',Arial,sans-serif;">SECURE LOGIN</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding:44px 48px 36px;">

                      <!-- Greeting -->
                      <p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:1.6px;text-transform:uppercase;color:#C00000;font-family:'DM Sans',Arial,sans-serif;">
                        Verification Required
                      </p>
                      <h1 style="margin:0 0 18px;font-size:28px;font-weight:700;color:#1a1714;line-height:1.25;font-family:'Playfair Display',Georgia,serif;">
                        Your one-time<br/>access code
                      </h1>
                      <p style="margin:0 0 36px;font-size:15px;color:#7a7068;line-height:1.7;font-family:'DM Sans',Arial,sans-serif;">
                        Hi ${name || "there"} — enter the code below to complete your sign-in to VEMS. This code is confidential; never share it with anyone.
                      </p>

                      <!-- OTP Glass Box -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                        <tr>
                          <td align="center">
                            <!--[if mso]>
                            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
                              style="height:110px;width:420px;" arcsize="8%" strokecolor="#e8ddd6" fillcolor="#faf8f6">
                            <w:anchorlock/>
                            <center style="font-family:'DM Mono',Courier New,monospace;font-size:46px;font-weight:500;color:#C00000;letter-spacing:16px;">
                              ${otp}
                            </center>
                            </v:roundrect>
                            <![endif]-->
                            <!--[if !mso]><!-->
                            <div style="
                              display:inline-block;
                              background:linear-gradient(145deg,#fdfcfb 0%,#f7f3ef 100%);
                              border:1px solid #e8ddd6;
                              border-radius:16px;
                              padding:28px 48px 24px;
                              box-shadow:inset 0 1px 0 rgba(255,255,255,0.9),0 8px 32px rgba(192,0,0,0.07),0 2px 8px rgba(0,0,0,0.04);
                              position:relative;
                            ">
                              <p style="margin:0 0 6px;font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#b0a89e;text-align:center;font-family:'DM Sans',Arial,sans-serif;">
                                One-Time Password
                              </p>
                              <p style="margin:0;font-size:48px;font-weight:500;letter-spacing:16px;color:#C00000;font-family:'DM Mono','Courier New',monospace;text-align:center;padding-left:16px;">
                                ${otp}
                              </p>
                            </div>
                            <!--<![endif]-->
                          </td>
                        </tr>
                      </table>

                      <!-- Expiry notice -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="background:#fdf8f7;border:1px solid #f0e8e5;border-radius:10px;padding:14px 20px;">
                            <table cellpadding="0" cellspacing="0">
                              <tr>
                                <td style="padding-right:12px;vertical-align:middle;">
                                  <div style="width:6px;height:6px;background:#C00000;border-radius:50%;"></div>
                                </td>
                                <td style="font-size:13px;color:#7a7068;line-height:1.6;font-family:'DM Sans',Arial,sans-serif;">
                                  Expires in <strong style="color:#1a1714;font-weight:600;">5 minutes.</strong>&nbsp; If you didn't request this, you can safely ignore this email.
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background:#faf8f6;border-top:1px solid #f1eeea;padding:24px 48px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td>
                            <p style="margin:0 0 2px;font-size:11px;color:#b0a89e;font-family:'DM Sans',Arial,sans-serif;">
                              Automated message · Do not reply
                            </p>
                            <p style="margin:0;font-size:11px;color:#c8c0b8;font-family:'DM Sans',Arial,sans-serif;">
                              © ${new Date().getFullYear()} VEMS · Vehicle &amp; Equipment Management System
                            </p>
                          </td>
                          <td align="right" style="vertical-align:bottom;">
                            <span style="font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#ddd8d3;font-family:'DM Sans',Arial,sans-serif;">VEMS</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                </table>

                <!-- Bottom note -->
                <table width="560" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:20px 48px 0;text-align:center;">
                      <p style="margin:0;font-size:11px;color:#b0a89e;line-height:1.6;font-family:'DM Sans',Arial,sans-serif;">
                        This email was sent to you because a sign-in was attempted on your VEMS account.<br/>
                        Never share your OTP with anyone, including VEMS support.
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
            subject: "Welcome to VEMS — You're all set",
            html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8"/>
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <title>Welcome to VEMS</title>
          <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Playfair+Display:wght@700&display=swap" rel="stylesheet"/>
        </head>
        <body style="margin:0;padding:0;background:#f0eeeb;font-family:'DM Sans',Arial,sans-serif;">

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0eeeb;padding:48px 0;">
            <tr>
              <td align="center">
                <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 40px rgba(0,0,0,0.08),0 1px 3px rgba(0,0,0,0.04);">

                  <!-- Hero Header -->
                  <tr>
                    <td style="background:linear-gradient(160deg,#1a1714 0%,#2d1f1f 60%,#3d1010 100%);padding:52px 48px 44px;position:relative;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding-bottom:32px;">
                            <img
                              src="https://cms-complaint-avidence.s3.eu-north-1.amazonaws.com/pg-logo-Photoroom.png"
                              alt="VEMS"
                              height="34"
                              style="display:block;filter:brightness(0) invert(1);opacity:0.92;"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <p style="margin:0 0 10px;font-size:12px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;color:#e07070;font-family:'DM Sans',Arial,sans-serif;">
                              Account Activated
                            </p>
                            <h1 style="margin:0;font-size:32px;font-weight:700;color:#ffffff;line-height:1.2;font-family:'Playfair Display',Georgia,serif;">
                              Welcome aboard,<br/>${name} 👋
                            </h1>
                          </td>
                        </tr>
                      </table>
                      <!-- Decorative line -->
                      <div style="position:absolute;bottom:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#C00000,#e05050,#C00000);"></div>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding:44px 48px 36px;">

                      <p style="margin:0 0 28px;font-size:15px;color:#7a7068;line-height:1.75;font-family:'DM Sans',Arial,sans-serif;">
                        Your VEMS account is live and ready. You now have full access to manage your fleet, track vehicles in real time, and streamline your operations — all from one unified platform.
                      </p>

                      <!-- Feature tiles -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                        <tr>
                          <td width="48%" style="background:#faf8f6;border:1px solid #ede9e5;border-radius:12px;padding:18px 20px;vertical-align:top;">
                            <p style="margin:0 0 4px;font-size:18px;">🚗</p>
                            <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#1a1714;font-family:'DM Sans',Arial,sans-serif;">Fleet Management</p>
                            <p style="margin:0;font-size:12px;color:#9a9088;line-height:1.5;font-family:'DM Sans',Arial,sans-serif;">Add, monitor, and manage all your vehicles from a single dashboard.</p>
                          </td>
                          <td width="4%"></td>
                          <td width="48%" style="background:#faf8f6;border:1px solid #ede9e5;border-radius:12px;padding:18px 20px;vertical-align:top;">
                            <p style="margin:0 0 4px;font-size:18px;">📊</p>
                            <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#1a1714;font-family:'DM Sans',Arial,sans-serif;">Live Reporting</p>
                            <p style="margin:0;font-size:12px;color:#9a9088;line-height:1.5;font-family:'DM Sans',Arial,sans-serif;">Real-time insights and reports on utilisation, costs, and status.</p>
                          </td>
                        </tr>
                      </table>

                      <!-- Support note -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="border-left:3px solid #C00000;background:#fdf9f8;border-radius:0 10px 10px 0;padding:16px 20px;">
                            <p style="margin:0;font-size:13px;color:#7a7068;line-height:1.65;font-family:'DM Sans',Arial,sans-serif;">
                              Need help getting started? Reach out to your <strong style="color:#1a1714;font-weight:600;">system administrator</strong> — they can guide you through your first steps on the platform.
                            </p>
                          </td>
                        </tr>
                      </table>

                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background:#faf8f6;border-top:1px solid #f1eeea;padding:24px 48px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td>
                            <p style="margin:0 0 2px;font-size:11px;color:#b0a89e;font-family:'DM Sans',Arial,sans-serif;">
                              Automated message · Do not reply
                            </p>
                            <p style="margin:0;font-size:11px;color:#c8c0b8;font-family:'DM Sans',Arial,sans-serif;">
                              © ${new Date().getFullYear()} VEMS · Vehicle &amp; Equipment Management System
                            </p>
                          </td>
                          <td align="right" style="vertical-align:bottom;">
                            <span style="font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#ddd8d3;font-family:'DM Sans',Arial,sans-serif;">VEMS</span>
                          </td>
                        </tr>
                      </table>
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
            subject: "VEMS — Action Required",
            html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8"/>
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <title>VEMS Alert</title>
          <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Playfair+Display:wght@700&display=swap" rel="stylesheet"/>
        </head>
        <body style="margin:0;padding:0;background:#f0eeeb;font-family:'DM Sans',Arial,sans-serif;">

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0eeeb;padding:48px 0;">
            <tr>
              <td align="center">
                <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 40px rgba(0,0,0,0.08),0 1px 3px rgba(0,0,0,0.04);">

                  <!-- Header -->
                  <tr>
                    <td style="padding:36px 48px 28px;border-bottom:1px solid #f1eeea;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td>
                            <img
                              src="https://cms-complaint-avidence.s3.eu-north-1.amazonaws.com/pg-logo-Photoroom.png"
                              alt="VEMS"
                              height="36"
                              style="display:block;"
                            />
                          </td>
                          <td align="right">
                            <div style="display:inline-block;background:#fff0f0;border:1px solid #fcc;border-radius:20px;padding:5px 14px;">
                              <span style="font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#C00000;font-family:'DM Sans',Arial,sans-serif;">⚠ Alert</span>
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Alert accent bar -->
                  <tr>
                    <td style="background:linear-gradient(90deg,#C00000 0%,#e05050 50%,#C00000 100%);height:3px;font-size:0;line-height:0;">&nbsp;</td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding:44px 48px 36px;">

                      <p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:1.6px;text-transform:uppercase;color:#C00000;font-family:'DM Sans',Arial,sans-serif;">
                        System Notification
                      </p>
                      <h1 style="margin:0 0 28px;font-size:28px;font-weight:700;color:#1a1714;line-height:1.25;font-family:'Playfair Display',Georgia,serif;">
                        Action Required
                      </h1>

                      <!-- Message card -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                        <tr>
                          <td style="background:#fdf8f7;border:1px solid #f0e4e0;border-radius:14px;padding:24px 28px;">
                            <!-- Top accent -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                              <tr>
                                <td width="24" style="vertical-align:top;padding-right:14px;">
                                  <div style="width:24px;height:24px;background:#C00000;border-radius:6px;text-align:center;line-height:24px;">
                                    <span style="font-size:13px;color:#fff;">!</span>
                                  </div>
                                </td>
                                <td style="vertical-align:middle;">
                                  <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#C00000;font-family:'DM Sans',Arial,sans-serif;">
                                    Notice from VEMS
                                  </p>
                                </td>
                              </tr>
                            </table>
                            <p style="margin:0;font-size:15px;color:#3d3530;line-height:1.75;font-family:'DM Sans',Arial,sans-serif;">
                              ${message}
                            </p>
                          </td>
                        </tr>
                      </table>

                      <p style="margin:0;font-size:13px;color:#9a9088;line-height:1.6;font-family:'DM Sans',Arial,sans-serif;">
                        If this alert was unexpected or you need assistance, please contact your system administrator immediately.
                      </p>

                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background:#faf8f6;border-top:1px solid #f1eeea;padding:24px 48px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td>
                            <p style="margin:0 0 2px;font-size:11px;color:#b0a89e;font-family:'DM Sans',Arial,sans-serif;">
                              Automated message · Do not reply
                            </p>
                            <p style="margin:0;font-size:11px;color:#c8c0b8;font-family:'DM Sans',Arial,sans-serif;">
                              © ${new Date().getFullYear()} VEMS · Vehicle &amp; Equipment Management System
                            </p>
                          </td>
                          <td align="right" style="vertical-align:bottom;">
                            <span style="font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#ddd8d3;font-family:'DM Sans',Arial,sans-serif;">VEMS</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                </table>

                <!-- Bottom note -->
                <table width="560" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:20px 48px 0;text-align:center;">
                      <p style="margin:0;font-size:11px;color:#b0a89e;line-height:1.6;font-family:'DM Sans',Arial,sans-serif;">
                        This alert was generated automatically by VEMS.<br/>
                        Do not reply to this email — it is not monitored.
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