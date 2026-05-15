import nodemailer from "nodemailer";

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
        <p>Ciao <strong>${name}</strong>,</p>
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
        <p>Ciao <strong>${name}</strong>,</p>
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
