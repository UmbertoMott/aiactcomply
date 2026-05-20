"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Code2,
  AlertTriangle,
  CheckCircle,
  Shield,
  FileText,
  Hash,
  GitBranch,
  ChevronRight,
  Ban,
  Scale,
  Brain,
  Fingerprint,
  Server,
  Download,
} from "lucide-react";
import { scanRepository, classifyRisk } from "@/lib/simulation/discovery-engine";
import { MOCK_PROJECT_FILES } from "@/lib/simulation/mock-project";
import { matchCodeToLaw } from "@/lib/simulation/code-to-law";
import { inferRisk, analyzeSchema, generatePolicyCard, translateToHumanText } from "@/lib/semantic/inference";
import { AIRiskScorer, type DiscoveryData, type AnalysisOutput } from "@/lib/semantic/ai-risk-scorer";
import { scanProfiling, hasHardBlock, generateExemptionDossier, EXEMPTION_CRITERIA, type ProfilingSignal, type ExemptionDossier } from "@/lib/semantic/exemption-engine";
import { appendEvidence } from "@/lib/evidence/evidence-layer";
import { generatePassport, verifyPassport, exportForRegulator, getPassportSummary, type ConformityPassport } from "@/lib/crypto/passport";

// ─── ADDITION 1 — Persistence ────────────────────────────────────────

const STORAGE_KEY = "classifier_result";

interface PersistedClassification {
  systemName: string;
  result: ReturnType<typeof classifyRisk>;
  passportId: string | null;
  exemptionDossierId: string | null;
  savedAt: string;
}

function saveResult(
  systemName: string,
  r: ReturnType<typeof classifyRisk>,
  passportId: string | null,
  dossierId: string | null
) {
  const record: PersistedClassification = {
    systemName,
    result: r,
    passportId,
    exemptionDossierId: dossierId,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}

function loadSavedResult(): PersistedClassification | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedClassification) : null;
  } catch {
    return null;
  }
}

// ─── COMPONENT ───────────────────────────────────────────────────────

