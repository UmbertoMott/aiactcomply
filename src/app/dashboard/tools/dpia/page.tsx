"use client";

import React, { useState, useEffect, useRef, useCallback, CSSProperties } from "react";
import SignOffPanel from "@/components/ui/SignOffPanel";
import { useT } from "@/i18n/LocaleProvider";
import { DPIATemplateViewer } from "@/components/dpia/DPIATemplateViewer";
import { computeDpiaProgress } from "@/lib/dpia/dpia-progress";
import { DpiaGuidedMode } from "@/components/dpia/DpiaGuidedMode";
import { draftDpiaSections } from "@/app/actions/draftDpiaSections";
import { buildComplianceContextFromStorage } from "@/hooks/useComplianceContext";
import { checkPriorConsultation, type PriorConsultationResult } from "@/app/actions/checkPriorConsultation";
import type { IntakeContext } from "@/app/actions/parseIntakeContext";
import {
  Search, Database, Scale, AlertTriangle, Shield, CheckCircle2,
  ChevronLeft, ChevronRight, Plus, Trash2, Download, FileText,
  AlertCircle, Info, Check, X,
} from "lucide-react";
import {
  writeToStorage, readFromStorage,
  DPIAResult, DPIAScreeningCriterion, DPIAAsset, DPIAThreat,
  DPIAProportionalityCheck, DPIARightsCheck,
  ClassifierResult, DataAuditResult,
} from "@/lib/dossier/storage-schema";
import { appendEvidence } from "@/lib/evidence/evidence-layer";
import { SystemSelector } from "@/components/compliance/SystemSelector";
import { migrateLegacyFRIA, patchDPIA, patchShared, syncCorrelatedRisksFromDPIA } from "@/lib/assessment/assessment-helpers";
import { CorrelatedRisksPanel } from "@/components/assessment/CorrelatedRisksPanel";
import { AssessmentSharedHeader } from "@/components/assessment/AssessmentSharedHeader";
import { AssessmentStepper } from "@/components/assessment/AssessmentStepper";
import { UnifiedIntake } from "@/components/assessment/UnifiedIntake";
import { ScreeningCatalog } from "@/components/dpia/ScreeningCatalog";
import { ThreatCatalog } from "@/components/dpia/ThreatCatalog";
import { NextStepGuide } from "@/components/dpia/NextStepGuide";
import { ThreatImpactAIDraft } from "@/components/dpia/ThreatImpactAIDraft";
import { ProportionalityBalance } from "@/components/dpia/ProportionalityBalance";
import { DpiaGapCheck } from "@/components/dpia/DpiaGapCheck";
import type { DpiaGapCheck as DpiaGapCheckType } from "@/app/actions/checkDpiaGaps";

// ─── Design tokens ────────────────────────────────────────────────────────────

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

const cardSt: CSSProperties = {
  background: T.card,
  border: `1px solid ${T.border}`,
  borderRadius: 12,
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};

const inputSt: CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  borderRadius: 8,
  border: `1px solid ${T.border}`,
  fontSize: 12,
  color: T.text,
  background: T.card,
  outline: "none",
};

const taSt: CSSProperties = { ...inputSt, resize: "vertical" };

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 0 | 1 | 2 | 3 | 4 | 5;
type DPIADoc = DPIAResult;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function computeRiskLevel(
  likelihood: "low" | "medium" | "high",
  severity:   "low" | "medium" | "high",
): "low" | "medium" | "high" {
  if (likelihood === "high"   && severity === "high")   return "high";
  if (likelihood === "high"   && severity === "medium") return "high";
  if (likelihood === "medium" && severity === "high")   return "high";
  if (likelihood === "medium" && severity === "medium") return "medium";
  if (likelihood === "high"   && severity === "low")    return "medium";
  if (likelihood === "low"    && severity === "high")   return "medium";
  if (likelihood === "medium" && severity === "low")    return "low";
  if (likelihood === "low"    && severity === "medium") return "low";
  return "low";
}

function computeDPIARequired(criteria: DPIAScreeningCriterion[]): "yes" | "no" | "uncertain" {
  const count = criteria.filter(c => c.applies === "yes" || c.applies === "partial").length;
  if (count >= 2) return "yes";
  if (count === 1) return "uncertain";
  return "no";
}

function computeWorstRisk(threats: DPIAThreat[]): "high" | "medium" | "low" | "" {
  if (threats.length === 0) return "";
  if (threats.some(t => t.risk_level === "high")) return "high";
  if (threats.some(t => t.risk_level === "medium")) return "medium";
  return "low";
}

function computeWorstResidualRisk(threats: DPIAThreat[]): "high" | "medium" | "low" | "" {
  if (threats.length === 0) return "";
  if (threats.some(t => t.residual_risk === "high")) return "high";
  if (threats.some(t => t.residual_risk === "medium")) return "medium";
  return "low";
}

function riskBadge(level: "high" | "medium" | "low" | "", tr: (k: string) => string) {
  if (!level) return null;
  const cfg = {
    high:   { label: tr("riskHigh"),   bg: T.redBg,   color: T.red,   border: T.redBdr   },
    medium: { label: tr("riskMedium"), bg: T.amberBg, color: T.amber, border: T.amberBdr },
    low:    { label: tr("riskLow"),    bg: T.greenBg, color: T.green, border: T.greenBdr },
  }[level];
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
    }}>{cfg.label}</span>
  );
}

// ─── Default data ─────────────────────────────────────────────────────────────

const DEFAULT_CRITERIA: DPIAScreeningCriterion[] = [
  { id: "c1", applies: "", notes: "",
    label: "Valutazione sistematica di aspetti personali (profilazione)",
    description: "Trattamento che comprende una profilazione e sulla base della quale vengono prese decisioni con effetti giuridici o significativi sulle persone fisiche." },
  { id: "c2", applies: "", notes: "",
    label: "Trattamento su larga scala di categorie particolari (Art. 9/10)",
    description: "Trattamento su larga scala di dati sensibili (origine razziale/etnica, salute, dati genetici/biometrici, ecc.) o relativi a condanne penali." },
  { id: "c3", applies: "", notes: "",
    label: "Sorveglianza sistematica di aree pubbliche",
    description: "Sorveglianza sistematica su larga scala di un'area accessibile al pubblico (es. videosorveglianza, tracking Wi-Fi/Bluetooth)." },
  { id: "c4", applies: "", notes: "",
    label: "Decisioni automatizzate con effetti legali o significativi",
    description: "Processo decisionale automatizzato (inclusa la profilazione) che produce effetti giuridici o significativi sull'individuo (Art. 22 GDPR)." },
  { id: "c5", applies: "", notes: "",
    label: "Soggetti o dati vulnerabili",
    description: "Trattamento di dati di minori, dipendenti, pazienti, richiedenti asilo o altre categorie vulnerabili che non possono facilmente opporsi." },
  { id: "c6", applies: "", notes: "",
    label: "Applicazione innovativa o nuove tecnologie",
    description: "Uso di tecnologie nuove o innovative (IA, IoT, riconoscimento facciale, ecc.) che creano nuove forme di raccolta o utilizzo dei dati." },
  { id: "c7", applies: "", notes: "",
    label: "Trattamento che impedisce accesso a servizi o diritti",
    description: "Il trattamento può impedire all'interessato di esercitare un diritto o beneficiare di un servizio o contratto (es. credit scoring, blacklist)." },
  { id: "c8", applies: "", notes: "",
    label: "Confronto o combinazione di dataset",
    description: "Abbinamento o combinazione di dataset (es. da più titolari, da fonti diverse) oltre le ragionevoli aspettative degli interessati." },
  { id: "c9", applies: "", notes: "",
    label: "Trattamento di dati su larga scala",
    description: "Trattamento di dati personali a larga scala (molti soggetti, grandi volumi, vasta area geografica, lungo periodo di conservazione)." },
];

const DEFAULT_PROP_CHECKS: DPIAProportionalityCheck[] = [
  { id: "p1", status: "", notes: "",
    principle: "Liceità, correttezza e trasparenza",
    description: "Il trattamento ha una base giuridica valida (Art. 6), è corretto nei confronti degli interessati ed è trasparente (Art. 5(1)(a))." },
  { id: "p2", status: "", notes: "",
    principle: "Limitazione della finalità",
    description: "I dati sono raccolti per finalità determinate, esplicite e legittime, non trattati in modo incompatibile (Art. 5(1)(b))." },
  { id: "p3", status: "", notes: "",
    principle: "Minimizzazione dei dati",
    description: "I dati trattati sono adeguati, pertinenti e limitati al necessario rispetto alle finalità (Art. 5(1)(c))." },
  { id: "p4", status: "", notes: "",
    principle: "Esattezza",
    description: "I dati sono esatti e, se necessario, aggiornati; adottate misure ragionevoli per cancellare o rettificare dati inesatti (Art. 5(1)(d))." },
  { id: "p5", status: "", notes: "",
    principle: "Limitazione della conservazione",
    description: "I dati sono conservati in una forma che consenta l'identificazione degli interessati per il tempo necessario (Art. 5(1)(e))." },
  { id: "p6", status: "", notes: "",
    principle: "Integrità e riservatezza",
    description: "Trattamento garantisce sicurezza adeguata dei dati, protezione da trattamenti non autorizzati o illeciti e da perdita o distruzione (Art. 5(1)(f))." },
  { id: "p7", status: "", notes: "",
    principle: "Responsabilizzazione (Accountability)",
    description: "Il titolare è responsabile e in grado di dimostrare la conformità a tutti i principi (Art. 5(2))." },
];

const DEFAULT_RIGHTS_CHECKS: DPIARightsCheck[] = [
  { id: "r1", applicable: "", how_ensured: "",
    right: "Informazione e accesso", article: "Artt. 13-15 GDPR" },
  { id: "r2", applicable: "", how_ensured: "",
    right: "Rettifica", article: "Art. 16 GDPR" },
  { id: "r3", applicable: "", how_ensured: "",
    right: "Cancellazione (diritto all'oblio)", article: "Art. 17 GDPR" },
  { id: "r4", applicable: "", how_ensured: "",
    right: "Limitazione del trattamento", article: "Art. 18 GDPR" },
  { id: "r5", applicable: "", how_ensured: "",
    right: "Portabilità dei dati", article: "Art. 20 GDPR" },
  { id: "r6", applicable: "", how_ensured: "",
    right: "Opposizione al trattamento", article: "Art. 21 GDPR" },
  { id: "r7", applicable: "", how_ensured: "",
    right: "Decisioni automatizzate e profilazione", article: "Art. 22 GDPR" },
  { id: "r8", applicable: "", how_ensured: "",
    right: "Comunicazione in caso di violazione", article: "Art. 34 GDPR" },
];

