"use client";

import SignOffPanel from "@/components/ui/SignOffPanel";
import {
  AlertTriangle,
  Shield,
  Plus,
  Trash2,
  TrendingUp,
  Calculator,
  Database,
  BarChart3,
  Activity,
  Zap,
  Gauge,
  FileWarning,
  CheckCircle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Save,
  Download,
  RefreshCw,
  Search,
  Eye,
} from "lucide-react";
import React, { useState, useEffect, useRef, useCallback, type Dispatch, type SetStateAction } from "react";
import {
  RiskItem,
  RiskCategory,
  Severity,
  Probability,
  ResidualRisk,
  MonteCarloInput,
  MonteCarloResult,
  DriftWindow,
  TemporalRecord,
  GPAIRiskAssessment,
  SanctionTracker,
  RiskManagerReport,
  computeRiskScore,
  computeOverallScore,
  computeOverallRating,
  runMonteCarlo,
  computePSI,
  detectDrift,
  createTemporalRecord,
  assessGPAI,
  getSanctionTracker,
  getSanctionSeverityColor,
  RISK_CATEGORY_LABELS,
  RESIDUAL_LABEL,
  createEmptyRiskReport,
  finalizeRiskReport,
  analyzeRiskDescription,
  validateResidualRisk,
  type RiskSuggestion,
  type ResidualWarning,
} from "@/lib/simulation/risk-manager-engine";
import { appendEvidence } from "@/lib/evidence/evidence-layer";
import AIOutputLabel from "@/components/disclosure/AIOutputLabel";
import { SystemContextBanner } from "@/components/compliance/SystemContextBanner";
import { writeToStorage } from "@/lib/dossier/storage-schema";
import type { RiskManagerResult } from "@/lib/dossier/storage-schema";

// ─── FIX 1 — Typed form state ─────────────────────────────────────────

type RiskFormState = {
  description: string;
  category: RiskCategory;
  severity: Severity;
  probability: Probability;
  mitigation: string;
  residual: ResidualRisk;
};

type GPAIFormState = {
  modelName: string;
  providerName: string;
  computeFlops: string;
  trainingDataSize: string;
  openSource: boolean;
  energyKwh: string;
  hasModelCard: boolean;
};

type TempFormState = {
  entityType: string;
  entityId: string;
  dataJson: string;
  validTime: string;
};

// ─── FIX 5 — Persistence helpers ─────────────────────────────────────

const STORAGE_KEY = "risk_manager_report";

function loadReport(): RiskManagerReport {
  if (typeof window === "undefined") return createEmptyRiskReport("Nuovo Sistema AI");
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RiskManagerReport) : createEmptyRiskReport("Nuovo Sistema AI");
  } catch {
    return createEmptyRiskReport("Nuovo Sistema AI");
  }
}

function saveReport(r: RiskManagerReport) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(r));
  // Sync to shared STORAGE_KEYS so Journey, DocuGen and NIST-RMF can read it
  // nextReviewDate and reviewCycle are added dynamically on finalize (not in base type)
  const rAny = r as unknown as Record<string, unknown>;
  const normalized: RiskManagerResult = {
    risks: r.risks.map((item) => ({
      id: item.id,
      title: item.description,
      likelihood: item.probability as "low" | "medium" | "high",
      impact: item.severity as "low" | "medium" | "high",
      mitigation: item.mitigation,
      residualRisk: item.residual as "acceptable" | "review" | "unacceptable",
    })),
    overallRiskLevel: (r.overallRating ?? "low") as "low" | "medium" | "high" | "critical",
    completedAt: new Date().toISOString(),
    nextReviewDate: typeof rAny.nextReviewDate === "string" ? rAny.nextReviewDate : undefined,
    reviewCycle: (rAny.reviewCycle as RiskManagerResult["reviewCycle"]) ?? undefined,
  };
  writeToStorage<RiskManagerResult>("riskManager", normalized);
}

// ─── SEZIONI ──────────────────────────────────────────────────────────

const PHASES = [
  { id: "scoping", label: "Scoping & Identificazione", icon: Search },
  { id: "quantitative", label: "Monte Carlo", icon: Calculator },
  { id: "temporal", label: "Audit Bitemporale", icon: Database },
  { id: "drift", label: "Drift Detection", icon: Activity },
  { id: "gpai", label: "GPAI & Rischio Sistemico", icon: Zap },
  { id: "sanctions", label: "Governance & Sanzioni", icon: FileWarning },
  { id: "output", label: "Report Finale", icon: CheckCircle },
] as const;

type Phase = (typeof PHASES)[number]["id"];

// ─── STILI ────────────────────────────────────────────────────────────

// ─── Design tokens ────────────────────────────────────────────────────
const T = {
  text:    "#0D1016",
  muted:   "rgba(0,0,0,0.42)",
  faint:   "rgba(0,0,0,0.28)",
  border:  "rgba(0,0,0,0.07)",
  card:    "#ffffff",
  bg:      "#FAFAF9",
  red:     "#dc2626",
  redBg:   "rgba(220,38,38,0.06)",
  redBdr:  "rgba(220,38,38,0.18)",
  amber:   "#d97706",
  amberBg: "rgba(245,158,11,0.06)",
  blue:    "#2563eb",
  blueBg:  "rgba(37,99,235,0.06)",
  green:   "#15803d",
  greenBg: "rgba(22,163,74,0.06)",
};
const cardSt = {
  background: T.card,
  border: `1px solid ${T.border}`,
  borderRadius: 12,
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};

const severityColor: Record<string, string> = {
  high: "bg-danger/10 text-danger border-danger/30",
  medium: "bg-warning/10 text-warning border-warning/30",
  low: "bg-success/10 text-success border-success/30",
};

function cls(...args: (string | false | undefined | null)[]) {
  return args.filter(Boolean).join(" ");
}

// ─── PAGINA ───────────────────────────────────────────────────────────

