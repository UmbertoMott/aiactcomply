"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import ProviderTransitionAlertBanner from "@/components/shared/provider-transition-alert-banner";
import { motion, AnimatePresence } from "framer-motion";
import { GitBranch, Download, AlertTriangle, CheckCircle, Clock, History, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import Link from "next/link";
import { writeToStorage, readFromStorage } from "@/lib/dossier/storage-schema";
import type { DocugenResult, DataAuditResult, RiskManagerResult, ClassifierResult, DPIAResult, TransparencyResult, ConformityResult } from "@/lib/dossier/storage-schema";
import { loadInventory, type AISystem } from "@/lib/inventory/ai-system";
import { checkAnnexIVGaps, type AnnexIVGapsResult } from "@/app/actions/checkAnnexIVGaps";
import { validateDocuGenCoherence, type CoherenceReport } from "@/app/actions/validateDocuGenCoherence";
import { assessChangeImpact, type ChangeImpactReport } from "@/app/actions/assessChangeImpact";
import { buildComplianceContextFromStorage } from "@/hooks/useComplianceContext";
import { useAutoSave } from "@/hooks/useAutoSave";
import { VersionHistoryPanel } from "@/components/compliance/VersionHistoryPanel";
import { appendEvidence } from "@/lib/evidence/evidence-layer";
import { appendVersion, listVersions, type VersionSnapshot } from "@/lib/projects/version-history";
import { SystemSelector } from "@/components/compliance/SystemSelector";
import { ToolPhaseBar, type ToolPhase, type PhaseStatus } from "@/components/compliance/ToolPhaseBar";
import { useT, useLocale } from "@/i18n/LocaleProvider";

const STORAGE_KEY = "docugen_state";

interface DocuGenState {
  content: Record<string, string>;
  status: Record<string, "empty" | "draft" | "done">;
  systemName: string;
  activeVersion: number;
  /** 2 = sezioni s1..s9 corrispondenti ai punti 1-9 dell'Allegato IV */
  schema?: number;
}

/**
 * Le versioni precedenti usavano una numerazione non conforme all'Allegato IV
 * (s2 logica, s3 specifiche, s4 dati, s5 metriche, s6 rischi, s7 modifiche, s8 norme, s9 post-market).
 * I testi già scritti vengono spostati nel punto corretto; nulla va perso.
 */
function migrateToAnnexIV(old: DocuGenState): DocuGenState {
  if (old.schema === 2) return old;
  const c = old.content ?? {};
  const join = (...ids: string[]) => ids.map((id) => c[id]?.trim()).filter(Boolean).join("\n\n");
  const content: Record<string, string> = {};
  const put = (id: string, v: string) => { if (v) content[id] = v; };
  put("s1", join("s1"));
  put("s2", join("s2", "s3", "s4"));
  put("s4", join("s5"));
  put("s5", join("s6"));
  put("s6", join("s7"));
  put("s7", join("s8"));
  put("s9", join("s9"));
  const status: Record<string, "empty" | "draft" | "done"> = {};
  for (const id of Object.keys(content)) status[id] = "draft";
  return { ...old, content, status, schema: 2 };
}

const DEFAULT_STATE: DocuGenState = {
  content: {},
  status: {},
  systemName: "",
  activeVersion: 0,
  schema: 2,
};

function loadState(): DocuGenState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? migrateToAnnexIV(JSON.parse(raw) as DocuGenState) : DEFAULT_STATE;
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

// Dati reali degli altri tool, proposti come bozza da confermare (mai segnati come completati)
function readCrossToolContent(): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof window === "undefined") return out;
  try {
    const dataAudit = readFromStorage<DataAuditResult>("dataAudit");
    if (dataAudit) {
      out["data-audit"] = [
        `Dai dati della Qualità dei dati (Art. 10):`,
        `Set di dati analizzati: ${dataAudit.datasets?.map((d) => d.name).join(", ") || "non indicati"}`,
        `Dati personali: ${dataAudit.datasets?.some((d) => d.personalData) ? "sì" : "no"}`,
      ].join("\n");
    }
  } catch { /* nessun dato */ }
  try {
    const tr = readFromStorage<TransparencyResult>("transparency");
    const i = tr?.instructions;
    if (i) {
      const parts = [
        i.b_ii && `Accuratezza, robustezza e cibersicurezza: ${i.b_ii}`,
        i.b_iii && `Situazioni che possono creare rischi: ${i.b_iii}`,
        i.b_v && `Prestazioni su persone o gruppi specifici: ${i.b_v}`,
        i.d && `Sorveglianza umana: ${i.d}`,
        i.b_vi && `Dati di input: ${i.b_vi}`,
      ].filter(Boolean);
      if (parts.length) out["transparency"] = [`Dalle istruzioni per l'uso (Art. 13(3)):`, ...parts].join("\n");
    }
  } catch { /* nessun dato */ }
  try {
    const riskData = readFromStorage<RiskManagerResult>("riskManager");
    if (riskData) {
      out["risk-manager"] = [
        `Dal registro dei rischi (Art. 9):`,
        `Livello di rischio complessivo: ${riskData.overallRiskLevel || "non indicato"}`,
        `Prossima revisione: ${riskData.nextReviewDate || "da pianificare"}`,
      ].join("\n");
    }
  } catch { /* nessun dato */ }
  try {
    const conf = readFromStorage<ConformityResult>("conformity");
    if (conf?.declarationGenerated) {
      out["conformity"] = `Dichiarazione di conformità UE generata nel tool Conformità${conf.registrationRef ? ` — riferimento ${conf.registrationRef}` : ""}. Allegarne copia (Art. 47).`;
    }
  } catch { /* nessun dato */ }
  try {
    const plan = JSON.parse(localStorage.getItem("post_market_plan") ?? "null") as { label: string; frequency: string; article: string }[] | null;
    if (plan?.length) out["post-market"] = [`Dal piano di monitoraggio (Art. 72):`, ...plan.map((c) => `• ${c.label} — ${c.frequency} (${c.article})`)].join("\n");
  } catch { /* nessun dato */ }
  return out;
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

