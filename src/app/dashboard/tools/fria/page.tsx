"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ChevronDown, ChevronRight, Plus, Trash2, CheckCircle,
  AlertTriangle, Shield, Users, Activity, FileText, Download,
} from "lucide-react";
import SignOffPanel from "@/components/ui/SignOffPanel";
import { writeToStorage, readFromStorage } from "@/lib/dossier/storage-schema";
import { FriaGuidedMode } from "@/components/fria/FriaGuidedMode";
import { RightsCatalog } from "@/components/fria/RightsCatalog";
import { ContextCatalog } from "@/components/fria/ContextCatalog";
import { NextStepGuide } from "@/components/fria/NextStepGuide";
import { RightImpactAIDraft } from "@/components/fria/RightImpactAIDraft";
import { FriaGapCheck } from "@/components/fria/FriaGapCheck";
import type { FriaGapCheck as FriaGapCheckResult } from "@/app/actions/checkFriaGaps";
import type { FRIAResult } from "@/lib/dossier/storage-schema";
import { useAutoSave } from "@/hooks/useAutoSave";
import { VersionHistoryPanel } from "@/components/compliance/VersionHistoryPanel";
import { draftFria } from "@/app/actions/draftFria";
import { draftFriaPublicSummary } from "@/app/actions/draftFriaPublicSummary";
import type { ClassifierResult, RiskManagerResult, DataAuditResult } from "@/lib/dossier/storage-schema";
import { appendEvidence } from "@/lib/evidence/evidence-layer";
import { SystemSelector } from "@/components/compliance/SystemSelector";
import { getAssessment, patchFRIA, patchShared, migrateLegacyFRIA, syncCorrelatedRisksFromFRIA } from "@/lib/assessment/assessment-helpers";
import type { AssessmentShared } from "@/lib/assessment/assessment-schema";
import { CorrelatedRisksPanel } from "@/components/assessment/CorrelatedRisksPanel";
import { AssessmentSharedHeader } from "@/components/assessment/AssessmentSharedHeader";
import { AssessmentStepper } from "@/components/assessment/AssessmentStepper";
import {
  type FRIADocument, type FRIAScenario, type FRIARightImpact,
  type FRIASeverityAssessment, type FRIAMitigationMeasure,
  type FRIAStakeholder, type FRIAEngagementLog, type FRIAMonitoringItem,
  FUNDAMENTAL_RIGHTS, RIGHTS_GROUPS,
  createEmptyFRIA, computeSeverity, computePriority,
  generatePublicSummary, calculateFRIACompleteness, getOverallFRIARisk,
} from "@/lib/simulation/fria-engine";

// ─── Storage ─────────────────────────────────────────────────────────────────

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  text: "#0D1016", muted: "rgba(0,0,0,0.42)", faint: "rgba(0,0,0,0.28)",
  border: "rgba(0,0,0,0.08)", card: "#ffffff", bg: "#f8f8f7",
  red: "#dc2626", redBg: "rgba(220,38,38,0.06)", redBdr: "rgba(220,38,38,0.2)",
  amber: "#d97706", amberBg: "rgba(202,138,4,0.06)", amberBdr: "rgba(202,138,4,0.2)",
  
  green: "#16a34a", greenBg: "rgba(22,163,74,0.06)", greenBdr: "rgba(22,163,74,0.2)",
} as const;

const cardSt: CSSProperties = {
  background: T.card, border: `1px solid ${T.border}`,
  borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};

const inputSt: CSSProperties = {
  width: "100%", padding: "7px 10px", borderRadius: 8,
  border: `1px solid ${T.border}`, fontSize: 12, color: T.text,
  background: T.card, outline: "none",
};

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
type RiskColor = "red" | "amber" | "green" | "gray";

function riskColorFor(v: string): RiskColor {
  if (v === "high" || v === "critical") return "red";
  if (v === "medium") return "amber";
  if (v === "low") return "green";
  return "gray";
}

function Badge({ label, color = "gray" }: { label: string; color?: RiskColor }) {
  const map: Record<RiskColor, { bg: string; bdr: string; text: string }> = {
    red:   { bg: T.redBg,   bdr: T.redBdr,   text: T.red   },
    amber: { bg: T.amberBg, bdr: T.amberBdr, text: T.amber },
    green: { bg: T.greenBg, bdr: T.greenBdr, text: T.green },
    gray:  { bg: "rgba(0,0,0,0.04)", bdr: T.border, text: T.muted },
  };
  const c = map[color];
  return (
    <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 7px", borderRadius: 9999,
      background: c.bg, border: `1px solid ${c.bdr}`, color: c.text }}>
      {label}
    </span>
  );
}

function Sel({ label, value, options, onChange, note }: {
  label: string; value: string; options: { value: string; label: string }[];
  onChange: (v: string) => void; note?: string;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: T.muted, marginBottom: 4 }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={inputSt}>
        <option value="">— seleziona —</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {note && <p style={{ fontSize: 10, color: T.faint, marginTop: 3 }}>{note}</p>}
    </div>
  );
}

function Txt({ label, value, onChange, rows = 3, ph }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number; ph?: string;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: T.muted, marginBottom: 4 }}>{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={ph}
        style={{ ...inputSt, resize: "vertical" as const }} />
    </div>
  );
}

function Inp({ label, value, onChange, ph }: {
  label: string; value: string; onChange: (v: string) => void; ph?: string;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: T.muted, marginBottom: 4 }}>{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={ph} style={inputSt} />
    </div>
  );
}

