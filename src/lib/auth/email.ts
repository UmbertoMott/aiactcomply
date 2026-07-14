import { Resend } from "resend";

// Resend è il provider principale. Fallback console.log se la chiave non è configurata.
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM = process.env.RESEND_FROM ?? "AIComply <onboarding@resend.dev>";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// ── Login OTP ──────────────────────────────────────────────────────────────

export async function sendLoginOTPEmail(email: string, otp: string): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.log(`[EMAIL MOCK] Login OTP per ${email}: ${otp}`);
    return;
  }

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `${otp} — Il tuo codice di accesso AIComply`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <h2 style="color: #0D1016; margin: 0 0 8px;">AIComply</h2>
        <p style="color: #64748b; font-size: 14px; margin: 0 0 24px;">Verifica del tuo accesso</p>

        <p style="color: #1e293b; margin: 0 0 8px;">Hai richiesto l'accesso ad AIComply. Usa questo codice:</p>

        <div style="background: #0D1016; border-radius: 12px; padding: 28px; text-align: center; margin: 24px 0;">
          <span style="font-size: 40px; letter-spacing: 10px; font-weight: 700; color: #ffffff; font-family: monospace;">
            ${otp}
          </span>
        </div>

        <p style="color: #64748b; font-size: 13px; margin: 0 0 8px;">
          ⏱️ Il codice scade tra <strong>10 minuti</strong>.
        </p>
        <p style="color: #64748b; font-size: 13px; margin: 0 0 24px;">
          🔒 Se non stai cercando di accedere ad AIComply, ignora questa email.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 11px; margin: 0;">
          AIComply · Compliance EU AI Act · Non rispondere a questa email
        </p>
      </div>
    `,
  });
}

// ── OTP registrazione (usata altrove nel progetto) ─────────────────────────

export async function sendOTPEmail(email: string, otp: string, name: string): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.log(`[EMAIL MOCK] A: ${email} | OTP: ${otp}`);
    return;
  }

  await resend.emails.send({
    from: FROM,
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
        <p style="color: #64748b; font-size: 12px;">AIComply — Conforme al Regolamento UE 2024/1689</p>
      </div>
    `,
  });
}

// ── Welcome email ──────────────────────────────────────────────────────────

