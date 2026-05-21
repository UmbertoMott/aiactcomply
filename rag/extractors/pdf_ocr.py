"""
OCR extraction for scanned PDFs.
Uses pdf2image (poppler) + pytesseract (Tesseract OCR).

Install prerequisites:
  pip install pdf2image pytesseract Pillow
  brew install poppler tesseract   # macOS
  apt install poppler-utils tesseract-ocr   # Ubuntu

Returns: list of {"page": int, "text": str}
"""
from pathlib import Path

try:
    from pdf2image import convert_from_path
    PDF2IMAGE_AVAILABLE = True
except ImportError:
    PDF2IMAGE_AVAILABLE = False

try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False


def extract_pdf_ocr(path: Path, dpi: int = 150, lang: str = "eng") -> list[dict]:
    """
    Convert each PDF page to an image, then run Tesseract OCR.

    Args:
        path:  Path to the PDF file
        dpi:   Render resolution. 150 is fast but sufficient for clean scans.
               Use 200-300 for noisy/low-quality scans.
        lang:  Tesseract language code(s). "eng" for English, "ita" for Italian,
               "eng+ita" for mixed.

    Returns:
        List of {"page": int, "text": str} — only non-empty pages included.

    Raises:
        ImportError if pdf2image or pytesseract not installed.
        RuntimeError if Tesseract binary not found.
    """
    if not PDF2IMAGE_AVAILABLE:
        raise ImportError("pdf2image not installed. Run: pip install pdf2image")
    if not TESSERACT_AVAILABLE:
        raise ImportError("pytesseract not installed. Run: pip install pytesseract")

    try:
        # Test tesseract is available
        pytesseract.get_tesseract_version()
    except pytesseract.TesseractNotFoundError:
        raise RuntimeError(
            "Tesseract binary not found. "
            "macOS: brew install tesseract | Ubuntu: apt install tesseract-ocr"
        )

    print(f"  [OCR] Rendering {path.name} at {dpi} dpi...")
    images = convert_from_path(str(path), dpi=dpi)
    pages = []

    for page_num, image in enumerate(images, start=1):
        if page_num % 10 == 0:
            print(f"  [OCR] Page {page_num}/{len(images)}...")

        text = pytesseract.image_to_string(
            image,
            lang=lang,
            config="--oem 3 --psm 3",  # OEM 3 = LSTM+legacy, PSM 3 = auto
        ).strip()

        # Filter garbage OCR output: require at least 50 chars of real text
        if len(text) >= 50:
            pages.append({"page": page_num, "text": text})
        else:
            print(f"  [OCR] Page {page_num}: skipped (only {len(text)} chars)")

    print(f"  [OCR] Extracted {len(pages)}/{len(images)} pages with usable text")
    return pages
