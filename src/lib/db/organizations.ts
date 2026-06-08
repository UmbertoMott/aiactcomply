"use server";
// src/lib/db/organizations.ts
// Gestione organizzazioni e Trust Token pubblico

import { getDbClient, getDbAdminClient } from "@/lib/db/client";
import { getOrCreateOrganization } from "@/lib/auth/rbac";

export interface TrustSummary {
  organizationName: string;
  trustToken: string;
  evidenceCount: number;
  lastUpdated: string;
  publicUrl: string;
}

/**
 * Recupera il trust_token dell'organizzazione dell'utente corrente.
 * Il token è un UUID generato da Supabase e mai esposto nel codice.
 */
export async function getTrustToken(): Promise<string> {
  const supabase = await getDbClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await getOrCreateOrganization(user.id);

  const { data } = await supabase
    .from("organizations")
    .select("trust_token")
    .eq("owner_id", user.id)
    .single();

  return (data?.trust_token as string) ?? "";
}

/**
 * Recupera il profilo pubblico di un'organizzazione tramite trust_token.
 * Usa il client admin per bypassare RLS (pagina pubblica, no auth richiesta).
 * Restituisce null se il token non esiste.
 */
export async function getTrustSummaryByToken(
  token: string
): Promise<TrustSummary | null> {
  // Validazione UUID v4 per prevenire injection
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(token)) return null;

  const admin = await getDbAdminClient();

  const { data: org } = await admin
    .from("organizations")
    .select("id, name, trust_token, updated_at")
    .eq("trust_token", token)
    .single();

  if (!org) return null;

  // Conta le prove di conformità registrate
  const { count } = await admin
    .from("evidence_records")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", org.id);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://aicomply.vercel.app";

  return {
    organizationName: org.name as string,
    trustToken: org.trust_token as string,
    evidenceCount: count ?? 0,
    lastUpdated: org.updated_at as string,
    publicUrl: `${appUrl}/trust/${token}`,
  };
}