function createEmptyDPIA(): DPIADoc {
  return {
    screening: {
      criteria: DEFAULT_CRITERIA.map(c => ({ ...c })),
      criteria_met_count: 0,
      dpia_required: "uncertain",
      justification_if_no_dpia: "",
    },
    description: {
      system_name: "", organization_name: "", controller_name: "",
      dpo_name: "", dpo_consulted: "", dpo_opinion: "",
      processor_involved: "", processor_name: "",
      processing_purposes: "", legitimate_interest: "",
      personal_data_categories: "", special_categories: "",
      data_subjects_categories: "", recipients: "", retention_period: "",
      assets: [],
      codes_of_conduct: "", certifications: "",
      data_subjects_opinions: "", data_subjects_opinions_justification: "",
      data_subjects_opinions_details: "",
    },
    proportionality: {
      necessity_justification: "",
      proportionality_checks: DEFAULT_PROP_CHECKS.map(c => ({ ...c })),
      rights_checks: DEFAULT_RIGHTS_CHECKS.map(c => ({ ...c })),
      processor_clauses_art28: "",
      international_transfers: "",
      international_transfers_safeguards: "",
    },
    risks: {
      threats: [],
      overall_risk_before: "",
    },
    measures: {
      technical_measures: "", organizational_measures: "",
      overall_risk_after: "",
      prior_consultation_required: false,
      prior_consultation_authority: "", prior_consultation_date: "",
      review_schedule: "", review_trigger: "",
    },
    conclusion: {
      compliant: "", conditions: "", summary: "",
      next_review_date: "", completedAt: "",
    },
  };
}

// ─── Step config ──────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Screening",    sub: "WP248",          Icon: Search        },
  { label: "Descrizione",  sub: "Sistematica",    Icon: Database      },
  { label: "Necessità",    sub: "Proporzionalità",Icon: Scale         },
  { label: "Rischi",       sub: "WP248 §3",       Icon: AlertTriangle },
  { label: "Misure",       sub: "Residuo",        Icon: Shield        },
  { label: "Conclusione",  sub: "Rapporto",       Icon: CheckCircle2  },
] as const;

// ─── Small helpers ────────────────────────────────────────────────────────────

function Lbl({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: T.muted, marginBottom: 4 }}>
      {children}{required && <span style={{ color: T.red }}> *</span>}
    </label>
  );
}

function Sel<T extends string>({
  value, onChange, options, style,
}: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; style?: CSSProperties }) {
  const tr = useT("toolDpia");
  return (
    <select value={value} onChange={e => onChange(e.target.value as T)}
      style={{ ...inputSt, ...style }}>
      <option value="">{tr("selectPlaceholder")}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function statusBadge(status: string) {
  const cfg: Record<string, { label: string; bg: string; color: string; border: string }> = {
    compliant:     { label: "Conforme",      bg: T.greenBg,  color: T.green,  border: T.greenBdr  },
    partial:       { label: "Parziale",      bg: T.amberBg,  color: T.amber,  border: T.amberBdr  },
    non_compliant: { label: "Non conforme",  bg: T.redBg,    color: T.red,    border: T.redBdr    },
    na:            { label: "N/A",           bg: "rgba(0,0,0,0.04)", color: T.muted, border: T.border },
  };
  const c = cfg[status];
  if (!c) return null;
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4,
      background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      {c.label}
    </span>
  );
}

// ─── Staleness hash (djb2) ────────────────────────────────────────────────────

function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return h >>> 0;
}

