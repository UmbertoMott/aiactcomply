"use client";

// Stato dei requisiti NIS 2: stato, annotazioni ed elenco dei documenti in localStorage;
// il contenuto dei file in IndexedDB. Tutto resta nel browser di questo dispositivo.

import { useCallback, useEffect, useState } from "react";

export type Nis2Status = "todo" | "progress" | "done";

export interface Nis2DocMeta {
  id: string;
  name: string;
  size: number;
  type: string;
  addedAt: string;
}

export interface Nis2Entry {
  status: Nis2Status;
  notes: string;
  docs: Nis2DocMeta[];
  updatedAt?: string;
}

export const EMPTY_ENTRY: Nis2Entry = { status: "todo", notes: "", docs: [] };
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

const KEY = "aicomply_nis2_v1";
const EVENT = "aicomply-nis2-change";

function readAll(): Record<string, Nis2Entry> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, Nis2Entry>; } catch { return {}; }
}

function writeAll(all: Record<string, Nis2Entry>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
    window.dispatchEvent(new Event(EVENT));
  } catch { /* storage non disponibile */ }
}

/** Tutte le voci (per la panoramica), aggiornate quando cambia una voce */
export function useNis2All(): Record<string, Nis2Entry> {
  const [all, setAll] = useState<Record<string, Nis2Entry>>(readAll);
  useEffect(() => {
    const reload = () => setAll(readAll());
    window.addEventListener(EVENT, reload);
    window.addEventListener("storage", reload);
    return () => { window.removeEventListener(EVENT, reload); window.removeEventListener("storage", reload); };
  }, []);
  return all;
}

/** Una voce, con funzione di aggiornamento */
export function useNis2Entry(id: string): [Nis2Entry, (patch: Partial<Nis2Entry>) => void] {
  const [entry, setEntry] = useState<Nis2Entry>(() => readAll()[id] ?? EMPTY_ENTRY);
  const update = useCallback((patch: Partial<Nis2Entry>) => {
    const all = readAll();
    const next = { ...(all[id] ?? EMPTY_ENTRY), ...patch, updatedAt: new Date().toISOString() };
    all[id] = next;
    writeAll(all);
    setEntry(next);
  }, [id]);
  return [entry, update];
}

// ─── File in IndexedDB ───────────────────────────────────────────────────────

const DB = "aicomply_nis2";
const STORE = "files";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const req = run(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const putFile = (id: string, file: Blob) => tx("readwrite", (s) => s.put(file, id));
export const getFile = (id: string) => tx<Blob | undefined>("readonly", (s) => s.get(id) as IDBRequest<Blob | undefined>);
export const deleteFile = (id: string) => tx("readwrite", (s) => s.delete(id));
