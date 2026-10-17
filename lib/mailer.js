import nodemailer from "nodemailer";

let transport;

// Sends through the SMTP server configured in the environment (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM).
// With no SMTP_HOST the message is printed in the server console during development so the flow can still be tried; returns whether it was really sent.
export async function sendMail({ to, subject, text, html }) {
  if (!process.env.SMTP_HOST) {
    if (process.env.NODE_ENV === "production") console.error(`Email not sent to ${to}: SMTP_HOST is not configured.`);
    else console.log(`\n[email not configured - printed instead of sent]\nTo: ${to}\nSubject: ${subject}\n\n${text}\n`);
    return false;
  }
  const port = Number(process.env.SMTP_PORT || 587);
  transport ||= nodemailer.createTransport({
    host: process.env.SMTP_HOST, port, secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  await transport.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text, html });
  return true;
}
