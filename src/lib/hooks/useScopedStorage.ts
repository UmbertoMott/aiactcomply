"use client";

import { useState, useEffect, useCallback } from "react";

/** Chiave globale che identifica il sistema AI attivo */
const ACTIVE_SYSTEM_KEY = "aicomply_active_system_id";

/** Legge il systemId attivo dal localStorage — "default" se assente */
function getActiveSystemId(): string {
  if (typeof window === "undefined") return "default";
  return localStorage.getItem(ACTIVE_SYSTEM_KEY) ?? "default";
}

/**
 * Hook che gestisce lettura/scrittura localStorage con isolamento per systemId.
 *
 * Chiave generata: `aicomply_${keyBase}_v2_[${systemId}]`
 *
 * Ricarica automaticamente quando il sistema attivo cambia
 * (listen su `aicomply_active_system_id` in StorageEvent).
 *
 * @param keyBase   Identificatore del modulo (es. "dossier", "incidents", "triage")
 * @param fallback  Valore di default quando la chiave è assente o corrotta
 */
export function useScopedStorage<T>(keyBase: string, fallback: T) {
  /** Costruisce la chiave scoped per il sistema attivo al momento della chiamata */
  const getScopedKey = useCallback((): string => {
    const systemId = getActiveSystemId();
    return `aicomply_${keyBase}_v2_[${systemId}]`;
  }, [keyBase]);

  const readFromStorage = useCallback((): T => {
    try {
      const raw = localStorage.getItem(getScopedKey());
      return raw !== null ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }, [getScopedKey, fallback]);

  const [value, setValue] = useState<T>(readFromStorage);

  /** Scrive nello storage e notifica altri listener nella stessa tab */
  const setStoredValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved =
          typeof newValue === "function"
            ? (newValue as (prev: T) => T)(prev)
            : newValue;
        try {
          const key = getScopedKey();
          const serialized = JSON.stringify(resolved);
          localStorage.setItem(key, serialized);
          // StorageEvent non si propaga alla tab corrente — dispatch manuale
          window.dispatchEvent(
            new StorageEvent("storage", { key, newValue: serialized })
          );
        } catch (e) {
          console.error(`[useScopedStorage] write failed — keyBase: ${keyBase}`, e);
        }
        return resolved;
      });
    },
    [getScopedKey, keyBase]
  );

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === ACTIVE_SYSTEM_KEY) {
        // Sistema attivo cambiato — ricarica dati per nuovo sistema
        setValue(readFromStorage());
        return;
      }
      if (e.key === getScopedKey() && e.newValue !== null) {
        // Aggiornamento dalla stessa chiave (altra tab)
        try {
          setValue(JSON.parse(e.newValue) as T);
        } catch {
          setValue(fallback);
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [getScopedKey, readFromStorage, fallback]);

  return [value, setStoredValue] as const;
}
