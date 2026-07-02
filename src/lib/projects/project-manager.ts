// src/lib/projects/project-manager.ts
// Multi-project support — scoped localStorage storage per AI system

export interface AIProject {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

const PROJECTS_KEY     = "aicomply_projects";
const ACTIVE_KEY       = "aicomply_active_project_id";

/** Evento emesso quando cambia il progetto attivo (per aggiornare la UI live). */
export const PROJECT_CHANGED_EVENT = "aicomply:projectchanged";

function emitProjectChanged(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(PROJECT_CHANGED_EVENT));
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

/** Restituisce tutti i progetti (ordinati per updatedAt desc) */
export function listProjects(): AIProject[] {
  const projects = safeRead<AIProject[]>(PROJECTS_KEY, []);
  return [...projects].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

/** Crea un nuovo progetto e lo rende attivo */
export function createProject(name: string, description?: string): AIProject {
  const project: AIProject = {
    id:          crypto.randomUUID(),
    name:        name.trim(),
    description: description?.trim(),
    createdAt:   new Date().toISOString(),
    updatedAt:   new Date().toISOString(),
  };

  const existing = safeRead<AIProject[]>(PROJECTS_KEY, []);
  safeWrite(PROJECTS_KEY, [...existing, project]);
  setActiveProject(project.id);
  return project;
}

/** Aggiorna il nome/descrizione di un progetto esistente */
export function updateProject(id: string, patch: Partial<Pick<AIProject, "name" | "description">>): void {
  const projects = safeRead<AIProject[]>(PROJECTS_KEY, []);
  const updated = projects.map((p) =>
    p.id === id
      ? { ...p, ...patch, name: patch.name?.trim() ?? p.name, updatedAt: new Date().toISOString() }
      : p
  );
  safeWrite(PROJECTS_KEY, updated);
}

/** Elimina un progetto e i suoi dati scoped */
export function deleteProject(id: string): void {
  const projects = safeRead<AIProject[]>(PROJECTS_KEY, []);
  safeWrite(PROJECTS_KEY, projects.filter((p) => p.id !== id));

  // Se era il progetto attivo, rimuovi la selezione
  if (getActiveProjectId() === id) {
    if (typeof window !== "undefined") localStorage.removeItem(ACTIVE_KEY);
  }

  // Pulisci i dati scoped di questo progetto
  if (typeof window !== "undefined") {
    const prefix = `aicomply_p_${id}_`;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(prefix)) keysToRemove.push(k);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  }
}

// ── Active project ────────────────────────────────────────────────────────────

/** Restituisce l'ID del progetto attivo, o null se nessuno */
export function getActiveProjectId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_KEY) ?? null;
}

/** Restituisce il progetto attivo completo, o null */
export function getActiveProject(): AIProject | null {
  const id = getActiveProjectId();
  if (!id) return null;
  const projects = safeRead<AIProject[]>(PROJECTS_KEY, []);
  return projects.find((p) => p.id === id) ?? null;
}

/** Imposta il progetto attivo */
export function setActiveProject(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_KEY, id);
  // Aggiorna updatedAt
  const projects = safeRead<AIProject[]>(PROJECTS_KEY, []);
  safeWrite(
    PROJECTS_KEY,
    projects.map((p) =>
      p.id === id ? { ...p, updatedAt: new Date().toISOString() } : p
    )
  );
  emitProjectChanged();
}

/** Deseleziona il progetto attivo (modalità "nessun progetto") */
export function clearActiveProject(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACTIVE_KEY);
  emitProjectChanged();
}
