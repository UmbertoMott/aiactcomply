-- ============================================================
-- AIComply — Fase 1: Compliance Persistence Layer
-- Migration: 20260610000001_fase1_compliance_persistence.sql
--
-- Implementa:
-- 1.1  organization_id su tool data + RLS multi-tenant
-- 1.2  documents / extracted_facts / field_history (RAG workflow)
-- 1.3  LogVault append-only hard-enforce + hash_anchors
-- 1.4  document_versions (immutable versioning per Art. 43(4))
-- ============================================================

-- ─── 1.1 — Tool States (bridge localStorage → Supabase) ──────────────────────
-- Tabella generica che persiste il JSON di stato di ogni tool di compliance.
-- È la migrazione path da localStorage: ogni tool scrive qui con upsert.
-- Constraint: un solo record "attivo" per (organization_id, tool_id).
-- Storico completo in document_versions (sezione 1.4).
CREATE TABLE IF NOT EXISTS public.tool_states (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_id           TEXT        NOT NULL,
  -- es. 'classifier' | 'riskManager' | 'dataAudit' | 'dpia' | 'fria' | ...
  state_data        JSONB       NOT NULL DEFAULT '{}',
  -- Snapshot del contenuto del tool (struttura corrispondente a storage-schema.ts)
  schema_version    INTEGER     NOT NULL DEFAULT 1,
  -- Incrementato quando cambia la struttura del JSON (future migrations)
  saved_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  saved_by          UUID        REFERENCES auth.users(id),
  -- Metadati di contesto
  system_name       TEXT,       -- nome del sistema AI a cui si riferisce
  risk_tier         TEXT,       -- tier al momento del salvataggio
  UNIQUE (organization_id, tool_id)
  -- Un solo record per tool per organizzazione (upsert on conflict)
);

CREATE INDEX IF NOT EXISTS idx_tool_states_org_tool
  ON public.tool_states(organization_id, tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_states_saved_at
  ON public.tool_states(organization_id, saved_at DESC);

ALTER TABLE public.tool_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tool_states_org_select" ON public.tool_states;
CREATE POLICY "tool_states_org_select" ON public.tool_states
  FOR SELECT USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "tool_states_org_insert" ON public.tool_states;
CREATE POLICY "tool_states_org_insert" ON public.tool_states
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "tool_states_org_update" ON public.tool_states;
CREATE POLICY "tool_states_org_update" ON public.tool_states
  FOR UPDATE USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "tool_states_org_delete" ON public.tool_states;
CREATE POLICY "tool_states_org_delete" ON public.tool_states
  FOR DELETE USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  );

-- Auto-update saved_at
CREATE OR REPLACE FUNCTION update_updated_at_saved_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.saved_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tool_states_saved_at ON public.tool_states;
CREATE TRIGGER tool_states_saved_at
  BEFORE UPDATE ON public.tool_states
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_saved_at();


-- ─── 1.4 — Document Versions (Art. 43(4) — immutable versioning) ─────────────
-- Ogni salvataggio "Finalizza versione" crea una riga immutabile qui.
-- Il tool_states sopra tiene solo l'ultimo stato attivo.
-- document_versions tiene tutta la storia.
CREATE TABLE IF NOT EXISTS public.document_versions (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id               UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_id               TEXT        NOT NULL,
  version_tag           TEXT        NOT NULL,   -- 'v1.0', 'v2.0', 'bozza-3', ...
  label                 TEXT        NOT NULL,
  note                  TEXT,                   -- nota libera compilata dall'utente
  status                TEXT        NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft', 'finalized')),
  state_data            JSONB       NOT NULL,   -- snapshot completo del tool
  sections_snapshot     JSONB,                  -- Record<sectionId, 'empty'|'draft'|'done'>
  sections_changed      TEXT[],                 -- sezioni cambiate rispetto alla versione precedente
  system_name           TEXT,
  risk_tier             TEXT,
  -- Art. 6(3) substantial modification
  is_substantial_modification BOOLEAN DEFAULT FALSE,
  subst_modification_basis    TEXT,
  -- Integrità
  content_hash          TEXT,                   -- SHA-256 di state_data::text
  previous_version_id   UUID        REFERENCES public.document_versions(id),
  saved_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- NO updated_at: record immutabile
);

CREATE INDEX IF NOT EXISTS idx_doc_versions_org_tool
  ON public.document_versions(organization_id, tool_id, saved_at DESC);
CREATE INDEX IF NOT EXISTS idx_doc_versions_status
  ON public.document_versions(organization_id, tool_id, status);

ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "doc_versions_org_select" ON public.document_versions;
CREATE POLICY "doc_versions_org_select" ON public.document_versions
  FOR SELECT USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "doc_versions_org_insert" ON public.document_versions;
CREATE POLICY "doc_versions_org_insert" ON public.document_versions
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  );
-- NO UPDATE policy — immutabile per design
-- UPDATE consentito solo da service_role (admin) per casi eccezionali documentati

