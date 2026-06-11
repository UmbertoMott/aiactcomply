// Vertex AI REST client for embeddings + generation
// Uses service account JWT auth — no SDK dependency needed.
// Set VERTEX_SERVICE_ACCOUNT_JSON (full JSON string) in env.
//
// Self-hosted mode: set AICOMPLY_MODE=self-hosted to use Ollama instead.
// See SELF_HOSTING.md for setup instructions.

import { createSign } from "crypto";

const PROJECT   = process.env.VERTEX_PROJECT_ID ?? "";
const LOCATION  = process.env.VERTEX_LOCATION ?? "us-central1";
const SA_JSON   = process.env.VERTEX_SERVICE_ACCOUNT_JSON ?? "";

const EMBED_MODEL      = "text-embedding-004";
const GENERATION_MODEL = "gemini-2.0-flash-001";

// ─── Ollama fallback (self-hosted mode) ──────────────────────────────────────

const AICOMPLY_MODE      = process.env.AICOMPLY_MODE ?? "cloud";
const OLLAMA_BASE_URL    = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const OLLAMA_LLM_MODEL   = process.env.OLLAMA_LLM_MODEL ?? "llama3.1:8b";
const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text";

/** Embed a single text via Ollama (self-hosted). */
async function embedWithOllama(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: OLLAMA_EMBED_MODEL, prompt: text }),
  });
  if (!res.ok) throw new Error(`Ollama embed error (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as { embedding: number[] };
  return data.embedding;
}

/** Generate text via Ollama (self-hosted). */
async function generateWithOllama(
  prompt: string,
  temperature = 0.1,
  maxTokens = 2048,
): Promise<string> {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_LLM_MODEL,
      prompt,
      stream: false,
      options: { temperature, num_predict: maxTokens },
    }),
  });
  if (!res.ok) throw new Error(`Ollama generate error (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as { response: string };
  return data.response;
}

// ─── JWT / OAuth2 ────────────────────────────────────────────

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri: string;
}

let _tokenCache: { token: string; expires: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (_tokenCache && Date.now() < _tokenCache.expires - 30_000) {
    return _tokenCache.token;
  }

  if (!SA_JSON) {
    throw new Error(
      "VERTEX_SERVICE_ACCOUNT_JSON not set. " +
      "Add the full service account JSON as a single-line env var."
    );
  }

  // Vercel può iniettare newline letterali nel valore — li normalizziamo prima del parse
  const saRaw = SA_JSON.replace(/\n/g, "\\n");
  const sa: ServiceAccount = JSON.parse(saRaw);
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600;

  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    sub: sa.client_email,
    aud: sa.token_uri,
    iat: now,
    exp,
    scope: "https://www.googleapis.com/auth/cloud-platform",
  })).toString("base64url");

  const sign = createSign("RSA-SHA256");
  sign.update(`${header}.${payload}`);
  const sig = sign.sign(sa.private_key, "base64url");
  const jwt = `${header}.${payload}.${sig}`;

  const res = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    throw new Error(`Vertex AI auth failed: ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  _tokenCache = { token: data.access_token, expires: Date.now() + data.expires_in * 1000 };
  return _tokenCache.token;
}

// ─── Embeddings ──────────────────────────────────────────────

/**
 * Embed texts using Gemini text-embedding-004 via Vertex AI REST.
 * taskType: "RETRIEVAL_DOCUMENT" for indexing, "RETRIEVAL_QUERY" for queries.
 */
export async function embedTexts(
  texts: string[],
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" = "RETRIEVAL_QUERY"
): Promise<number[][]> {
  // Self-hosted: use Ollama (taskType is ignored — nomic-embed-text handles both)
  if (AICOMPLY_MODE === "self-hosted") {
    return Promise.all(texts.map(t => embedWithOllama(t)));
  }

  const token = await getAccessToken();
  const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/${LOCATION}/publishers/google/models/${EMBED_MODEL}:predict`;

  const body = {
    instances: texts.map((text) => ({ content: text, taskType })),
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Vertex embedding failed (${res.status}): ${await res.text()}`);
  }

  const data = (await res.json()) as {
    predictions: Array<{ embeddings: { values: number[] } }>;
  };

  return data.predictions.map((p) => p.embeddings.values);
}

/**
 * Embed a single query string.
 */
export async function embedQuery(query: string): Promise<number[]> {
  if (AICOMPLY_MODE === "self-hosted") {
    return embedWithOllama(query);
  }
  const vecs = await embedTexts([query], "RETRIEVAL_QUERY");
  return vecs[0];
}

// ─── Generation ──────────────────────────────────────────────

export interface GenerationOptions {
  temperature?: number;
  maxOutputTokens?: number;
}

/**
 * Call Gemini 2.0 Flash for text generation via Vertex AI REST.
 */
export async function generateText(
  prompt: string,
  opts: GenerationOptions = {}
): Promise<string> {
  // Self-hosted: use Ollama
  if (AICOMPLY_MODE === "self-hosted") {
    return generateWithOllama(
      prompt,
      opts.temperature ?? 0.1,
      opts.maxOutputTokens ?? 2048,
    );
  }

  const token = await getAccessToken();
  const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/${LOCATION}/publishers/google/models/${GENERATION_MODEL}:generateContent`;

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature:     opts.temperature ?? 0.1,
      maxOutputTokens: opts.maxOutputTokens ?? 2048,
      topP: 0.95,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Vertex generation failed (${res.status}): ${await res.text()}`);
  }

  const data = (await res.json()) as {
    candidates: Array<{
      content: { parts: Array<{ text: string }> };
    }>;
  };

  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

export const MODEL_NAME = GENERATION_MODEL;
