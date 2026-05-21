-- ============================================================
-- RAG Knowledge Base — pgvector schema
-- Gemini text-embedding-004 (768 dims) + EU AI Act documents
-- Migration: 20260521000002_rag_pgvector.sql
-- ============================================================

-- Requires Supabase pgvector extension (enabled by default on Supabase Cloud).
-- If self-hosted: run `CREATE EXTENSION vector` as superuser first.
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── RAG chunks table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rag_chunks (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id    TEXT    NOT NULL,        -- "ai-act-it", "draft-guidelines-annex-iii", ...
  document_title TEXT    NOT NULL,        -- human-readable title
  document_date  TEXT,                    -- "2024", "2022", etc.
  chunk_index    INTEGER NOT NULL,        -- sequential index within document
  section_ref    TEXT,                    -- "Art. 6(3)", "§2.7.1", "Annex III punto 8"
  page_number    INTEGER,                 -- source page (null for txt-only docs)
  chunk_text     TEXT    NOT NULL,        -- plain text content
  embedding      vector(768),            -- Gemini text-embedding-004 output
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- ─── Indices ──────────────────────────────────────────────────
-- ivfflat for approximate nearest-neighbour (cosine)
-- lists=100 is appropriate for up to ~1M vectors; tune as corpus grows
CREATE INDEX IF NOT EXISTS rag_chunks_embedding_idx
  ON rag_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS rag_chunks_document_id_idx
  ON rag_chunks (document_id);

CREATE INDEX IF NOT EXISTS rag_chunks_section_ref_idx
  ON rag_chunks (section_ref);

CREATE INDEX IF NOT EXISTS rag_chunks_created_at_idx
  ON rag_chunks (created_at DESC);

-- ─── Helper function: semantic search ─────────────────────────
-- Called directly via Supabase RPC from TypeScript.
-- Returns top-k chunks ordered by cosine similarity (closest first).
CREATE OR REPLACE FUNCTION search_rag_chunks(
  query_embedding  vector(768),
  match_count      INTEGER DEFAULT 5,
  filter_document  TEXT    DEFAULT NULL,  -- NULL = search all documents
  min_similarity   FLOAT   DEFAULT 0.3    -- reject very low-quality matches
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
  ORDER BY c.embedding <=> query_embedding  -- cosine distance, ascending
  LIMIT match_count;
END;
$$;

-- ─── Helper function: article-boosted search ─────────────────
-- If query mentions "Art. N", boost chunks whose section_ref contains that article.
-- Returns chunks with a boosted_similarity field.
CREATE OR REPLACE FUNCTION search_rag_chunks_boosted(
  query_embedding  vector(768),
  article_hint     TEXT    DEFAULT NULL,  -- e.g. "Art. 6" — null = no boost
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
    -- Boost chunks that mention the article hint in section_ref
    CASE
      WHEN article_hint IS NOT NULL
           AND c.section_ref ILIKE '%' || article_hint || '%'
      THEN (1 - (c.embedding <=> query_embedding)) * 1.3  -- 30% boost
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

-- ─── Comments ─────────────────────────────────────────────────
COMMENT ON TABLE rag_chunks IS
  'RAG knowledge base — EU AI Act + ISO standards + Draft Guidelines. '
  'Embedded with Gemini text-embedding-004 (768 dims). '
  'Indexed with ivfflat cosine similarity via pgvector.';

COMMENT ON COLUMN rag_chunks.section_ref IS
  'Normative reference for citation: "Art. 6(3)", "§2.7.1", "Annex III punto 8". '
  'Used for VerifyPinpoint citations and article-boosted retrieval.';
