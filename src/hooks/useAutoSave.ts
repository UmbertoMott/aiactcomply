// src/hooks/useAutoSave.ts
// Salva automaticamente lo stato ogni 30 secondi (quando cambia)

import { useEffect, useRef, useState } from "react";
import { appendVersion } from "@/lib/projects/version-history";

interface UseAutoSaveOptions {
  /** Intervallo in ms (default 30 000) */
  intervalMs?: number;
  /** Etichetta da mostrare nel pannello versioni */
  versionLabel?: string;
}

interface UseAutoSaveResult {
  /** True per 3s dopo ogni salvataggio automatico */
  justSaved: boolean;
}

/**
 * Salva automaticamente `state` ogni `intervalMs` ms.
 *
 * @param toolId   - chiave del tool (es. "fria", "docugen", "riskManager")
 * @param state    - lo stato da salvare (qualsiasi oggetto serializzabile)
 * @param saveFn   - funzione che effettua il salvataggio reale
 * @param options  - opzionali
 */
export function useAutoSave<T>(
  toolId: string,
  state: T,
  saveFn: (s: T) => void,
  options: UseAutoSaveOptions = {}
): UseAutoSaveResult {
  const { intervalMs = 30_000, versionLabel = "Salvataggio automatico" } = options;

  const [justSaved, setJustSaved] = useState(false);
  const stateRef   = useRef<T>(state);
  const saveFnRef  = useRef<(s: T) => void>(saveFn);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Aggiorna i ref senza scatenare re-render
  useEffect(() => { stateRef.current  = state;   }, [state]);
  useEffect(() => { saveFnRef.current = saveFn;  }, [saveFn]);

  useEffect(() => {
    const interval = setInterval(() => {
      const current = stateRef.current;
      try {
        saveFnRef.current(current);
        appendVersion(toolId, current, versionLabel);
      } catch {
        // ignore errors in auto-save
      }

      setJustSaved(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setJustSaved(false), 3_000);
    }, intervalMs);

    return () => {
      clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolId, intervalMs, versionLabel]);

  return { justSaved };
}
