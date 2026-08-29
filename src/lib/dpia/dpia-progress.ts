// Calcoli derivati della DPIA: completezza per step, copertura Art. 35(7),
// alert consultazione preventiva Art. 36.
// Solo calcoli locali — nessuna chiamata AI, nessun salvataggio.
// i18n: accetta un translator `t` (namespace toolDpia); le label/valori/dettagli
// sono render-keyed (chiavi dpp_*). I riferimenti legali (Art./WP248) restano invariati.
import type { DPIAResult } from "@/lib/dossier/storage-schema";
import { DPIA_STEPS } from "./dpia-template";

type TFn = (key: string) => string;

// ─── Completezza per singolo step ────────────────────────────────────────────

export interface DpiaStepField {
  label: string;
  value: string;
  filled: boolean;
  required: boolean;
}

export interface DpiaStepProgress {
  step: number;
  key: string;
  label: string;
  legalRef: string;
  weight: number;
  percent: number;
  detail: string;
  fields: DpiaStepField[];
}

export interface DpiaDocProgress {
  overallPercent: number;
  steps: DpiaStepProgress[];
  art35Coverage: {
    a: "covered" | "partial" | "missing";
    b: "covered" | "partial" | "missing";
    c: "covered" | "partial" | "missing";
    d: "covered" | "partial" | "missing";
  };
  art36Required: boolean;
  blockingGaps: string[];
}

function pct(filled: number, total: number): number {
  return total === 0 ? 0 : Math.round((filled / total) * 100);
}

function field(label: string, value: string | null | undefined, required = true): DpiaStepField {
  const v = (value ?? "").trim();
  return { label, value: v, filled: v.length > 0, required };
}

function countField(label: string, count: number, t: TFn, required = true): DpiaStepField {
  return { label, value: count > 0 ? `${count} ${t("dpp_elements")}` : "", filled: count > 0, required };
}

// Label localizzata dello step, mantenendo le chiavi stabili di DPIA_STEPS.
function stepMeta(idx: number, t: TFn): { step: number; key: string; label: string; legalRef: string } {
  const s = DPIA_STEPS[idx];
  return { step: s.step, key: s.key, label: t(`dpp_step_${s.key}_label`), legalRef: s.legalRef };
}

// ─── Step 0 — Screening ───────────────────────────────────────────────────────

function step0(doc: DPIAResult, t: TFn): DpiaStepProgress {
  const sc = doc.screening;
  const assessed = sc.criteria.filter(c => c.applies !== "").length;
  const total = sc.criteria.length || 9;

  const fields: DpiaStepField[] = [
    countField(t("dpp_criteriaAssessed"), assessed, t),
    field(t("dpp_screeningConclusion"), sc.dpia_required === "yes" ? t("dpp_dpiaRequired") : sc.dpia_required === "no" ? t("dpp_dpiaNotRequired") : sc.dpia_required === "uncertain" ? t("dpp_uncertain") : ""),
    field(t("dpp_justifNoDpia"), sc.justification_if_no_dpia, sc.dpia_required === "no"),
  ];
  const req = fields.filter(f => f.required).length;

  return {
    ...stepMeta(0, t),
    weight: 10,
    percent: pct(fields.filter(f => f.required && f.filled).length, req),
    detail: `${assessed}/${total} ${t("dpp_criteriaAssessedShort")} · DPIA: ${sc.dpia_required || t("dpp_na")}`,
    fields,
  };
}

// ─── Step 1 — Descrizione (Art. 35(7)(a)) ─────────────────────────────────────

function step1(doc: DPIAResult, t: TFn): DpiaStepProgress {
  const d = doc.description;
  const fields: DpiaStepField[] = [
    field(t("dpp_systemController"), d.system_name),
    field(t("dpp_organization"), d.organization_name, false),
    field(t("dpp_controller"), d.controller_name, false),
    field("DPO", d.dpo_name, false),
    field(t("dpp_dpoConsulted"), d.dpo_consulted ? (d.dpo_consulted === "yes" ? t("dpp_yes") : d.dpo_consulted === "no" ? t("dpp_no") : "") : ""),
    field(t("dpp_purposes"), d.processing_purposes),
    field(t("dpp_dataCategories"), d.personal_data_categories),
    field(t("dpp_specialCategories"), d.special_categories, false),
    field(t("dpp_subjectCategories"), d.data_subjects_categories),
    field(t("dpp_recipients"), d.recipients, false),
    field(t("dpp_retention"), d.retention_period, false),
    countField(t("dpp_processingAssets"), d.assets.length, t, false),
    field(t("dpp_intlTransfers"), d.processor_involved === "yes" ? `${t("dpp_processorWord")}: ${d.processor_name || t("dpp_na")}` : "", false),
  ];
  const req = fields.filter(f => f.required);
  return {
    ...stepMeta(1, t),
    weight: 20,
    percent: pct(req.filter(f => f.filled).length, req.length),
    detail: `${req.filter(f => f.filled).length}/${req.length} ${t("dpp_requiredFilled")}`,
    fields,
  };
}

