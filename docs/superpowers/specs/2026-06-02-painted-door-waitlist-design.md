# Painted Door / Waitlist System — Design Spec

**Goal:** Validate purchase intent before building Stripe. Replace paid-plan CTAs with a waitlist form that captures qualified leads and notifies the founder per signup.

**Architecture:** Public `/waitlist` landing page + `POST /api/waitlist` + `GET /api/waitlist/count` + pricing page CTA swap + Supabase `waitlist` table.

**Tech Stack:** Next.js 16 App Router, Supabase (service role for insert, public count), Zod validation, nodemailer (existing `email.ts` pattern), TypeScript.

---

## 1. Database — Supabase `waitlist` table

```sql
create table public.waitlist (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text not null unique,
  company      text not null,
  role         text,                          -- CTO/CIO | Legal/Compliance | DPO | Founder | Altro
  ai_systems   text not null,                 -- "1" | "2-5" | "6-20" | "20+"
  plan         text not null default 'starter', -- "starter" | "professional"
  created_at   timestamptz not null default now()
);

-- RLS
alter table public.waitlist enable row level security;

-- Anyone can insert (public form)
create policy "public insert" on public.waitlist
  for insert with check (true);

-- Only service role can read (founder dashboard / exports)
-- No select policy = only service role can query
```

---

## 2. API Routes

### `POST /api/waitlist`

**File:** `src/app/api/waitlist/route.ts`

**Auth:** None — public endpoint.

**Request body (Zod):**
```ts
{
  name:       z.string().min(2).max(100),
  email:      z.string().email(),
  company:    z.string().min(1).max(100),
  role:       z.string().optional(),
  ai_systems: z.enum(["1", "2-5", "6-20", "20+"]),
  plan:       z.enum(["starter", "professional"]).default("starter"),
}
```

**Logic:**
1. Validate with Zod → 400 on failure
2. Insert via Supabase service role client
3. If insert fails with unique violation on `email` → return `{ success: true, already: true }` with 200 (gentle duplicate handling, not an error)
4. On success → send notification email to `dridrop@gmail.com` via existing `sendNotificationEmail()` in `src/lib/auth/email.ts`
5. Return `{ success: true }` with 201

**Email notification format:**
```
Subject: 🎯 Nuovo iscritto waitlist AIComply — [nome] ([azienda])
Body (HTML): tabella con Nome, Email, Azienda, Ruolo, Sistemi AI, Piano, Timestamp
```

### `GET /api/waitlist/count`

**File:** `src/app/api/waitlist/count/route.ts`

**Auth:** None — public endpoint, exposes only aggregate count.

**Logic:** `SELECT count(*) FROM waitlist` via Supabase service role.

**Response:** `{ count: number }` — cached with `revalidate: 60` (aggiorna ogni minuto).

---

## 3. `/waitlist` Page

**File:** `src/app/waitlist/page.tsx`

**Layout:** Reusa `src/app/(auth)/layout.tsx` visually (split 50/50 dark/light) ma è una pagina standalone — non usa l'auth layout direttamente, replica lo stesso stile.

### Left panel (dark `#0D1016`)

- Badge `EARLY ACCESS` (violet `#6366f1`)
- H2: *"Sii tra i primi a usare AIComply"*
- Paragraph urgency: *"L'AI Act scade ad agosto 2025. Le aziende che iniziano oggi arrivano conformi in tempo."*
- 3 benefit bullets (green checkmarks):
  - Accesso anticipato alla piattaforma completa
  - Onboarding 1:1 gratuito con il team
  - Prezzo bloccato a vita per i fondatori
- Live counter: *"[N] aziende già in lista"* — fetched client-side from `GET /api/waitlist/count`, fallback silenzioso se offline

### Right panel (white `#FAFAF9`)

- Logo AIComply → `/` (link)
- `?plan=starter` → show pill "Piano Starter" above title
- `?plan=professional` → show pill "Piano Professional" above title
- Title: *"Entra in lista"*

**Form fields:**
| Campo | Tipo | Required | Opzioni |
|-------|------|----------|---------|
| Nome e cognome | text input | ✓ | — |
| Email aziendale | email input | ✓ | — |
| Azienda | text input | ✓ | — |
| Sistemi AI usati | select | ✓ | 1 · 2–5 · 6–20 · 20+ |
| Ruolo | select | — | CTO/CIO · Legal/Compliance · DPO · Founder · Altro |

**CTA button:** "Richiedi accesso anticipato →" — calls `POST /api/waitlist`

**Sub-CTA note:** *"Nessuna carta richiesta. Ti contatteremo entro 24 ore."*

**States:**
- `idle` → form visible
- `loading` → button disabled + spinner
- `success` → form hidden, green checkmark + *"Sei in lista! Ti contatteremo a [email] entro 24 ore."*
- `already` → same as success with copy *"Questa email è già in lista — ti contatteremo presto."*
- `error` → inline error below CTA, form remains editable

---

## 4. Pricing Page — CTA Swap

**File:** `src/app/pricing/page.tsx`

**Changes:**
- Starter tier: `cta = "Richiedi accesso anticipato"`, `ctaHref = "/waitlist?plan=starter"`, `ctaStyle = "primary"`
- Professional tier: `cta = "Richiedi accesso anticipato"`, `ctaHref = "/waitlist?plan=professional"`, `ctaStyle = "ghost"`
- Scanner tier: unchanged (`cta = "Inizia gratis"`, `ctaHref = "/scanner"`)
- Enterprise band: unchanged (`mailto:sales@aicomply.eu`)
- Remove `"14 giorni gratis"` from descriptions (non applicabile in waitlist mode)

---

## 5. Email — `sendNotificationEmail`

**File:** `src/lib/auth/email.ts` — add new export:

```ts
export async function sendWaitlistNotification(entry: {
  name: string; email: string; company: string;
  role?: string; ai_systems: string; plan: string;
}): Promise<void>
```

Follows existing pattern: if SMTP not configured → `console.log("[WAITLIST]", entry)` and return silently.

---

## 6. `.gitignore`

Add `.superpowers/` if not already present.

---

## File Map

| Action | File |
|--------|------|
| Create | `src/app/waitlist/page.tsx` |
| Create | `src/app/api/waitlist/route.ts` |
| Create | `src/app/api/waitlist/count/route.ts` |
| Modify | `src/app/pricing/page.tsx` |
| Modify | `src/lib/auth/email.ts` |
| Modify | `.gitignore` |
| DB migration | Supabase SQL (manual, provided in Task 1) |
