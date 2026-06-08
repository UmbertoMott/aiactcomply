# AIComply Architectural Refactoring — Master Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Trasformare AIComply da un'app localStorage-first a una piattaforma SaaS enterprise con DB PostgreSQL, sicurezza server-side, RBAC reale e output professionali.

**Architecture:** Supabase PostgreSQL con RLS multi-tenant + Server Actions per ogni operazione critica + Upstash Redis per rate limiting distribuito. Il frontend diventa stateless: legge sempre dal DB, non da localStorage.

**Tech Stack:** Next.js 16 Server Actions, Supabase PostgreSQL + RLS, Upstash Redis, react-pdf, TypeScript strict

---

## Mappa file creati/modificati

### Nuovi file
| File | Responsabilità |
|---|---|
| `supabase/migrations/001_schema.sql` | Tutte le tabelle PostgreSQL + RLS |
| `src/lib/db/client.ts` | Supabase server client singleton |
| `src/lib/db/evidence.ts` | CRUD evidence_records (append-only) |
| `src/lib/db/triage.ts` | CRUD triage_records |
| `src/lib/db/risk.ts` | CRUD risk_matrix |
| `src/lib/db/docugen.ts` | CRUD docugen_drafts |
| `src/lib/db/incidents.ts` | CRUD post_market_incidents |
| `src/lib/db/logvault.ts` | Log chain append-only server-side |
| `src/lib/db/organizations.ts` | Organizzazioni e trust tokens |
| `src/lib/auth/rbac.ts` | requireRole(), getServerUser() helper |
| `src/app/api/logvault/append/route.ts` | API protetta hashing SHA-256 server-side |
| `src/components/auth/SessionWarning.tsx` | Popup avviso 5 min prima scadenza |

### File modificati
| File | Modifica |
|---|---|
| `src/lib/auth/rate-limit.ts` | Upstash Redis invece di Map in-memory |
| `src/lib/supabase/middleware.ts` | Rimuove 24h hard logout |
| `src/app/dashboard/layout.tsx` | Sidebar consolidata + SessionWarning |
| `src/lib/evidence/evidence-layer.ts` | Usa DB invece di localStorage |
| `src/app/dashboard/tools/logvault/page.tsx` | Usa API server-side per hashing |
| `src/app/dashboard/trust-center/page.tsx` | Genera/legge token UUID da DB |
| `src/app/(auth)/actions/auth.ts` | RBAC check nelle Server Actions |
| `src/app/dashboard/modules/gpai/page.tsx` | Merger GPAI Assessment |

---

## TASK 1 — Schema PostgreSQL e DB Client

**Files:**
- Create: `supabase/migrations/001_schema.sql`
- Create: `src/lib/db/client.ts`

- [ ] **Step 1.1: Crea la migration SQL**

```sql
-- supabase/migrations/001_schema.sql

-- ── Organizations ─────────────────────────────────────────────────────────────
create table if not exists public.organizations (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  owner_id      uuid not null references auth.users(id) on delete cascade,
  trust_token   uuid not null default gen_random_uuid() unique,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.organizations enable row level security;
create policy "org_owner_all" on public.organizations
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ── Triage Records ────────────────────────────────────────────────────────────
create table if not exists public.triage_records (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  answers         jsonb not null default '{}',
  report          jsonb,
  risk_tier       text check (risk_tier in ('prohibited','high','limited','minimal','gpai')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.triage_records enable row level security;
create policy "triage_org_access" on public.triage_records
  using (organization_id in (
    select id from public.organizations where owner_id = auth.uid()
  ));

-- ── Risk Matrix ───────────────────────────────────────────────────────────────
create table if not exists public.risk_matrix (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  title           text not null,
  category        text not null,
  probability     int not null check (probability between 1 and 5),
  impact          int not null check (impact between 1 and 5),
  score           int generated always as (probability * impact) stored,
  mitigations     text[] default '{}',
  owner           text,
  status          text not null default 'open' check (status in ('open','mitigating','closed')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.risk_matrix enable row level security;
create policy "risk_org_access" on public.risk_matrix
  using (organization_id in (
    select id from public.organizations where owner_id = auth.uid()
  ));

-- ── Evidence Records (append-only) ───────────────────────────────────────────
create table if not exists public.evidence_records (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  type            text not null,
  content         jsonb not null,
  content_hash    text not null,
  prev_hash       text not null default '',
  created_at      timestamptz not null default now()
  -- NO updated_at: append-only, mai modificabile
);
alter table public.evidence_records enable row level security;
create policy "evidence_org_read" on public.evidence_records
  for select using (organization_id in (
    select id from public.organizations where owner_id = auth.uid()
  ));
create policy "evidence_org_insert" on public.evidence_records
  for insert with check (organization_id in (
    select id from public.organizations where owner_id = auth.uid()
  ));
-- DELETE e UPDATE intenzionalmente assenti: WORM

-- ── Log Chain (append-only, WORM) ─────────────────────────────────────────────
create table if not exists public.log_chain (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  event           text not null,
  level           text not null check (level in ('info','warning','error','critical')),
  agent           text not null default 'system',
  entry_hash      text not null,
  prev_hash       text not null default '',
  created_at      timestamptz not null default now()
);
alter table public.log_chain enable row level security;
create policy "log_org_read" on public.log_chain
  for select using (organization_id in (
    select id from public.organizations where owner_id = auth.uid()
  ));
create policy "log_org_insert" on public.log_chain
  for insert with check (organization_id in (
    select id from public.organizations where owner_id = auth.uid()
  ));
-- No UPDATE/DELETE: WORM

-- ── DocuGen Drafts ────────────────────────────────────────────────────────────
create table if not exists public.docugen_drafts (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  system_name     text not null default '',
  sections        jsonb not null default '{}',
  section_status  jsonb not null default '{}',
  version         int not null default 1,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.docugen_drafts enable row level security;
create policy "docugen_org_access" on public.docugen_drafts
  using (organization_id in (
    select id from public.organizations where owner_id = auth.uid()
  ));

-- ── Post-Market Incidents ─────────────────────────────────────────────────────
create table if not exists public.post_market_incidents (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  title           text not null,
  description     text not null,
  severity        text not null check (severity in ('low','medium','high','critical')),
  status          text not null default 'open' check (status in ('open','investigating','resolved')),
  occurred_at     timestamptz not null default now(),
  reported_to_authority boolean not null default false,
  authority_response    text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.post_market_incidents enable row level security;
create policy "incidents_org_access" on public.post_market_incidents
  using (organization_id in (
    select id from public.organizations where owner_id = auth.uid()
  ));

-- ── User Roles ────────────────────────────────────────────────────────────────
create table if not exists public.user_roles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade unique,
  role            text not null check (role in ('provider','deployer','importer','distributor')),
  organization_id uuid references public.organizations(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.user_roles enable row level security;
create policy "user_role_own" on public.user_roles
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists idx_evidence_org on public.evidence_records(organization_id, created_at desc);
create index if not exists idx_log_org on public.log_chain(organization_id, created_at desc);
create index if not exists idx_risk_org on public.risk_matrix(organization_id);
create index if not exists idx_incidents_org on public.post_market_incidents(organization_id, occurred_at desc);
create index if not exists idx_org_trust_token on public.organizations(trust_token);
```

