"""
RAG Ingestion Script — EU AI Act + Guidelines + ISO
Carica e indicizza i documenti normativi in Supabase pgvector.

Uso:
  python3 run_ingest.py            # indicizza tutto
  python3 run_ingest.py ai-act-it  # solo AI Act
  python3 run_ingest.py --list     # mostra documenti disponibili
"""
import os
import sys
import json
import time
import re
import urllib.request
import urllib.parse
import base64
from pathlib import Path

# ─── Carica env vars dal file .env (senza dotenv) ─────────────
_ENV_FILE = Path(__file__).parent / ".env"
if _ENV_FILE.exists():
    for line in _ENV_FILE.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip())

# ─── Configurazione ───────────────────────────────────────────
VERTEX_PROJECT_ID = os.environ.get("VERTEX_PROJECT_ID", "")
VERTEX_LOCATION   = os.environ.get("VERTEX_LOCATION", "us-central1")
EMBED_MODEL       = "text-embedding-004"
EMBED_BATCH_SIZE  = 5
MAX_ARTICLE_CHARS = 3200
DATABASE_URL      = os.environ.get("DATABASE_URL", "")

PDF_DIR     = Path("/Users/umbertomottola/Desktop/Privacy documenti")
AI_ACT_TXT  = Path("/Users/umbertomottola/Desktop/open code - ai act saas/ai_act_full.txt")

DOCUMENTS = [
    {
        "id":       "ai-act-it",
        "title":    "Regolamento (UE) 2024/1689 — EU AI Act",
        "date":     "2024",
        "txt_path": AI_ACT_TXT,
        "chunker":  "ai_act",
    },
    {
        "id":       "draft-guidelines-general",
        "title":    "Draft Guidelines — Classificazione AI ad Alto Rischio (Principi Generali)",
        "date":     "2025",
        "pdf_path": PDF_DIR / "Draft_Guidelines_on_the_classification_on_highrisk_AI_general_principles_UQmTa2BdJ3IH8bIsWJyDqaWOY_128559.pdf",
        "chunker":  "guidelines",
    },
    {
        "id":       "draft-guidelines-annex-i",
        "title":    "Draft Guidelines — Classificazione AI ad Alto Rischio (Allegato I)",
        "date":     "2025",
        "pdf_path": PDF_DIR / "Draft_Guidelines_on_the_classification_of_high_risk_AI_Annex_I_E9XHEqRLx555OO6iijKwJF32Cvc_128560.pdf",
        "chunker":  "guidelines",
    },
    {
        "id":       "draft-guidelines-annex-iii",
        "title":    "Draft Guidelines — Classificazione AI ad Alto Rischio (Allegato III)",
        "date":     "2025",
        "pdf_path": PDF_DIR / "Draft_Guidelines_on_the_classification_of_high_risk_AI_Annex_III_7MXR3YIz2GW3uPpJPWvvNDd8IOI_128561.pdf",
        "chunker":  "guidelines",
    },
    {
        "id":       "iso-22989",
        "title":    "ISO/IEC 22989:2022 — Artificial Intelligence Concepts and Terminology",
        "date":     "2022",
        "pdf_path": PDF_DIR / "ISO_IEC_22989_2022(en).pdf",
        "chunker":  "iso",
    },
]

# ─── Vertex AI auth ───────────────────────────────────────────
_token_cache: dict = {}

def _load_sa() -> dict:
    sa_file = os.environ.get("VERTEX_SERVICE_ACCOUNT_FILE", "service_account.json")
    sa_path = Path(sa_file) if Path(sa_file).is_absolute() else Path(__file__).parent / sa_file
    if sa_path.exists():
        return json.loads(sa_path.read_text())
    sa_json = os.environ.get("VERTEX_SERVICE_ACCOUNT_JSON", "")
    if sa_json:
        return json.loads(sa_json)
    raise ValueError("Nessuna service account trovata.")

def _get_token() -> str:
    now = int(time.time())
    if _token_cache.get("expires", 0) > now + 30:
        return _token_cache["token"]
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import padding
    sa = _load_sa()
    header  = base64.urlsafe_b64encode(json.dumps({"alg":"RS256","typ":"JWT"}).encode()).rstrip(b"=").decode()
    payload = base64.urlsafe_b64encode(json.dumps({
        "iss": sa["client_email"], "sub": sa["client_email"],
        "aud": sa["token_uri"],    "iat": now, "exp": now + 3600,
        "scope": "https://www.googleapis.com/auth/cloud-platform",
    }).encode()).rstrip(b"=").decode()
    signing_input = f"{header}.{payload}".encode()
    pk = serialization.load_pem_private_key(sa["private_key"].encode(), password=None)
    sig = base64.urlsafe_b64encode(pk.sign(signing_input, padding.PKCS1v15(), hashes.SHA256())).rstrip(b"=").decode()
    jwt = f"{header}.{payload}.{sig}"
    data = urllib.parse.urlencode({"grant_type":"urn:ietf:params:oauth:grant-type:jwt-bearer","assertion":jwt}).encode()
    req = urllib.request.Request(sa["token_uri"], data=data,
                                  headers={"Content-Type":"application/x-www-form-urlencoded"})
    with urllib.request.urlopen(req) as r:
        result = json.loads(r.read())
    _token_cache["token"]   = result["access_token"]
    _token_cache["expires"] = now + result.get("expires_in", 3600)
    return _token_cache["token"]

