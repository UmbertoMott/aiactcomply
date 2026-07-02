# Painted Door / Waitlist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace paid-plan CTAs on the pricing page with a waitlist form that captures qualified leads in Supabase and emails the founder on every signup.

**Architecture:** Public `/waitlist` page (split dark/light layout) → `POST /api/waitlist` (Zod validation + Supabase service role insert + email notification) + `GET /api/waitlist/count` (aggregate count, 60s cache). Pricing page CTAs point to `/waitlist?plan=starter|professional`. No auth required anywhere in this flow.

**Tech Stack:** Next.js 16 App Router, TypeScript, Zod, Supabase (service role via existing `createAuditClient`), nodemailer (existing pattern in `src/lib/auth/email.ts`).

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/app/waitlist/page.tsx` | Split landing page + form + states |
| Create | `src/app/api/waitlist/route.ts` | POST — validate, insert, notify |
| Create | `src/app/api/waitlist/count/route.ts` | GET — public count, 60s revalidate |
| Modify | `src/lib/auth/email.ts` | Add `sendWaitlistNotification()` |
| Modify | `src/app/pricing/page.tsx` | Swap CTAs + update FAQ + hero copy |
| DB | Supabase SQL editor (manual step) | Create `waitlist` table + RLS |

---

## Task 1: Database — Create `waitlist` table in Supabase

**Files:**
- DB: Supabase SQL editor (manual — no migration runner configured)

- [ ] **Step 1: Open Supabase SQL editor**

Go to: `https://supabase.com/dashboard/project/vcemjcxxgytcwkxevqhj/sql/new`

- [ ] **Step 2: Run this SQL**

```sql
create table public.waitlist (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text not null unique,
  company      text not null,
  role         text,
  ai_systems   text not null,
  plan         text not null default 'starter',
  created_at   timestamptz not null default now()
);

alter table public.waitlist enable row level security;

-- Public can insert (no auth required for waitlist form)
create policy "public_insert_waitlist"
  on public.waitlist
  for insert
  with check (true);

-- No select policy = only service role can read
```

- [ ] **Step 3: Verify table was created**

In Supabase Table Editor, confirm `waitlist` table exists with all 7 columns.

---

## Task 2: Email — `sendWaitlistNotification` helper

**Files:**
- Modify: `src/lib/auth/email.ts`

- [ ] **Step 1: Add `sendWaitlistNotification` to the end of `src/lib/auth/email.ts`**

Add this function after `sendWelcomeEmail`. It follows the exact same pattern (check transporter, fallback to console.log):

```typescript
export async function sendWaitlistNotification(entry: {
  name: string;
  email: string;
  company: string;
  role?: string;
  ai_systems: string;
  plan: string;
}): Promise<void> {
  const notifyEmail = process.env.WAITLIST_NOTIFY_EMAIL ?? "dridrop@gmail.com";
  const transporter = getTransporter();

  if (!transporter) {
    console.log(`[WAITLIST] Nuovo iscritto: ${entry.name} <${entry.email}> (${entry.company}) — piano: ${entry.plan}`);
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || "AIComply <noreply@aicomply.app>",
    to: notifyEmail,
    subject: `🎯 Nuovo iscritto waitlist — ${escapeHtml(entry.name)} (${escapeHtml(entry.company)})`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #6366f1;">AIComply — Nuovo iscritto waitlist</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:8px 0;color:#64748b;width:40%;">Nome</td>
            <td style="padding:8px 0;font-weight:500;">${escapeHtml(entry.name)}</td>
          </tr>
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:8px 0;color:#64748b;">Email</td>
            <td style="padding:8px 0;"><a href="mailto:${escapeHtml(entry.email)}">${escapeHtml(entry.email)}</a></td>
          </tr>
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:8px 0;color:#64748b;">Azienda</td>
            <td style="padding:8px 0;font-weight:500;">${escapeHtml(entry.company)}</td>
          </tr>
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:8px 0;color:#64748b;">Ruolo</td>
            <td style="padding:8px 0;">${escapeHtml(entry.role ?? "—")}</td>
          </tr>
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:8px 0;color:#64748b;">Sistemi AI</td>
            <td style="padding:8px 0;">${escapeHtml(entry.ai_systems)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#64748b;">Piano</td>
            <td style="padding:8px 0;text-transform:capitalize;">${escapeHtml(entry.plan)}</td>
          </tr>
        </table>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
        <p style="color:#64748b;font-size:12px;">AIComply Waitlist · ${new Date().toLocaleString("it-IT")}</p>
      </div>
    `,
  });
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/umbertomottola/Desktop/open code - ai act saas/aicomply"
npx tsc --noEmit 2>&1 | head -20
```

Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth/email.ts
git commit -m "feat: add sendWaitlistNotification email helper"
```

