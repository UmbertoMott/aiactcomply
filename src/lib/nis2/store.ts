"use client";

// Stato dei requisiti NIS 2: stato, annotazioni ed elenco dei documenti in localStorage.
// Il contenuto dei file è cifrato nel browser (crypto.ts) e salvato tramite file-storage.ts.

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Nis2Profile } from "./requirements";

export type Nis2Status = "todo" | "progress" | "done";

export interface Nis2DocMeta {
  id: string;
  name: string;
  size: number;
  type: string;
  addedAt: string;
  /** Vettore di inizializzazione AES-GCM (base64); assente nei file salvati prima della cifratura */
  iv?: string;
  /** Impronta della chiave usata per cifrare il file */
  keyId?: string;
  /** Dove è conservato il file cifrato */
  storage?: "local" | "cloud";
}

export interface Nis2Entry {
  status: Nis2Status;
  notes: string;
  docs: Nis2DocMeta[];
  updatedAt?: string;
}

export const EMPTY_ENTRY: Nis2Entry = { status: "todo", notes: "", docs: [] };
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

// Le voci dei due profili sono tenute separate (i requisiti hanno testi e numerazione propri)
const KEYS: Record<Nis2Profile, string> = { essenziale: "aicomply_nis2_v1", importante: "aicomply_nis2_imp_v1" };
const PROFILE_KEY = "aicomply_nis2_profile";
const EVENT = "aicomply-nis2-change";

function readAll(profile: Nis2Profile): Record<string, Nis2Entry> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(KEYS[profile]) ?? "{}") as Record<string, Nis2Entry>; } catch { return {}; }
}

function writeAll(profile: Nis2Profile, all: Record<string, Nis2Entry>) {
  try {
    localStorage.setItem(KEYS[profile], JSON.stringify(all));
    window.dispatchEvent(new Event(EVENT));
  } catch { /* storage non disponibile */ }
}

function readProfile(): Nis2Profile | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(PROFILE_KEY);
    return v === "essenziale" || v === "importante" ? v : null;
  } catch { return null; }
}

function useNis2Event(reload: () => void) {
  useEffect(() => {
    window.addEventListener(EVENT, reload);
    window.addEventListener("storage", reload);
    return () => { window.removeEventListener(EVENT, reload); window.removeEventListener("storage", reload); };
  }, [reload]);
}

/** Profilo del soggetto NIS (essenziale o importante); null finché non è scelto */
export function useNis2Profile(): [Nis2Profile | null, (p: Nis2Profile | null) => void] {
  const [profile, setProfile] = useState<Nis2Profile | null>(readProfile);
  useNis2Event(useCallback(() => setProfile(readProfile()), []));
  const set = useCallback((p: Nis2Profile | null) => {
    try {
      if (p) localStorage.setItem(PROFILE_KEY, p); else localStorage.removeItem(PROFILE_KEY);
      window.dispatchEvent(new Event(EVENT));
    } catch { /* storage non disponibile */ }
    setProfile(p);
  }, []);
  return [profile, set];
}

/** Tutte le voci del profilo (per la panoramica), aggiornate quando cambia una voce */
export function useNis2All(profile: Nis2Profile | null): Record<string, Nis2Entry> {
  const [version, setVersion] = useState(0);
  useNis2Event(useCallback(() => setVersion((v) => v + 1), []));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => (profile ? readAll(profile) : {}), [profile, version]);
}

/** Una voce, con funzione di aggiornamento */
export function useNis2Entry(profile: Nis2Profile, id: string): [Nis2Entry, (patch: Partial<Nis2Entry>) => void] {
  const [entry, setEntry] = useState<Nis2Entry>(() => readAll(profile)[id] ?? EMPTY_ENTRY);
  const update = useCallback((patch: Partial<Nis2Entry>) => {
    const all = readAll(profile);
    const next = { ...(all[id] ?? EMPTY_ENTRY), ...patch, updatedAt: new Date().toISOString() };
    all[id] = next;
    writeAll(profile, all);
    setEntry(next);
  }, [profile, id]);
  return [entry, update];
}
