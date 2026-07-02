const ACTIVE_SYSTEM_KEY = "aicomply_active_system_id";

function getActiveSystemId(): string {
  if (typeof window === "undefined") return "default";
  return localStorage.getItem(ACTIVE_SYSTEM_KEY) ?? "default";
}

/** Builds the scoped localStorage key — consistent with useScopedStorage("activity_queue") */
function getScopedKey(scopeId: string): string {
  return `aicomply_activity_queue_v2_[${scopeId}]`;
}

export interface QueuedActivity {
  id: string;            // dedup key: `${scopeId}:${tool}:${source}`
  tool: string;          // e.g. "fria", "dpia", "l132"
  label: string;         // e.g. "Completa la FRIA per i minori"
  href: string;          // e.g. "/dashboard/tools/fria"
  source: string;        // origin, e.g. "Rischio penale — tutela minori (Art. 8 L.132/2025)"
  status: "queued" | "done";
  createdAt: string;
}

function readQueue(scopeId: string): QueuedActivity[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(getScopedKey(scopeId));
    return raw ? (JSON.parse(raw) as QueuedActivity[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(scopeId: string, items: QueuedActivity[]): void {
  try {
    if (typeof window === "undefined") return;
    const key = getScopedKey(scopeId);
    const newValue = JSON.stringify(items);
    localStorage.setItem(key, newValue);
    // Notify useScopedStorage listeners in the same tab
    window.dispatchEvent(new StorageEvent("storage", { key, newValue }));
  } catch { /* ignore quota/SSR errors */ }
}

/**
 * Adds activities to the queue for the given scope.
 * Deduplicates by id — does not re-add an entry already present (queued or done).
 * Returns the count of newly added activities.
 */
export function enqueueActivities(
  scopeId: string,
  items: Omit<QueuedActivity, "id" | "status" | "createdAt">[]
): number {
  const current = readQueue(scopeId);
  const now = new Date().toISOString();
  let added = 0;
  const next = [...current];
  for (const item of items) {
    const id = `${scopeId}:${item.tool}:${item.source}`;
    if (next.some(a => a.id === id)) continue;
    next.push({ ...item, id, status: "queued", createdAt: now });
    added++;
  }
  if (added > 0) writeQueue(scopeId, next);
  return added;
}

export function getQueue(scopeId: string): QueuedActivity[] {
  return readQueue(scopeId);
}

export function markDone(scopeId: string, id: string): void {
  const items = readQueue(scopeId).map(a =>
    a.id === id ? { ...a, status: "done" as const } : a
  );
  writeQueue(scopeId, items);
}

export function removeActivity(scopeId: string, id: string): void {
  writeQueue(scopeId, readQueue(scopeId).filter(a => a.id !== id));
}

/** Utility: get the active system scope id from localStorage */
export function getActiveScopeId(): string {
  return getActiveSystemId();
}