---

## Task 3: API routes — POST /api/waitlist + GET /api/waitlist/count

**Files:**
- Create: `src/app/api/waitlist/route.ts`
- Create: `src/app/api/waitlist/count/route.ts`

- [ ] **Step 1: Create `src/app/api/waitlist/route.ts`**

```typescript
// POST /api/waitlist
// Insert a waitlist entry. Public endpoint — no auth required.
// Returns { success: true } on insert or duplicate email.

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAuditClient } from "@/lib/audit/audit-trail";
import { sendWaitlistNotification } from "@/lib/auth/email";

const BodySchema = z.object({
  name:       z.string().min(2).max(100),
  email:      z.string().email(),
  company:    z.string().min(1).max(100),
  role:       z.string().optional(),
  ai_systems: z.enum(["1", "2-5", "6-20", "20+"]),
  plan:       z.enum(["starter", "professional"]).default("starter"),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const supabase = createAuditClient();

  if (!supabase) {
    console.error("[WAITLIST] Supabase service role client unavailable");
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const { error } = await supabase.from("waitlist").insert({
    name:       data.name,
    email:      data.email,
    company:    data.company,
    role:       data.role ?? null,
    ai_systems: data.ai_systems,
    plan:       data.plan,
  });

  if (error) {
    // Unique constraint violation on email — gentle response, not an error
    if (error.code === "23505") {
      return NextResponse.json({ success: true, already: true }, { status: 200 });
    }
    console.error("[WAITLIST] Insert failed:", error);
    return NextResponse.json({ error: "Insert failed" }, { status: 500 });
  }

  // Fire-and-forget — do not await (don't let email failure block the response)
  sendWaitlistNotification({
    name:       data.name,
    email:      data.email,
    company:    data.company,
    role:       data.role,
    ai_systems: data.ai_systems,
    plan:       data.plan,
  }).catch((err) => console.error("[WAITLIST] Email notification failed:", err));

  return NextResponse.json({ success: true }, { status: 201 });
}
```

- [ ] **Step 2: Create `src/app/api/waitlist/count/route.ts`**

```typescript
// GET /api/waitlist/count
// Returns aggregate count of waitlist entries. Public, no auth.
// Cached for 60 seconds (Next.js revalidate).

import { NextResponse } from "next/server";
import { createAuditClient } from "@/lib/audit/audit-trail";

export const revalidate = 60;

export async function GET() {
  const supabase = createAuditClient();

  if (!supabase) {
    return NextResponse.json({ count: 0 });
  }

  const { count, error } = await supabase
    .from("waitlist")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("[WAITLIST COUNT]", error);
    return NextResponse.json({ count: 0 });
  }

  return NextResponse.json({ count: count ?? 0 });
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/waitlist/route.ts src/app/api/waitlist/count/route.ts
git commit -m "feat: add POST /api/waitlist and GET /api/waitlist/count routes"
```

---

## Task 4: `/waitlist` Landing Page

**Files:**
- Create: `src/app/waitlist/page.tsx`

- [ ] **Step 1: Create `src/app/waitlist/page.tsx`**

