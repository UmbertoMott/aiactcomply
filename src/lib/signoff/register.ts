// src/lib/signoff/register.ts
// Registro append-only con hash-chain per sign-off (Bucket A) e integrity seal (Bucket B).
// Persistenza durevole: Supabase (primary) + localStorage (cache working copy).
// Art. 18: conservazione 10 anni (Bucket A). Art. 19: ≥ 6 mesi (Bucket B).

"use server";

import { canonicalize, hashObject } from "./hash";
import type { SignOffRecord, IntegritySeal } from "./signoff-types";
import { SignOffRecordSchema, IntegritySealSchema } from "./signoff-types";
import { getDbClient } from "@/lib/db/client";
import { getOrCreateOrganization } from "@/lib/auth/rbac";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getOrgId(): Promise<string | null> {
  try {
    const supabase = await getDbClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    return await getOrCreateOrganization(user.id);
  } catch {
    return null;
  }
}

/**
 * Calcola l'hash del record (senza il campo recordHash stesso).
 * recordHash = SHA-256(canonical(record senza recordHash) + prevRecordHash)
 */
async function computeRecordHash(
  record: Omit<SignOffRecord, "recordHash">,
): Promise<string> {
  const payload = canonicalize(record);
  return hashObject(payload + (record.prevRecordHash ?? "genesis"));
}

async function computeSealHash(
  seal: Omit<IntegritySeal, "sealHash">,
): Promise<string> {
  return hashObject(canonicalize(seal) + (seal.prevSealHash ?? "genesis"));
}

// ─── Bucket A — Sign-off ─────────────────────────────────────────────────────

/**
 * Aggiunge un SignOffRecord al registro.
 * Prima recupera l'ultimo recordHash per la chain, poi inserisce in Supabase.
 */