-- Funzione helper: verifica che il tag sia unico per (org, tool)
CREATE OR REPLACE FUNCTION check_version_tag_unique()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.document_versions
    WHERE organization_id = NEW.organization_id
      AND tool_id = NEW.tool_id
      AND version_tag = NEW.version_tag
      AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'Version tag "%" già esistente per questo tool/organizzazione', NEW.version_tag;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS doc_versions_unique_tag ON public.document_versions;
CREATE TRIGGER doc_versions_unique_tag
  BEFORE INSERT ON public.document_versions
  FOR EACH ROW EXECUTE FUNCTION check_version_tag_unique();


-- ─── 1.2 — Documents / Extracted Facts / Field History (RAG workflow) ─────────

-- Documenti caricati dall'utente (contratti, specifiche tecniche, etc.)
CREATE TABLE IF NOT EXISTS public.documents (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_system_id      UUID,       -- FK verso ai_systems se disponibile
  filename          TEXT        NOT NULL,
  storage_path      TEXT        NOT NULL,   -- path su Supabase Storage
  mime_type         TEXT,
  size_bytes        BIGINT,
  uploaded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by       UUID        REFERENCES auth.users(id),
  processing_status TEXT        NOT NULL DEFAULT 'pending'
                      CHECK (processing_status IN ('pending', 'processing', 'done', 'failed')),
  source_hash       TEXT        NOT NULL,   -- SHA-256 del file (deduplicazione)
  processing_error  TEXT,
  metadata          JSONB       DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_documents_org
  ON public.documents(organization_id, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_status
  ON public.documents(processing_status) WHERE processing_status != 'done';
CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_source_hash_org
  ON public.documents(organization_id, source_hash);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents_org_all" ON public.documents;
CREATE POLICY "documents_org_all" ON public.documents
  FOR ALL USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  );


-- Fatti estratti da documenti via AI (status: suggested → confirmed/rejected)
-- VINCOLO CRITICO: un extracted_fact non può mai diventare valore applicativo
-- finché status != 'confirmed'. La UI mostra 'suggested' in ambra.
CREATE TABLE IF NOT EXISTS public.extracted_facts (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  document_id       UUID        NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  ai_system_id      UUID,
  -- Campo di destinazione: es. 'risk_manager.intended_purpose', 'classifier.systemDescription'
  field_target      TEXT        NOT NULL,
  -- Valore suggerito (testo o JSON)
  suggested_value   TEXT        NOT NULL,
  -- Porzione del documento sorgente (obbligatoria — mai vuota)
  source_excerpt    TEXT        NOT NULL
                      CHECK (char_length(source_excerpt) > 0),
  source_location   TEXT,       -- es. 'pagina 3, paragrafo 2'
  confidence_score  NUMERIC(4,3) CHECK (confidence_score BETWEEN 0 AND 1),
  -- Workflow di conferma
  status            TEXT        NOT NULL DEFAULT 'suggested'
                      CHECK (status IN ('suggested', 'confirmed', 'edited', 'rejected')),
  confirmed_by      UUID        REFERENCES auth.users(id),
  confirmed_at      TIMESTAMPTZ,
  edited_value      TEXT,       -- se l'utente ha modificato il valore prima di confermare
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_extracted_facts_org_field
  ON public.extracted_facts(organization_id, field_target);
CREATE INDEX IF NOT EXISTS idx_extracted_facts_status
  ON public.extracted_facts(organization_id, status) WHERE status = 'suggested';
CREATE INDEX IF NOT EXISTS idx_extracted_facts_document
  ON public.extracted_facts(document_id);

ALTER TABLE public.extracted_facts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "extracted_facts_org_all" ON public.extracted_facts;
CREATE POLICY "extracted_facts_org_all" ON public.extracted_facts
  FOR ALL USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  );

-- Trigger: quando un fact viene confermato, imposta confirmed_at automaticamente
CREATE OR REPLACE FUNCTION set_confirmed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status = 'suggested' AND NEW.confirmed_at IS NULL THEN
    NEW.confirmed_at = NOW();
    NEW.confirmed_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS extracted_facts_confirm_timestamp ON public.extracted_facts;
CREATE TRIGGER extracted_facts_confirm_timestamp
  BEFORE UPDATE ON public.extracted_facts
  FOR EACH ROW EXECUTE FUNCTION set_confirmed_at();


-- Storico completo dei cambiamenti di ogni campo (chi, quando, da quale fonte)
CREATE TABLE IF NOT EXISTS public.field_history (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ai_system_id          UUID,
  -- Campo modificato: stesso formato di extracted_facts.field_target
  field_target          TEXT        NOT NULL,
  -- Valore precedente (NULL per il primo inserimento)
  previous_value        TEXT,
  -- Nuovo valore
  value                 TEXT        NOT NULL,
  -- Fonte della modifica
  source                TEXT        NOT NULL
                          CHECK (source IN ('ai_suggested', 'manual', 'imported', 'restored')),
  -- Se source = 'ai_suggested', FK al fatto estratto (può essere NULL se manuale)
  extracted_fact_id     UUID        REFERENCES public.extracted_facts(id) ON DELETE SET NULL,
  changed_by            UUID        REFERENCES auth.users(id),
  changed_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Tool che ha originato il cambiamento
  tool_id               TEXT
);

CREATE INDEX IF NOT EXISTS idx_field_history_org_field
  ON public.field_history(organization_id, field_target, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_field_history_ai_system
  ON public.field_history(ai_system_id, changed_at DESC);

ALTER TABLE public.field_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "field_history_org_select" ON public.field_history;
CREATE POLICY "field_history_org_select" ON public.field_history
  FOR SELECT USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "field_history_org_insert" ON public.field_history;
CREATE POLICY "field_history_org_insert" ON public.field_history
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  );
-- NO UPDATE/DELETE — audit trail immutabile


-- ─── 1.3 — LogVault: hard-enforce append-only + hash anchors ─────────────────
-- log_chain è già WORM (no updated_at, no UPDATE/DELETE policy).
-- Aggiungiamo:
-- (a) Rule Postgres che blocca UPDATE/DELETE a livello di motore DB
-- (b) Tabella hash_anchors per ancoraggio esterno periodico

-- Rule che impedisce UPDATE su log_chain (difesa in profondità rispetto a RLS)
CREATE OR REPLACE RULE log_chain_no_update AS
  ON UPDATE TO public.log_chain DO INSTEAD NOTHING;

CREATE OR REPLACE RULE log_chain_no_delete AS
  ON DELETE TO public.log_chain DO INSTEAD NOTHING;

-- Tabella per ancoraggio hash esterno (Art. 12 — tamper-evident con evidenza esterna)
-- Opzione (a) del piano: hash inviato via email/notifica a indirizzo esterno controllato
CREATE TABLE IF NOT EXISTS public.hash_anchors (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Hash della chain head al momento dell'ancoraggio
  chain_head_hash   TEXT        NOT NULL,
  log_count         INTEGER     NOT NULL,           -- numero di log inclusi
  anchored_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Metodo di ancoraggio
  anchor_method     TEXT        NOT NULL DEFAULT 'email'
                      CHECK (anchor_method IN ('email', 'rfc3161', 'external_repo', 'manual')),
  -- Destinatario/riferimento dell'ancoraggio
  anchor_destination TEXT,      -- email, URL, hash commit, etc.
  -- Prova di invio
  delivery_confirmed BOOLEAN    DEFAULT FALSE,
  delivery_at        TIMESTAMPTZ,
  delivery_reference TEXT       -- message-id email, transaction ID TSA, etc.
);

CREATE INDEX IF NOT EXISTS idx_hash_anchors_org
  ON public.hash_anchors(organization_id, anchored_at DESC);

ALTER TABLE public.hash_anchors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hash_anchors_org_select" ON public.hash_anchors;
CREATE POLICY "hash_anchors_org_select" ON public.hash_anchors
  FOR SELECT USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "hash_anchors_org_insert" ON public.hash_anchors;
CREATE POLICY "hash_anchors_org_insert" ON public.hash_anchors
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  );
-- NO UPDATE/DELETE — anche gli anchor sono immutabili