function computeDpiaHash(doc: DPIADoc): string {
  const d = doc.description;
  const key = [
    d.system_name, d.processing_purposes, d.personal_data_categories,
    d.special_categories, d.data_subjects_categories, d.retention_period,
    doc.screening.dpia_required,
  ].join("|");
  return String(djb2(key));
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DPIAPage() {
  const tr = useT("toolDpia");
  const [doc, setDoc] = useState<DPIADoc>(createEmptyDPIA);
  const [step, setStep] = useState<Step>(0);
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Intake context
  const [intake, setIntake] = useState<IntakeContext>({
    systemName: "", systemScope: "other", processingPurpose: "",
    dataCategories: [], subjectScale: "large_scale_unknown",
    automatedDecisions: "no", highRiskAIAct: "unknown",
    crossBorderTransfer: false, vulnerableSubjects: false, dpiaJustification: "",
  });
  // Part 3 — AI pre-fill
  const [aiPrefillLoading, setAiPrefillLoading] = useState(false);
  const [aiPrefillDone, setAiPrefillDone]       = useState(false);
  const [aiPrefillError, setAiPrefillError]     = useState<string | null>(null);
  // AG Part 6 — Prior consultation Art. 36
  const [priorConsultAILoading, setPriorConsultAILoading] = useState(false);
  const [priorConsultAIResult, setPriorConsultAIResult] = useState<PriorConsultationResult | null>(null);
  const [priorConsultAIError, setPriorConsultAIError] = useState<string | null>(null);
  // Catalog toggles
  const [showScreeningCatalog, setShowScreeningCatalog] = useState(false);
  const [showThreatCatalog, setShowThreatCatalog] = useState(false);
  // Fase 3: gap check
  const [gapCheckResult, setGapCheckResult] = useState<DpiaGapCheckType | null>(null);
  // Fase 5: staleness
  const [stalenessDismissed, setStalenessDismissed] = useState(false);
  const [savedHash, setSavedHash] = useState<string | null>(null);
  // Template viewer panel
  const [showTemplateViewer, setShowTemplateViewer] = useState(false);
  // Modalità guidata vs form a 6 step
  const [guidedMode, setGuidedMode] = useState(false);
  // Rail: sezioni espanse
  const [railExpanded, setRailExpanded] = useState<Set<number>>(new Set([0, 1, 2, 3, 4, 5]));

  // Load from storage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const legacyRaw = localStorage.getItem("aicomply_dpia_result");
      if (legacyRaw) {
        try {
          const legacyParsed = JSON.parse(legacyRaw) as Partial<DPIADoc>;
          const merged: DPIADoc = {
            ...createEmptyDPIA(),
            ...legacyParsed,
            screening: { ...createEmptyDPIA().screening, ...legacyParsed.screening },
            description: { ...createEmptyDPIA().description, ...legacyParsed.description },
            proportionality: { ...createEmptyDPIA().proportionality, ...legacyParsed.proportionality },
            risks: { ...createEmptyDPIA().risks, ...legacyParsed.risks },
            measures: { ...createEmptyDPIA().measures, ...legacyParsed.measures },
            conclusion: { ...createEmptyDPIA().conclusion, ...legacyParsed.conclusion },
          };
          writeToStorage("dpia", merged);
          localStorage.removeItem("aicomply_dpia_result");
        } catch { /* ignore */ }
      }
    }
    const stored = readFromStorage<DPIADoc>("dpia");
    if (stored) {
      setDoc(d => ({
        ...createEmptyDPIA(),
        ...stored,
        screening: { ...createEmptyDPIA().screening, ...stored.screening },
        description: { ...createEmptyDPIA().description, ...stored.description },
        proportionality: { ...createEmptyDPIA().proportionality, ...stored.proportionality },
        risks: { ...createEmptyDPIA().risks, ...stored.risks },
        measures: { ...createEmptyDPIA().measures, ...stored.measures },
        conclusion: { ...createEmptyDPIA().conclusion, ...stored.conclusion },
      }));
      setSaved(true);
    }
    // Load saved staleness hash
    const storedHash = readFromStorage<string>("dpiaStaleness");
    if (storedHash) setSavedHash(storedHash);
  }, []);

  // Debounced autosave
  const autosave = useCallback((nextDoc: DPIADoc) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      writeToStorage("dpia", nextDoc);
      setSaved(true);
    }, 500);
  }, []);

  // Cleanup timer on component unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  function upDoc(updater: (d: DPIADoc) => DPIADoc) {
    setDoc(prev => {
      const next = updater(prev);
      autosave(next);
      return next;
    });
  }

  // ── Screening helpers ──────────────────────────────────────────────────────

  function upCriterion(id: string, patch: Partial<DPIAScreeningCriterion>) {
    upDoc(d => {
      const criteria = d.screening.criteria.map(c => c.id === id ? { ...c, ...patch } : c);
      const criteria_met_count = criteria.filter(c => c.applies === "yes" || c.applies === "partial").length;
      const dpia_required = computeDPIARequired(criteria);
      return { ...d, screening: { ...d.screening, criteria, criteria_met_count, dpia_required } };
    });
  }

  // ── Description helpers ────────────────────────────────────────────────────

  function upDesc(patch: Partial<DPIADoc["description"]>) {
    upDoc(d => ({ ...d, description: { ...d.description, ...patch } }));
  }

  // Auto-sync intake from storage on mount
  useEffect(() => {
    migrateLegacyFRIA();
    const classifier = readFromStorage<ClassifierResult>("classifier");
    const dataAudit = readFromStorage<DataAuditResult>("dataAudit");
    setIntake(prev => {
      const next = { ...prev };
      if (classifier?.systemName) { next.systemName = classifier.systemName; }
      if (classifier?.riskLevel === "high") { next.highRiskAIAct = "yes"; }
      if (dataAudit?.datasets?.some((d: DataAuditResult["datasets"][number]) => d.personalData)) {
        if (!next.dataCategories.includes("comuni")) next.dataCategories = [...next.dataCategories, "comuni"];
      }
      if (dataAudit?.datasets?.some((d: DataAuditResult["datasets"][number]) => {
        const sf = (d as Record<string, unknown>).sensitiveFeatures;
        return Array.isArray(sf) && sf.some((f: unknown) =>
          typeof f === "string" && ["salute","biometrici","genetici"].some(k => f.toLowerCase().includes(k))
        );
      })) {
        if (!next.dataCategories.includes("art9_salute")) next.dataCategories = [...next.dataCategories, "art9_salute"];
      }
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pre-populate from Classifier, DataAudit on mount
  useEffect(() => {
    const classifier = readFromStorage<ClassifierResult>("classifier");
    const dataAudit = readFromStorage<DataAuditResult>("dataAudit");

    setDoc(prev => {
      let next = prev;

      // Pre-populate system_name from classifier
      if (classifier?.systemName && !next.description.system_name) {
        next = { ...next, description: { ...next.description, system_name: classifier.systemName } };
      }

      // Pre-populate screening criteria from classifier + dataAudit
      let criteria = next.screening.criteria;
      let changed = false;

      if (classifier?.riskLevel === "high") {
        // c6: Applicazione innovativa o nuove tecnologie
        criteria = criteria.map(c =>
          c.id === "c6" && !c.applies ? { ...c, applies: "yes" as const } : c
        );
        // c4: Decisioni automatizzate con effetti legali o significativi
        criteria = criteria.map(c =>
          c.id === "c4" && !c.applies ? { ...c, applies: "yes" as const } : c
        );
        changed = true;
      }

      // c2: if any dataset has personalData === true
      if (dataAudit?.datasets?.some((d: DataAuditResult["datasets"][number]) => d.personalData === true)) {
        criteria = criteria.map(c =>
          c.id === "c2" && !c.applies ? { ...c, applies: "yes" as const } : c
        );
        changed = true;
      }

      if (changed) {
        const criteria_met_count = criteria.filter(c => c.applies === "yes" || c.applies === "partial").length;
        const dpia_required = computeDPIARequired(criteria);
        next = { ...next, screening: { ...next.screening, criteria, criteria_met_count, dpia_required } };
      }

      return next;
    });

    // Seed assessment.shared dal Classifier
    if (classifier) {
      patchShared({
        systemName: classifier.systemName,
        riskLevel:  classifier.riskLevel,
        annexIII:   classifier.annexIII,
        role:       classifier.role,
        isGPAI:     classifier.isGPAI,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addAsset() {
    const asset: DPIAAsset = {
      id: `a${Date.now()}`, name: "", type: "database",
      description: "", personal_data: true,
    };
    upDoc(d => ({ ...d, description: { ...d.description, assets: [...d.description.assets, asset] } }));
  }

  function upAsset(id: string, patch: Partial<DPIAAsset>) {
    upDoc(d => ({
      ...d, description: {
        ...d.description,
        assets: d.description.assets.map(a => a.id === id ? { ...a, ...patch } : a),
      },
    }));
  }

  function delAsset(id: string) {
    upDoc(d => ({ ...d, description: { ...d.description, assets: d.description.assets.filter(a => a.id !== id) } }));
  }

  // ── Proportionality helpers ────────────────────────────────────────────────

  function upProp(patch: Partial<DPIADoc["proportionality"]>) {
    upDoc(d => ({ ...d, proportionality: { ...d.proportionality, ...patch } }));
  }

  function upPropCheck(id: string, patch: Partial<DPIAProportionalityCheck>) {
    upDoc(d => ({
      ...d, proportionality: {
        ...d.proportionality,
        proportionality_checks: d.proportionality.proportionality_checks.map(
          c => c.id === id ? { ...c, ...patch } : c
        ),
      },
    }));
  }

  function upRightsCheck(id: string, patch: Partial<DPIARightsCheck>) {
    upDoc(d => ({
      ...d, proportionality: {
        ...d.proportionality,
        rights_checks: d.proportionality.rights_checks.map(
          c => c.id === id ? { ...c, ...patch } : c
        ),
      },
    }));
  }

  // ── Risks helpers ──────────────────────────────────────────────────────────

  function addThreat(category: DPIAThreat["category"]) {
    const t: DPIAThreat = {
      id: `t${Date.now()}`, category,
      source: "",
      description: "", likelihood: "medium", severity: "medium",
      risk_level: "medium", mitigation: "",
      residual_likelihood: "low", residual_severity: "low",
      residual_risk: "low",
    };
    upDoc(d => {
      const threats = [...d.risks.threats, t];
      return { ...d, risks: { threats, overall_risk_before: computeWorstRisk(threats) } };
    });
  }

  function upThreat(id: string, patch: Partial<DPIAThreat>) {
    upDoc(d => {
      const threats = d.risks.threats.map(t => {
        if (t.id !== id) return t;
        const merged = { ...t, ...patch };
        // Auto-recompute risk levels
        merged.risk_level = computeRiskLevel(merged.likelihood, merged.severity);
        merged.residual_risk = computeRiskLevel(merged.residual_likelihood, merged.residual_severity);
        return merged;
      });
      return { ...d, risks: { threats, overall_risk_before: computeWorstRisk(threats) } };
    });
  }

  function delThreat(id: string) {
    upDoc(d => {
      const threats = d.risks.threats.filter(t => t.id !== id);
      return { ...d, risks: { threats, overall_risk_before: computeWorstRisk(threats) } };
    });
  }

  function addThreatFromCatalog(threat: Omit<DPIAThreat, "id">) {
    const newThreat: DPIAThreat = { id: crypto.randomUUID(), ...threat };
    upDoc(d => {
      const threats = [...d.risks.threats, newThreat];
      return { ...d, risks: { threats, overall_risk_before: computeWorstRisk(threats) } };
    });
  }

  // ── Measures helpers ───────────────────────────────────────────────────────

  function upMeasures(patch: Partial<DPIADoc["measures"]>) {
    upDoc(d => {
      const next = { ...d.measures, ...patch };
      // Auto-compute residual risk from threats residual levels
      const worstResidual = computeWorstResidualRisk(d.risks.threats);
      next.overall_risk_after = worstResidual;
      next.prior_consultation_required = worstResidual === "high";
      return { ...d, measures: next };
    });
  }

  // ── Conclusion helpers ─────────────────────────────────────────────────────

  function upConclusion(patch: Partial<DPIADoc["conclusion"]>) {
    upDoc(d => ({ ...d, conclusion: { ...d.conclusion, ...patch } }));
  }

  // ── Save to dossier ────────────────────────────────────────────────────────

  function saveToDossier() {
    const now = new Date().toISOString();
    const withDate = { ...doc, conclusion: { ...doc.conclusion, completedAt: now } };
    setDoc(withDate);
    writeToStorage("dpia", withDate);
    patchDPIA(() => withDate);
    syncCorrelatedRisksFromDPIA();
    // Sync shared dall'identità DPIA
    patchShared({
      systemName:   withDate.description.system_name,
      organization: withDate.description.organization_name,
      purpose:      withDate.description.processing_purposes,
      personalDataCategories: withDate.description.personal_data_categories
        ? withDate.description.personal_data_categories.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [],
      specialCategories: withDate.description.special_categories
        ? withDate.description.special_categories.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [],
      dataSubjects: withDate.description.data_subjects_categories
        ? withDate.description.data_subjects_categories.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [],
    });
    appendEvidence("adr", {
      tool: "dpia",
      systemName: doc.description.system_name,
      dpiaRequired: doc.screening.dpia_required,
      overallRiskBefore: doc.risks.overall_risk_before,
      overallRiskAfter: doc.measures.overall_risk_after,
      conclusion: doc.conclusion.compliant,
    }, "dpia");
    // Fase 5: save staleness hash at sign-off
    const hash = computeDpiaHash(withDate);
    writeToStorage("dpiaStaleness", hash);
    setSavedHash(hash);
    setStalenessDismissed(false);
    setSaved(true);
  }

  // ── Download report ────────────────────────────────────────────────────────

  function downloadReport() {
    const lines: string[] = [];
    const d = doc;
    lines.push("VALUTAZIONE D'IMPATTO SULLA PROTEZIONE DEI DATI (DPIA)");
    lines.push("Metodologia: WP248 rev.01 — Gruppo di Lavoro Art. 29 (ottobre 2017)");
    lines.push("=".repeat(70));
    lines.push(`Sistema: ${d.description.system_name}`);
    lines.push(`Organizzazione: ${d.description.organization_name}`);
    lines.push(`Titolare: ${d.description.controller_name}`);
    lines.push(`Data: ${new Date().toLocaleDateString("it-IT")}`);
    lines.push("");
    lines.push("STEP 0 — SCREENING WP248");
    lines.push("-".repeat(40));
    lines.push(`DPIA Richiesta: ${d.screening.dpia_required.toUpperCase()}`);
    lines.push(`Criteri soddisfatti: ${d.screening.criteria_met_count}/9`);
    d.screening.criteria.forEach(c => {
      lines.push(`  [${c.applies || "?"}] ${c.label}`);
      if (c.notes) lines.push(`       Note: ${c.notes}`);
    });
    lines.push("");
    lines.push("STEP 1 — DESCRIZIONE SISTEMATICA");
    lines.push("-".repeat(40));
    lines.push(`Finalità: ${d.description.processing_purposes}`);
    lines.push(`Categorie dati: ${d.description.personal_data_categories}`);
    lines.push(`Cat. particolari: ${d.description.special_categories}`);
    lines.push(`Interessati: ${d.description.data_subjects_categories}`);
    lines.push(`Destinatari: ${d.description.recipients}`);
    lines.push(`Conservazione: ${d.description.retention_period}`);
    lines.push(`DPO: ${d.description.dpo_name} (consultato: ${d.description.dpo_consulted})`);
    if (d.description.dpo_opinion) lines.push(`Parere DPO: ${d.description.dpo_opinion}`);
    lines.push("");
    lines.push("STEP 2 — NECESSITÀ E PROPORZIONALITÀ");
    lines.push("-".repeat(40));
    lines.push(`Giustificazione necessità: ${d.proportionality.necessity_justification}`);
    lines.push("Verifica principi GDPR:");
    d.proportionality.proportionality_checks.forEach(c => {
      lines.push(`  [${c.status || "?"}] ${c.principle}: ${c.notes}`);
    });
    lines.push("Diritti degli interessati:");
    d.proportionality.rights_checks.forEach(r => {
      lines.push(`  [${r.applicable || "?"}] ${r.right} (${r.article}): ${r.how_ensured}`);
    });
    lines.push(`Trasferimenti internazionali: ${d.proportionality.international_transfers}`);
    if (d.proportionality.international_transfers_safeguards)
      lines.push(`Garanzie: ${d.proportionality.international_transfers_safeguards}`);
    lines.push("");
    lines.push("STEP 3 — RISCHI (WP248)");
    lines.push("-".repeat(40));
    lines.push(`Rischio complessivo PRIMA delle misure: ${d.risks.overall_risk_before.toUpperCase()}`);
    const catLabels: Record<DPIAThreat["category"], string> = {
      illegitimate_access: "Accesso illegittimo",
      unwanted_modification: "Modifica indesiderata",
      data_disappearance: "Scomparsa dei dati",
    };
    d.risks.threats.forEach(t => {
      lines.push(`\n  [${catLabels[t.category]}] ${t.description}`);
      lines.push(`    Probabilità: ${t.likelihood} | Gravità: ${t.severity} | Rischio: ${t.risk_level}`);
      lines.push(`    Misura: ${t.mitigation}`);
      lines.push(`    Rischio residuo: ${t.residual_risk}`);
    });
    lines.push("");
    lines.push("STEP 4 — MISURE DI SICUREZZA");
    lines.push("-".repeat(40));
    lines.push(`Misure tecniche:\n${d.measures.technical_measures}`);
    lines.push(`\nMisure organizzative:\n${d.measures.organizational_measures}`);
    lines.push(`\nRischio residuo complessivo: ${d.measures.overall_risk_after.toUpperCase()}`);
    if (d.measures.prior_consultation_required) {
      lines.push(`\n⚠️  CONSULTAZIONE PREVENTIVA (Art. 36) RICHIESTA`);
      lines.push(`Autorità: ${d.measures.prior_consultation_authority}`);
      lines.push(`Data prevista: ${d.measures.prior_consultation_date}`);
    }
    lines.push("");
    lines.push("STEP 5 — CONCLUSIONE");
    lines.push("-".repeat(40));
    lines.push(`Conforme: ${d.conclusion.compliant}`);
    if (d.conclusion.conditions) lines.push(`Condizioni: ${d.conclusion.conditions}`);
    lines.push(`\nSintesi:\n${d.conclusion.summary}`);
    lines.push(`\nProssima revisione: ${d.conclusion.next_review_date}`);
    lines.push(`\nCompletato il: ${d.conclusion.completedAt || "—"}`);

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DPIA_${d.description.system_name || "report"}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const worstResidual = computeWorstResidualRisk(doc.risks.threats);
  const priorConsultation = worstResidual === "high";

  // ── Render helpers ─────────────────────────────────────────────────────────

  const navBtnSt = (active: boolean): CSSProperties => ({
    padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500,
    cursor: "pointer", border: "1px solid",
    background: active ? T.text : T.card,
    color: active ? "#fff" : T.text,
    borderColor: active ? T.text : T.border,
    transition: "all 0.15s",
  });

  // ─── Step 0: Screening ─────────────────────────────────────────────────────

  function renderStep0() {
    const { criteria, dpia_required, justification_if_no_dpia } = doc.screening;
    const dpiaColor = dpia_required === "yes" ? T.red : dpia_required === "uncertain" ? T.amber : T.green;
    const dpiaBg = dpia_required === "yes" ? T.redBg : dpia_required === "uncertain" ? T.amberBg : T.greenBg;
    const dpiaBdr = dpia_required === "yes" ? T.redBdr : dpia_required === "uncertain" ? T.amberBdr : T.greenBdr;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Info box */}
        <div style={{ ...cardSt, padding: 14, background: "rgba(0,0,0,0.04)", border: `1px solid ${T.border}` }}>
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: T.text }} />
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 4 }}>
                {tr("screeningInfoTitle")}
              </p>
              <p style={{ fontSize: 11, color: T.text, lineHeight: 1.6 }}>
                {tr("screeningInfoBody")}
              </p>
            </div>
          </div>
        </div>

        {/* Result banner */}
        <div style={{ ...cardSt, padding: "12px 16px", background: dpiaBg, border: `1px solid ${dpiaBdr}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 500, color: T.muted }}>{tr("screeningResult")}</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: dpiaColor, marginTop: 2 }}>
              DPIA {dpia_required === "yes" ? tr("required") : dpia_required === "uncertain" ? tr("uncertain") : tr("notRequired")}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 24, fontWeight: 700, color: dpiaColor }}>
              {doc.screening.criteria_met_count}/9
            </p>
            <p style={{ fontSize: 11, color: T.muted }}>{tr("criteriaMet")}</p>
          </div>
        </div>

        {/* Catalog toggle */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={() => setShowScreeningCatalog(v => !v)}
            style={{
              padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 500,
              cursor: "pointer", border: `1px solid ${T.border}`,
              background: showScreeningCatalog ? T.text : T.card,
              color: showScreeningCatalog ? "#fff" : T.muted,
              transition: "all 0.15s",
            }}
          >
            {showScreeningCatalog ? tr("closeCatalog") : tr("screeningCatalog")}
          </button>
        </div>

        {/* Screening catalog */}
        {showScreeningCatalog && (
          <ScreeningCatalog
            criteria={doc.screening.criteria}
            onToggle={(id, applies) => upCriterion(id, { applies })}
          />
        )}

        {/* Criteria list */}
        {criteria.map((c, idx) => (
          <div key={c.id} style={{ ...cardSt, padding: 14 }}>
            <div className="flex items-start gap-3">
              <span style={{
                width: 22, height: 22, borderRadius: 11, flexShrink: 0,
                background: c.applies === "yes" ? T.redBg : c.applies === "partial" ? T.amberBg : "rgba(0,0,0,0.05)",
                border: `1px solid ${c.applies === "yes" ? T.redBdr : c.applies === "partial" ? T.amberBdr : T.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700,
                color: c.applies === "yes" ? T.red : c.applies === "partial" ? T.amber : T.faint,
              }}>
                {idx + 1}
              </span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 2 }}>{tr(`crit_${c.id}_label`)}</p>
                <p style={{ fontSize: 11, color: T.muted, lineHeight: 1.5, marginBottom: 10 }}>{tr(`crit_${c.id}_desc`)}</p>
                <div className="flex items-center gap-3">
                  <Sel
                    value={c.applies as "yes" | "no" | "partial" | ""}
                    onChange={v => upCriterion(c.id, { applies: v })}
                    options={[
                      { value: "yes", label: tr("applicableYes") },
                      { value: "partial", label: tr("applicablePartial") },
                      { value: "no", label: tr("applicableNo") },
                    ]}
                    style={{ width: 200 }}
                  />
                  <input
                    value={c.notes}
                    onChange={e => upCriterion(c.id, { notes: e.target.value })}
                    placeholder={tr("ph_optionalNotes")}
                    style={{ ...inputSt, flex: 1 }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Justification if no DPIA */}
        {dpia_required === "no" && (
          <div style={{ ...cardSt, padding: 14 }}>
            <Lbl>{tr("justifyNoDpia")}</Lbl>
            <textarea
              value={justification_if_no_dpia}
              onChange={e => upDoc(d => ({ ...d, screening: { ...d.screening, justification_if_no_dpia: e.target.value } }))}
              rows={3}
              placeholder={tr("ph_justifyNoDpia")}
              style={taSt}
            />
          </div>
        )}
      </div>
    );
  }

  // ─── Step 1: Description ───────────────────────────────────────────────────

  function renderStep1() {
    const d = doc.description;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Identity */}
        <div style={{ ...cardSt, padding: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 12 }}>{tr("identification")}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div><Lbl required>{tr("systemName")}</Lbl>
              <input value={d.system_name} onChange={e => upDesc({ system_name: e.target.value })} style={inputSt} placeholder={tr("ph_systemName")} /></div>
            <div><Lbl required>{tr("organization")}</Lbl>
              <input value={d.organization_name} onChange={e => upDesc({ organization_name: e.target.value })} style={inputSt} placeholder={tr("ph_legalName")} /></div>
            <div><Lbl required>{tr("controller")}</Lbl>
              <input value={d.controller_name} onChange={e => upDesc({ controller_name: e.target.value })} style={inputSt} placeholder={tr("ph_nameVat")} /></div>
          </div>
        </div>

        {/* DPO */}
        <div style={{ ...cardSt, padding: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 12 }}>{tr("dpoTitle")}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
            <div><Lbl>{tr("dpoName")}</Lbl>
              <input value={d.dpo_name} onChange={e => upDesc({ dpo_name: e.target.value })} style={inputSt} placeholder={tr("ph_dpoName")} /></div>
            <div><Lbl>{tr("dpoConsulted")}</Lbl>
              <Sel value={d.dpo_consulted as "yes"|"no"|""} onChange={v => upDesc({ dpo_consulted: v })}
                options={[{ value: "yes", label: tr("yes") }, { value: "no", label: tr("no") }]} /></div>
          </div>
          {d.dpo_consulted === "no" && (
            <div style={{ marginTop: 8, padding: "10px 14px", borderRadius: 8,
              background: T.amberBg, border: `1px solid ${T.amberBdr}` }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.amber, marginBottom: 3 }}>
                ⚠ {tr("dpoNotConsultedTitle")}
              </div>
              <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5 }}>
                {tr("dpoNotConsultedBody")}
              </div>
            </div>
          )}
          {d.dpo_consulted === "yes" && (
            <div><Lbl>{tr("dpoOpinion")}</Lbl>
              <textarea value={d.dpo_opinion} onChange={e => upDesc({ dpo_opinion: e.target.value })}
                rows={2} placeholder={tr("ph_dpoOpinion")} style={taSt} /></div>
          )}
        </div>

        {/* Processor */}
        <div style={{ ...cardSt, padding: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 12 }}>{tr("processorTitle")}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><Lbl>{tr("processorInvolved")}</Lbl>
              <Sel value={d.processor_involved as "yes"|"no"|""} onChange={v => upDesc({ processor_involved: v })}
                options={[{ value: "yes", label: tr("yes") }, { value: "no", label: tr("no") }]} /></div>
            {d.processor_involved === "yes" && (
              <div><Lbl>{tr("processorName")}</Lbl>
                <input value={d.processor_name} onChange={e => upDesc({ processor_name: e.target.value })} style={inputSt} placeholder={tr("ph_processorName")} /></div>
            )}
          </div>
        </div>

        {/* Data processing */}
        <div style={{ ...cardSt, padding: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 12 }}>{tr("processingDesc")}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div><Lbl required>{tr("purposes")}</Lbl>
              <textarea value={d.processing_purposes} onChange={e => upDesc({ processing_purposes: e.target.value })}
                rows={2} placeholder={tr("ph_purposes")} style={taSt} /></div>
            <div><Lbl>{tr("legitimateInterest")}</Lbl>
              <textarea value={d.legitimate_interest ?? ""} onChange={e => upDesc({ legitimate_interest: e.target.value })}
                rows={2} placeholder={tr("ph_legitimateInterest")} style={taSt} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><Lbl required>{tr("dataCategories")}</Lbl>
                <textarea value={d.personal_data_categories} onChange={e => upDesc({ personal_data_categories: e.target.value })}
                  rows={2} placeholder={tr("ph_dataCategories")} style={taSt} /></div>
              <div><Lbl>{tr("specialCategories")}</Lbl>
                <textarea value={d.special_categories} onChange={e => upDesc({ special_categories: e.target.value })}
                  rows={2} placeholder={tr("ph_specialCategories")} style={taSt} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div><Lbl required>{tr("subjectCategories")}</Lbl>
                <textarea value={d.data_subjects_categories} onChange={e => upDesc({ data_subjects_categories: e.target.value })}
                  rows={2} placeholder={tr("ph_subjectCategories")} style={taSt} /></div>
              <div><Lbl>{tr("recipients")}</Lbl>
                <textarea value={d.recipients} onChange={e => upDesc({ recipients: e.target.value })}
                  rows={2} placeholder={tr("ph_recipients")} style={taSt} /></div>
              <div><Lbl>{tr("retention")}</Lbl>
                <input value={d.retention_period} onChange={e => upDesc({ retention_period: e.target.value })}
                  style={inputSt} placeholder={tr("ph_retention")} /></div>
            </div>
          </div>
        </div>

        {/* Assets */}
        <div style={{ ...cardSt, padding: 16 }}>
          <div className="flex items-center justify-between mb-3">
            <p style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{tr("assetsTitle")}</p>
            <button onClick={addAsset} style={{ ...navBtnSt(false), display: "flex", alignItems: "center", gap: 4 }}>
              <Plus className="h-3 w-3" /> {tr("add")}
            </button>
          </div>
          {d.assets.length === 0 && (
            <p style={{ fontSize: 12, color: T.faint, textAlign: "center", padding: "12px 0" }}>
              {tr("noAssets")}
            </p>
          )}
          {d.assets.map(a => (
            <div key={a.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 2fr auto", gap: 8, marginBottom: 8, alignItems: "end" }}>
              <div><Lbl>{tr("assetName")}</Lbl>
                <input value={a.name} onChange={e => upAsset(a.id, { name: e.target.value })} style={inputSt} placeholder={tr("ph_assetName")} /></div>
              <div><Lbl>{tr("typeWord")}</Lbl>
                <Sel value={a.type} onChange={v => upAsset(a.id, { type: v as DPIAAsset["type"] })}
                  options={[
                    { value: "hardware",  label: tr("asset_hardware") },
                    { value: "software",  label: tr("asset_software") },
                    { value: "network",   label: tr("asset_network") },
                    { value: "database",  label: tr("asset_database") },
                    { value: "document",  label: tr("asset_document") },
                    { value: "person",    label: tr("asset_person") },
                    { value: "other",     label: tr("asset_other") },
                  ]} /></div>
              <div><Lbl>{tr("descriptionWord")}</Lbl>
                <input value={a.description} onChange={e => upAsset(a.id, { description: e.target.value })} style={inputSt} placeholder={tr("ph_assetRole")} /></div>
              <button onClick={() => delAsset(a.id)} style={{ padding: "7px 9px", borderRadius: 8, border: `1px solid ${T.redBdr}`, background: T.redBg, color: T.red, cursor: "pointer" }}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Codes & opinions */}
        <div style={{ ...cardSt, padding: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 12 }}>{tr("codesTitle")}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
            <div><Lbl>{tr("codesOfConduct")}</Lbl>
              <input value={d.codes_of_conduct} onChange={e => upDesc({ codes_of_conduct: e.target.value })} style={inputSt} placeholder={tr("ph_codesOfConduct")} /></div>
            <div><Lbl>{tr("certifications")}</Lbl>
              <input value={d.certifications} onChange={e => upDesc({ certifications: e.target.value })} style={inputSt} placeholder={tr("ph_certifications")} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><Lbl>{tr("opinionsCollected")}</Lbl>
              <Sel value={d.data_subjects_opinions as "collected"|"not_applicable"|"not_collected"|""} onChange={v => upDesc({ data_subjects_opinions: v as typeof d.data_subjects_opinions })}
                options={[
                  { value: "collected", label: tr("opinions_collected") },
                  { value: "not_collected", label: tr("opinions_notCollected") },
                  { value: "not_applicable", label: tr("opinions_na") },
                ]} /></div>
            <div><Lbl>{tr("opinionsJustification")}</Lbl>
              <input value={d.data_subjects_opinions_justification} onChange={e => upDesc({ data_subjects_opinions_justification: e.target.value })} style={inputSt} placeholder={tr("ph_reason")} /></div>
          </div>
          {d.data_subjects_opinions === "collected" && (
            <div style={{ marginTop: 10 }}><Lbl>{tr("opinionsDetails")}</Lbl>
              <textarea value={d.data_subjects_opinions_details} onChange={e => upDesc({ data_subjects_opinions_details: e.target.value })}
                rows={2} placeholder={tr("ph_opinionsDetails")} style={taSt} /></div>
          )}
        </div>
      </div>
    );
  }

  // ─── Step 2: Proportionality ───────────────────────────────────────────────

  function renderStep2() {
    const p = doc.proportionality;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <ProportionalityBalance dpia={doc} />
        {/* Necessity */}
        <div style={{ ...cardSt, padding: 16 }}>
          <Lbl required>{tr("necessityJustification")}</Lbl>
          <textarea value={p.necessity_justification} onChange={e => upProp({ necessity_justification: e.target.value })}
            rows={4} placeholder={tr("ph_necessity")} style={taSt} />
        </div>

        {/* Proportionality checks table */}
        <div style={{ ...cardSt, padding: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 12 }}>{tr("gdprPrinciples")}</p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  {[tr("colPrinciple"), tr("colStatus"), tr("colNotes")].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600, color: T.muted, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {p.proportionality_checks.map(c => (
                  <tr key={c.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: "8px 8px", verticalAlign: "top" }}>
                      <p style={{ fontWeight: 500, color: T.text, marginBottom: 2 }}>{tr(`prop_${c.id}_principle`)}</p>
                      <p style={{ fontSize: 11, color: T.muted }}>{tr(`prop_${c.id}_desc`)}</p>
                    </td>
                    <td style={{ padding: "8px 8px", verticalAlign: "top", width: 160 }}>
                      <Sel value={c.status as "compliant"|"partial"|"non_compliant"|"na"|""} onChange={v => upPropCheck(c.id, { status: v as typeof c.status })}
                        options={[
                          { value: "compliant", label: tr("st_compliant") },
                          { value: "partial", label: tr("st_partial") },
                          { value: "non_compliant", label: tr("st_nonCompliant") },
                          { value: "na", label: "N/A" },
                        ]} />
                    </td>
                    <td style={{ padding: "8px 8px", verticalAlign: "top" }}>
                      <input value={c.notes} onChange={e => upPropCheck(c.id, { notes: e.target.value })}
                        placeholder={tr("ph_observations")} style={inputSt} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rights checks */}
        <div style={{ ...cardSt, padding: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 12 }}>{tr("rightsCheckTitle")}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {p.rights_checks.map(r => (
              <div key={r.id} style={{ display: "grid", gridTemplateColumns: "2fr 120px 2fr", gap: 8, alignItems: "end", padding: "8px 0", borderBottom: `1px solid ${T.border}` }}>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 500, color: T.text }}>{tr(`right_${r.id}`)}</p>
                  <p style={{ fontSize: 11, color: T.muted }}>{r.article}</p>
                </div>
                <Sel value={r.applicable as "yes"|"no"|"partial"|""} onChange={v => upRightsCheck(r.id, { applicable: v as typeof r.applicable })}
                  options={[
                    { value: "yes", label: tr("rc_applicable") },
                    { value: "partial", label: tr("st_partial") },
                    { value: "no", label: "N/A" },
                  ]} />
                <input value={r.how_ensured} onChange={e => upRightsCheck(r.id, { how_ensured: e.target.value })}
                  placeholder={tr("ph_howEnsured")} style={inputSt} />
              </div>
            ))}
          </div>
        </div>

        {/* Transfers */}
        <div style={{ ...cardSt, padding: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 12 }}>{tr("transfersTitle")}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><Lbl>{tr("art28Clauses")}</Lbl>
              <Sel value={p.processor_clauses_art28 as "yes"|"no"|"na"|""} onChange={v => upProp({ processor_clauses_art28: v as typeof p.processor_clauses_art28 })}
                options={[{ value: "yes", label: tr("yes") }, { value: "no", label: tr("no") }, { value: "na", label: "N/A" }]} /></div>
            <div><Lbl>{tr("transfersOutsideEea")}</Lbl>
              <Sel value={p.international_transfers as "yes"|"no"|""} onChange={v => upProp({ international_transfers: v as typeof p.international_transfers })}
                options={[{ value: "yes", label: tr("yes") }, { value: "no", label: tr("no") }]} /></div>
          </div>
          {p.international_transfers === "yes" && (
            <div style={{ marginTop: 10 }}><Lbl>{tr("transferSafeguards")}</Lbl>
              <textarea value={p.international_transfers_safeguards} onChange={e => upProp({ international_transfers_safeguards: e.target.value })}
                rows={2} placeholder={tr("ph_safeguards")} style={taSt} /></div>
          )}
        </div>
      </div>
    );
  }

  // ─── Step 3: Risks ─────────────────────────────────────────────────────────

  function renderStep3() {
    const { threats, overall_risk_before } = doc.risks;

    const categories: { id: DPIAThreat["category"]; label: string; description: string }[] = [
      { id: "illegitimate_access", label: tr("cat_illegit_label"),
        description: tr("cat_illegit_desc") },
      { id: "unwanted_modification", label: tr("cat_modif_label"),
        description: tr("cat_modif_desc") },
      { id: "data_disappearance", label: tr("cat_disap_label"),
        description: tr("cat_disap_desc") },
    ];

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Overall risk */}
        {overall_risk_before && (
          <div style={{ ...cardSt, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: T.muted }}>{tr("overallRiskBefore")}</span>
            {riskBadge(overall_risk_before, tr)}
          </div>
        )}

        {/* Info */}
        <div style={{ ...cardSt, padding: 14, background: "rgba(0,0,0,0.04)", border: `1px solid ${T.border}` }}>
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: T.text }} />
            <p style={{ fontSize: 11, color: T.text, lineHeight: 1.6 }}>
              <strong>WP248 §3:</strong> {tr("wp248Body")}
            </p>
          </div>
        </div>

        {/* Threat catalog toggle */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={() => setShowThreatCatalog(v => !v)}
            style={{
              padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 500,
              cursor: "pointer", border: `1px solid ${T.border}`,
              background: showThreatCatalog ? T.text : T.card,
              color: showThreatCatalog ? "#fff" : T.muted,
              transition: "all 0.15s",
            }}
          >
            {showThreatCatalog ? tr("closeCatalog") : tr("threatCatalog")}
          </button>
        </div>

        {/* Threat catalog */}
        {showThreatCatalog && (
          <ThreatCatalog
            existingThreatIds={doc.risks.threats.map(t => t.id)}
            onAddThreat={addThreatFromCatalog}
          />
        )}

        {/* Threats by category */}
        {categories.map(cat => {
          const catThreats = threats.filter(t => t.category === cat.id);
          return (
            <div key={cat.id} style={{ ...cardSt, padding: 16 }}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{cat.label}</p>
                  <p style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{cat.description}</p>
                </div>
                <button onClick={() => addThreat(cat.id)} style={{ ...navBtnSt(false), display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <Plus className="h-3 w-3" /> {tr("addThreat")}
                </button>
              </div>
              {catThreats.length === 0 && (
                <p style={{ fontSize: 12, color: T.faint, textAlign: "center", padding: "10px 0" }}>
                  {tr("noThreats")}
                </p>
              )}
              {catThreats.map(t => (
                <div key={t.id} style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, marginTop: 10 }}>
                  <ThreatImpactAIDraft
                    threat={t}
                    systemName={doc.description.system_name || "Sistema"}
                    systemDescription={doc.description.processing_purposes || ""}
                    personalDataCategories={doc.description.personal_data_categories || ""}
                    onApply={(patch) => upThreat(t.id, patch)}
                  />
                  {/* Fonte + descrizione */}
                  <div className="flex items-start gap-2 mb-3">
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                      <div>
                        <Lbl>{tr("threatSource")}</Lbl>
                        <input value={t.source} onChange={e => upThreat(t.id, { source: e.target.value })}
                          placeholder={tr("ph_threatSource")}
                          style={inputSt} />
                      </div>
                      <div>
                        <Lbl required>{tr("threatDesc")}</Lbl>
                        <textarea value={t.description} onChange={e => upThreat(t.id, { description: e.target.value })}
                          rows={2} placeholder={tr("ph_threatDesc")} style={taSt} />
                      </div>
                    </div>
                    <button onClick={() => delThreat(t.id)} style={{ padding: "6px 8px", borderRadius: 8, border: `1px solid ${T.redBdr}`, background: T.redBg, color: T.red, cursor: "pointer", marginTop: 16, flexShrink: 0 }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Valutazione iniziale */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                    <div>
                      <Lbl>{tr("likelihoodInitial")}</Lbl>
                      <Sel value={t.likelihood} onChange={v => upThreat(t.id, { likelihood: v as DPIAThreat["likelihood"] })}
                        options={[{ value: "low", label: tr("low") }, { value: "medium", label: tr("medium") }, { value: "high", label: tr("high") }]} />
                    </div>
                    <div>
                      <Lbl>{tr("severityInitial")}</Lbl>
                      <Sel value={t.severity} onChange={v => upThreat(t.id, { severity: v as DPIAThreat["severity"] })}
                        options={[{ value: "low", label: tr("low") }, { value: "medium", label: tr("medium") }, { value: "high", label: tr("high") }]} />
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, paddingBottom: 2 }}>
                      <span style={{ fontSize: 11, color: T.muted }}>{tr("riskWord")}</span>
                      {riskBadge(t.risk_level, tr)}
                    </div>
                  </div>

                  {/* Misura */}
                  <div style={{ marginBottom: 10 }}>
                    <Lbl>{tr("plannedMeasure")}</Lbl>
                    <textarea value={t.mitigation} onChange={e => upThreat(t.id, { mitigation: e.target.value })}
                      rows={2} placeholder={tr("ph_measure")} style={taSt} />
                  </div>

                  {/* Valutazione rischio residuo */}
                  <div style={{
                    background: "rgba(0,0,0,0.025)",
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    padding: "10px 12px",
                  }}>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: T.muted, marginBottom: 8 }}>
                      {tr("afterMeasures")}
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                      <div>
                        <Lbl>{tr("residualLikelihood")}</Lbl>
                        <Sel value={t.residual_likelihood} onChange={v => upThreat(t.id, { residual_likelihood: v as DPIAThreat["residual_likelihood"] })}
                          options={[{ value: "low", label: tr("low") }, { value: "medium", label: tr("medium") }, { value: "high", label: tr("high") }]} />
                      </div>
                      <div>
                        <Lbl>{tr("residualSeverity")}</Lbl>
                        <Sel value={t.residual_severity} onChange={v => upThreat(t.id, { residual_severity: v as DPIAThreat["residual_severity"] })}
                          options={[{ value: "low", label: tr("low") }, { value: "medium", label: tr("medium") }, { value: "high", label: tr("high") }]} />
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, paddingBottom: 2 }}>
                        <span style={{ fontSize: 11, color: T.muted }}>{tr("residualRisk")}</span>
                        {riskBadge(t.residual_risk, tr)}
                      </div>
                    </div>
                    {t.residual_likelihood && t.residual_severity && (
                      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: T.muted }}>{tr("residualRisk")}</span>
                        {riskBadge(computeRiskLevel(t.residual_likelihood, t.residual_severity), tr)}
                        <span style={{ fontSize: 10, color: T.faint }}>→ {t.residual_risk || tr("compute")}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  }

  // ─── Step 4: Measures ──────────────────────────────────────────────────────

  function renderStep4() {
    const m = doc.measures;
    const threats = doc.risks.threats;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Prior consultation alert */}
        {priorConsultation && (
          <div style={{ ...cardSt, padding: 14, background: T.redBg, border: `1px solid ${T.redBdr}` }}>
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: T.red }} />
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: T.red, marginBottom: 4 }}>
                  ⚠️ {tr("priorConsultTitle")}
                </p>
                <p style={{ fontSize: 11, color: T.text, lineHeight: 1.5 }}>
                  {tr("priorConsultBody1")} <strong>{tr("high")}</strong>. {tr("priorConsultBody2")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Technical/org measures */}
        <div style={{ ...cardSt, padding: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 12 }}>{tr("securityMeasures")}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <Lbl required>{tr("technicalMeasures")}</Lbl>
              <textarea value={m.technical_measures} onChange={e => upMeasures({ technical_measures: e.target.value })}
                rows={4} placeholder={tr("ph_technicalMeasures")} style={taSt} />
            </div>
            <div>
              <Lbl required>{tr("organizationalMeasures")}</Lbl>
              <textarea value={m.organizational_measures} onChange={e => upMeasures({ organizational_measures: e.target.value })}
                rows={4} placeholder={tr("ph_organizationalMeasures")} style={taSt} />
            </div>
          </div>
        </div>

        {/* Residual threats table */}
        {threats.length > 0 && (
          <div style={{ ...cardSt, padding: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 12 }}>{tr("residualByThreat")}</p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                    {[tr("colThreat"), tr("colResLik"), tr("colResSev"), tr("residualRiskCol")].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600, color: T.muted, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {threats.map(t => (
                    <tr key={t.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td style={{ padding: "8px 8px", maxWidth: 280 }}>
                        <p style={{ color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {t.description || <span style={{ color: T.faint }}>{tr("threatNoDesc")}</span>}
                        </p>
                      </td>
                      <td style={{ padding: "8px 8px", width: 130 }}>
                        <Sel value={t.residual_likelihood} onChange={v => upThreat(t.id, { residual_likelihood: v as DPIAThreat["residual_likelihood"] })}
                          options={[{ value: "low", label: tr("low") }, { value: "medium", label: tr("medium") }, { value: "high", label: tr("high") }]} />
                      </td>
                      <td style={{ padding: "8px 8px", width: 130 }}>
                        <Sel value={t.residual_severity} onChange={v => upThreat(t.id, { residual_severity: v as DPIAThreat["residual_severity"] })}
                          options={[{ value: "low", label: tr("low") }, { value: "medium", label: tr("medium") }, { value: "high", label: tr("high") }]} />
                      </td>
                      <td style={{ padding: "8px 8px" }}>{riskBadge(t.residual_risk, tr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: T.muted }}>{tr("overallResidual")}</span>
              {worstResidual ? riskBadge(worstResidual, tr) : <span style={{ fontSize: 12, color: T.faint }}>—</span>}
            </div>
          </div>
        )}

        {/* Prior consultation */}
        {priorConsultation && (
          <div style={{ ...cardSt, padding: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 12 }}>
              {tr("priorConsultSection")}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div><Lbl required>{tr("competentAuthority")}</Lbl>
                <input value={m.prior_consultation_authority} onChange={e => upMeasures({ prior_consultation_authority: e.target.value })}
                  style={inputSt} placeholder={tr("ph_authority")} /></div>
              <div><Lbl>{tr("plannedConsultDate")}</Lbl>
                <input type="date" value={m.prior_consultation_date} onChange={e => upMeasures({ prior_consultation_date: e.target.value })}
                  style={inputSt} /></div>
            </div>
            {/* AG Part 6 — AI prior consultation check */}
            <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>✦ {tr("verifyArt36")}</span>
                <button
                  disabled={priorConsultAILoading}
                  onClick={async () => {
                    setPriorConsultAILoading(true);
                    setPriorConsultAIError(null);
                    setPriorConsultAIResult(null);
                    const res = await checkPriorConsultation({
                      overallRiskAfter: m.overall_risk_after as "high" | "medium" | "low" | "",
                      technicalMeasures: m.technical_measures,
                      organizationalMeasures: m.organizational_measures,
                      systemName: doc.description.system_name,
                      processingPurposes: doc.description.processing_purposes,
                      specialCategories: doc.description.special_categories,
                    });
                    setPriorConsultAILoading(false);
                    if (res.error) setPriorConsultAIError(res.error);
                    else setPriorConsultAIResult(res.result);
                  }}
                  style={{
                    padding: "6px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600,
                    background: priorConsultAILoading ? "rgba(0,0,0,0.07)" : T.text,
                    color: priorConsultAILoading ? T.muted : "#fff", border: "none",
                    cursor: priorConsultAILoading ? "not-allowed" : "pointer",
                  }}>
                  {priorConsultAILoading ? tr("analyzing") : tr("analyzeObligations")}
                </button>
              </div>
              {priorConsultAIError && <p style={{ fontSize: 11, color: T.red }}>{tr("errorRetry")}</p>}
              {priorConsultAIResult && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <p style={{ fontSize: 12, color: T.text }}>{priorConsultAIResult.gdprArticle36Assessment}</p>
                  {priorConsultAIResult.requiredActions.length > 0 && (
                    <div>
                      {priorConsultAIResult.requiredActions.map((a, i) => (
                        <div key={i} style={{ display: "flex", gap: 6, marginBottom: 5, padding: "5px 8px", borderRadius: 6,
                          background: a.priority === "obbligatorio" ? T.redBg : T.amberBg,
                          border: `1px solid ${a.priority === "obbligatorio" ? T.redBdr : T.amberBdr}` }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 4,
                            background: a.priority === "obbligatorio" ? "rgba(220,38,38,0.2)" : "rgba(202,138,4,0.2)",
                            color: a.priority === "obbligatorio" ? T.red : T.amber, whiteSpace: "nowrap" }}>
                            {a.priority === "obbligatorio" ? tr("mandatoryAbbr") : tr("recommendedAbbr")}
                          </span>
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 500, color: T.text, margin: 0 }}>{a.action}</p>
                            <p style={{ fontSize: 10, color: T.muted, margin: 0 }}>{a.article} — scadenza: {a.deadline}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {priorConsultAIResult.submissionChecklist.length > 0 && (
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 600, color: T.text, marginBottom: 4 }}>{tr("submissionChecklist")}</p>
                      <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: T.muted }}>
                        {priorConsultAIResult.submissionChecklist.map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    </div>
                  )}
                  <p style={{ fontSize: 10, color: T.faint }}>✦ {tr("aiVerifyConfirm")}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Review schedule */}
        <div style={{ ...cardSt, padding: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 12 }}>{tr("reviewPlanning")}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><Lbl>{tr("reviewFrequency")}</Lbl>
              <Sel value={m.review_schedule as "annual"|"biannual"|"quarterly"|"event_driven"|""} onChange={v => upMeasures({ review_schedule: v })}
                options={[
                  { value: "annual", label: tr("freq_annual") },
                  { value: "biannual", label: tr("freq_biannual") },
                  { value: "quarterly", label: tr("freq_quarterly") },
                  { value: "event_driven", label: tr("freq_event") },
                ]} /></div>
            <div><Lbl>{tr("extraReviewTrigger")}</Lbl>
              <input value={m.review_trigger} onChange={e => upMeasures({ review_trigger: e.target.value })}
                style={inputSt} placeholder={tr("ph_reviewTrigger")} /></div>
          </div>
        </div>

        {/* Fase 3: Gap-check Art. 35(7) */}
        <DpiaGapCheck
          doc={doc}
          onNavigateToStep={(s) => setStep(s as Step)}
          onResult={(r) => setGapCheckResult(r)}
        />
      </div>
    );
  }

  // ─── Step 5: Conclusion ────────────────────────────────────────────────────

  function renderStep5() {
    const c = doc.conclusion;
    // Fase 5: staleness detection
    const currentHash = computeDpiaHash(doc);
    const isStale = savedHash !== null && savedHash !== currentHash && !stalenessDismissed;

    const compliantOptions: { value: "yes"|"no"|"conditional"; label: string; color: string; bg: string; border: string }[] = [
      { value: "yes", label: tr("concl_yes"), color: T.green, bg: T.greenBg, border: T.greenBdr },
      { value: "conditional", label: tr("concl_conditional"), color: T.amber, bg: T.amberBg, border: T.amberBdr },
      { value: "no", label: tr("concl_no"), color: T.red, bg: T.redBg, border: T.redBdr },
    ];

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Fase 5: Staleness banner */}
        {isStale && (
          <div style={{ ...cardSt, padding: "12px 16px", background: T.amberBg, border: `1px solid ${T.amberBdr}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: T.amber, margin: "0 0 2px" }}>
                ⚠ {tr("staleTitle")}
              </p>
              <p style={{ fontSize: 11, color: T.muted, margin: 0 }}>
                {tr("staleBody")}
              </p>
            </div>
            <button
              onClick={() => { writeToStorage("dpiaStaleness", currentHash); setSavedHash(currentHash); setStalenessDismissed(true); }}
              style={{ fontSize: 11, fontWeight: 500, padding: "5px 10px", borderRadius: 6, border: `1px solid ${T.amberBdr}`, background: T.card, color: T.amber, cursor: "pointer", whiteSpace: "nowrap" }}
            >
              {tr("markReviewed")}
            </button>
          </div>
        )}

        {/* Compliant */}
        <div style={{ ...cardSt, padding: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 12 }}>{tr("conclusionTitle")}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {compliantOptions.map(o => (
              <button key={o.value} onClick={() => upConclusion({ compliant: o.value })}
                style={{
                  padding: "12px 16px", borderRadius: 10, cursor: "pointer",
                  border: `1px solid ${c.compliant === o.value ? o.border : T.border}`,
                  background: c.compliant === o.value ? o.bg : T.card,
                  display: "flex", alignItems: "center", gap: 8, textAlign: "left",
                  transition: "all 0.15s",
                }}>
                <div style={{
                  width: 16, height: 16, borderRadius: 8, border: `2px solid ${c.compliant === o.value ? o.color : T.border}`,
                  background: c.compliant === o.value ? o.color : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  {c.compliant === o.value && <Check className="h-2.5 w-2.5" style={{ color: "#fff" }} />}
                </div>
                <span style={{ fontSize: 12, fontWeight: 500, color: c.compliant === o.value ? o.color : T.text }}>
                  {o.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Conditions */}
        {c.compliant === "conditional" && (
          <div style={{ ...cardSt, padding: 16 }}>
            <Lbl required>{tr("conditionsLabel")}</Lbl>
            <textarea value={c.conditions} onChange={e => upConclusion({ conditions: e.target.value })}
              rows={3} placeholder={tr("ph_conditions")} style={taSt} />
          </div>
        )}

        {/* Summary */}
        <div style={{ ...cardSt, padding: 16 }}>
          <Lbl>{tr("execSummary")}</Lbl>
          <textarea value={c.summary} onChange={e => upConclusion({ summary: e.target.value })}
            rows={5} placeholder={tr("ph_execSummary")} style={taSt} />
        </div>

        {/* Review date */}
        <div style={{ ...cardSt, padding: 16 }}>
          <Lbl>{tr("nextReviewDate")}</Lbl>
          <input type="date" value={c.next_review_date} onChange={e => upConclusion({ next_review_date: e.target.value })}
            style={{ ...inputSt, width: 200 }} />
        </div>

        {/* Actions */}
        <div style={{ ...cardSt, padding: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 12 }}>{tr("actions")}</p>
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={saveToDossier}
              style={{ ...navBtnSt(true), display: "flex", alignItems: "center", gap: 6 }}>
              <FileText className="h-3.5 w-3.5" />
              {tr("saveToDossier")}
            </button>
            <button onClick={downloadReport}
              style={{ ...navBtnSt(false), display: "flex", alignItems: "center", gap: 6 }}>
              <Download className="h-3.5 w-3.5" />
              {tr("downloadReport")}
            </button>
          </div>
        </div>

        {/* Rischi correlati DPIA ⇄ FRIA */}
        <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", padding: 20, marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#0D1016", margin: "0 0 6px" }}>
            {tr("correlatedRisksTitle")}
          </p>
          <p style={{ fontSize: 11, color: "rgba(0,0,0,0.40)", margin: "0 0 14px" }}>
            {tr("correlatedRisksSub")}
          </p>
          <CorrelatedRisksPanel />
        </div>

        {/* Sign-off */}
        <SignOffPanel toolKey="dpia" toolLabel={tr("signOffLabel")} />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const steps = [renderStep0, renderStep1, renderStep2, renderStep3, renderStep4, renderStep5];

  // ── Ghost data per guided mode ─────────────────────────────────────────────
  const ghostClassifier = readFromStorage<ClassifierResult>("classifier");
  const ghostDataAudit  = readFromStorage<DataAuditResult>("dataAudit");

  // ── Guided mode: layout dedicato (3 colonne, full-height) ─────────────────
  if (guidedMode) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: T.bg }}>
        {/* Shared headers sopra le 3 colonne */}
        <div style={{ padding: "12px 20px 0", flexShrink: 0 }}>
          <SystemSelector checkProhibited={true} />
          <AssessmentStepper currentTool="dpia" />
          <AssessmentSharedHeader />
        </div>
        {/* Toggle tra le due modalità */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "10px 20px", borderBottom: `1px solid ${T.border}`,
          background: T.card, flexShrink: 0,
        }}>
          <button
            onClick={() => setGuidedMode(false)}
            style={{
              display: "flex", flexDirection: "column", gap: 2,
              padding: "9px 16px", borderRadius: 8, cursor: "pointer",
              border: `1px solid rgba(0,0,0,0.08)`, background: "none",
              textAlign: "left", transition: "border-color 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(35,64,58,0.22)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.08)"; }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, color: T.muted }}>{tr("modeFormTitle")}</span>
            <span style={{ fontSize: 9, color: T.faint }}>{tr("modeFormDescShort")}</span>
          </button>
          <div style={{
            display: "flex", flexDirection: "column", gap: 2,
            padding: "9px 16px", borderRadius: 8,
            border: `1px solid rgba(35,64,58,0.22)`,
            background: "rgba(35,64,58,0.05)",
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.text }}>{tr("modeGuidedTitle")}</span>
            <span style={{ fontSize: 9, color: T.muted }}>{tr("modeGuidedDescShort")}</span>
          </div>
        </div>
        {/* Layout 3 colonne */}
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          <DpiaGuidedMode ghostClassifier={ghostClassifier} ghostDataAudit={ghostDataAudit} onExitGuidedMode={() => setGuidedMode(false)} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, padding: "24px 32px" }}>
      <SystemSelector checkProhibited={true} />
      <AssessmentStepper currentTool="dpia" />
      <AssessmentSharedHeader />
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div className="flex items-start justify-between" style={{ marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 4 }}>
              {tr("pageTitle")}
            </h1>
            <p style={{ fontSize: 12, color: T.muted }}>
              {tr("pageSubtitle")}
            </p>
          </div>
          <div className="flex items-center gap-3">
          {/* Template viewer button */}
          {(() => {
            const progress = computeDpiaProgress(doc, tr);
            const color = progress.overallPercent >= 80 ? "#16a34a" : progress.overallPercent >= 40 ? "#d97706" : "rgba(0,0,0,0.5)";
            return (
              <button
                onClick={() => setShowTemplateViewer(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  fontSize: 11, fontWeight: 600, padding: "6px 12px", borderRadius: 8,
                  border: "1px solid rgba(0,0,0,0.10)", background: "#ffffff",
                  color: T.text, cursor: "pointer",
                }}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>{tr("documentWord")}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color, background: "rgba(0,0,0,0.04)", padding: "1px 6px", borderRadius: 9999 }}>
                  {progress.overallPercent}%
                </span>
              </button>
            );
          })()}
          {/* Part 3 — AI pre-fill button */}
          <button
            disabled={aiPrefillLoading || !intake.systemName.trim() || !intake.processingPurpose.trim()}
            onClick={async () => {
              setAiPrefillLoading(true);
              setAiPrefillError(null);
              try {
                const ctx = buildComplianceContextFromStorage();
                const res = await draftDpiaSections(ctx, intake);
                if ("error" in res) {
                  setAiPrefillError(res.error);
                } else {
                  // Apply assets (DPIAAsset shape from storage-schema)
                  if (res.assets && res.assets.length > 0) {
                    upDoc(d => ({
                      ...d,
                      description: {
                        ...d.description,
                        assets: res.assets.map((a: {
                          assetName: string; dataCategory: string; legalBasis: string;
                          retentionPeriod: string; sensitivityLevel: string
                        }) => ({
                          id: `ai_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                          name: a.assetName ?? "",
                          type: "database" as const,
                          description: `${a.dataCategory} — ${a.legalBasis} · ✦ AI — verifica`,
                          personal_data: true,
                        })),
                      }
                    }));
                  }
                  // Apply threats (DPIAThreat shape from storage-schema)
                  if (res.threats && res.threats.length > 0) {
                    const toLevel = (n: number): "low" | "medium" | "high" =>
                      n >= 4 ? "high" : n >= 3 ? "medium" : "low";
                    upDoc(d => ({
                      ...d,
                      risks: {
                        ...d.risks,
                        threats: res.threats.map((t: {
                          threatName: string; description: string;
                          likelihood: number; impact: number;
                          mitigation: string; residualRisk: string
                        }) => ({
                          id: `ai_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                          category: "illegitimate_access" as const,
                          source: "✦ AI — verifica",
                          description: `${t.threatName}: ${t.description}`,
                          likelihood: toLevel(t.likelihood),
                          severity: toLevel(t.impact),
                          risk_level: toLevel(Math.max(t.likelihood, t.impact)),
                          mitigation: t.mitigation ?? "",
                          residual_likelihood: "low" as const,
                          residual_severity: "low" as const,
                          residual_risk: (t.residualRisk as "low" | "medium" | "high") ?? "low" as const,
                        })),
                      }
                    }));
                  }
                  // Apply measures
                  if (res.technicalMeasures?.length || res.organizationalMeasures?.length) {
                    upMeasures({
                      technical_measures: Array.isArray(res.technicalMeasures)
                        ? res.technicalMeasures.join("\n") : "",
                      organizational_measures: Array.isArray(res.organizationalMeasures)
                        ? res.organizationalMeasures.join("\n") : "",
                      prior_consultation_required: res.priorConsultationRequired ?? false,
                    });
                  }
                  setAiPrefillDone(true);
                }
              } catch {
                setAiPrefillError(tr("aiPrefillError"));
              }
              setAiPrefillLoading(false);
            }}
            style={{
              padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: aiPrefillDone
                ? T.greenBg
                : (!intake.systemName.trim() || !intake.processingPurpose.trim())
                  ? "rgba(0,0,0,0.05)"
                  : T.amberBg,
              color: aiPrefillDone
                ? T.green
                : (!intake.systemName.trim() || !intake.processingPurpose.trim())
                  ? "rgba(0,0,0,0.3)"
                  : T.amber,
              border: `1px solid ${aiPrefillDone
                ? T.greenBdr
                : (!intake.systemName.trim() || !intake.processingPurpose.trim())
                  ? "rgba(0,0,0,0.1)"
                  : T.amberBdr}`,
              cursor: (aiPrefillLoading || !intake.systemName.trim() || !intake.processingPurpose.trim()) ? "default" : "pointer",
              transition: "all 0.15s",
            }}
          >
            {aiPrefillLoading
              ? tr("aiPrefilling")
              : aiPrefillDone
                ? tr("aiApplied")
                : (!intake.systemName.trim() || !intake.processingPurpose.trim())
                  ? tr("aiPrefillContextFirst")
                  : tr("aiPrefillBtn")}
          </button>
          {aiPrefillError && (
            <span style={{ fontSize: 11, color: "#b91c1c" }}>⚠ {aiPrefillError}</span>
          )}
          {saved && (
            <span style={{ fontSize: 11, color: T.green, display: "flex", alignItems: "center", gap: 4 }}>
              <Check className="h-3.5 w-3.5" /> {tr("saved")}
            </span>
          )}
          <span style={{
            fontSize: 11, padding: "3px 8px", borderRadius: 5,
            background: priorConsultation ? T.redBg : doc.screening.dpia_required === "yes" ? T.amberBg : T.greenBg,
            color: priorConsultation ? T.red : doc.screening.dpia_required === "yes" ? T.amber : T.green,
            border: `1px solid ${priorConsultation ? T.redBdr : doc.screening.dpia_required === "yes" ? T.amberBdr : T.greenBdr}`,
            fontWeight: 600,
          }}>
            {priorConsultation ? tr("badgePriorConsult") : doc.screening.dpia_required === "yes" ? tr("badgeDpiaRequired") : doc.screening.dpia_required === "uncertain" ? tr("badgeUncertain") : tr("badgeScreening")}
          </span>
        </div>
        </div>

        {/* ── Mode selector ── */}
        <div style={{ display: "flex", gap: 6 }}>
          {/* Form strutturato — active */}
          <div style={{
            display: "flex", flexDirection: "column", gap: 3,
            padding: "12px 18px", borderRadius: 10,
            border: `1px solid rgba(35,64,58,0.22)`,
            background: "rgba(35,64,58,0.05)",
            minWidth: 190,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.text }}>{tr("modeFormTitle")}</span>
            <span style={{ fontSize: 10, color: T.muted, lineHeight: 1.4 }}>{tr("modeFormDescShort")}</span>
          </div>
          {/* DPIA guidata — inactive, clickable */}
          <button
            onClick={() => setGuidedMode(true)}
            style={{
              display: "flex", flexDirection: "column", gap: 3,
              padding: "12px 18px", borderRadius: 10, cursor: "pointer",
              border: `1px solid rgba(0,0,0,0.08)`,
              background: T.card, textAlign: "left",
              transition: "border-color 0.15s, background 0.15s",
              minWidth: 190,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "rgba(35,64,58,0.22)";
              e.currentTarget.style.background = "rgba(35,64,58,0.03)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "rgba(0,0,0,0.08)";
              e.currentTarget.style.background = T.card;
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: T.text }}>{tr("modeGuidedTitle")}</span>
            <span style={{ fontSize: 10, color: T.muted, lineHeight: 1.4 }}>{tr("modeGuidedDescShort")}</span>
          </button>
        </div>
      </div>

      <UnifiedIntake
        intake={intake}
        setIntake={setIntake}
        onParsed={() => { setAiPrefillDone(false); }}
      />

      {/* ── Two-column layout: Rail + Content ── */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>

        {/* LEFT — Progress Rail */}
        <div style={{
          width: 220, flexShrink: 0,
          background: "#fafafa",
          borderRadius: 10,
          border: "1px solid rgba(0,0,0,0.08)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          position: "sticky", top: 16,
        }}>
          {/* Rail header */}
          <div style={{ padding: "12px 12px 10px", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{tr("documentWord")}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#0D1016", fontFamily: "monospace" }}>{computeDpiaProgress(doc, tr).overallPercent}%</span>
            </div>
            <div style={{ width: "100%", height: 4, background: "rgba(0,0,0,0.07)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${computeDpiaProgress(doc, tr).overallPercent}%`, background: "#0D1016", borderRadius: 2, transition: "width 0.5s ease" }} />
            </div>
          </div>
          {/* Step list */}
          <div style={{ padding: 8 }}>
            {computeDpiaProgress(doc, tr).steps.map((s, idx) => {
              const isActive   = step === idx;
              const isExpanded = railExpanded.has(idx);
              const circleColor = s.percent === 100 ? "#23403a" : "#dc2626";
              const pctColor    = s.percent === 100 ? "#23403a" : s.percent > 0 ? "#b45309" : "rgba(0,0,0,0.22)";
              const borderColor = isActive ? "rgba(35,64,58,0.20)" : s.percent === 100 ? "rgba(35,64,58,0.12)" : "rgba(0,0,0,0.07)";
              const bg          = isActive ? "rgba(35,64,58,0.06)" : "transparent";
              const subPoints   = s.fields.filter(f => f.required);
              const doneCount   = subPoints.filter(f => f.filled).length;

              return (
                <div key={idx} style={{
                  border: `1px solid ${borderColor}`,
                  background: bg,
                  borderRadius: 8,
                  overflow: "hidden",
                  marginBottom: 4,
                }}>
                  <button
                    onClick={() => {
                      setStep(idx as Step);
                      setRailExpanded(prev => {
                        const next = new Set(prev);
                        next.has(idx) ? next.delete(idx) : next.add(idx);
                        return next;
                      });
                    }}
                    style={{
                      width: "100%", textAlign: "left", border: "none",
                      background: "transparent", padding: "9px 10px",
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(0,0,0,0.02)"; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                  >
                    <div style={{ flexShrink: 0 }}>
                      <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${circleColor}` }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: "#0D1016", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {idx + 1}. {s.label}
                      </p>
                      <p style={{ fontSize: 9, color: "rgba(0,0,0,0.42)", margin: 0, marginTop: 1 }}>
                        {doneCount}/{subPoints.length} · {s.legalRef}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 9.5, fontWeight: 700, color: pctColor, fontFamily: "monospace" }}>
                        {s.percent}%
                      </span>
                      <ChevronRight
                        size={10}
                        style={{
                          color: "rgba(0,0,0,0.22)",
                          transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                          transition: "transform 0.2s",
                        }}
                      />
                    </div>
                  </button>

                  {/* Progress bar */}
                  <div style={{ height: 2, background: "rgba(0,0,0,0.04)" }}>
                    <div style={{ height: "100%", width: `${s.percent}%`, background: circleColor, transition: "width 0.35s" }} />
                  </div>

                  {/* Sub-points */}
                  {isExpanded && subPoints.length > 0 && (
                    <div style={{ borderTop: "1px solid rgba(0,0,0,0.05)", padding: "4px 6px 6px 6px" }}>
                      {subPoints.map((f, fi) => (
                        <div
                          key={fi}
                          onClick={() => setStep(idx as Step)}
                          style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "4px 4px", borderRadius: 5, cursor: "pointer",
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.03)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                          <div style={{ flexShrink: 0 }}>
                            {f.filled
                              ? <div style={{ width: 10, height: 10, borderRadius: "50%", border: "1.5px solid #23403a" }} />
                              : <div style={{ width: 10, height: 10, borderRadius: "50%", border: "1.5px solid #dc2626" }} />
                            }
                          </div>
                          <p style={{
                            fontSize: 10, color: f.filled ? "rgba(0,0,0,0.42)" : "#0D1016",
                            margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            textDecoration: f.filled ? "line-through" : "none",
                            opacity: f.filled ? 0.55 : 1,
                          }}>
                            {f.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT — Step content */}
        <div style={{ flex: 1, minWidth: 0, border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, background: "#fafafa", padding: "20px 24px" }}>
          {/* Step header */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {tr("stepWord")} {step} / 5
            </p>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.text }}>
              {tr(`step${step}_label`)}
              <span style={{ fontSize: 12, fontWeight: 400, color: T.muted, marginLeft: 8 }}>
                {tr(`step${step}_sub`)}
              </span>
            </h2>
          </div>

          {steps[step]()}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => setStep(s => Math.max(0, s - 1) as Step)}
              disabled={step === 0}
              style={{ ...navBtnSt(false), display: "flex", alignItems: "center", gap: 4, opacity: step === 0 ? 0.35 : 1 }}>
              <ChevronLeft className="h-4 w-4" /> {tr("previous")}
            </button>
            <span style={{ fontSize: 11, color: T.faint }}>{step + 1} / {STEPS.length}</span>
            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1) as Step)}
                style={{ ...navBtnSt(true), display: "flex", alignItems: "center", gap: 4 }}>
                {tr("next")} <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={saveToDossier}
                style={{ ...navBtnSt(true), display: "flex", alignItems: "center", gap: 4 }}>
                <CheckCircle2 className="h-4 w-4" /> {tr("completeDpia")}
              </button>
            )}
          </div>

          <NextStepGuide dpia={doc} gapCheck={gapCheckResult} onNavigateToStep={(s) => setStep(s as Step)} />
        </div>
      </div>

      {/* ── Template Viewer Panel (slide-in from right) ─────────────────────── */}
      {showTemplateViewer && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowTemplateViewer(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 40 }}
          />
          {/* Panel */}
          <div style={{
            position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 50,
            width: "min(520px, 90vw)",
            background: "#f8f8f7",
            boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
            display: "flex", flexDirection: "column",
            overflow: "hidden",
          }}>
            {/* Panel header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 20px",
              background: "#ffffff", borderBottom: "1px solid rgba(0,0,0,0.08)",
              flexShrink: 0,
            }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: 0 }}>{tr("dpiaDocument")}</p>
                <p style={{ fontSize: 10, color: T.muted, margin: "2px 0 0" }}>
                  {tr("realTimeUpdated")}
                </p>
              </div>
              <button
                onClick={() => setShowTemplateViewer(false)}
                style={{ padding: 6, border: "none", background: "none", cursor: "pointer", color: T.muted, borderRadius: 6 }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
              <DPIATemplateViewer doc={doc} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

