"use server";
// src/lib/auth/rbac.ts
// Controlli di autenticazione e autorizzazione server-side
// Usare in Server Actions e API Routes — MAI nel browser

import { getDbClient } from "@/lib/db/client";
import { redirect } from "next/navigation";

export type AppRole = "provider" | "deployer" | "importer" | "distributor";

export interface ServerUser {
  id: string;
  email: string;
  role: AppRole | null;
  organizationId: string | null;
}

/**
 * Recupera l'utente autenticato lato server leggendo i cookie di sessione.
 * Se non autenticato, redirige a /login.
 *
 * @throws redirect a /login se non autenticato
 */
export async function getServerUser(): Promise<ServerUser> {
  const supabase = await getDbClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  // Legge ruolo da DB (non da user_metadata per evitare spoofing client-side)
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role, organization_id")
    .eq("user_id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? "",
    role: (roleRow?.role as AppRole) ?? null,
    organizationId: roleRow?.organization_id ?? null,
  };
}

/**
 * Verifica che l'utente abbia uno dei ruoli richiesti.
 *
 * @param allowedRoles - ruoli autorizzati
 * @param options.throwOnUnauthorized - se true, redirige a /dashboard?error=unauthorized
 *   invece di lanciare un'eccezione (utile nelle Server Actions invocate da form)
 */
export async function requireRole(
  allowedRoles: AppRole[],
  options: { throwOnUnauthorized?: boolean } = {}
): Promise<ServerUser> {
  const user = await getServerUser();

  if (!user.role || !allowedRoles.includes(user.role)) {
    if (options.throwOnUnauthorized) {
      redirect("/dashboard?error=unauthorized");
    }
    throw new Error("403: Insufficient role");
  }

  return user;
}

/**
 * Recupera o crea l'organizzazione per l'utente corrente.
 * Ogni utente ha esattamente una organizzazione (1:1 per ora).
 */
export async function getOrCreateOrganization(userId: string): Promise<string> {
  const supabase = await getDbClient();

  // Prima controlla se esiste
  const { data: existing } = await supabase
    .from("organizations")
    .select("id")
    .eq("owner_id", userId)
    .single();

  if (existing?.id) return existing.id;

  // Crea la prima organizzazione dell'utente
  // Prende il nome dall'email o dal metadata
  const { data: userData } = await supabase.auth.getUser();
  const company =
    (userData.user?.user_metadata as { company?: string } | undefined)?.company ??
    userData.user?.email?.split("@")[1] ??
    "My Organization";

  const { data: newOrg, error } = await supabase
    .from("organizations")
    .insert({ owner_id: userId, name: company })
    .select("id")
    .single();

  if (error || !newOrg) {
    throw new Error(`Failed to create organization: ${error?.message ?? "unknown"}`);
  }

  return newOrg.id;
}