- [ ] **Step 1.2: Crea DB client singleton**

```typescript
// src/lib/db/client.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

export async function getDbClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

export async function getDbAdminClient() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
```

- [ ] **Step 1.3: Esegui la migration nel Supabase Dashboard**

Vai su https://supabase.com/dashboard → progetto → SQL Editor → incolla il contenuto di `001_schema.sql` → Run.

- [ ] **Step 1.4: Commit**

```bash
git add supabase/migrations/001_schema.sql src/lib/db/client.ts
git commit -m "feat(db): add postgresql schema with RLS + db client"
```

---

## TASK 2 — RBAC Server-Side

**Files:**
- Create: `src/lib/auth/rbac.ts`
- Modify: `src/app/(auth)/actions/auth.ts`

- [ ] **Step 2.1: Crea helper RBAC**

```typescript
// src/lib/auth/rbac.ts
"use server";

import { getDbClient } from "@/lib/db/client";
import { redirect } from "next/navigation";

export type AppRole = "provider" | "deployer" | "importer" | "distributor";

export interface ServerUser {
  id: string;
  email: string;
  role: AppRole | null;
  organizationId: string | null;
}

/**
 * Recupera l'utente autenticato lato server.
 * Lancia redirect a /login se non autenticato.
 */
export async function getServerUser(): Promise<ServerUser> {
  const supabase = await getDbClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) redirect("/login");

  // Legge ruolo e org da DB (non da metadata per evitare spoofing)
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role, organization_id")
    .eq("user_id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? "",
    role: (roleRow?.role as AppRole) ?? null,
    organizationId: roleRow?.organization_id ?? null,
  };
}

/**
 * Verifica che l'utente abbia uno dei ruoli richiesti.
 * Restituisce 403 JSON se non autorizzato (per API routes).
 * In Server Actions usa throwOnUnauthorized = true per redirect.
 */
export async function requireRole(
  allowedRoles: AppRole[],
  options: { throwOnUnauthorized?: boolean } = {}
): Promise<ServerUser> {
  const user = await getServerUser();

  if (!user.role || !allowedRoles.includes(user.role)) {
    if (options.throwOnUnauthorized) {
      redirect("/dashboard?error=unauthorized");
    }
    throw new Error("403: Unauthorized — insufficient role");
  }

  return user;
}

/**
 * Recupera o crea l'organizzazione per l'utente corrente.
 */
export async function getOrCreateOrganization(userId: string): Promise<string> {
  const supabase = await getDbClient();

  // Controlla se esiste già
  const { data: existing } = await supabase
    .from("organizations")
    .select("id")
    .eq("owner_id", userId)
    .single();

  if (existing?.id) return existing.id;

  // Crea nuova
  const { data: newOrg, error } = await supabase
    .from("organizations")
    .insert({ owner_id: userId, name: "My Organization" })
    .select("id")
    .single();

  if (error || !newOrg) throw new Error("Failed to create organization");
  return newOrg.id;
}
```

- [ ] **Step 2.2: Aggiungi RBAC check alla Server Action di login**

In `src/app/(auth)/actions/auth.ts`, dopo il login riuscito, sincronizza il ruolo dal metadata al DB:

