"""
Test 1: Index test — every document must have >0 chunks indexed.
Run after ingest.py has completed.

Usage:
  cd rag && pytest tests/test_index.py -v
"""
import pytest
import sys
sys.path.insert(0, "..")

from config import DOCUMENTS
from store import get_connection, count_chunks_for_document


@pytest.fixture(scope="module")
def conn():
    c = get_connection()
    yield c
    c.close()


@pytest.mark.parametrize("doc", DOCUMENTS, ids=[d["id"] for d in DOCUMENTS])
def test_document_has_chunks(conn, doc):
    """Every configured document must have at least 1 chunk in rag_chunks."""
    count = count_chunks_for_document(conn, doc["id"])
    assert count > 0, (
        f"Document '{doc['id']}' has 0 chunks. "
        f"Run: python ingest.py --doc {doc['id']}"
    )


@pytest.mark.parametrize("doc", DOCUMENTS, ids=[d["id"] for d in DOCUMENTS])
def test_document_has_section_refs(conn, doc):
    """At least 50% of chunks must have a non-null section_ref."""
    import psycopg2.extras
    with conn.cursor() as cur:
        cur.execute(
            "SELECT COUNT(*) FROM rag_chunks WHERE document_id = %s AND section_ref IS NOT NULL;",
            (doc["id"],)
        )
        with_ref = cur.fetchone()[0]
        cur.execute(
            "SELECT COUNT(*) FROM rag_chunks WHERE document_id = %s;",
            (doc["id"],)
        )
        total = cur.fetchone()[0]

    if total == 0:
        pytest.skip(f"Document {doc['id']} has no chunks yet")

    ratio = with_ref / total
    assert ratio >= 0.5, (
        f"Document '{doc['id']}' only {with_ref}/{total} ({ratio:.0%}) chunks have section_ref. "
        "Check the chunker — section_ref is required for citations."
    )


def test_ocr_document_has_chunks(conn):
    """ISO 42001 (scanned OCR) must have >0 chunks with non-garbage text."""
    import psycopg2.extras
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT chunk_text FROM rag_chunks
            WHERE document_id = 'iso-42001'
            ORDER BY chunk_index
            LIMIT 5;
            """
        )
        rows = cur.fetchall()

    assert len(rows) > 0, "ISO 42001 has no chunks — OCR may have failed"

    for (text,) in rows:
        # Garbage OCR: most chars should be printable ASCII or common unicode
        non_garbage = sum(1 for c in text if c.isprintable() or c.isspace())
        ratio = non_garbage / max(len(text), 1)
        assert ratio >= 0.85, (
            f"ISO 42001 chunk appears to be garbage OCR output "
            f"(only {ratio:.0%} printable chars): {text[:100]!r}"
        )