// ─── Allegato IV — i 9 punti del contenuto minimo della documentazione tecnica ───
const ANNEX_IV: { id: string; ref: string; title: string; required: boolean; hint: string; autoSource: string | null; placeholder: string }[] = [
  { id: "s1", ref: "All. IV, punto 1", title: "Descrizione generale del sistema", required: true, autoSource: null,
    hint: "Finalità prevista, fornitore e versione; interazione con hardware, software o altri sistemi di IA; versioni e requisiti di aggiornamento; forme di immissione sul mercato; hardware; interfaccia per il deployer; istruzioni per l'uso.",
    placeholder: "" },
  { id: "s2", ref: "All. IV, punto 2", title: "Elementi del sistema e processo di sviluppo", required: true, autoSource: "data-audit",
    hint: "Metodi e fasi di sviluppo, anche con sistemi o strumenti di terzi; specifiche di progettazione (logica, algoritmi, scelte e ipotesi); architettura e risorse di calcolo; requisiti dei dati e set di dati; valutazione delle misure di sorveglianza umana; modifiche predeterminate; convalida e prova, con metriche e registri firmati e datati; misure di cibersicurezza.",
    placeholder: "" },
  { id: "s3", ref: "All. IV, punto 3", title: "Monitoraggio, funzionamento e controllo", required: true, autoSource: "transparency",
    hint: "Capacità e limiti delle prestazioni, compresa l'accuratezza per specifiche persone o gruppi; risultati indesiderati e rischi prevedibili; misure di sorveglianza umana (Art. 14); specifiche dei dati di input.",
    placeholder: "" },
  { id: "s4", ref: "All. IV, punto 4", title: "Adeguatezza delle metriche di prestazione", required: true, autoSource: null,
    hint: "Perché le metriche scelte sono adatte al sistema specifico.",
    placeholder: "" },
  { id: "s5", ref: "All. IV, punto 5", title: "Sistema di gestione dei rischi", required: true, autoSource: "risk-manager",
    hint: "Descrizione dettagliata del sistema di gestione dei rischi conforme all'Art. 9.",
    placeholder: "" },
  { id: "s6", ref: "All. IV, punto 6", title: "Modifiche nel ciclo di vita", required: true, autoSource: null,
    hint: "Modifiche pertinenti apportate dal fornitore al sistema durante il suo ciclo di vita.",
    placeholder: "" },
  { id: "s7", ref: "All. IV, punto 7", title: "Norme armonizzate e altre specifiche", required: true, autoSource: null,
    hint: "Norme armonizzate applicate; se non applicate, le soluzioni adottate per soddisfare i requisiti del Capo III, Sezione 2, e le altre norme o specifiche tecniche pertinenti.",
    placeholder: "" },
  { id: "s8", ref: "All. IV, punto 8", title: "Copia della dichiarazione di conformità UE", required: true, autoSource: "conformity",
    hint: "Copia della dichiarazione di conformità UE di cui all'Art. 47.",
    placeholder: "" },
  { id: "s9", ref: "All. IV, punto 9", title: "Valutazione delle prestazioni dopo l'immissione sul mercato", required: true, autoSource: "post-market",
    hint: "Descrizione del sistema di valutazione delle prestazioni nella fase successiva all'immissione sul mercato (Art. 72), compreso il piano di monitoraggio.",
    placeholder: "" },
];

// ─── Strip markdown asterisks for document display ────────────────────────────
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]*)\*\*/g, "$1")
    .replace(/\*([^*]*)\*/g, "$1");
}

// ─── Riferimenti delle sezioni ───────────────────────────────────────────────
const SOURCE_BADGES: Record<string, string> = Object.fromEntries(ANNEX_IV.map((s) => [s.id, s.ref.replace("All. IV, punto ", "All. IV §")]));

