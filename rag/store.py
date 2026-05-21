"""
pgvector store — INSERT chunks with embeddings into rag_chunks table.
Uses psycopg2 direct connection (not Supabase SDK) for bulk INSERT performance.
"""
import json
import psycopg2
import psycopg2.extras
from config import DATABASE_URL, SKIP_EXISTING


def get_connection():
    if not DATABASE_URL:
        raise ValueError(
            "DATABASE_URL not set. "
            "Get it from Supabase Dashboard > Settings > Database > Direct connection."
        )
    return psycopg2.connect(DATABASE_URL)


def get_existing_document_ids(conn) -> set[str]:
    """Return set of document_ids already in rag_chunks (for skip-existing)."""
    with conn.cursor() as cur:
        cur.execute("SELECT DISTINCT document_id FROM rag_chunks;")
        return {row[0] for row in cur.fetchall()}


def count_chunks_for_document(conn, document_id: str) -> int:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT COUNT(*) FROM rag_chunks WHERE document_id = %s;",
            (document_id,)
        )
        return cur.fetchone()[0]


def delete_document_chunks(conn, document_id: str) -> int:
    """Remove all chunks for a document (use before re-indexing)."""
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM rag_chunks WHERE document_id = %s;",
            (document_id,)
        )
        deleted = cur.rowcount
    conn.commit()
    return deleted


def insert_chunks(
    conn,
    chunks: list[dict],
    embeddings: list[list[float]],
    document_id: str,
) -> int:
    """
    Bulk insert chunks + embeddings.
    Returns count of inserted rows.

    chunk dict must have:
      document_id, document_title, document_date,
      chunk_index, section_ref, page_number, chunk_text
    embeddings must match len(chunks).
    """
    assert len(chunks) == len(embeddings), (
        f"Chunk count ({len(chunks)}) != embedding count ({len(embeddings)})"
    )

    # Register pgvector type adapter
    psycopg2.extras.register_default_jsonb(conn)

    rows = []
    for chunk, embedding in zip(chunks, embeddings):
        # Convert Python list → pgvector format "[x,y,z,...]"
        vec_str = "[" + ",".join(f"{v:.8f}" for v in embedding) + "]"
        rows.append((
            chunk["document_id"],
            chunk["document_title"],
            chunk.get("document_date"),
            chunk["chunk_index"],
            chunk.get("section_ref"),
            chunk.get("page_number"),
            chunk["chunk_text"],
            vec_str,
        ))

    with conn.cursor() as cur:
        psycopg2.extras.execute_values(
            cur,
            """
            INSERT INTO rag_chunks
              (document_id, document_title, document_date,
               chunk_index, section_ref, page_number,
               chunk_text, embedding)
            VALUES %s
            ON CONFLICT DO NOTHING
            """,
            rows,
            template="(%s, %s, %s, %s, %s, %s, %s, %s::vector)",
            page_size=50,
        )
        inserted = cur.rowcount

    conn.commit()
    return inserted


def similarity_search(
    conn,
    query_embedding: list[float],
    top_k: int = 5,
    document_filter: str | None = None,
    min_similarity: float = 0.3,
) -> list[dict]:
    """
    Python-side cosine similarity search for testing / non-TS access.
    """
    vec_str = "[" + ",".join(f"{v:.8f}" for v in query_embedding) + "]"

    where_clause = ""
    params: list = [vec_str, vec_str, min_similarity, top_k]
    if document_filter:
        where_clause = "AND document_id = %s"
        params.insert(3, document_filter)

    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT
              id, document_id, document_title, document_date,
              chunk_index, section_ref, page_number, chunk_text,
              1 - (embedding <=> %s::vector) AS similarity
            FROM rag_chunks
            WHERE 1 - (embedding <=> %s::vector) >= %s
            {where_clause}
            ORDER BY embedding <=> %s::vector
            LIMIT %s
            """,
            [vec_str, vec_str, min_similarity]
            + ([document_filter] if document_filter else [])
            + [top_k],
        )
        return [dict(row) for row in cur.fetchall()]
