"""
Vertex AI Embeddings — text-embedding-004 (768 dims).

Task types:
  RETRIEVAL_DOCUMENT — for indexing chunks (richer semantic representation)
  RETRIEVAL_QUERY    — for query-time embedding (different vector space head)
"""
import os
import time
from config import (
    VERTEX_PROJECT_ID, VERTEX_LOCATION, EMBED_MODEL,
    EMBED_DIMS, EMBED_BATCH_SIZE
)

try:
    from vertexai.language_models import TextEmbeddingInput, TextEmbeddingModel
    import vertexai
    VERTEX_AVAILABLE = True
except ImportError:
    VERTEX_AVAILABLE = False


_model = None


def _get_model():
    global _model
    if _model is None:
        if not VERTEX_AVAILABLE:
            raise ImportError(
                "google-cloud-aiplatform not installed. "
                "Run: pip install google-cloud-aiplatform"
            )
        if not VERTEX_PROJECT_ID:
            raise ValueError("VERTEX_PROJECT_ID not set in environment")
        vertexai.init(project=VERTEX_PROJECT_ID, location=VERTEX_LOCATION)
        _model = TextEmbeddingModel.from_pretrained(EMBED_MODEL)
    return _model


def embed_chunks(
    texts: list[str],
    task_type: str = "RETRIEVAL_DOCUMENT",
    retry_on_rate_limit: bool = True,
) -> list[list[float]]:
    """
    Embed a list of texts. Returns list of 768-dim float vectors.
    Processes in batches of EMBED_BATCH_SIZE to stay within API limits.

    Args:
        texts:     List of strings to embed
        task_type: "RETRIEVAL_DOCUMENT" for chunks, "RETRIEVAL_QUERY" for queries
    """
    model = _get_model()
    all_embeddings: list[list[float]] = []

    for batch_start in range(0, len(texts), EMBED_BATCH_SIZE):
        batch = texts[batch_start: batch_start + EMBED_BATCH_SIZE]
        inputs = [
            TextEmbeddingInput(text=text, task_type=task_type)
            for text in batch
        ]

        attempt = 0
        while attempt < 3:
            try:
                embeddings = model.get_embeddings(inputs)
                all_embeddings.extend([e.values for e in embeddings])
                break
            except Exception as e:
                error_str = str(e).lower()
                if "quota" in error_str or "rate" in error_str:
                    wait = 30 * (attempt + 1)
                    print(f"  [embedder] Rate limit — waiting {wait}s...")
                    time.sleep(wait)
                    attempt += 1
                else:
                    raise

        if len(all_embeddings) % 100 == 0 and len(all_embeddings) > 0:
            print(f"  [embedder] Embedded {len(all_embeddings)}/{len(texts)} chunks")

    return all_embeddings


def embed_query(query: str) -> list[float]:
    """
    Embed a single query string for retrieval.
    Uses RETRIEVAL_QUERY task type (different from RETRIEVAL_DOCUMENT).
    """
    results = embed_chunks([query], task_type="RETRIEVAL_QUERY")
    return results[0]
