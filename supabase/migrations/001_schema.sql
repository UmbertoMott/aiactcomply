-- AIComply — PostgreSQL Schema v1
-- Esegui nel Supabase Dashboard → SQL Editor
-- Multi-tenant con RLS (Row Level Security)

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
create policy "triage_org_insert" on public.triage_records
  for insert with check (organization_id in (
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
create policy "risk_org_write" on public.risk_matrix
  for insert with check (organization_id in (
    select id from public.organizations where owner_id = auth.uid()
  ));
create policy "risk_org_update" on public.risk_matrix
  for update using (organization_id in (
    select id from public.organizations where owner_id = auth.uid()
  ));
create policy "risk_org_delete" on public.risk_matrix
  for delete using (organization_id in (
    select id from public.organizations where owner_id = auth.uid()
  ));

-- ── Evidence Records (WORM — append-only) ────────────────────────────────────
create table if not exists public.evidence_records (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  type            text not null,
  content         jsonb not null,
  content_hash    text not null,
  prev_hash       text not null default '',
  created_at      timestamptz not null default now()
  -- NO updated_at intenzionale: record immutabile (WORM)
);
alter table public.evidence_records enable row level security;
-- Solo SELECT e INSERT — niente UPDATE/DELETE (WORM)
create policy "evidence_org_read" on public.evidence_records
  for select using (organization_id in (
    select id from public.organizations where owner_id = auth.uid()
  ));
create policy "evidence_org_insert" on public.evidence_records
  for insert with check (organization_id in (
    select id from public.organizations where owner_id = auth.uid()
  ));

-- ── Log Chain (WORM — append-only) ────────────────────────────────────────────
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
  -- NO updated_at intenzionale: WORM
);
alter table public.log_chain enable row level security;
-- Solo SELECT e INSERT (WORM)
create policy "log_org_read" on public.log_chain
  for select using (organization_id in (
    select id from public.organizations where owner_id = auth.uid()
  ));
create policy "log_org_insert" on public.log_chain
  for insert with check (organization_id in (
    select id from public.organizations where owner_id = auth.uid()
  ));

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
create policy "docugen_org_write" on public.docugen_drafts
  for insert with check (organization_id in (
    select id from public.organizations where owner_id = auth.uid()
  ));
create policy "docugen_org_update" on public.docugen_drafts
  for update using (organization_id in (
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
create policy "incidents_org_write" on public.post_market_incidents
  for insert with check (organization_id in (
    select id from public.organizations where owner_id = auth.uid()
  ));
create policy "incidents_org_update" on public.post_market_incidents
  for update using (organization_id in (
    select id from public.organizations where owner_id = auth.uid()
  ));

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists idx_evidence_org     on public.evidence_records(organization_id, created_at desc);
create index if not exists idx_log_org          on public.log_chain(organization_id, created_at desc);
create index if not exists idx_risk_org         on public.risk_matrix(organization_id);
create index if not exists idx_incidents_org    on public.post_market_incidents(organization_id, occurred_at desc);
create index if not exists idx_org_trust_token  on public.organizations(trust_token);
create index if not exists idx_triage_org       on public.triage_records(organization_id, created_at desc);
create index if not exists idx_docugen_org      on public.docugen_drafts(organization_id);
create index if not exists idx_user_roles_user  on public.user_roles(user_id);
