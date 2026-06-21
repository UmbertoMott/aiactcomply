// Stato della DPIA guidata (modalità chat 3-colonne).
// DpiaGuidedDoc è persistito sotto la chiave `dpiaGuided` di STORAGE_KEYS.
// La funzione mapGuidedToDPIA() lo sincronizza su DPIAResult via patchDPIA()
// in modo che DocuGen (ghost data) e il form a 6 step continuino a funzionare.

import type { DPIAResult, DPIAThreat } from "@/lib/dossier/storage-schema";

// ─── Risposta a un singolo sotto-punto ───────────────────────────────────────

export type DpiaAnswerSource = "manual" | "ai_suggested";
export type DpiaAnswerStatus = "empty" | "draft" | "done";

export interface DpiaAnswer {
  value: string;
  source: DpiaAnswerSource;
  aiConfirmed: boolean;
  status: DpiaAnswerStatus;
  updatedAt: string;
}

// ─── Documento guidato completo ───────────────────────────────────────────────

export interface DpiaGuidedDoc {
  answers: Record<string, DpiaAnswer>;
  currentSubPointId: string | null;
  inputHash: string | null;   // hash dei dati shared al momento del sign-off → staleness
  startedAt: string;
  completedAt: string | null;
}

export function createEmptyGuidedDoc(): DpiaGuidedDoc {
  return {
    answers: {},
    currentSubPointId: "sc_c1",
    inputHash: null,
    startedAt: new Date().toISOString(),
    completedAt: null,
  };
}

export function emptyAnswer(source: DpiaAnswerSource = "manual"): DpiaAnswer {
  return { value: "", source, aiConfirmed: false, status: "empty", updatedAt: new Date().toISOString() };
}

// ─── Mapper: DpiaGuidedDoc → DPIAResult ─────────────────────────────────────
// Chiamato dopo ogni conferma per tenere DPIAResult sempre aggiornato.

function val(doc: DpiaGuidedDoc, id: string): string {
  const a = doc.answers[id];
  return (a?.status === "done" || a?.status === "draft") ? a.value : "";
}

function criterionApplies(answer: string): "yes" | "no" | "partial" | "" {
  const lc = answer.toLowerCase();
  if (!answer) return "";
  if (lc.startsWith("sì") || lc.startsWith("si —") || lc.startsWith("si-")) return "yes";
  if (lc.startsWith("no") || lc.startsWith("no —")) return "no";
  if (lc.startsWith("parzialmente") || lc.startsWith("partial")) return "partial";
  return "yes";
}

function buildThreat(
  id: string,
  category: DPIAThreat["category"],
  answerText: string,
): DPIAThreat {
  const lc = answerText.toLowerCase();
  const likelihood: DPIAThreat["likelihood"] =
    lc.includes("probabilità: alta") || lc.includes("probabilità: alto") ? "high"
    : lc.includes("probabilità: bassa") || lc.includes("probabilità: basso") ? "low"
    : "medium";
  const severity: DPIAThreat["severity"] =
    lc.includes("impatto: alto") || lc.includes("impatto: alta") ? "high"
    : lc.includes("impatto: basso") || lc.includes("impatto: bassa") ? "low"
    : "medium";
  const risk_level: DPIAThreat["risk_level"] =
    lc.includes("rischio: alto") || lc.includes("rischio iniziale: alto") ? "high"
    : lc.includes("rischio: basso") || lc.includes("rischio iniziale: basso") ? "low"
    : "medium";
  return {
    id, category,
    source: "guided-chat",
    description: answerText,
    likelihood, severity, risk_level,
    mitigation: "",
    residual_likelihood: "low",
    residual_severity: "low",
    residual_risk: "low",
  };
}

function overallRisk(answer: string): "high" | "medium" | "low" | "" {
  const lc = answer.toLowerCase();
  if (!answer) return "";
  if (lc.includes("alto") || lc.includes("high")) return "high";
  if (lc.includes("basso") || lc.includes("low")) return "low";
  if (lc.includes("medio") || lc.includes("medium")) return "medium";
  return "";
}

function yesNo(answer: string): "yes" | "no" | "" {
  if (!answer) return "";
  const lc = answer.toLowerCase();
  if (lc.startsWith("sì") || lc.startsWith("si") || lc.startsWith("yes")) return "yes";
  if (lc.startsWith("no")) return "no";
  return "yes";
}

function yesNoNa(answer: string): "yes" | "no" | "na" | "" {
  if (!answer) return "";
  const lc = answer.toLowerCase();
  if (lc.includes("n/a") || lc.includes("non applicabile")) return "na";
  if (lc.startsWith("sì") || lc.startsWith("si") || lc.startsWith("yes")) return "yes";
  if (lc.startsWith("no")) return "no";
  return "yes";
}

