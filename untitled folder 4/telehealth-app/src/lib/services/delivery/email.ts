import nodemailer from "nodemailer";

export type EmailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

export async function sendEmail(params: {
  to: string;
  subject: string;
  text: string;
  attachments?: EmailAttachment[];
}): Promise<{ ok: boolean; provider: string; error?: string }> {
  const from = process.env.EMAIL_FROM || "Sanavo <noreply@sanavo.in>";
  const attachments = params.attachments || [];

  // Option 1: Resend API (attachments as base64)
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [params.to],
          subject: params.subject,
          text: params.text,
          attachments: attachments.map((a) => ({
            filename: a.filename,
            content: a.content.toString("base64"),
            content_type: a.contentType || "application/pdf",
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        return { ok: false, provider: "resend", error: err };
      }

      return { ok: true, provider: "resend" };
    } catch (err) {
      return {
        ok: false,
        provider: "resend",
        error: err instanceof Error ? err.message : "Resend failed",
      };
    }
  }

  // Option 2: SMTP (Gmail, Outlook, custom)
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from,
        to: params.to,
        subject: params.subject,
        text: params.text,
        attachments: attachments.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType || "application/pdf",
        })),
      });

      return { ok: true, provider: "smtp" };
    } catch (err) {
      return {
        ok: false,
        provider: "smtp",
        error: err instanceof Error ? err.message : "SMTP failed",
      };
    }
  }

  // Dev fallback: log only (still recorded in DB)
  console.log("[EMAIL:DEV]", {
    to: params.to,
    subject: params.subject,
    body: params.text,
    attachments: attachments.map((a) => ({
      filename: a.filename,
      bytes: a.content.length,
      contentType: a.contentType || "application/pdf",
    })),
  });

  return { ok: true, provider: "dev-console" };
}
