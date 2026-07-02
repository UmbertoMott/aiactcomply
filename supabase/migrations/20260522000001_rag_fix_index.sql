-- ============================================================
-- RAG Index Fix — switch from IVFFlat → HNSW + increase probes
-- Migration: 20260522000001_rag_fix_index.sql
--
-- Problem: IVFFlat with lists=100 and default probes=1 only scans
--   1% of index lists per query, causing entire document classes
--   (e.g. all EU AI Act chunks) to be silently skipped.
--
-- Fix: Replace IVFFlat with HNSW, which is always-exact for the
--   search radius and performs better on corpora < 1M rows.
--   Also update both search functions to set probes=40 as a
--   fallback safety net in case IVFFlat is ever re-added.
-- ============================================================

-- Drop old approximate-only IVFFlat index
DROP INDEX IF EXISTS rag_chunks_embedding_idx;

-- HNSW index — deterministic, no probes parameter needed,
-- excellent recall for corpora up to ~1M rows.
-- m=16 ef_construction=64 are good defaults for retrieval workloads.
CREATE INDEX IF NOT EXISTS rag_chunks_embedding_hnsw_idx
  ON rag_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ─── Update search_rag_chunks ────────────────────────────────
-- Added SET LOCAL ivfflat.probes = 40 as belt-and-suspenders.
-- HNSW doesn't use this setting, but it protects future IVFFlat
-- additions from the probes=1 default.
CREATE OR REPLACE FUNCTION search_rag_chunks(
  query_embedding  vector(768),
  match_count      INTEGER DEFAULT 5,
  filter_document  TEXT    DEFAULT NULL,
  min_similarity   FLOAT   DEFAULT 0.3
)
RETURNS TABLE (
  id             UUID,
  document_id    TEXT,
  document_title TEXT,
  document_date  TEXT,
  chunk_index    INTEGER,
  section_ref    TEXT,
  page_number    INTEGER,
  chunk_text     TEXT,
  similarity     FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Safety net: scan more lists if IVFFlat is ever re-used
  SET LOCAL ivfflat.probes = 40;

  RETURN QUERY
  SELECT
    c.id,
    c.document_id,
    c.document_title,
    c.document_date,
    c.chunk_index,
    c.section_ref,
    c.page_number,
    c.chunk_text,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM rag_chunks c
  WHERE
    (filter_document IS NULL OR c.document_id = filter_document)
    AND (1 - (c.embedding <=> query_embedding)) >= min_similarity
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ─── Update search_rag_chunks_boosted ────────────────────────
CREATE OR REPLACE FUNCTION search_rag_chunks_boosted(
  query_embedding  vector(768),
  article_hint     TEXT    DEFAULT NULL,
  match_count      INTEGER DEFAULT 8,
  filter_document  TEXT    DEFAULT NULL,
  min_similarity   FLOAT   DEFAULT 0.25
)
RETURNS TABLE (
  id              UUID,
  document_id     TEXT,
  document_title  TEXT,
  document_date   TEXT,
  chunk_index     INTEGER,
  section_ref     TEXT,
  page_number     INTEGER,
  chunk_text      TEXT,
  similarity      FLOAT,
  boosted_similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  SET LOCAL ivfflat.probes = 40;

  RETURN QUERY
  SELECT
    c.id,
    c.document_id,
    c.document_title,
    c.document_date,
    c.chunk_index,
    c.section_ref,
    c.page_number,
    c.chunk_text,
    1 - (c.embedding <=> query_embedding) AS similarity,
    CASE
      WHEN article_hint IS NOT NULL
           AND c.section_ref ILIKE '%' || article_hint || '%'
      THEN (1 - (c.embedding <=> query_embedding)) * 1.3
      ELSE 1 - (c.embedding <=> query_embedding)
    END AS boosted_similarity
  FROM rag_chunks c
  WHERE
    (filter_document IS NULL OR c.document_id = filter_document)
    AND (1 - (c.embedding <=> query_embedding)) >= min_similarity
  ORDER BY boosted_similarity DESC
  LIMIT match_count;
END;
$$;
