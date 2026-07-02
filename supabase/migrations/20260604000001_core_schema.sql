-- ============================================================
-- AIComply Core Schema — v1.0
-- Progetti B (Annex IV Builder) + D (LogVault) + E (MOG 231)
-- EU AI Act Art. 11, 12, 17 | L. 132/2025 | D.Lgs. 231/2001
-- Migration: 20260604000001_core_schema.sql
-- ============================================================

-- ─── AI Systems Registry ─────────────────────────────────────────────────────
-- Registro centrale di tutti i sistemi AI dell'organizzazione
CREATE TABLE IF NOT EXISTS ai_systems (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                TEXT        NOT NULL,
  description         TEXT,
  provider            TEXT,                          -- chi sviluppa il sistema
  deployer            TEXT,                          -- chi lo mette in produzione
  risk_tier           TEXT        NOT NULL DEFAULT 'unknown',
                                                     -- prohibited | high | limited | minimal | gpai
  annex3_category     TEXT,                          -- categoria Annex III EU AI Act
  framework           TEXT[]      DEFAULT '{eu_ai_act}',
                                                     -- eu_ai_act | nist_rmf | l132
  intended_purpose    TEXT,
  sector              TEXT,                          -- sanità | hr | istruzione | etc
  is_high_risk        BOOLEAN     DEFAULT FALSE,
  is_gpai             BOOLEAN     DEFAULT FALSE,
  status              TEXT        DEFAULT 'active',  -- active | decommissioned | under_review
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_systems_user_id ON ai_systems(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_systems_risk_tier ON ai_systems(risk_tier);

-- ─── Annex IV Technical File (Progetto B) ────────────────────────────────────
-- Documentazione tecnica obbligatoria per sistemi ad alto rischio (Art. 11)
-- Struttura esatta secondo Annex IV EU AI Act
CREATE TABLE IF NOT EXISTS technical_files (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_system_id        UUID        NOT NULL REFERENCES ai_systems(id) ON DELETE CASCADE,
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version             INTEGER     DEFAULT 1,
  status              TEXT        DEFAULT 'draft',   -- draft | complete | exported | archived

  -- Annex IV Section 1: Descrizione generale del sistema AI
  s1_general          JSONB       DEFAULT '{}',
  -- { name, version, purpose, intended_users, deployment_context,
  --   human_oversight_description, instructions_for_use }

  -- Annex IV Section 2: Descrizione degli elementi del sistema AI
  s2_components       JSONB       DEFAULT '{}',
  -- { architecture, algorithms, model_type, training_approach,
  --   frameworks_used, hardware_requirements, software_dependencies }

  -- Annex IV Section 3: Informazioni sui dati di addestramento
  s3_data_governance  JSONB       DEFAULT '{}',
  -- { training_datasets, validation_datasets, test_datasets,
  --   data_sources, data_quality_measures, bias_mitigation,
  --   personal_data_used, gdpr_basis }

  -- Annex IV Section 4: Monitoraggio, funzionamento e controllo
  s4_monitoring       JSONB       DEFAULT '{}',
  -- { logging_capabilities, monitoring_measures, human_oversight_measures,
  --   stop_mechanisms, incident_reporting }

  -- Annex IV Section 5: Specifiche tecniche sulla trasparenza
  s5_transparency     JSONB       DEFAULT '{}',
  -- { explainability_methods, user_information, disclosure_mechanisms }

  -- Annex IV Section 6: Accuratezza, robustezza e sicurezza informatica
  s6_performance      JSONB       DEFAULT '{}',
  -- { accuracy_metrics, benchmark_results, robustness_measures,
  --   cybersecurity_measures, resilience_testing }

  -- Annex IV Section 7: Dichiarazione di conformità UE (link ad Art. 47)
  s7_declaration      JSONB       DEFAULT '{}',
  -- { conformity_assessment_procedure, notified_body, declaration_reference }

  -- Completeness tracking
  completeness_score  INTEGER     DEFAULT 0,         -- 0-100
  sections_complete   TEXT[]      DEFAULT '{}',

  -- Export
  exported_at         TIMESTAMPTZ,
  export_format       TEXT,                          -- markdown | pdf | docx
  export_url          TEXT,

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_technical_files_ai_system ON technical_files(ai_system_id);
CREATE INDEX IF NOT EXISTS idx_technical_files_user ON technical_files(user_id);
CREATE INDEX IF NOT EXISTS idx_technical_files_status ON technical_files(status);

-- ─── MOG 231 Protocols (Progetto E) ──────────────────────────────────────────
-- Modello di Organizzazione e Gestione ex D.Lgs. 231/2001
-- Integrato con L. 132/2025 (Legge Italiana sull'AI)
CREATE TABLE IF NOT EXISTS mog_231_protocols (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_system_id        UUID        NOT NULL REFERENCES ai_systems(id) ON DELETE CASCADE,
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Parte A: Mappatura aree di rischio AI legate a reati 231
  part_a_risk_areas   JSONB       DEFAULT '{}',
  -- { reati_informatici: bool, privacy_violations: bool,
  --   market_manipulation: bool, discrimination: bool,
  --   risk_level: low|medium|high|critical }

  -- Parte B: Protocolli di controllo specifici per AI
  part_b_protocols    JSONB       DEFAULT '{}',
  -- { procurement_protocol: text, deployment_protocol: text,
  --   monitoring_protocol: text, incident_protocol: text,
  --   sanctions_system: text }

  -- Parte C: Organismo di Vigilanza (ODV)
  part_c_odv          JSONB       DEFAULT '{}',
  -- { odv_composition: text, odv_powers: text,
  --   reporting_flows: text, audit_frequency: text }

  -- Parte D: Formazione e Alfabetizzazione AI (Art. 4 L.132/2025)
  part_d_training     JSONB       DEFAULT '{}',
  -- { training_plan: text, completed_courses: [], hours_per_role: {},
  --   next_training_date: date, literacy_score: 0-100 }

  -- L. 132/2025 Compliance Flags
  l132_deepfake_compliant       BOOLEAN DEFAULT FALSE,
  l132_minors_protection        BOOLEAN DEFAULT FALSE,
  l132_hr_transparency          BOOLEAN DEFAULT FALSE,
  l132_content_labeling         BOOLEAN DEFAULT FALSE,
  l132_biometric_compliant      BOOLEAN DEFAULT FALSE,

  -- Sanzioni penali awareness (Art. L.132 - reclusione fino a 5 anni)
  criminal_risk_acknowledged    BOOLEAN DEFAULT FALSE,
  criminal_risk_acknowledged_at TIMESTAMPTZ,

  -- Autorità di vigilanza (AGID / ACN)
  agid_notified       BOOLEAN DEFAULT FALSE,
  acn_notified        BOOLEAN DEFAULT FALSE,
  supervisory_notes   TEXT,

  status              TEXT        DEFAULT 'draft',
  completeness_score  INTEGER     DEFAULT 0,

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mog231_ai_system ON mog_231_protocols(ai_system_id);
CREATE INDEX IF NOT EXISTS idx_mog231_user ON mog_231_protocols(user_id);

-- ─── Compliance Logs / LogVault Server-Side (Progetto D) ─────────────────────
-- Art. 12 EU AI Act: logging obbligatorio per sistemi ad alto rischio
-- Riceve eventi da SDK Python/JS via API
CREATE TABLE IF NOT EXISTS compliance_logs (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_system_id        UUID        REFERENCES ai_systems(id) ON DELETE SET NULL,
  user_id             UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  api_key_hash        TEXT,                          -- per autenticazione SDK

  -- Evento
  event_type          TEXT        NOT NULL,          -- inference | alert | drift | audit | error
  model_id            TEXT,
  model_version       TEXT,

  -- Contenuto (opzionale, può essere hashed per privacy)
  prompt_hash         TEXT,                          -- SHA-256 del prompt
  output_hash         TEXT,                          -- SHA-256 dell'output
  prompt_preview      TEXT,                          -- primi 200 chars (opzionale)

  -- Performance
  latency_ms          INTEGER,
  token_count         INTEGER,

  -- Conformità
  flagged             BOOLEAN     DEFAULT FALSE,
  flag_reason         TEXT,
  flag_severity       TEXT,                          -- info | warning | critical
  within_guardrails   BOOLEAN     DEFAULT TRUE,

  -- Metadata
  metadata            JSONB       DEFAULT '{}',
  -- { user_agent, ip_hash, session_id, custom_tags }

  -- Hash chain (Art. 12 integrità)
  record_hash         TEXT,
  previous_hash       TEXT,

  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_logs_system ON compliance_logs(ai_system_id);
CREATE INDEX IF NOT EXISTS idx_compliance_logs_flagged ON compliance_logs(flagged) WHERE flagged = TRUE;
CREATE INDEX IF NOT EXISTS idx_compliance_logs_created ON compliance_logs(created_at DESC);

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE ai_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE technical_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE mog_231_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_logs ENABLE ROW LEVEL SECURITY;

-- Ogni utente vede solo i propri dati
DROP POLICY IF EXISTS "users_own_ai_systems" ON ai_systems;
CREATE POLICY "users_own_ai_systems" ON ai_systems
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_own_technical_files" ON technical_files;
CREATE POLICY "users_own_technical_files" ON technical_files
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_own_mog231" ON mog_231_protocols;
CREATE POLICY "users_own_mog231" ON mog_231_protocols
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_own_logs" ON compliance_logs;
CREATE POLICY "users_own_logs" ON compliance_logs
  FOR ALL USING (auth.uid() = user_id);

-- ─── Auto-update updated_at ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ai_systems_updated_at ON ai_systems;
CREATE TRIGGER ai_systems_updated_at
  BEFORE UPDATE ON ai_systems
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS technical_files_updated_at ON technical_files;
CREATE TRIGGER technical_files_updated_at
  BEFORE UPDATE ON technical_files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS mog231_updated_at ON mog_231_protocols;
CREATE TRIGGER mog231_updated_at
  BEFORE UPDATE ON mog_231_protocols
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
