# Email OTP Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere un codice OTP via email obbligatorio ad ogni login, come secondo step dopo email+password, separato dall'MFA TOTP già esistente.

**Architecture:** Dopo `signInWithPassword` OK, genera un codice 6 cifre, lo salva hashato in-memory (Map con TTL), invia email via SMTP esistente, e redirige a `/verify-login-otp`. Il middleware blocca l'accesso al dashboard se il cookie `login_otp_verified` è assente. Il cookie dura 24h — quindi il giorno dopo si rifà l'OTP. OAuth login (Google/GitHub) è esente. MFA TOTP rimane terzo step opzionale.

**Tech Stack:** Next.js 16 App Router · TypeScript · nodemailer (già installato) · crypto (built-in Node.js) · bcryptjs (già nel progetto per rate-limit)

---

## File map

| File | Azione | Responsabilità |
|------|--------|----------------|
| `src/lib/auth/login-otp.ts` | **Crea** | Genera, salva hash, verifica OTP — store in-memory con TTL |
| `src/lib/auth/email.ts` | **Modifica** | Aggiunge `sendLoginOTPEmail()` con template dedicato |
| `src/app/(auth)/verify-login-otp/page.tsx` | **Crea** | Pagina inserimento codice (pattern identico a verify-mfa) |
| `src/app/(auth)/verify-login-otp/actions.ts` | **Crea** | Server action: verifica OTP → setta cookie → redirect |
| `src/app/(auth)/actions/auth.ts` | **Modifica** | Dopo login OK: genera OTP, invia email, redirect `/verify-login-otp` |
| `src/lib/supabase/middleware.ts` | **Modifica** | Controlla cookie `login_otp_verified` prima di accesso dashboard |

---

## Task 1: Libreria OTP (`src/lib/auth/login-otp.ts`)

**Files:**
- Create: `src/lib/auth/login-otp.ts`

- [ ] **Step 1: Crea il file**

```typescript
// src/lib/auth/login-otp.ts
// In-memory OTP store con TTL — sufficiente per single-process (dev + Vercel serverless)
// Per multi-instance production: sostituire Map con Upstash Redis (già in stack)

interface OTPEntry {
  hash: string;       // SHA-256 hex del codice plaintext
  expiresAt: number;  // Date.now() + 10 minuti
  attempts: number;   // Max 5 tentativi
  email: string;      // Per sicurezza extra — verifica anche email
}

// userId → OTPEntry
const otpStore = new Map<string, OTPEntry>();

const OTP_TTL_MS   = 10 * 60 * 1000; // 10 minuti
const MAX_ATTEMPTS = 5;

/** Genera codice 6 cifre, lo salva hashato, ritorna plaintext */
export function generateLoginOTP(userId: string, email: string): string {
  // Cleanup vecchi OTP dello stesso utente
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

/** Rigenerazione OTP (bottone "Rinvia codice") — max 3 reinvii per userId ogni 5 min */
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
  // Node.js crypto — nessuna dipendenza aggiuntiva
  const { createHash } = require("crypto") as typeof import("crypto");
  return createHash("sha256").update(code).digest("hex");
}
```

- [ ] **Step 2: Verifica TypeScript**

```bash
cd /Users/umbertomottola/Desktop/open\ code\ -\ ai\ act\ saas/aicomply/.claude/worktrees/goofy-villani-d80bd6
npx tsc --noEmit 2>&1 | grep "login-otp"
```
Expected: nessun output (zero errori)

- [ ] **Step 3: Commit**

```bash
git -C "/Users/umbertomottola/Desktop/open code - ai act saas/aicomply/.claude/worktrees/goofy-villani-d80bd6" \
  add src/lib/auth/login-otp.ts && \
git -C "/Users/umbertomottola/Desktop/open code - ai act saas/aicomply/.claude/worktrees/goofy-villani-d80bd6" \
  commit -m "feat: add login OTP generator/verifier with in-memory TTL store"
```

---

## Task 2: Template email OTP login (`src/lib/auth/email.ts`)

**Files:**
- Modify: `src/lib/auth/email.ts` (aggiungere in fondo al file)

- [ ] **Step 1: Aggiungi `sendLoginOTPEmail` in fondo al file esistente**