```typescript
"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";

// ─── Inner form — uses useSearchParams, must be inside Suspense ───────────────

function WaitlistForm() {
  const searchParams = useSearchParams();
  const rawPlan = searchParams.get("plan");
  const plan: "starter" | "professional" =
    rawPlan === "professional" ? "professional" : "starter";
  const planLabel = plan === "professional" ? "Professional" : "Starter";

  const [count, setCount] = useState<number | null>(null);
  const [name, setName]     = useState("");
  const [email, setEmail]   = useState("");
  const [company, setCompany] = useState("");
  const [aiSystems, setAiSystems] = useState("");
  const [role, setRole]     = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "already" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch("/api/waitlist/count")
      .then((r) => r.json())
      .then((d) => setCount(d.count))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company, ai_systems: aiSystems, role: role || undefined, plan }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data.error ?? "Errore durante l'iscrizione. Riprova.");
        return;
      }

      setStatus(data.already ? "already" : "success");
    } catch {
      setStatus("error");
      setErrorMsg("Errore di rete. Controlla la connessione e riprova.");
    }
  }

  const isSuccess = status === "success" || status === "already";

  return (
    <div className="flex min-h-screen">
      {/* ── Left panel (dark) ── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{ background: "#0D1016" }}
      >
        <a
          href="/"
          className="text-white font-semibold text-[18px] hover:opacity-80 transition-opacity"
          style={{ letterSpacing: "-0.5px", textDecoration: "none" }}
        >
          AI<span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 300 }}>Comply</span>
        </a>

        <div>
          <span
            className="inline-block text-[10px] font-bold rounded-full px-3 py-1 mb-6"
            style={{
              background: "rgba(99,102,241,0.2)",
              color: "#a5b4fc",
              letterSpacing: "1.5px",
            }}
          >
            EARLY ACCESS
          </span>

          <h2
            className="text-white mb-4"
            style={{ fontSize: "32px", fontWeight: 400, letterSpacing: "-1.2px", lineHeight: 1.15 }}
          >
            Sii tra i primi<br />
            <span style={{ color: "rgba(255,255,255,0.35)" }}>a usare AIComply.</span>
          </h2>

          <p
            className="mb-8 text-[13px]"
            style={{ color: "rgba(255,255,255,0.45)", lineHeight: 1.7, maxWidth: 340 }}
          >
            L&apos;AI Act scade ad agosto 2025. Le aziende che iniziano oggi
            arrivano conformi in tempo.
          </p>

          <div className="space-y-3 mb-10">
            {[
              "Accesso anticipato alla piattaforma completa",
              "Onboarding 1:1 gratuito con il team",
              "Prezzo bloccato a vita per i fondatori",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 flex-shrink-0" style={{ color: "#4ade80" }} />
                <span className="text-[13px]" style={{ color: "rgba(255,255,255,0.6)" }}>
                  {item}
                </span>
              </div>
            ))}
          </div>

          {count !== null && count > 0 && (
            <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.25)" }}>
              {count} aziend{count === 1 ? "a" : "e"} già in lista
            </p>
          )}
        </div>

        <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>
          © 2025 AIComply. Tutti i diritti riservati.
        </p>
      </div>

      {/* ── Right panel (white) ── */}
      <div
        className="flex-1 flex items-center justify-center p-6"
        style={{ background: "#FAFAF9" }}
      >
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <a
            href="/"
            className="lg:hidden text-[18px] font-semibold mb-10 block hover:opacity-70 transition-opacity"
            style={{ color: "#0D1016", letterSpacing: "-0.5px", textDecoration: "none" }}
          >
            AI<span style={{ color: "rgba(0,0,0,0.25)", fontWeight: 300 }}>Comply</span>
          </a>

          {isSuccess ? (
            /* ── Success state ── */
            <div className="text-center py-8">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: "rgba(22,163,74,0.1)" }}
              >
                <CheckCircle className="h-7 w-7" style={{ color: "#16a34a" }} />
              </div>
              <h2
                className="mb-2"
                style={{ fontSize: "22px", fontWeight: 400, letterSpacing: "-0.6px", color: "#0D1016" }}
              >
                {status === "already" ? "Sei già in lista!" : "Sei in lista!"}
              </h2>
              <p className="text-[13px] mb-6" style={{ color: "rgba(0,0,0,0.45)", lineHeight: 1.6 }}>
                {status === "already"
                  ? "Questa email è già registrata — ti contatteremo presto."
                  : `Ti contatteremo a ${email} entro 24 ore.`}
              </p>
              <a
                href="/"
                className="text-[13px] font-medium"
                style={{ color: "#6366f1", textDecoration: "none" }}
              >
                ← Torna alla home
              </a>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              {/* Plan pill */}
              <div className="mb-2">
                <span
                  className="inline-block text-[10px] font-semibold rounded-full px-2.5 py-1"
                  style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}
                >
                  Piano {planLabel}
                </span>
              </div>

              <h1
                className="mb-1"
                style={{ fontSize: "24px", fontWeight: 400, letterSpacing: "-0.8px", color: "#0D1016" }}
              >
                Entra in lista
              </h1>
              <p className="text-[13px] mb-7" style={{ color: "rgba(0,0,0,0.42)" }}>
                Nessuna carta richiesta. Ti contatteremo entro 24 ore.
              </p>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <input
                    type="text"
                    placeholder="Nome e cognome *"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl text-[13px] outline-none transition-all"
                    style={{
                      background: "#ffffff",
                      border: "1px solid rgba(0,0,0,0.12)",
                      color: "#0D1016",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#6366f1")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)")}
                  />
                </div>

                <div>
                  <input
                    type="email"
                    placeholder="Email aziendale *"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl text-[13px] outline-none transition-all"
                    style={{
                      background: "#ffffff",
                      border: "1px solid rgba(0,0,0,0.12)",
                      color: "#0D1016",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#6366f1")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)")}
                  />
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Azienda *"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl text-[13px] outline-none transition-all"
                    style={{
                      background: "#ffffff",
                      border: "1px solid rgba(0,0,0,0.12)",
                      color: "#0D1016",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#6366f1")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)")}
                  />
                </div>

                <div>
                  <select
                    value={aiSystems}
                    onChange={(e) => setAiSystems(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl text-[13px] outline-none transition-all"
                    style={{
                      background: "#ffffff",
                      border: "1px solid rgba(0,0,0,0.12)",
                      color: aiSystems ? "#0D1016" : "rgba(0,0,0,0.4)",
                      appearance: "none",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#6366f1")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)")}
                  >
                    <option value="" disabled>Sistemi AI usati *</option>
                    <option value="1">1</option>
                    <option value="2-5">2–5</option>
                    <option value="6-20">6–20</option>
                    <option value="20+">20+</option>
                  </select>
                </div>

                <div>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-[13px] outline-none transition-all"
                    style={{
                      background: "#ffffff",
                      border: "1px solid rgba(0,0,0,0.12)",
                      color: role ? "#0D1016" : "rgba(0,0,0,0.4)",
                      appearance: "none",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#6366f1")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)")}
                  >
                    <option value="">Ruolo (opzionale)</option>
                    <option value="CTO/CIO">CTO / CIO</option>
                    <option value="Legal/Compliance">Legal / Compliance</option>
                    <option value="DPO">DPO</option>
                    <option value="Founder">Founder</option>
                    <option value="Altro">Altro</option>
                  </select>
                </div>

                {errorMsg && (
                  <p className="text-[12px] px-1" style={{ color: "#dc2626" }}>
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full py-3.5 rounded-xl text-[13px] font-semibold transition-opacity flex items-center justify-center gap-2"
                  style={{
                    background: "#0D1016",
                    color: "#ffffff",
                    opacity: status === "loading" ? 0.7 : 1,
                    cursor: status === "loading" ? "not-allowed" : "pointer",
                  }}
                >
                  {status === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
                  {status === "loading" ? "Invio..." : "Richiedi accesso anticipato →"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page — wraps inner in Suspense (required for useSearchParams in Next.js 16) ─

export default function WaitlistPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center" style={{ background: "#FAFAF9" }}>
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: "rgba(0,0,0,0.2)" }} />
        </div>
      }
    >
      <WaitlistForm />
    </Suspense>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no output.

- [ ] **Step 3: Manual test — open browser**

Start dev server if not running:
```bash
cd "/Users/umbertomottola/Desktop/open code - ai act saas/aicomply"
npm run dev
```

Open `http://localhost:3000/waitlist?plan=starter` — verify:
- Dark/light split layout renders
- "Piano Starter" pill visible
- 5 form fields visible
- Counter shows 0 (or real count)

