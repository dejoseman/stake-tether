const nodemailer = require('nodemailer');

/**
 * Wraps a plain text message into a branded HTML email template
 * with the GeneratingPro logo, gradient header, and footer.
 */
const generateBrandedHtml = (message) => {
  const year = new Date().getFullYear();
  const supportEmail = process.env.FROM_EMAIL || 'support@generatingpro.com';
  // Convert newlines to <br> for HTML rendering
  const htmlBody = message.replace(/\n/g, '<br>');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Logo Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#007a7a,#009393);padding:32px 40px;text-align:center;">
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">
                    <img src="https://generatingpro.com/gp-logo-white.svg" alt="GP" width="40" height="34" style="display:block;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">GeneratingPro</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding:40px;">
              <div style="font-size:15px;line-height:1.7;color:#334155;">${htmlBody}</div>
            </td>
          </tr>
          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0;" />
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 32px;">
              <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#1a1a2e;">GeneratingPro Support Team</p>
              <p style="margin:0 0 4px;font-size:13px;color:#64748b;">${supportEmail}</p>
              <a href="https://generatingpro.com" style="font-size:13px;color:#009393;text-decoration:none;">generatingpro.com</a>
            </td>
          </tr>
          <!-- Bottom Bar -->
          <tr>
            <td style="background:#009393;padding:16px 40px;text-align:center;">
              <span style="color:rgba(255,255,255,0.8);font-size:11px;">&copy; ${year} GeneratingPro. All rights reserved.</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * Send an email. Supports:
 *   options.email   - recipient email address
 *   options.subject - email subject
 *   options.message - plain text message (auto-wrapped in branded HTML)
 *   options.html    - optional raw HTML override (skips branded template)
 */
const sendEmail = async (options) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('\n--- EMAIL MOCK (SMTP not configured) ---');
      console.log(`To: ${options.email}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Message: \n${options.message || '(HTML email)'}`);
      console.log('----------------------------------------\n');
      return;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.resend.com',
      port: process.env.EMAIL_PORT || 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const fromEmail = process.env.FROM_EMAIL || 'support@generatingpro.com';

    const mailOptions = {
      from: `GeneratingPro <${fromEmail}>`,
      to: options.email,
      replyTo: fromEmail,
      subject: options.subject,
      text: options.message, // Fallback for email clients that don't support HTML (improves spam score)
      html: options.html || generateBrandedHtml(options.message),
      headers: {
        'List-Unsubscribe': `<mailto:${fromEmail}?subject=unsubscribe>`,
      }
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${options.email}`);
  } catch (error) {
    console.error('Email could not be sent:', error.message);
  }
};

const sendAdminAlert = async (subject, message) => {
  return sendEmail({
    email: 'generatingpro.support@gmail.com',
    subject,
    message
  });
};

module.exports = sendEmail;
module.exports.generateBrandedHtml = generateBrandedHtml;
module.exports.sendAdminAlert = sendAdminAlert;
