"use client";

import { useState, useEffect, useCallback } from "react";
import { loadInventory } from "@/lib/inventory/ai-system";
import type { AISystem } from "@/lib/inventory/ai-system";

export const ACTIVE_SYSTEM_KEY = "aicomply_active_system_id";

export function useActiveSystem() {
  const [systems, setSystems] = useState<AISystem[]>([]);
  const [activeId, setActiveIdState] = useState<string | null>(null);

  useEffect(() => {
    const inv = loadInventory();
    setSystems(inv);
    const stored = localStorage.getItem(ACTIVE_SYSTEM_KEY);
    const valid = inv.find((s) => s.id === stored);
    setActiveIdState(valid ? valid.id : (inv[0]?.id ?? null));
  }, []);

  const setActiveSystem = useCallback((id: string) => {
    setActiveIdState(id);
    localStorage.setItem(ACTIVE_SYSTEM_KEY, id);
  }, []);

  const active = systems.find((s) => s.id === activeId) ?? null;

  return { active, systems, setActiveSystem };
}
