"use server";

import { setSession, setSessionLong } from "@/lib/auth/mock-auth";
import { registrationSchema, loginSchema } from "@/lib/auth/password-validator";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { sendOTPEmail, sendWelcomeEmail } from "@/lib/auth/email";

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const MOCK_OTPS = new Map<string, { code: string; expires: number }>();

export async function signup(formData: FormData) {
  const rawData = {
    email: formData.get("email") as string,
    phone: formData.get("phone") as string,
    password: formData.get("password") as string,
    company: formData.get("company") as string,
  };

  const parsed = registrationSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const otp = generateOTP();
  const userId = crypto.randomUUID();
  MOCK_OTPS.set(userId, { code: otp, expires: Date.now() + 10 * 60 * 1000 });

  const cookieStore = await cookies();
  cookieStore.set("pending_user", JSON.stringify({ userId, ...rawData }), {
    httpOnly: true,
    maxAge: 600,
    path: "/",
  });

  // Try email first, falls back to console.log
  await sendOTPEmail(rawData.email, otp, rawData.company);

  return { success: true, userId };
}

export async function loginEmail(formData: FormData) {
  const rawData = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    remember: formData.get("remember") === "on",
  };

  const parsed = loginSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const cookieStore = await cookies();
  const pending = cookieStore.get("pending_user");

  const sessionData = {
    id: crypto.randomUUID(),
    email: rawData.email,
    phone: "",
    company: "Demo",
    lastLogin: new Date().toISOString(),
    phoneVerified: true,
  };

  if (pending) {
    const userData = JSON.parse(pending.value);
    sessionData.id = userData.userId;
    sessionData.phone = userData.phone || "";
    sessionData.company = userData.company || "";
    cookieStore.delete("pending_user");
  }

  if (rawData.remember) {
    await setSessionLong(sessionData);
  } else {
    await setSession(sessionData);
  }

  redirect("/dashboard");
}

export async function verifyOTP(formData: FormData) {
  const code = formData.get("code") as string;
  const userId = formData.get("userId") as string;

  const record = MOCK_OTPS.get(userId);
  if (!record) {
    return { error: "Codice non valido o scaduto. Richiedine uno nuovo." };
  }
  if (record.code !== code) {
    return { error: "Codice errato. Riprova." };
  }
  if (record.expires < Date.now()) {
    MOCK_OTPS.delete(userId);
    return { error: "Codice scaduto. Richiedine uno nuovo." };
  }

  MOCK_OTPS.delete(userId);

  const cookieStore = await cookies();
  const pending = cookieStore.get("pending_user");
  if (pending) {
    const userData = JSON.parse(pending.value);
    await setSession({
      id: userData.userId,
      email: userData.email,
      phone: userData.phone,
      company: userData.company,
      lastLogin: new Date().toISOString(),
      phoneVerified: true,
    });
    cookieStore.delete("pending_user");
    await sendWelcomeEmail(userData.email, userData.company);
  }

  redirect("/dashboard");
}

export async function resendOTP(userId: string) {
  const otp = generateOTP();
  MOCK_OTPS.set(userId, { code: otp, expires: Date.now() + 10 * 60 * 1000 });

  const cookieStore = await cookies();
  const pending = cookieStore.get("pending_user");
  if (pending) {
    const userData = JSON.parse(pending.value);
    await sendOTPEmail(userData.email, otp, userData.company);
  }

  return { success: true };
}

export async function getMockOTP(userId: string) {
  const record = MOCK_OTPS.get(userId);
  if (!record || record.expires < Date.now()) return null;
  return record.code;
}
