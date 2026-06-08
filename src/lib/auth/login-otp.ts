// src/lib/auth/login-otp.ts
// In-memory OTP store con TTL — sufficiente per single-process (dev + Vercel serverless)
// Per multi-instance production: sostituire Map con Upstash Redis (già in stack)

import { createHash } from "crypto";

interface OTPEntry {
  hash: string;       // SHA-256 hex del codice plaintext
  expiresAt: number;  // Date.now() + 10 minuti
  attempts: number;   // Max 5 tentativi
  email: string;      // Verifica incrocio email
}

// userId → OTPEntry
const otpStore = new Map<string, OTPEntry>();

const OTP_TTL_MS   = 10 * 60 * 1000; // 10 minuti
const MAX_ATTEMPTS = 5;

/** Genera codice 6 cifre, lo salva hashato, ritorna plaintext */
export function generateLoginOTP(userId: string, email: string): string {
  // Cleanup vecchio OTP dello stesso utente
  otpStore.delete(userId);

  const code = String(Math.floor(100000 + Math.random() * 900000)); // 100000–999999
  const hash = hashCode(code);

  otpStore.set(userId, {
    hash,
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
    email,
  });

  return code;
}

/** Verifica codice — ritorna success o motivo errore */
export function verifyLoginOTP(
  userId: string,
  email: string,
  code: string
): { success: true } | { success: false; reason: "expired" | "invalid" | "too_many_attempts" | "not_found" } {
  const entry = otpStore.get(userId);

  if (!entry) {
    return { success: false, reason: "not_found" };
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(userId);
    return { success: false, reason: "expired" };
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    otpStore.delete(userId);
    return { success: false, reason: "too_many_attempts" };
  }

  if (entry.email !== email) {
    entry.attempts++;
    return { success: false, reason: "invalid" };
  }

  if (hashCode(code) !== entry.hash) {
    entry.attempts++;
    return { success: false, reason: "invalid" };
  }

  // Valido — rimuovi immediatamente (monouso)
  otpStore.delete(userId);
  return { success: true };
}

/** Resend tracker — max 3 reinvii per userId ogni 5 min */
const resendTracker = new Map<string, { count: number; windowStart: number }>();

export function canResendOTP(userId: string): boolean {
  const entry = resendTracker.get(userId);
  const now = Date.now();
  const WINDOW_MS = 5 * 60 * 1000;

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    resendTracker.set(userId, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= 3) return false;
  entry.count++;
  return true;
}

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}