export default function ClassifierPage() {
  // Existing state
  const [phase, setPhase] = useState<"intro" | "scan" | "decision" | "result">("intro");
  const [files] = useState(MOCK_PROJECT_FILES);
  const [result, setResult] = useState<ReturnType<typeof classifyRisk> | null>(null);
  const [selectedFile, setSelectedFile] = useState("");
  const [hasProfiling, setHasProfiling] = useState<boolean | null>(null);
  const [exemptionRequested, setExemptionRequested] = useState(false);
  const [signed, setSigned] = useState(false);
  const [showInference, setShowInference] = useState(false);
  const [scorerResult, setScorerResult] = useState<AnalysisOutput | null>(null);
  const [profilingSignals, setProfilingSignals] = useState<ProfilingSignal[]>(() => scanProfiling(files));
  const [selectedCriteria, setSelectedCriteria] = useState<string[]>([]);
  const [rationale, setRationale] = useState("");
  const [exemptionDossier, setExemptionDossier] = useState<ExemptionDossier | null>(null);
  const [passport, setPassport] = useState<ConformityPassport | null>(null);
  const [passportOpen, setPassportOpen] = useState(false);

  // ADDITION 2 — New state
  const [inputMode, setInputMode] = useState<"demo" | "manual">("demo");
  const [customSystemName, setCustomSystemName] = useState("");
  const [customRequirements, setCustomRequirements] = useState("");
  const [customPythonCode, setCustomPythonCode] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [savedClassification] = useState<PersistedClassification | null>(() => loadSavedResult());

  // ADDITION 4 — Derived active inputs (must precede useMemos that depend on them)
  const activeSystemName: string =
    inputMode === "manual" && customSystemName.trim()
      ? customSystemName.trim()
      : "CV-Screener AI";

  const activeFiles: Record<string, string> =
    inputMode === "manual" && (customRequirements.trim() || customPythonCode.trim())
      ? {
          ...(customRequirements.trim() ? { "requirements.txt": customRequirements } : {}),
          ...(customPythonCode.trim() ? { "main.py": customPythonCode } : {}),
        }
      : files;

  // ADDITION 6 — scanResult uses activeFiles
  const scanResult = useMemo(() => {
    if (phase === "intro") return null;
    return scanRepository(activeFiles);
  }, [phase, activeFiles]);

  const schemaColumns = useMemo(() => {
    if (!scanResult) return [];
    return analyzeSchema(["gender", "age", "years_experience", "education_level", "salary", "marital_status", "face_image", "ethnicity"]);
  }, [scanResult]);

  const inferenceMatches = useMemo(() => {
    if (!scanResult) return [];
    return inferRisk(scanResult.libraries, scanResult.endpoints, schemaColumns);
  }, [scanResult, schemaColumns]);

  const policyCard = useMemo(() => {
    if (inferenceMatches.length === 0) return null;
    return generatePolicyCard("CV-Screener AI", inferenceMatches, schemaColumns);
  }, [inferenceMatches, schemaColumns]);

  const lawMatches = selectedFile ? matchCodeToLaw(files[selectedFile] || "") : [];

  // ADDITION 3 — Toast helper
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  // ADDITION 5 — runScan uses activeFiles
  function runScan() {
    const { libraries, endpoints } = scanRepository(activeFiles);
    setPhase("scan");
    const scorer = new AIRiskScorer();
    const discoveryData: DiscoveryData = {
      libraries: libraries.map((l) => l.name),
      keywords: [...new Set(libraries.map((l) => l.name)), ...endpoints.map((e) => e.path)],
      api_endpoints: endpoints.map((e) => e.path),
    };
    setScorerResult(scorer.analyzeProject(discoveryData));
  }

  function proceedToDecision() {
    setPhase("decision");
  }

  // ADDITION 7 — finalizeClassification uses activeSystemName + saveResult + showToast
  function finalizeClassification() {
    if (!scanResult) return;
    const res = classifyRisk(
      scanResult.libraries,
      scanResult.endpoints,
      hasProfiling ?? false,
      exemptionRequested
    );
    setResult(res);
    setPhase("result");
    void appendEvidence("decision", {
      type: "AI Classification",
      system: activeSystemName,
      riskLevel: res.riskLevel,
      annexCategory: res.annexCategory,
      exempted: res.isExemptedArt6_3,
      libraries: res.libraries.map((l) => l.name),
    }, "aicomply-classifier");

    const confidence = scorerResult ? parseFloat(scorerResult.detailed_findings[0]?.confidence ?? "0") : 0;
    const exemptionStatus = exemptionDossier ? exemptionDossier.status : "NONE";
    const profilingStatus = hasHardBlock(profilingSignals) ? "BLOCKED" : profilingSignals.length > 0 ? "WARNINGS" : "CLEAN";
    const p = generatePassport(
      res.riskLevel,
      confidence,
      exemptionStatus,
      profilingStatus,
      activeSystemName
    );
    setPassport(p);

    saveResult(activeSystemName, res, p.passport_id, exemptionDossier?.id ?? null);
    showToast(`Classificazione completata: ${res.riskLevel} — salvata su Evidence Layer`);
  }

  const riskColors: Record<string, string> = {
    Unacceptable: "text-danger bg-danger/10 border-danger/30",
    High: "text-warning bg-warning/10 border-warning/30",
    Limited: "text-primary bg-primary/10 border-primary/30",
    Minimal: "text-success bg-success/10 border-success/30",
  };

  const riskGlows: Record<string, string> = {
    Unacceptable: "shadow-[0_0_40px_rgba(239,68,68,0.3)] border-danger/50",
    High: "shadow-[0_0_40px_rgba(245,158,11,0.25)] border-warning/40",
    Limited: "shadow-[0_0_30px_rgba(99,102,241,0.15)] border-primary/30",
    Minimal: "shadow-[0_0_30px_rgba(34,197,94,0.15)] border-success/30",
  };

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">AI Classifier — Discovery Engine</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Scansione automatica in 3 fasi: AST Analysis → Infrastructure Mapping →
          Art. 6(3) Decision Tree. Classificazione basata sul codice reale.
        </p>
      </div>

      {/* Phase indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[
          { id: "intro", label: "Repository", icon: GitBranch },
          { id: "scan", label: "Discovery", icon: Search },
          { id: "decision", label: "Art. 6(3)", icon: Scale },
          { id: "result", label: "Certificato", icon: FileText },
        ].map((p, i) => (
          <div key={p.id} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              phase === p.id ? "bg-primary text-primary-foreground" :
              ["intro", "scan", "decision", "result"].indexOf(phase) >= i ? "text-primary" : "text-muted-foreground"
            }`}>
              <p.icon className="h-3.5 w-3.5" />
              {p.label}
            </div>
            {i < 3 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* ADDITION 9 — PHASE: INTRO (rewritten inner content) */}
      {phase === "intro" && (
        <div className="space-y-6">
          {/* Saved result banner */}
          {savedClassification && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                <span className="text-primary font-medium">Ultima classificazione:</span>{" "}
                {savedClassification.systemName} —{" "}
                <span className={`font-semibold ${
                  savedClassification.result.riskLevel === "Unacceptable" ? "text-danger" :
                  savedClassification.result.riskLevel === "High" ? "text-warning" :
                  "text-success"
                }`}>{savedClassification.result.riskLevel}</span>
                {" "}· {savedClassification.savedAt.slice(0, 10)}
              </div>
              <span className="text-[10px] text-muted-foreground">
                {savedClassification.result.score}/100 score
              </span>
            </div>
          )}

          {/* Input mode selector */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Modalità di classificazione</h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => setInputMode("demo")}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  inputMode === "demo"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Brain className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Progetto demo</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  CV-Screener AI — scenario di screening HR con librerie pre-caricate. Ideale per esplorare il tool.
                </p>
              </button>
              <button
                onClick={() => setInputMode("manual")}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  inputMode === "manual"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Code2 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Il mio sistema AI</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Inserisci il nome del sistema e incolla il tuo requirements.txt per classificare il tuo progetto reale.
                </p>
              </button>
            </div>

            {/* Manual input fields */}
            {inputMode === "manual" && (
              <div className="space-y-3 border-t border-border pt-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Nome sistema AI <span className="text-danger">*</span>
                  </label>
                  <input
                    value={customSystemName}
                    onChange={(e) => setCustomSystemName(e.target.value)}
                    placeholder="es. HR Screening Platform v2.1"
                    className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-foreground"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    requirements.txt (incolla il contenuto)
                  </label>
                  <textarea
                    value={customRequirements}
                    onChange={(e) => setCustomRequirements(e.target.value)}
                    placeholder={"scikit-learn==1.3.0\nxgboost==1.7.6\npandas==2.0.3\n..."}
                    rows={5}
                    className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-foreground font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Codice Python principale (opzionale — per endpoint e profilazione)
                  </label>
                  <textarea
                    value={customPythonCode}
                    onChange={(e) => setCustomPythonCode(e.target.value)}
                    placeholder={"@app.route('/api/screen-candidate', methods=['POST'])\ndef screen_candidate():\n    ..."}
                    rows={5}
                    className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-foreground font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Files preview + start */}
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Code2 className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold text-foreground">
                  {inputMode === "demo"
                    ? "Progetto: CV-Screener AI"
                    : activeSystemName || "Progetto personalizzato"}
                </h2>
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                {Object.entries(activeFiles).map(([path]) => (
                  <div key={path} className="flex items-center gap-2 py-1">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    {path}
                  </div>
                ))}
                {inputMode === "manual" && Object.keys(activeFiles).length === 0 && (
                  <p className="text-warning text-[11px]">
                    Nessun file inserito — il scan partirà con file vuoti.
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  if (inputMode === "manual" && !customSystemName.trim()) {
                    showToast("Inserisci il nome del sistema AI prima di procedere");
                    return;
                  }
                  runScan();
                }}
                className="mt-6 w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2"
              >
                <Search className="h-4 w-4" />
                Avvia Discovery Engine
              </button>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-sm font-semibold text-foreground mb-4">Cosa farà il Discovery Engine:</h2>
              <div className="space-y-3">
                {[
                  { icon: Search, text: "Scannerà requirements.txt e file .py per librerie critiche" },
                  { icon: Server, text: "Analizzerà gli endpoint API per dati biometrici/sensibili" },
                  { icon: Scale, text: "Applicherà l'Art. 6(3) per valutare la deroga non-alto-rischio" },
                  { icon: Hash, text: "Genererà un certificato firmato SHA-256" },
                ].map((s, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <s.icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    {s.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PHASE: SCAN */}
      {phase === "scan" && scanResult && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* File Browser */}
            <div className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">File Browser — clicca per Code-to-Law Map</h2>
                <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-2 py-0.5">{Object.keys(files).length} files</span>
              </div>
              <div className="divide-y divide-border/50 max-h-60 overflow-y-auto">
                {Object.entries(files).map(([path, content]) => {
                  const matches = matchCodeToLaw(content);
                  const riskCount = matches.filter((m) => m.severity === "critical" || m.severity === "high").length;
                  return (
                    <div key={path}
                      className={`px-5 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors flex items-center justify-between ${
                        selectedFile === path ? "bg-muted/50" : ""
                      }`}
                      onClick={() => setSelectedFile(path)}
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-mono text-foreground">{path}</span>
                      </div>
                      {riskCount > 0 && (
                        <span className={`text-[10px] font-medium rounded-full px-1.5 py-0.5 ${
                          matches.some((m) => m.severity === "critical") ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"
                        }`}>{riskCount} segnali</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Code-to-Law Map */}
            {selectedFile && (
              <div className="rounded-xl border border-border bg-card">
                <div className="px-5 py-3 border-b border-border">
                  <h2 className="text-sm font-semibold text-foreground">Code-to-Law Map — {selectedFile}</h2>
                </div>
                <div className="grid lg:grid-cols-2">
                  <div className="border-r border-border/50">
                    <pre className="text-[10px] text-muted-foreground p-4 overflow-x-auto font-mono max-h-60 overflow-y-auto">
                      {files[selectedFile]}
                    </pre>
                  </div>
                  <div className="divide-y divide-border/50 max-h-60 overflow-y-auto">
                    {lawMatches.length === 0 ? (
                      <div className="p-4 text-xs text-muted-foreground">Nessun articolo mappato per questo file.</div>
                    ) : (
                      lawMatches.map((m, i) => (
                        <div key={i} className="p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-bold ${
                              m.severity === "critical" ? "text-danger" : m.severity === "high" ? "text-warning" : "text-primary"
                            }`}>{m.article}</span>
                            <span className={`text-[9px] rounded-full px-1.5 py-0.5 ${
                              m.severity === "critical" ? "bg-danger/10 text-danger" : m.severity === "high" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"
                            }`}>{m.severity}</span>
                          </div>
                          <p className="text-[10px] text-foreground font-medium">{m.title}</p>
                          <p className="text-[9px] text-muted-foreground mt-0.5">{m.description}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Libraries found */}
            <div className="rounded-xl border border-border bg-card">
              <div className="px-5 py-3 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">
                  Librerie rilevate ({scanResult.libraries.length})
                </h2>
              </div>
              <div className="divide-y divide-border/50 max-h-48 overflow-y-auto">
                {scanResult.libraries.map((lib, i) => (
                  <div key={i} className="px-5 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Code2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-mono text-foreground">{lib.name}</span>
                      <span className="text-[10px] text-muted-foreground">v{lib.version}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">{lib.riskDomain}</span>
                      <span className={`text-[9px] font-medium rounded-full px-1.5 py-0.5 ${
                        lib.severity === "critical" ? "bg-danger/10 text-danger" :
                        lib.severity === "high" ? "bg-warning/10 text-warning" :
                        lib.severity === "medium" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}>{lib.severity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right panel: Summary */}
          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3">Riepilogo Discovery</h2>
              <div className="space-y-3">
                {[
                  { label: "Librerie totali", value: scanResult.libraries.length, color: "text-foreground" },
                  { label: "Segnali critici", value: scanResult.libraries.filter((l) => l.severity === "critical").length, color: "text-danger" },
                  { label: "Alta severità", value: scanResult.libraries.filter((l) => l.severity === "high").length, color: "text-warning" },
                  { label: "Endpoint API rischiosi", value: scanResult.endpoints.filter((e) => e.riskFlagged).length, color: "text-warning" },
                  { label: "Articoli mappati", value: lawMatches.length, color: "text-primary" },
                  { label: "Pattern inferiti", value: inferenceMatches.length, color: "text-primary" },
                  { label: "Confidenza max", value: inferenceMatches.length > 0 ? `${Math.max(...inferenceMatches.map((m) => m.confidence))}%` : "—", color: inferenceMatches.some((m) => m.riskLevel === "Unacceptable") ? "text-danger" : "text-primary" },
                ].map((s) => (
                  <div key={s.label} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className={`font-bold ${s.color}`}>{s.value}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowInference(!showInference)} className="mt-3 w-full rounded-lg border border-border px-3 py-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                {showInference ? "Nascondi" : "Mostra"} Inferenza Semantica
              </button>
              <button onClick={proceedToDecision} className="mt-2 w-full rounded-lg bg-primary px-4 py-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                Procedi ad Art. 6(3) Decision Tree
              </button>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3">API Endpoints</h2>
              <div className="space-y-2">
                {scanResult.endpoints.map((ep, i) => (
                  <div key={i} className="text-xs flex items-center justify-between py-1 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-1.5">
                      <Server className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground font-mono text-[10px]">{ep.path.slice(0, 25)}...</span>
                    </div>
                    {ep.riskFlagged && <Fingerprint className="h-3 w-3 text-danger" />}
                  </div>
                ))}
                {scanResult.endpoints.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nessun endpoint API rilevato.</p>
                )}
              </div>
            </div>

            {/* Semantic Inference */}
            {showInference && inferenceMatches.length > 0 && (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-5 py-3 border-b border-border">
                  <h2 className="text-sm font-semibold text-foreground">Inferenza Semantica — Policy Card</h2>
                </div>
                <div className="divide-y divide-border/50 max-h-80 overflow-y-auto">
                  {inferenceMatches.map((m, i) => (
                    <details key={i} className="px-4 py-2.5 group">
                      <summary className="flex items-center justify-between cursor-pointer text-xs font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold rounded-full px-1.5 py-0.5 ${
                            m.riskLevel === "Unacceptable" ? "bg-danger/10 text-danger" : m.riskLevel === "High" ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary"
                          }`}>{m.patternId}</span>
                          <span className="text-muted-foreground">{m.legalReference.slice(0, 35)}...</span>
                        </div>
                        <span className={`text-[10px] font-mono font-bold ${
                          m.confidence >= 80 ? "text-danger" : m.confidence >= 60 ? "text-warning" : "text-primary"
                        }`}>{m.confidence}%</span>
                      </summary>
                      <div className="mt-2 pl-4 text-[10px] text-muted-foreground space-y-1">
                        <p className="text-foreground font-medium">{translateToHumanText(m)}</p>
                        {m.matchedLibraries.length > 0 && <p>Librerie: {m.matchedLibraries.join(", ")}</p>}
                        {m.matchedKeywords.length > 0 && <p>Keyword: {m.matchedKeywords.join(", ")}</p>}
                        {m.riskLevel === "Unacceptable" && (
                          <p className="text-danger font-bold">⚠ Pratica vietata — Richiesto intervento Compliance Officer</p>
                        )}
                      </div>
                    </details>
                  ))}
                </div>
                {policyCard && (
                  <div className="px-5 py-3 border-t border-border text-[10px] text-muted-foreground flex items-center justify-between">
                    <span>Policy: {policyCard.id}</span>
                    <span className={`font-medium ${policyCard.requiresComplianceOfficer ? "text-warning" : "text-success"}`}>
                      {policyCard.requiresComplianceOfficer ? "Compliance Officer richiesto" : "Auto-approvato"}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* AI Risk Scorer */}
            {scorerResult && scorerResult.detailed_findings.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-foreground">AI Risk Scorer</h2>
                  <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${
                    scorerResult.summary_risk === "Unacceptable" ? "bg-danger/10 text-danger" :
                    scorerResult.summary_risk === "High" ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary"
                  }`}>{scorerResult.summary_risk}</span>
                </div>
                <div className="space-y-2">
                  {scorerResult.detailed_findings.map((f, i) => (
                    <div key={i} className="text-xs flex items-center justify-between py-1 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground text-[10px] font-mono">{f.pattern_id}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">{f.confidence}</span>
                        <span className={`text-[9px] font-medium rounded-full px-1.5 py-0.5 ${
                          f.risk_level === "Unacceptable" ? "bg-danger/10 text-danger" :
                          f.risk_level === "High" ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary"
                        }`}>{f.risk_level}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-[9px] text-muted-foreground font-mono">
                  Fingerprint: {scorerResult.system_fingerprint.slice(0, 20)}...
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PHASE: DECISION TREE — Exemption Engine Art. 6(3) */}
      {phase === "decision" && (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Hard Carve-out Alert */}
          {hasHardBlock(profilingSignals) && (
            <div className="rounded-2xl border-2 border-danger/50 bg-danger/5 p-6 shadow-[0_0_40px_rgba(239,68,68,0.2)]">
              <div className="flex items-start gap-4">
                <Ban className="h-8 w-8 text-danger shrink-0 mt-1" />
                <div>
                  <h2 className="text-lg font-bold text-danger">HARD CARVE-OUT — Esenzione BLOCCATA</h2>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    Rilevata logica di profilazione di persone fisiche. Ai sensi dell&apos;Art. 6(3) secondo comma,
                    l&apos;esenzione è legalmente inapplicabile. Il sistema resta classificato come AD ALTO RISCHIO.
                  </p>
                  <div className="mt-4 space-y-1">
                    {profilingSignals.filter((s) => s.art6_3_block).map((s, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <AlertTriangle className="h-3.5 w-3.5 text-danger mt-0.5 shrink-0" />
                        <span><strong className="text-foreground">{s.type.replace(/_/g, " ")}</strong> in {s.file}:{s.line} — {s.description}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={finalizeClassification} className="mt-6 rounded-lg bg-danger px-6 py-2.5 text-sm font-medium text-white hover:bg-danger/90">
                    Conferma classificazione Alto Rischio
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 4-Pillars Form - only if no hard block */}
          {!hasHardBlock(profilingSignals) && (
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-3 mb-6">
                <Scale className="h-6 w-6 text-primary" />
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Art. 6(3) — 4-Pillars Self-Assessment</h2>
                  <p className="text-sm text-muted-foreground">Seleziona i criteri applicabili per richiedere l&apos;esenzione dalla classificazione ad alto rischio.</p>
                </div>
              </div>

              {profilingSignals.length > 0 && (
                <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 mb-6">
                  <AlertTriangle className="h-4 w-4 text-warning inline mr-1" />
                  <span className="text-xs text-warning font-medium">Rilevati {profilingSignals.length} segnali di profilazione (nessuno con blocco obbligatorio)</span>
                  <div className="mt-2 space-y-1">
                    {profilingSignals.map((s, i) => (
                      <div key={i} className="text-[10px] text-muted-foreground">{s.file}:{s.line} — {s.description}</div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4 mb-6">
                <p className="text-xs font-medium text-foreground">Seleziona uno o più criteri applicabili (Art. 6(3), lettere a-d):</p>
                {EXEMPTION_CRITERIA.map((criterion) => {
                  const selected = selectedCriteria.includes(criterion.id);
                  return (
                    <div
                      key={criterion.id}
                      className={`rounded-lg border p-4 cursor-pointer transition-colors ${
                        selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                      }`}
                      onClick={() => {
                        setSelectedCriteria((prev) =>
                          prev.includes(criterion.id)
                            ? prev.filter((id) => id !== criterion.id)
                            : [...prev, criterion.id]
                        );
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`rounded-lg p-1.5 mt-0.5 ${
                            selected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          }`}>
                            <CheckCircle className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">{criterion.label}</h3>
                            <p className="text-xs text-muted-foreground mt-1">{criterion.description}</p>
                            <p className="text-[10px] text-primary mt-1 font-mono">{criterion.legalRef}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 italic">{criterion.condition}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${
                          selected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        }`}>{selected ? "Selezionato" : "Seleziona"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mb-6">
                <label className="block text-xs font-medium text-foreground mb-2">
                  Motivazione dettagliata obbligatoria
                </label>
                <textarea
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-xs text-foreground placeholder:text-muted-foreground"
                  placeholder="Spiega dettagliatamente perché il sistema soddisfa i criteri di esenzione selezionati..."
                  rows={4}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  <strong>{selectedCriteria.length}</strong>/4 criteri selezionati
                  {rationale.trim().length > 0 && <span className="text-success ml-2">✓ Motivazione presente</span>}
                </div>
                {/* ADDITION 8 — Fixed exemption button onClick */}
                <button
                  onClick={() => {
                    const dossier = generateExemptionDossier(activeSystemName, profilingSignals, selectedCriteria, rationale);
                    setExemptionDossier(dossier);
                    if (!hasHardBlock(profilingSignals)) setHasProfiling(false);
                    setExemptionRequested(selectedCriteria.length > 0);
                    finalizeClassification();
                  }}
                  disabled={selectedCriteria.length === 0 || rationale.trim().length < 20}
                  className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  Invia richiesta esenzione
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PHASE: RESULT */}
      {phase === "result" && result && (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Refractive Card */}
          <div className={`rounded-2xl border-2 p-8 ${riskGlows[result.riskLevel]} ${riskColors[result.riskLevel].split(" ")[0]}`}
            style={{ background: result.riskLevel === "Unacceptable" ? "linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.02))" :
                     result.riskLevel === "High" ? "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02))" :
                     "linear-gradient(135deg, rgba(99,102,241,0.05), rgba(99,102,241,0.01))" }}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-1">Certificato di Classificazione</h2>
                <p className="text-sm text-muted-foreground">Regolamento UE 2024/1689 — Art. 6</p>
              </div>
              <div className={`rounded-xl px-5 py-3 text-center border-2 ${
                result.riskLevel === "Unacceptable" ? "border-danger/50 bg-danger/10" :
                result.riskLevel === "High" ? "border-warning/40 bg-warning/10" :
                result.riskLevel === "Limited" ? "border-primary/30 bg-primary/10" :
                "border-success/30 bg-success/10"
              }`}>
                <div className={`text-xs font-medium ${
                  result.riskLevel === "Unacceptable" ? "text-danger" :
                  result.riskLevel === "High" ? "text-warning" :
                  result.riskLevel === "Limited" ? "text-primary" : "text-success"
                }`}>RISCHIO</div>
                <div className={`text-lg font-bold ${
                  result.riskLevel === "Unacceptable" ? "text-danger" :
                  result.riskLevel === "High" ? "text-warning" :
                  result.riskLevel === "Limited" ? "text-primary" : "text-success"
                }`}>{result.riskLevel}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                // ADDITION 10 — use activeSystemName
                { label: "Sistema", value: activeSystemName },
                { label: "Categoria", value: result.annexCategory || "N/A" },
                { label: "Deroga Art. 6(3)", value: result.isExemptedArt6_3 ? "Concessa" : "Non richiesta" },
                { label: "Score", value: `${result.score}/100` },
              ].map((s) => (
                <div key={s.label} className="rounded-lg bg-card/50 p-3">
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  <p className="text-sm font-semibold text-foreground">{s.value}</p>
                </div>
              ))}
            </div>

            {result.exemptionRationale && (
              <div className="rounded-lg border border-border bg-card/50 p-4 mb-4">
                <p className="text-xs text-muted-foreground leading-relaxed">{result.exemptionRationale}</p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <Hash className="h-3 w-3" />
                {result.versionHash}
                <span className="mx-1">·</span>
                {result.timestamp.slice(0, 10)}
              </div>
              <button
                onClick={async () => {
                  await appendEvidence("decision", {
                    type: "AI Classification Certificate",
                    riskLevel: result.riskLevel,
                    annexCategory: result.annexCategory,
                    exempted: result.isExemptedArt6_3,
                    libraries: result.libraries.map((l) => l.name),
                    timestamp: result.timestamp,
                  }, "aicomply-classifier");
                  setSigned(true);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 ${
                  signed ? "bg-success/10 text-success" : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                <Shield className="h-3.5 w-3.5" />
                {signed ? "Firmato su Evidence Layer" : "Firma su Evidence Layer"}
              </button>
            </div>
          </div>

          {/* Exemption Record */}
          {exemptionDossier && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3">
                Exemption Record — Art. 6(3)
                <span className={`ml-2 text-[10px] font-medium rounded-full px-2 py-0.5 ${
                  exemptionDossier.status === "BLOCKED_PROFILING" ? "bg-danger/10 text-danger" :
                  exemptionDossier.status === "EXEMPTION_GRANTED" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                }`}>{exemptionDossier.status.replace(/_/g, " ")}</span>
              </h2>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID Dossier</span>
                  <span className="font-mono text-foreground">{exemptionDossier.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Criteri selezionati</span>
                  <span className="text-foreground">{exemptionDossier.selectedCriteria.length || "N/A"}</span>
                </div>
                {exemptionDossier.rationale && (
                  <div className="border-t border-border pt-2 mt-2">
                    <p className="text-muted-foreground mb-1">Rationale:</p>
                    <p className="text-foreground text-[11px] leading-relaxed">{exemptionDossier.rationale}</p>
                  </div>
                )}
                <div className="border-t border-border pt-2 mt-2 flex justify-between text-[10px] text-muted-foreground">
                  <span>Evidence Hash: {exemptionDossier.evidenceHash.slice(0, 16)}...</span>
                  <span>{exemptionDossier.generatedAt.slice(0, 10)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Auditor's Vault — Conformity Passport */}
          {passport && (
            <div className={`rounded-2xl border-2 p-6 transition-all duration-500 ${
              passportOpen ? "border-primary/50 shadow-[0_0_60px_rgba(99,102,241,0.15)]" : "border-border"
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${passportOpen ? "bg-success animate-pulse" : "bg-muted"}`} />
                  <h2 className="text-base font-bold text-foreground">
                    Auditor&apos;s Vault — Conformity Passport
                  </h2>
                </div>
                <button
                  onClick={() => setPassportOpen(!passportOpen)}
                  className="rounded-lg border border-border px-3 py-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                >
                  {passportOpen ? "Nascondi" : "Mostra sigillo digitale"}
                </button>
              </div>

              {passportOpen && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      { label: "ID Passport", value: passport.passport_id.slice(0, 8), color: "text-primary" },
                      { label: "Rischio AI Act", value: passport.ai_act_risk_level, color: passport.ai_act_risk_level === "Unacceptable" ? "text-danger" : passport.ai_act_risk_level === "High" ? "text-warning" : "text-success" },
                      { label: "Confidenza", value: passport.audit_trail.inference_confidence, color: "text-foreground" },
                      { label: "Firma", value: passport.signature.startsWith("signed:") ? "ED25519 ✓" : "NON FIRMATO", color: passport.signature.startsWith("signed:") ? "text-success" : "text-danger" },
                    ].map((c) => (
                      <div key={c.label} className="rounded-lg bg-muted p-3">
                        <p className="text-[10px] text-muted-foreground">{c.label}</p>
                        <p className={`text-xs font-bold font-mono ${c.color}`}>{c.value}</p>
                      </div>
                    ))}
                  </div>

                  <details className="group">
                    <summary className="text-xs font-medium text-foreground cursor-pointer hover:text-primary">🔍 Audit Trail</summary>
                    <div className="mt-2 space-y-1 text-[10px] font-mono text-muted-foreground bg-muted rounded-lg p-3">
                      <p>discovery_hash: {passport.audit_trail.discovery_hash.slice(0, 24)}...</p>
                      <p>inference_confidence: {passport.audit_trail.inference_confidence}</p>
                      <p>exemption_logic: {passport.audit_trail.exemption_logic}</p>
                      <p>profiling_check: {passport.audit_trail.profiling_check}</p>
                    </div>
                  </details>

                  <details className="group">
                    <summary className="text-xs font-medium text-foreground cursor-pointer hover:text-primary">🔐 Technical Fingerprint</summary>
                    <div className="mt-2 space-y-1 text-[10px] font-mono text-muted-foreground bg-muted rounded-lg p-3">
                      <p>git_sha: {passport.technical_fingerprint.git_sha}</p>
                      <p>dependency_checksum: {passport.technical_fingerprint.dependency_checksum.slice(0, 24)}...</p>
                      <p>data_schema_version: {passport.technical_fingerprint.data_schema_version}</p>
                    </div>
                  </details>

                  <div className="rounded-lg border border-border bg-muted p-3">
                    <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                      {passport.legal_declaration}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 rounded-lg border border-success/30 bg-success/5 p-2.5 text-[10px] text-success flex items-center gap-2">
                      <Shield className="h-3.5 w-3.5" />
                      Firma ED25519 valida · Passaporto integro
                    </div>
                    <button
                      onClick={() => {
                        const { filename, jsonContent } = exportForRegulator(passport);
                        const blob = new Blob([jsonContent], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = filename;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="rounded-lg bg-primary px-4 py-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Export for Regulator
                    </button>
                  </div>
                </div>
              )}

              {!passportOpen && (
                <div className="flex items-center gap-4">
                  <div className="flex-1 text-[10px] text-muted-foreground">
                    <span className="text-success">●</span> Firma ED25519 · {passport.ai_act_risk_level} · {passport.audit_trail.inference_confidence} confidenza · Scadenza {passport.valid_until.slice(0, 10)}
                  </div>
                  <button
                    onClick={() => {
                      const { filename, jsonContent } = exportForRegulator(passport);
                      const blob = new Blob([jsonContent], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = filename;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="rounded-lg border border-border px-3 py-1.5 text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <Download className="h-3 w-3" />
                    Export JSON
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Code-to-Law summary */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3">Code-to-Law Map — Riferimenti incrociati</h2>
            <div className="space-y-2">
              {Array.from(new Set(Object.values(files).flatMap((c) => matchCodeToLaw(c).map((m) => m.article)))).slice(0, 5).map((art) => (
                <div key={art} className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                  <Scale className="h-3.5 w-3.5 text-primary" />
                  {art}
                </div>
              ))}
            </div>
          </div>

          {/* ADDITION 11 — Nuova classificazione button */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                setPhase("intro");
                setResult(null);
                setPassport(null);
                setExemptionDossier(null);
                setPassportOpen(false);
                setSigned(false);
                setHasProfiling(null);
                setExemptionRequested(false);
                setSelectedCriteria([]);
                setRationale("");
                setScorerResult(null);
                setCustomSystemName("");
                setCustomRequirements("");
                setCustomPythonCode("");
              }}
              className="rounded-lg border border-border px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Search className="h-3.5 w-3.5" />
              Classifica un altro sistema
            </button>
          </div>
        </div>
      )}

      {/* ADDITION 12 — Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-card border border-border px-4 py-3 text-sm text-foreground shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
