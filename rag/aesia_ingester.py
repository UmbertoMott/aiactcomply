"""
AESIA Guías de Uso Responsable — Ingester
TODO: Download and index AESIA guides 01-16 from:
  https://aesia.digital.gob.es/guias-uso-responsable-ia/

Each guide gets document_id: "aesia-guide-{N:02d}"

Usage (when implemented):
  python aesia_ingester.py --guide 01   # index guide 01
  python aesia_ingester.py --all        # index all 16 guides

Prerequisites: same as ingest.py + requests library
"""
# TODO: Implement AESIA guide downloader and indexer.
# The guides are available as PDFs from the AESIA website.
# Expected implementation:
#
#   1. Download PDF from known URL pattern
#   2. Extract text with pdf_text extractor (they are text-based)
#   3. Chunk with guidelines chunker (numbered paragraphs)
#   4. Embed and store with document_id "aesia-guide-{N:02d}"
#
# Document registry entries to add to config.DOCUMENTS:
#   {
#     "id": f"aesia-guide-{i:02d}",
#     "title": f"AESIA Guía {i:02d} — Uso Responsable de la IA",
#     "date": "2025",
#     "pdf_path": f"/tmp/aesia/guia-{i:02d}.pdf",
#     "extractor": "pdf_text",
#     "chunker": "guidelines",
#   }

AESIA_BASE_URL = "https://aesia.digital.gob.es/guias-uso-responsable-ia/"
GUIDE_COUNT = 16

print("AESIA ingester — not yet implemented. See aesia_ingester.py for TODO details.")
