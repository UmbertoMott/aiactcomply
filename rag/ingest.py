#!/usr/bin/env python3
"""
RAG Indexing Pipeline — main orchestrator.
Indexes all documents in config.DOCUMENTS into pgvector.

Usage:
  python ingest.py                    # index all documents
  python ingest.py --doc ai-act-it    # index single document
  python ingest.py --reindex          # delete and re-index all
  python ingest.py --dry-run          # show chunks without inserting

Prerequisites:
  pip install -r requirements.txt
  cp .env.example .env && edit .env

  macOS: brew install poppler tesseract  (for OCR)
  Ubuntu: apt install poppler-utils tesseract-ocr
"""
import argparse
import sys
import time
from pathlib import Path

from config import DOCUMENTS, SKIP_EXISTING
from embedder import embed_chunks
from store import (
    get_connection, get_existing_document_ids,
    delete_document_chunks, insert_chunks, count_chunks_for_document,
)


def load_pages(doc: dict) -> list[dict]:
    """Load and extract text from a document based on its extractor type."""
    extractor = doc["extractor"]

    if extractor == "txt":
        txt_path = doc.get("txt_path")
        if txt_path and Path(txt_path).exists():
            print(f"  [extract] Using pre-extracted txt: {Path(txt_path).name}")
            from extractors.txt_reader import extract_txt_pages
            return extract_txt_pages(Path(txt_path))
        # Fallback to PDF
        print(f"  [extract] txt not found, falling back to PDF")
        extractor = "pdf_text"

    if extractor == "pdf_text":
        pdf_path = doc.get("pdf_path")
        if not pdf_path or not Path(pdf_path).exists():
            raise FileNotFoundError(f"PDF not found: {pdf_path}")
        print(f"  [extract] PDF text extraction: {Path(pdf_path).name}")
        from extractors.pdf_text import extract_pdf_pages
        return extract_pdf_pages(Path(pdf_path))

    if extractor == "pdf_ocr":
        pdf_path = doc.get("pdf_path")
        if not pdf_path or not Path(pdf_path).exists():
            raise FileNotFoundError(f"PDF not found: {pdf_path}")
        print(f"  [extract] OCR extraction: {Path(pdf_path).name}")
        from extractors.pdf_ocr import extract_pdf_ocr
        return extract_pdf_ocr(
            Path(pdf_path),
            dpi=doc.get("ocr_dpi", 150),
            lang=doc.get("ocr_lang", "eng"),
        )

    raise ValueError(f"Unknown extractor: {extractor}")


def chunk_pages(pages: list[dict], doc: dict) -> list[dict]:
    """Split pages into semantic chunks based on document type."""
    chunker = doc["chunker"]
    document_meta = {"id": doc["id"], "title": doc["title"], "date": doc.get("date")}

    if chunker == "ai_act":
        from chunkers.ai_act import chunk_ai_act
        return chunk_ai_act(pages, document_meta)
    if chunker == "guidelines":
        from chunkers.guidelines import chunk_guidelines
        return chunk_guidelines(pages, document_meta)
    if chunker == "iso":
        from chunkers.iso import chunk_iso
        return chunk_iso(pages, document_meta)

    # Fallback
    from chunkers.generic import chunk_generic
    return chunk_generic(pages, document_meta)


