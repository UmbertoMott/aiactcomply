"use server";

import { createClient } from "@/lib/supabase/server-actions";
import { verifyLoginOTP, canResendOTP, generateLoginOTP } from "@/lib/auth/login-otp";
import { sendLoginOTPEmail } from "@/lib/auth/email";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function verifyLoginOTPAction(formData: FormData) {
  const code = (formData.get("code") as string ?? "").trim();

  if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
    return { error: "Inserisci il codice a 6 cifre ricevuto via email." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.id || !user?.email) {
    redirect("/login");
  }

  const result = verifyLoginOTP(user.id, user.email, code);

  if (!result.success) {
    const messages: Record<string, string> = {
      expired:           "Il codice è scaduto. Richiedi un nuovo codice.",
      invalid:           "Codice non corretto. Riprova.",
      too_many_attempts: "Troppi tentativi. Effettua di nuovo il login.",
      not_found:         "Sessione non trovata. Effettua di nuovo il login.",
    };
    return { error: messages[result.reason] ?? "Errore di verifica." };
  }

  // Setta cookie di verifica OTP — httpOnly, 24 ore
  const cookieStore = await cookies();
  cookieStore.set("login_otp_verified", "1", {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge:   60 * 60 * 24, // 24 ore
    path:     "/",
  });

  // Se MFA TOTP è attivo, va a verify-mfa; altrimenti dashboard
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel === "aal2" && aal?.currentLevel !== "aal2") {
    redirect("/verify-mfa");
  }

  redirect("/dashboard");
}

export async function resendLoginOTPAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.id || !user?.email) {
    return { error: "Sessione scaduta. Accedi di nuovo." };
  }

  if (!canResendOTP(user.id)) {
    return { error: "Hai già richiesto troppi codici. Attendi qualche minuto." };
  }

  const newCode = generateLoginOTP(user.id, user.email);
  await sendLoginOTPEmail(user.email, newCode);

  // In dev/mock mode (SMTP not configured), expose code so user can still log in
  const smtpConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
  if (!smtpConfigured && process.env.NODE_ENV !== "production") {
    return { success: true, devCode: newCode };
  }

  return { success: true };
}

/**
 * Chiamata al mount della pagina verify-login-otp.
 * Se non esiste un OTP valido per l'utente (es. sessione persistente che bypassa il login),
 * ne genera e invia uno automaticamente.
 * Restituisce anche il devCode se SMTP/Resend non è configurato.
 */
export async function ensureOTPSent(): Promise<{ code: string | null; sent: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id || !user?.email) return { code: null, sent: false };

  const { getDevOTPCode, generateLoginOTP } = await import("@/lib/auth/login-otp");

  // Se esiste già un OTP valido, restituisce solo il devCode (se disponibile)
  const existingDevCode = getDevOTPCode(user.id);
  if (existingDevCode) {
    return { code: existingDevCode, sent: false };
  }

  // Nessun OTP attivo → genera e invia
  const newCode = generateLoginOTP(user.id, user.email);
  await sendLoginOTPEmail(user.email, newCode);

  const smtpConfigured = !!(process.env.RESEND_API_KEY);
  const devCode = (!smtpConfigured && process.env.NODE_ENV !== "production")
    ? newCode
    : getDevOTPCode(user.id);

  return { code: devCode, sent: true };
}

/** @deprecated usa ensureOTPSent */
export async function getDevOTPHint(): Promise<{ code: string | null }> {
  const { code } = await ensureOTPSent();
  return { code };
}