function compliantStatus(answer: string): "yes" | "no" | "conditional" | "" {
  if (!answer) return "";
  const lc = answer.toLowerCase();
  if (lc.includes("condizion")) return "conditional";
  if (lc.includes("non confor") || lc.includes("not conform")) return "no";
  return "yes";
}

const WP248_CRITERION_IDS = ["c1","c2","c3","c4","c5","c6","c7","c8","c9"];

export function mapGuidedToDPIA(guided: DpiaGuidedDoc): Partial<DPIAResult> {
  const v = (id: string) => val(guided, id);

  // — Screening —
  const criteria = WP248_CRITERION_IDS.map((cid, idx) => {
    const ans = v(`sc_${cid}`);
    return {
      id: cid,
      label: `Criterio WP248 §${idx + 1}`,
      description: "",
      applies: criterionApplies(ans),
      notes: ans,
    };
  });
  const metCount = criteria.filter(c => c.applies === "yes" || c.applies === "partial").length;

  // — Threats —
  const threats: DPIAThreat[] = [];
  const tAccess = v("c_threat_access");
  const tMod    = v("c_threat_modification");
  const tDisap  = v("c_threat_disappearance");
  if (tAccess) threats.push(buildThreat("guided-access", "illegitimate_access", tAccess));
  if (tMod)    threats.push(buildThreat("guided-mod", "unwanted_modification", tMod));
  if (tDisap)  threats.push(buildThreat("guided-disap", "data_disappearance", tDisap));

  return {
    screening: {
      criteria,
      criteria_met_count: metCount,
      dpia_required: metCount >= 2 ? "yes" : metCount === 1 ? "uncertain" : "no",
      justification_if_no_dpia: "",
    },
    description: {
      system_name:           v("a_system_name"),
      organization_name:     v("a_organization"),
      controller_name:       v("a_system_name"),
      dpo_name:              v("a_dpo"),
      dpo_consulted:         v("a_dpo") ? "yes" : "",
      dpo_opinion:           v("d_dpo_opinion"),
      processor_involved:    v("a_processor") ? "yes" : "",
      processor_name:        v("a_processor"),
      processing_purposes:   v("a_processing_purposes"),
      personal_data_categories: v("a_personal_data_categories"),
      special_categories:    v("a_special_categories"),
      data_subjects_categories: v("a_data_subjects_categories"),
      recipients:            v("a_recipients"),
      retention_period:      v("a_retention_period"),
      assets:                [],
      codes_of_conduct:      "",
      certifications:        "",
      data_subjects_opinions: v("d_data_subjects_opinions") ? "collected" : "",
      data_subjects_opinions_justification: "",
      data_subjects_opinions_details: v("d_data_subjects_opinions"),
    },
    proportionality: {
      necessity_justification: v("b_necessity"),
      proportionality_checks: [
        { id: "lawful_basis",     principle: "Base giuridica",        description: v("b_lawful_basis"),        status: v("b_lawful_basis") ? "compliant" : "", notes: "" },
        { id: "data_min",         principle: "Minimizzazione",         description: v("b_data_minimisation"),   status: v("b_data_minimisation") ? "compliant" : "", notes: "" },
        { id: "storage_lim",      principle: "Limitazione conservazione", description: v("b_storage_limitation"), status: v("b_storage_limitation") ? "compliant" : "", notes: "" },
        { id: "proportionality",  principle: "Proporzionalità",        description: v("b_proportionality"),     status: v("b_proportionality") ? "compliant" : "", notes: "" },
      ],
      rights_checks: [],
      processor_clauses_art28: yesNoNa(v("b_processor_clauses")),
      international_transfers: yesNo(v("b_international_transfers")),
      international_transfers_safeguards: v("b_international_transfers"),
    },
    risks: {
      threats,
      overall_risk_before: overallRisk(v("c_overall_risk_before")),
    },
    measures: {
      technical_measures:       v("c_technical_measures"),
      organizational_measures:  v("c_organizational_measures"),
      overall_risk_after:       overallRisk(v("d_overall_risk_after")),
      prior_consultation_required: yesNo(v("d_prior_consultation")) === "yes",
      prior_consultation_authority: "",
      prior_consultation_date:  "",
      review_schedule:          v("d_review_schedule"),
      review_trigger:           "",
    },
    conclusion: {
      compliant:        compliantStatus(v("e_compliant")),
      conditions:       v("e_conditions"),
      summary:          v("e_summary"),
      next_review_date: v("e_next_review_date"),
      completedAt:      guided.completedAt ?? "",
    },
  };
}
