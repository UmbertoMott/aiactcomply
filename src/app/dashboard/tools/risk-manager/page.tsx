"use client";

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
import { useState, useEffect, useRef, useCallback } from "react";
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
  const [report, setReport] = useState<RiskManagerReport>(() =>
    createEmptyRiskReport("Nuovo Sistema AI")
  );
  const [finalized, setFinalized] = useState(false);

  // ─── SCOPING STATE ──────────────────────────────────────────────
  const [showRiskForm, setShowRiskForm] = useState(false);
  const [riskForm, setRiskForm] = useState<{
    description: string;
    category: RiskCategory;
    severity: Severity;
    probability: Probability;
    mitigation: string;
    residual: ResidualRisk;
  }>({
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
    setReport((prev) => ({
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
    setReport((prev) => ({ ...prev, risks: updated, overallScore: computeOverallScore(updated) }));
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
    setReport((prev) => ({ ...prev, monteCarloResults: result }));
  }

  // ─── TEMPORAL STATE ─────────────────────────────────────────────
  const [temporalRecords, setTemporalRecords] = useState<TemporalRecord[]>([]);
  const [tempForm, setTempForm] = useState({ entityType: "", entityId: "", dataJson: "", validTime: "" });

  async function addTemporal() {
    if (!tempForm.entityType || !tempForm.dataJson) return;
    try {
      const data = JSON.parse(tempForm.dataJson);
      const record = await createTemporalRecord(tempForm.entityType, tempForm.entityId, data, tempForm.validTime || new Date().toISOString());
      const updated = [...temporalRecords, record];
      setTemporalRecords(updated);
      setReport((prev) => ({ ...prev, temporalLedger: updated }));
      setTempForm({ entityType: "", entityId: "", dataJson: "", validTime: "" });
    } catch {
      alert("JSON non valido");
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
        alert("Inserisci valori numerici separati da virgola");
        return;
      }
      const result = detectDrift(baseline, current);
      const updated = [...driftResults, result];
      setDriftResults(updated);
      setReport((prev) => ({ ...prev, driftWindows: updated }));
    } catch {
      alert("Errore nel calcolo PSI");
    }
  }

  // ─── GPAI STATE ─────────────────────────────────────────────────
  const [gpaiForm, setGpaiForm] = useState({
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
    setReport((prev) => ({ ...prev, gpaiAssessment: result }));
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

  // ─── FINALIZE ───────────────────────────────────────────────────
  async function handleFinalize() {
    const final = await finalizeRiskReport({ ...report, sanctions });
    setReport(final);
    setFinalized(true);
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
    <div className="max-w-5xl">
      {/* Header */}
      <h1 className="text-2xl font-bold text-foreground mb-2">
        AI Act Risk Manager
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        Framework completo di gestione quantitativa del rischio — Art. 9
        Regolamento UE 2024/1689. Monte Carlo, bitemporal audit, drift
        detection, GPAI systemic risk, sanzioni.
      </p>

      {/* Stepper */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
        {PHASES.map((p, i) => {
          const isActive = p.id === phase;
          const isDone = PHASES.findIndex((x) => x.id === phase) > i;
          return (
            <div key={p.id} className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setPhase(p.id)}
                className={cls(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  isActive && "bg-primary text-primary-foreground",
                  isDone && "bg-success/20 text-success",
                  !isActive && !isDone && "bg-muted text-muted-foreground"
                )}
              >
                <p.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{p.label}</span>
              </button>
              {i < PHASES.length - 1 && (
                <div className="w-4 h-px bg-border shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Phase content */}
      <div className="rounded-xl border border-border bg-card p-6">
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
          <OutputPhase
            report={{ ...report, sanctions }}
            finalized={finalized}
            handleFinalize={handleFinalize}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={prevPhase}
          disabled={currentIdx === 0}
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="h-4 w-4" />
          Precedente
        </button>

        {phase !== "output" && (
          <button
            onClick={nextPhase}
            disabled={currentIdx === PHASES.length - 1}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Prossimo
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── PHASE COMPONENTS ──────────────────────────────────────────────────

function ScopingPhase({
  report,
  setReport,
  riskForm,
  setRiskForm,
  showRiskForm,
  setShowRiskForm,
  addRisk,
  removeRisk,
}: {
  report: RiskManagerReport;
  setReport: (r: RiskManagerReport) => void;
  riskForm: any;
  setRiskForm: (f: any) => void;
  showRiskForm: boolean;
  setShowRiskForm: (v: boolean) => void;
  addRisk: () => void;
  removeRisk: (id: string) => void;
}) {
  const highCount = report.risks.filter((r) => r.severity === "high").length;
  const score = report.overallScore;

  // ─── Auto-fill suggestion state ─────────────────────────────────
  const [suggestion, setSuggestion] = useState<RiskSuggestion | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [residualWarning, setResidualWarning] = useState<ResidualWarning>({ show: false, message: "", severity: "info" });
  const [suggestionUsed, setSuggestionUsed] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced text analysis → suggestion
  const handleDescriptionChange = useCallback((value: string) => {
    setRiskForm((prev: typeof riskForm) => ({ ...prev, description: value }));
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

  // Validate residual risk on any relevant field change
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
    setRiskForm((prev: typeof riskForm) => ({
      ...prev,
      severity: suggestion.severity,
      probability: suggestion.probability,
      residual: suggestion.residual,
    }));
    setSuggestionUsed(true);
  }

  return (
    <div>
      {/* Header with guide button */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold text-foreground">
          Scoping & Identificazione Rischi
        </h2>
        <button
          onClick={() => setShowGuide(!showGuide)}
          className={cls(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border",
            showGuide
              ? "bg-primary/10 text-primary border-primary/30"
              : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
          )}
        >
          <Eye className="h-3.5 w-3.5" />
          Guida ai Criteri
        </button>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Sistema:{" "}
        <input
          value={report.systemName}
          onChange={(e) => setReport({ ...report, systemName: e.target.value })}
          className="border-b border-border bg-transparent px-1 text-foreground focus:outline-none focus:border-primary"
        />
      </p>

      {/* Guida ai Criteri slide-out panel */}
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

      {/* Scoreboard */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Rischi totali", value: report.risks.length, color: "text-foreground" },
          { label: "Alta severità", value: highCount, color: "text-danger" },
          { label: "Score medio", value: score.toFixed(2), color: "text-warning" },
          { label: "Rating", value: computeOverallRating(score), color: "text-primary" },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-muted/50 p-3">
            <div className={`text-xl font-bold ${c.color}`}>{c.value}</div>
            <div className="mt-1 text-[10px] text-muted-foreground uppercase">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Add risk button */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Rischi identificati</h3>
        <button
          onClick={() => setShowRiskForm(!showRiskForm)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Nuovo rischio
        </button>
      </div>

      {/* Risk form */}
      {showRiskForm && (
        <div className="rounded-xl border border-border bg-muted/50 p-4 mb-4 space-y-3">
          {/* Description + auto-fill suggestion */}
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
            {/* Severity with suggestion badge */}
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
            {/* Probability with suggestion badge */}
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

          {/* Residual risk validation warning */}
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

      {/* Risk list */}
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
            <input
              type="number"
              value={(mcInput as any)[f.key]}
              onChange={(e) => setMcInput({ ...mcInput, [f.key]: Number(e.target.value) })}
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

          {/* Distribution bars */}
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
  tempForm: { entityType: string; entityId: string; dataJson: string; validTime: string };
  setTempForm: (v: any) => void;
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

function GPAIPhase({
  gpaiForm,
  setGpaiForm,
  gpaiResult,
  handleAssessGPAI,
}: {
  gpaiForm: any;
  setGpaiForm: (v: any) => void;
  gpaiResult: GPAIRiskAssessment | null;
  handleAssessGPAI: () => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-1">
        GPAI & Rischio Sistemico
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
        Governance & Sanzioni (Art. 99)
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

function OutputPhase({
  report,
  finalized,
  handleFinalize,
}: {
  report: RiskManagerReport;
  finalized: boolean;
  handleFinalize: () => void;
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

      {/* Scoreboard */}
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

      {/* System summary */}
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

      {/* Overall rating */}
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

      {/* Finalize */}
      {!finalized ? (
        <button
          onClick={handleFinalize}
          className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors mx-auto"
        >
          <Shield className="h-4 w-4" />
          Finalizza e sigilla (SHA-256)
        </button>
      ) : (
        <div className="rounded-xl border border-success/30 bg-success/5 p-6 text-center">
          <CheckCircle className="h-8 w-8 text-success mx-auto mb-2" />
          <p className="text-sm font-semibold text-success">Report finalizzato e sigillato</p>
          <p className="text-xs text-muted-foreground mt-1">
            Evidence hash: {report.evidenceHash.slice(0, 32)}...
          </p>
        </div>
      )}
    </div>
  );
}
