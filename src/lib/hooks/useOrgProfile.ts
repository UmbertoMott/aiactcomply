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
    const stored = readFromStorage<OrgProfile>("orgProfile");
    if (stored) setProfileState(stored);
  }, []);

  const setProfile = useCallback((updates: Partial<OrgProfile>) => {
    setProfileState((prev) => {
      const next = { ...prev, ...updates };
      writeToStorage<OrgProfile>("orgProfile", next);
      return next;
    });
  }, []);

  return { profile, setProfile };
}
