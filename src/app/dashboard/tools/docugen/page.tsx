"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import ProviderTransitionAlertBanner from "@/components/shared/provider-transition-alert-banner";
import { motion, AnimatePresence } from "framer-motion";
import { GitBranch, Download, AlertTriangle, CheckCircle, Clock, History, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import Link from "next/link";
import { writeToStorage, readFromStorage } from "@/lib/dossier/storage-schema";
import type { DocugenResult, DataAuditResult, RiskManagerResult, ClassifierResult, DPIAResult } from "@/lib/dossier/storage-schema";
import { checkAnnexIVGaps, type AnnexIVGapsResult } from "@/app/actions/checkAnnexIVGaps";
import { validateDocuGenCoherence, type CoherenceReport } from "@/app/actions/validateDocuGenCoherence";
import { assessChangeImpact, type ChangeImpactReport } from "@/app/actions/assessChangeImpact";
import { buildComplianceContextFromStorage } from "@/hooks/useComplianceContext";
import { useAutoSave } from "@/hooks/useAutoSave";
import { VersionHistoryPanel } from "@/components/compliance/VersionHistoryPanel";
import { appendEvidence } from "@/lib/evidence/evidence-layer";
import { appendVersion, listVersions, type VersionSnapshot } from "@/lib/projects/version-history";
import { SystemSelector } from "@/components/compliance/SystemSelector";

const STORAGE_KEY = "docugen_state";

interface DocuGenState {
  content: Record<string, string>;
  status: Record<string, "empty" | "draft" | "done">;
  systemName: string;
  activeVersion: number;
}

const DEFAULT_STATE: DocuGenState = {
  content: {},
  status: {},
  systemName: "",
  activeVersion: 0,
};

function loadState(): DocuGenState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DocuGenState) : DEFAULT_STATE;
  } catch { return DEFAULT_STATE; }
}

function saveState(s: DocuGenState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

// ─── DB sync helpers ──────────────────────────────────────────────────────────
async function loadFromDB(): Promise<{ technicalFileId: string | null; aiSystemId: string | null }> {
  try {
    const res = await fetch("/api/technical-file");
    if (!res.ok) return { technicalFileId: null, aiSystemId: null };
    const { data } = await res.json();
    if (data && data.length > 0) {
      return { technicalFileId: data[0].id, aiSystemId: data[0].ai_system_id };
    }
  } catch { /* fallback to localStorage */ }
  return { technicalFileId: null, aiSystemId: null };
}

async function saveToDBSection(
  section: string,
  sectionData: Record<string, unknown>,
  aiSystemId: string,
  technicalFileId: string | null
): Promise<string | null> {
  try {
    const body = {
      ai_system_id: aiSystemId,
      technical_file_id: technicalFileId,
      section,
      section_data: sectionData,
    };
    const res = await fetch("/api/technical-file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return technicalFileId;
    const { data } = await res.json();
    return data?.id ?? technicalFileId;
  } catch { return technicalFileId; }
}

async function loadAISystems(): Promise<{ id: string; name: string; risk_tier: string }[]> {
  try {
    const res = await fetch("/api/ai-systems");
    if (!res.ok) return [];
    const { data } = await res.json();
    return data || [];
  } catch { return []; }
}

// Read real data from other tools' localStorage
function readCrossToolContent(): Record<string, string> {
  if (typeof window === "undefined") return AUTO_CONTENT;
  const overrides: Record<string, string> = { ...AUTO_CONTENT };

  try {
    const dataAudit = readFromStorage<DataAuditResult>("dataAudit");
    if (dataAudit) {
      overrides["data-audit"] = [
        `**[Auto-importato da Data Audit — Art. 10]**`,
        ``,
        `Dataset analizzati: ${dataAudit.datasets?.map((d) => d.name).join(", ") || "N/D"}`,
        `Qualità complessiva: ${dataAudit.overallQuality || "N/D"}`,
        `Dati personali: ${dataAudit.datasets?.some((d) => d.personalData) ? "Sì — DPIA richiesta" : "No"}`,
      ].join("\n");
    }
  } catch { /* fallback to AUTO_CONTENT */ }

  try {
    const riskData = readFromStorage<RiskManagerResult>("riskManager");
    if (riskData) {
      overrides["risk-manager"] = [
        `**[Auto-importato da Risk Manager — Art. 9]**`,
        ``,
        `Rischi identificati: ${riskData.risks?.length || 0}`,
        `Livello rischio complessivo: ${riskData.overallRiskLevel || "N/D"}`,
        `Prossima revisione: ${riskData.nextReviewDate || "da pianificare"}`,
      ].join("\n");
    }
  } catch { /* fallback to AUTO_CONTENT */ }

  return overrides;
}

// ─── Ghost Summarizer ─────────────────────────────────────────────────────────
interface GhostData {
  systemName: string | null;
  purpose: string | null;
  riskLevel: string | null;
  annexIII: boolean;
  datasetsSummary: string | null;
  risksSummary: string | null;
  legalBasis: string | null;
  personalDataCategories: string | null;
}

function buildGhostData(): GhostData {
  const classifier = readFromStorage<ClassifierResult>("classifier");
  const dataAudit  = readFromStorage<DataAuditResult>("dataAudit");
  const riskMgr    = readFromStorage<RiskManagerResult>("riskManager");
  const dpia       = readFromStorage<DPIAResult>("dpia");

  return {
    systemName: classifier?.systemName ?? null,
    purpose: classifier?.systemDescription ?? null,
    riskLevel: classifier?.riskLevel ?? null,
    annexIII: classifier?.annexIII ?? false,
    datasetsSummary: dataAudit
      ? `Dataset: ${dataAudit.datasets?.map(d => d.name).join(", ") || "N/D"} · Qualità: ${dataAudit.overallQuality || "N/D"} · Dati personali: ${dataAudit.datasets?.some(d => d.personalData) ? "Sì" : "No"}`
      : null,
    risksSummary: riskMgr
      ? `${riskMgr.risks?.length || 0} rischi · Livello: ${riskMgr.overallRiskLevel || "N/D"}`
      : null,
    legalBasis: dpia?.description?.processing_purposes ?? null,
    personalDataCategories: dpia?.description?.personal_data_categories ?? null,
  };
}

// ─── Annex IV — 9 sections ────────────────────────────────────────────────────
const ANNEX_IV = [
  {
    id: "s1", ref: "IV §1", title: "Descrizione generale",
    required: true,
    hint: "Uso previsto, contesto di deploy, categorie di utenti e destinatari.",
    autoSource: null,
    placeholder: "Il sistema analizza curriculum vitae per supportare il processo di selezione del personale nell'ambito delle assunzioni aziendali. Gli utenti destinatari sono i responsabili HR. Il sistema non adotta decisioni autonome vincolanti...",
  },
  {
    id: "s2", ref: "IV §2a", title: "Logica e architettura",
    required: true,
    hint: "Logica generale, algoritmo, scelte progettuali chiave, architettura software.",
    autoSource: "code",
    placeholder: "Architettura: Transformer-based classifier (BERT-large). Pipeline: preprocessing → feature extraction → classificazione binaria. Soglia decisionale: 0.72. Framework: PyTorch 2.1, HuggingFace Transformers 4.35...",
  },
  {
    id: "s3", ref: "IV §2b", title: "Specifiche di progettazione",
    required: true,
    hint: "Requisiti tecnici, vincoli di sistema, specifiche di input/output.",
    autoSource: "code",
    placeholder: "Input: file PDF/DOCX max 5MB, testo estratto UTF-8. Output: score 0–100 + feature importance top-5. Latenza max: 800ms p99. Disponibilità: 99.9%. Lingua supportata: italiano, inglese...",
  },
  {
    id: "s4", ref: "IV §2c", title: "Dati di addestramento",
    required: true,
    hint: "Origine, governance, bias analysis — auto-importato da Data Audit.",
    autoSource: "data-audit",
    placeholder: "",
  },
  {
    id: "s5", ref: "IV §2d", title: "Metriche di performance",
    required: true,
    hint: "Accuracy, precision, recall, F1 su test set. Soglie di accettazione.",
    autoSource: "mlflow",
    placeholder: "Accuracy: 87.3% | Precision: 84.1% | Recall: 89.7% | F1: 86.8%. Test set: 12.400 record, hold-out 20%. Evaluation date: 2025-03-15...",
  },
  {
    id: "s6", ref: "IV §2e", title: "Gestione dei rischi",
    required: true,
    hint: "Auto-importato da Risk Manager (Art. 9).",
    autoSource: "risk-manager",
    placeholder: "",
  },
  {
    id: "s7", ref: "IV §2f", title: "Modifiche nel ciclo di vita",
    required: false,
    hint: "Elenco modifiche sostanziali ex Art. 3(23) con riferimento ai commit.",
    autoSource: "git",
    placeholder: "v2.1.0 (2025-04-10, commit a3f9c2d): aggiornamento soglia classificazione 0.68→0.72 dopo re-training su dataset bilanciato (CTGAN). Classificata come modifica sostanziale ex Art. 3(23)...",
  },
  {
    id: "s8", ref: "IV §2g", title: "Norme armonizzate",
    required: false,
    hint: "Standard CEN/CENELEC, ISO/IEC applicati.",
    autoSource: null,
    placeholder: "ISO/IEC 42001:2023 — AI Management Systems. ISO/IEC 27001:2022 — Information Security. CEN/TC 449 — AI Act harmonised standards (in corso). EN ISO 13485 (se contesto medico)...",
  },
  {
    id: "s9", ref: "IV §3", title: "Sorveglianza post-market",
    required: true,
    hint: "Piano di monitoraggio post-deploy, KPI, soglie di allerta.",
    autoSource: null,
    placeholder: "Monitoring continuo: drift detection settimanale su distribuzione input. Alert se accuracy scende sotto 82% su finestra mobile 30gg. Revisione umana obbligatoria se score < 40 o > 90 (casi limite)...",
  },
];

// ─── Auto-populated content ────────────────────────────────────────────────────
const AUTO_CONTENT: Record<string, string> = {
  "data-audit": `**[Auto-importato da Data Audit — Art. 10]**\n\nDataset: HR Screening Dataset (84.320 righe)\nFonte: Snowflake.prod / HR_DATA · Valido dal: 15/01/2024\n\nMetriche bias (snapshot Mag 2025):\n• Disparate Impact (DI): 0.61 ⚠ — sotto soglia 0.8 (Regola 4/5)\n• Statistical Parity Diff. (SPD): 0.32\n• Equalized Odds Diff. (EOD): 0.19\n\nProxy detector: cap_residenza → proxy etnia (67%), cod_settore → proxy genere (52%)\n\nStato: CTGAN Debiasing richiesto prima del deployment.`,
  "risk-manager": `**[Auto-importato da Risk Manager — Art. 9]**\n\nClassificazione: Sistema ad Alto Rischio (Allegato III, punto 4 — Occupazione)\nRisk score: 7.4/10\n\nRischi identificati:\n1. Discriminazione algoritmica (CRITICO) — DI < 0.8 su genere/etnia\n2. Opacità decisionale (ALTO) — Explainability index: 0.42\n3. Data drift post-deploy (MEDIO) — Rilevato drift su distribuzione input Q1 2025\n\nMisure di mitigazione:\n• CTGAN debiasing attivo dalla v2.1.0\n• SHAP values esposti per ogni predizione\n• Sentinel agent attivo con alert settimanale`,
  "code": `**[Auto-estratto da Repository — GitHub]**\n\nUltimo commit analizzato: a3f9c2d (main, 2025-04-10)\nFile chiave: src/models/screener.py, src/api/main.py\n\nArchitettura rilevata: BERT-large classifier\nDipendenze critiche: torch==2.1.0, transformers==4.35.3, scikit-learn==1.3.2\n\nAST Analysis: 3 endpoint AI-critical identificati\nCompliance signals: 4 (2 critici, 2 warning)`,
  "git": `**[Auto-estratto da Git History]**\n\nv2.1.0 (a3f9c2d, 2025-04-10): Aggiornamento soglia 0.68→0.72, CTGAN integration — MODIFICA SOSTANZIALE ex Art. 3(23)\nv2.0.1 (b7e1a4c, 2025-02-28): Hotfix preprocessing multilingua — modifica non sostanziale\nv2.0.0 (c4d2f18, 2025-01-15): Major release, nuovo training set — MODIFICA SOSTANZIALE`,
  "mlflow": `**[Auto-estratto da MLflow]**\n\nRun ID: mlf-2025-04-10-001 · Experiment: hr-screener-v2\nAccuracy: 87.3% | Precision: 84.1% | Recall: 89.7% | F1: 86.8%\nTest set: 12.400 record, hold-out 20% · Date: 2025-04-10\n\nHyperparameters: lr=2e-5, batch=32, epochs=4, max_seq=512\nArtifact: s3://mlflow-artifacts/hr-screener/v2.1.0/model.pt`,
};

// ─── Strip markdown asterisks for document display ────────────────────────────
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]*)\*\*/g, "$1")
    .replace(/\*([^*]*)\*/g, "$1");
}