const SOURCE_LABEL: Record<string, string> = {
  "data-audit": "Qualità dei dati (Art. 10)", "transparency": "Istruzioni per l'uso (Art. 13)",
  "risk-manager": "Registro dei rischi (Art. 9)", "conformity": "Conformità (Art. 47)", "post-market": "Monitoraggio (Art. 72)",
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
  const t = useT("toolDocugen");
  const locale = useLocale();
  const loc = locale === "it" ? "it-IT" : "en-GB";
  const [persisted, setPersistedRaw] = useState<DocuGenState>(() => loadState());
  const [activeSection, setActiveSection] = useState("s1");
  const [compareMode, setCompareMode] = useState(false);
  const [compareIdx, setCompareIdx] = useState(1);
  const [toast, setToast] = useState<string | null>(null);
  const [versionSnapshots, setVersionSnapshots] = useState<VersionSnapshot[]>([]);
  const [saveNote, setSaveNote] = useState("");
  const [showSaveNote, setShowSaveNote] = useState(false);
  const [workName, setWorkName] = useState("");
  const [showVersionPanel, setShowVersionPanel] = useState(false);
  const [crossContent] = useState<Record<string, string>>(() => readCrossToolContent());
  const [inventorySystems, setInventorySystems] = useState<AISystem[]>([]);

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
    setInventorySystems(loadInventory());
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
        s1: "s1_general", s2: "s2_components", s3: "s4_monitoring",
        s4: "s6_performance", s8: "s7_declaration",
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

  const version = versionSnapshots[0] ?? { tag: "lavoro", status: "draft" as const, savedAt: "", sectionsChanged: [] as string[] };

  function getContent(sectionId: string): string {
    const sec = ANNEX_IV.find((s) => s.id === sectionId)!;
    if (content[sectionId] !== undefined) return content[sectionId];
    if (sec.autoSource) return crossContent[sec.autoSource] ?? "";
    return "";
  }

  function getSectionStatus(sectionId: string): "empty" | "draft" | "done" {
    if (status[sectionId]) return status[sectionId];
    const sec = ANNEX_IV.find((s) => s.id === sectionId)!;
    // Il testo proposto da altri tool resta una bozza finché l'utente non lo conferma
    if (sec.autoSource && crossContent[sec.autoSource]) return "draft";
    return "empty";
  }

  const doneCount  = ANNEX_IV.filter((s) => getSectionStatus(s.id) === "done").length;
  const draftCount = ANNEX_IV.filter((s) => getSectionStatus(s.id) === "draft").length;
  const [savedAt, setSavedAt] = useState<string | null>(() =>
    readFromStorage<DocugenResult>("docugen")?.completedAt ?? null
  );

  const emptyRequired = ANNEX_IV.filter((s) => s.required && getSectionStatus(s.id) === "empty");
  const canFinalize = emptyRequired.length === 0;

  // ── Allineamento al linguaggio a fasi condiviso (ToolPhaseBar) ──
  // DocuGen è modale: la barra seleziona lo step invece di scrollare.
  const isFinalized = versionSnapshots[0]?.status === "finalized";
  const startedCount = doneCount + draftCount;
  const docuPhases: ToolPhase[] = [
    { id: "aggregate", label: t("phase_aggregate"), sublabel: t("phase_aggregate_sub"), anchor: "docu-aggregate" },
    { id: "draft",     label: t("phase_draft"),     sublabel: t("phase_draft_sub"),     anchor: "docu-draft" },
    { id: "validate",  label: t("phase_validate"),  sublabel: t("phase_validate_sub"),  anchor: "docu-validate" },
    { id: "export",    label: t("phase_export"),    sublabel: t("phase_export_sub"),    anchor: "docu-export" },
  ];
  const stepIndex = TIMELINE_STEPS.findIndex((s) => s.id === timelineStep);
  const docuPhaseStatus: PhaseStatus[] = [
    startedCount > 0 ? "done" : "active",
    startedCount >= 9 ? "done" : startedCount > 0 ? "active" : "todo",
    doneCount >= 9 ? "done" : doneCount > 0 ? "active" : "todo",
    isFinalized ? "done" : doneCount >= 9 ? "active" : "todo",
  ];

  async function saveToDossier(asFinalized = false) {
    const completedAt = new Date().toISOString();
    const resolvedName = systemName.trim() || "Sistema di IA (non specificato)";

    writeToStorage<DocugenResult>("docugen", {
      systemName: resolvedName,
      provider: "Da indicare (Allegato IV, punto 1)",
      purpose: getContent("s1"),
      capabilities: getContent("s2"),
      limitations: getContent("s3") || "Da compilare",
      humanOversight: getContent("s3") || "Da compilare",
      performanceMetrics: getContent("s4") || "Da compilare",
      trainingData: getContent("s2") || crossContent["data-audit"],
      completedAt,
    });

    const sectionsSnapshot: Record<string, "empty" | "draft" | "done"> = {};
    ANNEX_IV.forEach(s => { sectionsSnapshot[s.id] = getSectionStatus(s.id); });

    const isSubstantial = changeImpactReport?.isSubstantialModification ?? false;
    const resolvedTag = workName.trim() || undefined;
    appendVersion("docugen", persisted, {
      label: asFinalized ? "Versione finalizzata" : "Salvataggio manuale",
      tag: resolvedTag,
      note: saveNote.trim() || undefined,
      status: asFinalized ? "finalized" : "draft",
      isSubstantialModification: isSubstantial,
      substModificationBasis: isSubstantial ? (changeImpactReport?.substModificationBasis ?? undefined) : undefined,
      sectionsSnapshot,
      systemName: resolvedName,
    });

    setVersionSnapshots(listVersions("docugen"));
    setSaveNote("");
    setWorkName("");
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
    const resolvedName = systemName.trim() || "Sistema di IA";
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
    showToast(t("toast_pdfGen"));
    try {
      const res = await fetch("/api/compliance/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { showToast(t("toast_pdfError")); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `AIComply_${resolvedName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(t("toast_pdfExported"));
    } catch {
      showToast(t("toast_pdfExportError"));
    }
  }

  function exportFullDocument() {
    const resolvedName = systemName.trim() || "sistema-ai";
    const doc = {
      meta: {
        format: "RegulaeOS Fascicolo Tecnico — Annex IV",
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
    showToast(`${t("toast_dossierExported")} ${filename}`);
  }

  function exportMarkdown() {
    const resolvedName = systemName.trim() || "Sistema di IA";
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
    showToast(`${t("toast_mdExported")} ${filename}`);
  }

  const activeS = ANNEX_IV.find((s) => s.id === activeSection)!;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="w-full" style={{ fontFamily: "inherit" }}>

      <SystemSelector checkProhibited={true} />
      <ProviderTransitionAlertBanner />

      {/* Dossier saved banner */}
      {savedAt ? (
        <div className="flex items-center gap-2 rounded-lg px-4 py-2.5 mb-5 text-[12px]"
          style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)" }}>
          <span style={{ color: "#15803d" }}>✓ {t("dossierSaved")} · {t("updatedOn")} {new Date(savedAt).toLocaleDateString(loc)}</span>
          {docugenSaved && <span className="text-[10px]" style={{ color: "#15803d" }}>· {t("autoSaved")}</span>}
          <Link href="/dashboard/dossier" className="ml-auto text-[11px] font-medium hover:opacity-70 transition-opacity" style={{ color: "#15803d" }}>{t("seeDossier")}</Link>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between rounded-lg px-4 py-2.5 mb-1 text-[12px]"
            style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)" }}>
            <span style={{ color: "rgba(0,0,0,0.45)" }}>
              {t("saveHint")}
              {docugenSaved && <span className="ml-2 text-[10px]" style={{ color: "#16a34a" }}>✓ {t("autoSavedShort")}</span>}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button onClick={() => { if (!workName && systemName) setWorkName(systemName); setShowSaveNote(v => !v); }}
                className="text-[11px] rounded-full px-3 py-1 transition-opacity hover:opacity-80"
                style={{ background: "rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.55)", border: "none", cursor: "pointer" }}>
                {showSaveNote ? "▲" : t("nameAndSave")}
              </button>
              <button onClick={() => { if (!workName && systemName) setWorkName(systemName); setShowSaveNote(true); }} className="text-[11px] font-medium rounded-full px-3 py-1 transition-opacity hover:opacity-80"
                style={{ background: "rgba(0,0,0,0.08)", color: "#0D1016", border: "none", cursor: "pointer" }}
                onDoubleClick={() => saveToDossier(false)}>
                {t("saveWork")}
              </button>
              <button onClick={() => saveToDossier(true)} disabled={!canFinalize}
                className="text-[11px] font-medium rounded-full px-3 py-1 transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ background: "#0D1016", color: "#ffffff", border: "none", cursor: canFinalize ? "pointer" : "not-allowed" }}>
                ✓ {t("finalizeVersion")}
              </button>
            </div>
          </div>
          {showSaveNote && (
            <div className="mb-5 rounded-lg" style={{ padding: "10px 16px 12px", background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(0,0,0,0.4)", minWidth: 80, textTransform: "uppercase", letterSpacing: "0.04em" }}>{t("workName")}</span>
                <input
                  value={workName}
                  onChange={e => setWorkName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && workName.trim()) saveToDossier(false); }}
                  placeholder={t("workNamePh")}
                  style={{ flex: 1, fontSize: 11, padding: "6px 10px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.12)", color: "#0D1016", outline: "none" }}
                  autoFocus
                />
                <button onClick={() => saveToDossier(false)}
                  style={{ fontSize: 11, fontWeight: 700, padding: "6px 14px", borderRadius: 6, background: "#0D1016", color: "#fff", border: "none", cursor: "pointer", flexShrink: 0 }}>
                  {t("save")}
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Clock size={11} style={{ color: "rgba(0,0,0,0.3)", flexShrink: 0, marginLeft: 80 }} />
                <input
                  value={saveNote}
                  onChange={e => setSaveNote(e.target.value)}
                  placeholder={t("noteOptionalPh")}
                  style={{ flex: 1, fontSize: 11, padding: "5px 10px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.12)", color: "#0D1016" }}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* DB Sync Banner */}
      {aiSystems.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg px-4 py-2.5 mb-4 text-[12px]"
          style={{ background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.08)" }}>
          <span style={{ color: "rgba(0,0,0,0.45)" }}>{t("aiSystemLabel")}</span>
          <select
            value={aiSystemId || ""}
            onChange={(e) => setAiSystemId(e.target.value || null)}
            className="text-[12px] bg-transparent outline-none"
            style={{ color: "#0D1016" }}
          >
            <option value="">{t("selectAiSystem")}</option>
            {aiSystems.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.risk_tier})</option>
            ))}
          </select>
          <span className="ml-auto text-[11px]" style={{ color: dbSyncing ? "rgba(0,0,0,0.55)" : dbSynced ? "#16a34a" : "rgba(0,0,0,0.3)" }}>
            {dbSyncing ? t("dbSyncing") : dbSynced ? t("dbSaved") : t("dbNotSync")}
          </span>
        </div>
      )}


      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase mb-1"
            style={{ color: "rgba(0,0,0,0.3)", letterSpacing: "1.2px" }}>
            {t("kicker")}
          </p>
          <h1 className="text-[24px] font-medium" style={{ color: "#0D1016", letterSpacing: "-0.8px" }}>
            DocuGen AI — {classifierTier === "limited"
              ? t("titleArt50")
              : classifierTier === "minimal"
                ? t("titleComplianceNote")
                : t("titleTechFile")}
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
                {classifierTier === "high" ? t("badge_high")
                  : classifierTier === "limited" ? t("badge_limited")
                  : t("badge_minimal")}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px]" style={{ color: "rgba(0,0,0,0.38)" }}>{t("workLabel")}</span>
            <input
              type="text"
              value={systemName}
              onChange={(e) => {
                setSystemName(e.target.value);
                setWorkName(e.target.value);
              }}
              placeholder={t("workNamePlaceholder")}
              className="text-[12px] outline-none border-b bg-transparent"
              style={{ color: "#0D1016", borderBottomColor: "rgba(0,0,0,0.15)", minWidth: "220px" }}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px]"
            style={{ background: "#f5f5f4", border: "1px solid rgba(0,0,0,0.07)" }}>
            <GitBranch className="h-3.5 w-3.5" style={{ color: "rgba(0,0,0,0.35)" }} />
            <span style={{ color: "#0D1016", fontSize: 11 }}>
              {versionSnapshots.length > 0
                ? `${versionSnapshots[0].tag ?? t("workWord")} · ${versionSnapshots.length} snapshot`
                : t("noVersionSaved")}
            </span>
          </div>

          {versionSnapshots[0]?.status === "finalized" && (
            <span className="text-[11px] font-medium px-3 py-2 rounded-lg"
              style={{ background: "rgba(21,128,61,0.08)", color: "#15803d", border: "1px solid rgba(21,128,61,0.2)" }}>
              ✓ {t("finalizedBadge")}
            </span>
          )}

          {versionSnapshots[0]?.isSubstantialModification && (
            <span className="flex items-center gap-1 text-[11px] font-medium px-3 py-2 rounded-lg"
              style={{ background: "rgba(220,38,38,0.07)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.15)" }}>
              <AlertTriangle className="h-3 w-3" /> {t("substantialModification")}
            </span>
          )}

          <button
            onClick={() => setShowVersionPanel(v => !v)}
            className="flex items-center gap-1.5 text-[11px] px-3 py-2 rounded-lg transition-colors"
            style={{ background: showVersionPanel ? "rgba(0,0,0,0.07)" : "#fff",
              border: "1px solid rgba(0,0,0,0.12)", color: "rgba(0,0,0,0.6)", cursor: "pointer" }}
          >
            <History className="h-3.5 w-3.5" />
            {t("versionHistory")}
            {showVersionPanel ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {(classifierTier === "limited" || classifierTier === "minimal") ? (
            <button onClick={exportPdf}
              className="flex items-center gap-1.5 text-[11px] px-3 py-2 rounded-lg transition-opacity hover:opacity-80"
              style={{ background: "#0D1016", color: "#fff", cursor: "pointer" }}>
              <Download className="h-3.5 w-3.5" />
              {t("exportWord")} {classifierTier === "limited" ? "Art. 50 PDF" : t("complianceNotePdf")}
            </button>
          ) : (
            <button onClick={exportFullDocument}
              className="flex items-center gap-1.5 text-[11px] px-3 py-2 rounded-lg transition-opacity hover:opacity-80"
              style={{ background: "#0D1016", color: "#fff", cursor: "pointer" }}>
              <Download className="h-3.5 w-3.5" />
              {t("exportJson")}
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
              showToast(t("toast_versionRestored"));
            }}
            sectionLabels={Object.fromEntries(ANNEX_IV.map(s => [s.id, t(`ann_${s.id}_title`)]))}
          />
        </div>
      )}

      {/* ── Compare mode banner ── */}
      {compareMode && (
        <div className="rounded-xl p-3 mb-4 flex items-center gap-3"
          style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.12)" }}>
          <span className="text-[12px]" style={{ color: "#0D1016" }}>
            {t("compareWord")} <strong>{versionSnapshots[0]?.tag ?? t("current")}</strong> vs
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
            {t("variationsHighlighted")}
          </span>
        </div>
      )}

      {/* ── Scaletta guidata — linguaggio a fasi condiviso (stati reali, avanzamento) ── */}
      <ToolPhaseBar
        phases={docuPhases}
        currentIdx={stepIndex}
        status={docuPhaseStatus}
        activeIdx={stepIndex}
        progressPct={Math.round((doneCount / 9) * 100)}
        meta={`${doneCount}/9 ${t("sectionsValidated")}`}
        onSelect={(i) => setTimelineStep(TIMELINE_STEPS[i].id)}
      />

      {/* ── Step 1: Data Aggregation ── */}
      {timelineStep === "aggregate" && (
        <div>
          {/* Ghost sources — FRIA style */}
          <div style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10, overflow: "hidden", marginBottom: 24 }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(0,0,0,0.06)", background: "#fafafa" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(0,0,0,0.35)", textTransform: "uppercase" as const, letterSpacing: "0.08em", margin: 0 }}>
                {t("sourcesForDraft")}
              </p>
            </div>
            {([
              { label: "Classifier", art: "Art. 6", desc: t("src_classifier_desc"), href: "/dashboard/tools/inventory", present: !!ghost.systemName, preview: ghost.systemName ? `${t("systemWord")}: ${ghost.systemName} · Risk: ${ghost.riskLevel ?? "N/D"}` : null },
              { label: "Registro dei rischi", art: "Art. 9", desc: t("src_risk_desc"), href: "/dashboard/tools/risk-manager", present: !!ghost.risksSummary, preview: ghost.risksSummary },
              { label: "Qualità dei dati", art: "Art. 10", desc: t("src_data_desc"), href: "/dashboard/tools/data-audit", present: !!ghost.datasetsSummary, preview: ghost.datasetsSummary },
              { label: "DPIA", art: "Art. 35", desc: t("src_dpia_desc"), href: "/dashboard/tools/dpia", present: !!ghost.legalBasis, preview: ghost.legalBasis ? `${t("legalBasisWord")}: ${ghost.legalBasis?.slice(0, 80)}…` : null },
            ] as { label: string; art: string; desc: string; href: string; present: boolean; preview: string | null }[]).map((src, i, arr) => (
              <div key={src.label} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", borderBottom: i < arr.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none", background: "#fff" }}>
                <div style={{ flexShrink: 0, width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  background: src.present ? "rgba(22,163,74,0.08)" : "transparent",
                  border: src.present ? "1.5px solid rgba(22,163,74,0.35)" : "1.5px solid rgba(0,0,0,0.18)" }}>
                  {src.present && <span style={{ fontSize: 10, color: "#16a34a", fontWeight: 700 }}>✓</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#0D1016" }}>{src.label}</span>
                    <span style={{ fontSize: 9, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: "rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.45)" }}>{src.art}</span>
                  </div>
                  <p style={{ fontSize: 11, color: "rgba(0,0,0,0.42)", margin: 0 }}>
                    {src.present && src.preview ? src.preview : src.desc}
                  </p>
                </div>
                <a href={src.href} style={{ flexShrink: 0, fontSize: 11, fontWeight: 500, padding: "5px 12px", borderRadius: 7,
                  background: src.present ? "transparent" : "#0D1016",
                  color: src.present ? "rgba(0,0,0,0.45)" : "#fff",
                  border: src.present ? "1px solid rgba(0,0,0,0.10)" : "none",
                  cursor: "pointer", textDecoration: "none", whiteSpace: "nowrap" as const }}>
                  {src.present ? t("editArrow") : t("improveDraft")}
                </a>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 mb-4">
            {[
              { label: t("stat_completed"), value: `${doneCount}/9`, color: "#16a34a" },
              { label: t("stat_inWork"), value: draftCount, color: "#0D1016" },
              { label: t("stat_emptyRequired"), value: emptyRequired.length, color: emptyRequired.length > 0 ? "#dc2626" : "#16a34a" },
              { label: t("stat_savedVersions"), value: versionSnapshots.length || "—", color: "rgba(0,0,0,0.5)" },
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
            {t("aggregateData")}
          </button>
        </div>
      )}

      {/* ── Step 2: Intelligent Drafting ── */}
      {timelineStep === "draft" && (
        <div>
          <p className="text-[13px] mb-4" style={{ color: "rgba(0,0,0,0.55)" }}>
            {t("draftIntro")}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {ANNEX_IV.map((s) => {
              const st = getSectionStatus(s.id);
              const hasGhostForS1 = s.id === "s1" && ghost.purpose && !content["s1"];
              const hasGhostForS4 = s.id === "s2" && ghost.datasetsSummary && !content["s2"];

              return (
                <div key={s.id} style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10, padding: "14px 16px",
                  background: st === "done" ? "#FAFAF9" : "#fff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div>
                      <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 4,
                        background: "rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.45)" }}>{SOURCE_BADGES[s.id] ?? s.ref}</span>
                      {s.autoSource && (
                        <span style={{ marginLeft: 4, fontSize: 9, padding: "2px 6px", borderRadius: 4,
                          background: "rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.45)" }}>{t("autoPopulated")}</span>
                      )}
                    </div>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99,
                      background: st === "done" ? "rgba(0,0,0,0.07)" : st === "draft" ? "rgba(0,0,0,0.05)" : "rgba(0,0,0,0.04)",
                      color: st === "done" ? "#0D1016" : st === "draft" ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.3)" }}>
                      {st === "done" ? t("completedStatus") : st === "draft" ? t("draftStatus") : t("emptyStatus")}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#0D1016", margin: "6px 0 2px" }}>{t(`ann_${s.id}_title`)}</p>
                  <p style={{ fontSize: 11, color: "rgba(0,0,0,0.42)", margin: "0 0 8px" }}>{t(`ann_${s.id}_hint`)}</p>

                  {/* Ghost inference for s1 */}
                  {hasGhostForS1 && (
                    <div style={{ background: "rgba(0,0,0,0.03)", borderRadius: 6, padding: 10, marginTop: 8 }}>
                      <p style={{ fontSize: 10, color: "rgba(0,0,0,0.4)", marginBottom: 4 }}>
                        {t("inferredFromClassifier")}
                      </p>
                      <p style={{ fontSize: 12, color: "#0D1016", margin: "0 0 8px",
                        fontFamily: "Georgia, 'Times New Roman', serif" }}>
                        {ghost.purpose}
                      </p>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => {
                            setContent(p => ({ ...p, s1: ghost.purpose! }));
                            setStatus(p => ({ ...p, s1: "draft" }));
                          }}
                          style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6,
                            background: "#0D1016", color: "#fff", border: "none", cursor: "pointer" }}>
                          ✓ {t("confirm")}
                        </button>
                        <button onClick={() => { setActiveSection("s1"); setTimelineStep("validate"); }}
                          style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6,
                            background: "transparent", color: "rgba(0,0,0,0.5)",
                            border: "1px solid rgba(0,0,0,0.12)", cursor: "pointer" }}>
                          {t("edit")}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Ghost inference for s4 */}
                  {hasGhostForS4 && (
                    <div style={{ background: "rgba(0,0,0,0.03)", borderRadius: 6, padding: 10, marginTop: 8 }}>
                      <p style={{ fontSize: 10, color: "rgba(0,0,0,0.4)", marginBottom: 4 }}>
                        {t("inferredFromDataAudit")}
                      </p>
                      <p style={{ fontSize: 12, color: "#0D1016", margin: "0 0 8px",
                        fontFamily: "Georgia, 'Times New Roman', serif" }}>
                        {ghost.datasetsSummary}
                      </p>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => {
                            setContent(p => ({ ...p, s2: ghost.datasetsSummary! }));
                            setStatus(p => ({ ...p, s2: "draft" }));
                          }}
                          style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6,
                            background: "#0D1016", color: "#fff", border: "none", cursor: "pointer" }}>
                          ✓ {t("confirm")}
                        </button>
                        <button onClick={() => { setActiveSection("s2"); setTimelineStep("validate"); }}
                          style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6,
                            background: "transparent", color: "rgba(0,0,0,0.5)",
                            border: "1px solid rgba(0,0,0,0.12)", cursor: "pointer" }}>
                          {t("edit")}
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
                    {t("openEditor")}
                  </button>
                </div>
              );
            })}
          </div>

          <button onClick={() => setTimelineStep("validate")}
            style={{ marginTop: 20, padding: "10px 20px", borderRadius: 8, background: "#0D1016",
              color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
            {t("goToValidation")}
          </button>
        </div>
      )}

      {/* ── Step 3: Human Validation ── */}
      {timelineStep === "validate" && (
        <div>
          {/* Progress bar */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: "rgba(0,0,0,0.42)" }}>{t("annexIVCompletion")}</span>
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
                            style={{ color: active ? "#0D1016" : "rgba(0,0,0,0.6)" }}>{t(`ann_${s.id}_title`)}</p>
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
                            background: "rgba(239,68,68,0.07)", color: "#dc2626" }}>{t("required")}</span>
                        )}
                        {activeS.autoSource && (
                          <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4,
                            background: "rgba(0,0,0,0.05)", color: "rgba(0,0,0,0.45)" }}>{t("autoPopulated")} ✦</span>
                        )}
                      </div>
                      <h2 style={{ fontSize: 15, fontWeight: 600, color: "#0D1016", margin: "0 0 2px" }}>{t(`ann_${activeSection}_title`)}</h2>
                      <p style={{ fontSize: 12, color: "rgba(0,0,0,0.42)", margin: 0 }}>{t(`ann_${activeSection}_hint`)}</p>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 12 }}>
                      <button onClick={() => setFocusMode(f => !f)}
                        style={{ fontSize: 10, padding: "4px 10px", borderRadius: 5, cursor: "pointer",
                          background: focusMode ? "#0D1016" : "rgba(0,0,0,0.05)",
                          color: focusMode ? "#fff" : "rgba(0,0,0,0.5)", border: "none" }}>
                        {focusMode ? t("exitFocus") : t("focusMode")}
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
                          {st === "done" ? t("completedStatus") : st === "draft" ? t("inWorkStatus") : t("emptyStatus2")}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Compare diff banner */}
                  {compareMode && versionSnapshots[compareIdx] && (
                    <div style={{ borderRadius: 8, padding: "8px 12px", marginBottom: 12,
                      background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
                      color: "#dc2626", fontSize: 11 }}>
                      ∆ {t("compareWith")} {versionSnapshots[compareIdx].tag ?? `snapshot ${compareIdx}`} {t("ofWord")} {new Date(versionSnapshots[compareIdx].savedAt).toLocaleDateString(loc)}
                      {versionSnapshots[compareIdx].sectionsChanged?.includes(activeSection) && ` — ${t("sectionModified")}`}
                    </div>
                  )}

                  {/* Auto-source notice */}
                  {activeS.autoSource && crossContent[activeS.autoSource] && !content[activeSection] && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, borderRadius: 8,
                      padding: "8px 12px", marginBottom: 12, fontSize: 11,
                      background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)" }}>
                      <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#16a34a" }} />
                      <span style={{ color: "#16a34a" }}>
                        {t("contentAutoImported")}{" "}
                        <strong>
                          {SOURCE_LABEL[activeS.autoSource] ?? activeS.autoSource}
                        </strong>
                        {versionSnapshots.length > 0 && ` — ${t("versionWord")} ${version.tag}`}
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
                    placeholder={t(`ann_${activeSection}_ph`) || t("sectionContentPh")}
                  />

                  {/* Bottom actions */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[
                        { label: t("markdown"), action: exportMarkdown },
                        { label: t("jsonWord"), action: exportFullDocument },
                        { label: t("signedPdf"), action: exportPdf },
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
                      <button onClick={async () => { await saveToDossier(); showToast(t("toast_finalized")); }}
                        style={{ fontSize: 12, fontWeight: 500, padding: "6px 16px", borderRadius: 20,
                          background: "#0D1016", color: "#fff", border: "none", cursor: "pointer" }}>
                        {t("finalizeDossier")}
                      </button>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* ── AI Analysis Panels (collapsable) ── */}
              <div style={{ marginTop: 16, borderRadius: 12, padding: 16, background: "#fff", border: "1px solid rgba(0,0,0,0.07)" }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(0,0,0,0.3)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 12 }}>
                  ✦ {t("aiAnalysisTitle")}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                  <button disabled={annexIVLoading} onClick={async () => {
                      setAnnexIVLoading(true); setAnnexIVReport(null);
                      const c = persisted.content;
                      const res = await checkAnnexIVGaps({
                        systemName: persisted.systemName || c["s1"] || "",
                        // Campi dell'Allegato IV: punto 1 (descrizione), 2 (sviluppo e dati), 3 (capacità, limiti, sorveglianza), 4 (metriche)
                        provider: "", purpose: c["s1"] || "",
                        capabilities: c["s2"] || "", limitations: c["s3"] || "",
                        humanOversight: c["s3"] || "", performanceMetrics: c["s4"] || "",
                        trainingData: c["s2"] || "",
                      });
                      setAnnexIVLoading(false);
                      if (res.result) setAnnexIVReport(res.result);
                    }}
                    style={{ fontSize: 11, color: "#0D1016", background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 5, padding: "5px 12px", cursor: "pointer" }}>
                    {annexIVLoading ? t("analyzingShort") : t("verifyAnnexCoverage")}
                  </button>
                  <button disabled={coherenceLoading} onClick={async () => {
                      setCoherenceLoading(true); setCoherenceReport(null);
                      const ctx = buildComplianceContextFromStorage();
                      const c = persisted.content;
                      const res = await validateDocuGenCoherence({
                        systemName: persisted.systemName, purpose: c["s1"] || "",
                        capabilities: c["s2"] || "", limitations: c["s3"] || "",
                        humanOversight: c["s3"] || "",
                      }, ctx);
                      setCoherenceLoading(false);
                      if (res.report) setCoherenceReport(res.report);
                    }}
                    style={{ fontSize: 11, color: "#0D1016", background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 5, padding: "5px 12px", cursor: "pointer" }}>
                    {coherenceLoading ? t("analyzingShort") : t("verifyCoherence")}
                  </button>
                </div>

                {/* Annex IV Report */}
                {annexIVReport && (
                  <div style={{ marginBottom: 12, padding: 12, borderRadius: 8,
                    background: annexIVReport.coverageScore >= 80 ? "rgba(22,163,74,0.04)" : "rgba(245,158,11,0.05)",
                    border: `1px solid ${annexIVReport.coverageScore >= 80 ? "rgba(22,163,74,0.2)" : "rgba(245,158,11,0.2)"}` }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.5)", background: "rgba(0,0,0,0.06)", borderRadius: 4, padding: "2px 6px" }}>✦ {t("aiVerify")}</span>
                    <p style={{ fontSize: 12, fontWeight: 700, margin: "6px 0 2px", color: "#0D1016" }}>
                      {t("annexCoverage")} <span style={{ color: annexIVReport.coverageScore >= 80 ? "#15803d" : "#d97706" }}>{annexIVReport.coverageScore}%</span>
                    </p>
                    <p style={{ fontSize: 11, color: "rgba(0,0,0,0.42)", marginBottom: 8 }}>{annexIVReport.summary}</p>
                    {annexIVReport.missingSections.map((ms, i) => (
                      <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4, padding: "4px 8px", borderRadius: 5,
                        background: ms.priority === "obbligatorio" ? "rgba(220,38,38,0.04)" : "rgba(245,158,11,0.04)",
                        border: `1px solid ${ms.priority === "obbligatorio" ? "rgba(220,38,38,0.15)" : "rgba(245,158,11,0.15)"}` }}>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
                          background: ms.priority === "obbligatorio" ? "#dc2626" : "#d97706",
                          color: "#fff", whiteSpace: "nowrap", alignSelf: "flex-start" }}>
                          {ms.priority === "obbligatorio" ? t("badgeReq") : t("badgeRec")}
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
                    <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.5)", background: "rgba(0,0,0,0.06)", borderRadius: 4, padding: "2px 6px" }}>✦ {t("aiVerify")}</span>
                    <p style={{ fontSize: 12, fontWeight: 700, margin: "6px 0 2px", color: "#0D1016" }}>
                      {t("interToolCoherence")} <span style={{ color: coherenceReport.coherenceScore >= 80 ? "#15803d" : "#dc2626" }}>{coherenceReport.coherenceScore}%</span> — {coherenceReport.overallStatus.replace(/_/g, " ")}
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
                  <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(0,0,0,0.5)", marginBottom: 6 }}>{t("modifiedSystem")}</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input value={changeDesc} onChange={e => setChangeDesc(e.target.value)}
                      placeholder={t("changeDescPh")}
                      style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.12)", fontSize: 12 }} />
                    <button disabled={changeImpactLoading || !changeDesc.trim()} onClick={async () => {
                        setChangeImpactLoading(true); setChangeImpactReport(null);
                        const ctx = buildComplianceContextFromStorage();
                        const res = await assessChangeImpact(changeDesc, ctx.riskTier ?? null, ctx.annexIII ?? null);
                        setChangeImpactLoading(false);
                        if (res.report) setChangeImpactReport(res.report);
                      }}
                      style={{ fontSize: 11, color: "#059669", background: "rgba(5,150,105,0.06)", border: "1px solid rgba(5,150,105,0.2)", borderRadius: 5, padding: "5px 12px", cursor: "pointer", whiteSpace: "nowrap" }}>
                      {changeImpactLoading ? t("analyzingShort") : t("analyzeImpact")}
                    </button>
                  </div>
                  {changeImpactReport && (
                    <div style={{ marginTop: 8, padding: 10, borderRadius: 8,
                      background: changeImpactReport.isSubstantialModification ? "rgba(220,38,38,0.04)" : "rgba(22,163,74,0.04)",
                      border: `1px solid ${changeImpactReport.isSubstantialModification ? "rgba(220,38,38,0.2)" : "rgba(22,163,74,0.2)"}` }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.5)", background: "rgba(0,0,0,0.06)", borderRadius: 4, padding: "2px 6px" }}>✦ {t("aiVerify")}</span>
                      <p style={{ fontSize: 12, fontWeight: 700, margin: "6px 0 2px", color: changeImpactReport.isSubstantialModification ? "#dc2626" : "#15803d" }}>
                        {changeImpactReport.isSubstantialModification ? t("substModDetected") : t("nonSubstMod")}
                        {changeImpactReport.requiresNewConformityAssessment && ` — ${t("requiresNewCa")}`}
                      </p>
                      <p style={{ fontSize: 10, color: "rgba(0,0,0,0.42)", fontStyle: "italic", marginBottom: 6 }}>{changeImpactReport.substModificationBasis}</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {changeImpactReport.affectedAnnexIVSections.filter(s => s.updateRequired === "obbligatorio").map((s, i) => (
                          <span key={i} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 99, background: "rgba(220,38,38,0.1)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.2)" }}>{t("update")} {s.sectionLabel}</span>
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
                    {t("finalizeBlocked")}{" "}
                    <strong>{emptyRequired.map((s) => s.ref).join(", ")}</strong>{" "}
                    {t("beforeFinalized")}
                  </p>
                </div>
              )}
            </div>
          </div>

          <button onClick={() => setTimelineStep("export")}
            style={{ marginTop: 20, padding: "10px 20px", borderRadius: 8, background: "#0D1016",
              color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
            {t("readyForExport")}
          </button>
        </div>
      )}

      {/* ── Step 4: Audit-Ready Export ── */}
      {timelineStep === "export" && (
        <div>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: t("stat_completed"), value: `${doneCount}/9`, color: "#16a34a" },
              { label: t("stat_inWork"), value: draftCount, color: "#0D1016" },
              { label: t("stat_emptyRequired"), value: emptyRequired.length, color: emptyRequired.length > 0 ? "#dc2626" : "#16a34a" },
              { label: t("stat_savedVersions"), value: versionSnapshots.length || "—", color: "rgba(0,0,0,0.5)" },
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
              { label: t("exportMarkdown"), action: exportMarkdown },
              { label: t("exportJson"), action: exportFullDocument },
              { label: t("exportSignedPdf"), action: exportPdf },
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
              ✓ {t("finalizeVersion")}
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
                showToast(t("toast_versionRestored"));
              }}
              sectionLabels={Object.fromEntries(ANNEX_IV.map(s => [s.id, t(`ann_${s.id}_title`)]))}
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
                  <CheckCircle className="h-3 w-3" /> {t("saveChangesDoc")}
                </button>
              ) : (
                <button onClick={enterDocEdit}
                  style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, padding: "5px 12px",
                    borderRadius: 6, background: "rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.6)",
                    border: "1px solid rgba(0,0,0,0.10)", cursor: "pointer" }}>
                  <Pencil className="h-3 w-3" /> {t("editDocument")}
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
                  {systemName || t("aiSystemFallback")}
                </h1>
                <p data-noedit="true" style={{ fontSize: 12, color: "rgba(0,0,0,0.4)", marginBottom: 32, fontFamily: "inherit" }}>
                  {t("techFileSubtitle")} · {new Date().toLocaleDateString(loc)}
                </p>

                {ANNEX_IV.map((s) => (
                  <div key={s.id} style={{ marginBottom: 28, paddingBottom: 28, borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                    <div data-noedit="true" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontFamily: "inherit",
                        color: "rgba(0,0,0,0.38)", fontWeight: 600 }}>{s.ref}</span>
                      <span style={{ fontSize: 10, fontFamily: "inherit",
                        padding: "1px 6px", borderRadius: 4, background: "rgba(0,0,0,0.05)",
                        color: "rgba(0,0,0,0.45)" }}>{SOURCE_BADGES[s.id]}</span>
                    </div>
                    <h2 data-noedit="true" style={{ fontSize: 14, fontWeight: 600, color: "#0D1016", marginBottom: 8 }}>{t(`ann_${s.id}_title`)}</h2>
                    <p style={{ fontSize: 13, lineHeight: 1.8, color: "rgba(0,0,0,0.75)", whiteSpace: "pre-wrap", margin: 0 }}>
                      {stripMarkdown(getContent(s.id)) || <span style={{ color: "rgba(0,0,0,0.28)", fontStyle: "italic" }}>{t("toFill")}</span>}
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
