"use client";

import { useState, useMemo } from "react";
import {
  Users,
  Shield,
  ChevronRight,
  ChevronLeft,
  Download,
  Globe,
  AlertTriangle,
  CheckCircle,
  Search,
  FileText,
  Brain,
  Eye,
  Zap,
  Lock,
  Clock,
  Send,
  Save,
  RefreshCw,
  UserCheck,
  X,
  Plus,
  Trash2,
} from "lucide-react";
import {
  createEmptyFRIAReport,
  computeCOBRAScore,
  parseArt13Instructions,
  DPIA_TO_FRIA_MAP,
  computeDeltaGaps,
  computeRightsApplicability,
  AFFECTED_PERSON_CATEGORIES,
  EU_CHARTER_RIGHTS,
  generateRiskScenarios,
  RULE_OF_2_CHECKS,
  evaluateRuleOf2,
  finalizeFRIAReport,
  generateMSASubmissionData,
  type FRIAReport,
  type FRIAPhase,
  type DeployerType,
  type AnnexIIICategory,
  type RiskScenario,
  type FundamentalRight,
  type AffectedPerson,
  type AgenticControl,
  type OversightRole,
  type CircuitBreaker,
  type DPIAField,
} from "@/lib/simulation/fria-engine";

const PHASES: { key: FRIAPhase; label: string; icon: typeof Search }[] = [
  { key: "scoping", label: "Scoping & Triage", icon: Search },
  { key: "dpia", label: "Import DPIA", icon: FileText },
  { key: "rights_analysis", label: "Analisi Diritti", icon: Shield },
  { key: "agentic", label: "IA Agentica", icon: Brain },
  { key: "oversight", label: "Sorveglianza", icon: Eye },
  { key: "output", label: "Report & MSA", icon: Download },
];

