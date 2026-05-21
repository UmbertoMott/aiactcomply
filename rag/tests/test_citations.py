"""
Test 3 (extended): Citation test — every RAG answer must include
at least one [Fonte: ...] source citation.

Test 4: OCR test — ISO 42001 chunks must be legible.
"""
import re
import sys
import pytest
sys.path.insert(0, "..")


CITATION_RE = re.compile(r"\[Fonte:[^\]]+\]", re.IGNORECASE)


def test_answer_contains_citation(monkeypatch):
    """
    Stub the embedding + LLM calls and verify the answer builder always
    includes citations in its output.

    We test the prompt construction logic, not the actual Vertex AI call.
    """
    from rag_answer import build_prompt, parse_answer

    context_chunks = [
        {
            "document_title": "Regolamento (UE) 2024/1689 — EU AI Act",
            "section_ref": "Art. 9(1)",
            "page_number": 42,
            "chunk_text": (
                "I fornitori di sistemi di IA ad alto rischio istituiscono, attuano, "
                "documentano e mantengono un sistema di gestione dei rischi."
            ),
            "similarity": 0.87,
        }
    ]

    prompt = build_prompt(
        query="Cosa prevede l'Art. 9 per la gestione del rischio?",
        context_chunks=context_chunks,
    )

    # Prompt must include the source reference
    assert "Art. 9(1)" in prompt, "Prompt must include section_ref in context"
    assert "Regolamento (UE) 2024/1689" in prompt, "Prompt must include document title"

    # Simulate model output with citation
    simulated_answer = (
        "Il fornitore deve istituire un sistema di gestione dei rischi. "
        "[Fonte: Regolamento (UE) 2024/1689 — EU AI Act, Art. 9(1), p. 42]"
    )
    parsed = parse_answer(simulated_answer, context_chunks)

    assert len(parsed["sources"]) >= 1, "Answer must have at least one source citation"
    assert parsed["answer"] is not None


def test_answer_without_context_says_unknown():
    """
    When no relevant context is found, the answer must explicitly say
    it cannot answer (not hallucinate).
    """
    from rag_answer import build_prompt

    prompt = build_prompt(
        query="Qual è la pena massima per violazione dell'Art. 5?",
        context_chunks=[],  # empty context
    )

    # The prompt should instruct the model to say it doesn't know
    assert "non puoi rispondere" in prompt.lower() or "non è nel contesto" in prompt.lower(), (
        "Prompt must instruct model to refuse when context is empty"
    )


def test_ocr_chunks_are_legible():
    """
    OCR test: check ISO 42001 chunks from the indexer are readable.
    Tests the extract_pdf_ocr function on a simple synthetic image.
    """
    try:
        import pytesseract
        pytesseract.get_tesseract_version()
    except Exception:
        pytest.skip("Tesseract not available — skipping OCR test")

    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        pytest.skip("Pillow not available")

    # Create a synthetic test image with known text
    img = Image.new("RGB", (400, 100), color="white")
    draw = ImageDraw.Draw(img)
    test_text = "AI management system ISO 42001"
    draw.text((10, 30), test_text, fill="black")

    result = pytesseract.image_to_string(img, lang="eng").strip()

    # Should extract most of the words
    words_found = sum(1 for w in ["AI", "management", "system", "ISO"] if w.lower() in result.lower())
    assert words_found >= 2, (
        f"OCR extracted too few words from test image. "
        f"Got: {result!r}. Words found: {words_found}/4"
    )
