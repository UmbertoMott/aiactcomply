"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server-actions";
import { registrationSchema, loginSchema } from "@/lib/auth/password-validator";
import { checkRateLimitAsync, resetRateLimitAsync } from "@/lib/auth/rate-limit";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createOTPCookie } from "@/lib/auth/otp-cookie";
import { sendLoginOTPEmail } from "@/lib/auth/email";

function getClientIP(): string {
  return "unknown"; // In Next.js 16 server actions, use headers() if forwarded IP is needed
}

async function resolveIP(): Promise<string> {
  try {
    const h = await headers();
    return (
      h.get("x-forwarded-for")?.split(",")[0].trim() ??
      h.get("x-real-ip") ??
      "unknown"
    );
  } catch {
    return "unknown";
  }
}

// ── Allowlist accesso (pre-lancio): solo questi indirizzi possono entrare ─────
// Sovrascrivibile via env AUTH_ALLOWED_EMAILS (lista separata da virgole).
const ALLOWED_EMAILS = new Set(
  (process.env.AUTH_ALLOWED_EMAILS ?? "dridrop@gmail.com")
    .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
);
function isAllowedEmail(email: string | null | undefined): boolean {
  return ALLOWED_EMAILS.has((email ?? "").trim().toLowerCase());
}

export async function signup(formData: FormData) {
  const rawData = {
    email:    formData.get("email")    as string,
    phone:    formData.get("phone")    as string,
    password: formData.get("password") as string,
    company:  formData.get("company")  as string,
  };

  const parsed = registrationSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Accesso riservato in pre-lancio
  if (!isAllowedEmail(rawData.email)) {
    return { error: "Le registrazioni sono al momento riservate. Contatta connect@regulaeos.com." };
  }

  // ── Duplicate checks (using service-role admin client) ───────────────
  try {
    const admin = createAdminClient();

    const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000, page: 1 });
    const users = listData?.users ?? [];

    const emailTaken = users.some(
      (u) => u.email?.toLowerCase() === rawData.email.toLowerCase()
    );
    if (emailTaken) {
      return { error: "Email già registrata. Accedi con le tue credenziali." };
    }

    const normalised = rawData.company.trim().toLowerCase();
    const companyTaken = users.some(
      (u) => (u.user_metadata?.company ?? "").trim().toLowerCase() === normalised
    );
    if (companyTaken) {
      return { error: "Nome azienda già registrato. Usa un nome diverso o contatta il supporto." };
    }
  } catch (adminErr) {
    console.warn("[SIGNUP] Admin pre-check skipped:", adminErr);
  }
  // ─────────────────────────────────────────────────────────────────────

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email:    rawData.email,
    password: rawData.password,
    options: {
      data: {
        phone:   rawData.phone,
        company: rawData.company,
      },
    },
  });

  if (error) {
    if (error.message.includes("already registered") || error.message.includes("already exists")) {
      return { error: "Email già registrata. Accedi con le tue credenziali." };
    }
    return { error: error.message };
  }

  const userId = data.user?.id ?? crypto.randomUUID();
  return { success: true, userId, email: rawData.email };
}

export async function loginEmail(formData: FormData) {
  const rawData = {
    email:    formData.get("email")    as string,
    password: formData.get("password") as string,
  };

  const parsed = loginSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Accesso riservato in pre-lancio: solo email in allowlist
  if (!isAllowedEmail(rawData.email)) {
    return { error: "Accesso non abilitato per questo indirizzo email." };
  }

  // Rate limiting
  const ip = await resolveIP();
  const rl = await checkRateLimitAsync(ip);
  if (!rl.allowed) {
    const mins = Math.ceil((rl.retryAfterSeconds ?? 900) / 60);
    return { error: `Troppi tentativi. Riprova tra ${mins} minuti.` };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email:    rawData.email,
    password: rawData.password,
  });

  if (error) {
    if (error.message.includes("Invalid login credentials") || error.message.includes("invalid_credentials")) {
      return { error: "Email o password non corretti." };
    }
    if (error.message.includes("Email not confirmed")) {
      return { error: "Email non ancora verificata. Controlla la tua casella di posta." };
    }
    return { error: error.message };
  }

  // Reset rate limit on success
  await resetRateLimitAsync(ip);

  // Genera OTP, salva hash in cookie httpOnly, invia email
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.id && user?.email) {
    const otpCode = await createOTPCookie(user.id);
    const sent = await sendLoginOTPEmail(user.email, otpCode);
    if (!sent.ok) {
      // Non lasciare l'utente bloccato sulla pagina di verifica senza codice.
      return { error: "Accesso verificato, ma non è stato possibile inviare il codice via email. Riprova tra poco; se il problema persiste scrivi a connect@regulaeos.com." };
    }
  }

  redirect("/verify-login-otp");
}

export async function verifyOTP(formData: FormData) {
  const code       = formData.get("code")       as string;
  const email      = formData.get("email")      as string | null;
  const redirectTo = (formData.get("redirectTo") as string) || "/dashboard";

  if (!email) {
    return { error: "Email mancante. Riprova dalla pagina di registrazione." };
  }
  if (!code || code.length !== 6) {
    return { error: "Inserisci il codice a 6 cifre." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type:  "signup",
  });

  if (error) {
    if (error.message.includes("Token has expired") || error.message.includes("expired")) {
      return { error: "Codice scaduto. Richiedine uno nuovo." };
    }
    if (error.message.includes("invalid") || error.message.includes("Invalid")) {
      return { error: "Codice errato. Riprova." };
    }
    return { error: error.message };
  }

  redirect(redirectTo);
}

export async function resendOTP(userId: string) {
  void userId;
  return { success: true };
}
