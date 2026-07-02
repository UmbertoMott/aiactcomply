"use server";
// src/app/actions/toolState.ts
// Bridge localStorage → Supabase per tutti i tool di compliance
//
// Uso:
//   import { saveToolState, loadToolState } from "@/app/actions/toolState";
//   await saveToolState("classifier", { ...data });
//   const data = await loadToolState("classifier");
//
// Il client usa localStorage come primary store + chiama questi per sync.
// Se Supabase non è disponibile (env mancante) ritorna null senza errori.

import { getDbClient } from "@/lib/db/client";
import { getOrCreateOrganization } from "@/lib/auth/rbac";

export type ToolId =
  | "classifier" | "riskManager" | "dataAudit" | "docugen" | "logvault"
  | "transparency" | "oversight" | "resilience" | "qms" | "conformity"
  | "fria" | "gpai" | "xai" | "dpia" | "deployer" | "l132" | "eudb"
  | "authorizedRep" | "providerTransition" | "art50" | "triage"
  | "prohibited" | "literacy" | "postMarket" | "incident"
  | string; // permette tool_id custom

/**
 * Persiste lo stato di un tool su Supabase (upsert).
 * Chiama dal client dopo ogni writeToStorage().
 * Non lancia mai errori — failure silente per non bloccare la UI.
 */
export async function saveToolState(
  toolId: ToolId,
  stateData: unknown,
  meta?: { systemName?: string; riskTier?: string }
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await getDbClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "not_authenticated" };

    const orgId = await getOrCreateOrganization(user.id);

    const { error } = await supabase
      .from("tool_states")
      .upsert(
        {
          organization_id: orgId,
          user_id: user.id,
          tool_id: toolId,
          state_data: stateData,
          saved_by: user.id,
          system_name: meta?.systemName ?? null,
          risk_tier: meta?.riskTier ?? null,
        },
        { onConflict: "organization_id,tool_id" }
      );

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/**
 * Carica lo stato di un tool da Supabase.
 * Usato al mount del tool per sincronizzare localStorage con il DB.
 * Ritorna null se non trovato o se Supabase non disponibile.
 */
export async function loadToolState<T = unknown>(
  toolId: ToolId
): Promise<{ data: T | null; savedAt: string | null }> {
  try {
    const supabase = await getDbClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, savedAt: null };

    const orgId = await getOrCreateOrganization(user.id);
    if (!orgId) return { data: null, savedAt: null };

    const { data, error } = await supabase
      .from("tool_states")
      .select("state_data, saved_at")
      .eq("organization_id", orgId)
      .eq("tool_id", toolId)
      .single();

    if (error || !data) return { data: null, savedAt: null };
    return { data: data.state_data as T, savedAt: data.saved_at as string };
  } catch {
    return { data: null, savedAt: null };
  }
}

/**
 * Carica tutti gli stati dei tool per l'organizzazione corrente.
 * Usato da aggregateDossier() per sostituire readFromStorage globale.
 */
export async function loadAllToolStates(): Promise<Record<string, unknown>> {
  try {
    const supabase = await getDbClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return {};

    const orgId = await getOrCreateOrganization(user.id);
    if (!orgId) return {};

    const { data, error } = await supabase
      .from("tool_states")
      .select("tool_id, state_data")
      .eq("organization_id", orgId);

    if (error || !data) return {};
    return Object.fromEntries(data.map((r) => [r.tool_id, r.state_data]));
  } catch {
    return {};
  }
}

/**
 * Salva una versione immutabile del documento (Art. 43(4)).
 * Chiamato da saveToDossier(asFinalized=true) nei tool.
 */
export async function saveDocumentVersion(
  toolId: ToolId,
  stateData: unknown,
  options: {
    versionTag: string;
    label: string;
    note?: string;
    status: "draft" | "finalized";
    sectionsSnapshot?: Record<string, string>;
    sectionsChanged?: string[];
    systemName?: string;
    riskTier?: string;
    isSubstantialModification?: boolean;
    substModificationBasis?: string;
    contentHash?: string;
    previousVersionId?: string;
  }
): Promise<{ ok: boolean; versionId?: string; error?: string }> {
  try {
    const supabase = await getDbClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "not_authenticated" };

    const orgId = await getOrCreateOrganization(user.id);

    const { data, error } = await supabase
      .from("document_versions")
      .insert({
        organization_id: orgId,
        user_id: user.id,
        tool_id: toolId,
        version_tag: options.versionTag,
        label: options.label,
        note: options.note ?? null,
        status: options.status,
        state_data: stateData,
        sections_snapshot: options.sectionsSnapshot ?? null,
        sections_changed: options.sectionsChanged ?? null,
        system_name: options.systemName ?? null,
        risk_tier: options.riskTier ?? null,
        is_substantial_modification: options.isSubstantialModification ?? false,
        subst_modification_basis: options.substModificationBasis ?? null,
        content_hash: options.contentHash ?? null,
        previous_version_id: options.previousVersionId ?? null,
      })
      .select("id")
      .single();

    if (error) return { ok: false, error: error.message };
    return { ok: true, versionId: data?.id };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/**
 * Recupera la lista delle versioni di un tool (dal più recente).
 * Usato da VersionHistoryPanel come sorgente Supabase.
 */
export async function listDocumentVersions(toolId: ToolId, limit = 20) {
  try {
    const supabase = await getDbClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const orgId = await getOrCreateOrganization(user.id);
    if (!orgId) return [];

    const { data, error } = await supabase
      .from("document_versions")
      .select("*")
      .eq("organization_id", orgId)
      .eq("tool_id", toolId)
      .order("saved_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

/**
 * Salva un hash_anchor per il LogVault (Art. 12 — tamper-evident).
 * Chiamato dallo scheduler periodico (ogni settimana/mese).
 */
export async function saveHashAnchor(
  chainHeadHash: string,
  logCount: number,
  anchorDestination: string,
  method: "email" | "rfc3161" | "external_repo" | "manual" = "email"
): Promise<{ ok: boolean; anchorId?: string }> {
  try {
    const supabase = await getDbClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false };

    const orgId = await getOrCreateOrganization(user.id);
    if (!orgId) return { ok: false };

    const { data, error } = await supabase
      .from("hash_anchors")
      .insert({
        organization_id: orgId,
        chain_head_hash: chainHeadHash,
        log_count: logCount,
        anchor_method: method,
        anchor_destination: anchorDestination,
      })
      .select("id")
      .single();

    if (error) return { ok: false };
    return { ok: true, anchorId: data?.id };
  } catch {
    return { ok: false };
  }
}
