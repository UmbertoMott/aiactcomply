"""
Text file reader for pre-extracted documents.
Handles the ai_act_full.txt format with ===== PAGINA N ===== markers.

Returns: list of {"page": int, "text": str}
"""
from pathlib import Path
import re


def extract_txt_pages(path: Path) -> list[dict]:
    """
    Parse a txt file with ===== PAGINA N ===== markers into pages.
    Falls back to treating the whole file as one page if no markers found.
    """
    text = path.read_text(encoding="utf-8", errors="replace")

    # Split on page markers
    parts = re.split(r"={3,}\s*PAGINA\s+(\d+)\s*={3,}", text)

    if len(parts) <= 1:
        # No markers — return whole file as page 1
        return [{"page": 1, "text": text.strip()}]

    # parts = [before_first_marker, page_num, page_text, page_num, page_text, ...]
    pages = []
    i = 1
    while i < len(parts) - 1:
        page_num = int(parts[i])
        page_text = parts[i + 1].strip()
        if page_text:
            pages.append({"page": page_num, "text": page_text})
        i += 2

    return pages
