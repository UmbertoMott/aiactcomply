# Email OTP Login — Implementation Design

> **For agentic workers:** Use `superpowers:executing-plans` or `superpowers:subagent-driven-development` to implement this plan.

**Goal:** Aggiungere un secondo step obbligatorio ad ogni login — codice OTP via email — separato e indipendente dall'MFA TOTP già esistente.

**Architecture:** Dopo la verifica email+password (Supabase Auth), prima di accedere alla dashboard, l'utente deve inserire un codice OTP a 6 cifre inviato via email. Solo dopo questa verifica la sessione è considerata completa. L'MFA TOTP (già implementato) rimane un terzo step opzionale aggiuntivo.

**Tech Stack:** Next.js 16 App Router · Supabase (PostgreSQL + Auth) · Nodemailer/SMTP esistente · TypeScript

---

## Flusso completo

```
1. Utente inserisce email + password  →  /login
2. Supabase verifica credenziali      →  OK
3. Sistema genera OTP 6 cifre         →  salva hash in DB (TTL 10 min)
4. Invia email con codice             →  SMTP esistente
5. Redirect a /verify-email-otp       →  utente inserisce codice
6. Verifica OTP                       →  se corretto → marca sessione "email_verified"
7. [Se MFA attivo] → /verify-mfa      →  TOTP Authenticator
8. Accesso dashboard                  →  sessionStorage flag "email_otp_verified"
```

---

## Database

### Nuova tabella: `email_otp_sessions`

```sql
CREATE TABLE email_otp_sessions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  otp_hash      TEXT        NOT NULL,           -- bcrypt hash del codice
  expires_at    TIMESTAMPTZ NOT NULL,           -- NOW() + 10 minuti
  used          BOOLEAN     DEFAULT FALSE,
  used_at       TIMESTAMPTZ,
  ip_address    TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON email_otp_sessions(user_id, expires_at);

-- RLS: solo service role può leggere/scrivere
ALTER TABLE email_otp_sessions ENABLE ROW LEVEL SECURITY;
```

---

## File da creare / modificare

| File | Azione | Responsabilità |
|------|--------|----------------|
| `src/app/(auth)/verify-email-otp/page.tsx` | Crea | Pagina inserimento codice OTP |
| `src/app/(auth)/verify-email-otp/actions.ts` | Crea | Server action: verifica OTP |
| `src/app/api/auth/send-email-otp/route.ts` | Crea | API route: genera e invia OTP |
| `src/lib/auth/email-otp.ts` | Crea | Logica generazione, hash, verifica OTP |
| `src/lib/email/send-otp.ts` | Crea | Template email + invio SMTP |
| `src/app/(auth)/actions/auth.ts` | Modifica | Dopo login successo → chiama send-email-otp |
| `src/lib/supabase/middleware.ts` | Modifica | Blocca accesso dashboard se OTP non verificato |

---

## Dettaglio componenti

### `src/lib/auth/email-otp.ts`
```typescript
// Genera codice 6 cifre, salva hash bcrypt in DB, ritorna codice plaintext
export async function generateEmailOTP(userId: string, ip?: string): Promise<string>

// Verifica codice inserito dall'utente contro hash in DB
export async function verifyEmailOTP(userId: string, code: string): Promise<
  { success: true } | { success: false; reason: "expired" | "invalid" | "used" }
>

// Cleanup OTP scaduti (chiamato in background)
export async function cleanupExpiredOTPs(): Promise<void>
```

### `src/lib/email/send-otp.ts`
```typescript
// Invia email con codice OTP usando SMTP configurato in .env.local
export async function sendOTPEmail(email: string, code: string, expiresInMinutes: number): Promise<void>
```

Template email:
```
Oggetto: Il tuo codice di accesso AIComply — [CODICE]

Il tuo codice di verifica è: [CODICE]
Valido per 10 minuti.
Se non hai richiesto questo codice, ignora questa email.
```

### `src/app/(auth)/verify-email-otp/page.tsx`
- Form a 6 campi singola cifra (stile OTP input)
- Countdown timer 10 minuti visibile
- Pulsante "Rinvia codice" (disponibile dopo 60 secondi)
- Link "Torna al login" (invalida sessione corrente)
- Messaggio di errore su codice errato (max 5 tentativi poi blocco)

### Modifica `actions/auth.ts` — dopo login successo
```typescript
// Dopo signInWithPassword OK:
await generateEmailOTP(user.id, headersList().get("x-forwarded-for") ?? undefined);
await sendOTPEmail(user.email, otpCode, 10);
redirect("/verify-email-otp");
```

### Modifica middleware
```typescript
// Aggiunge check: se path è dashboard e cookie "otp_verified" assente → redirect /verify-email-otp
const otpVerified = request.cookies.get("otp_verified")?.value;
if (isDashboardPath && !otpVerified) {
  return NextResponse.redirect(new URL("/verify-email-otp", request.url));
}
```

Il cookie `otp_verified` viene settato dalla server action dopo verifica OTP:
- `httpOnly: true`
- `secure: true`
- `sameSite: strict`
- `maxAge: 86400` (24 ore — richiede nuovo OTP il giorno dopo)

---

## Sicurezza

| Aspetto | Implementazione |
|---------|----------------|
| Codice OTP | 6 cifre numeriche, crypto.randomInt() |
| Storage | bcrypt hash (rounds: 10), mai plaintext |
| Scadenza | 10 minuti |
| Tentativi | Max 5, poi blocco 15 minuti (rate limit esistente) |
| Monouso | Flag `used=true` dopo primo utilizzo valido |
| Cleanup | OTP scaduti eliminati ad ogni nuova generazione per utente |
| Cookie | httpOnly + secure + sameSite=strict + maxAge 24h |

---

## Integrazione con MFA esistente

L'ordine degli step dopo questa implementazione:

```
Login (email+password)
  ↓
[NUOVO] Verifica email OTP → /verify-email-otp
  ↓
[ESISTENTE - se attivo] Verifica TOTP → /verify-mfa
  ↓
Dashboard
```

Il middleware controlla in sequenza:
1. Sessione Supabase valida → altrimenti /login
2. Cookie `otp_verified` presente → altrimenti /verify-email-otp
3. AAL2 se MFA attivo → altrimenti /verify-mfa

---

## Edge cases

- **Email non ricevuta:** bottone "Rinvia" dopo 60s, max 3 invii per sessione
- **OTP scaduto durante inserimento:** messaggio chiaro con link "Richiedi nuovo codice"
- **OAuth login (Google/GitHub):** OTP NON richiesto — già verificato dall'OAuth provider
- **Rate limit superato:** redirect /login con messaggio "Troppi tentativi, riprova tra 15 minuti"
- **SMTP down:** fallback con messaggio "Email in ritardo, riprova tra qualche minuto" + log errore

---

## Non in scope

- Verifica via SMS (richiede Twilio, fuori budget attuale)
- OTP push notification (app mobile non esiste)
- "Ricorda questo dispositivo per 30 giorni" (semplifica UX ma riduce sicurezza — da valutare v2)
