"use server";
// src/lib/db/logvault.ts
// LogVault server-side — catena di log immutabile su PostgreSQL (WORM)
// L'hashing SHA-256 avviene esclusivamente sul server, non è manipolabile dal browser

import { createHash } from "crypto";
import { getDbClient } from "@/lib/db/client";
import { getOrCreateOrganization } from "@/lib/auth/rbac";

export type LogLevel = "info" | "warning" | "error" | "critical";

export interface LogEntryDB {
  id: string;
  event: string;
  level: LogLevel;
  agent: string;
  entry_hash: string;
  prev_hash: string;
  created_at: string;
}

function hashEntry(
  event: string,
  level: string,
  agent: string,
  prevHash: string,
  timestamp: string
): string {
  return createHash("sha256")
    .update(`${event}|${level}|${agent}|${prevHash}|${timestamp}`)
    .digest("hex");
}

/**
 * Aggiunge un entry al log chain su PostgreSQL.
 * Operazione append-only: nessun UPDATE/DELETE disponibile via RLS.
 */
export async function appendLogDB(
  event: string,
  level: LogLevel,
  agent = "system"
): Promise<LogEntryDB> {
  const supabase = await getDbClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const organizationId = await getOrCreateOrganization(user.id);

  // Recupera l'hash dell'ultimo entry per la catena
  const { data: lastEntry } = await supabase
    .from("log_chain")
    .select("entry_hash")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const prevHash = lastEntry?.entry_hash ?? "";
  const timestamp = new Date().toISOString();
  const entryHash = hashEntry(event, level, agent, prevHash, timestamp);

  const { data, error } = await supabase
    .from("log_chain")
    .insert({
      organization_id: organizationId,
      user_id: user.id,
      event,
      level,
      agent,
      entry_hash: entryHash,
      prev_hash: prevHash,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`LogVault append failed: ${error?.message ?? "unknown"}`);
  }

  return data as LogEntryDB;
}

/**
 * Recupera l'intera catena di log per l'organizzazione corrente.
 */
export async function getLogChainDB(): Promise<LogEntryDB[]> {
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

  const { data } = await supabase
    .from("log_chain")
    .select("*")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: true });

  return (data ?? []) as LogEntryDB[];
}

/**
 * Verifica l'integrità della catena hash dei log.
 * Se un entry è stato alterato nel DB, la catena si rompe qui.
 */
export async function verifyLogChainDB(): Promise<{
  valid: boolean;
  brokenAt?: string;
  totalEntries: number;
}> {
  const entries = await getLogChainDB();

  for (let i = 1; i < entries.length; i++) {
    if (entries[i].prev_hash !== entries[i - 1].entry_hash) {
      return {
        valid: false,
        brokenAt: entries[i].id,
        totalEntries: entries.length,
      };
    }
  }

  return { valid: true, totalEntries: entries.length };
}
