import type { RiskItem, RiskCategory, Severity, Probability } from "@/lib/simulation/risk-manager-engine";
import { computeRiskScore } from "@/lib/simulation/risk-manager-engine";

function makeRiskId(): string {
  return `risk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface AssessmentRiskPayload {
  title: string;
  description: string;
  category: RiskCategory;
  severity: Severity;
  probability: Probability;
  mitigation?: string;
}

/**
 * Converte un rischio rilevato in FRIA o DPIA in un RiskItem normalizzato
 * pronto per essere appeso a report.risks nel Risk Register (Art. 9(2)(b)).
 * Non scrive nello storage — il chiamante decide se appendere e dedupe.
 */
export function importRiskFromAssessment(
  source: "fria" | "dpia",
  payload: AssessmentRiskPayload
): RiskItem {
  return {
    id: makeRiskId(),
    description: payload.title ? `${payload.title} — ${payload.description}` : payload.description,
    category: payload.category,
    severity: payload.severity,
    probability: payload.probability,
    mitigation: payload.mitigation ?? "",
    residual: "monitor",
    quantitativeScore: computeRiskScore(payload.severity, payload.probability),
    createdAt: new Date().toISOString(),
    sourceModule: source,
  };
}

/** True se un rischio con lo stesso titolo e la stessa origine è già presente nel registro. */
export function isDuplicateRisk(existing: RiskItem[], candidate: RiskItem): boolean {
  return existing.some(
    (r) => r.sourceModule === candidate.sourceModule && r.description === candidate.description
  );
}
