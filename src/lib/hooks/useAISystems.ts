"use client";

import { useState, useEffect, useCallback } from "react";

export interface AISystem {
  id: string;
  name: string;
  risk_tier: string;
  annex3_category?: string;
  intended_purpose?: string;
  sector?: string;
  is_high_risk: boolean;
  is_gpai: boolean;
  status: string;
  created_at: string;
}

const LS_KEY = "aicomply_ai_systems";

export type DataSource = "db" | "localStorage" | "empty";

export function useAISystems() {
  const [systems, setSystems] = useState<AISystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<DataSource>("empty");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai-systems");
      if (res.ok) {
        const { data } = await res.json();
        setSystems(data || []);
        setSource("db");
        // Cache offline copy
        localStorage.setItem(LS_KEY, JSON.stringify(data || []));
      } else {
        throw new Error("API error");
      }
    } catch {
      // Fallback to localStorage
      try {
        const raw = localStorage.getItem(LS_KEY);
        setSystems(raw ? JSON.parse(raw) : []);
        setSource(raw ? "localStorage" : "empty");
      } catch {
        setSystems([]);
        setSource("empty");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const register = useCallback(
    async (system: Omit<AISystem, "id" | "created_at">) => {
      try {
        const res = await fetch("/api/ai-systems", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(system),
        });
        if (res.ok) {
          await load();
          return { ok: true };
        }
      } catch {}
      // Offline fallback
      const newSystem: AISystem = {
        ...system,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      };
      const updated = [newSystem, ...systems];
      setSystems(updated);
      localStorage.setItem(LS_KEY, JSON.stringify(updated));
      setSource("localStorage");
      return { ok: true, offline: true };
    },
    [systems, load],
  );

  return { systems, loading, source, reload: load, register };
}