// ─── Source badges ─────────────────────────────────────────────────────────────
const SOURCE_BADGES: Record<string, string> = {
  "s1": "Annex IV §1",
  "s2": "Annex IV §2a",
  "s3": "Annex IV §2b",
  "s4": "Art. 10 — WP248",
  "s5": "Annex IV §2d",
  "s6": "Art. 9 — Risk",
  "s7": "Art. 3(23)",
  "s8": "CEN/ISO",
  "s9": "Art. 72 PMSS",
};

// ─── Timeline step type ───────────────────────────────────────────────────────
type TimelineStep = "aggregate" | "draft" | "validate" | "export";

const TIMELINE_STEPS = [
  { id: "aggregate" as TimelineStep, label: "Data Aggregation" },
  { id: "draft"     as TimelineStep, label: "Intelligent Drafting" },
  { id: "validate"  as TimelineStep, label: "Human Validation" },
  { id: "export"    as TimelineStep, label: "Audit-Ready Export" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DocuGenPage() {
  const [persisted, setPersistedRaw] = useState<DocuGenState>(() => loadState());
  const [activeSection, setActiveSection] = useState("s1");
  const [compareMode, setCompareMode] = useState(false);
  const [compareIdx, setCompareIdx] = useState(1);
  const [toast, setToast] = useState<string | null>(null);
  const [versionSnapshots, setVersionSnapshots] = useState<VersionSnapshot[]>([]);
  const [saveNote, setSaveNote] = useState("");
  const [showSaveNote, setShowSaveNote] = useState(false);
  const [showVersionPanel, setShowVersionPanel] = useState(false);
  const [crossContent] = useState<Record<string, string>>(() => readCrossToolContent());

  // Timeline state
  const [timelineStep, setTimelineStep] = useState<TimelineStep>("aggregate");
  const [focusMode, setFocusMode] = useState(false);
  const [ghost, setGhost] = useState<GhostData>(() => ({
    systemName: null, purpose: null, riskLevel: null, annexIII: false,
    datasetsSummary: null, risksSummary: null, legalBasis: null, personalDataCategories: null,
  }));

  const classifierTier = useMemo<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("aicomply_classifier_result");
      if (!raw) return null;
      return (JSON.parse(raw) as { riskLevel?: string })?.riskLevel?.toLowerCase() ?? null;
    } catch { return null; }
  }, []);

  const { justSaved: docugenSaved } = useAutoSave("docugen", persisted, saveState);

  useEffect(() => {
    setVersionSnapshots(listVersions("docugen"));
  }, []);

  // Ghost Summarizer mount
  useEffect(() => {
    const g = buildGhostData();
    setGhost(g);
    if (g.systemName && !persisted.systemName) setSystemName(g.systemName);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [technicalFileId, setTechnicalFileId] = useState<string | null>(null);
  const [annexIVReport, setAnnexIVReport] = useState<AnnexIVGapsResult | null>(null);
  const [annexIVLoading, setAnnexIVLoading] = useState(false);
  const [coherenceReport, setCoherenceReport] = useState<CoherenceReport | null>(null);
  const [coherenceLoading, setCoherenceLoading] = useState(false);
  const [changeDesc, setChangeDesc] = useState("");
  const [changeImpactReport, setChangeImpactReport] = useState<ChangeImpactReport | null>(null);
  const [changeImpactLoading, setChangeImpactLoading] = useState(false);
  const [aiSystemId, setAiSystemId] = useState<string | null>(null);
  const [aiSystems, setAiSystems] = useState<{ id: string; name: string; risk_tier: string }[]>([]);
  const [dbSynced, setDbSynced] = useState(false);
  const [dbSyncing, setDbSyncing] = useState(false);

  // ── Document editor (Step 4 preview) ────────────────────────────────────────
  const [docEditing, setDocEditing] = useState(false);
  const [editedDocHtml, setEditedDocHtml] = useState<string | null>(null);
  const previewDocRef = useRef<HTMLDivElement>(null);
  const editDocRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAISystems().then(setAiSystems);
    loadFromDB().then(({ technicalFileId: tfId, aiSystemId: asId }) => {
      if (tfId) setTechnicalFileId(tfId);
      if (asId) setAiSystemId(asId);
      if (tfId) setDbSynced(true);
    });
  }, []);

  useEffect(() => {
    if (!aiSystemId || !persisted.content || Object.keys(persisted.content).length === 0) return;
    const timer = setTimeout(async () => {
      setDbSyncing(true);
      const sectionMap: Record<string, string> = {
        s1: "s1_general", s2: "s2_components", s3: "s3_data_governance",
        s4: "s4_monitoring", s5: "s5_transparency", s6: "s6_performance", s7: "s7_declaration",
      };
      const dbSection = sectionMap[activeSection];
      if (dbSection && persisted.content[activeSection]) {
        const newId = await saveToDBSection(
          dbSection,
          { content: persisted.content[activeSection], status: persisted.status[activeSection] || "draft" },
          aiSystemId,
          technicalFileId
        );
        if (newId && !technicalFileId) setTechnicalFileId(newId);
        setDbSynced(true);
      }
      setDbSyncing(false);
    }, 2000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persisted.content, activeSection, aiSystemId]);

  const { content, status, systemName, activeVersion: _activeVersion } = persisted;
  void _activeVersion;

  function setPersisted(updater: (prev: DocuGenState) => DocuGenState) {
    setPersistedRaw((prev) => {
      const next = updater(prev);
      saveState(next);
      return next;
    });
  }

  function setContent(upd: Record<string, string> | ((p: Record<string, string>) => Record<string, string>)) {
    setPersisted((prev) => ({
      ...prev,
      content: typeof upd === "function" ? upd(prev.content) : upd,
    }));
  }
  function setStatus(upd: Record<string, "empty" | "draft" | "done"> | ((p: Record<string, "empty" | "draft" | "done">) => Record<string, "empty" | "draft" | "done">)) {
    setPersisted((prev) => ({
      ...prev,
      status: typeof upd === "function" ? upd(prev.status) : upd,
    }));
  }
  function setSystemName(v: string) {
    setPersisted((prev) => ({ ...prev, systemName: v }));
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  const enterDocEdit = () => {
    const source = editedDocHtml ?? previewDocRef.current?.innerHTML ?? "";
    setDocEditing(true);
    setTimeout(() => {
      if (editDocRef.current) {
        editDocRef.current.innerHTML = source;
        editDocRef.current.querySelectorAll("[data-noedit]").forEach(el => {
          (el as HTMLElement).contentEditable = "false";
        });
        editDocRef.current.querySelectorAll("p, span, em, i, b, strong").forEach(el => {
          const htmlEl = el as HTMLElement;
          if (!htmlEl.closest("[data-noedit]")) {
            htmlEl.style.color = "";
            htmlEl.style.fontStyle = "";
          }
        });
        editDocRef.current.focus();
      }
    }, 0);
  };

  const confirmDocEdit = () => {
    if (editDocRef.current) setEditedDocHtml(editDocRef.current.innerHTML);
    setDocEditing(false);
  };

  const version = versionSnapshots[0] ?? { tag: "bozza", status: "draft" as const, savedAt: "", sectionsChanged: [] as string[] };

  function getContent(sectionId: string): string {
    const sec = ANNEX_IV.find((s) => s.id === sectionId)!;
    if (content[sectionId] !== undefined) return content[sectionId];
    if (sec.autoSource) return crossContent[sec.autoSource] ?? "";
    return "";
  }

  function getSectionStatus(sectionId: string): "empty" | "draft" | "done" {
    if (status[sectionId]) return status[sectionId];
    const sec = ANNEX_IV.find((s) => s.id === sectionId)!;
    if (sec.autoSource) return "done";
    return "empty";
  }

  const doneCount  = ANNEX_IV.filter((s) => getSectionStatus(s.id) === "done").length;
  const draftCount = ANNEX_IV.filter((s) => getSectionStatus(s.id) === "draft").length;
  const [savedAt, setSavedAt] = useState<string | null>(() =>
    readFromStorage<DocugenResult>("docugen")?.completedAt ?? null
  );

  const emptyRequired = ANNEX_IV.filter((s) => s.required && getSectionStatus(s.id) === "empty");
  const canFinalize = emptyRequired.length === 0;

  async function saveToDossier(asFinalized = false) {
    const completedAt = new Date().toISOString();
    const resolvedName = systemName.trim() || "Sistema AI (non specificato)";

    writeToStorage<DocugenResult>("docugen", {
      systemName: resolvedName,
      provider: "AIComply",
      purpose: getContent("s1"),
      capabilities: getContent("s2"),
      limitations: getContent("s5") || "Da compilare",
      humanOversight: getContent("s7") || "Da compilare",
      performanceMetrics: getContent("s6") || "Da compilare",
      trainingData: getContent("s4") || crossContent["data-audit"],
      completedAt,
    });

    const sectionsSnapshot: Record<string, "empty" | "draft" | "done"> = {};
    ANNEX_IV.forEach(s => { sectionsSnapshot[s.id] = getSectionStatus(s.id); });

    const isSubstantial = changeImpactReport?.isSubstantialModification ?? false;
    appendVersion("docugen", persisted, {
      label: asFinalized ? "Versione finalizzata" : "Salvataggio manuale",
      note: saveNote.trim() || undefined,
      status: asFinalized ? "finalized" : "draft",
      isSubstantialModification: isSubstantial,
      substModificationBasis: isSubstantial ? (changeImpactReport?.substModificationBasis ?? undefined) : undefined,
      sectionsSnapshot,
      systemName: resolvedName,
    });

    setVersionSnapshots(listVersions("docugen"));
    setSaveNote("");
    setShowSaveNote(false);

    await appendEvidence("adr", {
      type: "Fascicolo Tecnico Annex IV — Art. 11",
      systemName: resolvedName,
      sectionsCompleted: doneCount,
      sectionsTotal: ANNEX_IV.length,
      requiredRemaining: emptyRequired.length,
      status: asFinalized ? "finalized" : "draft",
    }, "docugen-ai");

    setSavedAt(completedAt);
    showToast(asFinalized ? "✓ Versione finalizzata salvata nel dossier" : "Fascicolo salvato nel dossier ✓");
  }

  async function exportPdf() {
    const resolvedName = systemName.trim() || "Sistema AI";
    const isLimitedOrMinimal = classifierTier === "limited" || classifierTier === "minimal";

    const sections = isLimitedOrMinimal
      ? []
      : ANNEX_IV.map(s => ({
          title: s.title,
          article: s.ref,
          content: getContent(s.id),
          status: (getSectionStatus(s.id) === "done" ? "complete"
            : getSectionStatus(s.id) === "draft" ? "partial" : "empty") as "complete" | "partial" | "empty",
        }));

    const payload = { systemName: resolvedName, systemId: `docugen-${Date.now()}`, tier: classifierTier, sections };
    showToast("Generazione PDF in corso…");
    try {
      const res = await fetch("/api/compliance/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { showToast("Errore export PDF"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `AIComply_${resolvedName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("PDF esportato ✓");
    } catch {
      showToast("Errore durante l'export PDF");
    }
  }

  function exportFullDocument() {
    const resolvedName = systemName.trim() || "sistema-ai";
    const doc = {
      meta: {
        format: "AIComply Fascicolo Tecnico — Annex IV",
        regulation: "Regolamento UE 2024/1689 — Art. 11",
        systemName: resolvedName,
        version: versionSnapshots[0]?.tag ?? "draft",
        commit: versionSnapshots[0]?.id?.slice(0, 7) ?? "—",
        exportedAt: new Date().toISOString(),
        completionPct: Math.round((doneCount / 9) * 100),
      },
      sections: ANNEX_IV.map((s) => ({
        id: s.id, ref: s.ref, title: s.title, required: s.required,
        status: getSectionStatus(s.id), autoSource: s.autoSource ?? null, content: getContent(s.id),
      })),
    };
    const filename = `annex-iv-${resolvedName.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    showToast(`Fascicolo esportato: ${filename}`);
  }

  function exportMarkdown() {
    const resolvedName = systemName.trim() || "Sistema AI";
    const lines: string[] = [
      `# Fascicolo Tecnico — ${resolvedName}`,
      `**Regolamento UE 2024/1689 — Art. 11, Allegato IV**`,
      `Versione: ${versionSnapshots[0]?.tag ?? "draft"} · Esportato: ${new Date().toLocaleDateString("it-IT")}`,
      "",
    ];
    ANNEX_IV.forEach((s) => {
      lines.push(`## ${s.ref} — ${s.title}${s.required ? " *(Obbligatoria)*" : ""}`);
      lines.push(getContent(s.id) || "_Da compilare_");
      lines.push("");
    });
    const filename = `annex-iv-${resolvedName.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.md`;
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    showToast(`Markdown esportato: ${filename}`);
  }

  const activeS = ANNEX_IV.find((s) => s.id === activeSection)!;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="w-full" style={{ fontFamily: "system-ui, sans-serif" }}>

      <SystemSelector checkProhibited={true} />
      <ProviderTransitionAlertBanner />

      {/* Dossier saved banner */}
      {savedAt ? (
        <div className="flex items-center gap-2 rounded-lg px-4 py-2.5 mb-5 text-[12px]"
          style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)" }}>
          <span style={{ color: "#15803d" }}>✓ Risultati salvati nel dossier · Aggiornato il {new Date(savedAt).toLocaleDateString("it-IT")}</span>
          {docugenSaved && <span className="text-[10px]" style={{ color: "#15803d" }}>· Salvato automaticamente</span>}
          <Link href="/dashboard/dossier" className="ml-auto text-[11px] font-medium hover:opacity-70 transition-opacity" style={{ color: "#15803d" }}>Vedi dossier →</Link>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between rounded-lg px-4 py-2.5 mb-1 text-[12px]"
            style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)" }}>
            <span style={{ color: "rgba(0,0,0,0.45)" }}>
              Salva il Fascicolo Tecnico nel dossier di compliance
              {docugenSaved && <span className="ml-2 text-[10px]" style={{ color: "#16a34a" }}>✓ Auto-salvato</span>}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button onClick={() => setShowSaveNote(v => !v)}
                className="text-[11px] rounded-full px-3 py-1 transition-opacity hover:opacity-80"
                style={{ background: "rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.55)", border: "none", cursor: "pointer" }}>
                {showSaveNote ? "▲" : "+ nota"}
              </button>
              <button onClick={() => saveToDossier(false)} className="text-[11px] font-medium rounded-full px-3 py-1 transition-opacity hover:opacity-80"
                style={{ background: "rgba(0,0,0,0.08)", color: "#0D1016", border: "none", cursor: "pointer" }}>
                Salva bozza
              </button>
              <button onClick={() => saveToDossier(true)} disabled={!canFinalize}
                className="text-[11px] font-medium rounded-full px-3 py-1 transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ background: "#0D1016", color: "#ffffff", border: "none", cursor: canFinalize ? "pointer" : "not-allowed" }}>
                ✓ Finalizza versione
              </button>
            </div>
          </div>
          {showSaveNote && (
            <div className="mb-5 rounded-lg" style={{ padding: "8px 16px 10px", background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", display: "flex", gap: 8, alignItems: "center" }}>
              <Clock size={12} style={{ color: "rgba(0,0,0,0.3)", flexShrink: 0 }} />
              <input
                value={saveNote}
                onChange={e => setSaveNote(e.target.value)}
                placeholder="Nota opzionale — es. «Aggiornato dopo audit DPO del 10/06»"
                style={{ flex: 1, fontSize: 11, padding: "5px 10px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.12)", color: "#0D1016" }}
              />
            </div>
          )}
        </>
      )}

      {/* DB Sync Banner */}
      {aiSystems.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg px-4 py-2.5 mb-4 text-[12px]"
          style={{ background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.08)" }}>
          <span style={{ color: "rgba(0,0,0,0.45)" }}>Sistema AI:</span>
          <select
            value={aiSystemId || ""}
            onChange={(e) => setAiSystemId(e.target.value || null)}
            className="text-[12px] bg-transparent outline-none"
            style={{ color: "#0D1016" }}
          >
            <option value="">— seleziona sistema AI —</option>
            {aiSystems.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.risk_tier})</option>
            ))}
          </select>
          <span className="ml-auto text-[11px]" style={{ color: dbSyncing ? "rgba(0,0,0,0.55)" : dbSynced ? "#16a34a" : "rgba(0,0,0,0.3)" }}>
            {dbSyncing ? "⟳ Sincronizzando..." : dbSynced ? "✓ Salvato su DB" : "○ Non sincronizzato"}
          </span>
        </div>
      )}


      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase mb-1"
            style={{ color: "rgba(0,0,0,0.3)", letterSpacing: "1.2px" }}>
            Art. 11 · Allegato IV
          </p>
          <h1 className="text-[24px] font-medium" style={{ color: "#0D1016", letterSpacing: "-0.8px" }}>
            DocuGen AI — {classifierTier === "limited"
              ? "Dichiarazione Art. 50"
              : classifierTier === "minimal"
                ? "Nota di Conformità"
                : "Fascicolo Tecnico"}
          </h1>
          {classifierTier && classifierTier !== "unacceptable" && (
            <div className="flex items-center gap-2 mt-2 mb-1">
              <span style={{
                fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 5,
                background: classifierTier === "high"
                  ? "rgba(220,38,38,0.08)" : classifierTier === "limited"
                    ? "rgba(202,138,4,0.08)" : "rgba(22,163,74,0.08)",
                color: classifierTier === "high"
                  ? "#dc2626" : classifierTier === "limited"
                    ? "#92400e" : "#15803d",
                border: `1px solid ${classifierTier === "high"
                  ? "rgba(220,38,38,0.2)" : classifierTier === "limited"
                    ? "rgba(202,138,4,0.22)" : "rgba(22,163,74,0.18)"}`,
                textTransform: "uppercase" as const,
                letterSpacing: "0.05em",
              }}>
                {classifierTier === "high" ? "⬛ HIGH RISK — Allegato IV obbligatorio"
                  : classifierTier === "limited" ? "◻ LIMITED RISK — Art. 50 Transparency Doc"
                  : "◻ MINIMAL RISK — Codice condotta volontario"}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px]" style={{ color: "rgba(0,0,0,0.38)" }}>Sistema:</span>
            <input
              value={systemName}
              onChange={(e) => setSystemName(e.target.value)}
              placeholder="Nome del sistema AI documentato..."
              className="text-[12px] bg-transparent outline-none border-b"
              style={{ color: "#0D1016", borderBottomColor: "rgba(0,0,0,0.15)", minWidth: "220px" }}
              onFocus={(e) => (e.target.style.borderBottomColor = "rgba(0,0,0,0.4)")}
              onBlur={(e) => (e.target.style.borderBottomColor = "rgba(0,0,0,0.15)")}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px]"
            style={{ background: "#f5f5f4", border: "1px solid rgba(0,0,0,0.07)" }}>
            <GitBranch className="h-3.5 w-3.5" style={{ color: "rgba(0,0,0,0.35)" }} />
            <span style={{ color: "#0D1016", fontSize: 11 }}>
              {versionSnapshots.length > 0
                ? `${versionSnapshots[0].tag ?? "bozza"} · ${versionSnapshots.length} snapshot`
                : "Nessuna versione salvata"}
            </span>
          </div>

          {versionSnapshots[0]?.status === "finalized" && (
            <span className="text-[11px] font-medium px-3 py-2 rounded-lg"
              style={{ background: "rgba(21,128,61,0.08)", color: "#15803d", border: "1px solid rgba(21,128,61,0.2)" }}>
              ✓ Finalizzata
            </span>
          )}

          {versionSnapshots[0]?.isSubstantialModification && (
            <span className="flex items-center gap-1 text-[11px] font-medium px-3 py-2 rounded-lg"
              style={{ background: "rgba(220,38,38,0.07)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.15)" }}>
              <AlertTriangle className="h-3 w-3" /> Modifica sostanziale
            </span>
          )}

          <button
            onClick={() => setShowVersionPanel(v => !v)}
            className="flex items-center gap-1.5 text-[11px] px-3 py-2 rounded-lg transition-colors"
            style={{ background: showVersionPanel ? "rgba(0,0,0,0.07)" : "#fff",
              border: "1px solid rgba(0,0,0,0.12)", color: "rgba(0,0,0,0.6)", cursor: "pointer" }}
          >
            <History className="h-3.5 w-3.5" />
            Storico versioni
            {showVersionPanel ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {(classifierTier === "limited" || classifierTier === "minimal") ? (
            <button onClick={exportPdf}
              className="flex items-center gap-1.5 text-[11px] px-3 py-2 rounded-lg transition-opacity hover:opacity-80"
              style={{ background: "#0D1016", color: "#fff", cursor: "pointer" }}>
              <Download className="h-3.5 w-3.5" />
              Esporta {classifierTier === "limited" ? "Art. 50 PDF" : "Nota Conformità PDF"}
            </button>
          ) : (
            <button onClick={exportFullDocument}
              className="flex items-center gap-1.5 text-[11px] px-3 py-2 rounded-lg transition-opacity hover:opacity-80"
              style={{ background: "#0D1016", color: "#fff", cursor: "pointer" }}>
              <Download className="h-3.5 w-3.5" />
              Esporta JSON
            </button>
          )}
        </div>
      </div>

      {/* ── Version History panel ── */}
      {showVersionPanel && (
        <div className="mb-6">
          <VersionHistoryPanel
            toolId="docugen"
            onRestore={(data) => {
              const d = data as DocuGenState;
              if (d && typeof d === "object") setPersistedRaw({ ...DEFAULT_STATE, ...d });
              setVersionSnapshots(listVersions("docugen"));
              setShowVersionPanel(false);
              showToast("Versione ripristinata ✓");
            }}
            sectionLabels={Object.fromEntries(ANNEX_IV.map(s => [s.id, s.title]))}
          />
        </div>
      )}

      {/* ── Compare mode banner ── */}
      {compareMode && (
        <div className="rounded-xl p-3 mb-4 flex items-center gap-3"
          style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.12)" }}>
          <span className="text-[12px]" style={{ color: "#0D1016" }}>
            Confronto: <strong>{versionSnapshots[0]?.tag ?? "corrente"}</strong> vs
          </span>
          <select
            value={compareIdx}
            onChange={(e) => setCompareIdx(Number(e.target.value))}
            className="text-[12px] rounded px-2 py-1 outline-none"
            style={{ background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.12)", color: "#0D1016" }}>
            {versionSnapshots.slice(1).map((v, i) => (
              <option key={v.id} value={i + 1}>{v.tag ?? `snapshot ${i + 1}`}</option>
            ))}
          </select>
          <span className="text-[11px]" style={{ color: "rgba(0,0,0,0.35)" }}>
            Le variazioni sostanziali sono evidenziate in rosso
          </span>
        </div>
      )}

      {/* ── Timeline Step Bar ── */}
      <div style={{ display: "flex", gap: 0, marginBottom: 24 }}>
        {TIMELINE_STEPS.map((step, i) => (
          <button key={step.id} onClick={() => setTimelineStep(step.id)} style={{
            flex: 1, padding: "12px 16px",
            background: timelineStep === step.id ? "#0D1016" : "transparent",
            color: timelineStep === step.id ? "#fff" : "rgba(0,0,0,0.42)",
            border: "1px solid rgba(0,0,0,0.08)",
            borderLeft: i > 0 ? "none" : "1px solid rgba(0,0,0,0.08)",
            borderRadius: i === 0 ? "8px 0 0 8px" : i === 3 ? "0 8px 8px 0" : 0,
            cursor: "pointer", fontSize: 12, fontWeight: 500, textAlign: "left" as const,
          }}>
            <span style={{ display: "block", fontSize: 10, opacity: 0.6, marginBottom: 2 }}>Step {i + 1}</span>
            {step.label}
          </button>
        ))}
      </div>

      {/* ── Step 1: Data Aggregation ── */}
      {timelineStep === "aggregate" && (
        <div>
          <p className="text-[13px] mb-4" style={{ color: "rgba(0,0,0,0.55)" }}>
            Sorgenti dati rilevate dagli altri tool. I dati importati pre-popoleranno automaticamente le sezioni del fascicolo.
          </p>

          {/* Ghost sources */}
          {([
            { label: "Classifier", present: !!ghost.systemName, preview: ghost.systemName ? `Sistema: ${ghost.systemName} · Risk: ${ghost.riskLevel ?? "N/D"}` : null },
            { label: "Data Audit", present: !!ghost.datasetsSummary, preview: ghost.datasetsSummary },
            { label: "Risk Manager", present: !!ghost.risksSummary, preview: ghost.risksSummary },
            { label: "DPIA", present: !!ghost.legalBasis, preview: ghost.legalBasis ? `Base giuridica: ${ghost.legalBasis?.slice(0, 80)}…` : null },
          ] as { label: string; present: boolean; preview: string | null }[]).map((src) => (
            <div key={src.label} style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, padding: "12px 16px", marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#0D1016" }}>{src.label}</span>
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99,
                  background: src.present ? "rgba(0,0,0,0.07)" : "rgba(0,0,0,0.04)",
                  color: src.present ? "#0D1016" : "rgba(0,0,0,0.35)" }}>
                  {src.present ? "✓ Importato" : "Mancante"}
                </span>
              </div>
              {src.preview && (
                <p style={{ fontSize: 12, color: "rgba(0,0,0,0.55)", margin: 0 }}>{src.preview}</p>
              )}
              {!src.present && (
                <p style={{ fontSize: 11, color: "rgba(0,0,0,0.32)", margin: 0, fontStyle: "italic" }}>
                  Nessun dato — completa {src.label} prima di aggregare
                </p>
              )}
            </div>
          ))}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 mb-4">
            {[
              { label: "Sezioni completate", value: `${doneCount}/9`, color: "#16a34a" },
              { label: "In bozza", value: draftCount, color: "#0D1016" },
              { label: "Obbligatorie vuote", value: emptyRequired.length, color: emptyRequired.length > 0 ? "#dc2626" : "#16a34a" },
              { label: "Versioni salvate", value: versionSnapshots.length || "—", color: "rgba(0,0,0,0.5)" },
            ].map((c) => (
              <div key={c.label} className="rounded-xl p-4"
                style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div className="text-[20px] font-semibold" style={{ color: c.color, letterSpacing: "-0.5px" }}>{c.value}</div>
                <div className="text-[11px] mt-0.5" style={{ color: "rgba(0,0,0,0.38)" }}>{c.label}</div>
              </div>
            ))}
          </div>

          <button onClick={() => setTimelineStep("draft")}
            style={{ marginTop: 8, padding: "10px 20px", borderRadius: 8, background: "#0D1016",
              color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
            Aggrega dati →
          </button>
        </div>
      )}

      {/* ── Step 2: Intelligent Drafting ── */}
      {timelineStep === "draft" && (
        <div>
          <p className="text-[13px] mb-4" style={{ color: "rgba(0,0,0,0.55)" }}>
            Sezioni Allegato IV. Le sezioni auto-popolate o con dati inferiti sono pronte per la conferma.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {ANNEX_IV.map((s) => {
              const st = getSectionStatus(s.id);
              const hasGhostForS1 = s.id === "s1" && ghost.purpose && !content["s1"];
              const hasGhostForS4 = s.id === "s4" && ghost.datasetsSummary && !content["s4"];

              return (
                <div key={s.id} style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10, padding: "14px 16px",
                  background: st === "done" ? "#FAFAF9" : "#fff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div>
                      <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 4,
                        background: "rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.45)" }}>{SOURCE_BADGES[s.id] ?? s.ref}</span>
                      {s.autoSource && (
                        <span style={{ marginLeft: 4, fontSize: 9, padding: "2px 6px", borderRadius: 4,
                          background: "rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.45)" }}>Auto-popolata</span>
                      )}
                    </div>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99,
                      background: st === "done" ? "rgba(0,0,0,0.07)" : st === "draft" ? "rgba(0,0,0,0.05)" : "rgba(0,0,0,0.04)",
                      color: st === "done" ? "#0D1016" : st === "draft" ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.3)" }}>
                      {st === "done" ? "✓ Completata" : st === "draft" ? "Bozza" : "Vuota"}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#0D1016", margin: "6px 0 2px" }}>{s.title}</p>
                  <p style={{ fontSize: 11, color: "rgba(0,0,0,0.42)", margin: "0 0 8px" }}>{s.hint}</p>

                  {/* Ghost inference for s1 */}
                  {hasGhostForS1 && (
                    <div style={{ background: "rgba(0,0,0,0.03)", borderRadius: 6, padding: 10, marginTop: 8 }}>
                      <p style={{ fontSize: 10, color: "rgba(0,0,0,0.4)", marginBottom: 4 }}>
                        Il sistema ha inferito questa descrizione da Classifier:
                      </p>
                      <p style={{ fontSize: 12, color: "#0D1016", margin: "0 0 8px",
                        fontFamily: "Georgia, 'Times New Roman', serif" }}>
                        {ghost.purpose}
                      </p>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => {
                            setContent(p => ({ ...p, s1: ghost.purpose! }));
                            setStatus(p => ({ ...p, s1: "done" }));
                          }}
                          style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6,
                            background: "#0D1016", color: "#fff", border: "none", cursor: "pointer" }}>
                          ✓ Conferma
                        </button>
                        <button onClick={() => { setActiveSection("s1"); setTimelineStep("validate"); }}
                          style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6,
                            background: "transparent", color: "rgba(0,0,0,0.5)",
                            border: "1px solid rgba(0,0,0,0.12)", cursor: "pointer" }}>
                          Modifica
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Ghost inference for s4 */}
                  {hasGhostForS4 && (
                    <div style={{ background: "rgba(0,0,0,0.03)", borderRadius: 6, padding: 10, marginTop: 8 }}>
                      <p style={{ fontSize: 10, color: "rgba(0,0,0,0.4)", marginBottom: 4 }}>
                        Il sistema ha inferito da Data Audit:
                      </p>
                      <p style={{ fontSize: 12, color: "#0D1016", margin: "0 0 8px",
                        fontFamily: "Georgia, 'Times New Roman', serif" }}>
                        {ghost.datasetsSummary}
                      </p>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => {
                            setContent(p => ({ ...p, s4: ghost.datasetsSummary! }));
                            setStatus(p => ({ ...p, s4: "done" }));
                          }}
                          style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6,
                            background: "#0D1016", color: "#fff", border: "none", cursor: "pointer" }}>
                          ✓ Conferma
                        </button>
                        <button onClick={() => { setActiveSection("s4"); setTimelineStep("validate"); }}
                          style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6,
                            background: "transparent", color: "rgba(0,0,0,0.5)",
                            border: "1px solid rgba(0,0,0,0.12)", cursor: "pointer" }}>
                          Modifica
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Preview content if done */}
                  {st !== "empty" && !hasGhostForS1 && !hasGhostForS4 && (
                    <p style={{ fontSize: 11, color: "rgba(0,0,0,0.45)", margin: "6px 0 0",
                      fontFamily: "Georgia, 'Times New Roman', serif",
                      overflow: "hidden", display: "-webkit-box",
                      WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
                      {stripMarkdown(getContent(s.id) ?? "").slice(0, 120) || ""}
                    </p>
                  )}

                  <button onClick={() => { setActiveSection(s.id); setTimelineStep("validate"); }}
                    style={{ marginTop: 10, fontSize: 10, padding: "3px 10px", borderRadius: 5,
                      background: "rgba(0,0,0,0.05)", color: "rgba(0,0,0,0.5)",
                      border: "none", cursor: "pointer" }}>
                    Apri editor →
                  </button>
                </div>
              );
            })}
          </div>

          <button onClick={() => setTimelineStep("validate")}
            style={{ marginTop: 20, padding: "10px 20px", borderRadius: 8, background: "#0D1016",
              color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
            Vai alla validazione →
          </button>
        </div>
      )}

      {/* ── Step 3: Human Validation ── */}
      {timelineStep === "validate" && (
        <div>
          {/* Progress bar */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: "rgba(0,0,0,0.42)" }}>Completamento Allegato IV</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#0D1016" }}>{Math.round((doneCount / 9) * 100)}%</span>
            </div>
            <div style={{ height: 4, borderRadius: 99, background: "rgba(0,0,0,0.07)", overflow: "hidden" }}>
              <motion.div style={{ height: "100%", background: "#0D1016", borderRadius: 99 }}
                animate={{ width: `${(doneCount / 9) * 100}%` }} transition={{ duration: 0.5 }} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 16 }}>
            {/* Sidebar sezioni */}
            {!focusMode && (
              <div style={{ width: 200, flexShrink: 0 }}>
                <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(0,0,0,0.07)" }}>
                  {ANNEX_IV.map((s) => {
                    const st = getSectionStatus(s.id);
                    const active = activeSection === s.id;
                    return (
                      <button key={s.id} onClick={() => setActiveSection(s.id)}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-all"
                        style={{
                          background: active ? "rgba(0,0,0,0.07)" : "transparent",
                          borderBottom: "1px solid rgba(0,0,0,0.04)",
                          border: "none",
                          cursor: "pointer",
                          borderBottomColor: "rgba(0,0,0,0.04)",
                          outline: "none",
                        }}>
                        {st === "done"  && <CheckCircle className="h-3 w-3 flex-shrink-0" style={{ color: "#16a34a" }} />}
                        {st === "draft" && <Clock className="h-3 w-3 flex-shrink-0" style={{ color: "rgba(0,0,0,0.4)" }} />}
                        {st === "empty" && <div className="w-3 h-3 rounded-full flex-shrink-0 border"
                          style={{ borderColor: s.required ? "#dc2626" : "rgba(0,0,0,0.2)" }} />}
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] truncate font-medium"
                            style={{ color: active ? "#0D1016" : "rgba(0,0,0,0.6)" }}>{s.title}</p>
                          <p className="text-[9px]" style={{ color: "rgba(0,0,0,0.28)" }}>{s.ref}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Editor */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <AnimatePresence mode="wait">
                <motion.div key={activeSection}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
                  style={{ borderRadius: 12, padding: 20, background: "#fff",
                    border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>

                  {/* Section header */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 99,
                          background: "rgba(0,0,0,0.07)", color: "rgba(0,0,0,0.55)" }}>
                          {SOURCE_BADGES[activeSection] ?? activeS.ref}
                        </span>
                        {activeS.required && (
                          <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4,
                            background: "rgba(239,68,68,0.07)", color: "#dc2626" }}>Obbligatoria</span>
                        )}
                        {activeS.autoSource && (
                          <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4,
                            background: "rgba(0,0,0,0.05)", color: "rgba(0,0,0,0.45)" }}>Auto-popolata ✦</span>
                        )}
                      </div>
                      <h2 style={{ fontSize: 15, fontWeight: 600, color: "#0D1016", margin: "0 0 2px" }}>{activeS.title}</h2>
                      <p style={{ fontSize: 12, color: "rgba(0,0,0,0.42)", margin: 0 }}>{activeS.hint}</p>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 12 }}>
                      <button onClick={() => setFocusMode(f => !f)}
                        style={{ fontSize: 10, padding: "4px 10px", borderRadius: 5, cursor: "pointer",
                          background: focusMode ? "#0D1016" : "rgba(0,0,0,0.05)",
                          color: focusMode ? "#fff" : "rgba(0,0,0,0.5)", border: "none" }}>
                        {focusMode ? "⤡ Esci focus" : "⤢ Focus mode"}
                      </button>
                      {["empty", "draft", "done"].map((st) => (
                        <button key={st} onClick={() => setStatus((prev) => ({ ...prev, [activeSection]: st as "empty" | "draft" | "done" }))}
                          style={{ fontSize: 10, padding: "4px 10px", borderRadius: 20, cursor: "pointer", border: "none",
                            background: getSectionStatus(activeSection) === st
                              ? (st === "done" ? "rgba(22,163,74,0.12)" : st === "draft" ? "rgba(0,0,0,0.10)" : "rgba(0,0,0,0.07)")
                              : "rgba(0,0,0,0.04)",
                            color: getSectionStatus(activeSection) === st
                              ? (st === "done" ? "#16a34a" : st === "draft" ? "#0D1016" : "rgba(0,0,0,0.45)")
                              : "rgba(0,0,0,0.3)",
                            fontWeight: getSectionStatus(activeSection) === st ? 600 : 400 }}>
                          {st === "done" ? "Completata" : st === "draft" ? "In bozza" : "Vuota"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Compare diff banner */}
                  {compareMode && versionSnapshots[compareIdx] && (
                    <div style={{ borderRadius: 8, padding: "8px 12px", marginBottom: 12,
                      background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
                      color: "#dc2626", fontSize: 11 }}>
                      ∆ Confronto con {versionSnapshots[compareIdx].tag ?? `snapshot ${compareIdx}`} del {new Date(versionSnapshots[compareIdx].savedAt).toLocaleDateString("it-IT")}
                      {versionSnapshots[compareIdx].sectionsChanged?.includes(activeSection) && " — questa sezione è stata modificata"}
                    </div>
                  )}

                  {/* Auto-source notice */}
                  {activeS.autoSource && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, borderRadius: 8,
                      padding: "8px 12px", marginBottom: 12, fontSize: 11,
                      background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)" }}>
                      <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#16a34a" }} />
                      <span style={{ color: "#16a34a" }}>
                        Contenuto auto-importato da{" "}
                        <strong>
                          {activeS.autoSource === "data-audit" ? "Data Audit (Art. 10)" :
                           activeS.autoSource === "risk-manager" ? "Risk Manager (Art. 9)" :
                           activeS.autoSource === "code" ? "Repository GitHub" :
                           activeS.autoSource === "git" ? "Git History" : "MLflow"}
                        </strong>
                        {versionSnapshots.length > 0 && ` — versione ${version.tag}`}
                      </span>
                    </div>
                  )}

                  {/* Editor */}
                  <textarea
                    value={getContent(activeSection)}
                    onChange={(e) => {
                      const val = e.target.value;
                      setContent((prev) => ({ ...prev, [activeSection]: val }));
                      if (!status[activeSection])
                        setStatus((prev) => ({ ...prev, [activeSection]: "draft" }));
                    }}
                    style={{
                      width: "100%", borderRadius: 8, padding: "12px 16px",
                      fontSize: focusMode ? 16 : 13, lineHeight: 1.8,
                      outline: "none", resize: "none",
                      background: "#FAFAF9", border: "1px solid rgba(0,0,0,0.09)",
                      color: "#0D1016", minHeight: focusMode ? "400px" : "220px",
                      fontFamily: "Georgia, 'Times New Roman', serif",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.2)")}
                    onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.09)")}
                    placeholder={activeS.placeholder || "Inserisci il contenuto della sezione..."}
                  />

                  {/* Bottom actions */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[
                        { label: "Markdown", action: exportMarkdown },
                        { label: "JSON", action: exportFullDocument },
                        { label: "PDF firmato", action: exportPdf },
                      ].map(({ label, action }) => (
                        <button key={label} onClick={action}
                          style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, padding: "6px 10px",
                            borderRadius: 6, background: "#f5f5f4", border: "1px solid rgba(0,0,0,0.07)",
                            color: "rgba(0,0,0,0.45)", cursor: "pointer" }}>
                          <Download className="h-3 w-3" /> {label}
                        </button>
                      ))}
                    </div>
                    {canFinalize && version.status !== "finalized" && (
                      <button onClick={async () => { await saveToDossier(); showToast("Fascicolo finalizzato e salvato ✓"); }}
                        style={{ fontSize: 12, fontWeight: 500, padding: "6px 16px", borderRadius: 20,
                          background: "#0D1016", color: "#fff", border: "none", cursor: "pointer" }}>
                        Finalizza fascicolo →
                      </button>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* ── AI Analysis Panels (collapsable) ── */}
              <div style={{ marginTop: 16, borderRadius: 12, padding: 16, background: "#fff", border: "1px solid rgba(0,0,0,0.07)" }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(0,0,0,0.3)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 12 }}>
                  ✦ Analisi AI — Art. 11 / Annex IV
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                  <button disabled={annexIVLoading} onClick={async () => {
                      setAnnexIVLoading(true); setAnnexIVReport(null);
                      const c = persisted.content;
                      const res = await checkAnnexIVGaps({
                        systemName: persisted.systemName || c["s1"] || "",
                        provider: c["s2"] || "", purpose: c["s3"] || "",
                        capabilities: c["s4"] || "", limitations: c["s5"] || "",
                        humanOversight: c["s6"] || "", performanceMetrics: c["s7"] || "",
                        trainingData: c["s8"] || "",
                      });
                      setAnnexIVLoading(false);
                      if (res.result) setAnnexIVReport(res.result);
                    }}
                    style={{ fontSize: 11, color: "#0D1016", background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 5, padding: "5px 12px", cursor: "pointer" }}>
                    {annexIVLoading ? "✦ Analisi…" : "✦ Verifica copertura Annex IV"}
                  </button>
                  <button disabled={coherenceLoading} onClick={async () => {
                      setCoherenceLoading(true); setCoherenceReport(null);
                      const ctx = buildComplianceContextFromStorage();
                      const c = persisted.content;
                      const res = await validateDocuGenCoherence({
                        systemName: persisted.systemName, purpose: c["s3"] || "",
                        capabilities: c["s4"] || "", limitations: c["s5"] || "",
                        humanOversight: c["s6"] || "",
                      }, ctx);
                      setCoherenceLoading(false);
                      if (res.report) setCoherenceReport(res.report);
                    }}
                    style={{ fontSize: 11, color: "#0D1016", background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 5, padding: "5px 12px", cursor: "pointer" }}>
                    {coherenceLoading ? "✦ Analisi…" : "✦ Verifica coerenza inter-tool"}
                  </button>
                </div>

                {/* Annex IV Report */}
                {annexIVReport && (
                  <div style={{ marginBottom: 12, padding: 12, borderRadius: 8,
                    background: annexIVReport.coverageScore >= 80 ? "rgba(22,163,74,0.04)" : "rgba(245,158,11,0.05)",
                    border: `1px solid ${annexIVReport.coverageScore >= 80 ? "rgba(22,163,74,0.2)" : "rgba(245,158,11,0.2)"}` }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.5)", background: "rgba(0,0,0,0.06)", borderRadius: 4, padding: "2px 6px" }}>✦ AI — verifica e conferma</span>
                    <p style={{ fontSize: 12, fontWeight: 700, margin: "6px 0 2px", color: "#0D1016" }}>
                      Copertura Annex IV: <span style={{ color: annexIVReport.coverageScore >= 80 ? "#15803d" : "#d97706" }}>{annexIVReport.coverageScore}%</span>
                    </p>
                    <p style={{ fontSize: 11, color: "rgba(0,0,0,0.42)", marginBottom: 8 }}>{annexIVReport.summary}</p>
                    {annexIVReport.missingSections.map((ms, i) => (
                      <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4, padding: "4px 8px", borderRadius: 5,
                        background: ms.priority === "obbligatorio" ? "rgba(220,38,38,0.04)" : "rgba(245,158,11,0.04)",
                        border: `1px solid ${ms.priority === "obbligatorio" ? "rgba(220,38,38,0.15)" : "rgba(245,158,11,0.15)"}` }}>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
                          background: ms.priority === "obbligatorio" ? "#dc2626" : "#d97706",
                          color: "#fff", whiteSpace: "nowrap", alignSelf: "flex-start" }}>
                          {ms.priority === "obbligatorio" ? "OBB" : "RAC"}
                        </span>
                        <div>
                          <p style={{ fontSize: 11, fontWeight: 600, color: "#0D1016", margin: 0 }}>{ms.section}</p>
                          <p style={{ fontSize: 10, color: "rgba(0,0,0,0.42)", margin: "1px 0 0", fontStyle: "italic" }}>{ms.annexIVRef}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Coherence Report */}
                {coherenceReport && (
                  <div style={{ marginBottom: 12, padding: 12, borderRadius: 8,
                    background: coherenceReport.coherenceScore >= 80 ? "rgba(22,163,74,0.04)" : "rgba(220,38,38,0.04)",
                    border: `1px solid ${coherenceReport.coherenceScore >= 80 ? "rgba(22,163,74,0.2)" : "rgba(220,38,38,0.2)"}` }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.5)", background: "rgba(0,0,0,0.06)", borderRadius: 4, padding: "2px 6px" }}>✦ AI — verifica e conferma</span>
                    <p style={{ fontSize: 12, fontWeight: 700, margin: "6px 0 2px", color: "#0D1016" }}>
                      Coerenza inter-tool: <span style={{ color: coherenceReport.coherenceScore >= 80 ? "#15803d" : "#dc2626" }}>{coherenceReport.coherenceScore}%</span> — {coherenceReport.overallStatus.replace(/_/g, " ")}
                    </p>
                    {coherenceReport.inconsistencies.map((inc, i) => (
                      <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4, padding: "4px 8px", borderRadius: 5,
                        background: inc.severity === "critical" ? "rgba(220,38,38,0.04)" : "rgba(245,158,11,0.04)",
                        border: `1px solid ${inc.severity === "critical" ? "rgba(220,38,38,0.15)" : "rgba(245,158,11,0.15)"}` }}>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
                          background: inc.severity === "critical" ? "#dc2626" : inc.severity === "warning" ? "#d97706" : "#6b7280",
                          color: "#fff", whiteSpace: "nowrap", alignSelf: "flex-start" }}>{inc.severity}</span>
                        <div>
                          <p style={{ fontSize: 11, fontWeight: 600, color: "#0D1016", margin: 0 }}>
                            {inc.field}: <span style={{ color: "#dc2626" }}>{inc.docuGenValue}</span> vs <span style={{ color: "rgba(0,0,0,0.55)" }}>{inc.sourceContext}: {inc.contextValue}</span>
                          </p>
                          <p style={{ fontSize: 10, color: "rgba(0,0,0,0.42)", margin: "1px 0 0", fontStyle: "italic" }}>{inc.art11Reference}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Change Impact */}
                <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 10 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(0,0,0,0.5)", marginBottom: 6 }}>Hai modificato il sistema? Descrivi il cambiamento:</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input value={changeDesc} onChange={e => setChangeDesc(e.target.value)}
                      placeholder="Es. 'Aggiornato il modello con nuovi dati HR Q2 2026'"
                      style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.12)", fontSize: 12 }} />
                    <button disabled={changeImpactLoading || !changeDesc.trim()} onClick={async () => {
                        setChangeImpactLoading(true); setChangeImpactReport(null);
                        const ctx = buildComplianceContextFromStorage();
                        const res = await assessChangeImpact(changeDesc, ctx.riskTier ?? null, ctx.annexIII ?? null);
                        setChangeImpactLoading(false);
                        if (res.report) setChangeImpactReport(res.report);
                      }}
                      style={{ fontSize: 11, color: "#059669", background: "rgba(5,150,105,0.06)", border: "1px solid rgba(5,150,105,0.2)", borderRadius: 5, padding: "5px 12px", cursor: "pointer", whiteSpace: "nowrap" }}>
                      {changeImpactLoading ? "✦ Analisi…" : "✦ Analizza impatto"}
                    </button>
                  </div>
                  {changeImpactReport && (
                    <div style={{ marginTop: 8, padding: 10, borderRadius: 8,
                      background: changeImpactReport.isSubstantialModification ? "rgba(220,38,38,0.04)" : "rgba(22,163,74,0.04)",
                      border: `1px solid ${changeImpactReport.isSubstantialModification ? "rgba(220,38,38,0.2)" : "rgba(22,163,74,0.2)"}` }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.5)", background: "rgba(0,0,0,0.06)", borderRadius: 4, padding: "2px 6px" }}>✦ AI — verifica e conferma</span>
                      <p style={{ fontSize: 12, fontWeight: 700, margin: "6px 0 2px", color: changeImpactReport.isSubstantialModification ? "#dc2626" : "#15803d" }}>
                        {changeImpactReport.isSubstantialModification ? "⚠ Modifica sostanziale rilevata" : "✓ Modifica non sostanziale"}
                        {changeImpactReport.requiresNewConformityAssessment && " — richiede nuovo Conformity Assessment"}
                      </p>
                      <p style={{ fontSize: 10, color: "rgba(0,0,0,0.42)", fontStyle: "italic", marginBottom: 6 }}>{changeImpactReport.substModificationBasis}</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {changeImpactReport.affectedAnnexIVSections.filter(s => s.updateRequired === "obbligatorio").map((s, i) => (
                          <span key={i} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 99, background: "rgba(220,38,38,0.1)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.2)" }}>Aggiorna: {s.sectionLabel}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Finalize blocker */}
              {!canFinalize && (
                <div style={{ marginTop: 12, borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: 8,
                  background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}>
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "#dc2626" }} />
                  <p style={{ fontSize: 12, color: "#dc2626", margin: 0 }}>
                    Finalizzazione bloccata: completa le sezioni obbligatorie{" "}
                    <strong>{emptyRequired.map((s) => s.ref).join(", ")}</strong>{" "}
                    prima di passare allo stato Finalized.
                  </p>
                </div>
              )}
            </div>
          </div>

          <button onClick={() => setTimelineStep("export")}
            style={{ marginTop: 20, padding: "10px 20px", borderRadius: 8, background: "#0D1016",
              color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
            Pronto per l&apos;export →
          </button>
        </div>
      )}

      {/* ── Step 4: Audit-Ready Export ── */}
      {timelineStep === "export" && (
        <div>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Sezioni completate", value: `${doneCount}/9`, color: "#16a34a" },
              { label: "In bozza", value: draftCount, color: "#0D1016" },
              { label: "Obbligatorie vuote", value: emptyRequired.length, color: emptyRequired.length > 0 ? "#dc2626" : "#16a34a" },
              { label: "Versioni salvate", value: versionSnapshots.length || "—", color: "rgba(0,0,0,0.5)" },
            ].map((c) => (
              <div key={c.label} style={{ borderRadius: 12, padding: 16, background: "#fff", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: 20, fontWeight: 600, color: c.color, letterSpacing: "-0.5px" }}>{c.value}</div>
                <div style={{ fontSize: 11, marginTop: 2, color: "rgba(0,0,0,0.38)" }}>{c.label}</div>
              </div>
            ))}
          </div>

          {/* Export buttons */}
          <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
            {[
              { label: "Esporta Markdown", action: exportMarkdown },
              { label: "Esporta JSON", action: exportFullDocument },
              { label: "Esporta PDF firmato", action: exportPdf },
            ].map(({ label, action }) => (
              <button key={label} onClick={action}
                style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "10px 18px",
                  borderRadius: 8, background: "#f5f5f4", border: "1px solid rgba(0,0,0,0.1)",
                  color: "#0D1016", cursor: "pointer", fontWeight: 500 }}>
                <Download className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
            <button onClick={() => saveToDossier(true)} disabled={!canFinalize}
              style={{ fontSize: 12, padding: "10px 18px", borderRadius: 8,
                background: canFinalize ? "#0D1016" : "rgba(0,0,0,0.1)",
                color: canFinalize ? "#fff" : "rgba(0,0,0,0.3)", border: "none",
                cursor: canFinalize ? "pointer" : "not-allowed", fontWeight: 500 }}>
              ✓ Finalizza versione
            </button>
          </div>

          {/* Version history */}
          <div style={{ marginBottom: 24 }}>
            <VersionHistoryPanel
              toolId="docugen"
              onRestore={(data) => {
                const d = data as DocuGenState;
                if (d && typeof d === "object") setPersistedRaw({ ...DEFAULT_STATE, ...d });
                setVersionSnapshots(listVersions("docugen"));
                showToast("Versione ripristinata ✓");
              }}
              sectionLabels={Object.fromEntries(ANNEX_IV.map(s => [s.id, s.title]))}
            />
          </div>

          {/* Document preview — editable */}
          <div style={{ background: "#FAFAFA", padding: "16px", borderRadius: 8 }}>
            {/* Toolbar */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              {docEditing ? (
                <button onClick={confirmDocEdit}
                  style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, padding: "5px 12px",
                    borderRadius: 6, background: "#0D1016", color: "#fff", border: "none", cursor: "pointer" }}>
                  <CheckCircle className="h-3 w-3" /> Salva modifiche
                </button>
              ) : (
                <button onClick={enterDocEdit}
                  style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, padding: "5px 12px",
                    borderRadius: 6, background: "rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.6)",
                    border: "1px solid rgba(0,0,0,0.10)", cursor: "pointer" }}>
                  <Pencil className="h-3 w-3" /> Modifica documento
                </button>
              )}
            </div>

            {/* Edit mode — contentEditable */}
            {docEditing && (
              <div
                ref={editDocRef}
                contentEditable
                suppressContentEditableWarning
                style={{
                  background: "#ffffff", borderRadius: 8, padding: "28px 32px",
                  border: "1px solid rgba(13,16,22,0.25)",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                  outline: "none", minHeight: 400,
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: 13, color: "#0D1016", lineHeight: 1.7,
                }}
              />
            )}

            {/* Preview: edited HTML */}
            {!docEditing && editedDocHtml && (
              <div
                dangerouslySetInnerHTML={{ __html: editedDocHtml }}
                style={{
                  background: "#ffffff", borderRadius: 8, padding: "28px 32px",
                  border: "1px solid rgba(0,0,0,0.08)",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: 13, color: "#0D1016", lineHeight: 1.7,
                }}
              />
            )}

            {/* Preview: live JSX (sezioni modificabili sono solo i testi, non gli header) */}
            {!docEditing && !editedDocHtml && (
              <div
                ref={previewDocRef}
                style={{
                  background: "#ffffff", borderRadius: 8, padding: "28px 32px",
                  border: "1px solid rgba(0,0,0,0.08)",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: 13, color: "#0D1016", lineHeight: 1.7,
                }}
              >
                <h1 data-noedit="true" style={{ fontSize: 22, fontWeight: 600, color: "#0D1016", marginBottom: 4, letterSpacing: "-0.5px" }}>
                  {systemName || "Sistema AI"}
                </h1>
                <p data-noedit="true" style={{ fontSize: 12, color: "rgba(0,0,0,0.4)", marginBottom: 32, fontFamily: "system-ui, sans-serif" }}>
                  Fascicolo Tecnico · Art. 11 AI Act (Allegato IV) · {new Date().toLocaleDateString("it-IT")}
                </p>

                {ANNEX_IV.map((s) => (
                  <div key={s.id} style={{ marginBottom: 28, paddingBottom: 28, borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                    <div data-noedit="true" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontFamily: "system-ui, sans-serif",
                        color: "rgba(0,0,0,0.38)", fontWeight: 600 }}>{s.ref}</span>
                      <span style={{ fontSize: 10, fontFamily: "system-ui, sans-serif",
                        padding: "1px 6px", borderRadius: 4, background: "rgba(0,0,0,0.05)",
                        color: "rgba(0,0,0,0.45)" }}>{SOURCE_BADGES[s.id]}</span>
                    </div>
                    <h2 data-noedit="true" style={{ fontSize: 14, fontWeight: 600, color: "#0D1016", marginBottom: 8 }}>{s.title}</h2>
                    <p style={{ fontSize: 13, lineHeight: 1.8, color: "rgba(0,0,0,0.75)", whiteSpace: "pre-wrap", margin: 0 }}>
                      {stripMarkdown(getContent(s.id)) || <span style={{ color: "rgba(0,0,0,0.28)", fontStyle: "italic" }}>Da compilare</span>}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 50, borderRadius: 12,
          padding: "12px 16px", fontSize: 13, boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          background: "#0D1016", color: "#fff", border: "1px solid rgba(255,255,255,0.08)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