export default function RiskManagerPage() {
  const [phase, setPhase] = useState<Phase>("scoping");

  // FIX 5 — load from localStorage
  const [report, setReport] = useState<RiskManagerReport>(() => loadReport());
  const [finalized, setFinalized] = useState(false);
  const [nextReviewDate, setNextReviewDate] = useState<string>("");
  const [reviewCycle, setReviewCycle] = useState<"monthly" | "quarterly" | "biannual" | "annual">("annual");

  // FIX 6 — Toast
  const [toast, setToast] = useState<{ msg: string; type: "error" | "success" } | null>(null);

  function showToast(msg: string, type: "error" | "success" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // FIX 5 — updateReport helper persists every change
  function updateReport(updater: (prev: RiskManagerReport) => RiskManagerReport) {
    setReport((prev) => {
      const next = updater(prev);
      saveReport(next);
      return next;
    });
  }

  // FIX 5 — auto-save on systemName change (from ScopingPhase direct setReport call)
  useEffect(() => { saveReport(report); }, [report.systemName]);

  // Pre-populate systemName from Classifier
  const classifierData = React.useMemo(() => {
    try { const r = localStorage.getItem("aicomply_classifier_result"); return r ? JSON.parse(r) : null; }
    catch { return null; }
  }, []);
  useEffect(() => {
    if (classifierData?.systemName && !report.systemName) {
      updateReport((prev) => ({ ...prev, systemName: classifierData.systemName }));
    }
  }, [classifierData]);

  // ─── SCOPING STATE ──────────────────────────────────────────────
  const [showRiskForm, setShowRiskForm] = useState(false);

  // FIX 1/2 — typed riskForm
  const [riskForm, setRiskForm] = useState<RiskFormState>({
    description: "",
    category: "health-safety",
    severity: "medium",
    probability: "medium",
    mitigation: "",
    residual: "monitor",
  });

  function addRisk() {
    if (!riskForm.description || !riskForm.mitigation) return;
    const newRisk: RiskItem = {
      ...riskForm,
      id: `risk-${Date.now()}`,
      quantitativeScore: computeRiskScore(riskForm.severity, riskForm.probability),
      createdAt: new Date().toISOString(),
    };
    // FIX 5
    updateReport((prev) => ({
      ...prev,
      risks: [...prev.risks, newRisk],
      overallScore: computeOverallScore([...prev.risks, newRisk]),
    }));
    setRiskForm({
      description: "",
      category: "health-safety",
      severity: "medium",
      probability: "medium",
      mitigation: "",
      residual: "monitor",
    });
    setShowRiskForm(false);
  }

  function removeRisk(id: string) {
    const updated = report.risks.filter((r) => r.id !== id);
    // FIX 5
    updateReport((prev) => ({ ...prev, risks: updated, overallScore: computeOverallScore(updated) }));
  }

  // ─── MONTE CARLO STATE ──────────────────────────────────────────
  const [mcInput, setMcInput] = useState<MonteCarloInput>({
    likelihoodMean: 0.4,
    likelihoodStdDev: 0.15,
    severityMean: 0.5,
    severityStdDev: 0.2,
    iterations: 10000,
  });
  const [mcResult, setMcResult] = useState<MonteCarloResult | null>(null);

  function handleRunMC() {
    const result = runMonteCarlo(mcInput);
    setMcResult(result);
    // FIX 5
    updateReport((prev) => ({ ...prev, monteCarloResults: result }));
  }

  // ─── TEMPORAL STATE ─────────────────────────────────────────────
  const [temporalRecords, setTemporalRecords] = useState<TemporalRecord[]>([]);
  const [tempForm, setTempForm] = useState<TempFormState>({
    entityType: "",
    entityId: "",
    dataJson: "",
    validTime: "",
  });

  async function addTemporal() {
    if (!tempForm.entityType || !tempForm.dataJson) return;
    try {
      const data = JSON.parse(tempForm.dataJson) as Record<string, unknown>;
      const record = await createTemporalRecord(
        tempForm.entityType,
        tempForm.entityId,
        data,
        tempForm.validTime || new Date().toISOString()
      );
      const updated = [...temporalRecords, record];
      setTemporalRecords(updated);
      // FIX 5
      updateReport((prev) => ({ ...prev, temporalLedger: updated }));
      setTempForm({ entityType: "", entityId: "", dataJson: "", validTime: "" });
    } catch {
      // FIX 6
      showToast("JSON non valido — verifica la sintassi", "error");
      return;
    }
  }

  // ─── DRIFT STATE ────────────────────────────────────────────────
  const [driftBaselineStr, setDriftBaselineStr] = useState("");
  const [driftCurrentStr, setDriftCurrentStr] = useState("");
  const [driftResults, setDriftResults] = useState<DriftWindow[]>([]);

  function handleDetectDrift() {
    try {
      const baseline = driftBaselineStr.split(",").map(Number);
      const current = driftCurrentStr.split(",").map(Number);
      if (baseline.some(isNaN) || current.some(isNaN)) {
        // FIX 6
        showToast("Inserisci valori numerici separati da virgola", "error");
        return;
      }
      const result = detectDrift(baseline, current);
      const updated = [...driftResults, result];
      setDriftResults(updated);
      // FIX 5
      updateReport((prev) => ({ ...prev, driftWindows: updated }));
    } catch {
      // FIX 6
      showToast("Errore nel calcolo PSI", "error");
      return;
    }
  }

  // ─── GPAI STATE ─────────────────────────────────────────────────
  // FIX 3 — typed gpaiForm
  const [gpaiForm, setGpaiForm] = useState<GPAIFormState>({
    modelName: "",
    providerName: "",
    computeFlops: "",
    trainingDataSize: "",
    openSource: false,
    energyKwh: "",
    hasModelCard: false,
  });
  const [gpaiResult, setGpaiResult] = useState<GPAIRiskAssessment | null>(null);

  function handleAssessGPAI() {
    const result = assessGPAI({
      modelName: gpaiForm.modelName || "Modello GPAI",
      providerName: gpaiForm.providerName || "Provider sconosciuto",
      computeFlops: Number(gpaiForm.computeFlops) || 0,
      trainingDataSize: Number(gpaiForm.trainingDataSize) || 0,
      openSource: gpaiForm.openSource,
      energyConsumptionKwh: Number(gpaiForm.energyKwh) || 0,
      hasModelCard: gpaiForm.hasModelCard,
    });
    setGpaiResult(result);
    updateReport((prev) => ({ ...prev, gpaiAssessment: result }));
  }

  // ─── SANCTIONS STATE ────────────────────────────────────────────
  const [sanctions, setSanctions] = useState<SanctionTracker[]>(() => getSanctionTracker());

  function toggleSanction(index: number) {
    setSanctions((prev) =>
      prev.map((s, i) =>
        i === index
          ? { ...s, status: s.status === "resolved" ? "pending" : "resolved" }
          : s
      )
    );
  }

  // ─── FIX 7 — FINALIZE with Evidence Layer ───────────────────────
  async function handleFinalize() {
    const final = await finalizeRiskReport({ ...report, sanctions });
    setReport(final);
    saveReport({ ...final, nextReviewDate, reviewCycle } as Parameters<typeof saveReport>[0]);
    setFinalized(true);

    await appendEvidence("decision", {
      type: "Risk Assessment Finalizzato",
      system: final.systemName,
      overallScore: final.overallScore,
      overallRating: final.overallRating,
      totalRisks: final.risks.length,
      highRisks: final.risks.filter((r) => r.severity === "high").length,
      evidenceHash: final.evidenceHash,
      monteCarloRun: !!final.monteCarloResults,
      driftWindows: final.driftWindows.length,
      gpaiAssessed: !!final.gpaiAssessment,
      sanctionsResolved: final.sanctions.filter((s) => s.status === "resolved").length,
    }, "risk-manager");

    showToast("Report finalizzato e registrato su Evidence Layer ✓");
  }

  // ─── FIX 8 — Download report ────────────────────────────────────
  function downloadReport() {
    const blob = new Blob(
      [JSON.stringify({ ...report, sanctions }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `risk-report-${report.systemName.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Report scaricato");
  }

  // ─── FIX 9 — Reset assessment ───────────────────────────────────
  function resetAssessment() {
    const fresh = createEmptyRiskReport("Nuovo Sistema AI");
    setReport(fresh);
    saveReport(fresh);
    setFinalized(false);
    setSanctions(getSanctionTracker());
    setMcResult(null);
    setTemporalRecords([]);
    setDriftResults([]);
    setGpaiResult(null);
    setPhase("scoping");
    showToast("Nuovo assessment avviato");
  }

  // ─── NAVIGATION ─────────────────────────────────────────────────
  const currentIdx = PHASES.findIndex((p) => p.id === phase);

  function nextPhase() {
    if (currentIdx < PHASES.length - 1) setPhase(PHASES[currentIdx + 1].id);
  }
  function prevPhase() {
    if (currentIdx > 0) setPhase(PHASES[currentIdx - 1].id);
  }

  // ─── RENDER ─────────────────────────────────────────────────────

  return (
    <div className="w-full">
      <SystemContextBanner checkProhibited={true} />

      {/* Art. 50 — AI Output Label */}
      <div className="mb-4">
        <AIOutputLabel
          documentType="Gestione del Rischio — Drift Detection · Art. 9 AI Act"
          outputType="RSK"
        />
      </div>

      {/* ── Header ── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.4px", color: T.text, margin: 0 }}>
          AI Act Risk Manager
        </h1>
        <p style={{ marginTop: 4, fontSize: 13, color: T.muted, lineHeight: 1.5 }}>
          Framework completo di gestione quantitativa del rischio — Art. 9
          Regolamento UE 2024/1689. Monte Carlo, bitemporal audit, drift detection, GPAI systemic risk, sanzioni.
        </p>
      </div>

      {/* ── Phase stepper ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 28, overflowX: "auto", paddingBottom: 2 }}>
        <div style={{ display: "flex", alignItems: "center", background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 5, gap: 2 }}>
          {PHASES.map((p, i) => {
            const isActive = p.id === phase;
            const isDone = PHASES.findIndex((x) => x.id === phase) > i;
            return (
              <div key={p.id} style={{ display: "flex", alignItems: "center" }}>
                <button
                  onClick={() => setPhase(p.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    borderRadius: 7, padding: "5px 10px", fontSize: 12, fontWeight: 500,
                    background: isActive ? T.text : "transparent",
                    color: isActive ? "#fff" : isDone ? T.green : T.muted,
                    border: "none", cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
                  }}
                >
                  <p.icon style={{ width: 13, height: 13 }} />
                  <span>{p.label}</span>
                  {isDone && <span style={{ fontSize: 10, color: T.green }}>✓</span>}
                </button>
                {i < PHASES.length - 1 && (
                  <div style={{ width: 1, height: 16, background: T.border, margin: "0 2px" }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Phase content */}
      <div style={{ ...cardSt, padding: 24 }}>
        {phase === "scoping" && (
          <ScopingPhase
            report={report}
            setReport={setReport}
            riskForm={riskForm}
            setRiskForm={setRiskForm}
            showRiskForm={showRiskForm}
            setShowRiskForm={setShowRiskForm}
            addRisk={addRisk}
            removeRisk={removeRisk}
            addPresetRisk={(preset: RiskFormState) => {
              const newRisk: RiskItem = {
                ...preset,
                id: `risk-${Date.now()}`,
                quantitativeScore: computeRiskScore(preset.severity, preset.probability),
                createdAt: new Date().toISOString(),
              };
              updateReport((prev) => ({
                ...prev,
                risks: [...prev.risks, newRisk],
                overallScore: computeOverallScore([...prev.risks, newRisk]),
              }));
            }}
          />
        )}

        {phase === "quantitative" && (
          <QuantitativePhase
            mcInput={mcInput}
            setMcInput={setMcInput}
            mcResult={mcResult}
            handleRunMC={handleRunMC}
            risks={report.risks}
          />
        )}

        {phase === "temporal" && (
          <TemporalPhase
            temporalRecords={temporalRecords}
            tempForm={tempForm}
            setTempForm={setTempForm}
            addTemporal={addTemporal}
          />
        )}

        {phase === "drift" && (
          <DriftPhase
            driftBaselineStr={driftBaselineStr}
            setDriftBaselineStr={setDriftBaselineStr}
            driftCurrentStr={driftCurrentStr}
            setDriftCurrentStr={setDriftCurrentStr}
            driftResults={driftResults}
            handleDetectDrift={handleDetectDrift}
          />
        )}

        {phase === "gpai" && (
          <GPAIPhase
            gpaiForm={gpaiForm}
            setGpaiForm={setGpaiForm}
            gpaiResult={gpaiResult}
            handleAssessGPAI={handleAssessGPAI}
          />
        )}

        {phase === "sanctions" && (
          <SanctionsPhase
            sanctions={sanctions}
            toggleSanction={toggleSanction}
          />
        )}

        {phase === "output" && (
          // FIX 8 + 9 — add onDownload and onReset
          <OutputPhase
            report={{ ...report, sanctions }}
            finalized={finalized}
            handleFinalize={handleFinalize}
            onDownload={downloadReport}
            onReset={resetAssessment}
            nextReviewDate={nextReviewDate}
            setNextReviewDate={setNextReviewDate}
            reviewCycle={reviewCycle}
            setReviewCycle={setReviewCycle}
          />
        )}
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20 }}>
        <button
          onClick={prevPhase}
          disabled={currentIdx === 0}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            borderRadius: 8, border: `1px solid ${T.border}`,
            padding: "8px 16px", fontSize: 13, color: T.text,
            background: T.card, cursor: "pointer",
            opacity: currentIdx === 0 ? 0.3 : 1,
          }}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} />
          Precedente
        </button>

        {phase !== "output" && (
          <button
            onClick={nextPhase}
            disabled={currentIdx === PHASES.length - 1}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              borderRadius: 8, background: T.text, color: "#fff",
              padding: "8px 16px", fontSize: 13, fontWeight: 500,
              border: "none", cursor: "pointer",
              opacity: currentIdx === PHASES.length - 1 ? 0.3 : 1,
            }}
          >
            Prossimo
            <ArrowRight style={{ width: 14, height: 14 }} />
          </button>
        )}
      </div>

      {/* FIX 6 — Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 50,
          borderRadius: 12, padding: "12px 16px", fontSize: 13, fontWeight: 500,
          boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
          background: toast.type === "error" ? T.redBg : T.text,
          border: `1px solid ${toast.type === "error" ? T.redBdr : T.border}`,
          color: toast.type === "error" ? T.red : "#fff",
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── PHASE COMPONENTS ──────────────────────────────────────────────────

// ─── Catalogo predefinito AI Act ──────────────────────────────────────────────

const RISK_CATALOG: Array<{
  id: string;
  label: string;
  description: string;
  category: RiskCategory;
  severity: Severity;
  probability: Probability;
  mitigation: string;
  residual: ResidualRisk;
  article: string;
  color: string;
}> = [
  {
    id: "cat-hallucinations",
    label: "Allucinazioni e output incorretti",
    description: "Il modello genera informazioni false, fuorvianti o inventate presentandole come fatti certi.",
    category: "health-safety",
    severity: "high",
    probability: "high",
    mitigation: "Implementare human-in-the-loop per decisioni critiche. Aggiungere disclaimer sull'affidabilità degli output. Validazione incrociata con fonti autorevoli.",
    residual: "monitor",
    article: "Art. 9 + Art. 13",
    color: "#dc2626",
  },
  {
    id: "cat-data-leakage",
    label: "Data leakage e memorizzazione dati",
    description: "Il modello espone dati personali o sensibili contenuti nei dati di training o in sessioni precedenti.",
    category: "privacy",
    severity: "high",
    probability: "medium",
    mitigation: "Differential privacy durante il training. Audit periodici del modello. Implementare guardrail per filtrare PII negli output. Privacy by design.",
    residual: "monitor",
    article: "Art. 10 + Art. 9",
    color: "#dc2626",
  },
  {
    id: "cat-discriminatory-bias",
    label: "Bias discriminatorio sistematico",
    description: "Il sistema produce output sistematicamente sfavorevoli verso gruppi protetti (genere, etnia, età, disabilità).",
    category: "discrimination",
    severity: "high",
    probability: "medium",
    mitigation: "Bias testing su dataset rappresentativi. Fairness metrics (equalized odds, demographic parity). Audit esterno periodico. Monitoraggio continuo post-deploy.",
    residual: "monitor",
    article: "Art. 10 + Annex III",
    color: "#dc2626",
  },
  {
    id: "cat-model-inversion",
    label: "Attacchi adversarial / model inversion",
    description: "Attori malintenzionati manipolano input per estrarre informazioni riservate o compromettere il comportamento del modello.",
    category: "security",
    severity: "high",
    probability: "low",
    mitigation: "Adversarial robustness testing. Rate limiting sulle query. Input sanitization. Monitoraggio anomalie comportamentali.",
    residual: "monitor",
    article: "Art. 15",
    color: "#d97706",
  },
  {
    id: "cat-drift",
    label: "Concept drift e degrado delle performance",
    description: "La distribuzione dei dati in produzione si discosta dai dati di training, degradando l'accuratezza nel tempo.",
    category: "health-safety",
    severity: "medium",
    probability: "high",
    mitigation: "Pipeline di monitoring con PSI/KL divergence. Alert automatici per degrado KPI. Retraining periodico. Ciclo post-market Art. 72.",
    residual: "monitor",
    article: "Art. 72 + Art. 15",
    color: "#d97706",
  },
  {
    id: "cat-lack-explainability",
    label: "Mancanza di spiegabilità (black box)",
    description: "Il sistema prende decisioni che impattano persone fisiche senza poter fornire spiegazioni comprensibili.",
    category: "transparency",
    severity: "medium",
    probability: "medium",
    mitigation: "Implementare SHAP/LIME per spiegazioni locali. Documentare feature importance. Generare explanation sheet per utenti finali (XAI Lab).",
    residual: "monitor",
    article: "Art. 13 + Art. 14",
    color: "#d97706",
  },
  {
    id: "cat-overreliance",
    label: "Over-reliance e automation bias",
    description: "Gli operatori umani si affidano eccessivamente alle raccomandazioni del sistema senza esercitare supervisione critica.",
    category: "autonomy",
    severity: "medium",
    probability: "high",
    mitigation: "Formazione obbligatoria degli operatori (AI Literacy). Progettare UI con friction intenzionale. Audit periodici delle decisioni umane vs AI.",
    residual: "monitor",
    article: "Art. 14 + Art. 26",
    color: "#d97706",
  },
  {
    id: "cat-supply-chain",
    label: "Rischi catena di fornitura del modello",
    description: "Dipendenza da modelli o dataset di terze parti non verificati che possono introdurre vulnerabilità o bias non noti.",
    category: "privacy",
    severity: "medium",
    probability: "medium",
    mitigation: "Due diligence sui fornitori. Contractual obligations per provenance dei dati. Software Bill of Materials (SBOM) per componenti AI.",
    residual: "monitor",
    article: "Art. 10 + Art. 25",
    color: "#d97706",
  },
];

function CatalogSection({
  addPresetRisk,
}: {
  addPresetRisk: (preset: RiskFormState) => void;
}) {
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState<Set<string>>(new Set());

  function applyPreset(preset: typeof RISK_CATALOG[0]) {
    addPresetRisk({
      description: preset.description,
      category: preset.category,
      severity: preset.severity,
      probability: preset.probability,
      mitigation: preset.mitigation,
      residual: preset.residual,
    });
    setAdded(prev => new Set(prev).add(preset.id));
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", padding: "10px 14px", borderRadius: 10,
          background: open ? "rgba(37,99,235,0.05)" : "rgba(0,0,0,0.02)",
          border: `1px solid ${open ? "rgba(37,99,235,0.2)" : "rgba(0,0,0,0.08)"}`,
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Database style={{ width: 14, height: 14, color: open ? "#2563eb" : "rgba(0,0,0,0.4)" }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: open ? "#2563eb" : T.text }}>
            Catalogo AI Act — Aggiungi con un click
          </span>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 20,
            background: "rgba(37,99,235,0.08)", color: "#2563eb",
          }}>
            {RISK_CATALOG.length} rischi
          </span>
        </div>
        <span style={{ fontSize: 12, color: T.muted }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{
          marginTop: 8, padding: "12px",
          background: "rgba(0,0,0,0.015)",
          border: "1px solid rgba(0,0,0,0.07)",
          borderRadius: 10,
        }}>
          <p style={{ fontSize: 11, color: T.muted, marginBottom: 10 }}>
            Rischi standard EU AI Act precompilati. Clicca su un rischio per aggiungerlo immediatamente alla matrice.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 8 }}>
            {RISK_CATALOG.map(preset => (
              <button
                key={preset.id}
                onClick={() => !added.has(preset.id) && applyPreset(preset)}
                disabled={added.has(preset.id)}
                style={{
                  textAlign: "left", padding: "10px 12px", borderRadius: 8, cursor: added.has(preset.id) ? "default" : "pointer",
                  background: added.has(preset.id) ? "rgba(22,163,74,0.05)" : T.card,
                  border: `1px solid ${added.has(preset.id) ? "rgba(22,163,74,0.25)" : "rgba(0,0,0,0.08)"}`,
                  opacity: added.has(preset.id) ? 0.7 : 1,
                  transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.text, lineHeight: 1.3 }}>
                    {preset.label}
                  </span>
                  {added.has(preset.id) ? (
                    <CheckCircle style={{ width: 13, height: 13, color: "#15803d", flexShrink: 0 }} />
                  ) : (
                    <Plus style={{ width: 13, height: 13, color: T.muted, flexShrink: 0 }} />
                  )}
                </div>
                <p style={{ fontSize: 10, color: T.muted, marginBottom: 6, lineHeight: 1.4 }}>
                  {preset.description.slice(0, 80)}…
                </p>
                <div style={{ display: "flex", gap: 5 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4,
                    background: preset.color === "#dc2626" ? "rgba(220,38,38,0.08)" : "rgba(217,119,6,0.08)",
                    color: preset.color,
                  }}>
                    {preset.severity.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 10, color: T.muted, padding: "1px 0" }}>{preset.article}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// FIX 2 — Proper types in ScopingPhase props
function ScopingPhase({
  report,
  setReport,
  riskForm,
  setRiskForm,
  showRiskForm,
  setShowRiskForm,
  addRisk,
  removeRisk,
  addPresetRisk,
}: {
  report: RiskManagerReport;
  setReport: (r: RiskManagerReport) => void;
  riskForm: RiskFormState;
  setRiskForm: Dispatch<SetStateAction<RiskFormState>>;
  showRiskForm: boolean;
  setShowRiskForm: (v: boolean) => void;
  addRisk: () => void;
  removeRisk: (id: string) => void;
  addPresetRisk: (preset: RiskFormState) => void;
}) {
  const highCount = report.risks.filter((r) => r.severity === "high").length;
  const score = report.overallScore;

  const [suggestion, setSuggestion] = useState<RiskSuggestion | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [residualWarning, setResidualWarning] = useState<ResidualWarning>({ show: false, message: "", severity: "info" });
  const [suggestionUsed, setSuggestionUsed] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // FIX 2 — (prev: RiskFormState) instead of (prev: typeof riskForm)
  const handleDescriptionChange = useCallback((value: string) => {
    setRiskForm((prev: RiskFormState) => ({ ...prev, description: value }));
    setSuggestionUsed(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (value.trim().length > 15) {
        setSuggestion(analyzeRiskDescription(value));
      } else {
        setSuggestion(null);
      }
    }, 600);
  }, [setRiskForm]);

  useEffect(() => {
    setResidualWarning(validateResidualRisk(
      riskForm.severity,
      riskForm.probability,
      riskForm.residual,
      riskForm.mitigation
    ));
  }, [riskForm.severity, riskForm.probability, riskForm.residual, riskForm.mitigation]);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  function applySuggestion() {
    if (!suggestion) return;
    // FIX 2 — (prev: RiskFormState) instead of (prev: typeof riskForm)
    setRiskForm((prev: RiskFormState) => ({
      ...prev,
      severity: suggestion.severity,
      probability: suggestion.probability,
      residual: suggestion.residual,
    }));
    setSuggestionUsed(true);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: T.text, margin: 0 }}>
          Scoping &amp; Identificazione Rischi
        </h2>
        <button
          onClick={() => setShowGuide(!showGuide)}
          style={{
            display: "flex", alignItems: "center", gap: 6, borderRadius: 7,
            padding: "5px 10px", fontSize: 12, fontWeight: 500, cursor: "pointer",
            background: showGuide ? T.blueBg : "transparent",
            color: showGuide ? T.blue : T.muted,
            border: `1px solid ${showGuide ? "rgba(37,99,235,0.2)" : T.border}`,
          }}
        >
          <Eye style={{ width: 13, height: 13 }} />
          Guida ai Criteri
        </button>
      </div>
      <p style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>
        Sistema:{" "}
        <input
          value={report.systemName}
          onChange={(e) => setReport({ ...report, systemName: e.target.value })}
          style={{
            borderBottom: `1px solid ${T.border}`, background: "transparent",
            padding: "1px 4px", color: T.text, outline: "none", fontSize: 12,
          }}
        />
      </p>

      {showGuide && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 mb-6">
          <h4 className="text-sm font-semibold text-foreground mb-3">Criteri di valutazione AI Act</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="rounded-lg border border-danger/30 bg-danger/5 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-3 h-3 rounded-full bg-danger" />
                <span className="font-semibold text-danger">Impatto Alto</span>
              </div>
              <ul className="space-y-1 text-muted-foreground">
                <li>· Biometria e riconoscimento facciale</li>
                <li>· Infrastrutture critiche</li>
                <li>· Selezione lavorativa (HR)</li>
                <li>· Accesso al credito / finanza</li>
                <li>· Diagnosi medica e sanità</li>
                <li>· Sorveglianza e giustizia</li>
                <li>· Controllo migratorio</li>
                <li>· Istruzione e formazione</li>
                <li>· Tutela minori</li>
              </ul>
            </div>
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-3 h-3 rounded-full bg-warning" />
                <span className="font-semibold text-warning">Impatto Medio</span>
              </div>
              <ul className="space-y-1 text-muted-foreground">
                <li>· Raccomandazioni commerciali</li>
                <li>· Profilazione e targeting</li>
                <li>· Chatbot e assistenti virtuali</li>
                <li>· Manutenzione predittiva</li>
                <li>· Formazione e apprendimento</li>
                <li>· Ambito assicurativo</li>
              </ul>
            </div>
            <div className="rounded-lg border border-success/30 bg-success/5 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-3 h-3 rounded-full bg-success" />
                <span className="font-semibold text-success">Impatto Basso</span>
              </div>
              <ul className="space-y-1 text-muted-foreground">
                <li>· Intrattenimento e giochi</li>
                <li>· Previsioni meteorologiche</li>
                <li>· Organizzazione personale</li>
                <li>· Traduzione linguistica</li>
                <li>· Ricerca accademica</li>
              </ul>
            </div>
          </div>
          <p className="mt-3 text-[10px] text-muted-foreground">
            Riferimento: EU AI Act Allegato III — La probabilità dipende da: elaborazione in tempo reale,
            scala di utenti, grado di automazione, frequenza di aggiornamento.
          </p>
        </div>
      )}

      {/* Stats strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8, marginBottom: 24 }}>
        {[
          { label: "Rischi totali", value: report.risks.length, valueColor: T.text },
          { label: "Alta severità", value: highCount, valueColor: T.red },
          { label: "Score medio", value: score.toFixed(2), valueColor: T.amber },
          { label: "Rating", value: computeOverallRating(score), valueColor: T.blue },
        ].map((c, i) => (
          <div key={c.label} style={{
            background: T.card, border: `1px solid ${T.border}`, borderRadius: 10,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)", padding: "12px 14px",
          }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: c.valueColor, letterSpacing: "-0.5px" }}>{c.value}</div>
            <div style={{ marginTop: 2, fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.6px" }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* ── Catalogo predefinito AI Act ──────────────────────────────────── */}
      <CatalogSection addPresetRisk={addPresetRisk} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: 0 }}>Rischi identificati</h3>
        <button
          onClick={() => setShowRiskForm(!showRiskForm)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            borderRadius: 7, background: T.text, color: "#fff",
            padding: "5px 12px", fontSize: 12, fontWeight: 500,
            border: "none", cursor: "pointer",
          }}
        >
          <Plus style={{ width: 13, height: 13 }} />
          Nuovo rischio
        </button>
      </div>

      {showRiskForm && (
        <div className="rounded-xl border border-border bg-muted/50 p-4 mb-4 space-y-3">
          <div>
            <textarea
              value={riskForm.description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="Descrivi il rischio (salute, sicurezza, diritti fondamentali...)"
              rows={2}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {suggestion && !suggestionUsed && (
              <div className="mt-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-primary">✨ Suggerimento IA</span>
                      <span className={cls(
                        "text-[10px] rounded-full px-1.5 py-0.5 border",
                        suggestion.confidence >= 0.8
                          ? "bg-success/10 text-success border-success/30"
                          : suggestion.confidence >= 0.6
                          ? "bg-warning/10 text-warning border-warning/30"
                          : "bg-muted text-muted-foreground border-border"
                      )}>
                        {(suggestion.confidence * 100).toFixed(0)}% confidenza
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                      {suggestion.rationale}
                    </p>
                    {suggestion.matchedKeywords.length > 0 && (
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        Rilevato: {suggestion.matchedKeywords.join(" · ")}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={cls(
                        "text-[10px] font-medium rounded-full px-2 py-0.5 border",
                        severityColor[suggestion.severity]
                      )}>
                        → {suggestion.severity.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Prob: {suggestion.probability.toUpperCase()} · Residuo: {RESIDUAL_LABEL[suggestion.residual]}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={applySuggestion}
                    className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors ml-3"
                  >
                    Applica
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <select
              value={riskForm.category}
              onChange={(e) => setRiskForm({ ...riskForm, category: e.target.value as RiskCategory })}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {Object.entries(RISK_CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <div className="relative">
              <select
                value={riskForm.severity}
                onChange={(e) => setRiskForm({ ...riskForm, severity: e.target.value as Severity })}
                className={cls(
                  "w-full rounded-lg border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50",
                  suggestion && !suggestionUsed
                    ? "bg-primary/5 border-primary/40 ring-1 ring-primary/30"
                    : "bg-card border-border"
                )}
              >
                <option value="high">Severità: Alta</option>
                <option value="medium">Severità: Media</option>
                <option value="low">Severità: Bassa</option>
              </select>
              {suggestion && !suggestionUsed && (
                <span className="absolute -top-2 -right-2 text-[9px] bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 font-medium leading-none">
                  ✨ {suggestion.severity.toUpperCase()}
                </span>
              )}
            </div>
            <div className="relative">
              <select
                value={riskForm.probability}
                onChange={(e) => setRiskForm({ ...riskForm, probability: e.target.value as Probability })}
                className={cls(
                  "w-full rounded-lg border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50",
                  suggestion && !suggestionUsed
                    ? "bg-primary/5 border-primary/40 ring-1 ring-primary/30"
                    : "bg-card border-border"
                )}
              >
                <option value="high">Prob: Alta</option>
                <option value="medium">Prob: Media</option>
                <option value="low">Prob: Bassa</option>
              </select>
              {suggestion && !suggestionUsed && (
                <span className="absolute -top-2 -right-2 text-[9px] bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 font-medium leading-none">
                  ✨ {suggestion.probability.toUpperCase()}
                </span>
              )}
            </div>
            <select
              value={riskForm.residual}
              onChange={(e) => setRiskForm({ ...riskForm, residual: e.target.value as ResidualRisk })}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="acceptable">Residuo: Accettabile</option>
              <option value="monitor">Residuo: Monitorare</option>
              <option value="high">Residuo: Elevato</option>
            </select>
            <button
              onClick={addRisk}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Aggiungi
            </button>
          </div>

          {residualWarning.show && (
            <div className={cls(
              "rounded-lg border p-3 text-xs flex items-start gap-2",
              residualWarning.severity === "danger" && "border-danger/30 bg-danger/5 text-danger",
              residualWarning.severity === "warning" && "border-warning/30 bg-warning/5 text-warning",
              residualWarning.severity === "info" && "border-primary/30 bg-primary/5 text-primary",
            )}>
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{residualWarning.message}</span>
            </div>
          )}

          <input
            value={riskForm.mitigation}
            onChange={(e) => setRiskForm({ ...riskForm, mitigation: e.target.value })}
            placeholder="Misure di mitigazione adottate..."
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      )}

      <div className="space-y-2">
        {report.risks.length === 0 ? (
          <div className="rounded-xl border border-border bg-muted/30 p-8 text-center">
            <AlertTriangle className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nessun rischio. Aggiungi il primo.</p>
          </div>
        ) : (
          report.risks.map((r) => (
            <div key={r.id} className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-sm font-medium text-foreground">{r.description}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 border ${severityColor[r.severity]}`}>
                        {r.severity.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {RISK_CATEGORY_LABELS[r.category]} · Score: {r.quantitativeScore?.toFixed(2) || "-"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Mitigazione: {r.mitigation} · Residuo: {RESIDUAL_LABEL[r.residual]}</p>
                  </div>
                </div>
                <button onClick={() => removeRisk(r.id)} className="text-muted-foreground hover:text-danger transition-colors shrink-0">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── QUANTITATIVE PHASE ────────────────────────────────────────────

function QuantitativePhase({
  mcInput,
  setMcInput,
  mcResult,
  handleRunMC,
  risks,
}: {
  mcInput: MonteCarloInput;
  setMcInput: (v: MonteCarloInput) => void;
  mcResult: MonteCarloResult | null;
  handleRunMC: () => void;
  risks: RiskItem[];
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-1">
        Modellazione Quantitativa: Monte Carlo
      </h2>
      <p className="text-xs text-muted-foreground mb-6">
        Simula R = L × S con distribuzione gaussiana. Itera n volte per
        ottenere distribuzione del rischio, P90, P95, P99.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: "μ Likelihood", key: "likelihoodMean", step: 0.05 },
          { label: "σ Likelihood", key: "likelihoodStdDev", step: 0.05 },
          { label: "μ Severity", key: "severityMean", step: 0.05 },
          { label: "σ Severity", key: "severityStdDev", step: 0.05 },
          { label: "Iterazioni", key: "iterations", step: 1000 },
        ].map((f) => (
          <div key={f.key}>
            <label className="block text-[10px] font-medium text-muted-foreground mb-1 uppercase">{f.label}</label>
            {/* FIX 4 — typed key access */}
            <input
              type="number"
              value={mcInput[f.key as keyof MonteCarloInput]}
              onChange={(e) => setMcInput({ ...mcInput, [f.key as keyof MonteCarloInput]: Number(e.target.value) })}
              step={f.step}
              min={0}
              max={f.key === "iterations" ? 100000 : 1}
              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleRunMC}
        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors mb-6"
      >
        <Calculator className="h-4 w-4" />
        Esegui simulazione Monte Carlo
      </button>

      {mcResult && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { label: "Media", value: mcResult.mean.toFixed(4) },
              { label: "Mediana", value: mcResult.median.toFixed(4) },
              { label: "P90", value: mcResult.p90.toFixed(4) },
              { label: "P95", value: mcResult.p95.toFixed(4) },
              { label: "P99", value: mcResult.p99.toFixed(4) },
              { label: "% > 0.7", value: (mcResult.aboveThreshold * 100).toFixed(1) + "%" },
            ].map((m) => (
              <div key={m.label} className="rounded-lg border border-border bg-muted/50 p-3 text-center">
                <div className="text-lg font-bold text-foreground">{m.value}</div>
                <div className="text-[10px] text-muted-foreground uppercase">{m.label}</div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <h4 className="text-xs font-semibold text-foreground mb-3">Distribuzione rischio simulato</h4>
            <div className="space-y-1">
              {mcResult.distribution.map((d) => {
                const maxCount = Math.max(...mcResult.distribution.map((x) => x.count), 1);
                const pct = (d.count / maxCount) * 100;
                return (
                  <div key={d.bin} className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-12 text-right">{d.bin}</span>
                    <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground w-8">{d.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TEMPORAL PHASE ────────────────────────────────────────────────

function TemporalPhase({
  temporalRecords,
  tempForm,
  setTempForm,
  addTemporal,
}: {
  temporalRecords: TemporalRecord[];
  tempForm: TempFormState;
  setTempForm: Dispatch<SetStateAction<TempFormState>>;
  addTemporal: () => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-1">
        Audit Bitemporale
      </h2>
      <p className="text-xs text-muted-foreground mb-6">
        Registra fatti con doppia timeline: valid time (quando il fatto è
        vero) e transaction time (quando è stato registrato). Hash SHA-256.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-[10px] font-medium text-muted-foreground mb-1 uppercase">Tipo entità</label>
          <input
            value={tempForm.entityType}
            onChange={(e) => setTempForm({ ...tempForm, entityType: e.target.value })}
            placeholder="es: risk, mitigation, audit"
            className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-[10px] font-medium text-muted-foreground mb-1 uppercase">ID entità</label>
          <input
            value={tempForm.entityId}
            onChange={(e) => setTempForm({ ...tempForm, entityId: e.target.value })}
            placeholder="es: risk-123"
            className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-[10px] font-medium text-muted-foreground mb-1 uppercase">Valid time (ISO)</label>
          <input
            value={tempForm.validTime}
            onChange={(e) => setTempForm({ ...tempForm, validTime: e.target.value })}
            placeholder={new Date().toISOString()}
            className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-[10px] font-medium text-muted-foreground mb-1 uppercase">Dati (JSON)</label>
          <input
            value={tempForm.dataJson}
            onChange={(e) => setTempForm({ ...tempForm, dataJson: e.target.value })}
            placeholder='{"key": "value"}'
            className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
          />
        </div>
      </div>

      <button
        onClick={addTemporal}
        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors mb-6"
      >
        <Save className="h-4 w-4" />
        Registra record bitemporale
      </button>

      <div className="space-y-2">
        {temporalRecords.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nessun record registrato.</p>
        ) : (
          temporalRecords.map((r) => (
            <div key={r.id} className="rounded-lg border border-border bg-muted/30 p-3 font-mono text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-foreground">{r.entityType}/{r.entityId}</span>
                <span className="text-muted-foreground">{r.hash.slice(0, 16)}...</span>
              </div>
              <div className="text-muted-foreground">
                Valid: {r.validTime.slice(0, 19)} · Tx: {r.transactionTime.slice(0, 19)}
              </div>
              <pre className="mt-1 text-[10px] text-foreground/70 overflow-x-auto">
                {JSON.stringify(r.data, null, 2)}
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── DRIFT PHASE ───────────────────────────────────────────────────

function DriftPhase({
  driftBaselineStr,
  setDriftBaselineStr,
  driftCurrentStr,
  setDriftCurrentStr,
  driftResults,
  handleDetectDrift,
}: {
  driftBaselineStr: string;
  setDriftBaselineStr: (v: string) => void;
  driftCurrentStr: string;
  setDriftCurrentStr: (v: string) => void;
  driftResults: DriftWindow[];
  handleDetectDrift: () => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-1">
        Drift Detection (PSI)
      </h2>
      <p className="text-xs text-muted-foreground mb-6">
        Calcola il Population Stability Index (PSI) tra due distribuzioni.
        PSI &gt; 0.25 = drift elevato. PSI &gt; 0.1 = drift medio.
        PSI &gt; 0.05 = drift basso.
      </p>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-[10px] font-medium text-muted-foreground mb-1 uppercase">
            Baseline (es: 0.12,0.15,0.10,0.08,...)
          </label>
          <textarea
            value={driftBaselineStr}
            onChange={(e) => setDriftBaselineStr(e.target.value)}
            placeholder="0.12,0.15,0.10,0.08,0.20,0.11"
            rows={3}
            className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-[10px] font-medium text-muted-foreground mb-1 uppercase">
            Corrente (es: 0.14,0.18,0.09,0.07,0.22,0.12)
          </label>
          <textarea
            value={driftCurrentStr}
            onChange={(e) => setDriftCurrentStr(e.target.value)}
            placeholder="0.14,0.18,0.09,0.07,0.22,0.12"
            rows={3}
            className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      <button
        onClick={handleDetectDrift}
        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors mb-6"
      >
        <Activity className="h-4 w-4" />
        Calcola PSI e rileva drift
      </button>

      <div className="space-y-3">
        {driftResults.map((d, i) => (
          <div key={i} className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-foreground">Finestra #{i + 1}</span>
              <span className={cls(
                "text-[10px] font-bold rounded-full px-2 py-0.5 border",
                d.severity === "high" && "bg-danger/10 text-danger border-danger/30",
                d.severity === "medium" && "bg-warning/10 text-warning border-warning/30",
                d.severity === "low" && "bg-warning/10 text-warning border-warning/30",
                d.severity === "none" && "bg-success/10 text-success border-success/30",
              )}>
                {d.driftDetected ? `DRIFT: ${d.severity.toUpperCase()}` : "NESSUN DRIFT"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>PSI: <span className="text-foreground font-mono font-semibold">{d.baselinePSI.toFixed(4)}</span></div>
            </div>
          </div>
        ))}
        {driftResults.length === 0 && (
          <p className="text-xs text-muted-foreground">Nessuna analisi drift eseguita.</p>
        )}
      </div>
    </div>
  );
}

// ─── GPAI PHASE ────────────────────────────────────────────────────

// FIX 3 — Proper types in GPAIPhase props
function GPAIPhase({
  gpaiForm,
  setGpaiForm,
  gpaiResult,
  handleAssessGPAI,
}: {
  gpaiForm: GPAIFormState;
  setGpaiForm: Dispatch<SetStateAction<GPAIFormState>>;
  gpaiResult: GPAIRiskAssessment | null;
  handleAssessGPAI: () => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-1">
        GPAI &amp; Rischio Sistemico
      </h2>
      <p className="text-xs text-muted-foreground mb-6">
        Valuta il rischio sistemico di modelli General-Purpose AI (Art.
        51-56). Soglia &gt; 10^25 FLOPS per notifica obbligatoria.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-[10px] font-medium text-muted-foreground mb-1 uppercase">Nome modello</label>
          <input
            value={gpaiForm.modelName}
            onChange={(e) => setGpaiForm({ ...gpaiForm, modelName: e.target.value })}
            placeholder="es: GPT-4, Claude 3, Llama 3"
            className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-[10px] font-medium text-muted-foreground mb-1 uppercase">Provider</label>
          <input
            value={gpaiForm.providerName}
            onChange={(e) => setGpaiForm({ ...gpaiForm, providerName: e.target.value })}
            placeholder="es: OpenAI, Anthropic, Meta"
            className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-[10px] font-medium text-muted-foreground mb-1 uppercase">FLOPS training</label>
          <input
            value={gpaiForm.computeFlops}
            onChange={(e) => setGpaiForm({ ...gpaiForm, computeFlops: e.target.value })}
            placeholder="es: 1e25"
            className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-[10px] font-medium text-muted-foreground mb-1 uppercase">Dati training (TB)</label>
          <input
            value={gpaiForm.trainingDataSize}
            onChange={(e) => setGpaiForm({ ...gpaiForm, trainingDataSize: e.target.value })}
            placeholder="es: 45"
            className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-[10px] font-medium text-muted-foreground mb-1 uppercase">Consumo energia (kWh)</label>
          <input
            value={gpaiForm.energyKwh}
            onChange={(e) => setGpaiForm({ ...gpaiForm, energyKwh: e.target.value })}
            placeholder="es: 500000"
            className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex items-center gap-6 self-end pb-1">
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={gpaiForm.openSource}
              onChange={(e) => setGpaiForm({ ...gpaiForm, openSource: e.target.checked })}
              className="rounded"
            />
            Open Source
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={gpaiForm.hasModelCard}
              onChange={(e) => setGpaiForm({ ...gpaiForm, hasModelCard: e.target.checked })}
              className="rounded"
            />
            Model Card
          </label>
        </div>
      </div>

      <button
        onClick={handleAssessGPAI}
        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors mb-6"
      >
        <Gauge className="h-4 w-4" />
        Valuta rischio sistemico GPAI
      </button>

      {gpaiResult && (
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              {gpaiResult.modelName} ({gpaiResult.providerName})
            </h3>
            <span className={cls(
              "text-xs font-bold rounded-full px-3 py-1 border",
              gpaiResult.hasSystemicRisk
                ? "bg-danger/10 text-danger border-danger/30"
                : "bg-success/10 text-success border-success/30"
            )}>
              {gpaiResult.hasSystemicRisk ? "RISCHIO SISTEMICO" : "NESSUN RISCHIO SISTEMICO"}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border bg-muted/50 p-3 text-center">
              <div className="text-xl font-bold text-foreground">{gpaiResult.systemicRiskScore}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Score / 100</div>
            </div>
            <div className="rounded-lg border border-border bg-muted/50 p-3 text-center">
              <div className="text-xl font-bold text-foreground">{gpaiResult.computeFlops.toExponential(0)}</div>
              <div className="text-[10px] text-muted-foreground uppercase">FLOPS</div>
            </div>
            <div className="rounded-lg border border-border bg-muted/50 p-3 text-center">
              <div className="text-xl font-bold text-foreground">{gpaiResult.energyConsumptionKwh.toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground uppercase">kWh</div>
            </div>
          </div>

          {gpaiResult.requiredMeasures.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-foreground mb-2">Misure obbligatorie:</h4>
              <ul className="space-y-1">
                {gpaiResult.requiredMeasures.map((m, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <FileWarning className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SANCTIONS PHASE ───────────────────────────────────────────────

function SanctionsPhase({
  sanctions,
  toggleSanction,
}: {
  sanctions: SanctionTracker[];
  toggleSanction: (i: number) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-1">
        Governance &amp; Sanzioni (Art. 99)
      </h2>
      <p className="text-xs text-muted-foreground mb-6">
        Monitora lo stato delle sanzioni potenziali per violazioni
        dell&apos;AI Act. Penalità fino a 35M€ o 7% del fatturato globale.
      </p>

      <div className="space-y-3">
        {sanctions.map((s, i) => (
          <div key={i} className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="text-xs font-mono text-primary">{s.article}</span>
                <h4 className="text-sm font-medium text-foreground mt-0.5">{s.description}</h4>
              </div>
              <button
                onClick={() => toggleSanction(i)}
                className={cls(
                  "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                  s.status === "resolved"
                    ? "bg-success/10 text-success border-success/30"
                    : "bg-muted text-muted-foreground border-border hover:bg-success/10 hover:text-success"
                )}
              >
                {s.status === "resolved" ? (
                  <CheckCircle className="h-3.5 w-3.5" />
                ) : (
                  <XCircle className="h-3.5 w-3.5" />
                )}
                {s.status === "resolved" ? "Risolto" : "Segna risolto"}
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-muted-foreground">
              <div>
                <span className={cls(
                  "rounded-full px-2 py-0.5 border text-[10px] font-medium",
                  getSanctionSeverityColor(s.severity)
                )}>
                  {s.severity === "high" ? "GRAVE" : s.severity === "medium" ? "MEDIA" : "LIEVE"}
                </span>
              </div>
              <div>Max: <span className="text-foreground font-semibold">{s.maxPenaltyEUR.toLocaleString()}€</span></div>
              <div>o <span className="text-foreground font-semibold">{s.maxPenaltyPercent}%</span> fatturato</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── OUTPUT PHASE ───────────────────────────────────────────────────

// FIX 8 + 9 — add onDownload and onReset props
function OutputPhase({
  report,
  finalized,
  handleFinalize,
  onDownload,
  onReset,
  nextReviewDate,
  setNextReviewDate,
  reviewCycle,
  setReviewCycle,
}: {
  report: RiskManagerReport;
  finalized: boolean;
  handleFinalize: () => void;
  onDownload: () => void;
  onReset: () => void;
  nextReviewDate: string;
  setNextReviewDate: (v: string) => void;
  reviewCycle: "monthly" | "quarterly" | "biannual" | "annual";
  setReviewCycle: (v: "monthly" | "quarterly" | "biannual" | "annual") => void;
}) {
  const resolvedSanctions = report.sanctions.filter((s) => s.status === "resolved").length;

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-1">
        Report Finale Risk Manager
      </h2>
      <p className="text-xs text-muted-foreground mb-6">
        Riepilogo completo della valutazione dei rischi AI Act.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Rischi", value: report.risks.length },
          { label: "Score", value: report.overallScore.toFixed(2) },
          { label: "Rating", value: report.overallRating },
          { label: "Sanzioni OK", value: resolvedSanctions },
          { label: "Hash", value: report.evidenceHash.slice(0, 10) + "..." },
        ].map((c) => (
          <div key={c.label} className="rounded-lg border border-border bg-muted/50 p-3 text-center">
            <div className="text-lg font-bold text-foreground">{c.value}</div>
            <div className="text-[10px] text-muted-foreground uppercase">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-muted/30 p-4 mb-6">
        <h4 className="text-sm font-semibold text-foreground mb-2">Sistema: {report.systemName}</h4>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div>Data creazione: {report.createdAt.slice(0, 19)}</div>
          <div>Monte Carlo: {report.monteCarloResults ? "✅ Eseguito" : "⏳ Non eseguito"}</div>
          <div>Audit records: {report.temporalLedger.length}</div>
          <div>Drift windows: {report.driftWindows.length}</div>
          <div>GPAI Assessment: {report.gpaiAssessment ? "✅ Completato" : "⏳ Non eseguito"}</div>
          <div>Sanzioni tracciate: {report.sanctions.length}</div>
        </div>
      </div>

      <div
        className={cls(
          "rounded-xl border p-4 mb-6 text-center",
          report.overallRating === "low" && "border-success/30 bg-success/5",
          report.overallRating === "limited" && "border-warning/30 bg-warning/5",
          report.overallRating === "high" && "border-danger/30 bg-danger/5",
          report.overallRating === "unacceptable" && "border-danger/50 bg-danger/10",
        )}
      >
        <div className="text-3xl font-bold mb-1">
          {report.overallRating === "low" && "🟢 Rischio Basso"}
          {report.overallRating === "limited" && "🟡 Rischio Limitato"}
          {report.overallRating === "high" && "🟠 Rischio Elevato"}
          {report.overallRating === "unacceptable" && "🔴 Rischio Inaccettabile"}
        </div>
        <p className="text-xs text-muted-foreground">
          Score complessivo: {report.overallScore.toFixed(3)}
        </p>
      </div>

      {/* Art. 9(1)(b) — Review cycle */}
      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, color: T.text, display: "block", marginBottom: 6 }}>
            Data prossima revisione
            <span style={{ color: "#DC2626", marginLeft: 4 }}>*</span>
            <span style={{ fontSize: 11, color: T.muted, fontWeight: 400, marginLeft: 8 }}>Art. 9(1)(b)</span>
          </label>
          <input
            type="date"
            value={nextReviewDate}
            onChange={(e) => setNextReviewDate(e.target.value)}
            style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, background: "#fff" }}
          />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, color: T.text, display: "block", marginBottom: 6 }}>
            Ciclo di revisione
          </label>
          <select
            value={reviewCycle}
            onChange={(e) => setReviewCycle(e.target.value as typeof reviewCycle)}
            style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, background: "#fff" }}
          >
            <option value="monthly">Mensile</option>
            <option value="quarterly">Trimestrale</option>
            <option value="biannual">Semestrale</option>
            <option value="annual">Annuale</option>
          </select>
        </div>
      </div>

      {!finalized ? (
        <button
          onClick={handleFinalize}
          className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors mx-auto"
          style={{ marginTop: 16 }}
        >
          <Shield className="h-4 w-4" />
          Finalizza e sigilla (SHA-256)
        </button>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-success/30 bg-success/5 p-6 text-center">
            <CheckCircle className="h-8 w-8 text-success mx-auto mb-2" />
            <p className="text-sm font-semibold text-success">Report finalizzato e sigillato</p>
            <p className="text-xs text-muted-foreground mt-1">
              Evidence hash: {report.evidenceHash.slice(0, 32)}...
            </p>
          </div>

          {/* FIX 8 — Download button */}
          <div className="flex justify-center mt-4">
            <button
              onClick={onDownload}
              className="flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Download className="h-4 w-4" />
              Scarica report JSON (per auditor)
            </button>
          </div>

          {/* FIX 9 — Reset button */}
          <div className="flex justify-center">
            <button
              onClick={onReset}
              className="flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors mt-2"
            >
              <RefreshCw className="h-4 w-4" />
              Nuovo assessment
            </button>
          </div>
        </div>
      )}

      <SignOffPanel toolKey="risk-manager" toolLabel="Risk Manager" />
    </div>
  );
}