```typescript
// Aggiungi in fondo a src/lib/auth/email.ts

export async function sendLoginOTPEmail(email: string, otp: string): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) {
    console.log(`[EMAIL MOCK] Login OTP per ${email}: ${otp}`);
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || "AIComply <noreply@aicomply.app>",
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
          Nessuna azione è necessaria — il tuo account è al sicuro.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 11px; margin: 0;">
          AIComply · Compliance EU AI Act · Non rispondere a questa email
        </p>
      </div>
    `,
  });
}
```

- [ ] **Step 2: Verifica TypeScript**

```bash
cd /Users/umbertomottola/Desktop/open\ code\ -\ ai\ act\ saas/aicomply/.claude/worktrees/goofy-villani-d80bd6
npx tsc --noEmit 2>&1 | grep "email.ts"
```
Expected: nessun output

- [ ] **Step 3: Commit**

```bash
git -C "/Users/umbertomottola/Desktop/open code - ai act saas/aicomply/.claude/worktrees/goofy-villani-d80bd6" \
  add src/lib/auth/email.ts && \
git -C "/Users/umbertomottola/Desktop/open code - ai act saas/aicomply/.claude/worktrees/goofy-villani-d80bd6" \
  commit -m "feat: add sendLoginOTPEmail template"
```

---

## Task 3: Server action verifica OTP (`src/app/(auth)/verify-login-otp/actions.ts`)

**Files:**
- Create: `src/app/(auth)/verify-login-otp/actions.ts`

- [ ] **Step 1: Crea il file**

```typescript
// src/app/(auth)/verify-login-otp/actions.ts
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

  // Se MFA è attivo, va a verify-mfa; altrimenti dashboard
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

  return { success: true };
}
```

- [ ] **Step 2: Verifica TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "verify-login-otp"
```
Expected: nessun output

- [ ] **Step 3: Commit**

```bash
git -C "/Users/umbertomottola/Desktop/open code - ai act saas/aicomply/.claude/worktrees/goofy-villani-d80bd6" \
  add src/app/\(auth\)/verify-login-otp/actions.ts && \
git -C "/Users/umbertomottola/Desktop/open code - ai act saas/aicomply/.claude/worktrees/goofy-villani-d80bd6" \
  commit -m "feat: server action verifyLoginOTPAction + resendLoginOTPAction"
```

---

## Task 4: Pagina verifica OTP (`src/app/(auth)/verify-login-otp/page.tsx`)

**Files:**
- Create: `src/app/(auth)/verify-login-otp/page.tsx`

- [ ] **Step 1: Crea il file** (pattern identico a `/verify-mfa/page.tsx`)

