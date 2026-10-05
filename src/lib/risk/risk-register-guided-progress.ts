// Calcoli di avanzamento del Risk Register guidato.
import type { RiskRegisterGuidedDoc } from "./risk-register-guided-types";
import { RISK_REGISTER_SECTIONS, RISK_REGISTER_SUBPOINTS } from "./risk-register-guided-types";
import type { RiskRegisterSectionKey } from "./risk-register-guided-types";

export interface GuidedRRSubPointSummary {
  id: string;
  label: string;
  status: "empty" | "pending" | "done" | "skipped";
  required: boolean;
}

export interface GuidedRRSectionProgress {
  key: RiskRegisterSectionKey;
  label: string;
  legalRef: string;
  weight: number;
  percent: number;
  /** Sezione senza voci obbligatorie: non entra nella percentuale complessiva */
  optional: boolean;
  status: "not_started" | "in_progress" | "complete";
  detail: string;
  anchor: string;
  subPoints: GuidedRRSubPointSummary[];
}

export interface GuidedRRProgress {
  overallPercent: number;
  sections: GuidedRRSectionProgress[];
}

export function computeGuidedRRProgress(doc: RiskRegisterGuidedDoc): GuidedRRProgress {
  const sections: GuidedRRSectionProgress[] = RISK_REGISTER_SECTIONS.map(sec => {
    const subPoints = RISK_REGISTER_SUBPOINTS.filter(sp => sp.sectionKey === sec.key);
    const required  = subPoints.filter(sp => sp.required);

    const subSummaries: GuidedRRSubPointSummary[] = subPoints.map(sp => ({
      id:       sp.id,
      label:    sp.label,
      status:   doc.answers[sp.id]?.status ?? "empty",
      required: sp.required,
    }));

    const doneMandatory = required.filter(sp => doc.answers[sp.id]?.status === "done").length;
    // Sezione senza voci obbligatorie: la percentuale riflette le risposte date, non parte da 100
    const doneAny = subPoints.filter(sp => doc.answers[sp.id]?.status === "done").length;
    const percent = required.length > 0 ? Math.round((doneMandatory / required.length) * 100)
      : subPoints.length > 0 ? Math.round((doneAny / subPoints.length) * 100) : 100;

    const doneCount    = subPoints.filter(sp => doc.answers[sp.id]?.status === "done").length;
    const pendingCount = subPoints.filter(sp => doc.answers[sp.id]?.status === "pending").length;

    const status: GuidedRRSectionProgress["status"] =
      doneCount === subPoints.length && subPoints.length > 0 ? "complete"
      : doneCount > 0 || pendingCount > 0 ? "in_progress"
      : "not_started";

    const detail =
      status === "complete" ? `Completa (${doneCount}/${subPoints.length})` :
      status === "in_progress" ? `${doneCount} completat${doneCount === 1 ? "o" : "i"}, ${pendingCount} in attesa` :
      "Non iniziata";

    return {
      key:      sec.key,
      label:    sec.label,
      legalRef: sec.legalRef,
      weight:   subPoints.length,
      percent,
      optional: required.length === 0,
      status,
      detail,
      anchor:   sec.anchor,
      subPoints: subSummaries,
    };
  });

  const counted = sections.filter(sec => !sec.optional);
  const totalWeight = counted.reduce((s, sec) => s + sec.weight, 0);
  const overallPercent = totalWeight === 0 ? 0 : Math.round(
    counted.reduce((acc, s) => acc + (s.percent * s.weight) / totalWeight, 0)
  );

  return { overallPercent, sections };
}

export function nextRRSubPointId(doc: RiskRegisterGuidedDoc): string | null {
  for (const sp of RISK_REGISTER_SUBPOINTS) {
    const status = doc.answers[sp.id]?.status;
    if (!status || status === "pending") return sp.id;
  }
  return null;
}

export function rrSectionPercent(doc: RiskRegisterGuidedDoc, sectionKey: RiskRegisterSectionKey): number {
  const subPoints = RISK_REGISTER_SUBPOINTS.filter(sp => sp.sectionKey === sectionKey && sp.required);
  if (subPoints.length === 0) return 100;
  const done = subPoints.filter(sp => doc.answers[sp.id]?.status === "done").length;
  return Math.round((done / subPoints.length) * 100);
}
