"""
Semantic chunker for EU AI Act (Regolamento UE 2024/1689).

Strategy:
  - Primary split: by "Articolo N" headers
  - Each chunk = one article + its preceding title (if any)
  - If article > MAX_ARTICLE_CHARS: split by numbered paragraphs (1), (2), ...
  - Overlap: first 2 sentences of previous chunk prepended to next

section_ref format: "Art. N" or "Art. N(P)" (P = paragraph number)
"""
import re
from config import MAX_ARTICLE_CHARS, FALLBACK_CHUNK_CHARS, FALLBACK_OVERLAP_CHARS


# Match "Articolo N" followed by optional title on same or next line
ARTICLE_RE = re.compile(
    r"(?:^|\n)\s*Articolo\s+(\d+)\s*\n\s*([^\n]{0,120})?",
    re.MULTILINE,
)

# Match numbered paragraphs: "(1)", "(2 a)", etc.
PARAGRAPH_RE = re.compile(r"\n\s*\((\d+)\)\s+", re.MULTILINE)


def _sentences(text: str, n: int = 2) -> str:
    """Return first n sentences of text (rough heuristic)."""
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    return " ".join(parts[:n])


def chunk_ai_act(pages: list[dict], document_meta: dict) -> list[dict]:
    """
    Chunk the AI Act text by article.

    Args:
        pages:         Output of txt_reader.extract_txt_pages or pdf extractor
        document_meta: {"id", "title", "date"} from config.DOCUMENTS

    Returns:
        List of chunk dicts ready for embedding and DB insert.
    """
    # Concatenate all page text with page number tracking
    # We build a continuous text and remember page boundaries
    full_text = ""
    page_offsets: list[tuple[int, int]] = []  # (char_offset, page_number)
    for p in pages:
        offset = len(full_text)
        full_text += p["text"] + "\n"
        page_offsets.append((offset, p["page"]))

    def char_to_page(char_pos: int) -> int:
        """Find the page number for a character position."""
        page = 1
        for offset, pnum in page_offsets:
            if char_pos >= offset:
                page = pnum
            else:
                break
        return page

    # Find all article boundaries
    matches = list(ARTICLE_RE.finditer(full_text))

    if not matches:
        # Fallback: generic fixed-size chunking
        print(f"  [chunker/ai-act] No 'Articolo N' found — falling back to generic chunker")
        from chunkers.generic import chunk_generic
        return chunk_generic(pages, document_meta)

    chunks = []
    chunk_index = 0
    prev_tail = ""  # last 2 sentences of previous chunk for overlap

    for i, match in enumerate(matches):
        art_num = match.group(1)
        art_title = (match.group(2) or "").strip()
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(full_text)
        article_text = full_text[start:end].strip()

        section_ref_base = f"Art. {art_num}"
        page_num = char_to_page(start)

        if len(article_text) <= MAX_ARTICLE_CHARS:
            # Article fits in one chunk
            chunk_body = (prev_tail + "\n" if prev_tail else "") + article_text
            chunks.append(_make_chunk(
                document_meta=document_meta,
                chunk_index=chunk_index,
                section_ref=section_ref_base,
                page_number=page_num,
                chunk_text=chunk_body.strip(),
            ))
            chunk_index += 1
            prev_tail = _sentences(article_text, 2)
        else:
            # Split long article by paragraphs
            para_matches = list(PARAGRAPH_RE.finditer(article_text))
            if para_matches:
                for j, pm in enumerate(para_matches):
                    para_num = pm.group(1)
                    p_start = pm.start()
                    p_end = para_matches[j + 1].start() if j + 1 < len(para_matches) else len(article_text)
                    para_text = article_text[p_start:p_end].strip()
                    section_ref = f"{section_ref_base}({para_num})"

                    chunk_body = (prev_tail + "\n" if prev_tail else "") + para_text
                    chunks.append(_make_chunk(
                        document_meta=document_meta,
                        chunk_index=chunk_index,
                        section_ref=section_ref,
                        page_number=page_num,
                        chunk_text=chunk_body.strip(),
                    ))
                    chunk_index += 1
                    prev_tail = _sentences(para_text, 2)
            else:
                # No numbered paragraphs — split by character limit
                sub_chunks = _split_by_chars(article_text, MAX_ARTICLE_CHARS, FALLBACK_OVERLAP_CHARS)
                for k, sc in enumerate(sub_chunks):
                    chunk_body = (prev_tail + "\n" if prev_tail else "") + sc
                    chunks.append(_make_chunk(
                        document_meta=document_meta,
                        chunk_index=chunk_index,
                        section_ref=f"{section_ref_base} (parte {k+1})",
                        page_number=page_num,
                        chunk_text=chunk_body.strip(),
                    ))
                    chunk_index += 1
                    prev_tail = _sentences(sc, 2)

    print(f"  [chunker/ai-act] {len(chunks)} chunks from {len(matches)} articles")
    return chunks


def _make_chunk(document_meta: dict, chunk_index: int, section_ref: str,
                page_number: int, chunk_text: str) -> dict:
    return {
        "document_id":    document_meta["id"],
        "document_title": document_meta["title"],
        "document_date":  document_meta.get("date"),
        "chunk_index":    chunk_index,
        "section_ref":    section_ref,
        "page_number":    page_number,
        "chunk_text":     chunk_text,
    }


def _split_by_chars(text: str, max_chars: int, overlap: int) -> list[str]:
    """Split text into overlapping windows of max_chars."""
    parts = []
    start = 0
    while start < len(text):
        end = min(start + max_chars, len(text))
        parts.append(text[start:end])
        start = end - overlap
    return parts