# ─── Embedding ────────────────────────────────────────────────
def embed_texts(texts: list, task_type: str = "RETRIEVAL_DOCUMENT") -> list:
    url = (f"https://{VERTEX_LOCATION}-aiplatform.googleapis.com/v1"
           f"/projects/{VERTEX_PROJECT_ID}/locations/{VERTEX_LOCATION}"
           f"/publishers/google/models/{EMBED_MODEL}:predict")
    all_vecs = []
    for i in range(0, len(texts), EMBED_BATCH_SIZE):
        batch = texts[i:i + EMBED_BATCH_SIZE]
        body  = json.dumps({"instances":[{"content":t,"taskType":task_type} for t in batch]}).encode()
        for attempt in range(4):
            req = urllib.request.Request(url, data=body, headers={
                "Authorization": f"Bearer {_get_token()}",
                "Content-Type":  "application/json",
            })
            try:
                with urllib.request.urlopen(req) as r:
                    result = json.loads(r.read())
                all_vecs.extend([p["embeddings"]["values"] for p in result["predictions"]])
                break
            except urllib.error.HTTPError as e:
                err = e.read().decode()
                if e.code == 429 or "quota" in err.lower():
                    wait = 30 * (attempt + 1)
                    print(f"  Rate limit — attendo {wait}s...")
                    time.sleep(wait)
                else:
                    raise RuntimeError(f"Embedding error ({e.code}): {err}")
        n = len(all_vecs)
        if n % 100 == 0 and n > 0:
            print(f"  Embedded {n}/{len(texts)}")
    return all_vecs

# ─── Chunkers ─────────────────────────────────────────────────
ARTICLE_RE   = re.compile(r"(?:^|\n)\s*Articolo\s+(\d+)", re.MULTILINE)
PARAGRAPH_RE = re.compile(r"\n\s*\((\d+)\)\s+", re.MULTILINE)
SECTION_RE   = re.compile(r"(?:^|\n)\s*(\d+(?:\.\d+){1,3}|Annex\s+[A-Z](?:\.\d+)*|§\s*\d+(?:\.\d+)*)\s*[\.\:—\-]?\s+", re.MULTILINE)

def chunk_ai_act(text: str, doc: dict) -> list:
    print(f"    regex scan...")
    matches = list(ARTICLE_RE.finditer(text))
    print(f"    trovati {len(matches)} articoli")
    if not matches:
        return chunk_generic(text, doc)
    chunks = []
    for i, m in enumerate(matches):
        art_num = m.group(1)
        start   = m.start()
        end     = matches[i+1].start() if i+1 < len(matches) else len(text)
        art_text = text[start:end].strip()
        print(f"    Art.{art_num} ({len(art_text)} chars)", flush=True)
        if len(art_text) <= MAX_ARTICLE_CHARS:
            chunks.append({"section_ref": f"Art. {art_num}", "chunk_text": art_text, "chunk_index": len(chunks)})
        else:
            print(f"      > lungo, cerco paragrafi...", flush=True)
            paras = list(PARAGRAPH_RE.finditer(art_text))
            print(f"      > paragrafi trovati: {len(paras)}", flush=True)
            if paras:
                for j, pm in enumerate(paras):
                    p_end = paras[j+1].start() if j+1 < len(paras) else len(art_text)
                    chunks.append({"section_ref": f"Art. {art_num}({pm.group(1)})",
                                   "chunk_text": art_text[pm.start():p_end].strip(),
                                   "chunk_index": len(chunks)})
            else:
                for k, sc in enumerate(_split(art_text, MAX_ARTICLE_CHARS)):
                    chunks.append({"section_ref": f"Art. {art_num} (parte {k+1})",
                                   "chunk_text": sc, "chunk_index": len(chunks)})
    return chunks

def chunk_guidelines(text: str, doc: dict) -> list:
    matches = list(SECTION_RE.finditer(text))
    if len(matches) < 3:
        return chunk_generic(text, doc)
    chunks = []
    for i, m in enumerate(matches):
        end = matches[i+1].start() if i+1 < len(matches) else len(text)
        chunk_text = text[m.start():end].strip()
        if len(chunk_text) < 100:
            continue
        chunks.append({"section_ref": f"§{m.group(1).strip()}", "chunk_text": chunk_text, "chunk_index": len(chunks)})
    return chunks