export default function RightsSimulatorPage() {
  const [step, setStep] = useState(0);
  const [report, setReport] = useState<FRIAReport>(() =>
    createEmptyFRIAReport("Nuovo Sistema AI", "", "private_company", "")
  );
  const [saved, setSaved] = useState(false);

  function updateReport(patch: Partial<FRIAReport>) {
    setReport((prev) => ({ ...prev, ...patch, updatedAt: new Date().toISOString() }));
  }

  function updatePhase<T extends keyof FRIAReport>(phase: T, patch: Partial<FRIAReport[T]>) {
    setReport((prev) => ({
      ...prev,
      [phase]: { ...(prev[phase] as object), ...patch },
      updatedAt: new Date().toISOString(),
    }));
  }

  const isPhaseComplete = (phase: FRIAPhase): boolean => report.completedPhases.includes(phase);

  function completePhase(phase: FRIAPhase) {
    if (!isPhaseComplete(phase)) {
      setReport((prev) => ({
        ...prev,
        completedPhases: [...new Set([...prev.completedPhases, phase])],
        updatedAt: new Date().toISOString(),
      }));
    }
  }

  function nextStep() {
    const currentPhase = PHASES[step].key;
    completePhase(currentPhase);
    if (step < PHASES.length - 1) setStep(step + 1);
  }

  function prevStep() {
    if (step > 0) setStep(step - 1);
  }

  async function handleFinalize() {
    completePhase("output");
    const finalized = await finalizeFRIAReport(report);
    setReport(finalized);
    setSaved(true);
  }

  const phase = PHASES[step];

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 p-2.5">
            <Users className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Rights-Simulator</h1>
          <span className="text-xs font-medium text-muted-foreground bg-muted rounded-full px-2.5 py-0.5">Art. 27</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Fundamental Rights Impact Assessment (FRIA) — Workflow a gate sequenziali. Completa ogni fase per sbloccare la successiva.
        </p>
      </div>

      {/* Progress Stepper */}
      <div className="rounded-xl border border-border bg-card p-4 mb-6">
        <div className="flex items-center gap-1">
          {PHASES.map((p, i) => {
            const done = isPhaseComplete(p.key) || i < step;
            const active = i === step;
            const Icon = p.icon;
            return (
              <button
                key={p.key}
                onClick={() => {
                  if (done || i <= step) setStep(i);
                }}
                disabled={!done && i > step}
                className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs transition-all ${
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : done
                    ? "text-foreground hover:bg-muted cursor-pointer"
                    : "text-muted-foreground/40 cursor-not-allowed"
                }`}
              >
                <div
                  className={`rounded-full w-6 h-6 flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    done
                      ? "bg-success text-white"
                      : active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {done ? <CheckCircle className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span className="hidden lg:inline truncate">{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Phase Content */}
      <div className="rounded-xl border border-border bg-card p-6 mb-4">
        <div className="flex items-center gap-3 mb-6">
          <phase.icon className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">{phase.label}</h2>
            <p className="text-xs text-muted-foreground">Fase {step + 1} di {PHASES.length}</p>
          </div>
        </div>

        {/* PHASE 0: SCOPING & TRIAGE */}
        {step === 0 && (
          <ScopingPhase
            report={report}
            updatePhase={(p) => updatePhase("scoping", p)}
            updateReport={updateReport}
            completePhase={() => completePhase("scoping")}
          />
        )}

        {/* PHASE 1: DPIA */}
        {step === 1 && (
          <DPIAPhase
            report={report}
            updatePhase={(p) => updatePhase("dpia", p)}
          />
        )}

        {/* PHASE 2: RIGHTS ANALYSIS */}
        {step === 2 && (
          <RightsAnalysisPhase
            report={report}
            updatePhase={(p) => updatePhase("rightsAnalysis", p)}
            updateReport={updateReport}
          />
        )}

        {/* PHASE 3: AGENTIC AI */}
        {step === 3 && (
          <AgenticPhase
            report={report}
            updatePhase={(p) => updatePhase("agentic", p)}
          />
        )}

        {/* PHASE 4: OVERSIGHT */}
        {step === 4 && (
          <OversightPhase
            report={report}
            updatePhase={(p) => updatePhase("oversight", p)}
          />
        )}

        {/* PHASE 5: OUTPUT */}
        {step === 5 && (
          <OutputPhase
            report={report}
            saved={saved}
            onFinalize={handleFinalize}
            updateReport={updateReport}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevStep}
          disabled={step === 0}
          className="rounded-lg border border-border px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed inline-flex items-center gap-1"
        >
          <ChevronLeft className="h-4 w-4" /> Indietro
        </button>

        <div className="text-xs text-muted-foreground">
          {report.completedPhases.length} / {PHASES.length} fasi completate
        </div>

        {step < PHASES.length - 1 ? (
          <button
            onClick={nextStep}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1"
          >
            Avanti <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleFinalize}
            disabled={saved}
            className="rounded-lg bg-success px-5 py-2.5 text-sm font-medium text-white hover:bg-success/90 disabled:opacity-50 inline-flex items-center gap-1"
          >
            {saved ? (
              <>
                <CheckCircle className="h-4 w-4" /> Report generato
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Finalizza FRIA
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ============== PHASE 1: SCOPING & TRIAGE ==============

function ScopingPhase({
  report,
  updatePhase,
  updateReport,
  completePhase,
}: {
  report: FRIAReport;
  updatePhase: (p: Partial<FRIAReport["scoping"]>) => void;
  updateReport: (p: Partial<FRIAReport>) => void;
  completePhase: () => void;
}) {
  const [useCase, setUseCase] = useState("");
  const [usesBiometrics, setUsesBiometrics] = useState(false);
  const [processesPersonalData, setProcessesPersonalData] = useState(true);
  const [makesAutomatedDecisions, setMakesAutomatedDecisions] = useState(false);
  const [affectsVulnerableGroups, setAffectsVulnerableGroups] = useState(false);
  const [art13Text, setArt13Text] = useState("");
  const [result, setResult] = useState<ReturnType<typeof computeCOBRAScore> | null>(null);

  function runCOBRA() {
    const r = computeCOBRAScore({
      deployerType: report.deployer.type,
      useCase,
      usesBiometrics,
      processesPersonalData,
      makesAutomatedDecisions,
      affectsVulnerableGroups,
    });
    setResult(r);
    updateReport({ riskClass: r.score >= 50 ? "high" : r.score >= 25 ? "limited" : "minimal", annexCategory: r.annexCat });
    updatePhase({ cobraScore: r.score, isApplicable: r.isApplicable, rationale: r.rationale });
    completePhase();
  }

  function parseInstructions() {
    const parsed = parseArt13Instructions(art13Text);
    updatePhase({
      art13Instructions: art13Text,
      art13Capabilities: parsed.capabilities,
      art13Limitations: parsed.limitations,
    });
  }

  const deployerLabels: Record<DeployerType, string> = {
    public_body: "Ente pubblico (es. ministero, comune, ASL)",
    public_service_provider: "Fornitore di servizi pubblici (es. trasporti, energia)",
    critical_sector: "Settore critico (es. banca, assicurazione)",
    private_company: "Azienda privata",
    sme: "PMI / Startup",
  };

  return (
    <div className="space-y-6">
      {/* Deployer Type */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Tipo di Deployer</label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {(Object.entries(deployerLabels) as [DeployerType, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => updateReport({ deployer: { ...report.deployer, type: key } })}
              className={`rounded-lg border px-3 py-2.5 text-xs text-left transition-all ${
                report.deployer.type === key
                  ? "border-primary/60 bg-primary/5 text-foreground"
                  : "border-border text-muted-foreground hover:border-border/80"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* System Name */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Nome del Sistema AI</label>
        <input
          type="text"
          value={report.systemName}
          onChange={(e) => updateReport({ systemName: e.target.value })}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          placeholder="es. Sistema di screening automatico CV"
        />
      </div>

      {/* Use Case */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Caso d&apos;uso (breve descrizione)</label>
        <textarea
          value={useCase}
          onChange={(e) => setUseCase(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          placeholder="es. Classificazione automatica dei CV per selezione del personale"
        />
      </div>

      {/* Risk factors */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground block">Fattori di Rischio (COBRA)</label>
        {[
          { label: "Utilizza dati biometrici (volto, voce, impronte)", value: usesBiometrics, set: setUsesBiometrics },
          { label: "Tratta dati personali di persone fisiche", value: processesPersonalData, set: setProcessesPersonalData },
          { label: "Prende decisioni automatizzate su persone", value: makesAutomatedDecisions, set: setMakesAutomatedDecisions },
          { label: "Può impattare gruppi vulnerabili (minori, anziani, disabili, minoranze)", value: affectsVulnerableGroups, set: setAffectsVulnerableGroups },
        ].map((f) => (
          <label key={f.label} className="flex items-center gap-3 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={f.value}
              onChange={(e) => f.set(e.target.checked)}
              className="rounded border-border bg-muted accent-primary"
            />
            {f.label}
          </label>
        ))}
      </div>

      {/* Art. 13 Instructions */}
      <div className="border-t border-border pt-4">
        <label className="text-sm font-medium text-foreground mb-2 block">
          Istruzioni d&apos;uso del Fornitore (Art. 13 AI Act)
        </label>
        <textarea
          value={art13Text}
          onChange={(e) => setArt13Text(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          placeholder="Incolla qui le istruzioni d'uso fornite dal produttore dell'IA (capacità, limitazioni, contesto d'uso previsto)..."
        />
        <button
          onClick={parseInstructions}
          disabled={!art13Text.trim()}
          className="mt-2 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30"
        >
          Analizza istruzioni (parsing automatico)
        </button>
        {report.scoping.art13Capabilities.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[10px] font-semibold text-success mb-1">CAPACITÀ RILEVATE</p>
              {report.scoping.art13Capabilities.map((c, i) => (
                <p key={i} className="text-xs text-muted-foreground">• {c}</p>
              ))}
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[10px] font-semibold text-warning mb-1">LIMITAZIONI RILEVATE</p>
              {report.scoping.art13Limitations.map((l, i) => (
                <p key={i} className="text-xs text-muted-foreground">• {l}</p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Run COBRA */}
      <div className="border-t border-border pt-4">
        <button
          onClick={runCOBRA}
          disabled={!useCase.trim()}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40 inline-flex items-center gap-2"
        >
          <Zap className="h-4 w-4" /> Esegui Analisi COBRA
        </button>

        {result && (
          <div className={`mt-4 rounded-lg border p-4 ${result.isApplicable ? "border-warning/40 bg-warning/5" : "border-success/40 bg-success/5"}`}>
            <div className="flex items-start gap-3">
              {result.isApplicable ? (
                <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
              ) : (
                <CheckCircle className="h-5 w-5 text-success mt-0.5" />
              )}
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {result.isApplicable ? "FRIA OBBLIGATORIA" : "FRIA non obbligatoria"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{result.rationale}</p>
                <div className="flex items-center gap-4 mt-3">
                  <div className="text-xs">
                    <span className="text-muted-foreground">Punteggio COBRA: </span>
                    <span className={`font-bold font-mono ${result.score >= 50 ? "text-danger" : result.score >= 25 ? "text-warning" : "text-success"}`}>
                      {result.score}/100
                    </span>
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">Classe rischio: </span>
                    <span className="font-bold text-foreground">
                      {result.score >= 50 ? "Alto" : result.score >= 25 ? "Limitato" : "Minimo"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============== PHASE 2: DPIA BRIDGE ==============

function DPIAPhase({
  report,
  updatePhase,
}: {
  report: FRIAReport;
  updatePhase: (p: Partial<FRIAReport["dpia"]>) => void;
}) {
  const [hasDPIA, setHasDPIA] = useState(report.dpia.hasExistingDPIA);
  const [fields, setFields] = useState<DPIAField[]>(
    report.dpia.mappedFields.length > 0 ? report.dpia.mappedFields : DPIA_TO_FRIA_MAP
  );
  const [gaps, setGaps] = useState<string[]>(report.dpia.deltaGaps);

  function toggleDPIA(v: boolean) {
    setHasDPIA(v);
    updatePhase({ hasExistingDPIA: v });
  }

  function updateField(index: number, value: string) {
    const updated = fields.map((f, i) => (i === index ? { ...f, value, mapped: value.trim().length > 0 } : f));
    setFields(updated);
    updatePhase({ mappedFields: updated });
  }

  function runGapAnalysis() {
    const g = computeDeltaGaps(fields);
    setGaps(g);
    updatePhase({ deltaGaps: g });
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium text-foreground mb-3 block">Hai già una DPIA (Data Protection Impact Assessment) per questo sistema?</label>
        <div className="flex gap-3">
          <button
            onClick={() => toggleDPIA(true)}
            className={`rounded-lg border px-4 py-2.5 text-sm ${hasDPIA ? "border-primary/60 bg-primary/5 text-foreground" : "border-border text-muted-foreground"}`}
          >
            Sì, ho una DPIA esistente
          </button>
          <button
            onClick={() => toggleDPIA(false)}
            className={`rounded-lg border px-4 py-2.5 text-sm ${!hasDPIA ? "border-primary/60 bg-primary/5 text-foreground" : "border-border text-muted-foreground"}`}
          >
            No, devo ancora farla
          </button>
        </div>
      </div>

      {hasDPIA && (
        <>
          <div className="border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground mb-3">Mappatura Campi DPIA → AI Act</p>
            <p className="text-xs text-muted-foreground mb-4">
              Importa i dati dalla tua DPIA esistente nei campi corrispondenti. I campi condivisi tra GDPR e AI Act verranno automaticamente collegati.
            </p>
            <div className="space-y-3">
              {fields.map((f, i) => (
                <div key={f.field} className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <p className="text-xs font-medium text-foreground">{f.field}</p>
                      <p className="text-[10px] text-primary mt-0.5">→ AI Act: {f.aiActRelevance}</p>
                    </div>
                    {f.mapped && <CheckCircle className="h-3.5 w-3.5 text-success shrink-0" />}
                  </div>
                  <textarea
                    value={f.value}
                    onChange={(e) => updateField(i, e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                    placeholder={`Inserisci il valore dal tuo documento DPIA per "${f.field}"...`}
                  />
                </div>
              ))}
            </div>
            <button
              onClick={runGapAnalysis}
              className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Esegui Delta-Gap Analysis
            </button>
          </div>

          {gaps.length > 0 && (
            <div className="rounded-lg border border-warning/40 bg-warning/5 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Delta-Gap Analysis</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-3">
                    La tua DPIA copre la privacy GDPR, ma la FRIA richiede anche l&apos;analisi dei diritti extra-privacy.
                  </p>
                  <ul className="space-y-1">
                    {gaps.map((g, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="text-warning shrink-0">•</span>
                        {g}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {!hasDPIA && (
        <div className="rounded-lg border border-border bg-background p-6 text-center">
          <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Ti consigliamo di completare prima una DPIA ai sensi del GDPR (Art. 35).
            <br />
            Puoi comunque procedere con la FRIA — il sistema segnalerà i gap da colmare.
          </p>
        </div>
      )}
    </div>
  );
}

// ============== PHASE 3: RIGHTS ANALYSIS ==============

function RightsAnalysisPhase({
  report,
  updatePhase,
  updateReport,
}: {
  report: FRIAReport;
  updatePhase: (p: Partial<FRIAReport["rightsAnalysis"]>) => void;
  updateReport: (p: Partial<FRIAReport>) => void;
}) {
  const rights = useMemo(
    () => computeRightsApplicability(report.systemName, report.deployer.type, report.annexCategory),
    [report.systemName, report.deployer.type, report.annexCategory]
  );

  const [scoredRights, setScoredRights] = useState<FundamentalRight[]>(
    report.rightsAnalysis.applicableRights.length > 0 ? report.rightsAnalysis.applicableRights : rights
  );

  const [affectedPeople, setAffectedPeople] = useState<AffectedPerson[]>(
    report.rightsAnalysis.affectedPeople.length > 0
      ? report.rightsAnalysis.affectedPeople
      : []
  );

  const [scenarios, setScenarios] = useState<RiskScenario[]>(
    report.rightsAnalysis.riskScenarios.length > 0
      ? report.rightsAnalysis.riskScenarios
      : []
  );

  function setRightScore(article: number, riskScore: number) {
    setScoredRights((prev) =>
      prev.map((r) => (r.article === article ? { ...r, riskScore } : r))
    );
  }

  function addAffectedPerson(cat: string, vuln: AffectedPerson["vulnerability"]) {
    if (affectedPeople.some((p) => p.category === cat)) return;
    const p: AffectedPerson = {
      id: crypto.randomUUID(),
      category: cat,
      description: `Persone appartenenti al gruppo "${cat}"`,
      vulnerability: vuln,
      estimatedCount: 0,
    };
    setAffectedPeople((prev) => [...prev, p]);
  }

  function removeAffectedPerson(id: string) {
    setAffectedPeople((prev) => prev.filter((p) => p.id !== id));
  }

  function updateScenario(id: string, patch: Partial<RiskScenario>) {
    setScenarios((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, ...patch };
        if (patch.likelihood !== undefined || patch.severity !== undefined) {
          updated.riskScore = (patch.likelihood ?? s.likelihood) * (patch.severity ?? s.severity);
        }
        return updated;
      })
    );
  }

  function generateScenarios() {
    const s = generateRiskScenarios(scoredRights, affectedPeople);
    setScenarios(s);
  }

  function saveRightsAnalysis() {
    updatePhase({
      applicableRights: scoredRights,
      affectedPeople,
      riskScenarios: scenarios,
      overallScore: scenarios.length > 0
        ? Math.round(scenarios.reduce((acc, s) => acc + s.riskScore, 0) / scenarios.length)
        : 0,
    });
  }

  const riskLevel = scenarios.filter((s) => s.riskScore >= 12).length;

  return (
    <div className="space-y-6">
      {/* EU Charter Rights */}
      <div>
        <p className="text-sm font-medium text-foreground mb-3">
          Diritti Fondamentali Applicabili — Carta UE ({scoredRights.length} diritti identificati)
        </p>
        <div className="grid gap-2 max-h-64 overflow-y-auto">
          {scoredRights.map((r) => (
            <div key={r.article} className="rounded-lg border border-border bg-background p-3 flex items-center gap-3">
              <div className="text-[10px] font-bold text-primary bg-primary/10 rounded-full w-7 h-7 flex items-center justify-center shrink-0">
                {r.article}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{r.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">{r.description}</p>
              </div>
              <select
                value={r.riskScore}
                onChange={(e) => setRightScore(r.article, Number(e.target.value))}
                className="text-xs rounded-lg border border-border bg-card px-2 py-1.5 text-foreground"
              >
                <option value={0}>Non valutato</option>
                <option value={10}>Basso (10)</option>
                <option value={30}>Medio (30)</option>
                <option value={60}>Alto (60)</option>
                <option value={90}>Critico (90)</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Affected People */}
      <div className="border-t border-border pt-4">
        <p className="text-sm font-medium text-foreground mb-3">Persone Affette (gruppi impattati)</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
          {AFFECTED_PERSON_CATEGORIES.map((apc) => {
            const added = affectedPeople.some((p) => p.category === apc.category);
            return (
              <button
                key={apc.category}
                onClick={() => addAffectedPerson(apc.category, apc.vulnerability)}
                disabled={added}
                className={`rounded-lg border px-3 py-2 text-xs text-left transition-all ${
                  added
                    ? "border-success/40 bg-success/5 text-success"
                    : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                }`}
              >
                {added && <CheckCircle className="h-3 w-3 inline mr-1" />}
                {apc.category}
              </button>
            );
          })}
        </div>
        {affectedPeople.length > 0 && (
          <div className="space-y-2">
            {affectedPeople.map((p) => (
              <div key={p.id} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${
                  p.vulnerability === "high" ? "text-danger bg-danger/10" : p.vulnerability === "medium" ? "text-warning bg-warning/10" : "text-muted-foreground bg-muted"
                }`}>
                  {p.vulnerability === "high" ? "ALTA" : p.vulnerability === "medium" ? "MEDIA" : "BASSA"}
                </span>
                <span className="text-xs text-foreground flex-1">{p.category}</span>
                <button onClick={() => removeAffectedPerson(p.id)} className="text-muted-foreground hover:text-danger">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Risk Scenarios */}
      <div className="border-t border-border pt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-foreground">Scenari di Rischio (R = L × S)</p>
          <button onClick={generateScenarios} disabled={affectedPeople.length === 0} className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30">
            Genera scenari automaticamente
          </button>
        </div>

        {scenarios.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {scenarios.map((sc) => (
              <div key={sc.id} className={`rounded-lg border p-3 ${sc.riskScore >= 20 ? "border-danger/40 bg-danger/5" : sc.riskScore >= 12 ? "border-warning/40 bg-warning/5" : "border-border bg-background"}`}>
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs font-medium text-foreground">{sc.description}</p>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <select
                      value={sc.likelihood}
                      onChange={(e) => updateScenario(sc.id, { likelihood: Number(e.target.value) })}
                      className="text-[10px] rounded border border-border bg-card px-1.5 py-1"
                    >
                      {[1, 2, 3, 4, 5].map((v) => (
                        <option key={v} value={v}>L={v}</option>
                      ))}
                    </select>
                    <span className="text-[10px] text-muted-foreground">×</span>
                    <select
                      value={sc.severity}
                      onChange={(e) => updateScenario(sc.id, { severity: Number(e.target.value) })}
                      className="text-[10px] rounded border border-border bg-card px-1.5 py-1"
                    >
                      {[1, 2, 3, 4, 5].map((v) => (
                        <option key={v} value={v}>S={v}</option>
                      ))}
                    </select>
                    <span className="text-[10px] text-muted-foreground">=</span>
                    <span className={`text-xs font-bold font-mono ${sc.riskScore >= 20 ? "text-danger" : sc.riskScore >= 12 ? "text-warning" : "text-success"}`}>
                      {sc.riskScore}
                    </span>
                  </div>
                </div>
                <input
                  type="text"
                  value={sc.mitigation}
                  onChange={(e) => updateScenario(sc.id, { mitigation: e.target.value })}
                  className="w-full rounded border border-border bg-card px-2 py-1.5 text-[10px] text-foreground placeholder:text-muted-foreground"
                  placeholder="Misure di mitigazione..."
                />
              </div>
            ))}
          </div>
        )}

        {scenarios.length > 0 && (
          <div className="mt-3 flex items-center gap-4 text-xs">
            <span className="text-muted-foreground">
              Scenari totali: <span className="text-foreground font-bold">{scenarios.length}</span>
            </span>
            <span className="text-muted-foreground">
              Alto rischio (R ≥ 12):{" "}
              <span className={riskLevel > 0 ? "text-danger font-bold" : "text-success"}>{riskLevel}</span>
            </span>
          </div>
        )}
      </div>

      <button
        onClick={saveRightsAnalysis}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Salva Analisi Diritti
      </button>
    </div>
  );
}

// ============== PHASE 4: AGENTIC AI ==============

function AgenticPhase({
  report,
  updatePhase,
}: {
  report: FRIAReport;
  updatePhase: (p: Partial<FRIAReport["agentic"]>) => void;
}) {
  const [isAgentic, setIsAgentic] = useState(report.agentic.isAgentic);
  const [controls, setControls] = useState<AgenticControl[]>(
    report.agentic.controls.length > 0 ? report.agentic.controls : RULE_OF_2_CHECKS
  );
  const [memory, setMemory] = useState(report.agentic.memoryManagement);

  function toggleControl(index: number) {
    const updated = controls.map((c, i) => (i === index ? { ...c, passed: !c.passed } : c));
    setControls(updated);
    const violated = evaluateRuleOf2(updated);
    updatePhase({ controls: updated, ruleOf2Violated: violated });
  }

  function saveAgentic() {
    const violated = evaluateRuleOf2(controls);
    updatePhase({ isAgentic, controls, ruleOf2Violated: violated, memoryManagement: memory });
  }

  const violated = evaluateRuleOf2(controls);
  const riskCount = controls.filter((c) => !c.passed).length;

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium text-foreground mb-3 block">
          Il tuo sistema di IA è &quot;agentico&quot; (agisce in modo autonomo e proattivo senza supervisione immediata)?
        </label>
        <div className="flex gap-3">
          <button
            onClick={() => setIsAgentic(true)}
            className={`rounded-lg border px-4 py-2.5 text-sm ${isAgentic ? "border-primary/60 bg-primary/5 text-foreground" : "border-border text-muted-foreground"}`}
          >
            Sì, è agentico
          </button>
          <button
            onClick={() => setIsAgentic(false)}
            className={`rounded-lg border px-4 py-2.5 text-sm ${!isAgentic ? "border-primary/60 bg-primary/5 text-foreground" : "border-border text-muted-foreground"}`}
          >
            No, non è agentico
          </button>
        </div>
      </div>

      {isAgentic && (
        <>
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
            <div className="flex items-start gap-3">
              <Brain className="h-5 w-5 text-warning mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">Rule of 2 — AEPD (Autorità Spagnola)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Un sistema agentico non deve mai combinare 2+ dei seguenti fattori di rischio senza blocco manuale.
                  Se 2+ fattori sono attivi, il sistema viola la regola e richiede un controllo umano obbligatorio.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {controls.map((c, i) => (
              <div key={c.check} className={`rounded-lg border p-4 transition-all ${!c.passed ? "border-danger/40 bg-danger/5" : "border-border bg-background"}`}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={c.passed}
                    onChange={() => toggleControl(i)}
                    className="mt-0.5 rounded border-border bg-muted accent-primary"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${
                        c.riskFactor === "input" ? "text-blue-400 bg-blue-400/10" :
                        c.riskFactor === "data_access" ? "text-purple-400 bg-purple-400/10" :
                        "text-orange-400 bg-orange-400/10"
                      }`}>
                        {c.riskFactor === "input" ? "INPUT" : c.riskFactor === "data_access" ? "DATI" : "AZIONE"}
                      </span>
                      <span className="text-sm font-medium text-foreground">{c.check}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{c.description}</p>
                    <p className="text-[10px] mt-1">
                      {c.passed ? (
                        <span className="text-success">✓ Il sistema NON presenta questo fattore di rischio</span>
                      ) : (
                        <span className="text-danger">⚠ Il sistema presenta questo fattore di rischio</span>
                      )}
                    </p>
                  </div>
                </label>
              </div>
            ))}
          </div>

          {/* Rule of 2 status */}
          <div className={`rounded-lg border p-4 ${violated ? "border-danger/60 bg-danger/10" : "border-success/40 bg-success/5"}`}>
            <div className="flex items-start gap-3">
              {violated ? (
                <AlertTriangle className="h-5 w-5 text-danger mt-0.5 shrink-0" />
              ) : (
                <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
              )}
              <div>
                <p className={`text-sm font-semibold ${violated ? "text-danger" : "text-success"}`}>
                  {violated
                    ? `VIOLAZIONE Rule of 2: ${riskCount}/3 fattori di rischio attivi`
                    : "Rule of 2 rispettata: ≤1 fattore di rischio attivo"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {violated
                    ? "Devi introdurre un blocco manuale (human-in-the-loop) per almeno uno dei fattori attivi."
                    : "Il sistema può operare in modalità agentica con i controlli attuali."}
                </p>
              </div>
            </div>
          </div>

          {/* Working Memory */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Gestione Working Memory dell&apos;Agente</label>
            <textarea
              value={memory}
              onChange={(e) => setMemory(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              placeholder="Descrivi come viene gestita la memoria di lavoro dell'agente: periodi di conservazione, meccanismi di reset, prevenzione bias persistenti..."
            />
          </div>

          <button onClick={saveAgentic} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Salva Controlli Agentici
          </button>
        </>
      )}

      {!isAgentic && (
        <div className="rounded-lg border border-border bg-background p-6 text-center">
          <CheckCircle className="h-8 w-8 text-success mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Sistema non agentico — i controlli avanzati non sono richiesti.
            <br />
            Puoi procedere alla fase successiva.
          </p>
        </div>
      )}
    </div>
  );
}

// ============== PHASE 5: OVERSIGHT ==============

function OversightPhase({
  report,
  updatePhase,
}: {
  report: FRIAReport;
  updatePhase: (p: Partial<FRIAReport["oversight"]>) => void;
}) {
  const [roles, setRoles] = useState<OversightRole[]>(report.oversight.roles);
  const [breakers, setBreakers] = useState<CircuitBreaker[]>(report.oversight.circuitBreakers);
  const [complaintChannel, setComplaintChannel] = useState(report.oversight.complaintChannel);

  const [newRole, setNewRole] = useState({ name: "", qualification: "", aiLiteracyLevel: "intermediate" as OversightRole["aiLiteracyLevel"] });
  const [newBreaker, setNewBreaker] = useState({ trigger: "", action: "", responseTime: "" });

  function addRole() {
    if (!newRole.name.trim()) return;
    setRoles((prev) => [...prev, { ...newRole, responsabilities: [] }]);
    setNewRole({ name: "", qualification: "", aiLiteracyLevel: "intermediate" });
  }

  function removeRole(index: number) {
    setRoles((prev) => prev.filter((_, i) => i !== index));
  }

  function addBreaker() {
    if (!newBreaker.trigger.trim() || !newBreaker.action.trim()) return;
    setBreakers((prev) => [
      ...prev,
      { id: crypto.randomUUID(), ...newBreaker, lastTested: null },
    ]);
    setNewBreaker({ trigger: "", action: "", responseTime: "" });
  }

  function removeBreaker(id: string) {
    setBreakers((prev) => prev.filter((b) => b.id !== id));
  }

  function saveOversight() {
    updatePhase({ roles, circuitBreakers: breakers, complaintChannel });
  }

  return (
    <div className="space-y-6">
      {/* Oversight Roles */}
      <div>
        <p className="text-sm font-medium text-foreground mb-3">Ruoli di Sorveglianza Umana (Art. 14 AI Act)</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
          <input
            type="text"
            value={newRole.name}
            onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
            placeholder="Nome ruolo (es. Compliance Officer)"
          />
          <input
            type="text"
            value={newRole.qualification}
            onChange={(e) => setNewRole({ ...newRole, qualification: e.target.value })}
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
            placeholder="Qualifica specifica"
          />
          <div className="flex gap-1">
            <select
              value={newRole.aiLiteracyLevel}
              onChange={(e) => setNewRole({ ...newRole, aiLiteracyLevel: e.target.value as OversightRole["aiLiteracyLevel"] })}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
            >
              <option value="basic">AI Literacy Base</option>
              <option value="intermediate">AI Literacy Intermedia</option>
              <option value="advanced">AI Literacy Avanzata</option>
              <option value="expert">AI Literacy Esperta</option>
            </select>
            <button onClick={addRole} className="rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground hover:bg-primary/90">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {roles.length > 0 && (
          <div className="space-y-2">
            {roles.map((r, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
                <UserCheck className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{r.name}</p>
                  <p className="text-[10px] text-muted-foreground">{r.qualification} • {r.aiLiteracyLevel}</p>
                </div>
                <button onClick={() => removeRole(i)} className="text-muted-foreground hover:text-danger">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Circuit Breakers */}
      <div className="border-t border-border pt-4">
        <p className="text-sm font-medium text-foreground mb-3">Circuit Breakers (Protocolli di Emergenza)</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
          <input
            type="text"
            value={newBreaker.trigger}
            onChange={(e) => setNewBreaker({ ...newBreaker, trigger: e.target.value })}
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
            placeholder="Trigger (es. bias > soglia)"
          />
          <input
            type="text"
            value={newBreaker.action}
            onChange={(e) => setNewBreaker({ ...newBreaker, action: e.target.value })}
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
            placeholder="Azione (es. kill switch)"
          />
          <div className="flex gap-1">
            <input
              type="text"
              value={newBreaker.responseTime}
              onChange={(e) => setNewBreaker({ ...newBreaker, responseTime: e.target.value })}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              placeholder="Tempo risposta (es. <5 min)"
            />
            <button onClick={addBreaker} className="rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground hover:bg-primary/90">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {breakers.length > 0 && (
          <div className="space-y-2">
            {breakers.map((b) => (
              <div key={b.id} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
                <Zap className="h-4 w-4 text-warning shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    Trigger: <span className="text-warning">{b.trigger}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Azione: {b.action} {b.responseTime && `• Tempo: ${b.responseTime}`}
                  </p>
                </div>
                <button onClick={() => removeBreaker(b.id)} className="text-muted-foreground hover:text-danger">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Complaint Channel */}
      <div className="border-t border-border pt-4">
        <label className="text-sm font-medium text-foreground mb-2 block">
          Meccanismo di Reclamo (canale per cittadini)
        </label>
        <textarea
          value={complaintChannel}
          onChange={(e) => setComplaintChannel(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          placeholder="Descrivi il canale attraverso cui i cittadini possono contestare una decisione automatizzata: email, portale web, indirizzo postale, tempi di risposta garantiti..."
        />
      </div>

      <button onClick={saveOversight} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
        Salva Sorveglianza
      </button>
    </div>
  );
}

// ============== PHASE 6: OUTPUT & POST-MARKET ==============

function OutputPhase({
  report,
  saved,
  onFinalize,
  updateReport,
}: {
  report: FRIAReport;
  saved: boolean;
  onFinalize: () => void;
  updateReport: (p: Partial<FRIAReport>) => void;
}) {
  const msaData = saved ? generateMSASubmissionData(report) : null;
  const completedAll = report.completedPhases.length >= 6;

  return (
    <div className="space-y-6">
      {/* Completion check */}
      {!completedAll && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Fasi incomplete</p>
              <p className="text-xs text-muted-foreground mt-1">
                Hai completato {report.completedPhases.length} di 6 fasi. Completa tutte le fasi prima di finalizzare il report.
              </p>
            </div>
          </div>
        </div>
      )}

      {completedAll && !saved && (
        <div className="rounded-lg border border-success/40 bg-success/5 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Tutte le fasi completate</p>
              <p className="text-xs text-muted-foreground mt-1">
                Puoi ora finalizzare il report FRIA. Verrà generato un hash crittografico del report e salvato nell&apos;Evidence Layer immutabile.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* System Summary */}
      <div className="rounded-lg border border-border bg-background p-4">
        <p className="text-sm font-semibold text-foreground mb-3">Riepilogo Sistema</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          {[
            ["Sistema", report.systemName],
            ["Deployer", report.deployer.name || "N/D"],
            ["Tipo", report.deployer.type],
            ["Classe Rischio", report.riskClass],
            ["Allegato III", report.annexCategory],
            ["Punteggio COBRA", `${report.scoping.cobraScore}/100`],
            ["Diritti Impattati", String(report.rightsAnalysis.applicableRights.length)],
            ["Scenari Rischio", String(report.rightsAnalysis.riskScenarios.length)],
            ["Agenti", report.agentic.isAgentic ? "Sì" : "No"],
            ["Rule of 2", report.agentic.ruleOf2Violated ? "VIOLATA" : "OK"],
            ["Supervisori", String(report.oversight.roles.length)],
            ["Circuit Breakers", String(report.oversight.circuitBreakers.length)],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-muted-foreground">{k}</p>
              <p className={`font-mono font-medium ${
                v === "VIOLATA" ? "text-danger" : v === "OK" ? "text-success" : "text-foreground"
              }`}>{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Finalize button */}
      {completedAll && !saved && (
        <button
          onClick={onFinalize}
          className="w-full rounded-lg bg-success px-5 py-3 text-sm font-medium text-white hover:bg-success/90 inline-flex items-center justify-center gap-2"
        >
          <Lock className="h-4 w-4" /> Genera Report FRIA e Salva nell&apos;Evidence Layer
        </button>
      )}

      {/* Post-save info */}
      {saved && msaData && (
        <>
          <div className="rounded-lg border border-success/40 bg-success/5 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">Report FRIA generato con successo</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Hash report: <code className="text-[10px] bg-muted rounded px-1 py-0.5 font-mono">{report.output.reportHash.slice(0, 16)}...</code>
                </p>
              </div>
            </div>
          </div>

          {/* MSA Submission */}
          <div className="rounded-lg border border-border bg-background p-4">
            <p className="text-sm font-semibold text-foreground mb-3">Pacchetto Notifica MSA</p>
            <p className="text-xs text-muted-foreground mb-3">
              Dati pronti per l&apos;invio all&apos;Autorità di Sorveglianza del Mercato (MSA).
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {Object.entries(msaData).map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-border/50 pb-1">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="text-foreground font-mono">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Post-Market Monitoring */}
          <div className="rounded-lg border border-border bg-background p-4">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">Monitoraggio Post-Market</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Prossima revisione FRIA: <span className="text-foreground font-bold">{report.output.nextReviewDate}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  La FRIA deve essere aggiornata ogni volta che il modello viene ri-addestrato o se il contesto di deployment cambia significativamente.
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <RefreshCw className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs text-muted-foreground">Alert automatici per ricertificazione ciclica (ogni 12 mesi o su eventi trigger)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Evidence Chain */}
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-semibold text-foreground mb-2">Catena Evidenze (Tamper-Evident)</p>
            <div className="space-y-1">
              {report.output.evidenceChain.map((hash, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <Lock className="h-3 w-3 text-success" />
                  <code className="text-[10px] bg-muted rounded px-1.5 py-0.5 font-mono text-muted-foreground">{hash.slice(0, 16)}...</code>
                  {i < report.output.evidenceChain.length - 1 && (
                    <span className="text-[10px] text-muted-foreground">→</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
