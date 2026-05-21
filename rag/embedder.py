"""
Vertex AI Embeddings via REST + JWT — text-embedding-004 (768 dims).
No google-cloud-aiplatform SDK needed.

Task types:
  RETRIEVAL_DOCUMENT — for indexing chunks
  RETRIEVAL_QUERY    — for query-time embedding
"""
import os
import json
import time
import urllib.request
import urllib.parse
from pathlib import Path
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
import base64

from config import VERTEX_PROJECT_ID, VERTEX_LOCATION, EMBED_MODEL, EMBED_BATCH_SIZE

# ─── Service account loading ──────────────────────────────────

def _load_service_account() -> dict:
    # Try file path first (preferred — avoids dotenv OOM on large JSON)
    sa_file = os.environ.get("VERTEX_SERVICE_ACCOUNT_FILE", "")
    if sa_file:
        sa_path = Path(sa_file) if Path(sa_file).is_absolute() else Path(__file__).parent / sa_file
        if sa_path.exists():
            return json.loads(sa_path.read_text())

    # Fallback: inline JSON string in env
    sa_json = os.environ.get("VERTEX_SERVICE_ACCOUNT_JSON", "")
    if sa_json:
        return json.loads(sa_json)

    raise ValueError(
        "No service account found. Set VERTEX_SERVICE_ACCOUNT_FILE "
        "(path to JSON file) or VERTEX_SERVICE_ACCOUNT_JSON in .env"
    )


# ─── JWT / OAuth2 token ───────────────────────────────────────

_token_cache: dict = {}


def _get_access_token() -> str:
    now = int(time.time())
    if _token_cache.get("expires", 0) > now + 30:
        return _token_cache["token"]

    sa = _load_service_account()

    # Build JWT
    header  = base64.urlsafe_b64encode(json.dumps({"alg": "RS256", "typ": "JWT"}).encode()).rstrip(b"=").decode()
    payload = base64.urlsafe_b64encode(json.dumps({
        "iss":   sa["client_email"],
        "sub":   sa["client_email"],
        "aud":   sa["token_uri"],
        "iat":   now,
        "exp":   now + 3600,
        "scope": "https://www.googleapis.com/auth/cloud-platform",
    }).encode()).rstrip(b"=").decode()

    signing_input = f"{header}.{payload}".encode()
    private_key = serialization.load_pem_private_key(sa["private_key"].encode(), password=None)
    signature = private_key.sign(signing_input, padding.PKCS1v15(), hashes.SHA256())
    sig_b64 = base64.urlsafe_b64encode(signature).rstrip(b"=").decode()
    jwt = f"{header}.{payload}.{sig_b64}"

    # Exchange JWT for access token
    data = urllib.parse.urlencode({
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
        "assertion":  jwt,
    }).encode()
    req = urllib.request.Request(sa["token_uri"], data=data,
                                  headers={"Content-Type": "application/x-www-form-urlencoded"})
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read())

    _token_cache["token"]   = result["access_token"]
    _token_cache["expires"] = now + result.get("expires_in", 3600)
    return _token_cache["token"]


# ─── Embedding ────────────────────────────────────────────────

def embed_chunks(
    texts: "list[str]",
    task_type: str = "RETRIEVAL_DOCUMENT",
    retry_on_rate_limit: bool = True,
) -> "list[list[float]]":
    """Embed texts in batches. Returns list of 768-dim vectors."""
    all_embeddings: "list[list[float]]" = []

    url = (
        f"https://{VERTEX_LOCATION}-aiplatform.googleapis.com/v1"
        f"/projects/{VERTEX_PROJECT_ID}/locations/{VERTEX_LOCATION}"
        f"/publishers/google/models/{EMBED_MODEL}:predict"
    )

    for batch_start in range(0, len(texts), EMBED_BATCH_SIZE):
        batch = texts[batch_start: batch_start + EMBED_BATCH_SIZE]
        body  = json.dumps({
            "instances": [{"content": t, "taskType": task_type} for t in batch]
        }).encode()

        attempt = 0
        while attempt < 4:
            token = _get_access_token()
            req = urllib.request.Request(url, data=body, headers={
                "Authorization": f"Bearer {token}",
                "Content-Type":  "application/json",
            })
            try:
                with urllib.request.urlopen(req) as resp:
                    result = json.loads(resp.read())
                vecs = [p["embeddings"]["values"] for p in result["predictions"]]
                all_embeddings.extend(vecs)
                break
            except urllib.error.HTTPError as e:
                err_body = e.read().decode()
                if e.code == 429 or "quota" in err_body.lower():
                    wait = 30 * (attempt + 1)
                    print(f"  [embedder] Rate limit — waiting {wait}s...")
                    time.sleep(wait)
                    attempt += 1
                else:
                    raise RuntimeError(f"Embedding failed ({e.code}): {err_body}")

        n = len(all_embeddings)
        if n % 100 == 0 and n > 0:
            print(f"  [embedder] {n}/{len(texts)} chunks embedded")

    return all_embeddings


def embed_query(query: str) -> "list[float]":
    return embed_chunks([query], task_type="RETRIEVAL_QUERY")[0]
