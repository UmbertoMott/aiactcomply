"""
RAG Generation — Gemini 2.0 Flash via Vertex AI.
Builds the prompt, calls the model, extracts citations.

Also used by test_citations.py for testing prompt construction.
"""
import re
from config import VERTEX_PROJECT_ID, VERTEX_LOCATION, GENERATION_MODEL


CITATION_RE = re.compile(r"\[Fonte:[^\]]{5,200}\]", re.IGNORECASE)


SYSTEM_PROMPT = """Sei un esperto di EU AI Act (Regolamento UE 2024/1689) e normativa AI.
Rispondi ESCLUSIVAMENTE in base ai documenti forniti nel contesto.
Per ogni affermazione cita la fonte nel formato:
  [Fonte: {titolo_documento}, {sezione_ref}, p. {numero_pagina}]
Se l'informazione non è nel contesto, di' esplicitamente:
  "Questa informazione non è disponibile nei documenti indicizzati."
Non inventare riferimenti normativi. Non citare articoli che non compaiono nel contesto."""


def build_prompt(query: str, context_chunks: list[dict]) -> str:
    """
    Construct the RAG prompt with context chunks.
    Each chunk includes its source citation so the model can reference it.

    Used both by answer_with_rag() and by tests.
    """
    if not context_chunks:
        return (
            f"{SYSTEM_PROMPT}\n\n"
            f"CONTESTO: nessun documento rilevante trovato.\n\n"
            f"Domanda: {query}\n\n"
            f"Risposta: Questa informazione non è disponibile nei documenti indicizzati. "
            f"Non puoi rispondere senza fonti nel contesto."
        )

    context_parts = []
    for i, chunk in enumerate(context_chunks, 1):
        ref = chunk.get("section_ref") or "sezione sconosciuta"
        page = chunk.get("page_number") or "?"
        title = chunk.get("document_title") or chunk.get("document_id") or "documento"
        sim = chunk.get("similarity") or chunk.get("boosted_similarity") or 0
        context_parts.append(
            f"[FONTE {i}] {title} — {ref} (p. {page}) [rilevanza: {sim:.2f}]\n"
            f"{chunk['chunk_text']}\n"
        )

    context_block = "\n---\n".join(context_parts)

    return (
        f"{SYSTEM_PROMPT}\n\n"
        f"CONTESTO ({len(context_chunks)} fonti):\n"
        f"{context_block}\n\n"
        f"Domanda: {query}\n\n"
        f"Risposta (includi citazioni [Fonte:...] per ogni affermazione):"
    )


def parse_answer(raw_answer: str, context_chunks: list[dict]) -> dict:
    """
    Extract structured output from the model's raw answer.
    Returns: {"answer": str, "sources": list, "confidence": str}
    """
    citations = CITATION_RE.findall(raw_answer)

    # Confidence heuristic: based on citation count and avg similarity
    avg_sim = sum(c.get("similarity", 0) for c in context_chunks) / max(len(context_chunks), 1)
    if citations and avg_sim >= 0.7:
        confidence = "HIGH"
    elif citations and avg_sim >= 0.4:
        confidence = "MEDIUM"
    else:
        confidence = "LOW"

    # Build sources list from context (cited ones first)
    sources = []
    for chunk in context_chunks:
        sources.append({
            "document_title": chunk.get("document_title"),
            "section_ref":    chunk.get("section_ref"),
            "page_number":    chunk.get("page_number"),
            "similarity":     round(chunk.get("similarity", 0), 3),
        })

    return {
        "answer":     raw_answer.strip(),
        "sources":    sources,
        "citations":  citations,
        "confidence": confidence,
    }


def answer_with_rag(query: str, context_chunks: list[dict]) -> dict:
    """
    Generate an answer using Gemini 2.0 Flash with retrieved context.

    Returns:
        {
          "answer": str,
          "sources": list of {document_title, section_ref, page_number, similarity},
          "citations": list of [Fonte:...] strings found in answer,
          "confidence": "LOW" | "MEDIUM" | "HIGH",
        }
    """
    try:
        import vertexai
        from vertexai.generative_models import GenerativeModel
        vertexai.init(project=VERTEX_PROJECT_ID, location=VERTEX_LOCATION)
    except ImportError:
        raise ImportError(
            "google-cloud-aiplatform not installed. "
            "Run: pip install google-cloud-aiplatform"
        )

    prompt = build_prompt(query, context_chunks)
    model = GenerativeModel(GENERATION_MODEL)

    response = model.generate_content(
        prompt,
        generation_config={
            "temperature": 0.1,   # low temperature for factual legal Q&A
            "max_output_tokens": 2048,
            "top_p": 0.95,
        },
    )

    raw_answer = response.text if hasattr(response, "text") else str(response)
    return parse_answer(raw_answer, context_chunks)
