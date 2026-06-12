// Calcoli derivati del Registro dei Rischi: score R = P × S, fasce,
// completezza per voce, completezza aggregata, alert revisioni.
// Solo calcoli locali — nessuna chiamata AI, nessun salvataggio.
import type { RiskRegisterDocument, RiskRegisterEntry } from "./risk-register-types";

const SCALE = { low: 1, medium: 2, high: 3 } as const;

export function computeRiskScore(entry: RiskRegisterEntry): number | null {
  if (!entry.likelihood || !entry.impact) return null;
  return SCALE[entry.likelihood] * SCALE[entry.impact];
}

export type RiskBand = "verde" | "giallo" | "arancio" | "rosso" | "n/d";

export function riskBand(score: number | null): RiskBand {
  if (score === null) return "n/d";
  if (score <= 2) return "verde";
  if (score <= 4) return "giallo";
  if (score === 6) return "arancio";
  return "rosso";
}

// Colori della matrice del template docx
export const BAND_COLORS: Record<RiskBand, { bg: string; fg: string }> = {
  verde:   { bg: "#D1FAE5", fg: "#065f46" },
  giallo:  { bg: "#FEF3C7", fg: "#92400e" },
  arancio: { bg: "#FFE4C4", fg: "#9a3412" },
  rosso:   { bg: "#FEE2E2", fg: "#991b1b" },
  "n/d":   { bg: "#f3f4f6", fg: "#6b7280" },
};

export type EntryCompleteness = "complete" | "partial" | "empty";

export function entryCompleteness(entry: RiskRegisterEntry): EntryCompleteness {
  const required = [entry.category, entry.description, entry.art9Reference,
                    entry.likelihood, entry.impact, entry.mitigations, entry.owner];
  const filled = required.filter(v => v !== undefined && v !== "").length;
  if (filled === required.length && entry.nextReviewDate) return "complete";
  if (filled === 0) return "empty";
  return "partial";
}

/** Etichette italiane dei campi mancanti di una voce. */
export function missingFields(entry: RiskRegisterEntry): string[] {
  const checks: Array<[string, unknown]> = [
    ["categoria", entry.category],
    ["descrizione", entry.description],
    ["rif. Art. 9", entry.art9Reference],
    ["probabilità", entry.likelihood],
    ["impatto", entry.impact],
    ["mitigazioni", entry.mitigations],
    ["owner", entry.owner],
    ["prox. revisione", entry.nextReviewDate],
  ];
  return checks.filter(([, v]) => v === undefined || v === "").map(([label]) => label);
}

export interface SectionProgress {
  key: "identification" | "risks" | "gapCheck" | "reviewLog" | "signOff";
  label: string;
  weight: number;
  percent: number;
  detail: string;
}

export interface RegisterProgress {
  overallPercent: number;
  sections: SectionProgress[];
  blockingGaps: string[];
}

