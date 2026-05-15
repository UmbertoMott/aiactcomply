import { sha256 } from "@/lib/crypto/hash";

export type EvidenceType = "adr" | "log" | "decision" | "audit" | "test" | "incident" | "monitoring";

export interface EvidenceRecord {
  id: string;
  type: EvidenceType;
  timestamp: string;
  validFrom: string;
  validTo: string | null;
  content: Record<string, unknown>;
  hash: string;
  previousHash: string;
  version: number;
  author: string;
  signature: string;
}

const STORE_KEY = "algorithmic_trust_evidence";

function getStore(): EvidenceRecord[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveStore(records: EvidenceRecord[]) {
  localStorage.setItem(STORE_KEY, JSON.stringify(records));
}

export async function appendEvidence(
  type: EvidenceType,
  content: Record<string, unknown>,
  author: string
): Promise<EvidenceRecord> {
  const store = getStore();
  const lastRecord = store[store.length - 1];
  const previousHash = lastRecord?.hash || "genesis";
  const version = store.filter((r) => r.type === type).length + 1;

  const payload = {
    type,
    content,
    previousHash,
    version,
    timestamp: new Date().toISOString(),
    author,
  };

  const hash = await sha256(JSON.stringify(payload));
  const record: EvidenceRecord = {
    id: crypto.randomUUID(),
    type,
    timestamp: payload.timestamp,
    validFrom: payload.timestamp,
    validTo: null,
    content,
    hash,
    previousHash,
    version,
    author,
    signature: `signed:${author}:${hash.slice(0, 12)}`,
  };

  store.push(record);
  saveStore(store);
  return record;
}

export function getEvidenceByType(type: EvidenceType): EvidenceRecord[] {
  return getStore().filter((r) => r.type === type);
}

export function getAllEvidence(): EvidenceRecord[] {
  return getStore();
}

export function verifyChain(): { valid: boolean; brokenAt?: number } {
  const store = getStore();
  for (let i = 1; i < store.length; i++) {
    if (store[i].previousHash !== store[i - 1].hash) {
      return { valid: false, brokenAt: i };
    }
  }
  return { valid: true };
}

export function getEvidenceCount(): Record<EvidenceType, number> {
  const store = getStore();
  const counts: Record<string, number> = {};
  for (const r of store) {
    counts[r.type] = (counts[r.type] || 0) + 1;
  }
  return counts as Record<EvidenceType, number>;
}
