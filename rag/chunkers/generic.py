"""
Generic fallback chunker — fixed character windows with overlap.
Used when semantic (article/paragraph) splitting finds no structure.

section_ref is extracted by regex scan for "Art. N" in the chunk.
"""
import re
from constants import FALLBACK_CHUNK_CHARS, FALLBACK_OVERLAP_CHARS


ART_RE = re.compile(r"Art\.\s*(\d+(?:\(\d+\))?)")


def _extract_section_ref(text: str) -> "str | None":
    """Return the first article reference found in the text, or None."""
    m = ART_RE.search(text)
    return f"Art. {m.group(1)}" if m else None


def chunk_generic(pages: list[dict], document_meta: dict) -> list[dict]:
    """
    Split text into overlapping windows of FALLBACK_CHUNK_CHARS characters.
    """
    full_text = ""
    page_offsets = []
    for p in pages:
        page_offsets.append((len(full_text), p["page"]))
        full_text += p["text"] + "\n"

    def char_to_page(pos: int) -> int:
        page = 1
        for offset, pnum in page_offsets:
            if pos >= offset:
                page = pnum
            else:
                break
        return page

    chunks = []
    chunk_index = 0
    start = 0

    while start < len(full_text):
        end = min(start + FALLBACK_CHUNK_CHARS, len(full_text))
        text = full_text[start:end].strip()
        if text and len(text) >= 50:
            chunks.append({
                "document_id":    document_meta["id"],
                "document_title": document_meta["title"],
                "document_date":  document_meta.get("date"),
                "chunk_index":    chunk_index,
                "section_ref":    _extract_section_ref(text),
                "page_number":    char_to_page(start),
                "chunk_text":     text,
            })
            chunk_index += 1
        start = end - FALLBACK_OVERLAP_CHARS

    print(f"  [chunker/generic] {len(chunks)} fixed-size chunks")
    return chunks