// ─── Step 2 — Necessità / Proporzionalità (Art. 35(7)(b)) ────────────────────

function step2(doc: DPIAResult, t: TFn): DpiaStepProgress {
  const p = doc.proportionality;
  const propTotal = p.proportionality_checks.length;
  const propDone = p.proportionality_checks.filter(c => c.status !== "" && c.status !== undefined).length;
  const rightsTotal = p.rights_checks.length;
  const rightsDone = p.rights_checks.filter(c => c.applicable !== "" && c.applicable !== undefined).length;

  const fields: DpiaStepField[] = [
    field(t("dpp_necessityJust"), p.necessity_justification),
    { label: t("dpp_propPrinciples"), value: propTotal > 0 ? `${propDone}/${propTotal} ${t("dpp_verified")}` : "", filled: propDone > 0, required: true },
    { label: t("dpp_dataSubjectRights"), value: rightsTotal > 0 ? `${rightsDone}/${rightsTotal} ${t("dpp_assessed")}` : "", filled: rightsDone > 0, required: false },
    field(t("dpp_processorClauses"), p.processor_clauses_art28 ? (p.processor_clauses_art28 === "yes" ? t("dpp_yes") : p.processor_clauses_art28 === "no" ? t("dpp_no") : "N/A") : "", false),
    field(t("dpp_intlTransfers"), p.international_transfers ? (p.international_transfers === "yes" ? `${t("dpp_yes")} — ${p.international_transfers_safeguards || t("dpp_safeguardsNa")}` : t("dpp_no")) : "", false),
  ];
  const req = fields.filter(f => f.required);
  return {
    ...stepMeta(2, t),
    weight: 20,
    percent: pct(req.filter(f => f.filled).length, req.length),
    detail: `${t("dpp_necessityWord")}: ${p.necessity_justification ? "✓" : "—"} · ${t("dpp_proportionalityWord")}: ${propDone}/${propTotal}`,
    fields,
  };
}

// ─── Step 3 — Rischi (Art. 35(7)(c)) ─────────────────────────────────────────

function step3(doc: DPIAResult, t: TFn): DpiaStepProgress {
  const r = doc.risks;
  const threats = r.threats;
  const withMit = threats.filter(x => x.mitigation?.trim());
  const highNoMit = threats.filter(x => x.risk_level === "high" && !x.mitigation?.trim());

  const fields: DpiaStepField[] = [
    countField(t("dpp_threatsIdentified"), threats.length, t),
    { label: t("dpp_threatsWithMit"), value: threats.length > 0 ? `${withMit.length}/${threats.length}` : "", filled: threats.length > 0 && withMit.length > 0, required: false },
    { label: t("dpp_highNoMit"), value: highNoMit.length > 0 ? `⚠ ${highNoMit.length} ${t("dpp_toResolve")}` : threats.length > 0 ? `✓ ${t("dpp_none")}` : "", filled: highNoMit.length === 0 && threats.length > 0, required: false },
    field(t("dpp_riskBeforeMeasures"), r.overall_risk_before || ""),
  ];
  const req = fields.filter(f => f.required);
  return {
    ...stepMeta(3, t),
    weight: 25,
    percent: threats.length === 0 ? 0 : pct(
      (threats.length > 0 ? 1 : 0) + (r.overall_risk_before ? 1 : 0),
      2
    ),
    detail: `${threats.length} ${t("dpp_threatsWord")} · ${highNoMit.length} ${t("dpp_highNoMitShort")}`,
    fields,
  };
}

// ─── Step 4 — Misure (Art. 35(7)(d)) ─────────────────────────────────────────

