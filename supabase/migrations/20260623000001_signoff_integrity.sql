-- ============================================================
-- AIComply — Sign-off & Integrity Infrastructure
-- Migration: 20260623000001_signoff_integrity.sql
--
-- Tabelle:
--   sign_off_register  — Bucket A (Art. 18 — conservazione 10 anni)
--   integrity_seals    — Bucket B (Art. 19 — ≥ 6 mesi)
--
-- Entrambe sono append-only con hash-chain (tamper-evident).
-- UPDATE e DELETE sono bloccati da trigger e Rule Postgres.
-- ============================================================

-- ─── sign_off_register — Bucket A ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sign_off_register (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Identificazione del documento
  tool_key          TEXT        NOT NULL,
  scope_id          TEXT        NOT NULL,
  ai_system_id      UUID,

  -- Versione e integrità del documento
  document_version  TEXT        NOT NULL,
  content_hash      TEXT        NOT NULL,  -- SHA-256 del documento canonicalizzato

  -- Firmatario (SES: nome+ruolo+email; All. V §8: +on_behalf)
  signer            JSONB       NOT NULL,
  -- { name, role, email?, onBehalf? }

  -- Timestamp e livello firma
  signed_at         TIMESTAMPTZ NOT NULL,
  signature_level   TEXT        NOT NULL DEFAULT 'ses'
                      CHECK (signature_level IN ('ses', 'ades', 'qes')),

  -- QTSP (null al livello base SES)
  qualified_timestamp  JSONB,   -- { token, tsa, at }
  provider_ref         JSONB,   -- { envelopeId, provider }

  -- Riferimento normativo
  legal_ref         TEXT        NOT NULL,

  -- Conservazione obbligatoria — Art. 18 (10 anni)
  retention_until   TIMESTAMPTZ NOT NULL,

  -- Hash-chain (tamper-evident)
  prev_record_hash  TEXT,                  -- null per il primo record
  record_hash       TEXT        NOT NULL,  -- SHA-256(canonical(record) + prev_hash)

  -- Metadati di sistema
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signoff_org_scope
  ON public.sign_off_register(organization_id, scope_id, signed_at DESC);
CREATE INDEX IF NOT EXISTS idx_signoff_tool_key
  ON public.sign_off_register(organization_id, tool_key);
CREATE INDEX IF NOT EXISTS idx_signoff_retention
  ON public.sign_off_register(retention_until);

ALTER TABLE public.sign_off_register ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "signoff_org_select" ON public.sign_off_register;
CREATE POLICY "signoff_org_select" ON public.sign_off_register
  FOR SELECT USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "signoff_org_insert" ON public.sign_off_register;
CREATE POLICY "signoff_org_insert" ON public.sign_off_register
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  );

-- Blocco UPDATE e DELETE a livello di motore (difesa in profondità rispetto a RLS)
CREATE OR REPLACE RULE signoff_no_update AS
  ON UPDATE TO public.sign_off_register DO INSTEAD NOTHING;

CREATE OR REPLACE RULE signoff_no_delete AS
  ON DELETE TO public.sign_off_register DO INSTEAD NOTHING;

COMMENT ON TABLE public.sign_off_register IS
  'Registro immutabile dei sign-off (Bucket A AI Act). Art. 18: conservazione 10 anni. '
  'Hash-chain: ogni record include SHA-256 del precedente. Append-only by design.';


-- ─── integrity_seals — Bucket B ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.integrity_seals (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  tool_key          TEXT        NOT NULL,
  scope_id          TEXT        NOT NULL,
  log_ref           TEXT        NOT NULL,  -- batch ID o range di record log

  content_hash      TEXT        NOT NULL,  -- SHA-256 del batch di log
  sealed_at         TIMESTAMPTZ NOT NULL,

  -- QTSP opzionale
  qualified_timestamp  JSONB,

  -- Conservazione — Art. 19 (≥ 6 mesi, configurabile per finalità)
  retention_until   TIMESTAMPTZ NOT NULL,

  -- Hash-chain
  prev_seal_hash    TEXT,
  seal_hash         TEXT        NOT NULL,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seals_org_scope
  ON public.integrity_seals(organization_id, scope_id, sealed_at DESC);
CREATE INDEX IF NOT EXISTS idx_seals_tool_key
  ON public.integrity_seals(organization_id, tool_key);

ALTER TABLE public.integrity_seals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seals_org_select" ON public.integrity_seals;
CREATE POLICY "seals_org_select" ON public.integrity_seals
  FOR SELECT USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "seals_org_insert" ON public.integrity_seals;
CREATE POLICY "seals_org_insert" ON public.integrity_seals
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  );

CREATE OR REPLACE RULE seals_no_update AS
  ON UPDATE TO public.integrity_seals DO INSTEAD NOTHING;

CREATE OR REPLACE RULE seals_no_delete AS
  ON DELETE TO public.integrity_seals DO INSTEAD NOTHING;

COMMENT ON TABLE public.integrity_seals IS
  'Sigilli di integrità (Bucket B AI Act). Art. 19: ≥ 6 mesi. '
  'Nessun firmatario — solo hash + timestamp. Append-only by design.';
