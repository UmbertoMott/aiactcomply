"""
RAG Auto-Update Pipeline — Legal Source Monitor

Monitora feed normativi ufficiali (EU Commission EUR-Lex RSS, AGID, AI Office),
scarica nuove "Common Specifications" e linee guida interpretative,
estrae il testo, chunking semantico con 15% overlap, embedding e upsert nel
vector store con versioning automatico.

Architettura:
    1. fetch_feeds()         → lista candidati URL da monitorare
    2. detect_new_docs()     → confronta con rag_documents (skip se sha256 invariato)
    3. download_and_extract  → PDF/HTML → testo pulito + metadati
    4. semantic_chunk()      → chunk 512 token con 15% overlap
    5. embed_and_store()     → embedding via Vertex AI o Ollama, upsert atomico
    6. mark_superseded()     → se documento ha campo "supersedes", aggiorna vecchia versione
    7. log_run()             → riga in rag_ingestion_runs

Esecuzione:
    - Manuale:   python auto_update.py
    - Schedulata: cron settimanale (vedi crontab.example)
    - On-demand: endpoint POST /api/rag/refresh
"""

import os
import hashlib
import datetime as dt
import json
import logging
from dataclasses import dataclass, asdict
from typing import Optional, List
from urllib.parse import urlparse

import requests
import feedparser
import psycopg2
from psycopg2.extras import Json

# ─── Config ───────────────────────────────────────────────────────────────────

DATABASE_URL = os.environ["DATABASE_URL"]
EMBED_PROVIDER = os.environ.get("AICOMPLY_RAG_PROVIDER", "vertex")  # "vertex" | "ollama"
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_EMBED_MODEL = os.environ.get("OLLAMA_EMBED_MODEL", "nomic-embed-text")

# Feed normativi ufficiali monitorati
LEGAL_FEEDS = [
    {
        "id": "eur_lex_ai_act",
        "name": "EUR-Lex — AI Act amendments",
        "url": "https://eur-lex.europa.eu/EN/display-feed.rss?myRssId=feed_ai_act",
        "publisher": "EU Commission",
        "language": "en",
        "doc_type": "regulation",
    },
    {
        "id": "ai_office_specs",
        "name": "AI Office — Common Specifications",
        "url": "https://digital-strategy.ec.europa.eu/en/policies/ai-act/rss.xml",
        "publisher": "AI Office",
        "language": "en",
        "doc_type": "common_spec",
    },
    {
        "id": "agid_ai_guidelines",
        "name": "AGID — Linee guida AI",
        "url": "https://www.agid.gov.it/it/news/feed",
        "publisher": "AGID",
        "language": "it",
        "doc_type": "guideline",
    },
]

# Chunking parameters
CHUNK_SIZE_TOKENS = 512
CHUNK_OVERLAP_PCT = 0.15
APPROX_CHARS_PER_TOKEN = 4

# ─── Logging ──────────────────────────────────────────────────────────────────

logging.basicConfig(
    format="[%(asctime)s] %(levelname)s — %(message)s",
    level=logging.INFO,
)
log = logging.getLogger("rag-auto-update")

# ─── Data classes ─────────────────────────────────────────────────────────────

@dataclass
class CandidateDoc:
    document_id: str
    title: str
    source_url: str
    publisher: str
    document_type: str
    language: str
    publication_date: Optional[dt.date]
    effective_date: dt.date
    version: str

# ─── Step 1: Fetch feeds ──────────────────────────────────────────────────────

def fetch_feed_entries(feed_cfg: dict) -> List[CandidateDoc]:
    """Parse a single RSS/Atom feed and return candidate documents."""
    try:
        parsed = feedparser.parse(feed_cfg["url"])
    except Exception as e:
        log.error("Feed %s failed: %s", feed_cfg["id"], e)
        return []

    candidates: List[CandidateDoc] = []
    for entry in parsed.entries[:20]:  # limit per run
        url = entry.get("link")
        if not url or not url.lower().endswith((".pdf", ".html")):
            continue
        title = entry.get("title", "Untitled")
        pub_str = entry.get("published") or entry.get("updated")
        pub_date = _parse_date(pub_str) if pub_str else dt.date.today()

        # document_id deterministico: <feed_id>__<slug-from-url>
        slug = urlparse(url).path.split("/")[-1].rsplit(".", 1)[0][:80]
        doc_id = f"{feed_cfg['id']}__{slug}"

        candidates.append(CandidateDoc(
            document_id=doc_id,
            title=title,
            source_url=url,
            publisher=feed_cfg["publisher"],
            document_type=feed_cfg["doc_type"],
            language=feed_cfg["language"],
            publication_date=pub_date,
            effective_date=pub_date,  # default: stessa data, override manuale
            version=pub_date.isoformat(),
        ))
    return candidates


