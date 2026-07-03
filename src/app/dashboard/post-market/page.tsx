"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Clock,
  FileText,
  Send,
  CheckCircle,
  Bell,
  ClipboardList,
  X,
  Copy,
  Download,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Link2,
} from "lucide-react";
import {
  classifyIncidentSeverity,
  DEADLINE_TYPE_LABEL,
  SEVERITY_CLASS_LABEL,
} from "@/lib/incidents/incident-classification";
import type { ClassificationInput, SeverityClassification, NotificationDeadlineType } from "@/lib/incidents/incident-classification";
import { INCIDENT_CATEGORIES, computeDeadline } from "@/lib/incidents/incident-rules";
import { detectDraftIncidentsFromLogVault, getLinkedIncidentsForDeployerObligation } from "@/lib/incidents/incident-actions";
import { appendEvidence } from "@/lib/evidence/evidence-layer";
import { motion, AnimatePresence } from "framer-motion";
import { readFromStorage } from "@/lib/dossier/storage-schema";
import type { RiskManagerResult } from "@/lib/dossier/storage-schema";
import {
  loadPMMPlan,
  savePMMPlan,
  loadPMMReports,
  savePMMReports,
  computeNextReportDue,
  ANNEX3_LAW_ENFORCEMENT_CHECKLIST,
} from "@/lib/post-market/post-market-types";
import type {
  PostMarketMonitoringPlan,
  PostMarketReport,
  LogVaultMetricsSnapshot,
} from "@/lib/post-market/post-market-types";
import { proposePMMPlan, draftPostMarketReport } from "@/app/actions/postMarketActions";
import { incidentFormChat } from "@/app/actions/incidentFormChat";
import type { IncidentChatMessage, IncidentFieldSuggestion } from "@/app/actions/incidentFormChat";
import { Loader2 } from "lucide-react";
import { loadInventory } from "@/lib/inventory/ai-system";
import type { AISystem } from "@/lib/inventory/ai-system";

// ─── Types ────────────────────────────────────────────────────────────────────

type Severity = "critical" | "high" | "medium" | "low";
type IncidentStatus = "draft" | "pending" | "reported" | "investigating" | "report_complete" | "resolved" | "closed";

type Incident = {
  id: string;
  title: string;
  system: string;
  systemId?: string;
  date: string;
  severity: Severity;
  status: IncidentStatus;
  notified: boolean;
  notifiedAt?: string;
  description: string;
  authority: string;
  affectedUsers?: string;
  actions: string;
  rootCause?: string;      // Sezione 4 — Rapporto completo Art. 73(4)
  finalMeasures?: string;  // Sezione 6 — Rapporto completo Art. 73(4)
  createdAt: string;
  // PROMPT AR — classificazione Art. 73
  severityClassification?: SeverityClassification;
  notificationDeadlineType?: NotificationDeadlineType;
  notificationDeadlineDate?: string;
  source?: "manual" | "logvault_auto";
  aiConfirmed?: boolean;
};

