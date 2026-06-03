import nodemailer from "nodemailer";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function getTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: { user, pass },
  });
}

export async function sendOTPEmail(email: string, otp: string, name: string) {
  const transporter = getTransporter();
  if (!transporter) {
    console.log(`[EMAIL MOCK] A: ${email} | OTP: ${otp}`);
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || "AIComply <noreply@aicomply.app>",
    to: email,
    subject: "Il tuo codice di verifica AIComply",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #6366f1;">AIComply</h2>
        <p>Ciao <strong>${escapeHtml(name)}</strong>,</p>
        <p>Il tuo codice di verifica è:</p>
        <div style="background: #0f172a; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="font-size: 36px; letter-spacing: 8px; font-weight: 700; color: #6366f1;">
            ${otp}
          </span>
        </div>
        <p style="color: #64748b; font-size: 14px;">
          Il codice scade tra 10 minuti. Se non hai richiesto questa verifica, ignora questa email.
        </p>
        <hr style="border: none; border-top: 1px solid #1e293b; margin: 24px 0;" />
        <p style="color: #64748b; font-size: 12px;">
          AIComply — Conforme al Regolamento UE 2024/1689
        </p>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(email: string, name: string) {
  const transporter = getTransporter();
  if (!transporter) {
    console.log(`[EMAIL MOCK] Benvenuto a: ${email}`);
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || "AIComply <noreply@aicomply.app>",
    to: email,
    subject: "Benvenuto in AIComply!",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #6366f1;">AIComply</h2>
        <p>Ciao <strong>${escapeHtml(name)}</strong>,</p>
        <p>Grazie per esserti registrato su <strong>AIComply</strong>.</p>
        <p>Ora puoi accedere alla dashboard per iniziare il percorso di compliance al Regolamento UE 2024/1689.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard"
           style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px;
                  border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">
          Vai alla dashboard
        </a>
        <hr style="border: none; border-top: 1px solid #1e293b; margin: 24px 0;" />
        <p style="color: #64748b; font-size: 12px;">
          AIComply — Conforme al Regolamento UE 2024/1689
        </p>
      </div>
    `,
  });
}

export async function sendWaitlistNotification(entry: {
  name: string;
  email: string;
  company: string;
  role?: string;
  ai_systems: string;
  plan: string;
}): Promise<void> {
  const notifyEmail = process.env.WAITLIST_NOTIFY_EMAIL ?? "dridrop@gmail.com";
  const transporter = getTransporter();

  if (!transporter) {
    console.log(`[WAITLIST] Nuovo iscritto: ${entry.name} <${entry.email}> (${entry.company}) — piano: ${entry.plan}`);
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || "AIComply <noreply@aicomply.app>",
    to: notifyEmail,
    subject: `🎯 Nuovo iscritto waitlist — ${escapeHtml(entry.name)} (${escapeHtml(entry.company)})`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #6366f1;">AIComply — Nuovo iscritto waitlist</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:8px 0;color:#64748b;width:40%;">Nome</td>
            <td style="padding:8px 0;font-weight:500;">${escapeHtml(entry.name)}</td>
          </tr>
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:8px 0;color:#64748b;">Email</td>
            <td style="padding:8px 0;"><a href="mailto:${escapeHtml(entry.email)}">${escapeHtml(entry.email)}</a></td>
          </tr>
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:8px 0;color:#64748b;">Azienda</td>
            <td style="padding:8px 0;font-weight:500;">${escapeHtml(entry.company)}</td>
          </tr>
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:8px 0;color:#64748b;">Ruolo</td>
            <td style="padding:8px 0;">${escapeHtml(entry.role ?? "—")}</td>
          </tr>
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:8px 0;color:#64748b;">Sistemi AI</td>
            <td style="padding:8px 0;">${escapeHtml(entry.ai_systems)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#64748b;">Piano</td>
            <td style="padding:8px 0;text-transform:capitalize;">${escapeHtml(entry.plan)}</td>
          </tr>
        </table>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
        <p style="color:#64748b;font-size:12px;">AIComply Waitlist · ${new Date().toLocaleString("it-IT")}</p>
      </div>
    `,
  });
}