Open `http://localhost:3000/waitlist?plan=professional` — verify "Piano Professional" pill.

- [ ] **Step 4: Test form submission**

Fill in the form with: Nome=Test, Email=test@example.com, Azienda=TestCo, Sistemi AI=1, Ruolo=Founder.
Submit → verify success state appears with checkmark and email address.

Check Supabase Table Editor → `waitlist` table → row should appear.

Submit same email again → verify "Sei già in lista!" message (already state).

- [ ] **Step 5: Commit**

```bash
git add src/app/waitlist/page.tsx
git commit -m "feat: add /waitlist landing page with split layout and form"
```

---

## Task 5: Pricing Page — CTA swap + copy update

**Files:**
- Modify: `src/app/pricing/page.tsx`

- [ ] **Step 1: Update Starter tier in `TIERS` array**

In `src/app/pricing/page.tsx`, find the Starter tier object (around line 33) and change:
```typescript
// BEFORE
    cta: "Inizia il trial — 14 giorni gratis",
    ctaHref: "/register?plan=starter",
    ctaStyle: "primary" as const,

// AFTER
    cta: "Richiedi accesso anticipato",
    ctaHref: "/waitlist?plan=starter",
    ctaStyle: "primary" as const,
```

- [ ] **Step 2: Update Professional tier in `TIERS` array**