```typescript
// Aggiungere dopo resetRateLimit(ip) e prima del redirect finale:

// Sincronizza ruolo da user_metadata a DB (una tantum, idempotente)
const meta = data?.user?.user_metadata as { role?: string } | undefined;
const metaRole = meta?.role as AppRole | undefined;
if (metaRole && data?.user?.id) {
  const supabaseDb = await getDbClient();
  await supabaseDb.from("user_roles").upsert(
    { user_id: data.user.id, role: metaRole },
    { onConflict: "user_id" }
  );
}
```

- [ ] **Step 2.3: Commit**

```bash
git add src/lib/auth/rbac.ts src/app/(auth)/actions/auth.ts
git commit -m "feat(auth): add server-side RBAC with requireRole helper"
```

---

## TASK 3 — DB Layer: Evidence Records

**Files:**
- Create: `src/lib/db/evidence.ts`
- Modify: `src/lib/evidence/evidence-layer.ts`

- [ ] **Step 3.1: Crea DB layer per evidence**

```typescript
// src/lib/db/evidence.ts
"use server";

import { getDbClient } from "@/lib/db/client";
import { getOrCreateOrganization } from "@/lib/auth/rbac";
import { createHash } from "crypto";

export interface EvidenceRecordDB {
  id: string;
  type: string;
  content: Record<string, unknown>;
  content_hash: string;
  prev_hash: string;
  created_at: string;
}

function hashContent(content: Record<string, unknown>, prevHash: string): string {
  return createHash("sha256")
    .update(JSON.stringify(content) + prevHash)
    .digest("hex");
}

export async function appendEvidenceDB(
  type: string,
  content: Record<string, unknown>
): Promise<EvidenceRecordDB> {
  const supabase = await getDbClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const organizationId = await getOrCreateOrganization(user.id);

  // Recupera l'ultimo hash per mantenere la catena
  const { data: lastRecord } = await supabase
    .from("evidence_records")
    .select("content_hash")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const prevHash = lastRecord?.content_hash ?? "";
  const contentHash = hashContent(content, prevHash);

  const { data, error } = await supabase
    .from("evidence_records")
    .insert({
      organization_id: organizationId,
      user_id: user.id,
      type,
      content,
      content_hash: contentHash,
      prev_hash: prevHash,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to append evidence: ${error.message}`);
  return data as EvidenceRecordDB;
}

export async function getAllEvidenceDB(): Promise<EvidenceRecordDB[]> {
  const supabase = await getDbClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: orgs } = await supabase
    .from("organizations")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!orgs?.id) return [];

  const { data, error } = await supabase
    .from("evidence_records")
    .select("*")
    .eq("organization_id", orgs.id)
    .order("created_at", { ascending: true });

  if (error) return [];
  return (data ?? []) as EvidenceRecordDB[];
}

export async function verifyEvidenceChainDB(): Promise<{ valid: boolean; brokenAt?: string }> {
  const records = await getAllEvidenceDB();
  for (let i = 1; i < records.length; i++) {
    const expected = hashContent(records[i - 1].content, records[i - 1].prev_hash);
    if (records[i].prev_hash !== expected) {
      return { valid: false, brokenAt: records[i].id };
    }
  }
  return { valid: true };
}
```

- [ ] **Step 3.2: Aggiorna evidence-layer.ts per usare DB con fallback localStorage**

```typescript
// src/lib/evidence/evidence-layer.ts
// Mantieni le funzioni esistenti per compatibilità client-side
// Aggiungi export che i tool server-side possono usare

export { appendEvidenceDB, getAllEvidenceDB, verifyEvidenceChainDB } from "@/lib/db/evidence";
```

- [ ] **Step 3.3: Commit**

```bash
git add src/lib/db/evidence.ts src/lib/evidence/evidence-layer.ts
git commit -m "feat(db): server-side append-only evidence layer with hash chain"
```

---

## TASK 4 — LogVault Server-Side (WORM)

**Files:**
- Create: `src/app/api/logvault/append/route.ts`
- Create: `src/lib/db/logvault.ts`
- Modify: `src/app/dashboard/tools/logvault/page.tsx`

- [ ] **Step 4.1: Crea DB layer logvault**

```typescript
// src/lib/db/logvault.ts
"use server";

import { getDbClient } from "@/lib/db/client";
import { getOrCreateOrganization } from "@/lib/auth/rbac";
import { createHash } from "crypto";

export interface LogEntryDB {
  id: string;
  event: string;
  level: "info" | "warning" | "error" | "critical";
  agent: string;
  entry_hash: string;
  prev_hash: string;
  created_at: string;
}

function hashEntry(event: string, level: string, prevHash: string): string {
  return createHash("sha256")
    .update(`${event}|${level}|${prevHash}|${Date.now()}`)
    .digest("hex");
}

