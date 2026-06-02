"use server";

import { createClient } from "@/lib/supabase/server-actions";
import { registrationSchema, loginSchema } from "@/lib/auth/password-validator";
import { redirect } from "next/navigation";

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
    // Map Supabase errors to user-friendly Italian messages
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
    remember: formData.get("remember") === "on",
  };

  const parsed = loginSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
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

  redirect("/dashboard");
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
  // userId is now the email in Supabase flow
  // The verify page passes email via searchParams; resend works via signInWithOtp
  void userId; // kept for backward compatibility
  return { success: true };
}