```tsx
// src/app/(auth)/verify-login-otp/page.tsx
"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { verifyLoginOTPAction, resendLoginOTPAction } from "./actions";

export default function VerifyLoginOTPPage() {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [resendMsg, setResendMsg] = useState("");
  const [resendCooldown, setResendCooldown] = useState(60); // secondi prima di poter rinviare
  const [isPending, startTransition] = useTransition();
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
    // Countdown per bottone "Rinvia"
    const timer = setInterval(() => {
      setResendCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  function handleChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(0, 1);
    setCode(newCode);
    if (value && index < 5) inputsRef.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) setCode(pasted.split(""));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      setError("Inserisci il codice completo di 6 cifre.");
      return;
    }
    setError("");
    const fd = new FormData();
    fd.append("code", fullCode);
    startTransition(async () => {
      const result = await verifyLoginOTPAction(fd);
      if (result?.error) setError(result.error);
    });
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setResendMsg("");
    startTransition(async () => {
      const result = await resendLoginOTPAction();
      if (result?.error) {
        setError(result.error);
      } else {
        setResendMsg("Nuovo codice inviato! Controlla la tua email.");
        setResendCooldown(60);
        setCode(["", "", "", "", "", ""]);
        inputsRef.current[0]?.focus();
      }
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-[#0D1016] rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-xl">✉️</span>
          </div>
          <h1 className="text-2xl font-bold text-[#0D1016]">Verifica email</h1>
          <p className="text-sm text-[#64748B] mt-2">
            Abbiamo inviato un codice di 6 cifre alla tua email.<br />
            Inseriscilo qui sotto per accedere.
          </p>
        </div>

        {/* OTP Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 6 input singola cifra */}
          <div className="flex gap-2 justify-center" onPaste={handlePaste}>
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputsRef.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-11 h-14 text-center text-xl font-bold border-2 rounded-xl
                           border-[#E2E8F0] focus:border-[#0D1016] focus:outline-none
                           transition-colors bg-[#F8FAFC]"
              />
            ))}
          </div>

          {/* Errore */}
          {error && (
            <p className="text-sm text-red-600 text-center bg-red-50 rounded-lg py-2 px-3">
              {error}
            </p>
          )}

          {/* Messaggio rinvio */}
          {resendMsg && (
            <p className="text-sm text-green-600 text-center bg-green-50 rounded-lg py-2 px-3">
              {resendMsg}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isPending || code.join("").length !== 6}
            className="w-full bg-[#0D1016] text-white rounded-xl py-3 font-semibold
                       disabled:opacity-40 disabled:cursor-not-allowed transition-opacity
                       hover:opacity-90"
          >
            {isPending ? "Verifica in corso…" : "Verifica codice"}
          </button>
        </form>

        {/* Rinvia codice */}
        <div className="mt-6 text-center">
          <p className="text-sm text-[#64748B]">Non hai ricevuto il codice?</p>
          <button
            onClick={handleResend}
            disabled={resendCooldown > 0 || isPending}
            className="mt-1 text-sm font-medium text-[#0D1016] disabled:text-[#94A3B8]
                       disabled:cursor-not-allowed hover:underline"
          >
            {resendCooldown > 0 ? `Rinvia tra ${resendCooldown}s` : "Rinvia codice"}
          </button>
        </div>

        {/* Torna al login */}
        <div className="mt-4 text-center">
          <Link href="/login" className="text-sm text-[#64748B] hover:text-[#0D1016]">
            ← Torna al login
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verifica TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "verify-login-otp"
```
Expected: nessun output

- [ ] **Step 3: Commit**

```bash
git -C "/Users/umbertomottola/Desktop/open code - ai act saas/aicomply/.claude/worktrees/goofy-villani-d80bd6" \
  add src/app/\(auth\)/verify-login-otp/page.tsx && \
git -C "/Users/umbertomottola/Desktop/open code - ai act saas/aicomply/.claude/worktrees/goofy-villani-d80bd6" \
  commit -m "feat: pagina verify-login-otp con 6-digit OTP input + resend"
```

---

## Task 5: Modifica `loginEmail` action per inviare OTP

**Files:**
- Modify: `src/app/(auth)/actions/auth.ts` righe 84-115 (funzione `loginEmail`)

- [ ] **Step 1: Aggiungi import in cima al file**

Alla riga dopo `import { headers } from "next/headers";` aggiungi:

```typescript
import { generateLoginOTP } from "@/lib/auth/login-otp";
import { sendLoginOTPEmail } from "@/lib/auth/email";
```

- [ ] **Step 2: Modifica la parte finale di `loginEmail`**

Sostituisci il blocco finale di `loginEmail` (da `// Reset rate limit on success` fino alla fine della funzione):

```typescript
  // Reset rate limit on success
  await resetRateLimitAsync(ip);

  // Genera e invia OTP via email — step obbligatorio per tutti
  const supabaseForUser = await createClient();
  const { data: { user } } = await supabaseForUser.auth.getUser();
  if (user?.id && user?.email) {
    const otpCode = generateLoginOTP(user.id, user.email);
    await sendLoginOTPEmail(user.email, otpCode);
  }

  redirect("/verify-login-otp");
}
```

Il file completo della funzione `loginEmail` diventa:

```typescript
export async function loginEmail(formData: FormData) {
  const rawData = {
    email:    formData.get("email")    as string,
    password: formData.get("password") as string,
  };

  const parsed = loginSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
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

  // Genera e invia OTP via email — step obbligatorio per tutti
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.id && user?.email) {
    const otpCode = generateLoginOTP(user.id, user.email);
    await sendLoginOTPEmail(user.email, otpCode);
  }

  redirect("/verify-login-otp");
}
```

