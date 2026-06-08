// src/lib/hooks/useOrgProfile.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  readFromStorage,
  writeToStorage,
  OrgProfile,
  DEFAULT_ORG_PROFILE,
} from "@/lib/dossier/storage-schema";

export function useOrgProfile() {
  const [profile, setProfileState] = useState<OrgProfile>(DEFAULT_ORG_PROFILE);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = readFromStorage<OrgProfile>("orgProfile");
    if (stored) setProfileState({ ...DEFAULT_ORG_PROFILE, ...stored });
  }, []);

  const setProfile = useCallback((updates: Partial<OrgProfile>) => {
    setProfileState((prev) => {
      const next: OrgProfile = { ...DEFAULT_ORG_PROFILE, ...prev, ...updates };
      writeToStorage<OrgProfile>("orgProfile", next);
      return next;
    });
  }, []);

  return { profile, setProfile };
}