export async function appendLogDB(
  event: string,
  level: LogEntryDB["level"],
  agent = "system"
): Promise<LogEntryDB> {
  const supabase = await getDbClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const organizationId = await getOrCreateOrganization(user.id);

  const { data: lastEntry } = await supabase
    .from("log_chain")
    .select("entry_hash")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const prevHash = lastEntry?.entry_hash ?? "";
  const entryHash = hashEntry(event, level, prevHash);

  const { data, error } = await supabase
    .from("log_chain")
    .insert({
      organization_id: organizationId,
      user_id: user.id,
      event,
      level,
      agent,
      entry_hash: entryHash,
      prev_hash: prevHash,
    })
    .select()
    .single();

  if (error) throw new Error(`LogVault append failed: ${error.message}`);
  return data as LogEntryDB;
}

export async function getLogChainDB(): Promise<LogEntryDB[]> {
  const supabase = await getDbClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!org?.id) return [];

  const { data } = await supabase
    .from("log_chain")
    .select("*")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: true });

  return (data ?? []) as LogEntryDB[];
}

export async function verifyLogChainDB(): Promise<{ valid: boolean; brokenAt?: string }> {
  const entries = await getLogChainDB();
  for (let i = 1; i < entries.length; i++) {
    // Verifica che prev_hash del record i corrisponda all'entry_hash del record i-1
    if (entries[i].prev_hash !== entries[i - 1].entry_hash) {
      return { valid: false, brokenAt: entries[i].id };
    }
  }
  return { valid: true };
}
```

- [ ] **Step 4.2: Crea API route protetta per append log**

```typescript
// src/app/api/logvault/append/route.ts
import { NextRequest, NextResponse } from "next/server";
import { appendLogDB } from "@/lib/db/logvault";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      event?: string;
      level?: string;
      agent?: string;
    };

    if (!body.event || !body.level) {
      return NextResponse.json({ error: "Missing event or level" }, { status: 400 });
    }

    const validLevels = ["info", "warning", "error", "critical"];
    if (!validLevels.includes(body.level)) {
      return NextResponse.json({ error: "Invalid level" }, { status: 400 });
    }

    const entry = await appendLogDB(
      body.event,
      body.level as "info" | "warning" | "error" | "critical",
      body.agent ?? "user"
    );

    return NextResponse.json({ success: true, entry });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("Not authenticated")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 4.3: Aggiorna LogVault page per chiamare la API server-side**

Nella pagina LogVault (`src/app/dashboard/tools/logvault/page.tsx`), sostituisci le chiamate a `generateLogChain` con fetch all'endpoint protetto:

```typescript
// Sostituisci la funzione di aggiunta log locale con:
async function addServerLog(event: string, level: string, agent = "user") {
  const res = await fetch("/api/logvault/append", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, level, agent }),
  });
  if (!res.ok) throw new Error("Failed to append log server-side");
  return res.json();
}
```

- [ ] **Step 4.4: Commit**

```bash
git add src/lib/db/logvault.ts src/app/api/logvault/append/route.ts
git commit -m "feat(logvault): server-side WORM log chain via PostgreSQL append-only"
```

---

## TASK 5 — Rate Limiting Distribuito (Upstash Redis)

**Files:**
- Modify: `src/lib/auth/rate-limit.ts`

- [ ] **Step 5.1: Installa Upstash Redis SDK**

```bash
npm install @upstash/redis @upstash/ratelimit
```

- [ ] **Step 5.2: Aggiungi env vars**

In `.env.local` e Vercel dashboard → Settings → Environment Variables:
```
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

- [ ] **Step 5.3: Riscrivi rate-limit.ts con Upstash + fallback in-memory**

```typescript
// src/lib/auth/rate-limit.ts
// Upstash Redis se configurato, fallback Map in-memory per sviluppo locale

let upstashRatelimit: unknown = null;

async function getUpstashLimiter() {
  if (upstashRatelimit) return upstashRatelimit;
  if (!process.env.UPSTASH_REDIS_REST_URL) return null;

  try {
    const { Redis } = await import("@upstash/redis");
    const { Ratelimit } = await import("@upstash/ratelimit");
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    upstashRatelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "15 m"),
      prefix: "aicomply:login",
    });
    return upstashRatelimit;
  } catch {
    return null;
  }
}

// Fallback in-memory (solo sviluppo locale)
const localAttempts = new Map<string, { count: number; resetAt: number }>();

export async function checkRateLimitAsync(ip: string): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const limiter = await getUpstashLimiter() as { limit: (id: string) => Promise<{ success: boolean; reset: number }> } | null;

  if (limiter) {
    const result = await limiter.limit(ip);
    if (!result.success) {
      const retryAfterSeconds = Math.ceil((result.reset - Date.now()) / 1000);
      return { allowed: false, retryAfterSeconds };
    }
    return { allowed: true };
  }

  // Fallback locale
  const now = Date.now();
  const entry = localAttempts.get(ip);
  if (entry && now < entry.resetAt) {
    if (entry.count >= 5) {
      return { allowed: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
    }
    entry.count++;
  } else {
    localAttempts.set(ip, { count: 1, resetAt: now + 900_000 });
  }
  return { allowed: true };
}

export async function resetRateLimitAsync(ip: string): Promise<void> {
  const limiter = await getUpstashLimiter() as { redis: { del: (key: string) => Promise<void> } } | null;
  if (limiter) {
    await limiter.redis.del(`aicomply:login:${ip}`);
    return;
  }
  localAttempts.delete(ip);
}