export async function appendSignOff(
  record: Omit<SignOffRecord, "prevRecordHash" | "recordHash">,
): Promise<{ ok: boolean; record?: SignOffRecord; error?: string }> {
  try {
    const supabase = await getDbClient();
    const orgId = await getOrgId();
    if (!orgId) return { ok: false, error: "not_authenticated" };

    // Recupera l'hash dell'ultimo record per la chain
    const { data: last } = await supabase
      .from("sign_off_register")
      .select("record_hash")
      .eq("organization_id", orgId)
      .eq("scope_id", record.scopeId)
      .order("signed_at", { ascending: false })
      .limit(1)
      .single();

    const prevRecordHash = last?.record_hash ?? null;

    const withPrev = { ...record, prevRecordHash };
    const recordHash = await computeRecordHash(withPrev);
    const full: SignOffRecord = { ...withPrev, recordHash };

    // Validazione Zod
    SignOffRecordSchema.parse(full);

    const { error } = await supabase.from("sign_off_register").insert({
      id:               full.id,
      organization_id:  orgId,
      tool_key:         full.toolKey,
      scope_id:         full.scopeId,
      ai_system_id:     full.aiSystemId ?? null,
      document_version: full.documentVersion,
      content_hash:     full.contentHash,
      signer:           full.signer,
      signed_at:        full.signedAt,
      signature_level:  full.signatureLevel,
      qualified_timestamp: full.qualifiedTimestamp ?? null,
      provider_ref:     full.providerRef ?? null,
      legal_ref:        full.legalRef,
      retention_until:  full.retentionUntil,
      prev_record_hash: full.prevRecordHash,
      record_hash:      full.recordHash,
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true, record: full };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/**
 * Aggiunge un IntegritySeal al registro dei sigilli.
 */
export async function appendSeal(
  seal: Omit<IntegritySeal, "prevSealHash" | "sealHash">,
): Promise<{ ok: boolean; seal?: IntegritySeal; error?: string }> {
  try {
    const supabase = await getDbClient();
    const orgId = await getOrgId();
    if (!orgId) return { ok: false, error: "not_authenticated" };

    const { data: last } = await supabase
      .from("integrity_seals")
      .select("seal_hash")
      .eq("organization_id", orgId)
      .eq("scope_id", seal.scopeId)
      .order("sealed_at", { ascending: false })
      .limit(1)
      .single();

    const prevSealHash = last?.seal_hash ?? null;
    const withPrev = { ...seal, prevSealHash };
    const sealHash = await computeSealHash(withPrev);
    const full: IntegritySeal = { ...withPrev, sealHash };

    IntegritySealSchema.parse(full);

    const { error } = await supabase.from("integrity_seals").insert({
      id:                  full.id,
      organization_id:     orgId,
      tool_key:            full.toolKey,
      scope_id:            full.scopeId,
      log_ref:             full.logRef,
      content_hash:        full.contentHash,
      sealed_at:           full.sealedAt,
      qualified_timestamp: full.qualifiedTimestamp ?? null,
      retention_until:     full.retentionUntil,
      prev_seal_hash:      full.prevSealHash,
      seal_hash:           full.sealHash,
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true, seal: full };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// ─── Query ───────────────────────────────────────────────────────────────────

export async function getSignOffRegister(
  scopeId: string,
  toolKey?: string,
  limit = 50,
): Promise<SignOffRecord[]> {
  try {
    const supabase = await getDbClient();
    const orgId = await getOrgId();
    if (!orgId) return [];

    let q = supabase
      .from("sign_off_register")
      .select("*")
      .eq("organization_id", orgId)
      .eq("scope_id", scopeId)
      .order("signed_at", { ascending: false })
      .limit(limit);

    if (toolKey) q = q.eq("tool_key", toolKey);

    const { data, error } = await q;
    if (error || !data) return [];

    return data.map(r => ({
      id:              r.id,
      toolKey:         r.tool_key,
      scopeId:         r.scope_id,
      aiSystemId:      r.ai_system_id ?? undefined,
      documentVersion: r.document_version,
      contentHash:     r.content_hash,
      signer:          r.signer,
      signedAt:        r.signed_at,
      signatureLevel:  r.signature_level,
      qualifiedTimestamp: r.qualified_timestamp ?? undefined,
      providerRef:     r.provider_ref ?? undefined,
      legalRef:        r.legal_ref,
      retentionUntil:  r.retention_until,
      prevRecordHash:  r.prev_record_hash,
      recordHash:      r.record_hash,
    })) as SignOffRecord[];
  } catch {
    return [];
  }
}

export async function getIntegritySealRegister(
  scopeId: string,
  toolKey?: string,
  limit = 50,
): Promise<IntegritySeal[]> {
  try {
    const supabase = await getDbClient();
    const orgId = await getOrgId();
    if (!orgId) return [];

    let q = supabase
      .from("integrity_seals")
      .select("*")
      .eq("organization_id", orgId)
      .eq("scope_id", scopeId)
      .order("sealed_at", { ascending: false })
      .limit(limit);

    if (toolKey) q = q.eq("tool_key", toolKey);

    const { data, error } = await q;
    if (error || !data) return [];

    return data.map(r => ({
      id:           r.id,
      toolKey:      r.tool_key,
      scopeId:      r.scope_id,
      logRef:       r.log_ref,
      contentHash:  r.content_hash,
      sealedAt:     r.sealed_at,
      qualifiedTimestamp: r.qualified_timestamp ?? undefined,
      retentionUntil: r.retention_until,
      prevSealHash: r.prev_seal_hash,
      sealHash:     r.seal_hash,
    })) as IntegritySeal[];
  } catch {
    return [];
  }
}

// ─── Verifica integrità ───────────────────────────────────────────────────────

export interface ChainVerifyResult {
  ok: boolean;
  checked: number;
  firstViolationAt?: string;  // ISO signedAt/sealedAt del record manomesso
  violationId?: string;
  details: string;
}

/**
 * Ricomputa la hash-chain dal basso e rileva qualsiasi manomissione.
 * O(n) sul numero di record — usare su richiesta esplicita, non in hot path.
 */
export async function verifySignOffChain(scopeId: string): Promise<ChainVerifyResult> {
  const records = await getSignOffRegister(scopeId, undefined, 1000);
  if (records.length === 0) return { ok: true, checked: 0, details: "Nessun record nel registro." };

  // Ordina dal più vecchio
  const ordered = [...records].sort((a, b) => a.signedAt.localeCompare(b.signedAt));

  let prevHash: string | null = null;
  for (const rec of ordered) {
    const { recordHash, ...withoutHash } = rec;
    const computed = await computeRecordHash({ ...withoutHash, prevRecordHash: prevHash });
    if (computed !== recordHash) {
      return {
        ok: false,
        checked: ordered.indexOf(rec),
        firstViolationAt: rec.signedAt,
        violationId: rec.id,
        details: `Hash non corrispondente sul record ${rec.id} (${rec.toolKey}, ${rec.signedAt}).`,
      };
    }
    prevHash = recordHash;
  }

  return { ok: true, checked: ordered.length, details: `Catena intatta — ${ordered.length} record verificati.` };
}

export async function verifySealChain(scopeId: string): Promise<ChainVerifyResult> {
  const seals = await getIntegritySealRegister(scopeId, undefined, 1000);
  if (seals.length === 0) return { ok: true, checked: 0, details: "Nessun sigillo nel registro." };

  const ordered = [...seals].sort((a, b) => a.sealedAt.localeCompare(b.sealedAt));

  let prevHash: string | null = null;
  for (const seal of ordered) {
    const { sealHash, ...withoutHash } = seal;
    const computed = await computeSealHash({ ...withoutHash, prevSealHash: prevHash });
    if (computed !== sealHash) {
      return {
        ok: false,
        checked: ordered.indexOf(seal),
        firstViolationAt: seal.sealedAt,
        violationId: seal.id,
        details: `Hash non corrispondente sul sigillo ${seal.id} (${seal.toolKey}, ${seal.sealedAt}).`,
      };
    }
    prevHash = sealHash;
  }

  return { ok: true, checked: ordered.length, details: `Catena sigilli intatta — ${ordered.length} sigilli verificati.` };
}
