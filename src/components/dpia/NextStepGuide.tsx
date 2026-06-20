"use client";

import { useState } from "react";
import type { DPIAResult } from "@/lib/dossier/storage-schema";
import type { DpiaGapCheck } from "@/app/actions/checkDpiaGaps";
import { draftDpiaNextStepRationale } from "@/app/actions/draftDpiaNextStepRationale";

// ─── Design tokens (aligned with FRIA) ───────────────────────────────────────
const T = {
  text:     "#0D1016",
  muted:    "rgba(0,0,0,0.42)",
  faint:    "rgba(0,0,0,0.28)",
  border:   "rgba(0,0,0,0.08)",
  card:     "#ffffff",
  bg:       "#f8f8f7",
  red:      "#dc2626",
  redBg:    "rgba(220,38,38,0.06)",
  redBdr:   "rgba(220,38,38,0.18)",
  amber:    "#d97706",
  amberBg:  "rgba(202,138,4,0.06)",
  amberBdr: "rgba(202,138,4,0.2)",
  green:    "#16a34a",
  greenBg:  "rgba(22,163,74,0.06)",
  greenBdr: "rgba(22,163,74,0.2)",
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────
type StepKey =
  | "0_screening"
  | "1_description"
  | "1_dpo"
  | "2_necessity"
  | "2_proportionality"
  | "3_threats"
  | "3_mitigations"
  | "3_gap_check"
  | "3_gap_fix"
  | "4_measures"
  | "4_prior_consultation"
  | "5_conclusion"
  | "complete";

interface NextStepDef {
  key: StepKey;
  targetStep: number;
  title: string;
  description: string;
  ctaLabel: string;
}

// ─── Step definitions ─────────────────────────────────────────────────────────
const STEP_DEFS: Record<StepKey, NextStepDef> = {
  "0_screening": {
    key: "0_screening", targetStep: 0,
    title: "Completa lo screening WP248",
    description: "Nessun criterio di screening valutato. Indica quali criteri WP248 si applicano al tuo trattamento.",
    ctaLabel: "Vai a Step 0 — Screening",
  },
  "1_description": {
    key: "1_description", targetStep: 1,
    title: "Descrivi il trattamento",
    description: "Nome sistema, finalità e categorie di dati sono obbligatori per procedere alla valutazione.",
    ctaLabel: "Vai a Step 1 — Descrizione",
  },
  "1_dpo": {
    key: "1_dpo", targetStep: 1,
    title: "Documenta la consultazione del DPO",
    description: "Indica se il DPO è stato consultato (Art. 35(2) GDPR). La consultazione è obbligatoria dove designato.",
    ctaLabel: "Vai a Step 1 — Descrizione",
  },
  "2_necessity": {
    key: "2_necessity", targetStep: 2,
    title: "Documenta la necessità del trattamento",
    description: "Nessuna giustificazione di necessità/proporzionalità inserita (Art. 35(7)(b) GDPR).",
    ctaLabel: "Vai a Step 2 — Necessità",
  },
  "2_proportionality": {
    key: "2_proportionality", targetStep: 2,
    title: "Verifica i principi di proporzionalità",
    description: "Alcuni principi GDPR Art. 5 non sono ancora stati valutati. Completa i check di proporzionalità.",
    ctaLabel: "Vai a Step 2 — Necessità",
  },
  "3_threats": {
    key: "3_threats", targetStep: 3,
    title: "Identifica le minacce al trattamento",
    description: "Nessuna minaccia WP248 definita. Usa il catalogo per selezionare le minacce applicabili (Art. 35(7)(c)).",
    ctaLabel: "Vai a Step 3 — Rischi",
  },
  "3_mitigations": {
    key: "3_mitigations", targetStep: 3,
    title: "Definisci le misure di mitigazione per le minacce ad alto rischio",
    description: "Alcune minacce ad alto rischio non hanno ancora una misura di mitigazione associata.",
    ctaLabel: "Vai a Step 3 — Rischi",
  },
  "3_gap_check": {
    key: "3_gap_check", targetStep: 4,
    title: "Esegui il gap-check Art. 35(7)",
    description: "Verifica la copertura di tutti gli elementi obbligatori prima di definire le misure finali.",
    ctaLabel: "Vai a Step 4 — Misure",
  },
  "3_gap_fix": {
    key: "3_gap_fix", targetStep: 3,
    title: "Colma i gap normativi rilevati",
    description: "Il gap-check ha trovato elementi incompleti o mancanti rispetto all'Art. 35(7) GDPR.",
    ctaLabel: "Vai a Step 3 — Rischi",
  },
  "4_measures": {
    key: "4_measures", targetStep: 4,
    title: "Documenta le misure di sicurezza",
    description: "Nessuna misura tecnica o organizzativa documentata (Art. 35(7)(d) GDPR).",
    ctaLabel: "Vai a Step 4 — Misure",
  },
  "4_prior_consultation": {
    key: "4_prior_consultation", targetStep: 4,
    title: "Pianifica la consultazione preventiva (Art. 36)",
    description: "Il rischio residuo rimane alto. La consultazione preventiva dell'autorità di controllo è obbligatoria.",
    ctaLabel: "Vai a Step 4 — Misure",
  },
  "5_conclusion": {
    key: "5_conclusion", targetStep: 5,
    title: "Prendi la decisione finale di compliance",
    description: "Documenta la conclusione DPIA (conforme / condizionalmente conforme / non conforme) e la sintesi esecutiva.",
    ctaLabel: "Vai a Step 5 — Conclusione",
  },
  "complete": {
    key: "complete", targetStep: 5,
    title: "DPIA completata",
    description: "Tutti i passi obbligatori sono stati completati. Puoi procedere con firma e archiviazione.",
    ctaLabel: "Vai a Step 5 — Conclusione",
  },
};

// ─── State machine ────────────────────────────────────────────────────────────
function computeNextStep(doc: DPIAResult, gapCheck: DpiaGapCheck | null | undefined): StepKey {
  const sc = doc.screening;
  const d = doc.description;
  const p = doc.proportionality;
  const r = doc.risks;
  const m = doc.measures;
  const c = doc.conclusion;

  // Step 0: Screening
  const anyCriteriaSet = sc.criteria.some(cr => cr.applies !== "");
  if (!anyCriteriaSet) return "0_screening";

  // Step 1: Description
  if (!d.system_name?.trim() || !d.processing_purposes?.trim() || !d.personal_data_categories?.trim()) return "1_description";
  if (!d.dpo_consulted) return "1_dpo";

  // Step 2: Necessity / Proportionality
  if (!p.necessity_justification?.trim()) return "2_necessity";
  const unassessedProps = p.proportionality_checks.filter(pc => !pc.status).length;
  if (unassessedProps > 0) return "2_proportionality";

  // Step 3: Risks / Threats
  if (r.threats.length === 0) return "3_threats";
  const highThreatsWithoutMit = r.threats.filter(t => t.risk_level === "high" && !t.mitigation?.trim());
  if (highThreatsWithoutMit.length > 0) return "3_mitigations";

  // Step 3→4: Gap check
  if (!gapCheck) return "3_gap_check";
  const hasGaps = gapCheck.items.some(i => i.status === "missing" || i.status === "incomplete");
  if (hasGaps) return "3_gap_fix";

  // Step 4: Measures
  if (!m.technical_measures?.trim() && !m.organizational_measures?.trim()) return "4_measures";
  if (m.prior_consultation_required && !m.prior_consultation_authority?.trim()) return "4_prior_consultation";

  // Step 5: Conclusion
  if (!c.compliant || !c.summary?.trim()) return "5_conclusion";

  return "complete";
}

// ─── DPIA summary for AI rationale ───────────────────────────────────────────
function buildDpiaSummary(doc: DPIAResult): string {
  return JSON.stringify({
    systemName: doc.description.system_name,
    dpiaRequired: doc.screening.dpia_required,
    criteriaMet: doc.screening.criteria_met_count,
    hasPurposes: !!(doc.description.processing_purposes?.trim()),
    hasDataCategories: !!(doc.description.personal_data_categories?.trim()),
    dpoConsulted: doc.description.dpo_consulted,
    hasNecessityJustification: !!(doc.proportionality.necessity_justification?.trim()),
    propChecksCompleted: doc.proportionality.proportionality_checks.filter(p => !!p.status).length,
    propChecksTotal: doc.proportionality.proportionality_checks.length,
    threatsCount: doc.risks.threats.length,
    highThreatsWithoutMit: doc.risks.threats.filter(t => t.risk_level === "high" && !t.mitigation?.trim()).length,
    overallRiskBefore: doc.risks.overall_risk_before,
    hasTechnicalMeasures: !!(doc.measures.technical_measures?.trim()),
    hasOrgMeasures: !!(doc.measures.organizational_measures?.trim()),
    priorConsultationRequired: doc.measures.prior_consultation_required,
    priorConsultationPlanned: !!(doc.measures.prior_consultation_authority?.trim()),
    conclusionCompliant: doc.conclusion.compliant,
    hasSummary: !!(doc.conclusion.summary?.trim()),
  });
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface NextStepGuideProps {
  dpia: DPIAResult;
  gapCheck?: DpiaGapCheck | null;
  onNavigateToStep?: (step: number) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function NextStepGuide({ dpia, gapCheck, onNavigateToStep }: NextStepGuideProps) {
  const [rationale, setRationale] = useState<string | null>(null);
  const [loadingRationale, setLoadingRationale] = useState(false);
  const [rationaleError, setRationaleError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [lastStepKey, setLastStepKey] = useState<StepKey | null>(null);

  const stepKey = computeNextStep(dpia, gapCheck);
  const step = STEP_DEFS[stepKey];

  // Reset rationale when step changes
  if (stepKey !== lastStepKey) {
    setLastStepKey(stepKey);
    setRationale(null);
    setRationaleError(null);
  }

  async function handleFetchRationale() {
    setLoadingRationale(true);
    setRationaleError(null);
    const r = await draftDpiaNextStepRationale({
      stepKey,
      stepTitle: step.title,
      systemName: dpia.description.system_name || "Sistema",
      dpiaSummary: buildDpiaSummary(dpia),
    });
    setLoadingRationale(false);
    if ("error" in r) { setRationaleError(r.error); return; }
    setRationale(r.rationale);
  }

  // ─── Complete state ───────────────────────────────────────────────────────
  if (stepKey === "complete") {
    return (
      <div style={{
        background: T.greenBg, border: `1px solid ${T.greenBdr}`,
        borderRadius: 10, padding: "14px 20px", marginTop: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: T.green }}>✓ DPIA completata</span>
          <span style={{ fontSize: 11, color: T.green }}>Tutti i passi obbligatori completati</span>
        </div>
      </div>
    );
  }

  // ─── Dismissed state ──────────────────────────────────────────────────────
  if (dismissed) {
    return (
      <div style={{ padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 8, marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 11, color: T.faint }}>Suggerimento prossimo passo nascosto</span>
        <button onClick={() => setDismissed(false)} style={{ fontSize: 11, color: T.muted, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Mostra</button>
      </div>
    );
  }

  // ─── Main card ────────────────────────────────────────────────────────────
  return (
    <div style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: 10,
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      padding: "16px 20px",
      marginTop: 16,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
          Prossimo passo consigliato
        </span>
        <span style={{
          fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 9999,
          background: T.amberBg, border: `1px solid ${T.amberBdr}`, color: T.amber,
        }}>
          Step {step.targetStep}
        </span>
      </div>

      {/* Step title & description */}
      <p style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: "0 0 4px" }}>
        {step.title}
      </p>
      <p style={{ fontSize: 12, color: T.muted, margin: "0 0 14px", lineHeight: 1.5 }}>
        {step.description}
      </p>

      {/* AI rationale section */}
      {!rationale && !rationaleError && (
        <button
          onClick={handleFetchRationale}
          disabled={loadingRationale}
          style={{
            fontSize: 11, fontWeight: 500, padding: "4px 10px", borderRadius: 6,
            border: `1px solid ${T.border}`, background: T.bg,
            color: loadingRationale ? T.faint : T.muted,
            cursor: loadingRationale ? "default" : "pointer",
            marginBottom: 14,
          }}
        >
          {loadingRationale ? "⟳ Generazione…" : "✦ Spiega perché"}
        </button>
      )}

      {rationaleError && (
        <div style={{ fontSize: 11, color: T.red, marginBottom: 14, padding: "6px 10px", background: T.redBg, border: `1px solid ${T.redBdr}`, borderRadius: 6 }}>
          {rationaleError}
        </div>
      )}

      {rationale && (
        <div style={{ marginBottom: 14, padding: "10px 12px", background: T.amberBg, border: `1px solid ${T.amberBdr}`, borderRadius: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: T.amber, background: "rgba(202,138,4,0.10)", padding: "2px 7px", borderRadius: 9999 }}>
              ✦ AI — verifica e conferma
            </span>
          </div>
          <p style={{ fontSize: 12, color: T.text, margin: 0, lineHeight: 1.6 }}>
            {rationale}
          </p>
        </div>
      )}

      {/* Actions row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={() => onNavigateToStep?.(step.targetStep)}
          style={{
            fontSize: 12, fontWeight: 600, padding: "7px 16px", borderRadius: 8,
            border: "none", background: T.text, color: "#fff",
            cursor: "pointer",
          }}
        >
          → {step.ctaLabel}
        </button>
        <button
          onClick={() => setDismissed(true)}
          style={{ fontSize: 11, color: T.faint, background: "none", border: "none", cursor: "pointer" }}
        >
          Ignora per ora
        </button>
      </div>
    </div>
  );
}
