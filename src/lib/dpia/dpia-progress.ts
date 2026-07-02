// Calcoli derivati della DPIA: completezza per step, copertura Art. 35(7),
// alert consultazione preventiva Art. 36.
// Solo calcoli locali — nessuna chiamata AI, nessun salvataggio.
import type { DPIAResult } from "@/lib/dossier/storage-schema";
import { DPIA_STEPS } from "./dpia-template";

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

function countField(label: string, count: number, required = true): DpiaStepField {
  return { label, value: count > 0 ? `${count} elementi` : "", filled: count > 0, required };
}

// ─── Step 0 — Screening ───────────────────────────────────────────────────────

function step0(doc: DPIAResult): DpiaStepProgress {
  const sc = doc.screening;
  const assessed = sc.criteria.filter(c => c.applies !== "").length;
  const total = sc.criteria.length || 9;

  const fields: DpiaStepField[] = [
    countField("Criteri WP248 valutati", assessed),
    field("Conclusione screening", sc.dpia_required === "yes" ? "DPIA richiesta" : sc.dpia_required === "no" ? "DPIA non richiesta" : sc.dpia_required === "uncertain" ? "Incerto" : ""),
    field("Giustificazione (se DPIA non richiesta)", sc.justification_if_no_dpia, sc.dpia_required === "no"),
  ];
  const filled = fields.filter(f => f.filled).length;
  const req = fields.filter(f => f.required).length;

  return {
    ...DPIA_STEPS[0],
    weight: 10,
    percent: pct(fields.filter(f => f.required && f.filled).length, req),
    detail: `${assessed}/${total} criteri valutati · DPIA: ${sc.dpia_required || "n.d."}`,
    fields,
  };
}

// ─── Step 1 — Descrizione (Art. 35(7)(a)) ─────────────────────────────────────

function step1(doc: DPIAResult): DpiaStepProgress {
  const d = doc.description;
  const fields: DpiaStepField[] = [
    field("Nome sistema / titolare", d.system_name),
    field("Organizzazione", d.organization_name, false),
    field("Titolare del trattamento", d.controller_name, false),
    field("DPO", d.dpo_name, false),
    field("DPO consultato", d.dpo_consulted ? (d.dpo_consulted === "yes" ? "Sì" : d.dpo_consulted === "no" ? "No" : "") : ""),
    field("Finalità del trattamento", d.processing_purposes),
    field("Categorie di dati personali", d.personal_data_categories),
    field("Categorie speciali (Art. 9)", d.special_categories, false),
    field("Categorie di interessati", d.data_subjects_categories),
    field("Destinatari", d.recipients, false),
    field("Periodo di conservazione", d.retention_period, false),
    countField("Asset del trattamento", d.assets.length, false),
    field("Trasferimenti internazionali", d.processor_involved === "yes" ? `Processor: ${d.processor_name || "n.d."}` : "", false),
  ];
  const req = fields.filter(f => f.required);
  return {
    ...DPIA_STEPS[1],
    weight: 20,
    percent: pct(req.filter(f => f.filled).length, req.length),
    detail: `${req.filter(f => f.filled).length}/${req.length} campi obbligatori compilati`,
    fields,
  };
}

// ─── Step 2 — Necessità / Proporzionalità (Art. 35(7)(b)) ────────────────────

function step2(doc: DPIAResult): DpiaStepProgress {
  const p = doc.proportionality;
  const propTotal = p.proportionality_checks.length;
  const propDone = p.proportionality_checks.filter(c => c.status !== "" && c.status !== undefined).length;
  const rightsTotal = p.rights_checks.length;
  const rightsDone = p.rights_checks.filter(c => c.applicable !== "" && c.applicable !== undefined).length;

  const fields: DpiaStepField[] = [
    field("Giustificazione di necessità", p.necessity_justification),
    { label: "Principi di proporzionalità", value: propTotal > 0 ? `${propDone}/${propTotal} verificati` : "", filled: propDone > 0, required: true },
    { label: "Diritti degli interessati (Artt. 12–22)", value: rightsTotal > 0 ? `${rightsDone}/${rightsTotal} valutati` : "", filled: rightsDone > 0, required: false },
    field("Clausole processor Art. 28", p.processor_clauses_art28 ? (p.processor_clauses_art28 === "yes" ? "Sì" : p.processor_clauses_art28 === "no" ? "No" : "N/A") : "", false),
    field("Trasferimenti internazionali", p.international_transfers ? (p.international_transfers === "yes" ? `Sì — ${p.international_transfers_safeguards || "garanzie n.d."}` : "No") : "", false),
  ];
  const req = fields.filter(f => f.required);
  return {
    ...DPIA_STEPS[2],
    weight: 20,
    percent: pct(req.filter(f => f.filled).length, req.length),
    detail: `Necessità: ${p.necessity_justification ? "✓" : "—"} · Proporzionalità: ${propDone}/${propTotal}`,
    fields,
  };
}

