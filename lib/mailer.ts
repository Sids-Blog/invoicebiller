import nodemailer from 'nodemailer';

/**
 * Returns a configured nodemailer transporter using SMTP env vars.
 * Configure these in .env.local:
 *
 *   SMTP_HOST=smtp.gmail.com          # or your provider's SMTP host
 *   SMTP_PORT=587                     # 587 (TLS) or 465 (SSL)
 *   SMTP_SECURE=false                 # true for port 465, false for 587
 *   SMTP_USER=you@gmail.com           # SMTP username / email
 *   SMTP_PASS=your-app-password       # SMTP password / app password
 *   SMTP_FROM="Laabham Pro <no-reply@yourdomain.com>"
 *   APP_URL=https://yourdomain.com    # Base URL for reset links
 */
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      'SMTP configuration is incomplete. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env.local'
    );
  }

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true', // true for port 465
    auth: { user, pass },
  });
}

export interface SendPasswordResetOptions {
  to: string;
  resetToken: string;
  username?: string | null;
}

/**
 * Sends a password reset email with a secure reset link.
 */
export async function sendPasswordResetEmail({
  to,
  resetToken,
  username,
}: SendPasswordResetOptions): Promise<void> {
  const transporter = createTransporter();

  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  const from = process.env.SMTP_FROM ?? `Laabham Pro <no-reply@laabhampro.com>`;
  const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;
  const displayName = username ?? to;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Reset Your Password</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0E1F40 0%,#1a3360 100%);padding:32px 40px;text-align:center;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="background:#0E1F40; border-radius:12px; width:64px; height:64px; padding:8px; box-sizing:border-box; display:inline-block;">
                      <svg width="48" height="48" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style="display:block;">
                        <text x="18" y="23" font-family="Arial, sans-serif" font-weight="bold" font-size="20" fill="white" opacity="0.35" text-anchor="middle">₹</text>
                        <path d="M 8 8 L 8 24 L 24 24" stroke="white" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M 10 18 L 16 12 L 22 18 L 28 12" stroke="#D4A017" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M 23 12 L 28 12 L 28 17" stroke="#D4A017" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top:12px;">
                    <span style="font-size:22px;font-weight:300;color:#ffffff;letter-spacing:0.5px;">Laabham</span>
                    <span style="font-size:22px;font-weight:700;color:#D4A017;"> Pro</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0E1F40;">Password Reset Request</p>
              <p style="margin:0 0 24px;font-size:15px;color:#64748b;">
                Hi <strong>${displayName}</strong>, we received a request to reset your Laabham Pro password.
              </p>

              <p style="margin:0 0 24px;font-size:15px;color:#374151;">
                Click the button below to set a new password. This link is valid for <strong>1 hour</strong>.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 32px;">
                    <a href="${resetUrl}"
                       style="display:inline-block;background:linear-gradient(135deg,#D4A017,#c49010);color:#0E1F40;font-size:16px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:8px;letter-spacing:0.3px;">
                      Reset My Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback URL -->
              <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;">If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="margin:0 0 32px;font-size:12px;color:#6366f1;word-break:break-all;">
                <a href="${resetUrl}" style="color:#6366f1;">${resetUrl}</a>
              </p>

              <!-- Security notice -->
              <div style="background:#fefce8;border:1px solid #fef08a;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
                <p style="margin:0;font-size:13px;color:#854d0e;">
                  🔒 If you did not request a password reset, please ignore this email. Your account is safe — no changes have been made.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                © ${new Date().getFullYear()} Laabham Pro · Invoice &amp; Billing Software
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  await transporter.sendMail({
    from,
    to,
    subject: 'Reset your Laabham Pro password',
    html,
    text: `Hi ${displayName},\n\nYou requested a password reset for your Laabham Pro account.\n\nClick this link to reset your password (valid for 1 hour):\n${resetUrl}\n\nIf you did not request this, ignore this email — no changes have been made.\n\n— Laabham Pro`,
  });
}