- [ ] **Step 3: Verifica TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -10
```
Expected: nessun output (zero errori)

- [ ] **Step 4: Commit**

```bash
git -C "/Users/umbertomottola/Desktop/open code - ai act saas/aicomply/.claude/worktrees/goofy-villani-d80bd6" \
  add src/app/\(auth\)/actions/auth.ts && \
git -C "/Users/umbertomottola/Desktop/open code - ai act saas/aicomply/.claude/worktrees/goofy-villani-d80bd6" \
  commit -m "feat: loginEmail ora genera OTP email e redirect a /verify-login-otp"
```

---

## Task 6: Middleware — blocca dashboard senza cookie OTP

**Files:**
- Modify: `src/lib/supabase/middleware.ts`

- [ ] **Step 1: Aggiungi check cookie OTP nel middleware**

Sostituisci il blocco `// ── MFA enforcement` con questa versione aggiornata:

```typescript
  // ── Email OTP enforcement — obbligatorio ad ogni login (24h cookie) ────────
  const isVerifyOTP = pathname.startsWith("/verify-login-otp");
  if (user && isDashboard) {
    const otpVerified = request.cookies.get("login_otp_verified")?.value;
    if (!otpVerified) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/verify-login-otp";
      return NextResponse.redirect(redirectUrl);
    }
  }

  // ── MFA enforcement ────────────────────────────────────────────────────────
  // Se l'utente ha TOTP attivo ma la sessione è ancora AAL1, richiede verifica
  if (user && isDashboard) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal?.currentLevel !== "aal2") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/verify-mfa";
      return NextResponse.redirect(redirectUrl);
    }
  }
```

Aggiorna anche la riga `isAuthPage` per includere `/verify-login-otp`:

```typescript
  const isAuthPage  = pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/verify");
  const isVerifyMFA = pathname.startsWith("/verify-mfa");
  const isVerifyOTP = pathname.startsWith("/verify-login-otp");
  const isDashboard = pathname.startsWith("/dashboard");
```

E aggiorna il redirect utente autenticato:

```typescript
  // ── Redirect utente autenticato fuori dalle pagine auth ────────────────────
  if (user && isAuthPage && !isVerifyMFA && !isVerifyOTP) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    return NextResponse.redirect(redirectUrl);
  }
```

- [ ] **Step 2: Verifica TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -10
```
Expected: nessun output

- [ ] **Step 3: Commit**

```bash
git -C "/Users/umbertomottola/Desktop/open code - ai act saas/aicomply/.claude/worktrees/goofy-villani-d80bd6" \
  add src/lib/supabase/middleware.ts && \
git -C "/Users/umbertomottola/Desktop/open code - ai act saas/aicomply/.claude/worktrees/goofy-villani-d80bd6" \
  commit -m "feat: middleware blocca dashboard senza cookie login_otp_verified"
```

---

## Task 7: Test manuale e merge

- [ ] **Step 1: Avvia il server**

```bash
cd "/Users/umbertomottola/Desktop/open code - ai act saas/aicomply"
npm run dev -- --webpack
```

- [ ] **Step 2: Testa il flusso completo**

1. Apri http://localhost:3000/login
2. Inserisci email e password validi → click "Accedi"
3. Verifica redirect a http://localhost:3000/verify-login-otp
4. Controlla console server: `[EMAIL MOCK] Login OTP per <email>: <codice>`
5. Inserisci il codice → click "Verifica codice"
6. Verifica redirect a /dashboard (o /verify-mfa se MFA attivo)
7. Verifica cookie `login_otp_verified` in DevTools → Application → Cookies

- [ ] **Step 3: Testa codice errato**

1. Vai a /verify-login-otp
2. Inserisci `123456` → verifica messaggio "Codice non corretto"
3. Inserisci il codice corretto → verifica che funziona ancora

- [ ] **Step 4: Testa "Rinvia codice"**

1. Attendi 60 secondi (o cambia `resendCooldown` init a 0 per il test)
2. Click "Rinvia codice" → verifica nuovo codice in console
3. Il vecchio codice non deve più funzionare

- [ ] **Step 5: Merge su main**

```bash
git -C "/Users/umbertomottola/Desktop/open code - ai act saas/aicomply" \
  merge claude/goofy-villani-d80bd6 --no-edit
```

Poi push manuale: `git push origin main`
