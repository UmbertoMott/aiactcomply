// src/lib/dossier/org-profile.ts
// Utility functions for OrgProfile — type is declared in storage-schema.ts

import { OrgProfile, DEFAULT_ORG_PROFILE, STORAGE_KEYS } from "./storage-schema";

export const EU_COUNTRIES = [
  "AT","BE","BG","CY","CZ","DE","DK","EE","ES","FI",
  "FR","GR","HR","HU","IE","IT","LT","LU","LV","MT",
  "NL","PL","PT","RO","SE","SI","SK",
];

export function saveOrgProfile(profile: OrgProfile): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.orgProfile, JSON.stringify(profile));
  } catch { /* ignore quota errors */ }
}

export function loadOrgProfile(): OrgProfile {
  try {
    if (typeof window === "undefined") return { ...DEFAULT_ORG_PROFILE };
    const raw = localStorage.getItem(STORAGE_KEYS.orgProfile);
    if (!raw) return { ...DEFAULT_ORG_PROFILE };
    return { ...DEFAULT_ORG_PROFILE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_ORG_PROFILE };
  }
}

/** Returns true if the given ISO-3166 alpha-2 country code is outside the EU */
export function isNonEuProvider(countryCode: string): boolean {
  return !EU_COUNTRIES.includes(countryCode.toUpperCase());
}