// ─── Hash utilities (staleness detection) ────────────────────────────────────
function djb2(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (((h << 5) + h) + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

function computeFriaHash(doc: FRIADocument): string {
  return djb2([
    doc.system_name, doc.organization,
    doc.context.technology_overview, doc.context.affected_persons,
    doc.context.intended_purpose_explanation,
  ].join("|"));
}

// ─── Phase nav config ─────────────────────────────────────────────────────────
type Phase = "1" | "2" | "3" | "4" | "5";
const PHASES: { id: Phase; label: string; sub: string; Icon: React.ComponentType<{ style?: CSSProperties }> }[] = [
  { id: "1", label: "Contesto", sub: "Analisi del deployment", Icon: FileText },
  { id: "2", label: "Scenari", sub: "Impatti sui diritti", Icon: AlertTriangle },
  { id: "3", label: "Decisione", sub: "Deployment & sign-off", Icon: Shield },
  { id: "4", label: "Monitoraggio", sub: "Piano e trigger", Icon: Activity },
  { id: "5", label: "Stakeholder", sub: "Mappatura e log", Icon: Users },
];

const DEFAULT_TRIGGERS = [
  "Modifica sostanziale del sistema AI",
  "Nuovo contesto di deployment",
  "Violazione dei diritti fondamentali rilevata",
  "Revisione annuale programmata",
  "Cambio normativo rilevante",
  "Nuovo rischio identificato",
  "Reclamo fondato ricevuto",
];

// ─── Main component ───────────────────────────────────────────────────────────
export default function FRIAPage() {
  const [doc, setDoc] = useState<FRIADocument>(() => createEmptyFRIA());
  const [phase, setPhase] = useState<Phase>("1");
  const [gapCheckResult, setGapCheckResult] = useState<FriaGapCheckResult | null>(null);
  const [openAcc, setOpenAcc] = useState<Set<"A" | "B" | "C">>(new Set(["A"]));
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [p2Tab, setP2Tab] = useState<"rights" | "matrix">("rights");
  const [openRights, setOpenRights] = useState<Set<string>>(new Set());
  const [openRightGroups, setOpenRightGroups] = useState<Set<string>>(new Set(["dignity_group", "freedom_group", "equality_group"]));
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);
  const [dossierSavedAt, setDossierSavedAt] = useState<string | null>(() =>
    readFromStorage<FRIAResult>("fria")?.completedAt ?? null
  );
  const saveTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef  = useRef<HTMLDivElement>(null);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set(["1"]));

  function scrollToPhase(id: string) {
    setPhase(id as Phase);
    const el = contentRef.current?.querySelector(`#fase-${id}`) as HTMLElement | null;
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const phaseProgress = useMemo(() => {
    const ctx = doc.context;
    const f = (v: string | undefined) => !!(v?.trim());
    const phases = [
      { id: "1", label: "Contesto", legalRef: "Art. 27(2)(a)", subPoints: [
        { label: "Nome sistema",        done: f(doc.system_name) },
        { label: "Organizzazione",      done: f(doc.organization) },
        { label: "Scopo previsto",      done: f(ctx.intended_purpose_explanation) },
        { label: "Persone interessate", done: f(ctx.affected_persons) },
        { label: "Tecnologia",          done: f(ctx.technology_overview) },
      ]},
      { id: "2", label: "Scenari", legalRef: "Art. 27(2)(b)", subPoints: [
        { label: "Almeno uno scenario", done: doc.scenarios.length > 0 },
        { label: "Impatti sui diritti", done: doc.scenarios.some(s => s.right_impacts.length > 0) },
      ]},
      { id: "3", label: "Decisione", legalRef: "Art. 27(2)(c)", subPoints: [
        { label: "Raccomandazione",  done: f(doc.deployment.recommendation) },
        { label: "Responsabile",     done: f(doc.deployment.approver_name) },
        { label: "Motivazione",      done: f(doc.deployment.decision_justification) },
      ]},
      { id: "4", label: "Monitoraggio", legalRef: "Art. 27(2)(d)", subPoints: [
        { label: "Elementi monitoraggio",  done: doc.monitoring.items.length > 0 },
        { label: "Trigger aggiornamento",  done: doc.monitoring.update_triggers.length > 0 },
      ]},
      { id: "5", label: "Stakeholder", legalRef: "Art. 27(2)(e)", subPoints: [
        { label: "Stakeholder mappati", done: doc.stakeholders.length > 0 },
        { label: "Log engagement",      done: doc.engagement_log.length > 0 },
      ]},
    ];
    return phases.map(p => {
      const done  = p.subPoints.filter(sp => sp.done).length;
      const total = p.subPoints.length;
      return { ...p, done, total, percent: Math.round((done / total) * 100) };
    });
  }, [doc]);

  // ── Sync FRIA fields → shared (idempotente, fire-and-forget) ─────────────
  function syncFriaToShared(friaDoc: FRIADocument) {
    const patch: Partial<AssessmentShared> = {};
    if (friaDoc.system_name) patch.systemName = friaDoc.system_name;
    if (friaDoc.organization) patch.organization = friaDoc.organization;
    if (friaDoc.context.affected_persons) patch.dataSubjects = [friaDoc.context.affected_persons];
    if (friaDoc.context.processes_personal_data === "yes") patch.processesPersonalData = true;
    if (Object.keys(patch).length > 0) patchShared(patch);
  }

  // ── Load from Assessment storage on mount ─────────────────────────────────
  useEffect(() => {
    migrateLegacyFRIA();
    const friaDat = getAssessment().fria;
    setDoc(friaDat);
    syncFriaToShared(friaDat);
    // Staleness check: compare current hash vs stored hash
    const storedStaleness = readFromStorage<{ hash: string; savedAt: string }>("friaStaleness");
    if (storedStaleness?.hash) {
      const currentHash = computeFriaHash(friaDat);
      if (currentHash !== storedStaleness.hash) setStalenessWarning(true);
    }
  }, []);

  // Save staleness hash when sign-off is completed
  useEffect(() => {
    if (doc.deployment.approved_at) {
      const hash = computeFriaHash(doc);
      writeToStorage("friaStaleness", { hash, savedAt: doc.deployment.approved_at });
      setStalenessWarning(false);
    }
  }, [doc.deployment.approved_at]);

  // ── Auto-save ogni 30s ────────────────────────────────────────────────────
  const { justSaved: friaSaved } = useAutoSave(
    "fria",
    doc,
    (d) => patchFRIA(() => d)
  );

  // ── AI draft generator ────────────────────────────────────────────────────
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [draftGenerated, setDraftGenerated] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [loadingAiSummary, setLoadingAiSummary] = useState(false);
  const [aiSummaryIsFromAI, setAiSummaryIsFromAI] = useState(false);
  const [stalenessWarning, setStalenessWarning] = useState(false);
  const [guidedMode, setGuidedMode] = useState(false);

  // Leggi dati correlati per il banner contestuale
  const riskData   = useMemo(() => readFromStorage<RiskManagerResult>("riskManager"), []);
  const dataAudit  = useMemo(() => readFromStorage<DataAuditResult>("dataAudit"), []);

  async function handleDraftFria() {
    const classifier = readFromStorage<ClassifierResult>("classifier");
    if (!classifier?.systemName) {
      setDraftError("Completa prima il Classifier per generare la bozza.");
      return;
    }
    setLoadingDraft(true);
    setDraftError(null);
    const result = await draftFria(
      classifier.systemName,
      classifier.systemDescription ?? "",
      classifier.riskLevel ?? "",
      riskData?.risks?.map((r) => ({ title: r.title, severity: r.impact })) ?? [],
      dataAudit?.datasets?.some((d) => d.personalData) ?? false
    );
    setLoadingDraft(false);
    if ("error" in result) { setDraftError(result.error); return; }

    // Applica fase 1: intended_purpose_explanation
    setDoc((prev) => {
      const n = {
        ...prev,
        context: { ...prev.context, intended_purpose_explanation: result.phase1_description },
        updatedAt: new Date().toISOString(),
      };
      debounceSave(n);
      return n;
    });

    // Applica fase 3: aggiungi scenari
    result.phase3_scenarios.forEach((s) => {
      const sc: import("@/lib/simulation/fria-engine").FRIAScenario = {
        id:           `fria-ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title:        s.scenario,
        description:  `Persone interessate: ${s.affectedPersons}. Likelihood: ${s.likelihood}/5.`,
        type:         "automated_decision",
        right_impacts: [],
      };
      setDoc((prev) => {
        const n = { ...prev, scenarios: [...prev.scenarios, sc], updatedAt: new Date().toISOString() };
        debounceSave(n);
        return n;
      });
    });

    setDraftGenerated(true);
  }

  // Pre-populate from Classifier
  const classifierData = useMemo(() => readFromStorage<ClassifierResult>("classifier"), []);
  useEffect(() => {
    if (classifierData?.systemName && !doc.system_name) {
      upDoc({ system_name: classifierData.systemName });
    }
  }, [classifierData]);

  // ── CONNECTION 2: Risk Manager → FRIA scenarios ───────────────────────────
  const [rmScenarios, setRmScenarios] = useState<Array<{
    id: string; title: string; likelihood: string; impact: string; mitigation: string;
  }>>([]);
  useEffect(() => {
    const riskData = readFromStorage<{
      risks?: Array<{ id: string; title: string; likelihood: string; impact: string; mitigation: string }>;
    }>("riskManager");
    if (riskData?.risks && riskData.risks.length > 0) {
      setRmScenarios(riskData.risks);
    }
  }, []);

  // ─── Persistence ─────────────────────────────────────────────────────────
  function debounceSave(d: FRIADocument) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      patchFRIA(() => d);
    }, 500);
  }

  // ─── Update helpers ───────────────────────────────────────────────────────
  function upDoc(patch: Partial<Pick<FRIADocument, "system_name" | "organization" | "responsible_team" | "fria_start_date">>) {
    setDoc((prev) => {
      const n = { ...prev, ...patch, updatedAt: new Date().toISOString() };
      debounceSave(n);
      // Sync shared fields that FRIA owns
      const sharedPatch: Partial<AssessmentShared> = {};
      if (patch.system_name !== undefined) sharedPatch.systemName = patch.system_name;
      if (patch.organization !== undefined) sharedPatch.organization = patch.organization;
      if (Object.keys(sharedPatch).length > 0) patchShared(sharedPatch);
      return n;
    });
  }
  function upCtx(patch: Record<string, unknown>) {
    setDoc((prev) => {
      const n = { ...prev, context: { ...prev.context, ...patch } as FRIADocument["context"], updatedAt: new Date().toISOString() };
      debounceSave(n); return n;
    });
  }
  function upDeploy(patch: Record<string, unknown>) {
    setDoc((prev) => {
      const n = { ...prev, deployment: { ...prev.deployment, ...patch } as FRIADocument["deployment"], updatedAt: new Date().toISOString() };
      debounceSave(n); return n;
    });
  }

  // ─── Scenario helpers ─────────────────────────────────────────────────────
  function addScenario() {
    const sc: FRIAScenario = { id: crypto.randomUUID(), title: `Scenario ${doc.scenarios.length + 1}`, description: "", type: "", right_impacts: [] };
    setDoc((prev) => { const n = { ...prev, scenarios: [...prev.scenarios, sc], updatedAt: new Date().toISOString() }; debounceSave(n); return n; });
    setActiveScenarioId(sc.id);
    setP2Tab("rights");
  }

  function addScenarioFromRM(title: string, description: string) {
    const sc: FRIAScenario = { id: crypto.randomUUID(), title, description, type: "operativo", right_impacts: [] };
    setDoc((prev) => { const n = { ...prev, scenarios: [...prev.scenarios, sc], updatedAt: new Date().toISOString() }; debounceSave(n); return n; });
    setActiveScenarioId(sc.id);
    setP2Tab("rights");
  }
  function upScenario(id: string, patch: Partial<Pick<FRIAScenario, "title" | "description" | "type">>) {
    setDoc((prev) => {
      const n = { ...prev, scenarios: prev.scenarios.map((s) => s.id === id ? { ...s, ...patch } : s), updatedAt: new Date().toISOString() };
      debounceSave(n); return n;
    });
  }
  function delScenario(id: string) {
    setDoc((prev) => { const n = { ...prev, scenarios: prev.scenarios.filter((s) => s.id !== id), updatedAt: new Date().toISOString() }; debounceSave(n); return n; });
    if (activeScenarioId === id) setActiveScenarioId(null);
  }
  function toggleRightImpact(scenarioId: string, rightId: string) {
    setDoc((prev) => {
      const sc = prev.scenarios.find((s) => s.id === scenarioId);
      if (!sc) return prev;
      const exists = sc.right_impacts.find((ri) => ri.right_id === rightId);
      const newImpacts: FRIARightImpact[] = exists
        ? sc.right_impacts.filter((ri) => ri.right_id !== rightId)
        : [...sc.right_impacts, {
            right_id: rightId,
            severity: { extent_of_interference: "", scope_of_impact: "", persons_affected: "", gravity: "", irreversibility: "", computed_severity: "" } satisfies FRIASeverityAssessment,
            likelihood: { likelihood: "", computed_priority: "" },
            notes: "", mitigations: [], residual_risk: "",
          }];
      const n = { ...prev, scenarios: prev.scenarios.map((s) => s.id === scenarioId ? { ...s, right_impacts: newImpacts } : s), updatedAt: new Date().toISOString() };
      debounceSave(n); return n;
    });
    setOpenRights((prev) => { const next = new Set(prev); next.has(rightId) ? next.delete(rightId) : next.add(rightId); return next; });
  }
  function upSeverity(scenarioId: string, rightId: string, patch: Partial<FRIASeverityAssessment>) {
    setDoc((prev) => {
      const n = {
        ...prev,
        scenarios: prev.scenarios.map((s) => s.id !== scenarioId ? s : {
          ...s, right_impacts: s.right_impacts.map((ri) => {
            if (ri.right_id !== rightId) return ri;
            const sev: FRIASeverityAssessment = { ...ri.severity, ...patch };
            sev.computed_severity = computeSeverity(sev);
            const lik = { ...ri.likelihood, computed_priority: computePriority(sev.computed_severity, ri.likelihood.likelihood) };
            return { ...ri, severity: sev, likelihood: lik };
          }),
        }),
        updatedAt: new Date().toISOString(),
      };
      debounceSave(n); return n;
    });
  }
  function upLikelihood(scenarioId: string, rightId: string, val: string) {
    const typedVal = val as FRIARightImpact["likelihood"]["likelihood"];
    setDoc((prev) => {
      const n = {
        ...prev,
        scenarios: prev.scenarios.map((s) => s.id !== scenarioId ? s : {
          ...s, right_impacts: s.right_impacts.map((ri) => {
            if (ri.right_id !== rightId) return ri;
            const lik = { likelihood: typedVal, computed_priority: computePriority(ri.severity.computed_severity, typedVal) };
            return { ...ri, likelihood: lik };
          }),
        }),
        updatedAt: new Date().toISOString(),
      };
      debounceSave(n); return n;
    });
  }
  function upRightImpact(scenarioId: string, rightId: string, patch: Partial<Pick<FRIARightImpact, "notes" | "residual_risk">>) {
    setDoc((prev) => {
      const n = { ...prev, scenarios: prev.scenarios.map((s) => s.id !== scenarioId ? s : { ...s, right_impacts: s.right_impacts.map((ri) => ri.right_id !== rightId ? ri : { ...ri, ...patch }) }), updatedAt: new Date().toISOString() };
      debounceSave(n); return n;
    });
  }
  function addMitigation(scenarioId: string, rightId: string) {
    const m: FRIAMitigationMeasure = { id: crypto.randomUUID(), description: "", category: "", responsible: "", deadline: "", status: "" };
    setDoc((prev) => {
      const n = { ...prev, scenarios: prev.scenarios.map((s) => s.id !== scenarioId ? s : { ...s, right_impacts: s.right_impacts.map((ri) => ri.right_id !== rightId ? ri : { ...ri, mitigations: [...ri.mitigations, m] }) }), updatedAt: new Date().toISOString() };
      debounceSave(n); return n;
    });
  }
  function upMitigation(scenarioId: string, rightId: string, mitId: string, patch: Partial<FRIAMitigationMeasure>) {
    setDoc((prev) => {
      const n = { ...prev, scenarios: prev.scenarios.map((s) => s.id !== scenarioId ? s : { ...s, right_impacts: s.right_impacts.map((ri) => ri.right_id !== rightId ? ri : { ...ri, mitigations: ri.mitigations.map((m) => m.id !== mitId ? m : { ...m, ...patch }) }) }), updatedAt: new Date().toISOString() };
      debounceSave(n); return n;
    });
  }
  function delMitigation(scenarioId: string, rightId: string, mitId: string) {
    setDoc((prev) => {
      const n = { ...prev, scenarios: prev.scenarios.map((s) => s.id !== scenarioId ? s : { ...s, right_impacts: s.right_impacts.map((ri) => ri.right_id !== rightId ? ri : { ...ri, mitigations: ri.mitigations.filter((m) => m.id !== mitId) }) }), updatedAt: new Date().toISOString() };
      debounceSave(n); return n;
    });
  }

  // ─── Monitoring helpers ────────────────────────────────────────────────────
  function addMonItem() {
    const item: FRIAMonitoringItem = { id: crypto.randomUUID(), what: "", frequency: "", responsible: "" };
    setDoc((prev) => { const n = { ...prev, monitoring: { ...prev.monitoring, items: [...prev.monitoring.items, item] }, updatedAt: new Date().toISOString() }; debounceSave(n); return n; });
  }
  function upMonItem(id: string, patch: Partial<Omit<FRIAMonitoringItem, "id">>) {
    setDoc((prev) => { const n = { ...prev, monitoring: { ...prev.monitoring, items: prev.monitoring.items.map((i) => i.id !== id ? i : { ...i, ...patch }) }, updatedAt: new Date().toISOString() }; debounceSave(n); return n; });
  }
  function delMonItem(id: string) {
    setDoc((prev) => { const n = { ...prev, monitoring: { ...prev.monitoring, items: prev.monitoring.items.filter((i) => i.id !== id) }, updatedAt: new Date().toISOString() }; debounceSave(n); return n; });
  }
  function toggleTrigger(t: string) {
    setDoc((prev) => {
      const triggers = prev.monitoring.update_triggers.includes(t)
        ? prev.monitoring.update_triggers.filter((x) => x !== t)
        : [...prev.monitoring.update_triggers, t];
      const n = { ...prev, monitoring: { ...prev.monitoring, update_triggers: triggers }, updatedAt: new Date().toISOString() }; debounceSave(n); return n;
    });
  }
  function addUpdateRecord() {
    const rec = { id: crypto.randomUUID(), date: new Date().toISOString().slice(0, 10), reason: "", updater: "", summary: "" };
    setDoc((prev) => { const n = { ...prev, monitoring: { ...prev.monitoring, update_history: [rec, ...prev.monitoring.update_history] }, updatedAt: new Date().toISOString() }; debounceSave(n); return n; });
  }
  function upUpdateRecord(id: string, patch: Record<string, string>) {
    setDoc((prev) => { const n = { ...prev, monitoring: { ...prev.monitoring, update_history: prev.monitoring.update_history.map((r) => r.id !== id ? r : { ...r, ...patch }) }, updatedAt: new Date().toISOString() }; debounceSave(n); return n; });
  }

  // ─── Stakeholder helpers ───────────────────────────────────────────────────
  function addStakeholder() {
    const s: FRIAStakeholder = { id: crypto.randomUUID(), name: "", organization: "", category: "", engagement_method: "", phases: [], status: "" };
    setDoc((prev) => { const n = { ...prev, stakeholders: [...prev.stakeholders, s], updatedAt: new Date().toISOString() }; debounceSave(n); return n; });
  }
  function upStakeholder(id: string, patch: Partial<Omit<FRIAStakeholder, "id" | "phases">>) {
    setDoc((prev) => { const n = { ...prev, stakeholders: prev.stakeholders.map((s) => s.id !== id ? s : { ...s, ...patch }), updatedAt: new Date().toISOString() }; debounceSave(n); return n; });
  }
  function delStakeholder(id: string) {
    setDoc((prev) => { const n = { ...prev, stakeholders: prev.stakeholders.filter((s) => s.id !== id), updatedAt: new Date().toISOString() }; debounceSave(n); return n; });
  }
  function addEngagement() {
    const e: FRIAEngagementLog = { id: crypto.randomUUID(), date: new Date().toISOString().slice(0, 10), stakeholder_id: "", method: "", findings: "", how_incorporated: "" };
    setDoc((prev) => { const n = { ...prev, engagement_log: [...prev.engagement_log, e], updatedAt: new Date().toISOString() }; debounceSave(n); return n; });
  }
  function upEngagement(id: string, patch: Record<string, string>) {
    setDoc((prev) => { const n = { ...prev, engagement_log: prev.engagement_log.map((e) => e.id !== id ? e : { ...e, ...patch }), updatedAt: new Date().toISOString() }; debounceSave(n); return n; });
  }
  function delEngagement(id: string) {
    setDoc((prev) => { const n = { ...prev, engagement_log: prev.engagement_log.filter((e) => e.id !== id), updatedAt: new Date().toISOString() }; debounceSave(n); return n; });
  }

  // ─── Dossier / export ─────────────────────────────────────────────────────
  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000);
  }

  async function handleAiPublicSummary() {
    setLoadingAiSummary(true);
    const r = await draftFriaPublicSummary(doc);
    setLoadingAiSummary(false);
    if ("error" in r) { showToast(r.error, "error"); return; }
    upDeploy({ public_summary: r.summary });
    setAiSummaryIsFromAI(true);
  }

  function saveToDossier() {
    const completedAt = new Date().toISOString();
    const overallRisk = getOverallFRIARisk(doc);
    const completeness = calculateFRIACompleteness(doc);
    writeToStorage<FRIAResult>("fria", {
      systemName: doc.system_name || "Sistema AI",
      organizationName: doc.organization || undefined,
      overallRisk, completeness,
      status: doc.status ?? "draft",
      approvedBy: doc.deployment.approver_name || undefined,
      completedAt,
    });
    appendEvidence("adr", {
      type: "FRIA Art. 27 — Valutazione Impatto Diritti Fondamentali",
      systemName: doc.system_name, organization: doc.organization,
      totalScenarios: doc.scenarios.length, overallRisk,
      completeness: `${completeness}%`, recommendation: doc.deployment.recommendation, savedAt: completedAt,
    }, "fria");
    patchFRIA(() => doc);
    syncCorrelatedRisksFromFRIA();
    setDossierSavedAt(completedAt);
    showToast("FRIA salvata nel dossier di compliance");
  }
  function exportReport() {
    const blob = new Blob([JSON.stringify({ export_type: "FRIA Art. 27 EU AI Act", exported_at: new Date().toISOString(), document: doc }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `fria-${(doc.system_name || "doc").replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url); showToast("FRIA esportata");
  }

  // ─── Derived ──────────────────────────────────────────────────────────────
  const completeness = calculateFRIACompleteness(doc);
  const overallRisk = getOverallFRIARisk(doc);
  const activeScenario = doc.scenarios.find((s) => s.id === activeScenarioId) ?? null;

  // ─── Phase 1 render ───────────────────────────────────────────────────────
  function renderPhase1() {
    const c = doc.context;
    type SecId = "A" | "B" | "C";
    const sections: { id: SecId; label: string; fields: number; filled: number }[] = [
      { id: "A", label: "A — Contesto di deployment", fields: 11,
        filled: [c.intended_purpose_match, c.timeframe, c.frequency, c.legal_basis, c.dpia_done, c.main_users, c.affected_persons, c.legal_framework, c.complaint_mechanisms, c.intended_purpose_explanation, c.dpia_explanation].filter(Boolean).length },
      { id: "B", label: "B — Caratteristiche del sistema AI", fields: 13,
        filled: [c.technology_overview, c.has_generative_component, c.training_data_types, c.gdpr_provider_compliance_confidence, c.training_data_representative, c.bias_assessed, c.data_quality_sufficient, c.processes_personal_data, c.personal_data_types, c.gdpr_processing_compliant, c.controls_input_data, c.input_data_representative, c.accuracy_acceptable].filter(Boolean).length },
      { id: "C", label: "C — Governance", fields: 5,
        filled: [c.substantial_modifications_planned, c.human_oversight_assigned, c.oversight_persons_trained, c.workers_informed, c.affected_persons_informed].filter(Boolean).length },
    ];
    const yNP = [{ value: "yes", label: "Sì" }, { value: "no", label: "No" }, { value: "partial", label: "Parzialmente" }];
    const yN  = [{ value: "yes", label: "Sì" }, { value: "no", label: "No" }];
    const hml = [{ value: "high", label: "Alto" }, { value: "medium", label: "Medio" }, { value: "low", label: "Basso" }];

    return (
      <div>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: T.text, margin: 0 }}>Fase 1 — Analisi del contesto</h2>
          <p style={{ marginTop: 4, fontSize: 13, color: T.muted }}>Cluster A: contesto di deployment · Cluster B: caratteristiche AI · Cluster C: governance</p>
        </div>
        <ContextCatalog onApply={(patch) => upCtx(patch)} />
        {sections.map((sec) => {
          const open = openAcc.has(sec.id);
          const pct = Math.round((sec.filled / sec.fields) * 100);
          return (
            <div key={sec.id} style={{ ...cardSt, marginBottom: 12 }}>
              <button
                onClick={() => setOpenAcc((prev) => { const n = new Set(prev); n.has(sec.id) ? n.delete(sec.id) : n.add(sec.id); return n; })}
                style={{ width: "100%", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{sec.label}</span>
                  <Badge label={`${sec.filled}/${sec.fields}`} color={pct === 100 ? "green" : pct > 50 ? "amber" : "gray"} />
                </div>
                {open ? <ChevronDown style={{ width: 15, height: 15, color: T.muted }} /> : <ChevronRight style={{ width: 15, height: 15, color: T.muted }} />}
              </button>
              {open && (
                <div style={{ padding: "0 20px 20px" }}>
                  {sec.id === "A" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
                      <Sel label="Corrispondenza con finalità prevista" value={c.intended_purpose_match}
                        options={yNP} onChange={(v) => upCtx({ intended_purpose_match: v })} />
                      <Inp label="Spiegazione" value={c.intended_purpose_explanation}
                        onChange={(v) => upCtx({ intended_purpose_explanation: v })} ph="Descrivi eventuali discrepanze" />
                      <Inp label="Periodo/timeframe di utilizzo" value={c.timeframe}
                        onChange={(v) => upCtx({ timeframe: v })} ph="es. 2025–2027" />
                      <Inp label="Frequenza d'uso" value={c.frequency}
                        onChange={(v) => upCtx({ frequency: v })} ph="es. quotidiano, mensile" />
                      <Txt label="Base giuridica" value={c.legal_basis}
                        onChange={(v) => upCtx({ legal_basis: v })} rows={2} ph="es. Art. 6(1)(e) GDPR, contratto…" />
                      <Sel label="DPIA completata" value={c.dpia_done}
                        options={[{ value: "yes", label: "Sì" }, { value: "no", label: "No" }, { value: "in_progress", label: "In corso" }]}
                        onChange={(v) => upCtx({ dpia_done: v })} />
                      <Inp label="Principali utilizzatori del sistema" value={c.main_users}
                        onChange={(v) => upCtx({ main_users: v })} ph="es. HR, supervisori, operatori pubblici" />
                      <Inp label="Persone interessate dalle decisioni" value={c.affected_persons}
                        onChange={(v) => upCtx({ affected_persons: v })} ph="es. candidati, utenti di servizi" />
                      <Txt label="Quadro giuridico applicabile" value={c.legal_framework}
                        onChange={(v) => upCtx({ legal_framework: v })} rows={2} ph="Normative, regolamenti settoriali…" />
                      <Txt label="Meccanismi di reclamo" value={c.complaint_mechanisms}
                        onChange={(v) => upCtx({ complaint_mechanisms: v })} rows={2} ph="Dove le persone possono presentare reclamo" />
                    </div>
                  )}
                  {sec.id === "B" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
                      <Txt label="Panoramica tecnologica" value={c.technology_overview}
                        onChange={(v) => upCtx({ technology_overview: v })} rows={3} ph="Descrivi il sistema e le sue funzionalità…" />
                      <Sel label="Componente generativa (LLM/Diffusion)" value={c.has_generative_component}
                        options={[{ value: "yes", label: "Sì" }, { value: "no", label: "No" }, { value: "unknown", label: "Non noto" }]}
                        onChange={(v) => upCtx({ has_generative_component: v })} />
                      <Inp label="Tipi di dati di training" value={c.training_data_types}
                        onChange={(v) => upCtx({ training_data_types: v })} ph="es. testi web, CV, immagini…" />
                      <Sel label="Fiducia nella conformità GDPR del provider" value={c.gdpr_provider_compliance_confidence}
                        options={hml} onChange={(v) => upCtx({ gdpr_provider_compliance_confidence: v })} />
                      <Sel label="Dati di training rappresentativi" value={c.training_data_representative}
                        options={yNP} onChange={(v) => upCtx({ training_data_representative: v })} />
                      <Sel label="Bias valutato" value={c.bias_assessed}
                        options={yNP} onChange={(v) => upCtx({ bias_assessed: v })} />
                      <Sel label="Qualità dei dati sufficiente" value={c.data_quality_sufficient}
                        options={yNP} onChange={(v) => upCtx({ data_quality_sufficient: v })} />
                      <Sel label="Tratta dati personali" value={c.processes_personal_data}
                        options={yN} onChange={(v) => upCtx({ processes_personal_data: v })} />
                      <Inp label="Tipi di dati personali trattati" value={c.personal_data_types}
                        onChange={(v) => upCtx({ personal_data_types: v })} ph="es. nome, CV, dati biometrici" />
                      <Sel label="Trattamento GDPR conforme" value={c.gdpr_processing_compliant}
                        options={yNP} onChange={(v) => upCtx({ gdpr_processing_compliant: v })} />
                      <Sel label="Controllo sui dati in input" value={c.controls_input_data}
                        options={yN} onChange={(v) => upCtx({ controls_input_data: v })} />
                      <Sel label="Dati in input rappresentativi" value={c.input_data_representative}
                        options={yNP} onChange={(v) => upCtx({ input_data_representative: v })} />
                      <Sel label="Accuratezza accettabile" value={c.accuracy_acceptable}
                        options={yNP} onChange={(v) => upCtx({ accuracy_acceptable: v })} />
                    </div>
                  )}
                  {sec.id === "C" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
                      <Sel label="Modifiche sostanziali pianificate" value={c.substantial_modifications_planned}
                        options={yN} onChange={(v) => upCtx({ substantial_modifications_planned: v })} />
                      <Sel label="Supervisione umana assegnata" value={c.human_oversight_assigned}
                        options={yN} onChange={(v) => upCtx({ human_oversight_assigned: v })} />
                      <Sel label="Supervisori formati adeguatamente" value={c.oversight_persons_trained}
                        options={yNP} onChange={(v) => upCtx({ oversight_persons_trained: v })} />
                      <Sel label="Lavoratori informati (Art. 26(7))" value={c.workers_informed}
                        options={[{ value: "yes", label: "Sì" }, { value: "no", label: "No" }, { value: "na", label: "N/A" }]}
                        onChange={(v) => upCtx({ workers_informed: v })} />
                      <Sel label="Persone interessate informate" value={c.affected_persons_informed}
                        options={yNP} onChange={(v) => upCtx({ affected_persons_informed: v })} />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ─── Phase 2 render ───────────────────────────────────────────────────────
  function renderPhase2() {
    return (
      <div>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: T.text, margin: 0 }}>Fase 2 — Sviluppo scenari e impatto</h2>
          <p style={{ marginTop: 4, fontSize: 13, color: T.muted }}>Identifica scenari tipici e worst-case. Valuta l&apos;impatto su ciascun diritto fondamentale.</p>
        </div>

        {/* ── Risk Manager suggestions banner ──────────────────────────── */}
        {rmScenarios.length > 0 && (
          <div style={{
            padding: "10px 14px", borderRadius: 8, marginBottom: 16,
            background: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.2)",
          }}>
            <p style={{ fontSize: 12, color: "#d97706", margin: "0 0 8px", fontWeight: 500 }}>
              <strong>{rmScenarios.length} rischi</strong> pre-caricati dal Risk Manager.
              Puoi aggiungerli come scenari di partenza per questa fase.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {rmScenarios.map((r) => (
                <button key={r.id}
                  onClick={() => addScenarioFromRM(
                    r.title,
                    `Rischio importato dal Risk Manager — likelihood: ${r.likelihood}, impact: ${r.impact}${r.mitigation ? `. Mitigazione proposta: ${r.mitigation}` : ""}`
                  )}
                  style={{
                    textAlign: "left", fontSize: 12, padding: "4px 10px",
                    borderRadius: 6, border: "1px solid rgba(217,119,6,0.3)",
                    background: "white", cursor: "pointer", color: T.amber,
                  }}>
                  + Aggiungi scenario: {r.title}
                  <span style={{ marginLeft: 6, opacity: 0.6 }}>
                    ({r.likelihood} / {r.impact})
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
          {/* Scenario list */}
          <div style={{ width: 196, flexShrink: 0 }}>
            <div style={{ ...cardSt, overflow: "hidden" }}>
              <div style={{ padding: "10px 12px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Scenari</span>
                <button onClick={addScenario} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, background: T.text, color: "#fff", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>
                  <Plus style={{ width: 11, height: 11 }} /> Nuovo
                </button>
              </div>
              {doc.scenarios.length === 0 ? (
                <div style={{ padding: "24px 12px", textAlign: "center", fontSize: 12, color: T.muted }}>Nessuno scenario</div>
              ) : (
                doc.scenarios.map((s) => (
                  <button key={s.id} onClick={() => { setActiveScenarioId(s.id); setP2Tab("rights"); }}
                    style={{ width: "100%", padding: "10px 12px", textAlign: "left", background: activeScenarioId === s.id ? T.bg : "none", border: "none", borderBottom: `1px solid ${T.border}`, cursor: "pointer" }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: T.text, marginBottom: 2 }}>{s.title || "Senza titolo"}</div>
                    <div style={{ fontSize: 10, color: T.muted }}>{s.right_impacts.length} dir. · {s.type || "—"}</div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Scenario detail */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {!activeScenario ? (
              <div style={{ ...cardSt, padding: 40, textAlign: "center" }}>
                <AlertTriangle style={{ width: 32, height: 32, color: T.border, margin: "0 auto 12px" }} />
                <p style={{ fontSize: 13, color: T.muted }}>Seleziona uno scenario dalla lista o creane uno nuovo</p>
              </div>
            ) : (
              <div style={{ ...cardSt }}>
                {/* Scenario meta */}
                <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}` }}>
                  <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, fontWeight: 500, color: T.muted, display: "block", marginBottom: 4 }}>Titolo scenario</label>
                      <input value={activeScenario.title} onChange={(e) => upScenario(activeScenario.id, { title: e.target.value })} style={inputSt} />
                    </div>
                    <div style={{ width: 160 }}>
                      <label style={{ fontSize: 11, fontWeight: 500, color: T.muted, display: "block", marginBottom: 4 }}>Tipo</label>
                      <select value={activeScenario.type} onChange={(e) => upScenario(activeScenario.id, { type: e.target.value as FRIAScenario["type"] })} style={inputSt}>
                        <option value="">— tipo —</option>
                        <option value="typical">Tipico</option>
                        <option value="worst_case">Worst case</option>
                      </select>
                    </div>
                    <button onClick={() => delScenario(activeScenario.id)} style={{ alignSelf: "flex-end", padding: 7, borderRadius: 8, border: `1px solid ${T.redBdr}`, background: T.redBg, cursor: "pointer" }}>
                      <Trash2 style={{ width: 13, height: 13, color: T.red }} />
                    </button>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 500, color: T.muted, display: "block", marginBottom: 4 }}>Descrizione</label>
                    <textarea value={activeScenario.description} onChange={(e) => upScenario(activeScenario.id, { description: e.target.value })} rows={2}
                      placeholder="Descrivi lo scenario di utilizzo…" style={{ ...inputSt, resize: "vertical" }} />
                  </div>
                </div>

                {/* Tabs */}
                <div style={{ display: "flex", padding: "0 20px", borderBottom: `1px solid ${T.border}` }}>
                  {([{ id: "rights", label: "Valutazione diritti" }, { id: "matrix", label: "Matrice rischi 3×3" }] as const).map((t) => (
                    <button key={t.id} onClick={() => setP2Tab(t.id)}
                      style={{ padding: "10px 16px", fontSize: 12, fontWeight: p2Tab === t.id ? 600 : 400, color: p2Tab === t.id ? T.text : T.muted, background: "none", border: "none", borderBottom: p2Tab === t.id ? `2px solid ${T.text}` : "2px solid transparent", cursor: "pointer" }}>
                      {t.label}
                    </button>
                  ))}
                </div>

                {p2Tab === "rights" && (
                  <div style={{ padding: "16px 20px", maxHeight: 540, overflow: "auto" }}>
                    {/* Catalog toggle */}
                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                      <button onClick={() => setShowCatalog(v => !v)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: `1px solid ${T.border}`, background: showCatalog ? T.text : T.card, color: showCatalog ? "#fff" : T.muted, cursor: "pointer" }}>
                        {showCatalog ? "✕ Chiudi catalogo" : "📋 Seleziona da catalogo"}
                      </button>
                    </div>
                    {showCatalog && (
                      <RightsCatalog
                        selectedRightIds={activeScenario.right_impacts.map((ri) => ri.right_id)}
                        onSelectRight={(rightId) => toggleRightImpact(activeScenario.id, rightId)}
                      />
                    )}
                    {/* Prioritizzazione visibile */}
                    {activeScenario.right_impacts.length > 1 && (() => {
                      const sorted = [...activeScenario.right_impacts]
                        .filter(ri => ri.likelihood.computed_priority)
                        .sort((a, b) => {
                          const rank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
                          return (rank[b.likelihood.computed_priority] ?? 0) - (rank[a.likelihood.computed_priority] ?? 0);
                        });
                      if (sorted.length === 0) return null;
                      const sevColors: Record<string, string> = { critical: "#dc2626", high: "#d97706", medium: "#d97706", low: "#16a34a" };
                      return (
                        <div style={{ marginBottom: 16, padding: "10px 12px", background: T.bg, borderRadius: 8, border: `1px solid ${T.border}` }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: T.text, textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: 8 }}>
                            Prioritizzazione impatti — likelihood × severità
                          </p>
                          {sorted.map((ri, idx) => {
                            const r = FUNDAMENTAL_RIGHTS.find(f => f.id === ri.right_id);
                            const priority = ri.likelihood.computed_priority;
                            return (
                              <div key={ri.right_id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0", borderBottom: idx < sorted.length - 1 ? `1px solid ${T.border}` : "none" }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: T.faint, minWidth: 18 }}>#{idx + 1}</span>
                                <span style={{ fontSize: 11, color: T.text, flex: 1 }}>{r?.name ?? ri.right_id}</span>
                                <span style={{ fontSize: 10, fontWeight: 600, color: sevColors[priority] ?? T.muted, background: "rgba(0,0,0,0.04)", padding: "1px 6px", borderRadius: 9999 }}>
                                  {priority?.toUpperCase()}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                    {RIGHTS_GROUPS.map((grp) => {
                      const rights = FUNDAMENTAL_RIGHTS.filter((r) => grp.rightIds.includes(r.id));
                      const openGrp = openRightGroups.has(grp.id);
                      const selCount = rights.filter((r) => activeScenario.right_impacts.some((ri) => ri.right_id === r.id)).length;
                      return (
                        <div key={grp.id} style={{ marginBottom: 8, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
                          <button onClick={() => setOpenRightGroups((prev) => { const n = new Set(prev); n.has(grp.id) ? n.delete(grp.id) : n.add(grp.id); return n; })}
                            style={{ width: "100%", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", background: openGrp ? T.bg : T.card, border: "none", cursor: "pointer" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{grp.label}</span>
                              {selCount > 0 && <Badge label={`${selCount} sel.`} color="gray" />}
                            </div>
                            {openGrp ? <ChevronDown style={{ width: 13, height: 13, color: T.muted }} /> : <ChevronRight style={{ width: 13, height: 13, color: T.muted }} />}
                          </button>
                          {openGrp && (
                            <div style={{ padding: "8px 14px 12px" }}>
                              {rights.map((right) => {
                                const impact = activeScenario.right_impacts.find((ri) => ri.right_id === right.id);
                                const checked = !!impact;
                                const openAssess = openRights.has(right.id);
                                return (
                                  <div key={right.id} style={{ marginBottom: checked ? 8 : 0 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
                                      <input type="checkbox" checked={checked} onChange={() => toggleRightImpact(activeScenario.id, right.id)} style={{ cursor: "pointer", flexShrink: 0 }} />
                                      <span style={{ fontSize: 12, color: checked ? T.text : T.muted, fontWeight: checked ? 500 : 400, flex: 1 }}>{right.name}</span>
                                      <span style={{ fontSize: 10, color: T.faint }}>{right.charter_art}</span>
                                      {right.is_absolute && <Badge label="assoluto" color="red" />}
                                      {checked && (
                                        <button onClick={() => setOpenRights((prev) => { const n = new Set(prev); n.has(right.id) ? n.delete(right.id) : n.add(right.id); return n; })}
                                          style={{ fontSize: 10, color: T.text, background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}>
                                          {openAssess ? "chiudi ↑" : "valuta ↓"}
                                        </button>
                                      )}
                                    </div>
                                    {checked && openAssess && impact && (
                                      <div style={{ marginLeft: 22, marginBottom: 8, padding: 14, background: T.bg, borderRadius: 8, border: `1px solid ${T.border}` }}>
                                        {/* Sector risk hints from ECNL/DIHR catalogue */}
                                        {(() => {
                                          const sectorHints = Object.entries(right.sector_risks ?? {}).filter(([, v]) => v && v.trim().length > 0);
                                          if (sectorHints.length === 0) return null;
                                          const sectorLabel: Record<string, string> = {
                                            biometrics: "Biometria", education: "Educazione",
                                            employment: "Occupazione/Lavoro", essential_services: "Servizi essenziali",
                                            law_enforcement: "Forze dell'ordine", migration: "Migrazione", justice: "Giustizia",
                                          };
                                          return (
                                            <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 7, background: "rgba(0,0,0,0.04)", border: `1px solid ${T.border}` }}>
                                              <div style={{ fontSize: 10, fontWeight: 600, color: T.text, textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: 7 }}>
                                                Rischi documentati ECNL/DIHR per settore
                                              </div>
                                              <div style={{ display: "flex", flexDirection: "column" as const, gap: 4 }}>
                                                {sectorHints.map(([sector, desc]) => (
                                                  <div key={sector} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                                                    <span style={{ fontSize: 10, fontWeight: 600, color: T.text, minWidth: 120, flexShrink: 0 }}>{sectorLabel[sector] ?? sector}</span>
                                                    <span style={{ fontSize: 11, color: T.text, lineHeight: 1.4 }}>{desc}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          );
                                        })()}
                                        <RightImpactAIDraft
                                          systemName={doc.system_name || "Sistema AI"}
                                          systemDescription={doc.context.technology_overview || ""}
                                          riskLevel={""}
                                          scenarioTitle={activeScenario.title}
                                          scenarioDescription={activeScenario.description}
                                          rightId={right.id}
                                          rightName={right.name}
                                          rightDescription={right.description}
                                          triggerQuestions={right.triggerQuestions}
                                          onApply={(sevPatch, likelihood, note) => {
                                            upSeverity(activeScenario.id, right.id, sevPatch as Partial<FRIASeverityAssessment>);
                                            upLikelihood(activeScenario.id, right.id, likelihood);
                                            if (note) upRightImpact(activeScenario.id, right.id, { notes: note });
                                          }}
                                        />
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                                          <Sel label="Entità interferenza" value={impact.severity.extent_of_interference}
                                            options={[
                                              { value: "very_serious", label: "Molto grave (nucleo del diritto)" },
                                              { value: "serious", label: "Grave" },
                                              { value: "moderate", label: "Moderata" },
                                              { value: "minor", label: "Minore" },
                                              { value: "none", label: "Nessuna" },
                                            ]}
                                            onChange={(v) => upSeverity(activeScenario.id, right.id, { extent_of_interference: v as FRIASeverityAssessment["extent_of_interference"] })} />
                                          <Sel label="Portata (scope)" value={impact.severity.scope_of_impact}
                                            options={[
                                              { value: "systemic", label: "Sistemico" },
                                              { value: "large_group", label: "Gruppo esteso" },
                                              { value: "group", label: "Gruppo" },
                                              { value: "individual", label: "Individuale" },
                                            ]}
                                            onChange={(v) => upSeverity(activeScenario.id, right.id, { scope_of_impact: v as FRIASeverityAssessment["scope_of_impact"] })} />
                                          <Sel label="Persone interessate" value={impact.severity.persons_affected}
                                            options={[
                                              { value: "very_many", label: "Moltissime" },
                                              { value: "many", label: "Molte" },
                                              { value: "few", label: "Poche" },
                                            ]}
                                            onChange={(v) => upSeverity(activeScenario.id, right.id, { persons_affected: v as FRIASeverityAssessment["persons_affected"] })} />
                                          <Sel label="Gravità" value={impact.severity.gravity}
                                            options={[
                                              { value: "critical", label: "Critica" },
                                              { value: "high", label: "Alta" },
                                              { value: "medium", label: "Media" },
                                              { value: "low", label: "Bassa" },
                                            ]}
                                            onChange={(v) => upSeverity(activeScenario.id, right.id, { gravity: v as FRIASeverityAssessment["gravity"] })} />
                                          <Sel label="Reversibilità" value={impact.severity.irreversibility}
                                            options={[
                                              { value: "irreversible", label: "Irreversibile" },
                                              { value: "partially", label: "Parzialmente reversibile" },
                                              { value: "reversible", label: "Reversibile" },
                                            ]}
                                            onChange={(v) => upSeverity(activeScenario.id, right.id, { irreversibility: v as FRIASeverityAssessment["irreversibility"] })} />
                                          <div style={{ marginBottom: 12 }}>
                                            <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: T.muted, marginBottom: 4 }}>Severità calcolata</label>
                                            <div style={{ padding: "7px 0" }}>
                                              {impact.severity.computed_severity
                                                ? <Badge label={impact.severity.computed_severity.toUpperCase()} color={riskColorFor(impact.severity.computed_severity)} />
                                                : <span style={{ fontSize: 12, color: T.faint }}>— non calcolata —</span>}
                                            </div>
                                          </div>
                                          <Sel label="Probabilità" value={impact.likelihood.likelihood}
                                            options={[
                                              { value: "almost_certain", label: "Quasi certa" },
                                              { value: "likely", label: "Probabile" },
                                              { value: "possible", label: "Possibile" },
                                              { value: "negligible", label: "Trascurabile" },
                                            ]}
                                            onChange={(v) => upLikelihood(activeScenario.id, right.id, v)} />
                                          <div style={{ marginBottom: 12 }}>
                                            <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: T.muted, marginBottom: 4 }}>Priorità calcolata</label>
                                            <div style={{ padding: "7px 0" }}>
                                              {impact.likelihood.computed_priority
                                                ? <Badge label={impact.likelihood.computed_priority.toUpperCase()} color={riskColorFor(impact.likelihood.computed_priority)} />
                                                : <span style={{ fontSize: 12, color: T.faint }}>— non calcolata —</span>}
                                            </div>
                                          </div>
                                          <Sel label="Rischio residuo" value={impact.residual_risk}
                                            options={[{ value: "acceptable", label: "Accettabile" }, { value: "review", label: "Da rivedere" }, { value: "unacceptable", label: "Inaccettabile" }]}
                                            onChange={(v) => upRightImpact(activeScenario.id, right.id, { residual_risk: v as FRIARightImpact["residual_risk"] })} />
                                        </div>
                                        <Txt label="Note" value={impact.notes} onChange={(v) => upRightImpact(activeScenario.id, right.id, { notes: v })} rows={2} ph="Osservazioni specifiche…" />
                                        {/* Mitigations */}
                                        <div style={{ marginTop: 4 }}>
                                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                            <span style={{ fontSize: 11, fontWeight: 600, color: T.text }}>Mitigazioni ({impact.mitigations.length})</span>
                                            <button onClick={() => addMitigation(activeScenario.id, right.id)} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, background: T.text, color: "#fff", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>
                                              <Plus style={{ width: 10, height: 10 }} /> Aggiungi
                                            </button>
                                          </div>
                                          {impact.mitigations.map((m) => (
                                            <div key={m.id} style={{ marginBottom: 8, padding: 10, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8 }}>
                                              <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                                                <input value={m.description} onChange={(e) => upMitigation(activeScenario.id, right.id, m.id, { description: e.target.value })} placeholder="Descrizione misura…" style={{ ...inputSt, flex: 1 }} />
                                                <button onClick={() => delMitigation(activeScenario.id, right.id, m.id)} style={{ padding: 4, border: "none", background: "none", cursor: "pointer" }}>
                                                  <Trash2 style={{ width: 12, height: 12, color: T.red }} />
                                                </button>
                                              </div>
                                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 130px 1fr", gap: 6 }}>
                                                <select value={m.category} onChange={(e) => upMitigation(activeScenario.id, right.id, m.id, { category: e.target.value as FRIAMitigationMeasure["category"] })} style={inputSt}>
                                                  <option value="">Categoria</option>
                                                  <option value="organizational">Organizzativa</option>
                                                  <option value="technical">Tecnica</option>
                                                  <option value="contractual">Contrattuale</option>
                                                </select>
                                                <input value={m.responsible} onChange={(e) => upMitigation(activeScenario.id, right.id, m.id, { responsible: e.target.value })} placeholder="Responsabile" style={inputSt} />
                                                <input type="date" value={m.deadline} onChange={(e) => upMitigation(activeScenario.id, right.id, m.id, { deadline: e.target.value })} style={inputSt} />
                                                <select value={m.status} onChange={(e) => upMitigation(activeScenario.id, right.id, m.id, { status: e.target.value as FRIAMitigationMeasure["status"] })} style={inputSt}>
                                                  <option value="">Stato</option>
                                                  <option value="planned">Pianificata</option>
                                                  <option value="implemented">Implementata</option>
                                                  <option value="verified">Verificata</option>
                                                </select>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                        {/* What-If residual panel */}
                                        {impact.severity.computed_severity && (
                                          <div style={{ marginTop: 8, padding: "8px 10px", background: T.bg, borderRadius: 6, border: `1px solid ${T.border}` }}>
                                            <p style={{ fontSize: 10, fontWeight: 600, color: T.text, marginBottom: 4 }}>
                                              What-If: impatto residuo stimato
                                            </p>
                                            {(() => {
                                              const implemented = impact.mitigations.filter(m => m.status === "implemented" || m.status === "verified").length;
                                              const sevOrder = ["critical","high","medium","low"] as const;
                                              const currentIdx = sevOrder.indexOf(impact.severity.computed_severity as (typeof sevOrder)[number]);
                                              const residualIdx = Math.min(sevOrder.length - 1, currentIdx + (implemented > 0 ? 1 : 0));
                                              const residual = sevOrder[residualIdx] ?? impact.severity.computed_severity;
                                              const improved = residualIdx > currentIdx;
                                              const sevColors: Record<string, string> = { critical: "#dc2626", high: "#d97706", medium: "#d97706", low: "#16a34a" };
                                              return (
                                                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
                                                  <span style={{ color: sevColors[impact.severity.computed_severity] ?? T.muted, fontWeight: 600 }}>
                                                    {impact.severity.computed_severity.toUpperCase()}
                                                  </span>
                                                  {improved && <>
                                                    <span style={{ color: T.faint }}>→</span>
                                                    <span style={{ color: sevColors[residual] ?? T.muted, fontWeight: 600 }}>{residual.toUpperCase()}</span>
                                                    <span style={{ color: T.green, fontSize: 10 }}>({implemented} mitig. attive)</span>
                                                  </>}
                                                  {!improved && (
                                                    <span style={{ color: T.faint, fontSize: 10 }}>Nessuna mitigazione attiva — severità invariata</span>
                                                  )}
                                                </div>
                                              );
                                            })()}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {p2Tab === "matrix" && (
                  <div style={{ padding: "16px 20px" }}>
                    {activeScenario.right_impacts.length === 0 ? (
                      <p style={{ fontSize: 13, color: T.muted, textAlign: "center", padding: 32 }}>Nessun diritto valutato. Usa il tab &quot;Valutazione diritti&quot; per iniziare.</p>
                    ) : (
                      <div>
                        <p style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>Matrice probabilità × severità — scenario: <strong>{activeScenario.title}</strong></p>
                        <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr 1fr", gap: 3 }}>
                          <div style={{ fontSize: 10, color: T.faint, textAlign: "center" }} />
                          {["Alta severità", "Media severità", "Bassa severità"].map((h) => (
                            <div key={h} style={{ padding: "6px 8px", fontSize: 11, fontWeight: 600, color: T.muted, textAlign: "center", background: T.bg, borderRadius: 6 }}>{h}</div>
                          ))}
                          {(["high", "medium", "low"] as const).map((lik) => {
                            const rowLabel = lik === "high" ? "Alta prob." : lik === "medium" ? "Media prob." : "Bassa prob.";
                            return [
                              <div key={`lbl-${lik}`} style={{ padding: "8px", fontSize: 11, fontWeight: 600, color: T.muted, background: T.bg, borderRadius: 6, display: "flex", alignItems: "center" }}>{rowLabel}</div>,
                              ...(["high", "medium", "low"] as const).map((sev) => {
                                const cellItems = activeScenario.right_impacts.filter((ri) => ri.severity.computed_severity === sev && ri.likelihood.likelihood === lik);
                                const priority = computePriority(sev, lik);
                                const cellStyle = priority === "high"
                                  ? { bg: T.redBg, bdr: T.redBdr }
                                  : priority === "medium"
                                    ? { bg: T.amberBg, bdr: T.amberBdr }
                                    : { bg: T.greenBg, bdr: T.greenBdr };
                                return (
                                  <div key={`${lik}-${sev}`} style={{ padding: 8, minHeight: 64, background: cellItems.length > 0 ? cellStyle.bg : T.bg, border: `1px solid ${cellItems.length > 0 ? cellStyle.bdr : T.border}`, borderRadius: 6 }}>
                                    {cellItems.map((ri) => {
                                      const r = FUNDAMENTAL_RIGHTS.find((f) => f.id === ri.right_id);
                                      return <div key={ri.right_id} style={{ fontSize: 10, color: T.text, marginBottom: 2, lineHeight: 1.3 }}>{r?.name ?? ri.right_id}</div>;
                                    })}
                                    {cellItems.length === 0 && <span style={{ fontSize: 10, color: T.faint }}>—</span>}
                                  </div>
                                );
                              }),
                            ];
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Phase 3 render ───────────────────────────────────────────────────────
  function renderPhase3() {
    const d = doc.deployment;
    return (
      <div>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: T.text, margin: 0 }}>Fase 3 — Decisione di deployment</h2>
          <p style={{ marginTop: 4, fontSize: 13, color: T.muted }}>Valuta gli impatti residui, determina la raccomandazione e genera la sintesi pubblica.</p>
        </div>
        <FriaGapCheck
          doc={doc}
          onNavigateToPhase={(p) => setPhase(p as Phase)}
          onResult={setGapCheckResult}
        />
        {/* Absolute rights alert — ECNL/DIHR: cannot be balanced by proportionality */}
        {(() => {
          const absoluteImpacted = doc.scenarios.flatMap((s) => s.right_impacts).filter((ri) => {
            const rightDef = FUNDAMENTAL_RIGHTS.find((r) => r.id === ri.right_id);
            return rightDef?.is_absolute && (ri.severity.computed_severity === "high" || ri.severity.computed_severity === "medium");
          });
          if (absoluteImpacted.length === 0) return null;
          const names = [...new Set(absoluteImpacted.map((ri) => {
            const r = FUNDAMENTAL_RIGHTS.find((f) => f.id === ri.right_id);
            return r?.name ?? ri.right_id;
          }))];
          return (
            <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 8, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.25)", display: "flex", gap: 10, alignItems: "flex-start" }}>
              <AlertTriangle style={{ width: 16, height: 16, color: T.red, flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.red, marginBottom: 4 }}>
                  Diritti assoluti impattati — nessun bilanciamento ammissibile
                </div>
                <div style={{ fontSize: 12, color: "#7f1d1d", lineHeight: 1.5 }}>
                  {names.join(", ")} sono diritti assoluti ai sensi della Carta UE e della CEDU.
                  La loro limitazione non può essere giustificata da considerazioni di proporzionalità o necessità
                  (cfr. ECNL/DIHR Guide to FRIA, Dec 2025, §3.2). Se il sistema AI incide su questi diritti in modo significativo,
                  la raccomandazione deve essere <strong>non autorizzato al deployment</strong> oppure le misure di mitigazione
                  devono eliminare completamente l&apos;impatto.
                </div>
              </div>
            </div>
          );
        })()}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          <div style={{ ...cardSt, padding: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: "0 0 16px" }}>Impatti e proporzionalità</h3>
            <Txt label="Impatti residui dopo mitigazione" value={d.remaining_impacts_after_mitigation}
              onChange={(v) => upDeploy({ remaining_impacts_after_mitigation: v })} rows={4}
              ph="Descrivi gli impatti che rimangono dopo le misure di mitigazione…" />
            <Txt label="Necessità e proporzionalità (diritti qualificati)" value={d.qualified_rights_necessity_proportionality}
              onChange={(v) => upDeploy({ qualified_rights_necessity_proportionality: v })} rows={4}
              ph="Per i diritti non assoluti: perché la limitazione è necessaria e proporzionata?" />
          </div>
          <div style={{ ...cardSt, padding: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: "0 0 16px" }}>Raccomandazione</h3>
            {[
              { value: "deploy",                label: "✅ Autorizzato al deployment",        color: T.green, bg: T.greenBg, bdr: T.greenBdr },
              { value: "deploy_with_conditions", label: "⚠ Autorizzato con condizioni",        color: T.amber, bg: T.amberBg, bdr: T.amberBdr },
              { value: "do_not_deploy",          label: "❌ Non autorizzato al deployment",    color: T.red,   bg: T.redBg,   bdr: T.redBdr   },
            ].map((opt) => (
              <button key={opt.value} onClick={() => upDeploy({ recommendation: opt.value })}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", marginBottom: 8, borderRadius: 8, border: `1px solid ${d.recommendation === opt.value ? opt.bdr : T.border}`, background: d.recommendation === opt.value ? opt.bg : T.card, cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontSize: 12, fontWeight: d.recommendation === opt.value ? 600 : 400, color: d.recommendation === opt.value ? opt.color : T.muted }}>{opt.label}</span>
              </button>
            ))}
            {d.recommendation === "deploy_with_conditions" && (
              <Txt label="Condizioni obbligatorie" value={d.conditions} onChange={(v) => upDeploy({ conditions: v })} rows={3}
                ph="Elenca le condizioni da soddisfare prima del deployment…" />
            )}
            <Txt label="Giustificazione della decisione" value={d.decision_justification}
              onChange={(v) => upDeploy({ decision_justification: v })} rows={4}
              ph="Motivazione dettagliata della decisione…" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Inp label="Approvato da" value={d.approver_name} onChange={(v) => upDeploy({ approver_name: v })} ph="Nome e Cognome" />
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: T.muted, marginBottom: 4 }}>Data approvazione</label>
                <input type="date" value={d.approver_date} onChange={(e) => upDeploy({ approver_date: e.target.value })} style={inputSt} />
              </div>
            </div>
          </div>
        </div>

        {/* Public summary */}
        <div style={{ ...cardSt, padding: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: "0 0 2px" }}>Sintesi pubblica obbligatoria (Art. 27)</h3>
              {aiSummaryIsFromAI && (
                <span style={{ fontSize: 10, fontWeight: 700, color: T.amber, background: T.amberBg, padding: "1px 7px", borderRadius: 9999 }}>
                  ✦ AI — verifica e conferma
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => { const s = generatePublicSummary(doc); upDeploy({ public_summary: s }); setAiSummaryIsFromAI(false); showToast("Sintesi generata"); }}
                style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, background: T.bg, color: T.text, border: `1px solid ${T.border}`, borderRadius: 8, padding: "7px 14px", cursor: "pointer" }}
              >
                <FileText style={{ width: 13, height: 13 }} /> Genera sintesi
              </button>
              <button
                onClick={handleAiPublicSummary}
                disabled={loadingAiSummary}
                style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, background: loadingAiSummary ? T.bg : T.text, color: loadingAiSummary ? T.muted : "#fff", border: "none", borderRadius: 8, padding: "7px 14px", cursor: loadingAiSummary ? "default" : "pointer" }}
              >
                {loadingAiSummary ? "⟳ Generazione AI…" : "✦ Bozza AI"}
              </button>
            </div>
          </div>
          <textarea value={d.public_summary} onChange={(e) => upDeploy({ public_summary: e.target.value })} rows={14}
            placeholder="Clicca 'Genera sintesi' per creare automaticamente il testo basato sui dati inseriti…"
            style={{ ...inputSt, resize: "vertical", fontFamily: "monospace", fontSize: 11, lineHeight: 1.6 }} />
        </div>

        {/* Art. 27(2) — Notifica autorità di vigilanza */}
        {(d.recommendation === "deploy_with_conditions" || d.recommendation === "do_not_deploy") && (
          <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 8, background: T.amberBg, border: `1px solid ${T.amberBdr}`, display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>⚠</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.amber, marginBottom: 4 }}>
                Promemoria Art. 27(2) — Notifica all&apos;autorità di vigilanza
              </div>
              <div style={{ fontSize: 12, color: T.text, lineHeight: 1.5 }}>
                La raccomandazione non è &quot;deploy&quot; incondizionato. Ai sensi dell&apos;Art. 27(2) AI Act, il deployer
                ha l&apos;obbligo di notificare l&apos;autorità nazionale di vigilanza del mercato e documentare la notifica
                nella FRIA. [verifica contro il testo vigente dell&apos;AI Act]
              </div>
            </div>
          </div>
        )}

        {/* Rischi correlati DPIA ⇄ FRIA */}
        <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", padding: 20, marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#0D1016", margin: "0 0 6px" }}>
            Rischi correlati DPIA ⇄ FRIA
          </p>
          <p style={{ fontSize: 11, color: "rgba(0,0,0,0.40)", margin: "0 0 14px" }}>
            Rischi generati automaticamente dalla correlazione WP29 / DIHR. Applica le mitigazioni al Risk Manager.
          </p>
          <CorrelatedRisksPanel />
        </div>

        {/* SignOff */}
        <SignOffPanel toolKey="fria" toolLabel="FRIA Art. 27" />
      </div>
    );
  }

  // ─── Phase 4 render ───────────────────────────────────────────────────────
  function renderPhase4() {
    const mon = doc.monitoring;
    return (
      <div>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: T.text, margin: 0 }}>Fase 4 — Piano di monitoraggio</h2>
          <p style={{ marginTop: 4, fontSize: 13, color: T.muted }}>Definisci cosa monitorare, i trigger per l&apos;aggiornamento e mantieni lo storico delle revisioni.</p>
        </div>

        {/* Staleness warning */}
        {stalenessWarning && (
          <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 8, background: T.amberBg, border: `1px solid ${T.amberBdr}`, display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>⚠</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.amber, marginBottom: 4 }}>
                FRIA da rivedere — le circostanze iniziali sono cambiate
              </div>
              <div style={{ fontSize: 12, color: T.text, lineHeight: 1.5, marginBottom: 8 }}>
                I dati di input (sistema, contesto, persone interessate) sono cambiati rispetto all&apos;ultima firma.
                Verifica che la valutazione degli impatti e le misure di mitigazione siano ancora valide. [verifica contro il testo vigente dell&apos;AI Act]
              </div>
              <button
                onClick={() => {
                  const hash = computeFriaHash(doc);
                  writeToStorage("friaStaleness", { hash, savedAt: new Date().toISOString() });
                  setStalenessWarning(false);
                  showToast("Baseline aggiornata");
                }}
                style={{ fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 6, border: "none", background: T.text, color: "#fff", cursor: "pointer" }}
              >
                Segna come rivisto — salva nuova baseline
              </button>
            </div>
          </div>
        )}

        {/* Monitoring items */}
        <div style={{ ...cardSt, padding: 20, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: 0 }}>Elementi da monitorare</h3>
            <button onClick={addMonItem} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, background: T.text, color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer" }}>
              <Plus style={{ width: 11, height: 11 }} /> Aggiungi
            </button>
          </div>
          {mon.items.length === 0 ? (
            <p style={{ fontSize: 12, color: T.muted, padding: "8px 0" }}>Nessun elemento di monitoraggio definito.</p>
          ) : (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 160px 32px", gap: 8, marginBottom: 6 }}>
                {["Cosa monitorare", "Frequenza", "Responsabile", ""].map((h) => (
                  <div key={h} style={{ fontSize: 11, fontWeight: 600, color: T.muted }}>{h}</div>
                ))}
              </div>
              {mon.items.map((item) => (
                <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1fr 140px 160px 32px", gap: 8, marginBottom: 6 }}>
                  <input value={item.what} onChange={(e) => upMonItem(item.id, { what: e.target.value })} placeholder="es. Tasso di errore, bias metrics…" style={inputSt} />
                  <input value={item.frequency} onChange={(e) => upMonItem(item.id, { frequency: e.target.value })} placeholder="es. mensile" style={inputSt} />
                  <input value={item.responsible} onChange={(e) => upMonItem(item.id, { responsible: e.target.value })} placeholder="es. DPO" style={inputSt} />
                  <button onClick={() => delMonItem(item.id)} style={{ padding: 7, border: "none", background: "none", cursor: "pointer" }}>
                    <Trash2 style={{ width: 13, height: 13, color: T.red }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Update triggers */}
        <div style={{ ...cardSt, padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: "0 0 14px" }}>Trigger per aggiornamento FRIA</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            {DEFAULT_TRIGGERS.map((t) => (
              <label key={t} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 7, cursor: "pointer", background: mon.update_triggers.includes(t) ? "rgba(0,0,0,0.04)" : "none" }}>
                <input type="checkbox" checked={mon.update_triggers.includes(t)} onChange={() => toggleTrigger(t)} style={{ cursor: "pointer" }} />
                <span style={{ fontSize: 12, color: T.text }}>{t}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Update history */}
        <div style={{ ...cardSt, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: 0 }}>Storico aggiornamenti</h3>
            <button onClick={addUpdateRecord} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, background: T.text, color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer" }}>
              <Plus style={{ width: 11, height: 11 }} /> Nuovo record
            </button>
          </div>
          {mon.update_history.length === 0 ? (
            <p style={{ fontSize: 12, color: T.muted }}>Nessuna revisione registrata.</p>
          ) : (
            mon.update_history.map((rec) => (
              <div key={rec.id} style={{ marginBottom: 10, padding: 14, background: T.bg, borderRadius: 8, border: `1px solid ${T.border}` }}>
                <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr", gap: 8, marginBottom: 8 }}>
                  <input type="date" value={rec.date} onChange={(e) => upUpdateRecord(rec.id, { date: e.target.value })} style={inputSt} />
                  <input value={rec.reason} onChange={(e) => upUpdateRecord(rec.id, { reason: e.target.value })} placeholder="Motivo aggiornamento" style={inputSt} />
                  <input value={rec.updater} onChange={(e) => upUpdateRecord(rec.id, { updater: e.target.value })} placeholder="Redatto da" style={inputSt} />
                </div>
                <textarea value={rec.summary} onChange={(e) => upUpdateRecord(rec.id, { summary: e.target.value })} rows={2}
                  placeholder="Sintesi delle modifiche apportate…" style={{ ...inputSt, resize: "vertical" }} />
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // ─── Phase 5 render ───────────────────────────────────────────────────────
  function renderPhase5() {
    return (
      <div>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: T.text, margin: 0 }}>Fase 5 — Stakeholder e coinvolgimento</h2>
          <p style={{ marginTop: 4, fontSize: 13, color: T.muted }}>Mappa i portatori di interesse e documenta il processo di consultazione.</p>
        </div>

        {/* Impatti ad alto rischio che richiedono validazione stakeholder */}
        {(() => {
          const highImpacts = doc.scenarios.flatMap(s =>
            s.right_impacts
              .filter(ri => ri.severity?.computed_severity === "high" || ri.severity?.computed_severity === "critical")
              .map(ri => ({ scenarioTitle: s.title, rightId: ri.right_id, severity: ri.severity.computed_severity }))
          );
          if (highImpacts.length === 0) return null;
          const hasEngagement = doc.engagement_log.some(e => e.findings?.trim());
          return (
            <div style={{ marginBottom: 16, padding: "14px 16px", borderRadius: 10, background: T.card, border: `1px solid ${T.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Impatti ad alto rischio — validazione stakeholder</span>
                {hasEngagement
                  ? <span style={{ fontSize: 10, fontWeight: 700, color: T.green, background: T.greenBg, padding: "2px 8px", borderRadius: 9999 }}>✓ Engagement documentato</span>
                  : <span style={{ fontSize: 10, fontWeight: 700, color: T.amber, background: T.amberBg, padding: "2px 8px", borderRadius: 9999 }}>Consultazione raccomandata</span>
                }
              </div>
              <p style={{ fontSize: 12, color: T.muted, margin: "0 0 10px", lineHeight: 1.4 }}>
                {highImpacts.length} impatto/i ad alta severità identificati nella Fase 2. Documenta le consultazioni nel log qui sotto per validare queste valutazioni. [verifica contro il testo vigente dell&apos;AI Act]
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {highImpacts.slice(0, 5).map((imp, i) => {
                  const rightName = FUNDAMENTAL_RIGHTS.find(r => r.id === imp.rightId)?.name ?? imp.rightId;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6, background: imp.severity === "critical" ? T.redBg : T.amberBg, border: `1px solid ${imp.severity === "critical" ? T.redBdr : T.amberBdr}` }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: imp.severity === "critical" ? T.red : T.amber, minWidth: 60 }}>
                        {imp.severity === "critical" ? "CRITICO" : "ALTO"}
                      </span>
                      <span style={{ fontSize: 12, color: T.text }}>{rightName}</span>
                      <span style={{ fontSize: 11, color: T.muted }}>— {imp.scenarioTitle || "Scenario"}</span>
                    </div>
                  );
                })}
                {highImpacts.length > 5 && (
                  <p style={{ fontSize: 11, color: T.faint, margin: 0 }}>+ altri {highImpacts.length - 5} impatti</p>
                )}
              </div>
            </div>
          );
        })()}

        {/* Stakeholders */}
        <div style={{ ...cardSt, padding: 20, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: 0 }}>Stakeholder ({doc.stakeholders.length})</h3>
            <button onClick={addStakeholder} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, background: T.text, color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer" }}>
              <Plus style={{ width: 11, height: 11 }} /> Aggiungi
            </button>
          </div>
          {doc.stakeholders.length === 0 ? (
            <p style={{ fontSize: 12, color: T.muted, padding: "8px 0" }}>Nessun stakeholder mappato.</p>
          ) : (
            doc.stakeholders.map((s) => (
              <div key={s.id} style={{ marginBottom: 10, padding: 14, background: T.bg, borderRadius: 8, border: `1px solid ${T.border}` }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 28px", gap: 8, marginBottom: 8 }}>
                  <input value={s.name} onChange={(e) => upStakeholder(s.id, { name: e.target.value })} placeholder="Nome" style={inputSt} />
                  <input value={s.organization} onChange={(e) => upStakeholder(s.id, { organization: e.target.value })} placeholder="Organizzazione" style={inputSt} />
                  <select value={s.category} onChange={(e) => upStakeholder(s.id, { category: e.target.value as FRIAStakeholder["category"] })} style={inputSt}>
                    <option value="">Categoria</option>
                    <option value="primary_affected">Primari (soggetti interessati)</option>
                    <option value="secondary_intermediary">Secondari (intermediari)</option>
                    <option value="tertiary_broader">Terziari (sistema più ampio)</option>
                  </select>
                  <select value={s.status} onChange={(e) => upStakeholder(s.id, { status: e.target.value as FRIAStakeholder["status"] })} style={inputSt}>
                    <option value="">Stato</option>
                    <option value="identified">Identificato</option>
                    <option value="contacted">Contattato</option>
                    <option value="consulted">Consultato</option>
                    <option value="informed">Informato</option>
                  </select>
                  <button onClick={() => delStakeholder(s.id)} style={{ padding: 4, border: "none", background: "none", cursor: "pointer" }}>
                    <Trash2 style={{ width: 13, height: 13, color: T.red }} />
                  </button>
                </div>
                <input value={s.engagement_method} onChange={(e) => upStakeholder(s.id, { engagement_method: e.target.value })}
                  placeholder="Metodo di coinvolgimento (es. intervista, focus group, survey…)" style={inputSt} />
              </div>
            ))
          )}
        </div>

        {/* Engagement log */}
        <div style={{ ...cardSt, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: 0 }}>Log di engagement ({doc.engagement_log.length})</h3>
            <button onClick={addEngagement} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, background: T.text, color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer" }}>
              <Plus style={{ width: 11, height: 11 }} /> Aggiungi
            </button>
          </div>
          {doc.engagement_log.length === 0 ? (
            <p style={{ fontSize: 12, color: T.muted }}>Nessuna attività di engagement documentata.</p>
          ) : (
            doc.engagement_log.map((e) => (
              <div key={e.id} style={{ marginBottom: 10, padding: 14, background: T.bg, borderRadius: 8, border: `1px solid ${T.border}` }}>
                <div style={{ display: "grid", gridTemplateColumns: "130px 1fr 1fr 28px", gap: 8, marginBottom: 8 }}>
                  <input type="date" value={e.date} onChange={(ev) => upEngagement(e.id, { date: ev.target.value })} style={inputSt} />
                  <select value={e.stakeholder_id} onChange={(ev) => upEngagement(e.id, { stakeholder_id: ev.target.value })} style={inputSt}>
                    <option value="">Stakeholder</option>
                    {doc.stakeholders.map((s) => <option key={s.id} value={s.id}>{s.name || s.id}</option>)}
                  </select>
                  <input value={e.method} onChange={(ev) => upEngagement(e.id, { method: ev.target.value })} placeholder="Metodo (es. intervista, survey…)" style={inputSt} />
                  <button onClick={() => delEngagement(e.id)} style={{ padding: 4, border: "none", background: "none", cursor: "pointer" }}>
                    <Trash2 style={{ width: 13, height: 13, color: T.red }} />
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <textarea value={e.findings} onChange={(ev) => upEngagement(e.id, { findings: ev.target.value })} rows={2}
                    placeholder="Principali evidenze emerse…" style={{ ...inputSt, resize: "vertical" }} />
                  <textarea value={e.how_incorporated} onChange={(ev) => upEngagement(e.id, { how_incorporated: ev.target.value })} rows={2}
                    placeholder="Come sono state incorporate nella FRIA…" style={{ ...inputSt, resize: "vertical" }} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // ─── Guided mode early return ─────────────────────────────────────────────
  if (guidedMode) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
        <FriaGuidedMode onExitGuidedMode={() => setGuidedMode(false)} />
      </div>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────
  return (
    <div className="w-full" style={{ display: "flex", flexDirection: "column", gap: 0, minHeight: 0, fontFamily: "var(--font-inter, system-ui)" }}>

      <SystemSelector checkProhibited={true} />
      <AssessmentStepper currentTool="fria" />
      <AssessmentSharedHeader />

      {/* ── Mode selector ────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        {([
          {
            key: "form",
            title: "Form strutturato",
            desc: "Modulo completo Art. 27 — scenari, diritti, deployment, stakeholder.",
            active: !guidedMode,
            onClick: () => setGuidedMode(false),
          },
          {
            key: "guided",
            title: "FRIA guidata",
            desc: "Modalità conversazionale DIHR/ECNL · 36 domande · documento live.",
            active: guidedMode,
            onClick: () => setGuidedMode(true),
          },
        ] as { key: string; title: string; desc: string; active: boolean; onClick: () => void }[]).map((m) => (
          <button
            key={m.key}
            onClick={m.onClick}
            style={{
              flex: 1, textAlign: "left", padding: "12px 14px", borderRadius: 10,
              border: m.active ? "1.5px solid #23403a" : "1px solid rgba(0,0,0,0.10)",
              background: m.active ? "rgba(35,64,58,0.05)" : "#fff",
              cursor: m.active ? "default" : "pointer",
              transition: "border-color 0.15s, background 0.15s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
              {m.active && (
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#23403a", flexShrink: 0 }} />
              )}
              <p style={{ fontSize: 12, fontWeight: 700, color: "#0D1016", margin: 0 }}>{m.title}</p>
            </div>
            <p style={{ fontSize: 10, color: "rgba(0,0,0,0.45)", margin: 0 }}>{m.desc}</p>
          </button>
        ))}
      </div>

      {/* ── Prerequisiti + AI Draft Banner (Art. 27) ───────────────────────── */}
      {(() => {
        const clf  = readFromStorage<ClassifierResult>("classifier");
        const hasClassifier = !!(clf?.systemName || clf?.riskLevel);
        const hasRiskMgr    = !!(riskData);
        const hasDataAudit  = !!(dataAudit);

        const steps = [
          {
            key: "classifier",
            label: "Classifier",
            art: "Art. 6",
            done: hasClassifier,
            href: "/dashboard/tools/classifier",
            required: true,
            why: "Determina il livello di rischio del sistema AI",
          },
          {
            key: "risk",
            label: "Risk Manager",
            art: "Art. 9",
            done: hasRiskMgr,
            href: "/dashboard/modules/risk-manager",
            required: false,
            why: "Pre-carica scenari di rischio nelle fasi 2–3 della FRIA",
          },
          {
            key: "data",
            label: "Qualità Dati",
            art: "Art. 10",
            done: hasDataAudit,
            href: "/dashboard/tools/data-audit",
            required: false,
            why: "Arricchisce l'analisi con dati di governance",
          },
        ];

        return (
          <div style={{
            borderRadius: 10, marginBottom: 16, overflow: "hidden",
            border: "1px solid rgba(0,0,0,0.09)",
          }}>
            {/* Header */}
            <div style={{ padding: "12px 16px", background: "rgba(0,0,0,0.025)", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#0D1016", margin: 0, letterSpacing: "0.03em" }}>
                SORGENTI DATI PER LA BOZZA AI
              </p>
            </div>

            {/* Steps */}
            <div style={{ background: "white" }}>
              {steps.map((s, i) => (
                <div key={s.key} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "11px 16px",
                  borderBottom: i < steps.length - 1 ? "1px solid rgba(0,0,0,0.06)" : "none",
                }}>
                  {/* Status dot */}
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: s.done ? "rgba(22,163,74,0.10)" : s.required ? "rgba(220,38,38,0.08)" : "rgba(0,0,0,0.04)",
                    border: `1.5px solid ${s.done ? "rgba(22,163,74,0.30)" : s.required ? "rgba(220,38,38,0.25)" : "rgba(0,0,0,0.12)"}`,
                  }}>
                    {s.done
                      ? <span style={{ fontSize: 10, color: "#16a34a" }}>✓</span>
                      : <span style={{ fontSize: 9, color: s.required ? "#dc2626" : "rgba(0,0,0,0.30)" }}>○</span>
                    }
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#0D1016" }}>{s.label}</span>
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4,
                        background: "rgba(0,0,0,0.04)", color: "rgba(0,0,0,0.40)",
                      }}>{s.art}</span>
                      {s.required && !s.done && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4,
                          background: "rgba(220,38,38,0.08)", color: "#dc2626",
                        }}>RICHIESTO</span>
                      )}
                    </div>
                    <p style={{ fontSize: 11, color: "rgba(0,0,0,0.40)", margin: "1px 0 0", lineHeight: 1.3 }}>{s.why}</p>
                  </div>

                  {/* Action */}
                  {s.done ? (
                    <Link href={s.href} style={{
                      fontSize: 11, fontWeight: 500, color: "rgba(0,0,0,0.40)",
                      textDecoration: "none", whiteSpace: "nowrap",
                    }}>
                      Modifica →
                    </Link>
                  ) : (
                    <Link href={s.href} style={{
                      fontSize: 11, fontWeight: 600, padding: "5px 11px", borderRadius: 7,
                      border: s.required ? "1px solid rgba(220,38,38,0.25)" : "1px solid rgba(0,0,0,0.12)",
                      background: s.required ? "rgba(220,38,38,0.06)" : "rgba(0,0,0,0.02)",
                      color: s.required ? "#dc2626" : "#374151",
                      textDecoration: "none", whiteSpace: "nowrap",
                    }}>
                      {s.required ? "Completa prima →" : "Migliora bozza →"}
                    </Link>
                  )}
                </div>
              ))}
            </div>

            {/* Draft button footer */}
            <div style={{ padding: "11px 16px", background: "rgba(0,0,0,0.015)", borderTop: "1px solid rgba(0,0,0,0.07)", display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={handleDraftFria}
                disabled={loadingDraft || !hasClassifier}
                style={{
                  padding: "7px 16px", borderRadius: 7, border: "none",
                  background: (!hasClassifier || loadingDraft) ? "#e5e7eb" : "#0D1016",
                  color: (!hasClassifier || loadingDraft) ? "#9ca3af" : "white",
                  fontSize: 13, fontWeight: 500,
                  cursor: (!hasClassifier || loadingDraft) ? "not-allowed" : "pointer",
                }}
              >
                {loadingDraft ? "Generazione bozza…" : "✦ Genera bozza AI da dati esistenti"}
              </button>
              {!hasClassifier && (
                <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 500 }}>
                  Completa il Classifier per sbloccare la generazione automatica
                </span>
              )}
              {draftGenerated && (
                <span style={{ fontSize: 11, color: "#d97706", fontWeight: 500 }}>
                  ✦ Bozza applicata — verifica ogni campo prima di salvare
                </span>
              )}
              {draftError && (
                <span style={{ fontSize: 11, color: "#dc2626" }}>{draftError}</span>
              )}
            </div>
          </div>
        );
      })()}

      <div style={{ display: "flex", gap: 0, minHeight: 0 }}>

      {/* ── Left sidebar ── */}
      <div style={{ width: 232, flexShrink: 0, borderRight: `1px solid ${T.border}`, background: T.card, display: "flex", flexDirection: "column", minHeight: "100%" }}>
        {/* System name + org */}
        <div style={{ padding: "16px 14px 12px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: T.muted, textTransform: "uppercase" as const, letterSpacing: "0.6px", marginBottom: 8 }}>Sistema AI</div>
          <input value={doc.system_name} onChange={(e) => upDoc({ system_name: e.target.value })} placeholder="Nome del sistema AI"
            style={{ ...inputSt, marginBottom: 6, fontSize: 13, fontWeight: 500 }} />
          <input value={doc.organization} onChange={(e) => upDoc({ organization: e.target.value })} placeholder="Organizzazione"
            style={{ ...inputSt, marginBottom: 6 }} />
          <input value={doc.responsible_team} onChange={(e) => upDoc({ responsible_team: e.target.value })} placeholder="Team responsabile" style={{ ...inputSt, marginBottom: 6 }} />
          <div>
            <label style={{ display: "block", fontSize: 10, fontWeight: 500, color: T.faint, marginBottom: 3 }}>Data avvio FRIA</label>
            <input type="date" value={doc.fria_start_date} onChange={(e) => upDoc({ fria_start_date: e.target.value })} style={inputSt} />
          </div>
        </div>

        {/* Phase nav — FriaProgressRail style */}
        <div style={{ padding: "8px 8px", flex: 1, overflowY: "auto" as const }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: T.muted, textTransform: "uppercase" as const, letterSpacing: "0.6px", padding: "0 6px", marginBottom: 6 }}>Fasi FRIA</div>
          {phaseProgress.map((p) => {
            const isActive   = phase === p.id;
            const isExpanded = expandedPhases.has(p.id);
            const borderColor = isActive ? "rgba(35,64,58,0.20)" : p.percent === 100 ? "rgba(35,64,58,0.12)" : "rgba(0,0,0,0.07)";
            const bgColor     = isActive ? "rgba(35,64,58,0.06)" : "transparent";
            const circleColor = p.percent === 100 ? "#23403a" : "#dc2626";
            const pctColor    = p.percent === 100 ? T.green : p.percent > 0 ? T.amber : T.faint;
            return (
              <div key={p.id} style={{ border: `1px solid ${borderColor}`, background: bgColor, borderRadius: 8, overflow: "hidden", marginBottom: 4 }}>
                <button
                  onClick={() => {
                    scrollToPhase(p.id);
                    setExpandedPhases(prev => { const n = new Set(prev); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n; });
                  }}
                  style={{ width: "100%", textAlign: "left" as const, border: "none", background: "transparent", padding: "9px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(0,0,0,0.02)"; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ flexShrink: 0 }}>
                    <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${circleColor}` }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: T.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                      {p.id}. {p.label}
                    </p>
                    <p style={{ fontSize: 9, color: T.muted, margin: 0, marginTop: 1 }}>
                      {p.done}/{p.total} · {p.legalRef}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: pctColor, fontFamily: "monospace" }}>{p.percent}%</span>
                    <ChevronRight size={10} style={{ color: T.faint, transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
                  </div>
                </button>
                <div style={{ height: 2, background: "rgba(0,0,0,0.04)" }}>
                  <div style={{ height: "100%", width: `${p.percent}%`, background: circleColor, transition: "width 0.35s" }} />
                </div>
                {isExpanded && (
                  <div style={{ borderTop: "1px solid rgba(0,0,0,0.05)", padding: "4px 6px 6px" }}>
                    {p.subPoints.map(sp => (
                      <div key={sp.label} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 4px", borderRadius: 5 }}>
                        <div style={{ flexShrink: 0 }}>
                          <div style={{ width: 10, height: 10, borderRadius: "50%", border: `1.5px solid ${sp.done ? "#23403a" : "#dc2626"}` }} />
                        </div>
                        <p style={{ fontSize: 10, color: sp.done ? T.muted : T.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, textDecoration: sp.done ? "line-through" : "none", opacity: sp.done ? 0.55 : 1 }}>
                          {sp.label}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary stats */}
        <div style={{ padding: "12px 14px", borderTop: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: T.muted, textTransform: "uppercase" as const, letterSpacing: "0.6px", marginBottom: 10 }}>Riepilogo FRIA</div>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: T.muted }}>Completezza</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{completeness}%</span>
            </div>
            <div style={{ height: 4, background: T.bg, borderRadius: 9999, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${completeness}%`, background: completeness > 75 ? T.green : completeness > 40 ? T.amber : T.red, borderRadius: 9999, transition: "width 0.3s" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: T.muted }}>Rischio globale</span>
              <Badge label={overallRisk.toUpperCase()} color={riskColorFor(overallRisk)} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, color: T.muted }}>Scenari</span>
              <span style={{ fontSize: 11, fontWeight: 500, color: T.text }}>{doc.scenarios.length}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, color: T.muted }}>Stakeholder</span>
              <span style={{ fontSize: 11, fontWeight: 500, color: T.text }}>{doc.stakeholders.length}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
            <button onClick={saveToDossier} style={{ flex: 1, fontSize: 11, fontWeight: 500, padding: "6px 8px", borderRadius: 7, background: T.text, color: "#fff", border: "none", cursor: "pointer" }}>
              Salva dossier
            </button>
            <button onClick={exportReport} style={{ padding: "6px 9px", borderRadius: 7, background: T.bg, border: `1px solid ${T.border}`, cursor: "pointer", display: "flex", alignItems: "center" }}>
              <Download style={{ width: 12, height: 12, color: T.muted }} />
            </button>
          </div>
          {/* Auto-save indicator */}
          {friaSaved && (
            <div style={{ marginTop: 8, fontSize: 10, color: "#16a34a", textAlign: "center" as const }}>
              ✓ Salvato automaticamente
            </div>
          )}
          {/* Version History */}
          <div style={{ marginTop: 12 }}>
            <VersionHistoryPanel
              toolId="fria"
              onRestore={(data) => setDoc(data as import("@/lib/simulation/fria-engine").FRIADocument)}
            />
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div ref={contentRef} style={{ flex: 1, minWidth: 0, padding: "0 4px 40px 28px", overflowY: "auto" as const }}>
        {/* Dossier save banner */}
        {dossierSavedAt ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, borderRadius: 8, padding: "10px 14px", marginBottom: 20, background: T.greenBg, border: `1px solid ${T.greenBdr}`, fontSize: 12 }}>
            <CheckCircle style={{ width: 13, height: 13, color: T.green, flexShrink: 0 }} />
            <span style={{ color: "#15803d" }}>FRIA salvata nel dossier · {new Date(dossierSavedAt).toLocaleDateString("it-IT")}</span>
            <Link href="/dashboard/dossier" style={{ marginLeft: "auto", fontSize: 11, fontWeight: 500, color: T.green }}>Vedi dossier →</Link>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: 8, padding: "10px 14px", marginBottom: 20, background: T.card, border: `1px solid ${T.border}`, fontSize: 12 }}>
            <span style={{ color: T.muted }}>Salva i risultati FRIA nel dossier di compliance (Art. 27)</span>
            <button onClick={saveToDossier} style={{ fontSize: 11, fontWeight: 500, borderRadius: 20, padding: "4px 12px", background: T.text, color: "#fff", border: "none", cursor: "pointer" }}>Salva nel dossier</button>
          </div>
        )}

        <div id="fase-1">{renderPhase1()}</div>
        <div id="fase-2" style={{ marginTop: 48 }}>{renderPhase2()}</div>
        <div id="fase-3" style={{ marginTop: 48 }}>{renderPhase3()}</div>
        <div id="fase-4" style={{ marginTop: 48 }}>{renderPhase4()}</div>
        <div id="fase-5" style={{ marginTop: 48 }}>{renderPhase5()}</div>
        <NextStepGuide fria={doc} gapCheck={gapCheckResult} onNavigateToPhase={(p) => scrollToPhase(p)} />
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            style={{ position: "fixed", bottom: 24, right: 24, zIndex: 50, display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 10, fontSize: 12, fontWeight: 500, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", background: toast.type === "error" ? "rgba(220,38,38,0.95)" : T.text, color: "#fff" }}>
            {toast.type === "error" ? "⚠" : "✓"} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
