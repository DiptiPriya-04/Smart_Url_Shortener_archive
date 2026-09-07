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
    // 1. Try Brevo REST API (HTTPS port 443 - never blocked by Render, sends to ANY recipient without domain restriction)
    if (process.env.BREVO_API_KEY) {
      try {
        const senderEmail = (
          process.env.BREVO_SENDER_EMAIL ||
          process.env.SMTP_USER ||
          process.env.NODE_CODE_SENDING_EMAIL_ADDRESS ||
          "diptipriya657@gmail.com"
        ).trim();

        console.log(`[BREVO] Sending email to ${options.to} via HTTPS API (from: ${senderEmail})...`);
        const res = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "accept": "application/json",
            "api-key": process.env.BREVO_API_KEY.trim(),
            "content-type": "application/json",
          },
          body: JSON.stringify({
            sender: {
              name: "Smart URL Shortener",
              email: senderEmail,
            },
            to: [{ email: options.to }],
            subject: options.subject,
            htmlContent: options.html || options.text,
            textContent: options.text,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (res.ok && data.messageId) {
          console.log(`[BREVO] Sent successfully to ${options.to}. Message ID: ${data.messageId}`);
          return { messageId: data.messageId, accepted: [options.to] };
        }
        console.error(`[BREVO ERROR] Status ${res.status}:`, data);
      } catch (brevoErr) {
        console.error(`[BREVO EXCEPTION]`, brevoErr.message);
      }
    }

    // 2. Try Resend API if RESEND_API_KEY is configured
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

    // 3. Nodemailer SMTP transport fallback
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