def chunk_iso(text: str, doc: dict) -> list:
    return chunk_guidelines(text, doc)

def chunk_generic(text: str, doc: dict) -> list:
    parts = _split(text, 2400)
    return [{"section_ref": None, "chunk_text": p, "chunk_index": i} for i, p in enumerate(parts)]

def _split(text: str, max_chars: int, overlap: int = 400) -> list:
    parts, start = [], 0
    while start < len(text):
        end = min(start + max_chars, len(text))
        parts.append(text[start:end])
        if end >= len(text):
            break  # raggiunta la fine
        start = end - overlap
    return parts

# ─── Text extraction ──────────────────────────────────────────
def extract_txt(path: Path) -> str:
    text = path.read_text(encoding="utf-8", errors="replace")
    # rimuovi marker ===== PAGINA N =====
    text = re.sub(r"={3,}\s*PAGINA\s+\d+\s*={3,}", "", text)
    return text

def extract_pdf(path: Path) -> str:
    from pdfminer.high_level import extract_text
    return extract_text(str(path))

# ─── Supabase insert ──────────────────────────────────────────
def insert_chunks(chunks: list, embeddings: list, doc: dict):
    import psycopg2
    import psycopg2.extras
    conn = psycopg2.connect(DATABASE_URL)
    rows = []
    for chunk, vec in zip(chunks, embeddings):
        vec_str = "[" + ",".join(f"{v:.8f}" for v in vec) + "]"
        rows.append((
            doc["id"], doc["title"], doc.get("date"),
            chunk["chunk_index"], chunk.get("section_ref"),
            chunk.get("page_number"), chunk["chunk_text"], vec_str,
        ))
    with conn.cursor() as cur:
        psycopg2.extras.execute_values(
            cur,
            """INSERT INTO rag_chunks
               (document_id, document_title, document_date,
                chunk_index, section_ref, page_number, chunk_text, embedding)
               VALUES %s ON CONFLICT DO NOTHING""",
            rows,
            template="(%s,%s,%s,%s,%s,%s,%s,%s::vector)",
            page_size=50,
        )
    conn.commit()
    inserted = len(rows)
    conn.close()
    return inserted

# ─── Main ─────────────────────────────────────────────────────
def process_document(doc: dict):
    doc_id = doc["id"]
    print(f"\n{'='*50}")
    print(f"Documento: {doc['title']}")
    print(f"ID: {doc_id}")

    # Estrai testo
    print("  Estrazione testo...")
    if "txt_path" in doc:
        text = extract_txt(doc["txt_path"])
    elif "pdf_path" in doc:
        text = extract_pdf(doc["pdf_path"])
    else:
        print("  SKIP — nessun file configurato")
        return
    print(f"  Testo: {len(text)} caratteri")

    # Chunking
    print("  Chunking...")
    chunker = doc.get("chunker", "generic")
    if chunker == "ai_act":
        chunks = chunk_ai_act(text, doc)
    elif chunker == "guidelines":
        chunks = chunk_guidelines(text, doc)
    elif chunker == "iso":
        chunks = chunk_iso(text, doc)
    else:
        chunks = chunk_generic(text, doc)

    # Aggiungi metadati doc
    for c in chunks:
        c["document_id"]    = doc["id"]
        c["document_title"] = doc["title"]
        c["document_date"]  = doc.get("date")
        c.setdefault("page_number", None)

    print(f"  Chunks: {len(chunks)}")
    if not chunks:
        print("  SKIP — nessun chunk estratto")
        return

    # Embedding
    print("  Embedding con Gemini text-embedding-004...")
    texts = [c["chunk_text"] for c in chunks]
    embeddings = embed_texts(texts, task_type="RETRIEVAL_DOCUMENT")
    print(f"  Embeddings: {len(embeddings)} vettori da {len(embeddings[0])} dims")

    # Insert
    print("  Inserimento in Supabase...")
    inserted = insert_chunks(chunks, embeddings, doc)
    print(f"  ✅ {inserted} righe inserite per '{doc_id}'")


if __name__ == "__main__":
    # Argomenti CLI
    args = sys.argv[1:]

    if "--list" in args:
        print("Documenti disponibili:")
        for d in DOCUMENTS:
            print(f"  {d['id']:35} — {d['title']}")
        sys.exit(0)

    # Filtra per doc_id se specificato
    docs_to_run = [d for d in DOCUMENTS if not args or d["id"] in args]
    if not docs_to_run:
        print(f"Documento non trovato. IDs disponibili: {[d['id'] for d in DOCUMENTS]}")
        sys.exit(1)

    print(f"Indicizzazione di {len(docs_to_run)} documento/i...")
    for doc in docs_to_run:
        try:
            process_document(doc)
        except Exception as e:
            print(f"  ❌ Errore su '{doc['id']}': {e}")
            import traceback; traceback.print_exc()

    print("\n\nINDICIZZAZIONE COMPLETATA ✅")
