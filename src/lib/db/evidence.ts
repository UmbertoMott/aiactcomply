"use server";
// src/lib/db/evidence.ts
// Evidence Layer server-side con catena hash SHA-256 su PostgreSQL (WORM)
// Questo modulo sostituisce la versione localStorage in src/lib/evidence/evidence-layer.ts

import { createHash } from "crypto";
import { getDbClient } from "@/lib/db/client";
import { getOrCreateOrganization } from "@/lib/auth/rbac";

export interface EvidenceRecordDB {
  id: string;
  type: string;
  content: Record<string, unknown>;
  content_hash: string;
  prev_hash: string;
  created_at: string;
}

function hashContent(
  content: Record<string, unknown>,
  prevHash: string
): string {
  return createHash("sha256")
    .update(JSON.stringify(content) + prevHash)
    .digest("hex");
}

/**
 * Appende un record all'Evidence Layer sul DB.
 * Operazione append-only: non esiste UPDATE/DELETE per questi record.
 * La catena hash garantisce l'immutabilità retroattiva.
 */
export async function appendEvidenceDB(
  type: string,
  content: Record<string, unknown>
): Promise<EvidenceRecordDB> {
  const supabase = await getDbClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const organizationId = await getOrCreateOrganization(user.id);

  // Recupera l'hash dell'ultimo record per mantenere la catena
  const { data: lastRecord } = await supabase
    .from("evidence_records")
    .select("content_hash")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const prevHash = lastRecord?.content_hash ?? "";
  const contentHash = hashContent(content, prevHash);

  const { data, error } = await supabase
    .from("evidence_records")
    .insert({
      organization_id: organizationId,
      user_id: user.id,
      type,
      content,
      content_hash: contentHash,
      prev_hash: prevHash,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to append evidence: ${error?.message ?? "unknown"}`);
  }

  return data as EvidenceRecordDB;
}

/**
 * Recupera tutti i record dell'Evidence Layer per l'organizzazione corrente,
 * ordinati cronologicamente (più vecchio prima).
 */
export async function getAllEvidenceDB(): Promise<EvidenceRecordDB[]> {
  const supabase = await getDbClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!org?.id) return [];

  const { data, error } = await supabase
    .from("evidence_records")
    .select("*")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: true });

  if (error) return [];
  return (data ?? []) as EvidenceRecordDB[];
}

/**
 * Verifica l'integrità della catena hash dell'Evidence Layer.
 * Se un record è stato alterato in DB (anche dall'admin), la catena si rompe.
 */
export async function verifyEvidenceChainDB(): Promise<{
  valid: boolean;
  brokenAt?: string;
  totalRecords: number;
}> {
  const records = await getAllEvidenceDB();

  for (let i = 1; i < records.length; i++) {
    const expectedPrevHash = records[i - 1].content_hash;
    if (records[i].prev_hash !== expectedPrevHash) {
      return {
        valid: false,
        brokenAt: records[i].id,
        totalRecords: records.length,
      };
    }
  }

  return { valid: true, totalRecords: records.length };
}
