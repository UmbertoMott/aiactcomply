-- ──────────────────────────────────────────────────────────────────────────────
-- RAG Versioning + Auto-Update support
-- - rag_documents: registro versioni documenti normativi (manifest)
-- - rag_ingestion_runs: log delle pipeline di aggiornamento
-- - rag_chunks: aggiunta colonne version, source_url, effective_date, supersedes
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rag_documents (
  document_id     TEXT PRIMARY KEY,             -- es. "ai-act-it", "cs-art13-2026"
  title           TEXT NOT NULL,
  publisher       TEXT NOT NULL,                -- "EU Commission", "AGID", "AI Office"
  document_type   TEXT NOT NULL,                -- "regulation"|"common_spec"|"guideline"|"standard"
  source_url      TEXT,                         -- URL ufficiale documento
  version         TEXT NOT NULL DEFAULT '1.0',  -- "1.0", "2024-08", "v2"
  effective_date  DATE NOT NULL,                -- data di entrata in vigore
  publication_date DATE,                        -- data pubblicazione ufficiale
  language        TEXT NOT NULL DEFAULT 'it',   -- "it" | "en" | "fr"
  supersedes      TEXT REFERENCES rag_documents(document_id),  -- documento precedente sostituito
  status          TEXT NOT NULL DEFAULT 'active',  -- "active"|"superseded"|"draft"|"withdrawn"
  sha256          TEXT,                          -- hash del file sorgente
  chunk_count     INTEGER NOT NULL DEFAULT 0,
  ingested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rag_documents_status_idx ON rag_documents (status);
CREATE INDEX IF NOT EXISTS rag_documents_effective_date_idx ON rag_documents (effective_date DESC);

CREATE TABLE IF NOT EXISTS rag_ingestion_runs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at   TIMESTAMPTZ,
  source         TEXT NOT NULL,                  -- "manual"|"scheduled"|"eu_feed"|"agid_feed"
  documents_added INTEGER DEFAULT 0,
  documents_updated INTEGER DEFAULT 0,
  chunks_added   INTEGER DEFAULT 0,
  errors         JSONB,
  status         TEXT NOT NULL DEFAULT 'running' -- "running"|"completed"|"failed"
);

-- Estendi rag_chunks per version-aware retrieval
ALTER TABLE rag_chunks
  ADD COLUMN IF NOT EXISTS version        TEXT,
  ADD COLUMN IF NOT EXISTS source_url     TEXT,
  ADD COLUMN IF NOT EXISTS effective_date DATE,
  ADD COLUMN IF NOT EXISTS publisher      TEXT;

CREATE INDEX IF NOT EXISTS rag_chunks_effective_date_idx
  ON rag_chunks (effective_date DESC NULLS LAST);

-- Vista che restituisce solo chunk dei documenti ATTIVI (esclude superseded)
CREATE OR REPLACE VIEW rag_chunks_active AS
SELECT c.*
FROM rag_chunks c
JOIN rag_documents d ON c.document_id = d.document_id
WHERE d.status = 'active';

COMMENT ON TABLE rag_documents IS 'Registro versioni documenti normativi RAG. Garantisce che il Legal Assistant citi sempre la versione vigente.';
COMMENT ON COLUMN rag_documents.supersedes IS 'Documento precedente sostituito. Se A.supersedes=B, B.status passa a "superseded".';
COMMENT ON VIEW rag_chunks_active IS 'Chunk solo da documenti vigenti — usare questa vista per retrieval RAG production.';
