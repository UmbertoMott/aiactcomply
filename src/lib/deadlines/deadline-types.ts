// AI Act Deadline types — PROMPT AP
// ✦ AI — verifica e conferma: date, articoli e numerazione paragrafi richiedono
// validazione legale contro il testo consolidato Reg. (UE) 2024/1689.

export type AIActTier =
  | "prohibited"
  | "high_risk_annex3"
  | "high_risk_annex1"
  | "limited"
  | "minimal"
  | "gpai"
  | "gpai_systemic"
  | "all";

export type DeadlineSeverity = "critical" | "important" | "informational";

export type DeadlineStatus = "passed" | "imminent" | "upcoming" | "future";

export interface DeadlineAction {
  label: string;
  href?: string;
}

export type DeadlineCategory = "incident" | "registration" | "modification" | "general";

export interface AIActDeadline {
  id: string;
  date: string;                       // ISO date string
  label: string;
  description: string;
  article: string;
  applies_to: AIActTier[];
  tool_href?: string;
  severity: DeadlineSeverity;
  isDynamic?: boolean;                 // true = generata da buildDynamicDeadlines()
  sourceSystemId?: string;            // per scadenze dinamiche per-sistema
  sourceSystemName?: string;
  category?: DeadlineCategory;        // usato per la vista prioritizzata per ruolo (PROMPT_BB)
}

// ─── Vista prioritizzata per ruolo (PROMPT_BB Parte 3) ────────────────────────

export type UserRole = "compliance_officer" | "internal_auditor" | "legal" | "admin";

/** Ordine di priorità delle categorie di scadenza per ruolo utente. */
export const ROLE_PRIORITY: Record<UserRole, DeadlineCategory[]> = {
  compliance_officer: ["incident", "registration", "modification", "general"],
  internal_auditor:   ["registration", "modification", "incident", "general"],
  legal:              ["modification", "registration", "incident", "general"],
  admin:              ["incident", "registration", "modification", "general"],
};

export const ROLE_LABEL: Record<UserRole, string> = {
  compliance_officer: "Compliance Officer",
  internal_auditor: "Auditor Interno",
  legal: "Ufficio Legale",
  admin: "Admin",
};
