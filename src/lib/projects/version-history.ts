// src/lib/projects/version-history.ts
// Snapshot di versione per ogni tool — max 20 versioni per tool per progetto

import { getActiveProjectId } from "./project-manager";

export interface VersionSnapshot {
  id:          string;          // UUID
  savedAt:     string;          // ISO timestamp
  label:       string;          // label automatica o utente
  tag?:        string;          // tag esplicito: "v1.0", "dopo audit DPO"
  note?:       string;          // nota libera utente
  status?:     "draft" | "finalized";
  data:        unknown;         // stato serializzato completo
  projectId:   string | null;
  // Compliance metadata
  isSubstantialModification?: boolean;
  substModificationBasis?:    string;
  sectionsSnapshot?:          Record<string, "empty" | "draft" | "done">;
  sectionsChanged?:           string[];   // vs versione precedente
  systemName?:                string;
}

export interface AppendVersionOptions {
  label?:                    string;
  tag?:                      string;
  note?:                     string;
  status?:                   "draft" | "finalized";
  isSubstantialModification?: boolean;
  substModificationBasis?:    string;
  sectionsSnapshot?:          Record<string, "empty" | "draft" | "done">;
  systemName?:                string;
}

const MAX_VERSIONS = 20;

function versionsKey(toolId: string): string {
  const pid = getActiveProjectId();
  return pid
    ? `aicomply_versions_p_${pid}_${toolId}`
    : `aicomply_versions_${toolId}`;
}

/** Calcola le sezioni cambiate rispetto alla versione precedente */
function computeSectionsChanged(
  current: Record<string, "empty" | "draft" | "done"> | undefined,
  previous: VersionSnapshot | undefined
): string[] {
  if (!current || !previous?.sectionsSnapshot) return [];
  return Object.entries(current)
    .filter(([k, v]) => previous.sectionsSnapshot![k] !== v)
    .map(([k]) => k);
}

/** Genera un tag automatico basato sul numero di versione */
function autoTag(versions: VersionSnapshot[], status: "draft" | "finalized" | undefined): string {
  const finalized = versions.filter(v => v.status === "finalized").length;
  if (status === "finalized") {
    return `v${finalized + 1}.0`;
  }
  const draftNum = versions.filter(v => v.status === "draft").length;
  return `bozza-${draftNum + 1}`;
}

/** Aggiunge uno snapshot per un tool. Mantiene max 20 versioni (FIFO). */
export function appendVersion(toolId: string, data: unknown, labelOrOptions: string | AppendVersionOptions = "Salvataggio automatico"): void {
  if (typeof window === "undefined") return;
  try {
    const key  = versionsKey(toolId);
    const raw  = localStorage.getItem(key);
    const versions: VersionSnapshot[] = raw ? JSON.parse(raw) : [];

    const opts: AppendVersionOptions = typeof labelOrOptions === "string"
      ? { label: labelOrOptions }
      : labelOrOptions;

    const sectionsChanged = computeSectionsChanged(opts.sectionsSnapshot, versions[0]);

    const snapshot: VersionSnapshot = {
      id:                      crypto.randomUUID(),
      savedAt:                 new Date().toISOString(),
      label:                   opts.label ?? "Salvataggio",
      tag:                     opts.tag ?? autoTag(versions, opts.status),
      note:                    opts.note,
      status:                  opts.status ?? "draft",
      data,
      projectId:               getActiveProjectId(),
      isSubstantialModification: opts.isSubstantialModification,
      substModificationBasis:  opts.substModificationBasis,
      sectionsSnapshot:        opts.sectionsSnapshot,
      sectionsChanged:         sectionsChanged.length > 0 ? sectionsChanged : undefined,
      systemName:              opts.systemName,
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

/** Aggiorna la nota di una versione specifica */
export function updateVersionNote(toolId: string, versionId: string, note: string): void {
  if (typeof window === "undefined") return;
  try {
    const key = versionsKey(toolId);
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const versions: VersionSnapshot[] = JSON.parse(raw);
    const updated = versions.map(v => v.id === versionId ? { ...v, note } : v);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch { /* ignore */ }
}

/** Aggiorna il tag di una versione */
export function updateVersionTag(toolId: string, versionId: string, tag: string): void {
  if (typeof window === "undefined") return;
  try {
    const key = versionsKey(toolId);
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const versions: VersionSnapshot[] = JSON.parse(raw);
    const updated = versions.map(v => v.id === versionId ? { ...v, tag } : v);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch { /* ignore */ }
}
