// Calcoli di avanzamento della FRIA guidata.
import type { FriaGuidedDoc } from "./fria-guided-types";
import { FRIA_GUIDED_SECTIONS, FRIA_SUBPOINTS } from "./fria-template";
import type { FriaSectionKey } from "./fria-template";

export interface GuidedFriaSubPointSummary {
  id: string;
  label: string;
  status: "empty" | "draft" | "done";
  required: boolean;
}

export interface GuidedFriaSectionProgress {
  key: FriaSectionKey;
  label: string;
  legalRef: string;
  weight: number;
  percent: number;
  status: "not_started" | "in_progress" | "complete";
  detail: string;
  anchor: string;
  subPoints: GuidedFriaSubPointSummary[];
}

export interface GuidedFriaProgress {
  overallPercent: number;
  sections: GuidedFriaSectionProgress[];
}

export function computeGuidedFriaProgress(doc: FriaGuidedDoc): GuidedFriaProgress {
  const sections: GuidedFriaSectionProgress[] = FRIA_GUIDED_SECTIONS.map(sec => {
    const subPoints = FRIA_SUBPOINTS.filter(sp => sp.sectionKey === sec.key);
    const required  = subPoints.filter(sp => sp.required);

    const subSummaries: GuidedFriaSubPointSummary[] = subPoints.map(sp => ({
      id:       sp.id,
      label:    sp.label,
      status:   doc.answers[sp.id]?.status ?? "empty",
      required: sp.required,
    }));

    const doneMandatory = required.filter(sp => doc.answers[sp.id]?.status === "done").length;
    const percent = required.length === 0 ? 100 : Math.round((doneMandatory / required.length) * 100);

    const doneCount  = subPoints.filter(sp => doc.answers[sp.id]?.status === "done").length;
    const draftCount = subPoints.filter(sp => doc.answers[sp.id]?.status === "draft").length;

    const status: GuidedFriaSectionProgress["status"] =
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

export function nextFriaSubPointId(doc: FriaGuidedDoc): string | null {
  for (const sp of FRIA_SUBPOINTS) {
    const status = doc.answers[sp.id]?.status;
    if (!status || status === "empty" || status === "draft") return sp.id;
  }
  return null;
}

export function friaSectionPercent(doc: FriaGuidedDoc, sectionKey: FriaSectionKey): number {
  const subPoints = FRIA_SUBPOINTS.filter(sp => sp.sectionKey === sectionKey && sp.required);
  if (subPoints.length === 0) return 100;
  const done = subPoints.filter(sp => doc.answers[sp.id]?.status === "done").length;
  return Math.round((done / subPoints.length) * 100);
}
