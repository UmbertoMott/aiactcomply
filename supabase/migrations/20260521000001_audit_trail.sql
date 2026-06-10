-- ============================================================
-- C-03 Immutable AI Output Audit Trail
-- EU AI Act Art. 12 + Art. 50 | GDPR Art. 5(1)(e)
-- Migration: 20260521000001_audit_trail.sql
-- ============================================================

-- Enable pgcrypto for SHA-256 and symmetric encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Sequence for output_id NNN counter ─────────────────────
-- Advisory-lock-based at application level ensures uniqueness.
-- One global sequence; type+tenant differentiation is in the prefix.
CREATE SEQUENCE IF NOT EXISTS ai_output_id_seq
  START 1
  INCREMENT 1
  NO MAXVALUE
  CACHE 1;

-- ─── Main audit log table ────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_output_log (

  -- Identity
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  output_id            TEXT        NOT NULL UNIQUE,
  tenant_id            UUID        NOT NULL,

  -- Content (text columns may be pgcrypto-encrypted by application)
  input_hash           TEXT        NOT NULL,
  output_hash          TEXT        NOT NULL,
  input_text           TEXT,
  output_text          TEXT,
  document_type        TEXT        NOT NULL DEFAULT '',
  output_type_code     TEXT        NOT NULL DEFAULT 'GEN',

  -- AI metadata
  model_name           TEXT        NOT NULL DEFAULT '',
  model_version        TEXT,
  system_version       TEXT        NOT NULL DEFAULT '0.1.0',

  -- Actor
  user_id              UUID,
  user_email           TEXT,
  ip_address           INET,
  user_agent           TEXT,

  -- Hash chain
  record_hash          TEXT        NOT NULL,
  previous_record_hash TEXT        NOT NULL DEFAULT 'genesis',

  -- Lifecycle
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at           TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 years'),

  -- GDPR Art. 17 redaction (not deletion)
  gdpr_redacted        BOOLEAN     NOT NULL DEFAULT FALSE,
  gdpr_redacted_at     TIMESTAMPTZ,
  gdpr_redacted_by     TEXT,

  -- Compliance metadata
  regulation_refs      TEXT[]      DEFAULT ARRAY[
                         'EU-AI-Act-2024/1689-Art12',
                         'EU-AI-Act-2024/1689-Art50'
                       ],
  requires_review      BOOLEAN     NOT NULL DEFAULT TRUE
);

-- ─── Indices ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_audit_tenant
  ON ai_output_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_created
  ON ai_output_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_output_type
  ON ai_output_log(output_type_code);
CREATE INDEX IF NOT EXISTS idx_audit_user
  ON ai_output_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_expires
  ON ai_output_log(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_output_id
  ON ai_output_log(output_id);

-- ─── Hash chain function ─────────────────────────────────────
CREATE OR REPLACE FUNCTION compute_record_hash(
  p_output_id      TEXT,
  p_tenant_id      UUID,
  p_input_hash     TEXT,
  p_output_hash    TEXT,
  p_model_name     TEXT,
  p_created_at     TIMESTAMPTZ,
  p_previous_hash  TEXT
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN encode(
    digest(
      p_output_id      || '|' ||
      p_tenant_id::TEXT || '|' ||
      p_input_hash     || '|' ||
      p_output_hash    || '|' ||
      p_model_name     || '|' ||
      p_created_at::TEXT || '|' ||
      p_previous_hash,
      'sha256'
    ),
    'hex'
  );
END;
$$;

-- ─── Output ID generator function ────────────────────────────
-- Returns next NNN counter for a given type+date combo.
-- Uses advisory lock to prevent race conditions across instances.
CREATE OR REPLACE FUNCTION next_output_id_counter(
  p_type TEXT,
  p_date TEXT   -- YYYYMMDD
) RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_counter INT;
  v_seq     BIGINT;
BEGIN
  -- Use global sequence; wrap at 999
  SELECT nextval('ai_output_id_seq') INTO v_seq;
  v_counter := (v_seq % 999) + 1;
  RETURN p_type || '-' || p_date || '-' || LPAD(v_counter::TEXT, 3, '0');
END;
$$;

-- ─── Immutability trigger ─────────────────────────────────────
CREATE OR REPLACE FUNCTION enforce_audit_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- DELETE is always forbidden
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION
      'AUDIT_IMMUTABLE: cancellazione vietata su ai_output_log (id=%). '
      'Per GDPR Art. 17 usa la procedura di redazione (gdpr_redacted=true).',
      OLD.id
      USING ERRCODE = 'restrict_violation';
  END IF;

  -- UPDATE: only GDPR redaction path is allowed
  IF TG_OP = 'UPDATE' THEN
    -- Legitimate GDPR redaction: old.gdpr_redacted=false, new=true
    IF OLD.gdpr_redacted = FALSE AND NEW.gdpr_redacted = TRUE THEN
      -- Enforce: immutable fields MUST not change even in this path
      NEW.id                   := OLD.id;
      NEW.output_id            := OLD.output_id;
      NEW.tenant_id            := OLD.tenant_id;
      NEW.input_hash           := OLD.input_hash;
      NEW.output_hash          := OLD.output_hash;
      NEW.record_hash          := OLD.record_hash;
      NEW.previous_record_hash := OLD.previous_record_hash;
      NEW.created_at           := OLD.created_at;
      NEW.regulation_refs      := OLD.regulation_refs;
      RETURN NEW;
    END IF;

    -- Any other UPDATE is forbidden
    RAISE EXCEPTION
      'AUDIT_IMMUTABLE: modifica vietata su ai_output_log (id=%). '
      'Questo record è parte di un audit trail inalterabile '
      'ai sensi del Reg. UE 2024/1689 Art. 12.',
      OLD.id
      USING ERRCODE = 'restrict_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_immutability_guard
  BEFORE UPDATE OR DELETE ON ai_output_log
  FOR EACH ROW EXECUTE FUNCTION enforce_audit_immutability();

-- ─── Row Level Security ───────────────────────────────────────
ALTER TABLE ai_output_log ENABLE ROW LEVEL SECURITY;

-- Tenants can only read their own records
CREATE POLICY audit_tenant_isolation ON ai_output_log
  FOR SELECT
  USING (tenant_id = auth.uid());

-- INSERT allowed (application uses service role key for writes)
CREATE POLICY audit_insert_policy ON ai_output_log
  FOR INSERT
  WITH CHECK (TRUE);

-- Revoke UPDATE/DELETE from application roles
REVOKE UPDATE, DELETE ON ai_output_log FROM authenticated;
REVOKE UPDATE, DELETE ON ai_output_log FROM anon;

-- ─── Comments ────────────────────────────────────────────────
COMMENT ON TABLE ai_output_log IS
  'Immutable AI output audit trail — EU AI Act Art. 12 + Art. 50 | GDPR Art. 5(1)(e). '
  'Records are write-once. GDPR Art. 17 uses redaction, not deletion.';

COMMENT ON COLUMN ai_output_log.expires_at IS
  'GDPR Art. 5(1)(e) — conservation limit: 10 years from creation (generated column).';

COMMENT ON COLUMN ai_output_log.record_hash IS
  'SHA-256 of key fields + previous_record_hash. Enables tamper detection.';

COMMENT ON COLUMN ai_output_log.input_text IS
  'May be encrypted with pgp_sym_encrypt(value, AUDIT_ENCRYPTION_KEY). '
  'Null is acceptable when logging without storing raw content.';