// Compatibility shims per il codice esistente (sincrono)
export function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = localAttempts.get(ip);
  if (entry && now < entry.resetAt) {
    if (entry.count >= 5) return { allowed: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
    entry.count++;
  } else {
    localAttempts.set(ip, { count: 1, resetAt: now + 900_000 });
  }
  return { allowed: true };
}

export function resetRateLimit(ip: string): void {
  localAttempts.delete(ip);
}
```

- [ ] **Step 5.4: Aggiorna actions/auth.ts per usare versione async**

In `src/app/(auth)/actions/auth.ts`, sostituisci `checkRateLimit` e `resetRateLimit` con le versioni async:

```typescript
import { checkRateLimitAsync, resetRateLimitAsync } from "@/lib/auth/rate-limit";

// Nel corpo di loginEmail:
const rl = await checkRateLimitAsync(ip);
if (!rl.allowed) { ... }
// ...
await resetRateLimitAsync(ip);
```

- [ ] **Step 5.5: Commit**

```bash
git add src/lib/auth/rate-limit.ts src/app/(auth)/actions/auth.ts
git commit -m "feat(auth): distributed rate limiting via Upstash Redis with in-memory fallback"
```

---

## TASK 6 — Session Warning Popup (5 min prima scadenza)

**Files:**
- Create: `src/components/auth/SessionWarning.tsx`
- Modify: `src/lib/supabase/middleware.ts`
- Modify: `src/app/dashboard/layout.tsx`

- [ ] **Step 6.1: Rimuovi hard logout 24h dal middleware**

In `src/lib/supabase/middleware.ts`, rimuovi il blocco:
```typescript
// RIMUOVERE questo blocco:
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;
if (user && isDashboard) {
  const lastSignIn = new Date(user.last_sign_in_at ?? 0).getTime();
  if (Date.now() - lastSignIn > SESSION_MAX_AGE_MS) {
    await supabase.auth.signOut();
    ...redirect('/login?reason=session_expired');
  }
}
```

Supabase gestisce la scadenza nativa tramite Refresh Token. Il middleware non forza più disconnessioni.

- [ ] **Step 6.2: Crea SessionWarning component**

```typescript
// src/components/auth/SessionWarning.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const WARNING_BEFORE_EXPIRY_MS = 5 * 60 * 1000; // 5 minuti
const CHECK_INTERVAL_MS = 30 * 1000; // controlla ogni 30 secondi