export function computeRegisterProgress(doc: RiskRegisterDocument): RegisterProgress {
  const sections: SectionProgress[] = [];

  // — Identificazione (peso 15) —
  const id = doc.identification;
  const idFields: unknown[] = [
    id.systemName, id.providerDeployerRole, id.descriptionAndPurpose,
    id.riskTier !== "unclassified" ? id.riskTier : undefined,
    id.annexIIIArea,
    id.applicableArticles.length > 0 ? "ok" : undefined,
    id.personalDataProcessed !== "unspecified" ? id.personalDataProcessed : undefined,
    id.humanOversightRequired !== undefined ? "ok" : undefined,
    id.registerOwner,
  ];
  // legalBasis obbligatoria solo se trattati dati personali
  if (id.personalDataProcessed !== "no") idFields.push(id.legalBasis);
  const idFilled = idFields.filter(v => v !== undefined && v !== "").length;
  const idPercent = idFields.length === 0 ? 0 : Math.round((idFilled / idFields.length) * 100);
  sections.push({
    key: "identification", label: "Identificazione sistema", weight: 15,
    percent: idPercent, detail: `${idFilled}/${idFields.length} campi compilati`,
  });

  // — Registro rischi (peso 45) —
  const total = doc.risks.length;
  const complete = doc.risks.filter(r => entryCompleteness(r) === "complete").length;
  const risksPercent = total === 0 ? 0 : Math.round((complete / total) * 100);
  sections.push({
    key: "risks", label: "Registro rischi", weight: 45,
    percent: risksPercent, detail: `${complete}/${total} rischi completi`,
  });

  // — Gap check (peso 15) —
  const gc = doc.gapCheck;
  const blockingGaps: string[] = [];
  let gapPercent = 0;
  if (gc?.coverageScore !== undefined) {
    const unresolved = gc.missingAreas.filter(a => {
      if (a.priority !== "obbligatorio") return false;
      const linked = doc.risks.some(r =>
        (a.suggestedRiskTitle && (r.description.toLowerCase().includes(a.suggestedRiskTitle.toLowerCase()) || r.category.toLowerCase().includes(a.suggestedRiskTitle.toLowerCase()))) ||
        r.category.toLowerCase().includes(a.area.toLowerCase())
      );
      return !linked;
    });
    unresolved.forEach(a => blockingGaps.push(a.area));
    gapPercent = unresolved.length === 0 ? 100 : 50;
  }
  sections.push({
    key: "gapCheck", label: "Copertura Art. 9", weight: 15,
    percent: gapPercent,
    detail: gc?.coverageScore !== undefined ? `score ${gc.coverageScore}/100` : "non eseguito",
  });

  // — Monitoraggio (peso 10) —
  const now = Date.now();
  const hasFutureReview = doc.reviewLog.some(e => e.nextReviewDate && Date.parse(e.nextReviewDate) > now);
  sections.push({
    key: "reviewLog", label: "Monitoraggio", weight: 10,
    percent: hasFutureReview ? 100 : 0,
    detail: doc.reviewLog.length > 0 ? `${doc.reviewLog.length} revisioni registrate` : "nessuna revisione",
  });

  // — Sign-off (peso 15) —
  const so = doc.signOff;
  const signedCount = so ? [so.riskOwner, so.complianceLegal, so.legalRepresentative].filter(r => r.signed).length : 0;
  sections.push({
    key: "signOff", label: "Sign-off", weight: 15,
    percent: Math.round((signedCount / 3) * 100),
    detail: `${signedCount}/3 firme`,
  });

  const overallPercent = Math.round(
    sections.reduce((acc, s) => acc + (s.percent * s.weight) / 100, 0)
  );

  return { overallPercent, sections, blockingGaps };
}

export interface ReviewAlert {
  riskId?: string;
  label: string;
  dueDate: string;
  status: "overdue" | "due_soon" | "scheduled";
}

export function computeReviewAlerts(doc: RiskRegisterDocument, now = new Date()): ReviewAlert[] {
  const alerts: ReviewAlert[] = [];
  const soonMs = 30 * 24 * 60 * 60 * 1000;

  const statusFor = (d: string): ReviewAlert["status"] => {
    const t = Date.parse(d);
    if (isNaN(t)) return "scheduled";
    if (t < now.getTime()) return "overdue";
    if (t - now.getTime() <= soonMs) return "due_soon";
    return "scheduled";
  };

  doc.risks.forEach(r => {
    if (r.nextReviewDate) {
      alerts.push({ riskId: r.id, label: `${r.id} — ${r.category}`, dueDate: r.nextReviewDate, status: statusFor(r.nextReviewDate) });
    }
  });

  const lastLog = doc.reviewLog[doc.reviewLog.length - 1];
  if (lastLog?.nextReviewDate) {
    alerts.push({ label: "Revisione documento", dueDate: lastLog.nextReviewDate, status: statusFor(lastLog.nextReviewDate) });
  }

  return alerts.sort((a, b) => Date.parse(a.dueDate) - Date.parse(b.dueDate));
}
