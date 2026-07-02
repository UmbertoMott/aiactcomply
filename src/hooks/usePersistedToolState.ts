"use client";
// src/hooks/usePersistedToolState.ts
//
// Hook drop-in per i tool di compliance.
// Sostituisce l'accoppiata readFromStorage/writeToStorage + salva su Supabase.
//
// Comportamento:
// 1. Al mount: legge localStorage (immediato, no flash)
// 2. Al mount (async): carica da Supabase; se più recente, aggiorna state + localStorage
// 3. A ogni write: scrive localStorage (sincrono) + schedula sync Supabase (debounce 2s)
//
// Questo garantisce:
// - Nessun flash al caricamento (localStorage è sempre disponibile offline)
// - Dati persistiti su DB per multi-device / multi-tenant
// - Graceful degradation se Supabase non disponibile

import { useState, useEffect, useRef, useCallback } from "react";
import { readFromStorage, writeToStorage, STORAGE_KEYS } from "@/lib/dossier/storage-schema";

type StorageKey = keyof typeof STORAGE_KEYS;
import { saveToolState, loadToolState } from "@/app/actions/toolState";
import type { ToolId } from "@/app/actions/toolState";

interface UsePersistedToolStateOptions<T> {
  /** Chiave nel STORAGE_KEYS (es. "classifier", "riskManager") */
  toolId: ToolId;
  /** Valore di default se non trovato in nessun store */
  defaultValue: T;
  /** Se true, non sincronizza su Supabase (tool draft, non ancora salvato) */
  skipDbSync?: boolean;
  /** Metadati per tool_states (systemName, riskTier) */
  meta?: { systemName?: string; riskTier?: string };
}

export function usePersistedToolState<T>({
  toolId,
  defaultValue,
  skipDbSync = false,
  meta,
}: UsePersistedToolStateOptions<T>) {
  const storageKey = toolId as StorageKey;

  // Legge localStorage subito (sincrono) come initial state
  const [state, setStateInternal] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue;
    return readFromStorage<T>(storageKey) ?? defaultValue;
  });

  const [dbSyncStatus, setDbSyncStatus] = useState<"idle" | "syncing" | "synced" | "error">("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const metaRef = useRef(meta);
  metaRef.current = meta;

  // Al mount: sincronizza da Supabase (async)
  useEffect(() => {
    if (skipDbSync) return;
    let cancelled = false;

    async function syncFromDb() {
      try {
        const { data: dbData, savedAt } = await loadToolState<T>(toolId);
        if (cancelled) return;
        if (!dbData || !savedAt) return;

        // Confronta timestamp: usa DB se più recente di localStorage
        const localRaw = typeof window !== "undefined" ? readFromStorage<T & { completedAt?: string }>(storageKey) : null;
        const localTimestamp = localRaw?.completedAt ?? null;
        const dbTimestamp = savedAt;

        if (!localTimestamp || dbTimestamp > localTimestamp) {
          setStateInternal(dbData);
          if (typeof window !== "undefined") writeToStorage(storageKey, dbData);
          setLastSyncedAt(savedAt);
        }
      } catch {
        // Supabase non disponibile — continua con localStorage
      }
    }

    syncFromDb();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolId, skipDbSync]);

  // Wrapper di setState che scrive localStorage + schedula sync DB
  const setState = useCallback((updater: T | ((prev: T) => T)) => {
    setStateInternal((prev) => {
      const next = typeof updater === "function" ? (updater as (p: T) => T)(prev) : updater;

      // Scrittura sincrona localStorage
      if (typeof window !== "undefined") writeToStorage(storageKey, next);

      // Debounce sync Supabase (evita write per ogni keystroke)
      if (!skipDbSync) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
          setDbSyncStatus("syncing");
          const result = await saveToolState(toolId, next, metaRef.current);
          setDbSyncStatus(result.ok ? "synced" : "error");
          if (result.ok) setLastSyncedAt(new Date().toISOString());
        }, 2000);
      }

      return next;
    });
  }, [toolId, skipDbSync]);

  // Flush immediato (usato prima di navigare via o su salvataggio esplicito)
  const flushSync = useCallback(async (): Promise<boolean> => {
    if (skipDbSync) return true;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setDbSyncStatus("syncing");
    const result = await saveToolState(toolId, state, metaRef.current);
    setDbSyncStatus(result.ok ? "synced" : "error");
    if (result.ok) setLastSyncedAt(new Date().toISOString());
    return result.ok;
  }, [toolId, state, skipDbSync]);

  // Cleanup al unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    state,
    setState,
    flushSync,
    dbSyncStatus,
    lastSyncedAt,
  };
}
