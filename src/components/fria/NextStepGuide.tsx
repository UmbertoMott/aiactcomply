"use client";

import { useState } from "react";
import type { FRIADocument } from "@/lib/simulation/fria-engine";
import type { FriaGapCheck } from "@/app/actions/checkFriaGaps";
import { draftNextStepRationale } from "@/app/actions/draftNextStepRationale";

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  text: "#0D1016", muted: "rgba(0,0,0,0.42)", faint: "rgba(0,0,0,0.28)",
  border: "rgba(0,0,0,0.08)", card: "#ffffff", bg: "#f8f8f7",
  red: "#dc2626", redBg: "rgba(220,38,38,0.06)", redBdr: "rgba(220,38,38,0.2)",
  amber: "#d97706", amberBg: "rgba(202,138,4,0.06)", amberBdr: "rgba(202,138,4,0.2)",
  green: "#16a34a", greenBg: "rgba(22,163,74,0.06)", greenBdr: "rgba(22,163,74,0.2)",
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────
type StepKey =
  | "1_base"
  | "1_context"
  | "1_governance"
  | "2_scenarios"
  | "2_severity"
  | "2_mitigations"
  | "3_gap_check"
  | "3_gap_fix"
  | "3_decision"
  | "3_public_summary"
  | "4_monitoring"
  | "5_stakeholders"
  | "complete";

interface NextStepDef {
  key: StepKey;
  phase: "1" | "2" | "3" | "4" | "5" | "done";
  title: string;
  description: string;
  ctaLabel: string;
}

// ─── Step definitions ─────────────────────────────────────────────────────────
const STEP_DEFS: Record<StepKey, NextStepDef> = {
  "1_base": {
    key: "1_base", phase: "1",
    title: "Inserisci i dati base del sistema",
    description: "Nome sistema e organizzazione sono obbligatori per procedere.",
    ctaLabel: "Vai a Fase 1 — Contesto",
  },
  "1_context": {
    key: "1_context", phase: "1",
    title: "Completa l'analisi di contesto",
    description: "Descrivi la tecnologia, le finalità e le categorie di persone interessate.",
    ctaLabel: "Vai a Fase 1 — Contesto",
  },
  "1_governance": {
    key: "1_governance", phase: "1",
    title: "Documenta la sorveglianza umana",
    description: "Indica il responsabile della supervisione umana del sistema (Art. 27(1)(e)).",
    ctaLabel: "Vai a Fase 1 — Contesto",
  },
  "2_scenarios": {
    key: "2_scenarios", phase: "2",
    title: "Aggiungi il primo scenario di impatto",
    description: "Nessuno scenario definito. Seleziona i diritti fondamentali potenzialmente impattati.",
    ctaLabel: "Vai a Fase 2 — Diritti e scenari",
  },
  "2_severity": {
    key: "2_severity", phase: "2",
    title: "Valuta la severità degli impatti sui diritti",
    description: "Alcuni diritti selezionati non hanno ancora una valutazione di severità completa.",
    ctaLabel: "Vai a Fase 2 — Diritti e scenari",
  },
  "2_mitigations": {
    key: "2_mitigations", phase: "2",
    title: "Definisci le misure di mitigazione",
    description: "Alcuni impatti ad alto rischio non hanno ancora misure di mitigazione associate.",
    ctaLabel: "Vai a Fase 2 — Diritti e scenari",
  },
  "3_gap_check": {
    key: "3_gap_check", phase: "3",
    title: "Esegui il gap-check Art. 27",
    description: "Verifica la copertura di tutti gli elementi obbligatori prima di prendere la decisione.",
    ctaLabel: "Vai a Fase 3 — Decisione",
  },
  "3_gap_fix": {
    key: "3_gap_fix", phase: "3",
    title: "Colma i gap normativi rilevati",
    description: "Il gap-check ha trovato elementi incompleti o mancanti rispetto all'Art. 27.",
    ctaLabel: "Vai a Fase 3 — Decisione",
  },
  "3_decision": {
    key: "3_decision", phase: "3",
    title: "Prendi la decisione di deployment",
    description: "Documenta la raccomandazione (deploy / con condizioni / non deployare).",
    ctaLabel: "Vai a Fase 3 — Decisione",
  },
  "3_public_summary": {
    key: "3_public_summary", phase: "3",
    title: "Redigi la sintesi pubblica Art. 27",
    description: "La decisione è presa: documenta la sintesi pubblica obbligatoria.",
    ctaLabel: "Vai a Fase 3 — Decisione",
  },
  "4_monitoring": {
    key: "4_monitoring", phase: "4",
    title: "Definisci il piano di monitoraggio",
    description: "Nessun elemento di monitoraggio post-deployment definito (Step 4.2 DIHR).",
    ctaLabel: "Vai a Fase 4 — Monitoraggio",
  },
  "5_stakeholders": {
    key: "5_stakeholders", phase: "5",
    title: "Identifica gli stakeholder da consultare",
    description: "Nessuno stakeholder registrato. La consultazione è parte integrante della FRIA.",
    ctaLabel: "Vai a Fase 5 — Stakeholder",
  },
  "complete": {
    key: "complete", phase: "done",
    title: "FRIA completata",
    description: "Tutti i passi obbligatori sono stati completati. Puoi procedere con firma e archiviazione.",
    ctaLabel: "Firma la FRIA",
  },
};

