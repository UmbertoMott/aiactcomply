import type { FriaGuidedDoc } from "./fria-guided-types";
import { FRIA_GUIDED_SECTIONS, FRIA_GUIDED_QUESTIONS } from "./fria-template";

export interface GuidedFriaSubPointSummary {
  id: string;
  label: string;
  status: "empty" | "draft" | "done";
  required: boolean;
}

export interface GuidedFriaSectionProgress {
  key: string;
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

const SECTION_META: Record<string, { legalRef: string; anchor: string; weight: number }> = {
  A: { legalRef: "AI Act Art. 27(1)(a-d)", anchor: "sezione-a", weight: 40 },
  B: { legalRef: "AI Act Art. 27(1)(e)",   anchor: "sezione-b", weight: 35 },
  C: { legalRef: "AI Act Art. 27(1)(f)",   anchor: "sezione-c", weight: 25 },
};

export function computeGuidedFriaProgress(doc: FriaGuidedDoc): GuidedFriaProgress {
  const sections: GuidedFriaSectionProgress[] = FRIA_GUIDED_SECTIONS.map(sec => {
    const meta = SECTION_META[sec.key] ?? { legalRef: "", anchor: `sezione-${sec.key.toLowerCase()}`, weight: 33 };
    const questions = FRIA_GUIDED_QUESTIONS.filter(q => sec.ids.includes(q.id));
    const required  = questions.filter(q => q.required);

    const subPoints: GuidedFriaSubPointSummary[] = questions.map(q => ({
      id:       q.id,
      label:    q.question,
      status:   doc.answers[q.id]?.status ?? "empty",
      required: q.required ?? false,
    }));

    const doneMandatory = required.filter(q => doc.answers[q.id]?.status === "done").length;
    const percent = required.length === 0 ? 100 : Math.round((doneMandatory / required.length) * 100);

    const doneCount  = questions.filter(q => doc.answers[q.id]?.status === "done").length;
    const draftCount = questions.filter(q => doc.answers[q.id]?.status === "draft").length;

    const status: GuidedFriaSectionProgress["status"] =
      doneCount === questions.length && questions.length > 0 ? "complete"
      : doneCount > 0 || draftCount > 0 ? "in_progress"
      : "not_started";

    const detail =
      status === "complete"    ? `Completa (${doneCount}/${questions.length})` :
      status === "in_progress" ? `${doneCount} completat${doneCount === 1 ? "o" : "i"}, ${draftCount} in bozza` :
      "Non iniziata";

    return { key: sec.key, label: sec.label, legalRef: meta.legalRef, weight: meta.weight, percent, status, detail, anchor: meta.anchor, subPoints };
  });

  const totalWeight    = sections.reduce((a, s) => a + s.weight, 0);
  const overallPercent = Math.round(sections.reduce((a, s) => a + s.percent * s.weight, 0) / (totalWeight || 1));

  return { overallPercent, sections };
}

export function nextFriaSubPointId(doc: FriaGuidedDoc): string | null {
  for (const q of FRIA_GUIDED_QUESTIONS) {
    const status = doc.answers[q.id]?.status;
    if (!status || status === "empty" || status === "draft") return q.id;
  }
  return null;
}

export function friaSectionPercent(doc: FriaGuidedDoc, sectionKey: string): number {
  const sec = FRIA_GUIDED_SECTIONS.find(s => s.key === sectionKey);
  if (!sec) return 100;
  const required = FRIA_GUIDED_QUESTIONS.filter(q => sec.ids.includes(q.id) && q.required);
  if (required.length === 0) return 100;
  const done = required.filter(q => doc.answers[q.id]?.status === "done").length;
  return Math.round((done / required.length) * 100);
}