def _parse_date(s: str) -> Optional[dt.date]:
    """Robust date parser for RSS pub_date formats."""
    for fmt in ("%a, %d %b %Y %H:%M:%S %z", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d"):
        try:
            return dt.datetime.strptime(s, fmt).date()
        except (ValueError, TypeError):
            continue
    return None

# ─── Step 2: Detect new / updated documents ──────────────────────────────────

def is_document_changed(conn, doc: CandidateDoc, new_sha256: str) -> bool:
    """Return True if document is new OR sha256 differs from stored."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT sha256 FROM rag_documents WHERE document_id = %s",
            (doc.document_id,)
        )
        row = cur.fetchone()
        if not row:
            return True
        return row[0] != new_sha256

# ─── Step 3: Download & extract text ─────────────────────────────────────────

def download_and_extract(url: str) -> tuple[str, str]:
    """Download URL → (text, sha256). Supports PDF and HTML."""
    resp = requests.get(url, timeout=60, headers={"User-Agent": "AIComply-RAG/1.0"})
    resp.raise_for_status()
    content = resp.content
    sha256 = hashlib.sha256(content).hexdigest()

    if url.lower().endswith(".pdf"):
        from pdfminer.high_level import extract_text
        import io
        text = extract_text(io.BytesIO(content))
    else:
        # HTML: strip tags
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(content, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()
        text = soup.get_text(separator="\n", strip=True)

    return text, sha256

# ─── Step 4: Semantic chunking with 15% overlap ──────────────────────────────

def semantic_chunk(text: str) -> List[str]:
    """Split text into chunks of ~CHUNK_SIZE_TOKENS with 15% overlap.

    Uses paragraph boundaries when possible — falls back to char-window
    for very long paragraphs. Each chunk is approx CHUNK_SIZE_TOKENS * 4 chars.
    """
    chunk_chars = CHUNK_SIZE_TOKENS * APPROX_CHARS_PER_TOKEN
    overlap_chars = int(chunk_chars * CHUNK_OVERLAP_PCT)
    step = chunk_chars - overlap_chars

    # Pre-split on paragraph boundaries
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks: List[str] = []
    buf = ""

    for p in paragraphs:
        if len(buf) + len(p) + 2 <= chunk_chars:
            buf = (buf + "\n\n" + p) if buf else p
        else:
            if buf:
                chunks.append(buf)
            # If single paragraph is bigger than chunk size, slice it
            if len(p) > chunk_chars:
                for i in range(0, len(p), step):
                    chunks.append(p[i : i + chunk_chars])
                buf = ""
            else:
                buf = p

    if buf:
        chunks.append(buf)

    # Add tail-overlap between consecutive chunks (re-prepend last N chars)
    if len(chunks) > 1:
        with_overlap: List[str] = [chunks[0]]
        for i in range(1, len(chunks)):
            tail = chunks[i - 1][-overlap_chars:]
            with_overlap.append(tail + "\n\n" + chunks[i])
        chunks = with_overlap

    return chunks

# ─── Step 5: Embed via Vertex or Ollama ──────────────────────────────────────

def embed_chunks(chunks: List[str]) -> List[List[float]]:
    if EMBED_PROVIDER == "ollama":
        return [_embed_ollama(c) for c in chunks]
    else:
        return _embed_vertex_batch(chunks)


def _embed_ollama(text: str) -> List[float]:
    resp = requests.post(
        f"{OLLAMA_BASE_URL}/api/embeddings",
        json={"model": OLLAMA_EMBED_MODEL, "prompt": text},
        timeout=60,
    )
    resp.raise_for_status()
    return resp.json()["embedding"]


def _embed_vertex_batch(chunks: List[str]) -> List[List[float]]:
    # Implementazione semplificata — usa rag/embedder.py esistente in produzione
    from embedder import embed_texts  # type: ignore
    return embed_texts(chunks)

# ─── Step 6: Upsert atomic ────────────────────────────────────────────────────

def upsert_document(conn, doc: CandidateDoc, sha256: str, chunks: List[str],
                    embeddings: List[List[float]]) -> int:
    """Atomic upsert: replace all chunks for document_id, update manifest."""
    with conn.cursor() as cur:
        cur.execute("BEGIN")
        try:
            cur.execute("DELETE FROM rag_chunks WHERE document_id = %s", (doc.document_id,))
            for idx, (chunk, emb) in enumerate(zip(chunks, embeddings)):
                cur.execute("""
                    INSERT INTO rag_chunks
                      (document_id, document_title, document_date, chunk_index,
                       content, embedding, version, source_url, effective_date, publisher)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    doc.document_id, doc.title, doc.publication_date.isoformat() if doc.publication_date else None,
                    idx, chunk, emb, doc.version, doc.source_url,
                    doc.effective_date, doc.publisher,
                ))

            # Upsert manifest
            cur.execute("""
                INSERT INTO rag_documents
                  (document_id, title, publisher, document_type, source_url,
                   version, effective_date, publication_date, language, status,
                   sha256, chunk_count, ingested_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'active', %s, %s, NOW())
                ON CONFLICT (document_id) DO UPDATE SET
                  version = EXCLUDED.version,
                  effective_date = EXCLUDED.effective_date,
                  publication_date = EXCLUDED.publication_date,
                  sha256 = EXCLUDED.sha256,
                  chunk_count = EXCLUDED.chunk_count,
                  ingested_at = NOW(),
                  status = 'active'
            """, (
                doc.document_id, doc.title, doc.publisher, doc.document_type,
                doc.source_url, doc.version, doc.effective_date,
                doc.publication_date, doc.language, sha256, len(chunks),
            ))

            conn.commit()
            log.info("Document %s upserted: %d chunks", doc.document_id, len(chunks))
            return len(chunks)
        except Exception as e:
            conn.rollback()
            log.exception("Upsert failed for %s: %s", doc.document_id, e)
            raise