type MonitoringCheck = {
  id: string;
  label: string;
  article: string;
  frequency: string;
  done: boolean;
  lastDone?: string;
  notes: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function getDaysRemaining(dateStr: string, notified: boolean, deadlineDate?: string): number {
  if (notified) return 0;
  const deadline = deadlineDate
    ? new Date(deadlineDate)
    : new Date(new Date(dateStr).getTime() + 15 * 24 * 60 * 60 * 1000);
  const today = new Date();
  const diff = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

function generateNotificationText(inc: Incident): string {
  return `NOTIFICA PRELIMINARE DI INCIDENTE GRAVE
Ai sensi dell'Art. 73 del Regolamento (UE) 2024/1689

Data notifica: ${new Date().toLocaleDateString("it-IT")}
Autorità destinataria: ${inc.authority}

IDENTIFICAZIONE INCIDENTE
ID Incidente: ${inc.id}
Sistema AI coinvolto: ${inc.system}
Data rilevamento: ${inc.date}
Gravità: ${inc.severity.toUpperCase()}

DESCRIZIONE DELL'INCIDENTE
${inc.description}

UTENTI/SOGGETTI POTENZIALMENTE IMPATTATI
${inc.affectedUsers || "In fase di accertamento"}

AZIONI IMMEDIATE INTRAPRESE
${inc.actions || "Indagine avviata — aggiornamenti a seguire"}

IMPEGNI
La società si impegna a trasmettere un rapporto completo entro 15 giorni
dalla data del presente atto (entro il ${new Date(new Date(inc.date).getTime() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString("it-IT")}).

Firma: _______________________
Ruolo: Responsabile Conformità AI
Data: ${new Date().toLocaleDateString("it-IT")}`;
}

function generateFullReport(inc: Incident): string {
  return `RAPPORTO COMPLETO — INCIDENTE GRAVE
Ai sensi dell'Art. 73(4) del Regolamento (UE) 2024/1689

Data rapporto: ${new Date().toLocaleDateString("it-IT")}
Autorità destinataria: ${inc.authority}

═══════════════════════════════════════════════════════
SEZIONE 1 — IDENTIFICAZIONE
═══════════════════════════════════════════════════════
ID Incidente: ${inc.id}
Sistema AI coinvolto: ${inc.system}
Data rilevamento: ${inc.date}
Gravità: ${inc.severity.toUpperCase()}
Status: ${inc.status}

═══════════════════════════════════════════════════════
SEZIONE 2 — DESCRIZIONE DETTAGLIATA
═══════════════════════════════════════════════════════
${inc.description}

═══════════════════════════════════════════════════════
SEZIONE 3 — IMPATTO
═══════════════════════════════════════════════════════
Utenti/soggetti impattati: ${inc.affectedUsers || "Nessun impatto su utenti riportato"}

═══════════════════════════════════════════════════════
SEZIONE 4 — ANALISI CAUSA RADICE
═══════════════════════════════════════════════════════
${inc.rootCause || "[CAMPO OBBLIGATORIO - Compilare prima di generare il rapporto]"}

═══════════════════════════════════════════════════════
SEZIONE 5 — AZIONI IMMEDIATE INTRAPRESE
═══════════════════════════════════════════════════════
${inc.actions || "Nessuna azione registrata"}

═══════════════════════════════════════════════════════
SEZIONE 6 — MISURE DEFINITIVE ADOTTATE
═══════════════════════════════════════════════════════
${inc.finalMeasures || "[CAMPO OBBLIGATORIO - Compilare prima di generare il rapporto]"}

═══════════════════════════════════════════════════════
SEZIONE 7 — DICHIARAZIONE
═══════════════════════════════════════════════════════
Il presente rapporto è redatto in conformità all'Art. 73(4) del Regolamento (UE) 2024/1689
e costituisce il rapporto completo a seguito della notifica preliminare del ${inc.date}.

Firma: _______________________
Ruolo: Responsabile Conformità AI
Data: ${new Date().toLocaleDateString("it-IT")}`;
}

// ─── Persistence ──────────────────────────────────────────────────────────────

const INCIDENTS_KEY = "post_market_incidents";
const PLAN_KEY = "post_market_plan";

const SEED_INCIDENTS: Incident[] = [
  {
    id: "INC-001",
    title: "Falso positivo screening biometrico",
    system: "FaceID-API v2.3",
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    severity: "high",
    status: "investigating",
    notified: false,
    description:
      "Tasso di falsi positivi all'8.3% su soggetti con pigmentazione scura. Possibile discriminazione sistematica.",
    authority: "Garante Privacy",
    affectedUsers: "~340",
    actions: "Sospeso il modulo biometrico, avviata analisi root cause",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "INC-002",
    title: "Prompt injection riuscita su chatbot HR",
    system: "HR-Assist LLM",
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    severity: "critical",
    status: "pending",
    notified: false,
    description:
      "Utente non autorizzato ha estratto dati stipendiali via prompt injection. Violazione Art. 73.",
    authority: "AGID",
    affectedUsers: "1 confermato, possibili altri",
    actions: "Patch applicata, log estratti, indagine in corso",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const DEFAULT_PLAN: MonitoringCheck[] = [
  { id: "m1", label: "Monitoraggio accuratezza modello", article: "Art. 72(1)", frequency: "Settimanale", done: false, notes: "" },
  { id: "m2", label: "Verifica drift distribuzione input", article: "Art. 72(1)", frequency: "Settimanale", done: false, notes: "" },
  { id: "m3", label: "Audit log eventi anomali", article: "Art. 72(2)", frequency: "Mensile", done: false, notes: "" },
  { id: "m4", label: "Revisione segnalazioni utenti", article: "Art. 72(3)", frequency: "Mensile", done: false, notes: "" },
  { id: "m5", label: "Test bias su nuovi dati", article: "Art. 72(1)", frequency: "Trimestrale", done: false, notes: "" },
  { id: "m6", label: "Verifica integrità catena hash Evidence Layer", article: "Art. 12", frequency: "Mensile", done: false, notes: "" },
  { id: "m7", label: "Aggiornamento documentazione tecnica", article: "Art. 11", frequency: "Trimestrale", done: false, notes: "" },
  { id: "m8", label: "Report post-market annuale all'autorità", article: "Art. 72(4)", frequency: "Annuale", done: false, notes: "" },
];

function loadIncidents(): Incident[] {
  if (typeof window === "undefined") return SEED_INCIDENTS;
  const raw = localStorage.getItem(INCIDENTS_KEY);
  if (raw) return JSON.parse(raw);
  localStorage.setItem(INCIDENTS_KEY, JSON.stringify(SEED_INCIDENTS));
  return SEED_INCIDENTS;
}

function saveIncidents(list: Incident[]) {
  localStorage.setItem(INCIDENTS_KEY, JSON.stringify(list));
}

function buildAdaptivePlan(base: MonitoringCheck[]): MonitoringCheck[] {
  try {
    const riskData = readFromStorage<RiskManagerResult>("riskManager");
    if (!riskData || riskData.risks.length === 0) return base;
    const highRisks = riskData.risks.filter(
      (r) => r.impact === "high" || r.likelihood === "high"
    );
    if (highRisks.length === 0) return base;
    // Add one specific monitoring check per high-risk item (avoid duplicates)
    const extraChecks: MonitoringCheck[] = highRisks.map((r, i) => ({
      id: `rm-${r.id || i}`,
      label: `Monitoraggio: ${r.title}`,
      article: "Art. 72(1)",
      frequency: r.impact === "high" ? "Settimanale" : "Mensile",
      done: false,
      notes: `Rischio importato da Risk Manager — livello impatto: ${r.impact}, probabilità: ${r.likelihood}`,
    }));
    // Merge without duplicates
    const existingIds = new Set(base.map((c) => c.id));
    const newChecks = extraChecks.filter((c) => !existingIds.has(c.id));
    return [...base, ...newChecks];
  } catch {
    return base;
  }
}

function loadPlan(): MonitoringCheck[] {
  if (typeof window === "undefined") return buildAdaptivePlan(DEFAULT_PLAN);
  const raw = localStorage.getItem(PLAN_KEY);
  // If user has a saved plan, merge new risk-based checks
  const basePlan: MonitoringCheck[] = raw ? JSON.parse(raw) : DEFAULT_PLAN;
  return buildAdaptivePlan(basePlan);
}

function savePlan(plan: MonitoringCheck[]) {
  localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const SEV_STYLE: Record<Severity, { bg: string; color: string; border: string }> = {
  critical: { bg: "rgba(220,38,38,0.08)", color: "#b91c1c", border: "rgba(220,38,38,0.25)" },
  high: { bg: "rgba(245,158,11,0.08)", color: "#92400e", border: "rgba(245,158,11,0.25)" },
  medium: { bg: "rgba(0,0,0,0.05)", color: "rgba(0,0,0,0.55)", border: "rgba(0,0,0,0.18)" },
  low: { bg: "rgba(0,0,0,0.05)", color: "rgba(0,0,0,0.45)", border: "rgba(0,0,0,0.12)" },
};

const STATUS_COLOR: Record<IncidentStatus, string> = {
  draft: "#7c3aed",
  pending: "#dc2626",
  reported: "#52525b",
  investigating: "#d97706",
  report_complete: "#0891b2",
  resolved: "#15803d",
  closed: "rgba(0,0,0,0.35)",
};

const STATUS_LABEL: Record<IncidentStatus, string> = {
  draft: "Bozza",
  pending: "Pending",
  reported: "Segnalato",
  investigating: "In indagine",
  report_complete: "Rapporto completo",
  resolved: "Risolto",
  closed: "Chiuso",
};

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  borderRadius: "8px",
  border: "1px solid rgba(0,0,0,0.12)",
  fontSize: "12px",
  color: "#0D1016",
  background: "#fff",
  outline: "none",
};

const EMPTY_FORM = {
  title: "",
  system: "",
  date: new Date().toISOString().slice(0, 10),
  severity: "high" as Severity,
  description: "",
  authority: "AGID",
  affectedUsers: "",
  actions: "",
};

// ─── Component ────────────────────────────────────────────────────────────────

function PostMarketPageInner() {
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const initialTab: "incidents" | "plan" | "monitoring" =
    rawTab === "monitoring" ? "monitoring" : rawTab === "plan" ? "plan" : "incidents";
  const [tab, setTab] = useState<"incidents" | "plan" | "monitoring">(initialTab);
  const [incidents, setIncidents] = useState<Incident[]>(() => loadIncidents());
  const [plan, setPlan] = useState<MonitoringCheck[]>(() => loadPlan());

  // ── Monitoring (Art. 72) state ─────────────────────────────────────────────
  const [pmmPlan, setPmmPlan] = useState<PostMarketMonitoringPlan>(() => loadPMMPlan());
  const [pmmReports, setPmmReports] = useState<PostMarketReport[]>(() => loadPMMReports());
  const [pmmAiLoading, setPmmAiLoading] = useState(false);
  const [pmmAiError, setPmmAiError] = useState<string | null>(null);
  const [reportDraftLoading, setReportDraftLoading] = useState(false);
  const [reportDraftError, setReportDraftError] = useState<string | null>(null);
  const [draftReport, setDraftReport] = useState<PostMarketReport | null>(null);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<Severity | "all">("all");
  const [filterStatus, setFilterStatus] = useState<IncidentStatus | "all">("all");
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [urgentBannerDismissed, setUrgentBannerDismissed] = useState(false);
  const [showSeverityGuide, setShowSeverityGuide] = useState(false);
  // Sistemi dall'inventario (caricati lato client)
  const [inventorySystems, setInventorySystems] = useState<AISystem[]>([]);
  const [systemFreeText, setSystemFreeText] = useState("");
  useEffect(() => { setInventorySystems(loadInventory()); }, []);

  // Incident form AI chat
  const [incidentChatMessages, setIncidentChatMessages] = useState<IncidentChatMessage[]>([
    { role: "assistant", content: "Ciao! Sono qui per guidarti nella segnalazione.\n\nCominciamo dalla cosa più importante: cosa è successo esattamente? Descrivi in 2-3 frasi cosa ha fatto il sistema AI, quando e quale conseguenza ha causato." }
  ]);
  const [incidentChatInput, setIncidentChatInput] = useState("");
  const [incidentChatLoading, setIncidentChatLoading] = useState(false);
  const [pendingSuggestion, setPendingSuggestion] = useState<IncidentFieldSuggestion | null>(null);
  // Form–chat resizer
  const formLayoutRef = useRef<HTMLDivElement>(null);
  const [formChatWidth, setFormChatWidth] = useState(400);
  const [isFormResizing, setIsFormResizing] = useState(false);
  // Plan: expanded rows
  const [expandedChecks, setExpandedChecks] = useState<Set<string>>(new Set());

  // ── Incident Art. 73 stepper state ────────────────────────────────────────
  const [stepperStep, setStepperStep] = useState(1);
  const [stepperCategories, setStepperCategories] = useState<string[]>([]);

  // Reset stepper when selected incident changes
  useEffect(() => {
    setStepperStep(1);
    setStepperCategories([]);
  }, [selected?.id]);

  // LogVault auto-detection on mount — merge draft incidents not already present
  useEffect(() => {
    const drafts = detectDraftIncidentsFromLogVault();
    if (drafts.length === 0) return;
    setIncidents((prev) => {
      const existingIds = new Set(prev.map((i) => i.id));
      const newDrafts = drafts
        .filter((d) => !existingIds.has(d.id))
        .map((d) => ({
          id: d.id,
          title: `[LogVault] ${d.system ?? "Anomalia rilevata"}`,
          system: d.system ?? "—",
          systemId: d.systemId,
          date: d.date,
          severity: (d.severity as Severity) ?? "high",
          status: "draft" as IncidentStatus,
          notified: false,
          description: d.description ?? "",
          authority: "AGID",
          actions: "",
          createdAt: new Date().toISOString(),
          severityClassification: "malfunction" as SeverityClassification,
          notificationDeadlineType: "none" as NotificationDeadlineType,
          source: "logvault_auto" as const,
          aiConfirmed: false,
        }));
      if (newDrafts.length === 0) return prev;
      const merged = [...newDrafts, ...prev];
      saveIncidents(merged);
      return merged;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deep link: ?incident=<id> → auto-seleziona l'incidente e attiva la tab
  useEffect(() => {
    const incidentId = searchParams.get("incident");
    if (!incidentId) return;
    const found = loadIncidents().find((i) => i.id === incidentId);
    if (found) {
      setTab("incidents");
      setSelected(found);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showToastMsg(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  // ── Computed ──────────────────────────────────────────────────────────────

  const activeIncidents = incidents.filter(
    (i) => i.status !== "resolved" && i.status !== "closed"
  );
  const toNotify = incidents.filter((i) => !i.notified);
  const minDays =
    toNotify.length > 0
      ? Math.min(...toNotify.map((i) => getDaysRemaining(i.date, false, i.notificationDeadlineDate)))
      : null;
  const urgentCount = toNotify.filter((i) => getDaysRemaining(i.date, false, i.notificationDeadlineDate) <= 3).length;

  const planDone = plan.filter((c) => c.done).length;
  const planTotal = plan.length;

  // ── Filtered + sorted incident list ────────────────────────────────────────

  const filtered = incidents
    .filter((i) => filterSeverity === "all" || i.severity === filterSeverity)
    .filter((i) => filterStatus === "all" || i.status === filterStatus)
    .sort((a, b) => {
      if (!a.notified && !b.notified)
        return getDaysRemaining(a.date, false, a.notificationDeadlineDate) - getDaysRemaining(b.date, false, b.notificationDeadlineDate);
      if (!a.notified) return -1;
      if (!b.notified) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  // ── Incident actions ──────────────────────────────────────────────────────

  function handleRegisterIncident() {
    if (!form.title.trim() || !form.system.trim() || !form.description.trim()) return;
    const newId = "INC-" + String(incidents.length + 1).padStart(3, "0");
    const newInc: Incident = {
      id: newId,
      title: form.title,
      system: form.system,
      date: form.date,
      severity: form.severity,
      status: "pending",
      notified: false,
      description: form.description,
      authority: form.authority,
      affectedUsers: form.affectedUsers,
      actions: form.actions,
      createdAt: new Date().toISOString(),
    };
    const updated = [newInc, ...incidents];
    setIncidents(updated);
    saveIncidents(updated);
    setSelected(newInc);
    setShowForm(false);
    setForm(EMPTY_FORM);
    showToastMsg("✓ Incidente registrato");
    void appendEvidence(
      "incident",
      {
        descrizione: form.description,
        data_incidente: form.date,
        gravità:
          form.severity === "critical" ? "Critico — notifica obbligatoria" : form.severity,
        componenti_coinvolti: form.system,
        azioni_intraprese: form.actions || "In valutazione",
        notificato_autorità: "No",
        stato: "Aperto",
      },
      "post-market-system"
    );
  }

  function updateStatus(id: string, status: IncidentStatus) {
    const updated = incidents.map((i) => (i.id === id ? { ...i, status } : i));
    setIncidents(updated);
    saveIncidents(updated);
    setSelected((s) => (s?.id === id ? { ...s, status } : s));
    // Sync to LogVault — mark linked events as resolved (PROMPT BE)
    if (status === "resolved" || status === "closed") {
      try {
        const systemId = localStorage.getItem("aicomply_active_system_id") ?? "default";
        const key = `aicomply_logvault_events_v2_[${systemId}]`;
        const raw = localStorage.getItem(key);
        if (raw) {
          const evs = JSON.parse(raw) as Array<{ linkedIncidentId?: string; incidentResolved?: boolean }>;
          const patched = evs.map(ev => ev.linkedIncidentId === id ? { ...ev, incidentResolved: true } : ev);
          localStorage.setItem(key, JSON.stringify(patched));
          window.dispatchEvent(new StorageEvent("storage", { key, newValue: JSON.stringify(patched) }));
        }
      } catch { /* non-blocking */ }
    }
  }

  function updateIncidentField<K extends keyof Incident>(id: string, field: K, value: Incident[K]) {
    const updated = incidents.map((i) => (i.id === id ? { ...i, [field]: value } : i));
    setIncidents(updated);
    saveIncidents(updated);
    setSelected((s) => (s?.id === id ? { ...s, [field]: value } : s));
  }

  function applyClassification(incidentId: string, input: ClassificationInput, eventDate: string) {
    const result = classifyIncidentSeverity(input);
    const deadlineDate = result.notificationDeadlineType !== "none"
      ? result.computeDeadlineDate(eventDate)
      : undefined;
    const updated = incidents.map((i) =>
      i.id === incidentId
        ? {
            ...i,
            severityClassification: result.severityClassification,
            notificationDeadlineType: result.notificationDeadlineType,
            notificationDeadlineDate: deadlineDate,
            aiConfirmed: false,
          }
        : i
    );
    setIncidents(updated);
    saveIncidents(updated);
    setSelected((s) =>
      s?.id === incidentId
        ? { ...s, severityClassification: result.severityClassification, notificationDeadlineType: result.notificationDeadlineType, notificationDeadlineDate: deadlineDate, aiConfirmed: false }
        : s
    );
  }

  function applyNewClassification(incidentId: string, categoryIds: string[], eventDate: string) {
    const result = computeDeadline(categoryIds);
    if (!result) {
      const updated = incidents.map(i =>
        i.id === incidentId
          ? { ...i, severityClassification: "malfunction" as SeverityClassification, notificationDeadlineType: "none" as NotificationDeadlineType, notificationDeadlineDate: undefined, aiConfirmed: true }
          : i
      );
      setIncidents(updated);
      saveIncidents(updated);
      setSelected(s => s?.id === incidentId ? { ...s, severityClassification: "malfunction", notificationDeadlineType: "none", notificationDeadlineDate: undefined, aiConfirmed: true } : s);
      return;
    }
    const deadlineDate = addDays(eventDate, result.days);
    const deadlineType: NotificationDeadlineType = result.days <= 2 ? "immediate_2d" : "standard_15d";
    const updated = incidents.map(i =>
      i.id === incidentId
        ? { ...i, severityClassification: "serious_incident" as SeverityClassification, notificationDeadlineType: deadlineType, notificationDeadlineDate: deadlineDate, aiConfirmed: true }
        : i
    );
    setIncidents(updated);
    saveIncidents(updated);
    setSelected(s =>
      s?.id === incidentId
        ? { ...s, severityClassification: "serious_incident", notificationDeadlineType: deadlineType, notificationDeadlineDate: deadlineDate, aiConfirmed: true }
        : s
    );
  }

  function markNotified(id: string) {
    const now = new Date().toISOString();
    const updated = incidents.map((i) =>
      i.id === id ? { ...i, notified: true, notifiedAt: now, status: "reported" as const } : i
    );
    setIncidents(updated);
    saveIncidents(updated);
    setSelected((s) => (s?.id === id ? { ...s, notified: true, notifiedAt: now, status: "reported" } : s));
    setShowNotifyModal(false);
    showToastMsg("✓ Incidente segnato come notificato");
    const inc = incidents.find((i) => i.id === id);
    if (inc) {
      void appendEvidence(
        "incident",
        {
          descrizione: `Notifica inviata per incidente ${id}`,
          data_incidente: inc.date,
          gravità: inc.severity,
          componenti_coinvolti: inc.system,
          azioni_intraprese: "Notifica preliminare inviata all'autorità",
          notificato_autorità: inc.authority,
          stato: "Notificato",
        },
        "post-market"
      );
    }
  }

  function exportIncidentTxt(inc: Incident) {
    const lines = [
      `SCHEDA INCIDENTE — ${inc.id}`,
      `Titolo: ${inc.title}`,
      `Sistema: ${inc.system}`,
      `Data rilevamento: ${inc.date}`,
      `Gravità: ${inc.severity.toUpperCase()}`,
      `Status: ${STATUS_LABEL[inc.status]}`,
      `Autorità: ${inc.authority}`,
      `Utenti impattati: ${inc.affectedUsers || "—"}`,
      ``,
      `DESCRIZIONE`,
      inc.description,
      ``,
      `AZIONI INTRAPRESE`,
      inc.actions || "—",
      ``,
      `Notificato: ${inc.notified ? `Sì (${inc.notifiedAt?.slice(0, 10)})` : "No"}`,
      `Creato il: ${inc.createdAt.slice(0, 19).replace("T", " ")}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `incidente-${inc.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToastMsg("Scheda esportata");
  }

  // ── Plan actions ─────────────────────────────────────────────────────────

  function toggleCheck(id: string) {
    const today = new Date().toISOString().slice(0, 10);
    const updated = plan.map((c) =>
      c.id === id
        ? { ...c, done: !c.done, lastDone: !c.done ? today : c.lastDone }
        : c
    );
    setPlan(updated);
    savePlan(updated);
  }

  function updateNote(id: string, notes: string) {
    const updated = plan.map((c) => (c.id === id ? { ...c, notes } : c));
    setPlan(updated);
    savePlan(updated);
  }

  function toggleExpand(id: string) {
    setExpandedChecks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exportPlanCSV() {
    const header = "attività,articolo,frequenza,completata,ultima_esecuzione,note";
    const rows = plan.map((c) =>
      [
        `"${c.label}"`,
        c.article,
        c.frequency,
        c.done ? "true" : "false",
        c.lastDone || "",
        `"${c.notes}"`,
      ].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "piano-monitoraggio-art72.csv";
    a.click();
    URL.revokeObjectURL(url);
    showToastMsg("CSV esportato");
  }

  // ── Form-chat resizer ─────────────────────────────────────────────────────

  const startFormResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsFormResizing(true);
    const startX = e.clientX;
    const startW = formChatWidth;
    const onMove = (ev: MouseEvent) => {
      const totalW = formLayoutRef.current?.clientWidth ?? 1200;
      const delta = startX - ev.clientX; // drag left = wider chat
      setFormChatWidth(Math.min(Math.max(startW + delta, 300), totalW * 0.6));
    };
    const onUp = () => {
      setIsFormResizing(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [formChatWidth]);

  // ── Apply field suggestion from chat ──────────────────────────────────────

  const applyFieldSuggestion = useCallback((s: IncidentFieldSuggestion) => {
    setForm((f) => ({
      ...f,
      [s.field]: s.value,
    }));
    setPendingSuggestion(null);
    setIncidentChatMessages((prev) => [
      ...prev,
      { role: "assistant", content: `✓ Ho aggiornato il campo "${s.label}" con: "${s.value}".` },
    ]);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-5">
        <h1
          style={{ fontSize: "22px", fontWeight: 400, letterSpacing: "-0.5px", color: "#0D1016" }}
        >
          Post-Market Monitoring
        </h1>
        <p className="text-[12px] mt-0.5" style={{ color: "rgba(0,0,0,0.42)" }}>
          Sorveglianza continua post-immissione sul mercato.
        </p>
      </div>

      {/* Urgent banner */}
      {urgentCount > 0 && minDays !== null && !urgentBannerDismissed && (
        <div
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 mb-4"
          style={{
            background: "rgba(220,38,38,0.05)",
            border: "1px solid rgba(220,38,38,0.2)",
          }}
        >
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#dc2626" }} />
          <p className="text-[11px] font-medium flex-1" style={{ color: "#dc2626" }}>
            ⚠ {urgentCount} incident{urgentCount > 1 ? "i" : "e"} richiede
            {urgentCount > 1 ? "ono" : ""}{" "}
            {minDays !== null && minDays <= 0
              ? "notifica urgente — scadenza già superata"
              : minDays === 1
                ? "notifica entro oggi"
                : `notifica entro ${minDays} giorni`}{" "}
            (Art. 73)
          </p>
          <button
            onClick={() => setUrgentBannerDismissed(true)}
            title="Chiudi"
            style={{
              flexShrink: 0, width: 18, height: 18, borderRadius: 9,
              background: "rgba(220,38,38,0.12)", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#dc2626", fontSize: 11, lineHeight: 1,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(220,38,38,0.22)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(220,38,38,0.12)")}
          >
            ✕
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          {
            label: "Incidenti attivi",
            value: String(activeIncidents.length),
            sub: "",
            color: "#0D1016",
          },
          {
            label: "Da notificare",
            value: String(toNotify.length),
            sub: "",
            color: toNotify.length > 0 ? "#dc2626" : "#15803d",
          },
          {
            label: "Scadenza più vicina",
            value: minDays === null ? "—" : minDays <= 0 ? "SCADUTA" : String(minDays),
            sub: minDays !== null && minDays > 0 ? " giorni" : "",
            color: minDays !== null && minDays <= 3 ? "#dc2626" : "#0D1016",
          },
          {
            label: "Piano monitoraggio",
            value: `${planDone}/${planTotal}`,
            sub: " attività",
            color:
              planDone / planTotal >= 0.8
                ? "#15803d"
                : planDone / planTotal >= 0.5
                ? "#d97706"
                : "#dc2626",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl p-4"
            style={{
              background: "#fff",
              border: "1px solid rgba(0,0,0,0.07)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div
              className="text-[22px] font-semibold"
              style={{ letterSpacing: "-0.5px", color: card.color }}
            >
              {card.value}
              {card.sub && (
                <span
                  className="text-[13px] font-normal"
                  style={{ color: "rgba(0,0,0,0.3)" }}
                >
                  {card.sub}
                </span>
              )}
            </div>
            <div className="mt-0.5 text-[11px]" style={{ color: "rgba(0,0,0,0.38)" }}>
              {card.label}
            </div>
          </div>
        ))}
      </div>

      {/* Tab nav */}
      <div
        className="flex gap-5 mb-5"
        style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}
      >
        {[
          {
            id: "incidents" as const,
            label: "Incidenti",
            Icon: AlertTriangle,
            badge: activeIncidents.length,
          },
          { id: "plan" as const, label: "Piano Art. 72", Icon: ClipboardList, badge: 0 },
          { id: "monitoring" as const, label: "Monitoraggio (Art. 72)", Icon: FileText, badge: 0 },
        ].map(({ id, label, Icon, badge }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex items-center gap-1.5 pb-3 text-[13px] font-medium transition-all border-b-2"
            style={
              tab === id
                ? { borderColor: "#0D1016", color: "#0D1016" }
                : { borderColor: "transparent", color: "rgba(0,0,0,0.42)" }
            }
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {badge > 0 && (
              <span
                className="text-[10px] font-semibold rounded-full px-1.5 py-0.5"
                style={{ background: "rgba(220,38,38,0.1)", color: "#dc2626" }}
              >
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB 1: Incidenti ── */}
      {tab === "incidents" && (
        <div
          ref={formLayoutRef}
          style={showForm
            ? { display: "flex", gap: 0, alignItems: "flex-start" }
            : { display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }
          }
        >
          {/* Left: list + form */}
          <div className="space-y-4" style={showForm ? { flex: 1, minWidth: 0 } : {}}>
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="flex gap-1.5">
                {(["all", "critical", "high", "medium", "low"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterSeverity(s)}
                    style={{
                      padding: "3px 10px",
                      borderRadius: "999px",
                      fontSize: "10px",
                      fontWeight: 500,
                      cursor: "pointer",
                      border:
                        filterSeverity === s
                          ? "1px solid #0D1016"
                          : "1px solid rgba(0,0,0,0.12)",
                      background: filterSeverity === s ? "#0D1016" : "#fff",
                      color: filterSeverity === s ? "#fff" : "rgba(0,0,0,0.5)",
                      transition: "all 0.12s",
                    }}
                  >
                    {s === "all" ? "Tutti" : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5">
                {(["pending", "investigating", "resolved"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(filterStatus === s ? "all" : s)}
                    style={{
                      padding: "3px 10px",
                      borderRadius: "999px",
                      fontSize: "10px",
                      fontWeight: 500,
                      cursor: "pointer",
                      border:
                        filterStatus === s
                          ? "1px solid #0D1016"
                          : "1px solid rgba(0,0,0,0.12)",
                      background: filterStatus === s ? "#0D1016" : "#fff",
                      color: filterStatus === s ? "#fff" : "rgba(0,0,0,0.5)",
                      transition: "all 0.12s",
                    }}
                  >
                    {s === "pending"
                      ? "Pending"
                      : s === "investigating"
                      ? "In indagine"
                      : "Risolti"}
                  </button>
                ))}
              </div>
            </div>

            {/* List card */}
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: "1px solid rgba(0,0,0,0.07)", background: "#fff" }}
            >
              <div
                className="flex items-center justify-between px-5 py-3.5"
                style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
              >
                <span className="text-[13px] font-medium" style={{ color: "#0D1016" }}>
                  Registro Incidenti
                </span>
                <button
                  onClick={() => { setShowForm((v) => !v); if (showForm) { setIncidentChatMessages([{ role: "assistant", content: "Ciao! Descrivi l'evento che vuoi segnalare e ti aiuto a capire se rientra nell'Art. 73, quale gravità assegnare e la scadenza di notifica." }]); setIncidentChatInput(""); } }}
                  className="flex items-center gap-1 text-[11px] font-semibold rounded-lg px-3 py-1.5"
                  style={{
                    background: "#0D1016",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {showForm ? <X className="h-3 w-3" /> : <Bell className="h-3 w-3" />}
                  {showForm ? "Annulla" : "+ Nuovo incidente"}

                </button>
              </div>

              {/* Form */}
              <AnimatePresence>
                {showForm && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.14 }}
                    className="px-5 py-4 space-y-3"
                    style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", background: "rgba(0,0,0,0.01)" }}
                  >
                    <p className="text-[12px] font-semibold" style={{ color: "#0D1016" }}>
                      Nuova segnalazione incidente grave (Art. 73)
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-medium mb-1" style={{ color: "rgba(0,0,0,0.45)" }}>
                          Titolo <span style={{ color: "#dc2626" }}>*</span>
                        </label>
                        <input
                          style={INPUT_STYLE}
                          placeholder="Es. Falso positivo biometrico"
                          value={form.title}
                          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium mb-1" style={{ color: "rgba(0,0,0,0.45)" }}>
                          Sistema coinvolto <span style={{ color: "#dc2626" }}>*</span>
                        </label>
                        <select
                          style={{ ...INPUT_STYLE, cursor: "pointer" }}
                          value={inventorySystems.find(s => s.name === form.system)?.id ?? (form.system === "__altro__" ? "__altro__" : form.system ? "__altro__" : "")}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "") {
                              setForm((f) => ({ ...f, system: "", systemId: undefined }));
                              setSystemFreeText("");
                            } else if (val === "__altro__") {
                              setForm((f) => ({ ...f, system: systemFreeText, systemId: undefined }));
                            } else {
                              const sys = inventorySystems.find(s => s.id === val);
                              if (sys) setForm((f) => ({ ...f, system: sys.name, systemId: sys.id }));
                              setSystemFreeText("");
                            }
                          }}
                        >
                          <option value="">— Seleziona sistema —</option>
                          {inventorySystems.map(sys => (
                            <option key={sys.id} value={sys.id}>
                              {sys.name}
                              {sys.tier !== "unclassified" ? ` · ${sys.tier.replace("_", " ")}` : ""}
                            </option>
                          ))}
                          <option value="__altro__">Altro (non in inventario)</option>
                        </select>
                        {(form.system === "__altro__" || (form.system && !inventorySystems.find(s => s.name === form.system))) && (
                          <input
                            style={{ ...INPUT_STYLE, marginTop: 6 }}
                            placeholder="Nome sistema non inventariato…"
                            value={systemFreeText}
                            onChange={(e) => {
                              setSystemFreeText(e.target.value);
                              setForm((f) => ({ ...f, system: e.target.value, systemId: undefined }));
                            }}
                          />
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-medium mb-1" style={{ color: "rgba(0,0,0,0.45)" }}>
                          Data rilevamento
                        </label>
                        <input
                          type="date"
                          style={INPUT_STYLE}
                          value={form.date}
                          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium mb-1" style={{ color: "rgba(0,0,0,0.45)" }}>
                          Autorità competente
                        </label>
                        <select
                          style={{ ...INPUT_STYLE, cursor: "pointer" }}
                          value={form.authority}
                          onChange={(e) => setForm((f) => ({ ...f, authority: e.target.value }))}
                        >
                          {[
                            "AGID",
                            "Garante Privacy",
                            "Garante Concorrenza (AGCM)",
                            "Banca d'Italia",
                            "IVASS",
                            "Ministero della Salute",
                            "Autorità straniera",
                            "Da determinare",
                          ].map((a) => (
                            <option key={a} value={a}>
                              {a}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-[10px] font-medium" style={{ color: "rgba(0,0,0,0.45)" }}>
                          Gravità
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowSeverityGuide(v => !v)}
                          style={{ fontSize: 9, color: "rgba(0,0,0,0.4)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                        >
                          {showSeverityGuide ? "Nascondi guida" : "Come scelgo?"}
                        </button>
                      </div>
                      <div className="flex gap-2">
                        {(["critical", "high", "medium", "low"] as Severity[]).map((s) => {
                          const active = form.severity === s;
                          const st = SEV_STYLE[s];
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setForm((f) => ({ ...f, severity: s }))}
                              style={{
                                padding: "3px 10px",
                                borderRadius: "999px",
                                fontSize: "10px",
                                fontWeight: 600,
                                cursor: "pointer",
                                border: active ? `1px solid ${st.border}` : "1px solid rgba(0,0,0,0.1)",
                                background: active ? st.bg : "#fff",
                                color: active ? st.color : "rgba(0,0,0,0.45)",
                                transition: "all 0.12s",
                              }}
                            >
                              {s.charAt(0).toUpperCase() + s.slice(1)}
                            </button>
                          );
                        })}
                      </div>
                      {showSeverityGuide && (
                        <div style={{ marginTop: 10, borderRadius: 10, border: "1px solid rgba(0,0,0,0.08)", overflow: "hidden" }}>
                          {/* Header */}
                          <div style={{ padding: "8px 14px", background: "rgba(0,0,0,0.03)", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
                            <p style={{ fontSize: 9, fontWeight: 700, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
                              Guida classificazione — Art. 73 + Art. 3(49) Reg. UE 2024/1689
                            </p>
                            <p style={{ fontSize: 9, color: "rgba(0,0,0,0.3)", margin: "3px 0 0" }}>
                              Solo gli incidenti <strong>Critical</strong> e <strong>High</strong> sono "incidenti gravi" ai sensi dell&apos;Art. 3(49) e richiedono notifica formale all&apos;autorità.
                            </p>
                          </div>

                          {/* Rows */}
                          {[
                            {
                              sev: "Critical",
                              color: "#dc2626",
                              bg: "rgba(220,38,38,0.06)",
                              border: "rgba(220,38,38,0.12)",
                              ref: "Art. 73(3) + Art. 3(49)",
                              criteria: [
                                "Morte di una persona o rischio imminente di morte",
                                "Lesioni personali gravi o irreversibili",
                                "Interruzione grave di infrastruttura critica: energia, acqua, trasporti, finanza, sanità",
                                "Danni gravi e irreversibili all'ambiente",
                                "Violazioni gravi dei diritti fondamentali con impatto sistemico",
                              ],
                              examples: "Es. sistema di triage ospedaliero che non rileva un'emergenza cardiaca; AI per la gestione della rete elettrica che provoca blackout; sistema di riconoscimento biometrico che autorizza l'accesso a soggetti non autorizzati in strutture critiche.",
                              deadline: "Notifica IMMEDIATA",
                              deadlineSub: "max 2 giorni lavorativi dal rilevamento (Art. 73(3))",
                              deadlineColor: "#dc2626",
                              action: "Notifica urgente + sospensione sistema raccomandata",
                            },
                            {
                              sev: "High",
                              color: "#ea580c",
                              bg: "rgba(234,88,12,0.05)",
                              border: "rgba(234,88,12,0.12)",
                              ref: "Art. 73(2) + Art. 3(49)(a)(b)(c)",
                              criteria: [
                                "Danno grave ma non immediato alla salute fisica o mentale",
                                "Violazione grave di diritti fondamentali (es. discriminazione sistematica, profilazione illecita)",
                                "Danno significativo a proprietà o ambiente senza carattere di emergenza",
                                "Malfunzionamento che impatta numerosi utenti con danni individuali rilevanti",
                                "Perdita significativa e non autorizzata di dati personali sensibili causata dall'AI",
                              ],
                              examples: "Es. sistema AI HR che esclude sistematicamente candidati per origine etnica; chatbot medico che fornisce indicazioni farmacologiche errate con danni ai pazienti; sistema di scoring creditizio che nega accesso al credito a causa di bias documentato.",
                              deadline: "Notifica entro 15 giorni lavorativi",
                              deadlineSub: "dal momento in cui il provider viene a conoscenza dell'incidente (Art. 73(2))",
                              deadlineColor: "#ea580c",
                              action: "Apertura fascicolo + notifica all'autorità competente",
                            },
                            {
                              sev: "Medium",
                              color: "#d97706",
                              bg: "rgba(217,119,6,0.04)",
                              border: "rgba(217,119,6,0.12)",
                              ref: "Art. 9 — monitoraggio post-market",
                              criteria: [
                                "Malfunzionamento significativo senza danno immediato a persone",
                                "Potenziale violazione normativa in corso di accertamento",
                                "Comportamento dell'AI significativamente difforme dalle specifiche tecniche",
                                "Errori sistematici su sottogruppi di utenti non ancora quantificati",
                                "Incidente che potrebbe evolvere in High se non gestito",
                              ],
                              examples: "Es. sistema di riconoscimento vocale che fallisce sistematicamente su accenti regionali specifici; AI per la selezione dei curricula con tasso di falsi negativi anormalmente elevato su un genere; modello di previsione della domanda con drift significativo non ancora causante perdite.",
                              deadline: "Indagine interna obbligatoria",
                              deadlineSub: "nessuna notifica esterna obbligatoria — documentare nel registro interno",
                              deadlineColor: "#d97706",
                              action: "Apertura indagine interna + aggiornamento Risk Register",
                            },
                            {
                              sev: "Low",
                              color: "#16a34a",
                              bg: "rgba(22,163,74,0.04)",
                              border: "rgba(22,163,74,0.12)",
                              ref: "Art. 72 — sorveglianza post-market",
                              criteria: [
                                "Near-miss: malfunzionamento rilevato prima di causare danno",
                                "Anomalia tecnica minore senza impatto su utenti finali",
                                "Segnalazione precauzionale da parte di un deployer o utente",
                                "Comportamento inatteso dell'AI senza conseguenze documentate",
                                "Feedback negativo ricorrente senza danno identificabile",
                              ],
                              examples: "Es. sistema di chatbot che fornisce risposta ambigua senza conseguenze; AI di routing logistico che suggerisce percorsi non ottimali senza impatti sulla sicurezza; modello di scoring che produce output incoerente in <0,1% dei casi senza impatto su decisioni reali.",
                              deadline: "Monitoraggio continuo",
                              deadlineSub: "registrare nel log interno — nessun obbligo di notifica esterna",
                              deadlineColor: "#16a34a",
                              action: "Registrazione nel log eventi + revisione al prossimo ciclo PMM",
                            },
                          ].map((row, idx) => (
                            <div key={row.sev} style={{ borderBottom: idx < 3 ? "1px solid rgba(0,0,0,0.06)" : "none", padding: "12px 14px" }}>
                              {/* Severity badge + deadline */}
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: row.color, background: row.bg, border: `1px solid ${row.border}`, padding: "2px 10px", borderRadius: 20 }}>{row.sev}</span>
                                  <span style={{ fontSize: 9, color: "rgba(0,0,0,0.35)" }}>{row.ref}</span>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: row.deadlineColor }}>{row.deadline}</span>
                                  <p style={{ fontSize: 9, color: "rgba(0,0,0,0.35)", margin: "2px 0 0", maxWidth: 200 }}>{row.deadlineSub}</p>
                                </div>
                              </div>

                              {/* Criteria list */}
                              <ul style={{ margin: "0 0 6px", padding: "0 0 0 14px", listStyleType: "disc" }}>
                                {row.criteria.map((c, i) => (
                                  <li key={i} style={{ fontSize: 10, color: "rgba(0,0,0,0.6)", lineHeight: 1.5, marginBottom: 2 }}>{c}</li>
                                ))}
                              </ul>

                              {/* Example */}
                              <p style={{ fontSize: 10, color: "rgba(0,0,0,0.42)", lineHeight: 1.45, margin: "4px 0 5px", fontStyle: "italic" }}>{row.examples}</p>

                              {/* Action */}
                              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, background: row.bg, border: `1px solid ${row.border}` }}>
                                <span style={{ fontSize: 9, fontWeight: 600, color: row.color }}>→ {row.action}</span>
                              </div>
                            </div>
                          ))}

                          {/* Footer note */}
                          <div style={{ padding: "8px 14px", background: "rgba(0,0,0,0.02)", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                            <p style={{ fontSize: 9, color: "rgba(0,0,0,0.3)", margin: 0, lineHeight: 1.5 }}>
                              ⚠ In caso di dubbio tra Critical e High, classificare sempre come Critical e notificare entro 2 gg. La riclassificazione può avvenire dopo la notifica iniziale (Art. 73(5)). [verify against current AI Act text]
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-medium mb-1" style={{ color: "rgba(0,0,0,0.45)" }}>
                        Utenti impattati (stima)
                      </label>
                      <input
                        style={INPUT_STYLE}
                        placeholder="Es. ~340, sconosciuto"
                        value={form.affectedUsers}
                        onChange={(e) => setForm((f) => ({ ...f, affectedUsers: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-medium mb-1" style={{ color: "rgba(0,0,0,0.45)" }}>
                        Descrizione dettagliata <span style={{ color: "#dc2626" }}>*</span>
                      </label>
                      <textarea
                        style={{ ...INPUT_STYLE, minHeight: "72px", resize: "vertical" }}
                        rows={3}
                        placeholder="Descrizione completa dell'incidente..."
                        value={form.description}
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-medium mb-1" style={{ color: "rgba(0,0,0,0.45)" }}>
                        Azioni già intraprese
                      </label>
                      <textarea
                        style={{ ...INPUT_STYLE, minHeight: "56px", resize: "vertical" }}
                        rows={2}
                        placeholder="Es. Sistema sospeso, patch applicata..."
                        value={form.actions}
                        onChange={(e) => setForm((f) => ({ ...f, actions: e.target.value }))}
                      />
                    </div>

                    <button
                      onClick={handleRegisterIncident}
                      disabled={!form.title.trim() || !form.system.trim() || !form.description.trim()}
                      style={{
                        width: "100%",
                        padding: "9px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: 600,
                        background:
                          form.title.trim() && form.system.trim() && form.description.trim()
                            ? "#0D1016"
                            : "rgba(0,0,0,0.1)",
                        color:
                          form.title.trim() && form.system.trim() && form.description.trim()
                            ? "#fff"
                            : "rgba(0,0,0,0.3)",
                        border: "none",
                        cursor:
                          form.title.trim() && form.system.trim() && form.description.trim()
                            ? "pointer"
                            : "not-allowed",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <Send className="h-3.5 w-3.5" />
                      Registra incidente
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Incident list */}
              {filtered.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <AlertTriangle
                    className="h-7 w-7 mx-auto mb-2"
                    style={{ color: "rgba(0,0,0,0.15)" }}
                  />
                  <p className="text-[12px]" style={{ color: "rgba(0,0,0,0.38)" }}>
                    Nessun incidente corrisponde ai filtri selezionati.
                  </p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
                  {filtered.map((inc) => {
                    const days = getDaysRemaining(inc.date, inc.notified, inc.notificationDeadlineDate);
                    const sev = SEV_STYLE[inc.severity];
                    const isSelected = selected?.id === inc.id;
                    const deadlineDays = inc.notificationDeadlineType === "immediate_2d" ? 2 : 15;
                    const progressPct = inc.notified ? 100 : ((deadlineDays - days) / deadlineDays) * 100;
                    return (
                      <div
                        key={inc.id}
                        onClick={() => setSelected(isSelected ? null : inc)}
                        className="px-5 py-3.5 cursor-pointer transition-colors hover:bg-gray-50"
                        style={{ background: isSelected ? "rgba(0,0,0,0.02)" : undefined }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-[10px] font-mono flex-shrink-0"
                              style={{ color: "rgba(0,0,0,0.35)" }}
                            >
                              {inc.id}
                            </span>
                            <span
                              className="text-[12px] font-medium truncate"
                              style={{ color: "#0D1016" }}
                            >
                              {inc.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {inc.source === "logvault_auto" && (
                              <span
                                className="flex items-center gap-0.5 text-[9px] font-semibold rounded-full px-1.5 py-0.5"
                                style={{ background: "rgba(124,58,237,0.08)", color: "#7c3aed", border: "1px solid rgba(124,58,237,0.2)" }}
                              >
                                <Sparkles className="h-2.5 w-2.5" /> Auto
                              </span>
                            )}
                            {inc.severityClassification === "serious_incident" && (
                              <span
                                className="text-[9px] font-semibold rounded-full px-1.5 py-0.5"
                                style={{ background: "rgba(220,38,38,0.08)", color: "#b91c1c", border: "1px solid rgba(220,38,38,0.2)" }}
                              >
                                Incidente grave
                              </span>
                            )}
                            <span
                              className="text-[10px] font-semibold rounded-full px-2 py-0.5"
                              style={{
                                background: sev.bg,
                                color: sev.color,
                                border: `1px solid ${sev.border}`,
                              }}
                            >
                              {inc.severity}
                            </span>
                            <span
                              className="text-[10px] font-medium"
                              style={{ color: STATUS_COLOR[inc.status] }}
                            >
                              {STATUS_LABEL[inc.status]}
                            </span>
                          </div>
                        </div>
                        <p className="text-[11px] mb-1.5" style={{ color: "rgba(0,0,0,0.4)" }}>
                          {inc.system} · {inc.date}
                        </p>
                        {!inc.notified && (
                          <div className="mt-1.5">
                            {days === 0 ? (
                              <p
                                className="text-[10px] font-semibold"
                                style={{ color: "#dc2626" }}
                              >
                                ⚠ SCADUTO — notifica urgente
                              </p>
                            ) : (
                              <>
                                <div className="flex items-center gap-1 mb-1">
                                  <Clock
                                    className="h-3 w-3 flex-shrink-0"
                                    style={{ color: "#dc2626" }}
                                  />
                                  <span
                                    className="text-[10px] font-medium"
                                    style={{ color: "#dc2626" }}
                                  >
                                    Notifica entro {days} giorn{days === 1 ? "o" : "i"} (Art. 73)
                                  </span>
                                </div>
                                <div
                                  className="h-0.5 rounded-full overflow-hidden"
                                  style={{ background: "rgba(220,38,38,0.12)" }}
                                >
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                      width: `${Math.min(progressPct, 100)}%`,
                                      background: "#dc2626",
                                    }}
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        )}
                        {inc.notified && (
                          <p
                            className="text-[10px] font-medium flex items-center gap-1"
                            style={{ color: "#15803d" }}
                          >
                            <CheckCircle className="h-3 w-3" /> Notificato
                            {inc.notifiedAt ? ` il ${inc.notifiedAt.slice(0, 10)}` : ""}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Draggable divider (only during form) */}
          {showForm && (
            <div
              onMouseDown={startFormResize}
              style={{
                width: 8, flexShrink: 0, cursor: "col-resize",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 4px",
                borderRadius: 4,
                background: isFormResizing ? "rgba(0,0,0,0.10)" : "transparent",
                transition: isFormResizing ? "none" : "background 0.15s",
              }}
              onMouseEnter={e => { if (!isFormResizing) e.currentTarget.style.background = "rgba(0,0,0,0.07)"; }}
              onMouseLeave={e => { if (!isFormResizing) e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{ width: 2, height: 36, borderRadius: 1, background: "rgba(0,0,0,0.18)" }} />
            </div>
          )}

          {/* Right: AI chat (during form) or incident detail */}
          <div
            className="space-y-4"
            style={showForm
              ? { width: formChatWidth, flexShrink: 0, position: "sticky", top: 16, alignSelf: "flex-start" }
              : {}
            }
          >
            {showForm ? (
              /* ── Incident form AI chat ── */
              <div
                className="rounded-xl overflow-hidden flex flex-col"
                style={{ border: "1px solid rgba(0,0,0,0.07)", background: "#fff", height: "calc(100vh - 140px)" }}
              >
                {/* Header */}
                <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(0,0,0,0.07)", background: "#fafafa", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#0D1016" }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#0D1016" }}>Assistente Art. 73</span>
                  <span style={{ fontSize: 10, color: "rgba(0,0,0,0.35)", marginLeft: 2 }}>— guida normativa AI Act</span>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 8px" }}>
                  {incidentChatMessages.map((msg, i) => {
                    const isUser = msg.role === "user";
                    return (
                      <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 10 }}>
                        <div style={{
                          maxWidth: "90%",
                          borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                          padding: "9px 13px",
                          fontSize: 12, lineHeight: 1.55,
                          background: isUser ? "#0D1016" : "#f5f5f4",
                          color: isUser ? "#fff" : "#0D1016",
                          border: isUser ? "none" : "1px solid rgba(0,0,0,0.07)",
                          whiteSpace: "pre-wrap",
                        }}>
                          {!isUser && (
                            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                              <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(0,0,0,0.35)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Art. 73 AI</span>
                            </div>
                          )}
                          {msg.content}
                        </div>
                      </div>
                    );
                  })}

                  {/* Pending field suggestion chip */}
                  {pendingSuggestion && !incidentChatLoading && (
                    <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 10 }}>
                      <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.10)", borderRadius: 12, padding: "10px 14px", maxWidth: "90%" }}>
                        <p style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.45)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                          Proposta per: {pendingSuggestion.label}
                        </p>
                        <p style={{ fontSize: 12, color: "#0D1016", margin: "0 0 10px", lineHeight: 1.5, fontStyle: "italic" }}>
                          &ldquo;{pendingSuggestion.value}&rdquo;
                        </p>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => applyFieldSuggestion(pendingSuggestion)}
                            style={{ fontSize: 11, fontWeight: 700, padding: "5px 14px", borderRadius: 20, background: "#0D1016", color: "#fff", border: "none", cursor: "pointer" }}
                          >
                            ✓ Applica nel form
                          </button>
                          <button
                            onClick={() => setPendingSuggestion(null)}
                            style={{ fontSize: 11, padding: "5px 12px", borderRadius: 20, background: "rgba(0,0,0,0.05)", color: "rgba(0,0,0,0.5)", border: "1px solid rgba(0,0,0,0.08)", cursor: "pointer" }}
                          >
                            Ignora
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {incidentChatLoading && (
                    <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 10 }}>
                      <div style={{ background: "#f5f5f4", border: "1px solid rgba(0,0,0,0.07)", borderRadius: "14px 14px 14px 4px", padding: "9px 13px", display: "flex", alignItems: "center", gap: 7 }}>
                        <Loader2 size={12} style={{ color: "#0D1016", animation: "spin 1s linear infinite" }} />
                        <span style={{ fontSize: 11, color: "rgba(0,0,0,0.4)" }}>Analisi in corso…</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(0,0,0,0.07)", flexShrink: 0 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                    <textarea
                      value={incidentChatInput}
                      onChange={(e) => setIncidentChatInput(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          const text = incidentChatInput.trim();
                          if (!text || incidentChatLoading) return;
                          const userMsg: IncidentChatMessage = { role: "user", content: text };
                          const newMsgs = [...incidentChatMessages, userMsg];
                          setIncidentChatMessages(newMsgs);
                          setIncidentChatInput("");
                          setPendingSuggestion(null);
                          setIncidentChatLoading(true);
                          const { reply, suggestion } = await incidentFormChat(newMsgs, {
                            title: form.title, system: form.system, date: form.date,
                            severity: form.severity, authority: form.authority,
                            affectedUsers: form.affectedUsers, description: form.description,
                            actions: form.actions,
                          });
                          setIncidentChatMessages([...newMsgs, { role: "assistant", content: reply || "Errore nella risposta AI — riprova." }]);
                          if (suggestion) setPendingSuggestion(suggestion);
                          setIncidentChatLoading(false);
                        }
                      }}
                      placeholder="Descrivi cosa è successo…"
                      rows={2}
                      disabled={incidentChatLoading}
                      style={{ flex: 1, fontSize: 12, padding: "8px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)", color: "#0D1016", resize: "none", outline: "none", fontFamily: "var(--font-inter, system-ui)", background: "#fff", lineHeight: 1.5, opacity: incidentChatLoading ? 0.5 : 1 }}
                    />
                    <button
                      disabled={!incidentChatInput.trim() || incidentChatLoading}
                      onClick={async () => {
                        const text = incidentChatInput.trim();
                        if (!text || incidentChatLoading) return;
                        const userMsg: IncidentChatMessage = { role: "user", content: text };
                        const newMsgs = [...incidentChatMessages, userMsg];
                        setIncidentChatMessages(newMsgs);
                        setIncidentChatInput("");
                        setPendingSuggestion(null);
                        setIncidentChatLoading(true);
                        const { reply, suggestion } = await incidentFormChat(newMsgs, {
                          title: form.title, system: form.system, date: form.date,
                          severity: form.severity, authority: form.authority,
                          affectedUsers: form.affectedUsers, description: form.description,
                          actions: form.actions,
                        });
                        setIncidentChatMessages([...newMsgs, { role: "assistant", content: reply || "Errore nella risposta AI — riprova." }]);
                        if (suggestion) setPendingSuggestion(suggestion);
                        setIncidentChatLoading(false);
                      }}
                      style={{ flexShrink: 0, width: 36, height: 36, background: (!incidentChatInput.trim() || incidentChatLoading) ? "rgba(0,0,0,0.06)" : "#0D1016", color: (!incidentChatInput.trim() || incidentChatLoading) ? "rgba(0,0,0,0.25)" : "#fff", border: "none", borderRadius: 9, cursor: (!incidentChatInput.trim() || incidentChatLoading) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <Send size={13} />
                    </button>
                  </div>
                  <p style={{ fontSize: 9, color: "rgba(0,0,0,0.25)", marginTop: 5 }}>Enter per inviare · Shift+Enter per andare a capo</p>
                </div>
              </div>
            ) : !selected ? (
              <div
                className="rounded-xl p-6 text-center"
                style={{ border: "1px solid rgba(0,0,0,0.07)", background: "#fff" }}
              >
                <AlertTriangle
                  className="h-7 w-7 mx-auto mb-2"
                  style={{ color: "rgba(0,0,0,0.15)" }}
                />
                <p className="text-[12px]" style={{ color: "rgba(0,0,0,0.4)" }}>
                  Seleziona un incidente per i dettagli e le azioni.
                </p>
              </div>
            ) : (
              <>
                {/* 5-step linear stepper */}
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: "1px solid rgba(0,0,0,0.07)", background: "#fff" }}
                >
                  {/* Header: title + status */}
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                      <div>
                        <span style={{ fontSize: 10, fontFamily: "var(--font-dm-mono, monospace)", color: "rgba(0,0,0,0.35)" }}>
                          {selected.id}
                        </span>
                        <p style={{ fontSize: 12, fontWeight: 600, color: "#0D1016", margin: "1px 0 0" }}>
                          {selected.title}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelected(null)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(0,0,0,0.3)", padding: "2px", flexShrink: 0 }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {(["pending", "reported", "investigating", "resolved", "closed"] as IncidentStatus[]).map((s) => {
                        const active = selected.status === s;
                        return (
                          <button
                            key={s}
                            onClick={() => updateStatus(selected.id, s)}
                            style={{
                              padding: "2px 8px", borderRadius: 6, fontSize: 9, fontWeight: 500, cursor: "pointer",
                              background: active ? `${STATUS_COLOR[s]}18` : "rgba(0,0,0,0.04)",
                              color: active ? STATUS_COLOR[s] : "rgba(0,0,0,0.38)",
                              border: active ? `1px solid ${STATUS_COLOR[s]}40` : "1px solid transparent",
                              transition: "all 0.12s",
                            }}
                          >
                            {STATUS_LABEL[s]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step nav */}
                  <div style={{ display: "flex", alignItems: "center", padding: "8px 16px", borderBottom: "1px solid rgba(0,0,0,0.07)", background: "rgba(0,0,0,0.01)" }}>
                    {[
                      { n: 1, label: "Dati" },
                      { n: 2, label: "Classifica" },
                      { n: 3, label: "Termine" },
                      { n: 4, label: "Notifica" },
                      { n: 5, label: "Follow-up" },
                    ].map(({ n, label }, i) => (
                      <div key={n} style={{ display: "flex", alignItems: "center", flex: i < 4 ? "none" : undefined }}>
                        <button
                          onClick={() => setStepperStep(n)}
                          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                        >
                          <div style={{
                            width: 22, height: 22, borderRadius: 11,
                            background: stepperStep === n ? "#0D1016" : stepperStep > n ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.06)",
                            color: stepperStep === n ? "#fff" : "rgba(0,0,0,0.4)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 9, fontWeight: 700, transition: "all 0.15s",
                          }}>
                            {n}
                          </div>
                          <span style={{ fontSize: 8, color: stepperStep === n ? "#0D1016" : "rgba(0,0,0,0.35)", fontWeight: stepperStep === n ? 600 : 400, whiteSpace: "nowrap" }}>
                            {label}
                          </span>
                        </button>
                        {i < 4 && (
                          <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.09)", margin: "0 6px", marginBottom: 13, minWidth: 12 }} />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Step content */}
                  <div style={{ padding: "14px 16px" }}>

                    {/* Step 1: Dati incidente */}
                    {stepperStep === 1 && (
                      <div className="space-y-2.5">
                        {[
                          { label: "Sistema", value: selected.system },
                          { label: "Data rilevamento", value: selected.date },
                          { label: "Autorità", value: selected.authority },
                          { label: "Utenti impattati", value: selected.affectedUsers || "—" },
                        ].map(row => (
                          <div key={row.label}>
                            <span style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "rgba(0,0,0,0.35)", display: "block" }}>{row.label}</span>
                            <p style={{ fontSize: 11, color: "#0D1016", margin: "1px 0 0" }}>{row.value}</p>
                          </div>
                        ))}
                        <div>
                          <span style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "rgba(0,0,0,0.35)", display: "block" }}>Descrizione</span>
                          <p style={{ fontSize: 11, color: "rgba(0,0,0,0.55)", lineHeight: 1.5, margin: "1px 0 0" }}>{selected.description}</p>
                        </div>
                        {selected.actions && (
                          <div>
                            <span style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "rgba(0,0,0,0.35)", display: "block" }}>Azioni intraprese</span>
                            <p style={{ fontSize: 11, color: "rgba(0,0,0,0.55)", lineHeight: 1.5, margin: "1px 0 0" }}>{selected.actions}</p>
                          </div>
                        )}
                        {selected.source === "logvault_auto" && (
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 12px", borderRadius: 8, background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.18)" }}>
                            <Sparkles className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: "#7c3aed" }} />
                            <p style={{ fontSize: 10, color: "#7c3aed", margin: 0 }}>Bozza generata automaticamente da LogVault. Verifica i dati prima di procedere.</p>
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
                          <button
                            onClick={() => exportIncidentTxt(selected)}
                            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "rgba(0,0,0,0.5)", background: "none", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}
                          >
                            <Download className="h-3 w-3" /> Esporta scheda
                          </button>
                          <button
                            onClick={() => setStepperStep(2)}
                            style={{ flex: 1, fontSize: 10, fontWeight: 600, background: "#0D1016", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}
                          >
                            Avanti — Classifica →
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 2: Classifica */}
                    {stepperStep === 2 && (
                      <div className="space-y-3">
                        <p style={{ fontSize: 10, color: "rgba(0,0,0,0.45)", lineHeight: 1.5, margin: 0 }}>
                          Incidente grave ai sensi dell&apos;Art. 3(49) Reg. (UE) 2024/1689 se coinvolge almeno una delle categorie seguenti.
                        </p>
                        {INCIDENT_CATEGORIES.map(cat => (
                          <label key={cat.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={stepperCategories.includes(cat.id)}
                              onChange={e => {
                                setStepperCategories(prev =>
                                  e.target.checked ? [...prev, cat.id] : prev.filter(id => id !== cat.id)
                                );
                              }}
                              style={{ accentColor: "#dc2626", marginTop: 2, flexShrink: 0 }}
                            />
                            <div>
                              <p style={{ fontSize: 11, color: "#0D1016", margin: 0 }}>{cat.label}</p>
                              <p style={{ fontSize: 9, color: "rgba(0,0,0,0.35)", margin: "1px 0 0" }}>
                                {cat.articleRef} · {cat.deadlineDays} gg — {cat.deadlineArtRef}
                              </p>
                            </div>
                          </label>
                        ))}

                        {stepperCategories.length > 0 && (() => {
                          const dl = computeDeadline(stepperCategories);
                          return dl ? (
                            <div style={{
                              padding: "8px 12px", borderRadius: 8,
                              background: dl.days <= 2 ? "rgba(220,38,38,0.06)" : "rgba(0,0,0,0.04)",
                              border: `1px solid ${dl.days <= 2 ? "rgba(220,38,38,0.2)" : "rgba(0,0,0,0.1)"}`,
                            }}>
                              <p style={{ fontSize: 10, fontWeight: 600, color: dl.days <= 2 ? "#dc2626" : "#0D1016", margin: 0 }}>
                                Termine reattivo: {dl.days} giorni ({dl.artRef})
                              </p>
                              <p style={{ fontSize: 9, color: "rgba(0,0,0,0.4)", margin: "2px 0 0" }}>
                                Scadenza: {addDays(selected.date, dl.days)}
                              </p>
                            </div>
                          ) : null;
                        })()}

                        <button
                          onClick={() => {
                            applyNewClassification(selected.id, stepperCategories, selected.date);
                            setStepperStep(stepperCategories.length > 0 ? 3 : 5);
                          }}
                          style={{ width: "100%", fontSize: 10, fontWeight: 600, background: "#0D1016", color: "#fff", border: "none", borderRadius: 6, padding: "7px", cursor: "pointer" }}
                        >
                          Applica classificazione
                        </button>
                        {stepperCategories.length === 0 && (
                          <p style={{ fontSize: 9, color: "rgba(0,0,0,0.35)", textAlign: "center", margin: 0 }}>
                            Nessuna categoria → nessun obbligo di notifica esterna (Art. 72)
                          </p>
                        )}
                      </div>
                    )}

                    {/* Step 3: Termine calcolato */}
                    {stepperStep === 3 && (() => {
                      const deadline = selected.notificationDeadlineDate;
                      const days = getDaysRemaining(selected.date, selected.notified, deadline);
                      const isAlert = days <= 2;
                      const dl = selected.notificationDeadlineType === "immediate_2d" ? 2 : 15;
                      const dlRef = selected.notificationDeadlineType === "immediate_2d" ? "Art. 73(3)" : "Art. 73(2)";
                      return (
                        <div className="space-y-3">
                          <div style={{
                            padding: "12px 14px", borderRadius: 10,
                            background: isAlert ? "rgba(220,38,38,0.06)" : "rgba(0,0,0,0.03)",
                            border: `1px solid ${isAlert ? "rgba(220,38,38,0.25)" : "rgba(0,0,0,0.1)"}`,
                          }}>
                            <p style={{ fontSize: 18, fontWeight: 700, color: isAlert ? "#dc2626" : "#0D1016", margin: 0 }}>
                              {selected.notified ? "✓ Notificato" : days === 0 ? "SCADUTO" : `${days} giorni rimanenti`}
                            </p>
                            {!selected.notified && (
                              <p style={{ fontSize: 10, color: "rgba(0,0,0,0.45)", margin: "4px 0 0" }}>
                                termine di {dl} giorni ({dlRef}){deadline ? ` — scadenza ${deadline}` : ""}
                              </p>
                            )}
                            {isAlert && !selected.notified && days > 0 && (
                              <p style={{ fontSize: 10, fontWeight: 600, color: "#dc2626", margin: "6px 0 0" }}>
                                ⚠ Notifica urgente — contatta l&apos;autorità immediatamente
                              </p>
                            )}
                          </div>
                          {selected.severityClassification && (
                            <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.08)" }}>
                              <p style={{ fontSize: 10, fontWeight: 600, color: "#0D1016", margin: 0 }}>
                                {SEVERITY_CLASS_LABEL[selected.severityClassification]}
                              </p>
                              {selected.notificationDeadlineType && selected.notificationDeadlineType !== "none" && (
                                <p style={{ fontSize: 9, color: "rgba(0,0,0,0.45)", margin: "2px 0 0" }}>
                                  {DEADLINE_TYPE_LABEL[selected.notificationDeadlineType]}
                                </p>
                              )}
                            </div>
                          )}
                          <button
                            onClick={() => setStepperStep(4)}
                            style={{ width: "100%", fontSize: 10, fontWeight: 600, background: "#0D1016", color: "#fff", border: "none", borderRadius: 6, padding: "7px", cursor: "pointer" }}
                          >
                            Avanti — Genera notifica →
                          </button>
                        </div>
                      );
                    })()}

                    {/* Step 4: Genera/Notifica */}
                    {stepperStep === 4 && (
                      <div className="space-y-3">
                        {selected.notified ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.2)" }}>
                            <CheckCircle className="h-4 w-4 flex-shrink-0" style={{ color: "#15803d" }} />
                            <p style={{ fontSize: 11, fontWeight: 500, color: "#15803d", margin: 0 }}>
                              Notificato il {selected.notifiedAt?.slice(0, 10) ?? "—"}
                            </p>
                          </div>
                        ) : selected.severityClassification !== "serious_incident" ? (
                          <p style={{ fontSize: 11, color: "rgba(0,0,0,0.4)", margin: 0 }}>
                            Nessuna notifica obbligatoria — registra nel log interno (Art. 72).
                          </p>
                        ) : (
                          <>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              <button
                                onClick={() => setShowNotifyModal(true)}
                                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: "#dc2626", color: "#fff", border: "none", cursor: "pointer" }}
                              >
                                <FileText className="h-3.5 w-3.5" /> Genera testo notifica
                              </button>
                              <button
                                onClick={() => markNotified(selected.id)}
                                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px", borderRadius: 8, fontSize: 11, fontWeight: 600, border: "1px solid rgba(220,38,38,0.3)", color: "#dc2626", background: "none", cursor: "pointer" }}
                              >
                                <CheckCircle className="h-3.5 w-3.5" /> Segna come notificato
                              </button>
                            </div>
                            <p style={{ fontSize: 9, color: "rgba(0,0,0,0.3)", lineHeight: 1.5, margin: 0 }}>
                              Reg. (UE) 2024/1689 Art. 73. La notifica preliminare deve essere seguita da rapporto completo (Art. 73(4)) compilabile nello step 5.
                            </p>
                          </>
                        )}
                        <button
                          onClick={() => setStepperStep(5)}
                          style={{ width: "100%", fontSize: 10, fontWeight: 600, background: "rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.6)", border: "none", borderRadius: 6, padding: "6px", cursor: "pointer" }}
                        >
                          Avanti — Follow-up →
                        </button>
                      </div>
                    )}

                    {/* Step 5: Follow-up */}
                    {stepperStep === 5 && (
                      <div className="space-y-3">
                        <div>
                          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.5)", marginBottom: 4 }}>
                            Causa radice — Sez. 4 <span style={{ color: "#dc2626" }}>*</span>
                          </label>
                          <textarea
                            value={selected.rootCause ?? ""}
                            onChange={e => updateIncidentField(selected.id, "rootCause", e.target.value)}
                            rows={3}
                            placeholder="Causa radice: errore sistema, gap training data, failure deployment…"
                            style={{ width: "100%", fontSize: 11, padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.12)", color: "#0D1016", resize: "vertical", outline: "none", background: "#fff", boxSizing: "border-box" }}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.5)", marginBottom: 4 }}>
                            Misure definitive — Sez. 6 <span style={{ color: "#dc2626" }}>*</span>
                          </label>
                          <textarea
                            value={selected.finalMeasures ?? ""}
                            onChange={e => updateIncidentField(selected.id, "finalMeasures", e.target.value)}
                            rows={3}
                            placeholder="Misure permanenti: patch, retraining, modifica processo…"
                            style={{ width: "100%", fontSize: 11, padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.12)", color: "#0D1016", resize: "vertical", outline: "none", background: "#fff", boxSizing: "border-box" }}
                          />
                        </div>
                        {(() => {
                          const canGenerate = !!(selected.rootCause?.trim() && selected.finalMeasures?.trim());
                          return (
                            <button
                              disabled={!canGenerate}
                              onClick={() => {
                                const text = generateFullReport(selected);
                                const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = `rapporto-completo-art73-${selected.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.txt`;
                                a.click();
                                URL.revokeObjectURL(url);
                                updateIncidentField(selected.id, "status", "report_complete");
                                void appendEvidence("incident", { type: "Post-Market Report Completo Art. 73(4)", incidentId: selected.id, system: selected.system, generatedAt: new Date().toISOString() }, "post-market");
                              }}
                              style={{
                                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                                padding: "8px", borderRadius: 8, fontSize: 10, fontWeight: 600,
                                background: canGenerate ? "#0D1016" : "rgba(0,0,0,0.06)",
                                color: canGenerate ? "#fff" : "rgba(0,0,0,0.3)",
                                border: "none", cursor: canGenerate ? "pointer" : "not-allowed",
                              }}
                            >
                              <Download className="h-3.5 w-3.5" />
                              {canGenerate ? "Genera Rapporto Completo Art. 73(4)" : "Compila le sezioni obbligatorie"}
                            </button>
                          );
                        })()}
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 2 }}>
                          {selected.notificationDeadlineDate && (
                            <a
                              href="/dashboard/compliance-ops/deadlines"
                              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: "rgba(220,38,38,0.04)", border: "1px solid rgba(220,38,38,0.15)", textDecoration: "none" }}
                            >
                              <Clock className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#dc2626" }} />
                              <div style={{ flex: 1 }}>
                                <p style={{ fontSize: 10, fontWeight: 500, color: "#dc2626", margin: 0 }}>Deadline Timeline</p>
                                <p style={{ fontSize: 9, color: "rgba(0,0,0,0.45)", margin: "1px 0 0" }}>Scadenza: {selected.notificationDeadlineDate}</p>
                              </div>
                              <Link2 className="h-3 w-3 flex-shrink-0" style={{ color: "rgba(0,0,0,0.3)" }} />
                            </a>
                          )}
                          <button
                            onClick={() => setTab("monitoring")}
                            style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: "rgba(21,128,61,0.04)", border: "1px solid rgba(21,128,61,0.15)", cursor: "pointer", textAlign: "left" }}
                          >
                            <FileText className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#15803d" }} />
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: 10, fontWeight: 500, color: "#15803d", margin: 0 }}>Monitoraggio Post-Market</p>
                              <p style={{ fontSize: 9, color: "rgba(0,0,0,0.45)", margin: "1px 0 0" }}>Vedi report e piano PMM (Art. 72)</p>
                            </div>
                            <Link2 className="h-3 w-3 flex-shrink-0" style={{ color: "rgba(0,0,0,0.3)" }} />
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}


      {/* ── TAB 2: Piano Art. 72 ── */}
      {tab === "plan" && (
        <div className="space-y-5">
          {/* Header + progress */}
          <div
            className="rounded-xl p-5"
            style={{ border: "1px solid rgba(0,0,0,0.07)", background: "#fff" }}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[13px] font-medium" style={{ color: "#0D1016" }}>
                  Piano di Sorveglianza Post-Market — Art. 72
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "rgba(0,0,0,0.42)" }}>
                  Attività di monitoraggio obbligatorie per sistemi AI ad alto rischio.
                </p>
              </div>
              <button
                onClick={exportPlanCSV}
                className="flex items-center gap-1 text-[11px] font-medium rounded-lg px-3 py-1.5 hover:opacity-80 transition-opacity"
                style={{ border: "1px solid rgba(0,0,0,0.1)", color: "rgba(0,0,0,0.6)" }}
              >
                <Download className="h-3 w-3" /> Esporta piano
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span
                className="text-[11px] font-medium flex-shrink-0"
                style={{ color: "rgba(0,0,0,0.4)" }}
              >
                {planDone}/{planTotal} attività completate
              </span>
              <div
                className="flex-1 h-1.5 rounded-full"
                style={{ background: "rgba(0,0,0,0.07)" }}
              >
                <div
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${planTotal ? (planDone / planTotal) * 100 : 0}%`,
                    background:
                      planDone / planTotal >= 0.8
                        ? "#15803d"
                        : planDone / planTotal >= 0.5
                        ? "#d97706"
                        : "#dc2626",
                  }}
                />
              </div>
              <span
                className="text-[13px] font-semibold flex-shrink-0"
                style={{ color: "#0D1016" }}
              >
                {planTotal ? Math.round((planDone / planTotal) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* Checks list */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid rgba(0,0,0,0.07)", background: "#fff" }}
          >
            <div className="divide-y" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
              {plan.map((check) => {
                const expanded = expandedChecks.has(check.id);
                return (
                  <div key={check.id} className="px-5 py-3.5">
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleCheck(check.id)}
                        className="flex-shrink-0 mt-0.5"
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                      >
                        <div
                          style={{
                            width: "16px",
                            height: "16px",
                            borderRadius: "4px",
                            border: check.done
                              ? "none"
                              : "1.5px solid rgba(0,0,0,0.25)",
                            background: check.done ? "#0D1016" : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.12s",
                          }}
                        >
                          {check.done && (
                            <CheckCircle className="h-3 w-3" style={{ color: "#fff" }} />
                          )}
                        </div>
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => toggleExpand(check.id)}
                          className="flex items-center justify-between w-full text-left"
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                        >
                          <div>
                            <span
                              className="text-[12px] font-medium"
                              style={{
                                color: check.done ? "rgba(0,0,0,0.35)" : "#0D1016",
                                textDecoration: check.done ? "line-through" : "none",
                              }}
                            >
                              {check.label}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span
                                className="text-[10px] font-semibold rounded px-1.5 py-0.5"
                                style={{
                                  background: "rgba(59,130,246,0.08)",
                                  color: "#1d4ed8",
                                }}
                              >
                                {check.article}
                              </span>
                              <span
                                className="text-[10px] rounded px-1.5 py-0.5"
                                style={{
                                  background: "rgba(0,0,0,0.05)",
                                  color: "rgba(0,0,0,0.45)",
                                }}
                              >
                                {check.frequency}
                              </span>
                              {check.done && check.lastDone && (
                                <span
                                  className="text-[10px]"
                                  style={{ color: "#15803d" }}
                                >
                                  ✓ {check.lastDone}
                                </span>
                              )}
                            </div>
                          </div>
                          {expanded ? (
                            <ChevronUp
                              className="h-3.5 w-3.5 flex-shrink-0"
                              style={{ color: "rgba(0,0,0,0.25)" }}
                            />
                          ) : (
                            <ChevronDown
                              className="h-3.5 w-3.5 flex-shrink-0"
                              style={{ color: "rgba(0,0,0,0.25)" }}
                            />
                          )}
                        </button>

                        {/* Expanded note */}
                        <AnimatePresence>
                          {expanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.14 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-2">
                                <label
                                  className="block text-[10px] font-medium mb-1"
                                  style={{ color: "rgba(0,0,0,0.4)" }}
                                >
                                  Note
                                </label>
                                <textarea
                                  value={check.notes}
                                  onChange={(e) => updateNote(check.id, e.target.value)}
                                  placeholder="Aggiungi note, link, riferimenti..."
                                  rows={2}
                                  style={{
                                    ...INPUT_STYLE,
                                    fontSize: "11px",
                                    resize: "vertical",
                                    minHeight: "52px",
                                  }}
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Art. 72 info banner */}
          <div
            className="rounded-xl p-4"
            style={{
              background: "rgba(59,130,246,0.04)",
              border: "1px solid rgba(59,130,246,0.15)",
            }}
          >
            <p className="text-[11px] leading-relaxed" style={{ color: "rgba(0,0,0,0.55)" }}>
              <span className="font-semibold" style={{ color: "#1d4ed8" }}>Art. 72(1) —</span>{" "}
              Il fornitore istituisce e documenta un piano di monitoraggio post-market prima
              dell&apos;immissione sul mercato.{" "}
              <span className="font-semibold" style={{ color: "#1d4ed8" }}>Art. 72(4) —</span>{" "}
              Il fornitore riferisce all&apos;autorità di vigilanza sui risultati del monitoraggio.
            </p>
          </div>
        </div>
      )}

      {/* ── Modal: Genera testo notifica ── */}
      <AnimatePresence>
        {showNotifyModal && selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: "rgba(0,0,0,0.6)" }}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-2xl rounded-2xl overflow-hidden"
              style={{ background: "#fff", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
            >
              <div
                className="flex items-center justify-between px-6 py-4"
                style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}
              >
                <div>
                  <p className="text-[14px] font-semibold" style={{ color: "#0D1016" }}>
                    Notifica preliminare — Art. 73 Reg. UE 2024/1689
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: "rgba(0,0,0,0.45)" }}>
                    Testo da inviare a: {selected.authority}
                  </p>
                </div>
                <button
                  onClick={() => setShowNotifyModal(false)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "rgba(0,0,0,0.35)",
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="px-6 py-4">
                <textarea
                  readOnly
                  value={generateNotificationText(selected)}
                  rows={14}
                  className="w-full rounded-lg text-[11px] font-mono p-3 focus:outline-none resize-none"
                  style={{
                    background: "rgba(0,0,0,0.02)",
                    border: "1px solid rgba(0,0,0,0.1)",
                    color: "#0D1016",
                    lineHeight: 1.6,
                  }}
                />
              </div>

              <div
                className="px-6 py-4 flex items-center gap-2"
                style={{ borderTop: "1px solid rgba(0,0,0,0.07)" }}
              >
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generateNotificationText(selected));
                    showToastMsg("Testo copiato");
                  }}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-medium hover:opacity-80 transition-opacity"
                  style={{ border: "1px solid rgba(0,0,0,0.1)", color: "rgba(0,0,0,0.6)" }}
                >
                  <Copy className="h-3 w-3" /> Copia testo
                </button>
                <button
                  onClick={() => {
                    const text = generateNotificationText(selected);
                    const blob = new Blob([text], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `notifica-${selected.id}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                    showToastMsg("File .txt scaricato");
                  }}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-medium hover:opacity-80 transition-opacity"
                  style={{ border: "1px solid rgba(0,0,0,0.1)", color: "rgba(0,0,0,0.6)" }}
                >
                  <Download className="h-3 w-3" /> Scarica .txt
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => setShowNotifyModal(false)}
                  className="rounded-lg px-4 py-2 text-[12px] font-medium hover:opacity-80 transition-opacity"
                  style={{
                    border: "1px solid rgba(0,0,0,0.12)",
                    color: "rgba(0,0,0,0.55)",
                    background: "none",
                    cursor: "pointer",
                  }}
                >
                  Chiudi
                </button>
                <button
                  onClick={() => markNotified(selected.id)}
                  className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-semibold text-white hover:opacity-90 transition-opacity"
                  style={{ background: "#15803d", border: "none", cursor: "pointer" }}
                >
                  <CheckCircle className="h-3.5 w-3.5" /> Conferma notifica inviata
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TAB 3: Monitoraggio (Art. 72) ── */}
      {tab === "monitoring" && (
        <div className="space-y-5">
          {/* AI disclaimer */}
          <div
            className="flex items-start gap-2 rounded-lg px-3 py-2"
            style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)" }}
          >
            <span className="text-[10px] font-semibold mt-0.5" style={{ color: "#92400e" }}>✦ AI</span>
            <p className="text-[11px]" style={{ color: "#92400e" }}>
              Le proposte AI sono bozze da verificare. Obblighi Art. 72 ricostruiti dalla memoria del modello — verificare contro testo consolidato Reg. (UE) 2024/1689. [verify against current AI Act text]
            </p>
          </div>

          {/* PMM Plan editor */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid rgba(0,0,0,0.07)", background: "#fff" }}
          >
            <div
              className="flex items-center justify-between px-5 py-3.5"
              style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
            >
              <div>
                <span className="text-[13px] font-medium" style={{ color: "#0D1016" }}>
                  Piano di Monitoraggio Post-Market
                </span>
                <p className="text-[10px] mt-0.5" style={{ color: "rgba(0,0,0,0.4)" }}>
                  Art. 72(1) — sistema ad alto rischio [verify against current AI Act text]
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={pmmAiLoading}
                  onClick={async () => {
                    setPmmAiLoading(true);
                    setPmmAiError(null);
                    try {
                      const riskRaw = localStorage.getItem("aicomply_risk_register_v1");
                      const riskRec = riskRaw ? JSON.parse(riskRaw) : null;
                      const result = await proposePMMPlan({
                        systemName: riskRec?.systemName ?? "Sistema AI",
                        systemRole: riskRec?.systemRole ?? "non specificato",
                        tier: riskRec?.tier ?? "high_risk",
                        riskLevel: riskRec?.overallRisk,
                      });
                      setPmmPlan((p) => ({
                        ...p,
                        pmmSystemDescription: result.pmmSystemDescription,
                        monitoringMethodology: result.monitoringMethodology,
                        dataCollectionFrequency: result.dataCollectionFrequency,
                        aiConfirmed: false,
                      }));
                    } catch (e) {
                      setPmmAiError(e instanceof Error ? e.message : "Errore AI");
                    } finally {
                      setPmmAiLoading(false);
                    }
                  }}
                  className="flex items-center gap-1 text-[10px] font-semibold rounded-lg px-3 py-1.5"
                  style={{
                    background: pmmAiLoading ? "rgba(0,0,0,0.05)" : "rgba(245,158,11,0.1)",
                    color: "#92400e",
                    border: "1px solid rgba(245,158,11,0.25)",
                    cursor: pmmAiLoading ? "not-allowed" : "pointer",
                  }}
                >
                  {pmmAiLoading ? "..." : "✦ Proponi piano AI"}
                </button>
                <button
                  onClick={() => {
                    savePMMPlan(pmmPlan);
                    showToastMsg("✓ Piano salvato");
                  }}
                  className="flex items-center gap-1 text-[10px] font-semibold rounded-lg px-3 py-1.5"
                  style={{ background: "#0D1016", color: "#fff", border: "none", cursor: "pointer" }}
                >
                  Salva piano
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {pmmAiError && (
                <p className="text-[11px] rounded-lg px-3 py-2" style={{ background: "rgba(220,38,38,0.06)", color: "#b91c1c", border: "1px solid rgba(220,38,38,0.15)" }}>
                  {pmmAiError}
                </p>
              )}
              {!pmmPlan.aiConfirmed && (pmmPlan.pmmSystemDescription || pmmPlan.monitoringMethodology) && (
                <div
                  className="flex items-center justify-between rounded-lg px-3 py-2"
                  style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}
                >
                  <span className="text-[11px] font-medium" style={{ color: "#92400e" }}>
                    ✦ AI — bozza non confermata. Revisiona e conferma.
                  </span>
                  <button
                    onClick={() => {
                      const confirmed = { ...pmmPlan, aiConfirmed: true };
                      setPmmPlan(confirmed);
                      savePMMPlan(confirmed);
                      showToastMsg("✓ Piano confermato");
                    }}
                    className="text-[10px] font-semibold rounded px-2 py-1"
                    style={{ background: "#92400e", color: "#fff", border: "none", cursor: "pointer" }}
                  >
                    Conferma piano
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-medium mb-1" style={{ color: "rgba(0,0,0,0.45)" }}>
                    Descrizione sistema (PMM)
                  </label>
                  <textarea
                    rows={3}
                    className="w-full rounded-lg text-[12px] p-2 resize-none focus:outline-none"
                    style={{ border: "1px solid rgba(0,0,0,0.12)", color: "#0D1016", background: "#fff" }}
                    value={pmmPlan.pmmSystemDescription}
                    onChange={(e) => setPmmPlan((p) => ({ ...p, pmmSystemDescription: e.target.value, aiConfirmed: false }))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium mb-1" style={{ color: "rgba(0,0,0,0.45)" }}>
                    Metodologia di monitoraggio
                  </label>
                  <textarea
                    rows={3}
                    className="w-full rounded-lg text-[12px] p-2 resize-none focus:outline-none"
                    style={{ border: "1px solid rgba(0,0,0,0.12)", color: "#0D1016", background: "#fff" }}
                    value={pmmPlan.monitoringMethodology}
                    onChange={(e) => setPmmPlan((p) => ({ ...p, monitoringMethodology: e.target.value, aiConfirmed: false }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-medium mb-1" style={{ color: "rgba(0,0,0,0.45)" }}>
                    Frequenza raccolta dati
                  </label>
                  <select
                    className="w-full rounded-lg text-[12px] p-2 focus:outline-none"
                    style={{ border: "1px solid rgba(0,0,0,0.12)", color: "#0D1016", background: "#fff", cursor: "pointer" }}
                    value={pmmPlan.dataCollectionFrequency}
                    onChange={(e) => {
                      const freq = e.target.value as PostMarketMonitoringPlan["dataCollectionFrequency"];
                      const nextDue = pmmPlan.inServiceDate ? computeNextReportDue(pmmPlan.inServiceDate, freq) : undefined;
                      setPmmPlan((p) => ({ ...p, dataCollectionFrequency: freq, nextReportDueDate: nextDue, aiConfirmed: false }));
                    }}
                  >
                    <option value="continuous">Continua</option>
                    <option value="monthly">Mensile</option>
                    <option value="quarterly">Trimestrale</option>
                    <option value="annual">Annuale</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-medium mb-1" style={{ color: "rgba(0,0,0,0.45)" }}>
                    Data messa in servizio
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-lg text-[12px] p-2 focus:outline-none"
                    style={{ border: "1px solid rgba(0,0,0,0.12)", color: "#0D1016", background: "#fff" }}
                    value={pmmPlan.inServiceDate ?? ""}
                    onChange={(e) => {
                      const d = e.target.value;
                      const nextDue = d ? computeNextReportDue(d, pmmPlan.dataCollectionFrequency) : undefined;
                      setPmmPlan((p) => ({ ...p, inServiceDate: d || undefined, nextReportDueDate: nextDue, aiConfirmed: false }));
                    }}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium mb-1" style={{ color: "rgba(0,0,0,0.45)" }}>
                    Prossimo report previsto
                  </label>
                  <input
                    type="date"
                    readOnly
                    className="w-full rounded-lg text-[12px] p-2 focus:outline-none"
                    style={{ border: "1px solid rgba(0,0,0,0.12)", color: "#0D1016", background: "rgba(0,0,0,0.02)" }}
                    value={pmmPlan.nextReportDueDate ?? ""}
                  />
                </div>
              </div>

              {/* Annex III checklist (law enforcement) */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-[10px] font-medium" style={{ color: "rgba(0,0,0,0.45)" }}>
                    Sistema Annex III (law enforcement / migrazione)?
                  </label>
                  <input
                    type="checkbox"
                    checked={pmmPlan.isAnnex3LawEnforcement ?? false}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setPmmPlan((p) => ({
                        ...p,
                        isAnnex3LawEnforcement: checked,
                        annex3LawEnforcementChecklist: checked
                          ? (p.annex3LawEnforcementChecklist ?? ANNEX3_LAW_ENFORCEMENT_CHECKLIST)
                          : undefined,
                        aiConfirmed: false,
                      }));
                    }}
                    style={{ accentColor: "#0D1016" }}
                  />
                </div>
                {pmmPlan.isAnnex3LawEnforcement && pmmPlan.annex3LawEnforcementChecklist && (
                  <div className="space-y-2 rounded-lg p-3" style={{ background: "rgba(220,38,38,0.04)", border: "1px solid rgba(220,38,38,0.12)" }}>
                    <p className="text-[10px] font-semibold mb-2" style={{ color: "#b91c1c" }}>
                      Checklist aggiuntiva — Annex III law enforcement [verify against current AI Act text]
                    </p>
                    {pmmPlan.annex3LawEnforcementChecklist.map((item) => (
                      <label key={item.id} className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => {
                            const updated = pmmPlan.annex3LawEnforcementChecklist!.map((c) =>
                              c.id === item.id ? { ...c, completed: !c.completed } : c
                            );
                            setPmmPlan((p) => ({ ...p, annex3LawEnforcementChecklist: updated, aiConfirmed: false }));
                          }}
                          style={{ accentColor: "#b91c1c", marginTop: "2px", flexShrink: 0 }}
                        />
                        <div>
                          <p className="text-[11px]" style={{ color: "#0D1016" }}>{item.label}</p>
                          <p className="text-[9px]" style={{ color: "rgba(0,0,0,0.35)" }}>{item.reference}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Deployer feedback */}
              <div>
                <label className="block text-[10px] font-medium mb-1" style={{ color: "rgba(0,0,0,0.45)" }}>
                  Sintesi feedback deployer (opzionale)
                </label>
                <textarea
                  rows={2}
                  className="w-full rounded-lg text-[12px] p-2 resize-none focus:outline-none"
                  style={{ border: "1px solid rgba(0,0,0,0.12)", color: "#0D1016", background: "#fff" }}
                  placeholder="Segnalazioni, reclami, feedback dagli utenti del sistema..."
                  value={pmmPlan.deployerFeedbackSummary ?? ""}
                  onChange={(e) => setPmmPlan((p) => ({ ...p, deployerFeedbackSummary: e.target.value, aiConfirmed: false }))}
                />
              </div>
            </div>
          </div>

          {/* Draft Report */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid rgba(0,0,0,0.07)", background: "#fff" }}
          >
            <div
              className="flex items-center justify-between px-5 py-3.5"
              style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
            >
              <div>
                <span className="text-[13px] font-medium" style={{ color: "#0D1016" }}>
                  Report di monitoraggio
                </span>
                <p className="text-[10px] mt-0.5" style={{ color: "rgba(0,0,0,0.4)" }}>
                  Art. 72(4) — bozza AI poi confermata dal compliance officer [verify against current AI Act text]
                </p>
              </div>
              <button
                disabled={reportDraftLoading}
                onClick={async () => {
                  setReportDraftLoading(true);
                  setReportDraftError(null);
                  try {
                    const today = new Date().toISOString().slice(0, 10);
                    const periodStart = pmmPlan.inServiceDate ?? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
                    const metricsSnapshot: LogVaultMetricsSnapshot = {
                      periodStart,
                      periodEnd: today,
                      totalEvents: 0,
                      hasRealData: false,
                    };
                    const result = await draftPostMarketReport(pmmPlan, metricsSnapshot);
                    const newReport: PostMarketReport = {
                      id: "RPT-" + Date.now(),
                      systemId: pmmPlan.systemId,
                      periodStart,
                      periodEnd: today,
                      metricsSnapshot,
                      narrative: result.narrative,
                      flaggedAnomalies: result.flaggedAnomalies,
                      aiConfirmed: false,
                      createdAt: new Date().toISOString(),
                    };
                    setDraftReport(newReport);
                    setShowDraftModal(true);
                  } catch (e) {
                    setReportDraftError(e instanceof Error ? e.message : "Errore AI");
                  } finally {
                    setReportDraftLoading(false);
                  }
                }}
                className="flex items-center gap-1 text-[11px] font-semibold rounded-lg px-3 py-1.5"
                style={{
                  background: reportDraftLoading ? "rgba(0,0,0,0.05)" : "rgba(245,158,11,0.1)",
                  color: "#92400e",
                  border: "1px solid rgba(245,158,11,0.25)",
                  cursor: reportDraftLoading ? "not-allowed" : "pointer",
                }}
              >
                {reportDraftLoading ? "..." : "✦ Genera bozza report AI"}
              </button>
            </div>

            {reportDraftError && (
              <div className="px-5 py-3">
                <p className="text-[11px] rounded-lg px-3 py-2" style={{ background: "rgba(220,38,38,0.06)", color: "#b91c1c", border: "1px solid rgba(220,38,38,0.15)" }}>
                  {reportDraftError}
                </p>
              </div>
            )}

            {pmmReports.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <FileText className="h-8 w-8 mx-auto mb-2" style={{ color: "rgba(0,0,0,0.15)" }} />
                <p className="text-[12px]" style={{ color: "rgba(0,0,0,0.35)" }}>
                  Nessun report salvato. Genera la prima bozza con il copilot AI.
                </p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
                {pmmReports.map((rpt) => (
                  <div key={rpt.id} className="flex items-start gap-3 px-5 py-4">
                    <div
                      className="rounded-full h-2 w-2 mt-2 flex-shrink-0"
                      style={{ background: rpt.aiConfirmed ? "#15803d" : "#d97706" }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-medium" style={{ color: "#0D1016" }}>{rpt.id}</span>
                        <span className="text-[9px] rounded-full px-2 py-0.5 font-medium" style={{
                          background: rpt.aiConfirmed ? "rgba(21,128,61,0.08)" : "rgba(245,158,11,0.08)",
                          color: rpt.aiConfirmed ? "#15803d" : "#92400e",
                          border: `1px solid ${rpt.aiConfirmed ? "rgba(21,128,61,0.2)" : "rgba(245,158,11,0.2)"}`,
                        }}>
                          {rpt.aiConfirmed ? "Confermato" : "✦ AI — in attesa"}
                        </span>
                      </div>
                      <p className="text-[10px] mt-0.5" style={{ color: "rgba(0,0,0,0.4)" }}>
                        {rpt.periodStart} → {rpt.periodEnd} · {rpt.flaggedAnomalies.length} anomali{rpt.flaggedAnomalies.length === 1 ? "a" : "e"}
                      </p>
                      <p className="text-[11px] mt-1 line-clamp-2" style={{ color: "rgba(0,0,0,0.6)" }}>
                        {rpt.narrative}
                      </p>
                      {rpt.flaggedAnomalies.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {rpt.flaggedAnomalies.map((a, i) => (
                            <span key={i} className="text-[9px] rounded px-1.5 py-0.5" style={{
                              background: a.severity === "high" ? "rgba(220,38,38,0.07)" : "rgba(245,158,11,0.07)",
                              color: a.severity === "high" ? "#b91c1c" : "#92400e",
                              border: `1px solid ${a.severity === "high" ? "rgba(220,38,38,0.15)" : "rgba(245,158,11,0.15)"}`,
                            }}>
                              {a.metric}{a.riskRegisterRef ? ` · ${a.riskRegisterRef}` : ""}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {!rpt.aiConfirmed && (
                      <button
                        onClick={() => {
                          const updated = pmmReports.map((r) =>
                            r.id === rpt.id ? { ...r, aiConfirmed: true } : r
                          );
                          setPmmReports(updated);
                          savePMMReports(updated);
                          void appendEvidence(
                            "monitoring",
                            { reportId: rpt.id, periodStart: rpt.periodStart, periodEnd: rpt.periodEnd, confirmed: true },
                            "post-market-monitoring"
                          );
                          showToastMsg("✓ Report confermato e registrato nell'Evidence Layer");
                        }}
                        className="text-[10px] font-semibold rounded px-2 py-1 flex-shrink-0"
                        style={{ background: "#15803d", color: "#fff", border: "none", cursor: "pointer" }}
                      >
                        Conferma
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Draft report modal */}
      <AnimatePresence>
        {showDraftModal && draftReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}
          >
            <motion.div
              initial={{ scale: 0.96, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 10 }}
              transition={{ duration: 0.14 }}
              className="rounded-2xl w-full max-w-xl mx-4"
              style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", maxHeight: "80vh", overflowY: "auto" }}
            >
              <div
                className="flex items-start justify-between px-6 py-4"
                style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}
              >
                <div>
                  <p className="text-[13px] font-medium" style={{ color: "#0D1016" }}>
                    Bozza report: {draftReport.id}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: "rgba(0,0,0,0.4)" }}>
                    ✦ AI — verifica e conferma finché aiConfirmed !== true [verify against current AI Act text]
                  </p>
                </div>
                <button onClick={() => setShowDraftModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(0,0,0,0.35)" }}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <p className="text-[10px] font-semibold mb-1.5" style={{ color: "rgba(0,0,0,0.45)" }}>NARRATIVA</p>
                  <p className="text-[12px] leading-relaxed" style={{ color: "#0D1016" }}>{draftReport.narrative}</p>
                </div>
                {draftReport.flaggedAnomalies.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold mb-1.5" style={{ color: "rgba(0,0,0,0.45)" }}>ANOMALIE SEGNALATE</p>
                    <div className="space-y-2">
                      {draftReport.flaggedAnomalies.map((a, i) => (
                        <div key={i} className="rounded-lg px-3 py-2" style={{
                          background: a.severity === "high" ? "rgba(220,38,38,0.05)" : "rgba(245,158,11,0.05)",
                          border: `1px solid ${a.severity === "high" ? "rgba(220,38,38,0.15)" : "rgba(245,158,11,0.15)"}`,
                        }}>
                          <p className="text-[11px] font-medium" style={{ color: a.severity === "high" ? "#b91c1c" : "#92400e" }}>{a.metric}</p>
                          <p className="text-[11px] mt-0.5" style={{ color: "rgba(0,0,0,0.6)" }}>{a.description}</p>
                          {a.riskRegisterRef && (
                            <p className="text-[9px] mt-0.5" style={{ color: "rgba(0,0,0,0.4)" }}>Risk Register: {a.riskRegisterRef}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div
                className="px-6 py-4 flex gap-2 justify-end"
                style={{ borderTop: "1px solid rgba(0,0,0,0.07)" }}
              >
                <button
                  onClick={() => setShowDraftModal(false)}
                  className="text-[11px] font-medium rounded-lg px-3 py-2"
                  style={{ border: "1px solid rgba(0,0,0,0.12)", color: "rgba(0,0,0,0.55)", background: "none", cursor: "pointer" }}
                >
                  Annulla
                </button>
                <button
                  onClick={() => {
                    const confirmed = { ...draftReport, aiConfirmed: true };
                    const updated = [...pmmReports, confirmed];
                    setPmmReports(updated);
                    savePMMReports(updated);
                    setShowDraftModal(false);
                    void appendEvidence(
                      "monitoring",
                      { reportId: confirmed.id, periodStart: confirmed.periodStart, periodEnd: confirmed.periodEnd, confirmed: true },
                      "post-market-monitoring"
                    );
                    showToastMsg("✓ Report confermato e salvato");
                  }}
                  className="text-[11px] font-semibold rounded-lg px-3 py-2"
                  style={{ background: "#15803d", color: "#fff", border: "none", cursor: "pointer" }}
                >
                  <CheckCircle className="h-3.5 w-3.5 inline mr-1" /> Conferma e salva
                </button>
                <button
                  onClick={() => {
                    const draft = { ...draftReport, aiConfirmed: false };
                    const updated = [...pmmReports, draft];
                    setPmmReports(updated);
                    savePMMReports(updated);
                    setShowDraftModal(false);
                    showToastMsg("Bozza salvata — da confermare");
                  }}
                  className="text-[11px] font-medium rounded-lg px-3 py-2"
                  style={{ background: "rgba(0,0,0,0.06)", color: "#0D1016", border: "none", cursor: "pointer" }}
                >
                  Salva come bozza
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-50 rounded-xl px-4 py-3 text-sm font-medium shadow-lg"
          style={{ background: "#0D1016", color: "#fff" }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

export default function PostMarketPage() {
  return (
    <Suspense>
      <PostMarketPageInner />
    </Suspense>
  );
}
