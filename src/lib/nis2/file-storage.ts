"use client";

// Archivio dei file NIS 2 (già cifrati). Interfaccia unica, due realizzazioni:
// - "local": IndexedDB di questo browser (attivo ora);
// - "cloud": archivio esterno, es. Cloudflare R2 con giurisdizione UE (da collegare).
//
// Collegamento cloud previsto (da implementare lato server):
//   POST   /api/nis2/files            → { uploadUrl } link firmato temporaneo per caricare il file cifrato
//   GET    /api/nis2/files/:id        → { downloadUrl } link firmato temporaneo per scaricarlo
//   DELETE /api/nis2/files/:id        → elimina il file
// Le API verificano utente e organizzazione; le chiavi del provider stanno nelle variabili
// d'ambiente del server. Il provider riceve solo dati cifrati.
// Si attiva con NEXT_PUBLIC_NIS2_STORAGE=cloud.

import { idb } from "./idb";

export interface FileStorage {
  kind: "local" | "cloud";
  put(id: string, data: Blob): Promise<void>;
  get(id: string): Promise<Blob | undefined>;
  remove(id: string): Promise<void>;
}

const localStorageAdapter: FileStorage = {
  kind: "local",
  put: async (id, data) => { await idb("files", "readwrite", (s) => s.put(data, id)); },
  get: (id) => idb<Blob | undefined>("files", "readonly", (s) => s.get(id) as IDBRequest<Blob | undefined>),
  remove: async (id) => { await idb("files", "readwrite", (s) => s.delete(id)); },
};

const cloudStorageAdapter: FileStorage = {
  kind: "cloud",
  async put(id, data) {
    const res = await fetch("/api/nis2/files", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, size: data.size }) });
    if (!res.ok) throw new Error("cloud_unavailable");
    const { uploadUrl } = (await res.json()) as { uploadUrl: string };
    const up = await fetch(uploadUrl, { method: "PUT", body: data, headers: { "Content-Type": "application/octet-stream" } });
    if (!up.ok) throw new Error("cloud_upload_failed");
  },
  async get(id) {
    const res = await fetch(`/api/nis2/files/${encodeURIComponent(id)}`);
    if (!res.ok) return undefined;
    const { downloadUrl } = (await res.json()) as { downloadUrl: string };
    const file = await fetch(downloadUrl);
    return file.ok ? file.blob() : undefined;
  },
  async remove(id) {
    await fetch(`/api/nis2/files/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
};

export const fileStorage: FileStorage = process.env.NEXT_PUBLIC_NIS2_STORAGE === "cloud" ? cloudStorageAdapter : localStorageAdapter;
const byKind: Record<FileStorage["kind"], FileStorage> = { local: localStorageAdapter, cloud: cloudStorageAdapter };

/** Archivio in cui si trova un file già salvato (i vecchi file sono locali) */
export const storageFor = (kind?: FileStorage["kind"]) => byKind[kind ?? "local"];