export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.log(`[EMAIL MOCK] Benvenuto a: ${email}`);
    return;
  }

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Benvenuto in AIComply!",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #6366f1;">AIComply</h2>
        <p>Ciao <strong>${escapeHtml(name)}</strong>,</p>
        <p>Grazie per esserti registrato su <strong>AIComply</strong>.</p>
        <p>Ora puoi accedere alla dashboard per iniziare il percorso di compliance al Regolamento UE 2024/1689.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard"
           style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px;
                  border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">
          Vai alla dashboard
        </a>
        <hr style="border: none; border-top: 1px solid #1e293b; margin: 24px 0;" />
        <p style="color: #64748b; font-size: 12px;">AIComply — Conforme al Regolamento UE 2024/1689</p>
      </div>
    `,
  });
}

// ── Report ROI sanzioni ────────────────────────────────────────────────────

export async function sendRoiReport(
  lead: { firstName: string; lastName: string; email: string; company: string; country: string },
  fig: {
    esposizione: string; tier: string; fatturato: string;
    rischio: string[]; costo: string[]; netto: string[];
    totRischio: string; totCosto: string; totNetto: string; roi: string;
  }
): Promise<void> {
  const resend = getResend();
  const notifyEmail = process.env.WAITLIST_NOTIFY_EMAIL ?? "connect@regulaeos.com";

  if (!resend) {
    console.log(`[ROI REPORT] A: ${lead.email} (${lead.company}) — esposizione ${fig.esposizione}, ROI ${fig.roi}×`);
    return;
  }

  const rows = [
    { label: "Rischio atteso evitato", vals: fig.rischio, tot: fig.totRischio },
    { label: "Costo della conformità", vals: fig.costo, tot: fig.totCosto },
    { label: "Valore netto protetto", vals: fig.netto, tot: fig.totNetto },
  ];

  const table = `
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin:16px 0;">
      <tr style="color:#94a3b8;">
        <td style="padding:8px 0;"></td>
        <td style="padding:8px 6px;text-align:right;">Anno 1</td>
        <td style="padding:8px 6px;text-align:right;">Anno 2</td>
        <td style="padding:8px 6px;text-align:right;">Anno 3</td>
        <td style="padding:8px 6px;text-align:right;font-weight:600;">Totale</td>
      </tr>
      ${rows.map((r) => `
        <tr style="border-top:1px solid #e2e8f0;">
          <td style="padding:10px 0;color:#334155;">${escapeHtml(r.label)}</td>
          ${r.vals.map((v) => `<td style="padding:10px 6px;text-align:right;color:#0f172a;">${escapeHtml(v)}</td>`).join("")}
          <td style="padding:10px 6px;text-align:right;font-weight:700;color:#0D1016;">${escapeHtml(r.tot)}</td>
        </tr>`).join("")}
    </table>`;

  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color:#0D1016;">
      <h2 style="margin:0 0 4px;">RegulaeOS</h2>
      <p style="color:#64748b;font-size:13px;margin:0 0 24px;">Report ROI — Prevenzione sanzioni EU AI Act</p>

      <p style="font-size:15px;">Ciao <strong>${escapeHtml(lead.firstName)}</strong>, ecco il report dettagliato per <strong>${escapeHtml(lead.company)}</strong>.</p>

      <div style="background:#0D1016;border-radius:12px;padding:24px;margin:20px 0;">
        <p style="color:rgba(255,255,255,0.5);font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px;">Esposizione sanzionatoria massima</p>
        <p style="color:#fff;font-size:34px;font-weight:700;margin:0;">${escapeHtml(fig.esposizione)}</p>
        <p style="color:rgba(255,255,255,0.5);font-size:12px;margin:8px 0 0;">${escapeHtml(fig.tier)} · Art. 99 AI Act</p>
      </div>

      <p style="font-size:14px;color:#334155;">Proiezione a 3 anni sul fatturato indicato (${escapeHtml(fig.fatturato)}):</p>
      ${table}

      <div style="background:#f1f5f9;border-radius:12px;padding:20px;margin:16px 0;text-align:center;">
        <p style="color:#64748b;font-size:12px;margin:0 0 4px;">Ritorno sulla prevenzione (3 anni)</p>
        <p style="font-size:32px;font-weight:700;margin:0;color:#0D1016;">${escapeHtml(fig.roi)}×</p>
      </div>

      <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.regulaeos.com"}/prenota-demo"
         style="display:inline-block;background:#0D1016;color:#fff;padding:13px 28px;border-radius:999px;text-decoration:none;font-weight:600;margin:12px 0;">
        Prenota una demo con l'avvocato
      </a>

      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
      <p style="color:#94a3b8;font-size:11px;line-height:1.6;">
        Stima indicativa basata sull'Art. 99 del Regolamento (UE) 2024/1689. Gli importi rappresentano il
        massimale teorico; per le PMI si applica il minore tra i due importi. Non costituisce consulenza
        legale personalizzata. Ricevi questa email perché hai richiesto il report su regulaeos.com.
      </p>
    </div>`;

  await resend.emails.send({
    from: FROM,
    to: lead.email,
    bcc: notifyEmail,
    subject: `Il tuo report ROI — Esposizione ${fig.esposizione} · RegulaeOS`,
    html,
  });
}

// ── Waitlist notification ──────────────────────────────────────────────────

export async function sendWaitlistNotification(entry: {
  name: string;
  email: string;
  company: string;
  role?: string;
  ai_systems: string;
  plan: string;
}): Promise<void> {
  const resend = getResend();
  const notifyEmail = process.env.WAITLIST_NOTIFY_EMAIL ?? "dridrop@gmail.com";

  if (!resend) {
    console.log(`[WAITLIST] Nuovo iscritto: ${entry.name} <${entry.email}> (${entry.company}) — piano: ${entry.plan}`);
    return;
  }

  await resend.emails.send({
    from: FROM,
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
