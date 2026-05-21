"""
PDF text extraction using pdfminer.six.
For text-based (non-scanned) PDFs.

Returns: list of {"page": int, "text": str}
"""
from pathlib import Path
from io import StringIO

try:
    from pdfminer.high_level import extract_pages
    from pdfminer.layout import LTTextContainer
    PDFMINER_AVAILABLE = True
except ImportError:
    PDFMINER_AVAILABLE = False


def extract_pdf_pages(path: Path) -> list[dict]:
    """
    Extract text from a text-based PDF, page by page.
    Raises ImportError if pdfminer.six is not installed.
    Raises ValueError if the PDF appears to be scanned (all pages empty).
    """
    if not PDFMINER_AVAILABLE:
        raise ImportError(
            "pdfminer.six is not installed. Run: pip install pdfminer.six"
        )

    pages = []
    for page_num, page_layout in enumerate(extract_pages(str(path)), start=1):
        page_text = StringIO()
        for element in page_layout:
            if isinstance(element, LTTextContainer):
                page_text.write(element.get_text())
        text = page_text.getvalue().strip()
        if text:
            pages.append({"page": page_num, "text": text})

    if not pages:
        raise ValueError(
            f"No text extracted from {path.name}. "
            "This PDF may be scanned — use pdf_ocr extractor instead."
        )

    # Sanity check: if >90% of pages are empty, likely scanned
    total = page_num  # type: ignore[possibly-undefined]
    if len(pages) < total * 0.1:
        raise ValueError(
            f"Only {len(pages)}/{total} pages have text in {path.name}. "
            "This PDF appears to be scanned — use pdf_ocr extractor."
        )

    return pages