// ─── State machine ────────────────────────────────────────────────────────────
function computeNextStep(doc: FRIADocument, gapCheck: FriaGapCheck | null | undefined): StepKey {
  const ctx = doc.context;

  // Phase 1 checks
  if (!doc.system_name?.trim() || !doc.organization?.trim()) return "1_base";
  if (!ctx.technology_overview?.trim() || !ctx.affected_persons?.trim() || !ctx.intended_purpose_explanation?.trim()) return "1_context";
  if (!ctx.human_oversight_assigned?.trim()) return "1_governance";

  // Phase 2 checks
  if (doc.scenarios.length === 0) return "2_scenarios";

  // Check if any scenario has right_impacts with incomplete severity
  const allImpacts = doc.scenarios.flatMap(s => s.right_impacts);
  const hasUnassessedImpacts = allImpacts.some(ri => !ri.severity?.computed_severity);
  if (hasUnassessedImpacts || allImpacts.length === 0) return "2_severity";

  // Check for high/critical impacts without mitigations
  const highImpactsWithoutMit = allImpacts.filter(ri =>
    (ri.severity?.computed_severity === "high" || ri.severity?.computed_severity === "critical") &&
    ri.mitigations.length === 0
  );
  if (highImpactsWithoutMit.length > 0) return "2_mitigations";

  // Phase 3: gap-check
  if (!gapCheck) return "3_gap_check";
  const hasGaps = gapCheck.items.some(i => i.status === "missing" || i.status === "incomplete");
  if (hasGaps) return "3_gap_fix";
  if (!doc.deployment.recommendation) return "3_decision";
  if (!doc.deployment.public_summary?.trim()) return "3_public_summary";

  // Phase 4
  if (doc.monitoring.items.length === 0) return "4_monitoring";

  // Phase 5
  if (doc.stakeholders.length === 0) return "5_stakeholders";

  return "complete";
}

// ─── FRIA summary builder ─────────────────────────────────────────────────────
function buildFriaSummary(doc: FRIADocument): string {
  const allImpacts = doc.scenarios.flatMap(s => s.right_impacts);
  return JSON.stringify({
    systemName: doc.system_name,
    scenarios: doc.scenarios.length,
    rightImpacts: allImpacts.length,
    highCriticalWithoutMit: allImpacts.filter(ri =>
      (ri.severity?.computed_severity === "high" || ri.severity?.computed_severity === "critical") &&
      ri.mitigations.length === 0
    ).length,
    hasDeploymentRecommendation: !!doc.deployment.recommendation,
    hasPublicSummary: !!doc.deployment.public_summary?.trim(),
    monitoringItems: doc.monitoring.items.length,
    stakeholders: doc.stakeholders.length,
    contextComplete: !!(doc.context.technology_overview && doc.context.affected_persons),
  });
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface NextStepGuideProps {
  fria: FRIADocument;
  gapCheck?: FriaGapCheck | null;
  onNavigateToPhase?: (phase: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function NextStepGuide({ fria, gapCheck, onNavigateToPhase }: NextStepGuideProps) {
  const [rationale, setRationale] = useState<string | null>(null);
  const [loadingRationale, setLoadingRationale] = useState(false);
  const [rationaleError, setRationaleError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [lastStepKey, setLastStepKey] = useState<StepKey | null>(null);

  const stepKey = computeNextStep(fria, gapCheck);
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
    const r = await draftNextStepRationale({
      stepKey,
      stepTitle: step.title,
      systemName: fria.system_name || "Sistema AI",
      friaSummary: buildFriaSummary(fria),
    });
    setLoadingRationale(false);
    if ("error" in r) { setRationaleError(r.error); return; }
    setRationale(r.rationale);
  }

  // ─── Complete state ───────────────────────────────────────────────────────
  if (stepKey === "complete") {
    return (
      <div style={{ background: T.greenBg, border: `1px solid ${T.greenBdr}`, borderRadius: 10, padding: "14px 20px", marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: T.green }}>✓ FRIA completata</span>
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
          Fase {step.phase}
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
          onClick={() => onNavigateToPhase?.(step.phase)}
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