function step4(doc: DPIAResult, t: TFn): DpiaStepProgress {
  const m = doc.measures;
  const fields: DpiaStepField[] = [
    field(t("dpp_technicalMeasures"), m.technical_measures),
    field(t("dpp_organizationalMeasures"), m.organizational_measures),
    field(t("dpp_overallResidual"), m.overall_risk_after || ""),
    field(t("dpp_priorConsult"), m.prior_consultation_required ? `${t("dpp_required")} — ${m.prior_consultation_authority || t("dpp_authorityNa")}` : t("dpp_notRequired"), false),
    field(t("dpp_reviewSchedule"), m.review_schedule, false),
    field(t("dpp_reviewTrigger"), m.review_trigger, false),
  ];
  const req = fields.filter(f => f.required);
  return {
    ...stepMeta(4, t),
    weight: 15,
    percent: pct(req.filter(f => f.filled).length, req.length),
    detail: `${t("dpp_measuresWord")}: ${m.technical_measures ? "✓T" : "—T"} ${m.organizational_measures ? "✓O" : "—O"} · ${t("dpp_riskAfterShort")}: ${m.overall_risk_after || t("dpp_na")}`,
    fields,
  };
}

// ─── Step 5 — Conclusione ────────────────────────────────────────────────────

function step5(doc: DPIAResult, t: TFn): DpiaStepProgress {
  const c = doc.conclusion;
  const fields: DpiaStepField[] = [
    field(t("dpp_complianceDecision"), c.compliant ? (c.compliant === "yes" ? t("dpp_compliant") : c.compliant === "no" ? t("dpp_nonCompliant") : c.compliant === "conditional" ? t("dpp_conditional") : "") : ""),
    field(t("dpp_conditions"), c.conditions, c.compliant === "conditional"),
    field(t("dpp_execSummary"), c.summary),
    field(t("dpp_nextReviewDate"), c.next_review_date, false),
    field(t("dpp_completedOn"), c.completedAt, false),
  ];
  const req = fields.filter(f => f.required);
  return {
    ...stepMeta(5, t),
    weight: 10,
    percent: pct(req.filter(f => f.filled).length, req.length),
    detail: c.compliant ? `${t("dpp_outcome")}: ${c.compliant}` : t("dpp_conclusionEmpty"),
    fields,
  };
}

// ─── Copertura Art. 35(7) ────────────────────────────────────────────────────

function computeArt35Coverage(doc: DPIAResult): DpiaDocProgress["art35Coverage"] {
  const d = doc.description;
  const p = doc.proportionality;
  const r = doc.risks;
  const m = doc.measures;

  const aFilled = !!(d.system_name?.trim() && d.processing_purposes?.trim());
  const aPartial = !!(d.system_name?.trim() || d.processing_purposes?.trim());

  const bFilled = !!(p.necessity_justification?.trim() && p.proportionality_checks.some(c => c.status));
  const bPartial = !!(p.necessity_justification?.trim() || p.proportionality_checks.some(c => c.status));

  const cFilled = r.threats.length >= 2;
  const cPartial = r.threats.length >= 1;

  const dFilled = !!(m.technical_measures?.trim() || m.organizational_measures?.trim());
  const dPartial = !!(m.technical_measures?.trim() || m.organizational_measures?.trim());

  return {
    a: aFilled ? "covered" : aPartial ? "partial" : "missing",
    b: bFilled ? "covered" : bPartial ? "partial" : "missing",
    c: cFilled ? "covered" : cPartial ? "partial" : "missing",
    d: dFilled ? "covered" : dPartial ? "partial" : "missing",
  };
}

// ─── Funzione principale ─────────────────────────────────────────────────────
// `t`: translator del namespace toolDpia. Opzionale: se assente, ripiega sulle
// chiavi (le label mostrano la chiave) — i chiamanti (componenti React) passano
// sempre il proprio `useT("toolDpia")`.

export function computeDpiaProgress(doc: DPIAResult, t: TFn = (k) => k): DpiaDocProgress {
  const steps: DpiaStepProgress[] = [
    step0(doc, t),
    step1(doc, t),
    step2(doc, t),
    step3(doc, t),
    step4(doc, t),
    step5(doc, t),
  ];

  const overallPercent = Math.round(
    steps.reduce((acc, s) => acc + (s.percent * s.weight) / 100, 0)
  );

  const art35Coverage = computeArt35Coverage(doc);

  const blockingGaps: string[] = [];
  if (art35Coverage.a === "missing") blockingGaps.push(t("dpp_gapA"));
  if (art35Coverage.b === "missing") blockingGaps.push(t("dpp_gapB"));
  if (art35Coverage.c === "missing") blockingGaps.push(t("dpp_gapC"));
  if (art35Coverage.d === "missing") blockingGaps.push(t("dpp_gapD"));

  const art36Required = doc.measures.prior_consultation_required ||
    doc.measures.overall_risk_after === "high";

  return { overallPercent, steps, art35Coverage, art36Required, blockingGaps };
}