-- ─── Indexes aggiuntivi ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tool_states_org
  ON public.tool_states(organization_id);
CREATE INDEX IF NOT EXISTS idx_doc_versions_org
  ON public.document_versions(organization_id, saved_at DESC);


-- ─── Commenti documentativi ───────────────────────────────────────────────────
COMMENT ON TABLE public.tool_states IS
  'Stato corrente di ogni tool di compliance per organizzazione. Bridge da localStorage a Supabase. Un record per (organization_id, tool_id) — aggiornato con upsert.';

COMMENT ON TABLE public.document_versions IS
  'Versioni immutabili dei documenti di compliance (Art. 43(4)). Non sovrascrivibili — ogni salvataggio "Finalizza versione" crea una nuova riga. Lo storico è perpetuo.';

COMMENT ON TABLE public.documents IS
  'Documenti caricati dall''utente (contratti, specifiche tecniche, manuali). Usati per estrazione RAG (extracted_facts). Privacy: aggiornare DPA con Anthropic prima del deploy pubblico.';

COMMENT ON TABLE public.extracted_facts IS
  'Fatti estratti via AI da documenti. VINCOLO: status deve essere "confirmed" prima che il valore entri nei record applicativi. La UI mostra "suggested" in ambra. MAI auto-confermare campi che influenzano classificazione risk o FRIA.';

COMMENT ON TABLE public.field_history IS
  'Audit trail immutabile di ogni modifica a campi di compliance. Traccia chi, quando, e da quale fonte (AI/manuale/importato). Non cancellabile.';

COMMENT ON TABLE public.hash_anchors IS
  'Ancoraggi periodici dell''hash-chain del LogVault a sistemi esterni. Rende il LogVault "tamper-evident con evidenza esterna" — claim onesto per Art. 12. Vedere hash_anchor_cron per scheduling.';

COMMENT ON RULE log_chain_no_update ON public.log_chain IS
  'Difesa in profondità: impedisce UPDATE a livello di motore DB, indipendentemente da RLS. Il log_chain è WORM (Write Once Read Many).';
