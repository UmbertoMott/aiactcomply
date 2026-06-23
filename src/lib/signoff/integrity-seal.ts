// src/lib/signoff/integrity-seal.ts
// Bucket B — Integrity Seal (hash + timestamp, nessun firmatario).
// Art. 12 / 19 / 26(6): log generati automaticamente.
// Retention: ≥ 6 mesi (configurabile per finalità — Art. 19).

import { hashObject } from "./hash";
import { retentionDate } from "./signoff-types";
import type { IntegritySeal } from "./signoff-types";
import { appendSeal } from "./register";
import { getTrustService } from "./trust-service";

interface SealBatchOptions {
  toolKey:   string;
  scopeId:   string;
  logRef:    string;
  /** Batch di record da sigillare. */
  records:   unknown[];
  /** Mesi di retention (default 6 — Art. 19). */
  retentionMonths?: number;
}

function addMonths(iso: string, months: number): string {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

/**
 * Crea un IntegritySeal per un batch di record log finalizzato.
 * Nessun firmatario — solo contentHash + timestamp + retention.
 */
export async function sealLogBatch(
  opts: SealBatchOptions,
): Promise<{ ok: boolean; seal?: IntegritySeal; error?: string }> {
  const { toolKey, scopeId, logRef, records, retentionMonths = 6 } = opts;

  const contentHash = await hashObject(records);
  const sealedAt    = new Date().toISOString();
  const ts          = getTrustService();
  const qualifiedTimestamp = await ts.qualifiedTimestamp(contentHash).catch(() => null);

  const partial = {
    id:           crypto.randomUUID(),
    toolKey,
    scopeId,
    logRef,
    contentHash,
    sealedAt,
    qualifiedTimestamp: qualifiedTimestamp ?? undefined,
    retentionUntil: addMonths(sealedAt, retentionMonths),
  };

  return appendSeal(partial);
}

/**
 * Calcola il contentHash di un batch senza persistere.
 * Utile per preview nell'UI.
 */
export async function previewBatchHash(records: unknown[]): Promise<string> {
  return hashObject(records);
}

/** Mappa toolKey Bucket B → mesi di retention consigliati. */
export const BUCKET_B_RETENTION: Record<string, number> = {
  logvault_art12:   6,   // Art. 19 — minimo
  data_audit_art10: 24,  // durata utile dataset
  oversight_art14:  24,  // durata utile supervisione
};
