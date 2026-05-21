"""
RAG Pipeline Configuration
Document registry, paths, and constants.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ─── Vertex AI ────────────────────────────────────────────────
VERTEX_PROJECT_ID = os.environ.get("VERTEX_PROJECT_ID", "")
VERTEX_LOCATION   = os.environ.get("VERTEX_LOCATION", "us-central1")
EMBED_MODEL       = "text-embedding-004"
EMBED_DIMS        = 768
EMBED_BATCH_SIZE  = int(os.environ.get("EMBED_BATCH_SIZE", "20"))

# Generation model for testing
GENERATION_MODEL  = "gemini-2.0-flash-001"

# ─── Database ─────────────────────────────────────────────────
DATABASE_URL = os.environ.get("DATABASE_URL", "")

# ─── Document paths ───────────────────────────────────────────
_PDF_DIR = Path(os.environ.get("PDF_DIR",
    "/Users/umbertomottola/Desktop/Privacy documenti"))

AI_ACT_TXT_PATH = Path(os.environ.get("AI_ACT_TXT_PATH",
    "/Users/umbertomottola/Desktop/open code - ai act saas/ai_act_full.txt"))

# ─── Document Registry ────────────────────────────────────────
DOCUMENTS = [
    {
        "id":    "ai-act-it",
        "title": "Regolamento (UE) 2024/1689 — EU AI Act",
        "date":  "2024",
        # Primary: use pre-extracted txt (faster, more reliable for article parsing)
        "txt_path": AI_ACT_TXT_PATH,
        # Fallback: PDF if txt not available
        "pdf_path": _PDF_DIR / "testo-italiano-AI-act.pdf",
        "extractor": "txt",
        "chunker":   "ai_act",
    },
    {
        "id":    "draft-guidelines-general",
        "title": "Draft Guidelines — Classificazione AI ad Alto Rischio (Principi Generali)",
        "date":  "2025",
        "pdf_path": _PDF_DIR / "Draft_Guidelines_on_the_classification_on_highrisk_AI_general_principles_UQmTa2BdJ3IH8bIsWJyDqaWOY_128559.pdf",
        "extractor": "pdf_text",
        "chunker":   "guidelines",
    },
    {
        "id":    "draft-guidelines-annex-i",
        "title": "Draft Guidelines — Classificazione AI ad Alto Rischio (Allegato I)",
        "date":  "2025",
        "pdf_path": _PDF_DIR / "Draft_Guidelines_on_the_classification_of_high_risk_AI_Annex_I_E9XHEqRLx555OO6iijKwJF32Cvc_128560.pdf",
        "extractor": "pdf_text",
        "chunker":   "guidelines",
    },
    {
        "id":    "draft-guidelines-annex-iii",
        "title": "Draft Guidelines — Classificazione AI ad Alto Rischio (Allegato III)",
        "date":  "2025",
        "pdf_path": _PDF_DIR / "Draft_Guidelines_on_the_classification_of_high_risk_AI_Annex_III_7MXR3YIz2GW3uPpJPWvvNDd8IOI_128561.pdf",
        "extractor": "pdf_text",
        "chunker":   "guidelines",
    },
    {
        "id":    "iso-22989",
        "title": "ISO/IEC 22989:2022 — Artificial Intelligence — Concepts and Terminology",
        "date":  "2022",
        "pdf_path": _PDF_DIR / "ISO_IEC_22989_2022(en).pdf",
        "extractor": "pdf_text",
        "chunker":   "iso",
    },
    {
        "id":    "iso-42001",
        "title": "ISO/IEC 42001:2023 — AI Management System (AIMS)",
        "date":  "2023",
        "pdf_path": _PDF_DIR / "SCAN-ISO-420012023_-Web.pdf",
        "extractor": "pdf_ocr",   # SCANSIONATO — richiede OCR
        "chunker":   "iso",
        "ocr_dpi":   150,
        "ocr_lang":  "eng",
    },
]

# ─── Chunking ─────────────────────────────────────────────────
# Fallback chunk size (tokens ≈ characters / 4)
FALLBACK_CHUNK_CHARS = 2400    # ~600 tokens
FALLBACK_OVERLAP_CHARS = 400   # ~100 tokens overlap
MAX_ARTICLE_CHARS = 3200       # ~800 tokens — split if longer

# ─── Indexing ─────────────────────────────────────────────────
SKIP_EXISTING = os.environ.get("SKIP_EXISTING", "true").lower() == "true"
