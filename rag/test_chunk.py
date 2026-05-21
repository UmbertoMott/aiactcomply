"""Test minimale chunking — senza dotenv, senza config, senza nulla di pesante."""
import re
import sys
from pathlib import Path

# Costanti inline — bypassa config.py e dotenv completamente
MAX_ARTICLE_CHARS    = 3200
FALLBACK_CHUNK_CHARS = 2400
FALLBACK_OVERLAP_CHARS = 400

TXT_PATH = Path("/Users/umbertomottola/Desktop/open code - ai act saas/ai_act_full.txt")

print("Step 1: lettura file...")
text = TXT_PATH.read_text(encoding="utf-8", errors="replace")
print(f"  OK — {len(text)} chars")

print("Step 2: ricerca articoli...")
ARTICLE_RE = re.compile(r"(?:^|\n)\s*Articolo\s+(\d+)\s*\n\s*([^\n]{0,120})?", re.MULTILINE)
matches = list(ARTICLE_RE.finditer(text))
print(f"  OK — {len(matches)} articoli trovati")

print("Step 3: chunking...")
chunks = []
for i, match in enumerate(matches):
    art_num = match.group(1)
    start = match.start()
    end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
    article_text = text[start:end].strip()
    chunks.append({
        "section_ref": f"Art. {art_num}",
        "chunk_text":  article_text,
        "chunk_index": i,
    })

print(f"  OK — {len(chunks)} chunks")
print(f"\nPrimo chunk: [{chunks[0]['section_ref']}] {chunks[0]['chunk_text'][:100]}...")
print(f"Ultimo chunk: [{chunks[-1]['section_ref']}] {chunks[-1]['chunk_text'][:100]}...")
print("\nDONE ✅")
