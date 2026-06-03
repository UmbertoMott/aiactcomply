"use client";
import { useState, useEffect } from "react";

export type UserRole = "provider" | "deployer" | "importer" | "distributor" | null;

const ROLE_KEY = "aicomply_user_role";

export const ROLE_LABELS: Record<NonNullable<UserRole>, string> = {
  provider:    "Provider",
  deployer:    "Deployer",
  importer:    "Importatore",
  distributor: "Distributore",
};

export const ROLE_DESCRIPTIONS: Record<NonNullable<UserRole>, string> = {
  provider:    "Sviluppi o immetti sul mercato un sistema AI",
  deployer:    "Usi un sistema AI di terzi nel tuo contesto",
  importer:    "Porti in EU un sistema AI sviluppato fuori UE",
  distributor: "Rendi disponibile un sistema AI senza modificarlo",
};

export function useUserRole() {
  const [role, setRoleState] = useState<UserRole>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(ROLE_KEY) as UserRole;
    if (stored) setRoleState(stored);
  }, []);

  function setRole(r: NonNullable<UserRole>) {
    localStorage.setItem(ROLE_KEY, r);
    setRoleState(r);
  }

  function clearRole() {
    localStorage.removeItem(ROLE_KEY);
    setRoleState(null);
  }

  return { role, setRole, clearRole };
}
