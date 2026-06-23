// src/lib/signoff/hash.ts
// Hashing deterministico per sign-off e integrity seal.

import { sha256 } from "@/lib/crypto/hash";

export { sha256 };

/**
 * Serializza un oggetto in JSON canonico (chiavi ordinate ricorsivamente, UTF-8).
 * Due oggetti con gli stessi valori producono sempre la stessa stringa.
 */
export function canonicalize(obj: unknown): string {
  return JSON.stringify(sortKeys(obj));
}

function sortKeys(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sortKeys);
  const sorted: Record<string, unknown> = {};
  for (const k of Object.keys(value as object).sort()) {
    sorted[k] = sortKeys((value as Record<string, unknown>)[k]);
  }
  return sorted;
}

/**
 * SHA-256 hex di un oggetto qualsiasi (via JSON canonico).
 */
export async function hashObject(obj: unknown): Promise<string> {
  return sha256(canonicalize(obj));
}
