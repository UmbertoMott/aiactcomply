"""
Semantic chunker for European Commission Draft Guidelines documents.

Strategy:
  - Split by numbered paragraphs: §N, N.N, N.N.N (e.g., §2.7.1, 3.1, 4.)
  - Each chunk = one numbered paragraph + sub-items
  - Overlap: 2 sentences from previous chunk

section_ref format: "§2.7.1", "§3.1", "Annex III §4.2"
"""
import re
from constants import FALLBACK_CHUNK_CHARS, FALLBACK_OVERLAP_CHARS, MAX_ARTICLE_CHARS


# Match paragraph headers like: "2.7.1", "3.", "Annex I", "§2.7"
# Preceded by newline, optional whitespace
PARA_RE = re.compile(
    r"(?:^|\n)\s*"
    r"(?:"
    r"(?:Annex\s+[IVX]+\s*[-–]?\s*)??"       # optional Annex prefix
    r"(\d{1,2}(?:\.\d{1,2}){0,3})\.?\s+"      # numbered section e.g. 2.7.1
    r"|"
    r"§\s*(\d{1,2}(?:\.\d{1,2}){0,3})\s+"     # §-prefixed
    r")",
    re.MULTILINE,
)

# Match "Annex I", "Annex III", etc. as section headers
ANNEX_RE = re.compile(
    r"(?:^|\n)\s*(Annex\s+[IVX]+)\s*\n",
    re.MULTILINE | re.IGNORECASE,
)


def _sentences(text: str, n: int = 2) -> str:
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    return " ".join(parts[:n])


def chunk_guidelines(pages: list[dict], document_meta: dict) -> list[dict]:
    """
    Chunk Draft Guidelines by numbered section.
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

    # Collect all split points (numbered sections + annexes)
    splits = []
    for m in PARA_RE.finditer(full_text):
        sec_num = m.group(1) or m.group(2)
        if sec_num:
            splits.append({"pos": m.start(), "ref": f"§{sec_num}"})
    for m in ANNEX_RE.finditer(full_text):
        splits.append({"pos": m.start(), "ref": m.group(1)})

    splits.sort(key=lambda x: x["pos"])

    if not splits:
        print(f"  [chunker/guidelines] No numbered sections found — fallback")
        from chunkers.generic import chunk_generic
        return chunk_generic(pages, document_meta)

    chunks = []
    chunk_index = 0
    prev_tail = ""

    for i, split in enumerate(splits):
        start = split["pos"]
        end = splits[i + 1]["pos"] if i + 1 < len(splits) else len(full_text)
        section_text = full_text[start:end].strip()
        if not section_text or len(section_text) < 30:
            continue

        section_ref = split["ref"]
        page_num = char_to_page(start)

        if len(section_text) <= MAX_ARTICLE_CHARS:
            chunk_body = (prev_tail + "\n" if prev_tail else "") + section_text
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
            prev_tail = _sentences(section_text, 2)
        else:
            # Long section: split at sentence boundaries
            subs = _split_by_chars(section_text, MAX_ARTICLE_CHARS, 200)
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

    print(f"  [chunker/guidelines] {len(chunks)} chunks from {len(splits)} sections")
    return chunks


def _split_by_chars(text: str, max_chars: int, overlap: int) -> list[str]:
    parts = []
    start = 0
    while start < len(text):
        end = min(start + max_chars, len(text))
        parts.append(text[start:end])
        start = end - overlap
    return parts