Find the Professional tier object (around line 58) and change:
```typescript
// BEFORE
    cta: "Inizia il trial — 14 giorni gratis",
    ctaHref: "/register?plan=professional",
    ctaStyle: "ghost" as const,

// AFTER
    cta: "Richiedi accesso anticipato",
    ctaHref: "/waitlist?plan=professional",
    ctaStyle: "ghost" as const,
```

- [ ] **Step 3: Update hero subtitle copy (around line 338)**

```typescript
// BEFORE
            Inizia con lo scanner gratuito. Passa a un piano quando sei pronto.
            14 giorni di trial inclusi, nessuna carta di credito richiesta.

// AFTER
            Inizia con lo scanner gratuito. Entra in lista per accedere ai piani completi
            e bloccare il prezzo da fondatore.
```

- [ ] **Step 4: Update FAQ entry about trial (around line 85)**

```typescript
// BEFORE
  {
    q: "Il trial richiede la carta di credito?",
    a: "No. 14 giorni completamente gratuiti senza inserire dati di pagamento. Al termine del trial puoi scegliere un piano o continuare con lo scanner gratuito.",
  },

// AFTER
  {
    q: "Come funziona l'accesso anticipato?",
    a: "Lasci nome, email e azienda — nessuna carta di credito. Ti contatteremo entro 24 ore per attivare l'accesso. I primi iscritti ottengono il prezzo bloccato a vita.",
  },
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no output.

- [ ] **Step 6: Manual test**

Open `http://localhost:3000/pricing` — verify:
- Starter CTA reads "Richiedi accesso anticipato"
- Professional CTA reads "Richiedi accesso anticipato"
- Scanner CTA still reads "Inizia gratis" → `/scanner`
- Clicking Starter CTA navigates to `/waitlist?plan=starter`
- FAQ first entry updated

- [ ] **Step 7: Commit**

```bash
git add src/app/pricing/page.tsx
git commit -m "feat: swap pricing CTAs to painted-door waitlist flow"
```

---

## Task 6: Deploy to Vercel

- [ ] **Step 1: Build check**

```bash
npm run build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully` with no errors.

- [ ] **Step 2: Deploy**

```bash
export PATH="$HOME/.npm-global/bin:$PATH"
vercel --prod --yes 2>&1 | tail -10
```

Expected: `"readyState": "READY"` and aliased URL.

- [ ] **Step 3: Smoke test on production**

Open `https://aicomply-omega.vercel.app/pricing` — verify CTAs.
Open `https://aicomply-omega.vercel.app/waitlist?plan=starter` — verify form loads.
Submit a real test entry → verify row in Supabase.
