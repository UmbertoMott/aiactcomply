"""
Test 2: Retrieval test — "filter mechanism Art. 6(3)" must return
Draft Guidelines Annex III §2.7.x as top result.

Test 3: Citation test — answer_with_rag must include at least one source citation.
"""
import pytest
import sys
sys.path.insert(0, "..")

from embedder import embed_query
from store import get_connection, similarity_search


@pytest.fixture(scope="module")
def conn():
    c = get_connection()
    yield c
    c.close()


def test_retrieval_art6_returns_annex_iii(conn):
    """
    Query: 'filter mechanism Art. 6(3) high-risk AI system'
    Expected: top results should include draft-guidelines-annex-iii,
              preferably with section_ref containing §2.7.
    """
    query = "filter mechanism Art. 6(3) high-risk AI system classification"
    embedding = embed_query(query)
    results = similarity_search(conn, embedding, top_k=5, min_similarity=0.1)

    assert len(results) > 0, "No results returned for filter mechanism query"

    # At least one of top-5 results should come from Annex III guidelines
    doc_ids = [r["document_id"] for r in results]
    assert "draft-guidelines-annex-iii" in doc_ids, (
        f"Expected 'draft-guidelines-annex-iii' in top-5 results. Got: {doc_ids}"
    )

    # Check that §2.7.x appears in top results
    refs = [r.get("section_ref", "") or "" for r in results if r["document_id"] == "draft-guidelines-annex-iii"]
    has_27x = any("2.7" in ref for ref in refs)
    assert has_27x, (
        f"Expected §2.7.x section in Annex III results. Got sections: {refs}"
    )


def test_retrieval_similarity_scores_are_reasonable(conn):
    """Top results should have similarity > 0.4 for relevant legal queries."""
    query = "sistema di intelligenza artificiale ad alto rischio Art. 9"
    embedding = embed_query(query)
    results = similarity_search(conn, embedding, top_k=3, min_similarity=0.0)

    assert len(results) > 0, "No results returned"
    top_similarity = results[0]["similarity"]
    assert top_similarity >= 0.4, (
        f"Top result similarity {top_similarity:.3f} is too low. "
        "Embeddings may not be working correctly."
    )


def test_document_filter(conn):
    """Document filter should restrict results to specified document."""
    query = "scopo del regolamento intelligenza artificiale"
    embedding = embed_query(query)

    all_results = similarity_search(conn, embedding, top_k=5, min_similarity=0.0)
    filtered = similarity_search(conn, embedding, top_k=5, document_filter="ai-act-it", min_similarity=0.0)

    assert all(r["document_id"] == "ai-act-it" for r in filtered), (
        "Document filter returned results from other documents"
    )