export default function SessionWarning() {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const router = useRouter();

  const checkSession = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    const now = Date.now();
    const timeLeft = expiresAt - now;

    if (timeLeft > 0 && timeLeft <= WARNING_BEFORE_EXPIRY_MS) {
      setShowWarning(true);
      setSecondsLeft(Math.ceil(timeLeft / 1000));
    } else if (timeLeft <= 0) {
      setShowWarning(false);
      router.push("/login?reason=session_expired");
    } else {
      setShowWarning(false);
    }
  }, [router]);

  async function renewSession() {
    const supabase = createClient();
    if (!supabase) return;
    const { error } = await supabase.auth.refreshSession();
    if (!error) setShowWarning(false);
  }

  useEffect(() => {
    checkSession();
    const interval = setInterval(checkSession, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [checkSession]);

  // Countdown tick
  useEffect(() => {
    if (!showWarning) return;
    const tick = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { clearInterval(tick); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [showWarning]);

  if (!showWarning) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeStr = minutes > 0
    ? `${minutes}m ${seconds}s`
    : `${seconds}s`;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 rounded-xl shadow-2xl p-4 max-w-xs w-full"
      style={{
        background: "#ffffff",
        border: "1px solid rgba(245,158,11,0.35)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
          style={{ background: "rgba(245,158,11,0.12)", color: "#b45309" }}
        >
          ⏱
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold mb-0.5" style={{ color: "#0D1016" }}>
            Sessione in scadenza
          </p>
          <p className="text-[12px] mb-3" style={{ color: "rgba(0,0,0,0.5)" }}>
            La tua sessione scadrà tra <strong>{timeStr}</strong>. Rinnova per non perdere il lavoro in corso.
          </p>
          <div className="flex gap-2">
            <button
              onClick={renewSession}
              className="flex-1 rounded-lg py-1.5 text-[12px] font-medium text-center"
              style={{ background: "#0D1016", color: "#ffffff" }}
            >
              Rinnova sessione
            </button>
            <button
              onClick={() => setShowWarning(false)}
              className="rounded-lg px-3 py-1.5 text-[12px]"
              style={{ border: "1px solid rgba(0,0,0,0.12)", color: "rgba(0,0,0,0.5)" }}
            >
              Ignora
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6.3: Aggiungi SessionWarning al layout dashboard**

In `src/app/dashboard/layout.tsx`, dopo gli import esistenti:
```typescript
import SessionWarning from "@/components/auth/SessionWarning";
```

E nel JSX, subito prima della chiusura del div principale:
```typescript
<SessionWarning />
```

- [ ] **Step 6.4: Commit**

```bash
git add src/components/auth/SessionWarning.tsx src/lib/supabase/middleware.ts src/app/dashboard/layout.tsx
git commit -m "feat(auth): replace 24h hard logout with graceful session expiry warning popup"
```

---

## TASK 7 — Consolidamento Sidebar (Feature Bloat)

**Files:**
- Modify: `src/app/dashboard/layout.tsx`

- [ ] **Step 7.1: Rimuovi tool ridondanti dalla sidebar**

In `src/app/dashboard/layout.tsx`, modifica `navGroups` rimuovendo le voci indicate e fondendo GPAI:

**Rimuovere da Integrazioni**: `Sicurezza 2FA` (già nel UserMenu dropdown)

**Rimuovere da Valutazioni** (diventano sotto-sezioni di DocuGen/altri):
- `Transparency` → sotto-sezione di DocuGen
- `Oversight` → sotto-sezione di DocuGen  
- `Resilience` → sotto-sezione di DocuGen
- `Art. 50 Kit` → sotto-sezione di DocuGen
- `L.132/2025` → voce condizionale nel Compliance Hub
- `AGID / ACN` → voce condizionale nel Compliance Hub

**Fondi in un'unica voce**: `GPAI Assessment` + `GPAI Module` → rimane solo `GPAI Module` con href `/dashboard/modules/gpai`

Il gruppo `Valutazioni` aggiornato rimuove: `Transparency`, `Oversight`, `Resilience`, `Art. 50 Kit`, `L.132/2025`, `AGID / ACN`, `GPAI Assessment` (duplicato).

Aggiunge una voce unificata: `{ icon: Cpu, label: "GPAI Hub", href: "/dashboard/modules/gpai", art: "Art. 51-55" }`

- [ ] **Step 7.2: Aggiorna Compliance Hub per ospitare L.132 e AGID/ACN come sezioni**

In `src/app/dashboard/compliance-nexus/page.tsx`, aggiungi sezione condizionale:
- Se l'utente ha selezionato "Italia" o "Pubblica Amministrazione" durante il triage → mostra sezione "Normativa Italiana" con checklist L.132/2025 e AGID/ACN integrate.

- [ ] **Step 7.3: Aggiorna DocuGen per includere sezioni Transparency, Oversight, Resilience, Art.50**

In `src/app/dashboard/tools/docugen/page.tsx`, aggiungi alle sezioni del documento Allegato IV le sotto-sezioni:
- "Misure di Trasparenza (Art. 13)"
- "Supervisione Umana (Art. 14)"
- "Robustezza e Resilienza (Art. 15)"
- "Disclosure Art. 50"

Queste sostituiscono i 4 tool separati con form integrati.

- [ ] **Step 7.4: Commit**

```bash
git add src/app/dashboard/layout.tsx
git commit -m "refactor(ui): consolidate sidebar removing redundant tools into DocuGen and Compliance Hub"
```

---

## TASK 8 — Trust Center con UUID Token pubblico

**Files:**
- Create: `src/lib/db/organizations.ts`
- Create: `src/app/trust/[token]/page.tsx`
- Modify: `src/app/dashboard/trust-center/page.tsx`

- [ ] **Step 8.1: Crea DB layer organizations**

```typescript
// src/lib/db/organizations.ts
"use server";

import { getDbClient } from "@/lib/db/client";
import { getOrCreateOrganization } from "@/lib/auth/rbac";

export interface TrustSummary {
  organizationName: string;
  trustToken: string;
  evidenceCount: number;
  lastUpdated: string;
  publicUrl: string;
}

export async function getTrustToken(): Promise<string> {
  const supabase = await getDbClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const orgId = await getOrCreateOrganization(user.id);

  const { data } = await supabase
    .from("organizations")
    .select("trust_token")
    .eq("id", orgId)
    .single();

  return data?.trust_token ?? "";
}

export async function getTrustSummaryByToken(token: string): Promise<TrustSummary | null> {
  // Usa admin client per accesso pubblico (senza auth)
  const { createClient } = await import("@supabase/supabase-js");
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: org } = await adminClient
    .from("organizations")
    .select("id, name, trust_token, updated_at")
    .eq("trust_token", token)
    .single();

  if (!org) return null;

  const { count } = await adminClient
    .from("evidence_records")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", org.id);

  return {
    organizationName: org.name,
    trustToken: org.trust_token,
    evidenceCount: count ?? 0,
    lastUpdated: org.updated_at,
    publicUrl: `${process.env.NEXT_PUBLIC_APP_URL}/trust/${token}`,
  };
}
```

- [ ] **Step 8.2: Crea pagina pubblica Trust Center**

```typescript
// src/app/trust/[token]/page.tsx
import { getTrustSummaryByToken } from "@/lib/db/organizations";
import { notFound } from "next/navigation";

export default async function PublicTrustPage({
  params,
}: {
  params: { token: string };
}) {
  const summary = await getTrustSummaryByToken(params.token);
  if (!summary) notFound();

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#FAFAF9" }}>
      <div
        className="w-full max-w-lg rounded-2xl p-8"
        style={{
          background: "#ffffff",
          border: "1px solid rgba(0,0,0,0.07)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
            style={{ background: "#0D1016", color: "#ffffff" }}
          >
            AI
          </div>
          <div>
            <h1 className="text-[18px] font-semibold" style={{ color: "#0D1016" }}>
              {summary.organizationName}
            </h1>
            <p className="text-[12px]" style={{ color: "rgba(0,0,0,0.4)" }}>
              AI Compliance Trust Center
            </p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div
            className="flex items-center justify-between rounded-xl px-4 py-3"
            style={{ background: "rgba(21,128,61,0.05)", border: "1px solid rgba(21,128,61,0.15)" }}
          >
            <span className="text-[13px]" style={{ color: "#0D1016" }}>Prove di conformità registrate</span>
            <span className="text-[20px] font-bold" style={{ color: "#15803d" }}>
              {summary.evidenceCount}
            </span>
          </div>

          <div
            className="rounded-xl px-4 py-3"
            style={{ background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.07)" }}
          >
            <p className="text-[11px] mb-1" style={{ color: "rgba(0,0,0,0.4)" }}>
              Token di verifica
            </p>
            <p className="text-[12px] font-mono break-all" style={{ color: "#0D1016" }}>
              {summary.trustToken}
            </p>
          </div>

          <p className="text-[11px] text-center" style={{ color: "rgba(0,0,0,0.35)" }}>
            Ultimo aggiornamento: {new Date(summary.lastUpdated).toLocaleDateString("it-IT")}
          </p>
        </div>

        <p className="text-[11px] text-center" style={{ color: "rgba(0,0,0,0.3)" }}>
          Questo profilo di conformità è generato automaticamente da AIComply — EU AI Act Art. 50
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 8.3: Aggiorna dashboard Trust Center per mostrare il link pubblico**

In `src/app/dashboard/trust-center/page.tsx`, aggiungi una sezione che mostra il `trust_token` con URL copiabile:

```typescript
import { getTrustToken } from "@/lib/db/organizations";

// Nel componente (server component):
const token = await getTrustToken();
const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL}/trust/${token}`;
```

- [ ] **Step 8.4: Commit**

```bash
git add src/lib/db/organizations.ts src/app/trust/[token]/page.tsx
git commit -m "feat(trust): public trust center with UUID token and real DB data"
```

---

## TASK 9 — RBAC Check nelle Server Actions critiche

**Files:**
- Modify: `src/app/dashboard/actions.ts` (logout action)
- Modify: `src/app/dashboard/tools/logvault/page.tsx`

- [ ] **Step 9.1: Aggiungi controllo ruolo nelle Server Actions esistenti**

Ogni Server Action che scrive dati deve verificare autenticazione. Esempio pattern da applicare a tutte le azioni di scrittura:

```typescript
// Pattern da applicare in tutte le Server Actions di scrittura
"use server";
import { getServerUser } from "@/lib/auth/rbac";

export async function saveRiskItem(data: RiskItemInput) {
  // Blocca a livello server: non si fida del client
  const user = await getServerUser(); // lancia redirect se non autenticato
  
  // Se solo alcuni ruoli possono scrivere rischi:
  // await requireRole(["provider", "deployer"], { throwOnUnauthorized: true });
  
  // Salva con organization_id dell'utente
  const orgId = await getOrCreateOrganization(user.id);
  // ... resto della logica
}
```

- [ ] **Step 9.2: Proteggi la API route logvault**

La API route `/api/logvault/append` verifica già l'auth tramite `getDbClient()` che usa i cookie di sessione. Non sono necessarie modifiche aggiuntive.

- [ ] **Step 9.3: Commit**

```bash
git commit -m "feat(rbac): server-side role checks in critical write operations"
```

---

## TASK 10 — Riposizionamento AIA Architect

**Files:**
- Modify: `src/app/dashboard/modules/aia-architect/page.tsx`

- [ ] **Step 10.1: Aggiorna UI e copy del tool**

Cambia il titolo e la descrizione nel JSX:

**Prima**: "Generatore automatico documentazione Allegato IV"

**Dopo**:
```typescript
// In src/app/dashboard/modules/aia-architect/page.tsx
// Modifica il titolo H1 e la descrizione:
<h1>Scanner Infrastruttura AI (Allegato IV — Sezione Tecnica)</h1>
<p>
  Questo scanner analizza il tuo repository e le dipendenze per 
  pre-compilare automaticamente la <strong>sezione tecnica</strong> dell&apos;Allegato IV.
  I campi di governance, logica di business e bias richiedono revisione 
  umana e completamento in <a href="/dashboard/tools/docugen">DocuGen AI</a>.
</p>

// Aggiungi un banner informativo in cima all'output:
{analysisResult && (
  <div 
    className="rounded-xl px-4 py-3 mb-4"
    style={{ background: "rgba(29,78,216,0.05)", border: "1px solid rgba(29,78,216,0.15)" }}
  >
    <p className="text-[12px]" style={{ color: "#1d4ed8" }}>
      ℹ️ Sezione tecnica pre-compilata. Completa governance, bias e logica di business 
      in <strong>DocuGen AI</strong> con l&apos;AI Co-Writer.
    </p>
  </div>
)}
```

- [ ] **Step 10.2: Aggiorna link dalla sidebar**

Il label nella sidebar cambia da "Doc Monitor" a "Scanner Tecnico (Allegato IV)".

- [ ] **Step 10.3: Commit**

```bash
git add src/app/dashboard/modules/aia-architect/page.tsx src/app/dashboard/layout.tsx
git commit -m "refactor(aia-architect): reposition as technical scanner, not full Annex IV generator"
```

---

## TASK 11 — Guardian Agent: Webhook Reale

**Files:**
- Modify: `src/app/dashboard/modules/guardian-agent/page.tsx`

- [ ] **Step 11.1: Sostituisci animazione kill switch con form webhook**

```typescript
// Aggiungi stato webhook in cima al componente:
const [webhookUrl, setWebhookUrl] = useState(() =>
  typeof window !== "undefined" ? localStorage.getItem("guardian_webhook_url") ?? "" : ""
);
const [webhookSecret, setWebhookSecret] = useState(() =>
  typeof window !== "undefined" ? localStorage.getItem("guardian_webhook_secret") ?? "" : ""
);
const [webhookStatus, setWebhookStatus] = useState<"idle" | "firing" | "sent" | "error">("idle");

// Sostituisci KillSwitch con:
async function fireKillSwitch() {
  if (!webhookUrl) {
    setError("Configura prima l'URL del webhook di emergenza.");
    return;
  }
  setWebhookStatus("firing");
  try {
    const res = await fetch("/api/guardian/kill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webhookUrl, secret: webhookSecret }),
    });
    if (!res.ok) throw new Error("Webhook failed");
    setWebhookStatus("sent");
    // Registra su evidence layer
    await fetch("/api/logvault/append", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "KILL_SWITCH_ACTIVATED", level: "critical", agent: "guardian" }),
    });
  } catch {
    setWebhookStatus("error");
  }
}
```

- [ ] **Step 11.2: Crea API route guardian/kill**

```typescript
// src/app/api/guardian/kill/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { webhookUrl, secret } = await request.json() as {
      webhookUrl?: string;
      secret?: string;
    };

    if (!webhookUrl) {
      return NextResponse.json({ error: "webhookUrl required" }, { status: 400 });
    }

    const payload = {
      event: "AICOMPLY_KILL_SWITCH",
      timestamp: new Date().toISOString(),
      source: "aicomply-guardian-agent",
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Firma HMAC se il segreto è configurato
    if (secret) {
      const signature = createHmac("sha256", secret)
        .update(JSON.stringify(payload))
        .digest("hex");
      headers["X-AIComply-Signature"] = `sha256=${signature}`;
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000), // 10s timeout
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Webhook endpoint returned ${response.status}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, status: response.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 11.3: Aggiorna UI Guardian Agent con form configurazione webhook**

```typescript
// Aggiungi form configurazione prima del Kill Switch:
<div className="rounded-xl p-4 space-y-3 mb-4" style={{ border: "1px solid rgba(0,0,0,0.1)" }}>
  <p className="text-[13px] font-medium" style={{ color: "#0D1016" }}>
    Configurazione Kill Switch (Art. 14)
  </p>
  <div>
    <label className="block text-[11px] mb-1" style={{ color: "rgba(0,0,0,0.5)" }}>
      Webhook URL (endpoint del tuo container AI)
    </label>
    <input
      type="url"
      value={webhookUrl}
      onChange={(e) => {
        setWebhookUrl(e.target.value);
        localStorage.setItem("guardian_webhook_url", e.target.value);
      }}
      placeholder="https://tua-infrastruttura.com/api/emergency-stop"
      className="w-full rounded-lg px-3 py-2 text-[12px]"
      style={{ border: "1px solid rgba(0,0,0,0.12)", color: "#0D1016" }}
    />
  </div>
  <div>
    <label className="block text-[11px] mb-1" style={{ color: "rgba(0,0,0,0.5)" }}>
      Secret HMAC (opzionale, per firma della richiesta)
    </label>
    <input
      type="password"
      value={webhookSecret}
      onChange={(e) => {
        setWebhookSecret(e.target.value);
        localStorage.setItem("guardian_webhook_secret", e.target.value);
      }}
      placeholder="••••••••"
      className="w-full rounded-lg px-3 py-2 text-[12px]"
      style={{ border: "1px solid rgba(0,0,0,0.12)", color: "#0D1016" }}
    />
  </div>
</div>
```

- [ ] **Step 11.4: Commit**

```bash
git add src/app/api/guardian/kill/route.ts src/app/dashboard/modules/guardian-agent/page.tsx
git commit -m "feat(guardian): real webhook-based kill switch with HMAC signature"
```

---

## TASK 12 — Push finale su main

- [ ] **Step 12.1: Verifica build**

```bash
cd /Users/umbertomottola/Desktop/open\ code\ -\ ai\ act\ saas/aicomply
npm run build -- --webpack 2>&1 | tail -20
```

- [ ] **Step 12.2: Merge e push su main**

```bash
git checkout main
git merge claude/goofy-villani-d80bd6
git push origin main
```

---

## Note su dipendenze esterne richieste

| Servizio | Dove configurare | Env var |
|---|---|---|
| Upstash Redis | upstash.com → Redis → REST API | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| Supabase Migration | Supabase Dashboard → SQL Editor | — |
| NEXT_PUBLIC_APP_URL | Vercel env vars | `NEXT_PUBLIC_APP_URL=https://aicomply.vercel.app` |
| SUPABASE_SERVICE_ROLE_KEY | Già in Supabase → Settings → API | `SUPABASE_SERVICE_ROLE_KEY` |
