// Calcoli di avanzamento della DPIA guidata.
// Separato da dpia-progress.ts (che lavora su DPIAResult) per non rompere
// il DPIATemplateViewer già esistente.
import type { DpiaGuidedDoc } from "./dpia-guided-types";
import { DPIA_GUIDED_SECTIONS, DPIA_SUBPOINTS } from "./dpia-template";
import type { DpiaSectionKey } from "./dpia-template";

// ─── Tipi di output ───────────────────────────────────────────────────────────

export interface GuidedSubPointSummary {
  id: string;
  label: string;
  status: "empty" | "draft" | "done";
  required: boolean;
}

export interface GuidedSectionProgress {
  key: DpiaSectionKey;
  label: string;
  legalRef: string;
  weight: number;
  percent: number;
  status: "not_started" | "in_progress" | "complete";
  detail: string;
  anchor: string;
  subPoints: GuidedSubPointSummary[];
}

export interface GuidedDpiaProgress {
  overallPercent: number;
  sections: GuidedSectionProgress[];
}

// ─── Calcolo principale ───────────────────────────────────────────────────────

export function computeGuidedDpiaProgress(doc: DpiaGuidedDoc): GuidedDpiaProgress {
  const sections: GuidedSectionProgress[] = DPIA_GUIDED_SECTIONS.map(sec => {
    const subPoints = DPIA_SUBPOINTS.filter(sp => sp.sectionKey === sec.key);
    const required  = subPoints.filter(sp => sp.required);

    const subSummaries: GuidedSubPointSummary[] = subPoints.map(sp => ({
      id:       sp.id,
      label:    sp.label,
      status:   doc.answers[sp.id]?.status ?? "empty",
      required: sp.required,
    }));

    // percent = % dei sotto-punti obbligatori con status "done"
    const doneMandatory = required.filter(sp => doc.answers[sp.id]?.status === "done").length;
    const percent = required.length === 0 ? 100 : Math.round((doneMandatory / required.length) * 100);

    const doneCount  = subPoints.filter(sp => doc.answers[sp.id]?.status === "done").length;
    const draftCount = subPoints.filter(sp => doc.answers[sp.id]?.status === "draft").length;

    const status: GuidedSectionProgress["status"] =
      doneCount === subPoints.length && subPoints.length > 0 ? "complete"
      : doneCount > 0 || draftCount > 0 ? "in_progress"
      : "not_started";

    const detail =
      status === "complete" ? `Completa (${doneCount}/${subPoints.length})` :
      status === "in_progress" ? `${doneCount} completat${doneCount === 1 ? "o" : "i"}, ${draftCount} in bozza` :
      "Non iniziata";

    return {
      key:    sec.key,
      label:  sec.label,
      legalRef: sec.legalRef,
      weight: sec.weight,
      percent,
      status,
      detail,
      anchor: sec.anchor,
      subPoints: subSummaries,
    };
  });

  const overallPercent = Math.round(
    sections.reduce((acc, s) => acc + (s.percent * s.weight) / 100, 0)
  );

  return { overallPercent, sections };
}

// ─── Utility: prossimo sotto-punto da rispondere ──────────────────────────────

export function nextSubPointId(doc: DpiaGuidedDoc): string | null {
  for (const sp of DPIA_SUBPOINTS) {
    const status = doc.answers[sp.id]?.status;
    if (!status || status === "empty" || status === "draft") return sp.id;
  }
  return null;
}

// ─── Utility: percentuale sezione senza creare un oggetto intero ──────────────

export function sectionPercent(doc: DpiaGuidedDoc, sectionKey: DpiaSectionKey): number {
  const subPoints = DPIA_SUBPOINTS.filter(sp => sp.sectionKey === sectionKey && sp.required);
  if (subPoints.length === 0) return 100;
  const done = subPoints.filter(sp => doc.answers[sp.id]?.status === "done").length;
  return Math.round((done / subPoints.length) * 100);
}
