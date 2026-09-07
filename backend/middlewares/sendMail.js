import nodemailer from "nodemailer";
import { Resend } from "resend";

export const getTransporter = () => {
  const emailUser = (
    process.env.SMTP_USER ||
    process.env.NODE_CODE_SENDING_EMAIL_ADDRESS ||
    "diptipriya657@gmail.com"
  ).trim();

  const rawPass =
    process.env.SMTP_PASSWORD ||
    process.env.NODE_CODE_SENDING_EMAIL_PASSWORD ||
    "blypgelplndsrqpz";
  const emailPass = rawPass.replace(/\s+/g, "");

  // 1. Gmail service if user is @gmail.com
  if (emailUser.includes("@gmail.com")) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  // 2. Explicit custom SMTP host
  const host = process.env.SMTP_HOST || "smtp-relay.brevo.com";
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });
};

export const transport = {
  sendMail: async (options) => {
    // 1. Try Resend API if RESEND_API_KEY is configured
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        console.log(`[RESEND] Sending email to ${options.to}...`);
        const res = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        });

        if (res.data?.id) {
          console.log(`[RESEND] Sent successfully. Message ID: ${res.data.id}`);
          return { messageId: res.data.id, accepted: [options.to] };
        }
        if (res.error) {
          console.error(`[RESEND ERROR]`, res.error);
        }
      } catch (resendErr) {
        console.error(`[RESEND EXCEPTION]`, resendErr.message);
      }
    }

    // 2. Nodemailer SMTP transport fallback
    const t = getTransporter();
    const targetHost = t.options?.service || t.options?.host || "default";
    console.log(`[SMTP] Sending email to ${options.to} via ${targetHost}...`);
    try {
      const info = await t.sendMail(options);
      console.log(`[SMTP] Sent successfully. Message ID: ${info.messageId}`);
      return info;
    } catch (err) {
      console.error(`[SMTP] Failed to send email to ${options.to}:`, err.message);
      throw err;
    }
  },
};