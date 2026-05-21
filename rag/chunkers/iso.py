"""
Semantic chunker for ISO/IEC standards (22989, 42001).

Strategy:
  - Split by ISO clause headers: "3.1.4", "6.1", "Annex A", "A.5.1"
  - Each chunk = one clause
  - Overlap: 2 sentences from previous clause

section_ref format: "§3.1.4", "§6.1", "Annex A §A.5.1"
"""
import re
from constants import MAX_ARTICLE_CHARS


# ISO clause pattern: "3.1.4  Title" or "A.5.1  Title" or "Annex A (normative)"
ISO_CLAUSE_RE = re.compile(
    r"(?:^|\n)\s*"
    r"("
    r"(?:[A-Z]\.\d{1,2}(?:\.\d{1,2})?)"      # Annex: A.5, A.5.1
    r"|(?:\d{1,2}(?:\.\d{1,2}){1,3})"         # numbered: 3.1.4, 6.1
    r"|(?:Annex\s+[A-Z]\b)"                   # "Annex A"
    r")\s{1,4}[A-Z\(]",                        # followed by capital letter or (
    re.MULTILINE,
)


def _sentences(text: str, n: int = 2) -> str:
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    return " ".join(parts[:n])


def chunk_iso(pages: list[dict], document_meta: dict) -> list[dict]:
    """
    Chunk ISO standard text by clause.
    Works for both text-based and OCR-extracted text.
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

    splits = []
    for m in ISO_CLAUSE_RE.finditer(full_text):
        ref = m.group(1).strip()
        splits.append({"pos": m.start(), "ref": f"§{ref}"})

    if not splits:
        print(f"  [chunker/iso] No ISO clauses found — fallback to generic chunker")
        from chunkers.generic import chunk_generic
        return chunk_generic(pages, document_meta)

    chunks = []
    chunk_index = 0
    prev_tail = ""

    for i, split in enumerate(splits):
        start = split["pos"]
        end = splits[i + 1]["pos"] if i + 1 < len(splits) else len(full_text)
        clause_text = full_text[start:end].strip()

        if not clause_text or len(clause_text) < 20:
            continue

        page_num = char_to_page(start)
        section_ref = split["ref"]

        if len(clause_text) <= MAX_ARTICLE_CHARS:
            chunk_body = (prev_tail + "\n" if prev_tail else "") + clause_text
            chunks.append({
                "document_id":    document_meta["id"],
                "document_title": document_meta["title"],
                "document_date":  document_meta.get("date"),
                "chunk_index":    chunk_index,
                "section_ref":    section_ref,
                "page_number":    page_num,
                "chunk_text":     chunk_body.strip(),
            })
            chunk_index += 1
            prev_tail = _sentences(clause_text, 2)
        else:
            subs = _split_by_chars(clause_text, MAX_ARTICLE_CHARS, 200)
            for k, sub in enumerate(subs):
                chunk_body = (prev_tail + "\n" if prev_tail else "") + sub
                chunks.append({
                    "document_id":    document_meta["id"],
                    "document_title": document_meta["title"],
                    "document_date":  document_meta.get("date"),
                    "chunk_index":    chunk_index,
                    "section_ref":    f"{section_ref} (parte {k+1})",
                    "page_number":    page_num,
                    "chunk_text":     chunk_body.strip(),
                })
                chunk_index += 1
                prev_tail = _sentences(sub, 2)

    print(f"  [chunker/iso] {len(chunks)} chunks from {len(splits)} clauses")
    return chunks


def _split_by_chars(text: str, max_chars: int, overlap: int) -> list[str]:
    parts = []
    start = 0
    while start < len(text):
        end = min(start + max_chars, len(text))
        parts.append(text[start:end])
        start = end - overlap
    return parts