# ─── Step 7: Mark superseded ──────────────────────────────────────────────────

def mark_superseded(conn, document_id: str, supersedes_id: str) -> None:
    """When a new version arrives, mark the old one as 'superseded'."""
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE rag_documents SET status = 'superseded'
            WHERE document_id = %s
        """, (supersedes_id,))
        cur.execute("""
            UPDATE rag_documents SET supersedes = %s
            WHERE document_id = %s
        """, (supersedes_id, document_id))
        conn.commit()

# ─── Step 8: Log ingestion run ───────────────────────────────────────────────

def log_ingestion_run(conn, source: str, added: int, updated: int,
                      chunks: int, errors: List[dict], status: str) -> None:
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO rag_ingestion_runs
              (started_at, completed_at, source, documents_added,
               documents_updated, chunks_added, errors, status)
            VALUES (NOW(), NOW(), %s, %s, %s, %s, %s, %s)
        """, (source, added, updated, chunks, Json(errors) if errors else None, status))
        conn.commit()

# ─── Main pipeline ────────────────────────────────────────────────────────────

def run_pipeline(source: str = "scheduled") -> dict:
    """Execute the full RAG auto-update pipeline."""
    conn = psycopg2.connect(DATABASE_URL)
    added = updated = total_chunks = 0
    errors: List[dict] = []

    try:
        for feed_cfg in LEGAL_FEEDS:
            log.info("Fetching feed: %s", feed_cfg["name"])
            candidates = fetch_feed_entries(feed_cfg)
            log.info("  %d candidates", len(candidates))

            for doc in candidates:
                try:
                    text, sha256 = download_and_extract(doc.source_url)
                    if not text.strip():
                        log.warning("Empty text for %s", doc.document_id)
                        continue

                    if not is_document_changed(conn, doc, sha256):
                        log.info("  %s unchanged — skip", doc.document_id)
                        continue

                    chunks = semantic_chunk(text)
                    if not chunks:
                        continue

                    embeddings = embed_chunks(chunks)
                    n = upsert_document(conn, doc, sha256, chunks, embeddings)
                    total_chunks += n

                    # Check if document is new or update
                    with conn.cursor() as cur:
                        cur.execute(
                            "SELECT 1 FROM rag_documents WHERE document_id = %s AND ingested_at < NOW() - INTERVAL '1 minute'",
                            (doc.document_id,)
                        )
                        if cur.fetchone():
                            updated += 1
                        else:
                            added += 1

                except Exception as e:
                    log.exception("Error processing %s", doc.document_id)
                    errors.append({"document_id": doc.document_id, "error": str(e)})

        status = "completed" if not errors else "completed_with_errors"
        log_ingestion_run(conn, source, added, updated, total_chunks, errors, status)
        return {"added": added, "updated": updated, "chunks": total_chunks, "errors": errors}
    finally:
        conn.close()


# ─── Conflict detection ──────────────────────────────────────────────────────

def detect_normative_conflict(conn, query_topic: str) -> List[dict]:
    """Find chunks from different documents that may conflict.

    Returns list of {document_id_a, document_id_b, chunk_a, chunk_b, similarity}.
    Used by Legal Assistant to flag potential normative tensions.
    """
    # Semplificato: confronto su chunk con stesso topic ma effective_date differente
    with conn.cursor() as cur:
        cur.execute("""
            SELECT a.document_id, b.document_id, a.chunk_index, b.chunk_index,
                   a.effective_date, b.effective_date
            FROM rag_chunks a
            JOIN rag_chunks b ON a.document_id <> b.document_id
              AND a.embedding <-> b.embedding < 0.2
              AND a.effective_date IS NOT NULL
              AND b.effective_date IS NOT NULL
            WHERE a.effective_date < b.effective_date
            LIMIT 50
        """)
        return [
            {
                "older": {"doc": r[0], "chunk": r[2], "date": r[4]},
                "newer": {"doc": r[1], "chunk": r[3], "date": r[5]},
            }
            for r in cur.fetchall()
        ]


if __name__ == "__main__":
    import sys
    source = sys.argv[1] if len(sys.argv) > 1 else "manual"
    result = run_pipeline(source)
    print(json.dumps(result, indent=2, default=str))
