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
}
