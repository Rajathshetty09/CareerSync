import nodemailer from 'nodemailer';
import env from '../config/env.js';
import logger from '../utils/logger.js';

const createTransporter = () =>
  nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });

export const sendEmail = async ({ to, subject, html }) => {
  if (env.NODE_ENV === 'test') return; // never send emails in test environment

  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
    });
    logger.info(`Email sent to ${to}: ${info.messageId}`);
  } catch (err) {
    logger.error(`Failed to send email to ${to}: ${err.message}`);
    // Don't throw — email failure should not break the request flow.
    // In production, wire this into a notification queue instead.
  }
};

// ─── Email Templates ──────────────────────────────────────────────────────────

const baseTemplate = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CareerSync</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 0; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #2563eb; padding: 28px 32px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 22px; margin: 0; letter-spacing: -0.3px; }
    .body { padding: 32px; color: #374151; font-size: 15px; line-height: 1.6; }
    .body p { margin: 0 0 16px; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 8px 0 24px; }
    .footer { padding: 20px 32px; background: #f9fafb; color: #9ca3af; font-size: 12px; text-align: center; border-top: 1px solid #e5e7eb; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><h1>CareerSync</h1></div>
    <div class="body">${content}</div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} CareerSync. All rights reserved.<br />
      You received this email because you signed up for CareerSync.
    </div>
  </div>
</body>
</html>
`;

export const sendVerificationEmail = ({ to, name, verifyUrl }) =>
  sendEmail({
    to,
    subject: 'Verify your CareerSync email address',
    html: baseTemplate(`
      <p>Hi <strong>${name}</strong>,</p>
      <p>Thanks for joining CareerSync! Please verify your email address to activate your account.</p>
      <p>
        <a href="${verifyUrl}" class="btn">Verify Email Address</a>
      </p>
      <hr class="divider" />
      <p style="font-size:13px; color:#6b7280;">
        This link expires in <strong>24 hours</strong>. If you didn't create an account, you can safely ignore this email.
      </p>
      <p style="font-size:12px; color:#9ca3af; word-break:break-all;">
        If the button doesn't work, copy and paste this URL into your browser:<br/>
        ${verifyUrl}
      </p>
    `),
  });