// ─── Step 3 — Rischi (Art. 35(7)(c)) ─────────────────────────────────────────

function step3(doc: DPIAResult): DpiaStepProgress {
  const r = doc.risks;
  const threats = r.threats;
  const withMit = threats.filter(t => t.mitigation?.trim());
  const highNoMit = threats.filter(t => t.risk_level === "high" && !t.mitigation?.trim());

  const fields: DpiaStepField[] = [
    countField("Minacce identificate (WP248)", threats.length),
    { label: "Minacce con misura di mitigazione", value: threats.length > 0 ? `${withMit.length}/${threats.length}` : "", filled: threats.length > 0 && withMit.length > 0, required: false },
    { label: "Minacce alte senza mitigazione", value: highNoMit.length > 0 ? `⚠ ${highNoMit.length} da risolvere` : threats.length > 0 ? "✓ nessuna" : "", filled: highNoMit.length === 0 && threats.length > 0, required: false },
    field("Rischio complessivo pre-misure", r.overall_risk_before || ""),
  ];
  const req = fields.filter(f => f.required);
  return {
    ...DPIA_STEPS[3],
    weight: 25,
    percent: threats.length === 0 ? 0 : pct(
      (threats.length > 0 ? 1 : 0) + (r.overall_risk_before ? 1 : 0),
      2
    ),
    detail: `${threats.length} minacce · ${highNoMit.length} alte senza mitigazione`,
    fields,
  };
}

// ─── Step 4 — Misure (Art. 35(7)(d)) ─────────────────────────────────────────

function step4(doc: DPIAResult): DpiaStepProgress {
  const m = doc.measures;
  const fields: DpiaStepField[] = [
    field("Misure tecniche", m.technical_measures),
    field("Misure organizzative", m.organizational_measures),
    field("Rischio residuo complessivo", m.overall_risk_after || ""),
    field("Consultazione preventiva (Art. 36)", m.prior_consultation_required ? `Richiesta — ${m.prior_consultation_authority || "autorità n.d."}` : "Non richiesta", false),
    field("Pianificazione riesame", m.review_schedule, false),
    field("Trigger revisione", m.review_trigger, false),
  ];
  const req = fields.filter(f => f.required);
  return {
    ...DPIA_STEPS[4],
    weight: 15,
    percent: pct(req.filter(f => f.filled).length, req.length),
    detail: `Misure: ${m.technical_measures ? "✓T" : "—T"} ${m.organizational_measures ? "✓O" : "—O"} · Rischio post: ${m.overall_risk_after || "n.d."}`,
    fields,
  };
}

// ─── Step 5 — Conclusione ────────────────────────────────────────────────────

function step5(doc: DPIAResult): DpiaStepProgress {
  const c = doc.conclusion;
  const fields: DpiaStepField[] = [
    field("Decisione di conformità", c.compliant ? (c.compliant === "yes" ? "Conforme" : c.compliant === "no" ? "Non conforme" : c.compliant === "conditional" ? "Condizionalmente conforme" : "") : ""),
    field("Condizioni / provvedimenti", c.conditions, c.compliant === "conditional"),
    field("Sintesi esecutiva", c.summary),
    field("Data prossimo riesame", c.next_review_date, false),
    field("Completata il", c.completedAt, false),
  ];
  const req = fields.filter(f => f.required);
  return {
    ...DPIA_STEPS[5],
    weight: 10,
    percent: pct(req.filter(f => f.filled).length, req.length),
    detail: c.compliant ? `Esito: ${c.compliant}` : "Conclusione non compilata",
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

export function computeDpiaProgress(doc: DPIAResult): DpiaDocProgress {
  const steps: DpiaStepProgress[] = [
    step0(doc),
    step1(doc),
    step2(doc),
    step3(doc),
    step4(doc),
    step5(doc),
  ];

  const overallPercent = Math.round(
    steps.reduce((acc, s) => acc + (s.percent * s.weight) / 100, 0)
  );

  const art35Coverage = computeArt35Coverage(doc);

  const blockingGaps: string[] = [];
  if (art35Coverage.a === "missing") blockingGaps.push("Descrizione sistematica mancante (Art. 35(7)(a))");
  if (art35Coverage.b === "missing") blockingGaps.push("Necessità/proporzionalità non valutate (Art. 35(7)(b))");
  if (art35Coverage.c === "missing") blockingGaps.push("Nessuna minaccia identificata (Art. 35(7)(c))");
  if (art35Coverage.d === "missing") blockingGaps.push("Misure di sicurezza non documentate (Art. 35(7)(d))");

  const art36Required = doc.measures.prior_consultation_required ||
    doc.measures.overall_risk_after === "high";

  return { overallPercent, steps, art35Coverage, art36Required, blockingGaps };
}