def index_document(doc: dict, conn, dry_run: bool = False) -> dict:
    """
    Index a single document. Returns stats dict.
    FAIL-SAFE: if embedding or insert fails, logs error and continues.
    """
    doc_id = doc["id"]
    print(f"\n{'='*60}")
    print(f"[ingest] Document: {doc['title']}")
    print(f"[ingest] ID: {doc_id}")

    stats = {
        "document_id": doc_id,
        "pages": 0,
        "chunks": 0,
        "embedded": 0,
        "inserted": 0,
        "failed_chunks": [],
        "error": None,
    }

    t0 = time.time()

    try:
        # 1. Extract text
        pages = load_pages(doc)
        stats["pages"] = len(pages)
        print(f"  [ingest] Extracted {len(pages)} pages")

        # 2. Chunk
        chunks = chunk_pages(pages, doc)
        stats["chunks"] = len(chunks)
        print(f"  [ingest] Created {len(chunks)} chunks")

        if not chunks:
            print(f"  [ingest] WARNING: 0 chunks — document may be empty or unreadable")
            return stats

        if dry_run:
            print(f"  [ingest] DRY RUN — showing first 3 chunks:")
            for c in chunks[:3]:
                print(f"    [{c['section_ref']}] p.{c['page_number']}: {c['chunk_text'][:100]}...")
            return stats

        # 3. Embed — batch to avoid OOM and rate limits
        print(f"  [ingest] Embedding {len(chunks)} chunks via Vertex AI...")
        texts = [c["chunk_text"] for c in chunks]
        embeddings = embed_chunks(texts, task_type="RETRIEVAL_DOCUMENT")
        stats["embedded"] = len(embeddings)
        print(f"  [ingest] Embedded {len(embeddings)} chunks")

        # 4. Insert
        inserted = insert_chunks(conn, chunks, embeddings, doc_id)
        stats["inserted"] = inserted
        print(f"  [ingest] Inserted {inserted} rows into rag_chunks")

    except Exception as e:
        stats["error"] = str(e)
        print(f"  [ingest] ERROR: {e}", file=sys.stderr)

    elapsed = time.time() - t0
    print(f"  [ingest] Done in {elapsed:.1f}s")
    return stats


def main():
    parser = argparse.ArgumentParser(description="RAG Knowledge Base Indexer")
    parser.add_argument("--doc", help="Index only this document_id")
    parser.add_argument("--reindex", action="store_true",
                        help="Delete existing chunks and re-index")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show chunks without inserting into DB")
    parser.add_argument("--list", action="store_true",
                        help="List configured documents and exit")
    args = parser.parse_args()

    if args.list:
        print("Configured documents:")
        for d in DOCUMENTS:
            print(f"  {d['id']:40s} extractor={d['extractor']}  chunker={d['chunker']}")
        return

    # Filter documents
    docs_to_index = DOCUMENTS
    if args.doc:
        docs_to_index = [d for d in DOCUMENTS if d["id"] == args.doc]
        if not docs_to_index:
            print(f"ERROR: document '{args.doc}' not in config. Use --list to see options.")
            sys.exit(1)

    if args.dry_run:
        print("[ingest] DRY RUN mode — no DB writes")
        conn = None
    else:
        print("[ingest] Connecting to database...")
        conn = get_connection()
        existing = get_existing_document_ids(conn)
        print(f"[ingest] Already indexed: {existing or '(none)'}")

    all_stats = []
    for doc in docs_to_index:
        doc_id = doc["id"]

        if not args.dry_run and SKIP_EXISTING and doc_id in existing and not args.reindex:
            count = count_chunks_for_document(conn, doc_id)
            print(f"\n[ingest] SKIP {doc_id} (already has {count} chunks). Use --reindex to force.")
            continue

        if not args.dry_run and args.reindex and doc_id in existing:
            deleted = delete_document_chunks(conn, doc_id)
            print(f"\n[ingest] Deleted {deleted} existing chunks for {doc_id}")

        stats = index_document(doc, conn, dry_run=args.dry_run)
        all_stats.append(stats)

    # Summary
    print(f"\n{'='*60}")
    print("[ingest] SUMMARY")
    for s in all_stats:
        status = "✅" if not s["error"] else "❌"
        print(f"  {status} {s['document_id']:40s} pages={s['pages']:4d}  chunks={s['chunks']:4d}  inserted={s['inserted']:4d}")
        if s["error"]:
            print(f"     ERROR: {s['error']}")

    if conn:
        conn.close()


if __name__ == "__main__":
    main()
