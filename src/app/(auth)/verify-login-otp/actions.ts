"use server";

import { createClient } from "@/lib/supabase/server-actions";
import { createOTPCookie, verifyOTPCookie, otpCookieExists } from "@/lib/auth/otp-cookie";
import { sendLoginOTPEmail } from "@/lib/auth/email";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// ── Verifica codice inserito dall'utente ───────────────────────────────────

export async function verifyLoginOTPAction(formData: FormData) {
  const code = (formData.get("code") as string ?? "").trim();

  if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
    return { error: "Inserisci il codice a 6 cifre ricevuto via email." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.id || !user?.email) {
    return { error: "Sessione scaduta. Torna al login e riprova." };
  }

  const result = await verifyOTPCookie(user.id, code);

  if (!result.success) {
    const messages: Record<string, string> = {
      expired:           "Il codice è scaduto. Clicca 'Rinvia codice'.",
      invalid:           "Codice non corretto. Riprova.",
      too_many_attempts: "Troppi tentativi. Torna al login.",
      not_found:         "Codice non trovato. Clicca 'Rinvia codice' per riceverne uno nuovo.",
    };
    return { error: messages[result.reason] ?? "Errore di verifica." };
  }

  // OTP corretto — imposta cookie di sessione verificata (24h)
  const jar = await cookies();
  jar.set("login_otp_verified", "1", {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge:   60 * 60 * 24,
    path:     "/",
  });

  // Se MFA TOTP è attivo, va a verify-mfa; altrimenti dashboard
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel === "aal2" && aal?.currentLevel !== "aal2") {
    redirect("/verify-mfa");
  }

  redirect("/dashboard");
}

// ── Rinvia codice ──────────────────────────────────────────────────────────

export async function resendLoginOTPAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.id || !user?.email) {
    return { error: "Sessione scaduta. Accedi di nuovo." };
  }

  const newCode = await createOTPCookie(user.id);
  await sendLoginOTPEmail(user.email, newCode);

  return { success: true };
}

// ── Auto-genera OTP se l'utente arriva sulla pagina senza un codice attivo ─
// (es. sessione persistente che bypassa il flow di login)

export async function ensureOTPSent(): Promise<{ sent: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.id || !user?.email) return { sent: false };

  // Se esiste già un cookie OTP valido, non rigenerare
  const exists = await otpCookieExists();
  if (exists) return { sent: false };

  // Genera e invia
  const newCode = await createOTPCookie(user.id);
  await sendLoginOTPEmail(user.email, newCode);

  return { sent: true };
}
