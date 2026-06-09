// src/lib/projects/version-history.ts
// Snapshot di versione per ogni tool — max 20 versioni per tool per progetto

import { getActiveProjectId } from "./project-manager";

export interface VersionSnapshot {
  id:         string;   // UUID
  savedAt:    string;   // ISO timestamp
  label:      string;   // "Versione automatica" | nome utente
  data:       unknown;  // lo stato serializzato
  projectId:  string | null;
}

const MAX_VERSIONS = 20;

function versionsKey(toolId: string): string {
  const pid = getActiveProjectId();
  return pid
    ? `aicomply_versions_p_${pid}_${toolId}`
    : `aicomply_versions_${toolId}`;
}

/** Aggiunge uno snapshot per un tool. Mantiene max 20 versioni (FIFO). */
export function appendVersion(toolId: string, data: unknown, label = "Salvataggio automatico"): void {
  if (typeof window === "undefined") return;
  try {
    const key  = versionsKey(toolId);
    const raw  = localStorage.getItem(key);
    const versions: VersionSnapshot[] = raw ? JSON.parse(raw) : [];

    const snapshot: VersionSnapshot = {
      id:        crypto.randomUUID(),
      savedAt:   new Date().toISOString(),
      label,
      data,
      projectId: getActiveProjectId(),
    };

    const updated = [snapshot, ...versions].slice(0, MAX_VERSIONS);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {
    // quota errors — ignore
  }
}

/** Legge l'elenco snapshot di un tool (dal più recente) */
export function listVersions(toolId: string): VersionSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const key = versionsKey(toolId);
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as VersionSnapshot[]) : [];
  } catch {
    return [];
  }
}

/** Cancella tutte le versioni di un tool */
export function clearVersions(toolId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(versionsKey(toolId));
}
