// src/lib/auth/otp-cookie.ts
// OTP storage via httpOnly cookie — works in serverless (no shared memory needed)

import { createHash, randomInt } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "otp_pending";
const TTL_MS      = 10 * 60 * 1000; // 10 minuti
const MAX_ATTEMPTS = 5;

interface OTPPayload {
  hash: string;   // SHA-256 del codice
  exp:  number;   // timestamp scadenza
  att:  number;   // tentativi usati
  uid:  string;   // userId — doppio controllo
}

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/** Genera codice 6 cifre, salva hash in cookie httpOnly, restituisce plaintext */
export async function createOTPCookie(userId: string): Promise<string> {
  const code = String(randomInt(100000, 1000000)); // 100000–999999
  const payload: OTPPayload = {
    hash: hashCode(code),
    exp:  Date.now() + TTL_MS,
    att:  0,
    uid:  userId,
  };

  const jar = await cookies();
  jar.set(COOKIE_NAME, JSON.stringify(payload), {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge:   600,   // 10 minuti
    path:     "/",
  });

  return code;
}

type VerifyResult =
  | { success: true }
  | { success: false; reason: "expired" | "invalid" | "too_many_attempts" | "not_found" };

/** Verifica codice — consuma il cookie se corretto */
export async function verifyOTPCookie(userId: string, code: string): Promise<VerifyResult> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;

  if (!raw) return { success: false, reason: "not_found" };

  let payload: OTPPayload;
  try {
    payload = JSON.parse(raw) as OTPPayload;
  } catch {
    return { success: false, reason: "not_found" };
  }

  if (payload.uid !== userId) return { success: false, reason: "not_found" };
  if (Date.now() > payload.exp)  { deleteOTPCookie(); return { success: false, reason: "expired" }; }
  if (payload.att >= MAX_ATTEMPTS) { deleteOTPCookie(); return { success: false, reason: "too_many_attempts" }; }

  if (hashCode(code) !== payload.hash) {
    // Incrementa tentativi
    payload.att++;
    jar.set(COOKIE_NAME, JSON.stringify(payload), {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge:   Math.max(0, Math.floor((payload.exp - Date.now()) / 1000)),
      path:     "/",
    });
    return { success: false, reason: "invalid" };
  }

  // Corretto — elimina il cookie OTP
  deleteOTPCookie();
  return { success: true };
}

export async function deleteOTPCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function otpCookieExists(): Promise<boolean> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return false;
  try {
    const p = JSON.parse(raw) as OTPPayload;
    return Date.now() < p.exp;
  } catch {
    return false;
  }
}
