// Catalog relevance scoring — pure logic, no AI calls.
// Maps Annex III areas to keywords present in catalog item text.

export type AnnexIIIArea =
  | "biometric"
  | "critical_infrastructure"
  | "education"
  | "hr_recruitment"
  | "essential_services"
  | "law_enforcement"
  | "migration"
  | "justice"
  | "gpai"
  | "limited"
  | "minimal"
  | string; // fallback

// Keywords (Italian) that must appear in title/description/category of a catalog item
// for it to be considered "relevant" for a given Annex III area.
export const ANNEX_III_RISK_KEYWORDS: Record<string, string[]> = {
  biometric: ["biometrico", "identificazione", "categorizzazione", "riconoscimento", "facciale"],
  hr_recruitment: ["discriminazione", "selezione", "assunzione", "lavorator", "bias"],
  education: ["valutazione", "studenti", "formazione", "accesso", "istruzione"],
  essential_services: ["credito", "assicurazione", "servizi pubblici", "benefici", "finanz"],
  law_enforcement: ["forze dell'ordine", "profilazione", "polizia", "sorveglianza"],
  migration: ["migrazione", "confine", "asilo"],
  justice: ["giustizia", "democratico", "elezioni"],
  critical_infrastructure: ["infrastruttura", "sicurezza", "energi", "utilities"],
  gpai: ["allucinazion", "output", "modello", "generativ", "llm", "catena di fornitura"],
  limited: ["chatbot", "deepfake", "trasparenza", "disclosure"],
  minimal: [],
};

// These keywords make a risk relevant regardless of the Annex III area (Art. 9 cross-cutting)
export const ALWAYS_RELEVANT_KEYWORDS = [
  "supervisione umana",
  "oversight",
  "accuratezza",
  "robustezza",
  "cybersicurezza",
  "sicurezza",
  "documentazione",
  "monitoraggio",
  "privacy",
  "drift",
  "bias",
];

export interface CatalogItem {
  id: string;
  label: string;
  description: string;
  category: string;
  severity: string;
  probability: string;
  mitigation: string;
  residual: string;
  article: string;
  color: string;
}

/**
 * Returns a relevance score 0–1 for a catalog item given the system's
 * Annex III area and risk tier.
 */
export function scoreRelevance(
  item: CatalogItem,
  annexArea: AnnexIIIArea | null | undefined,
  riskTier: string | null | undefined
): number {
  // Minimal risk → all items get a low base relevance
  if (riskTier === "minimal") return 0.3;

  // High risk → higher base
  const base = riskTier === "high" || riskTier === "high_risk" ? 0.8 : 0.5;

  const text =
    `${item.label} ${item.description} ${item.category} ${item.mitigation}`.toLowerCase();

  // Always-relevant keywords → +0.2
  const alwaysMatch = ALWAYS_RELEVANT_KEYWORDS.some((kw) =>
    text.includes(kw.toLowerCase())
  );
  const alwaysBoost = alwaysMatch ? 0.2 : 0;

  // Area-specific keywords → +0.3
  const areaKeywords = annexArea
    ? (ANNEX_III_RISK_KEYWORDS[annexArea] ?? [])
    : [];
  const areaMatch = areaKeywords.some((kw) => text.includes(kw.toLowerCase()));
  const areaBoost = areaMatch ? 0.3 : 0;

  return Math.min(1, base + alwaysBoost + areaBoost);
}
