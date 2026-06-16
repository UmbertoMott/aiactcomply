"use client";

import { useState } from "react";
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
} from "lucide-react";
import { appendEvidence } from "@/lib/evidence/evidence-layer";
import { motion, AnimatePresence } from "framer-motion";
import { readFromStorage } from "@/lib/dossier/storage-schema";
import type { RiskManagerResult } from "@/lib/dossier/storage-schema";
import {
  NOTIFICATION_WINDOWS,
  migrateNotificationTier,
  computeNotificationDeadline,
  daysUntilDeadline,
  type NotificationTier,
} from "@/lib/post-market/notification-tiers";

// ─── Types ────────────────────────────────────────────────────────────────────

type Severity = "critical" | "high" | "medium" | "low";
type IncidentStatus = "pending" | "reported" | "investigating" | "resolved" | "closed";

type Incident = {
  id: string;
  title: string;
  system: string;
  date: string;
  severity: Severity;
  notificationTier: NotificationTier;
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

function getDaysRemaining(inc: Pick<Incident, "date" | "notified" | "notificationTier">): number {
  return daysUntilDeadline({
    detectionDate: inc.date,
    notificationTier: inc.notificationTier,
    notified: inc.notified,
  });
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
La società si impegna a trasmettere un rapporto completo entro ${NOTIFICATION_WINDOWS[inc.notificationTier].label}
dalla data del presente atto (entro il ${new Date(computeNotificationDeadline({ detectionDate: inc.date, notificationTier: inc.notificationTier })).toLocaleDateString("it-IT")}) — ${NOTIFICATION_WINDOWS[inc.notificationTier].artRef}.

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
    notificationTier: "fundamental_rights_72h",
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
    notificationTier: "life_threat_24h",
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

/** Migra record salvati con lo schema a 2 tier (PROMPT_AR) o senza tier al nuovo schema Art.73 a 4 tier. */
function migrateIncident(raw: Incident & { notificationTier?: string }): Incident {
  return {
    ...raw,
    notificationTier: migrateNotificationTier(raw.notificationTier),
  };
}

function loadIncidents(): Incident[] {
  if (typeof window === "undefined") return SEED_INCIDENTS;
  const raw = localStorage.getItem(INCIDENTS_KEY);
  if (raw) {
    const parsed = JSON.parse(raw) as Incident[];
    const migrated = parsed.map(migrateIncident);
    localStorage.setItem(INCIDENTS_KEY, JSON.stringify(migrated));
    return migrated;
  }
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
  medium: { bg: "rgba(59,130,246,0.08)", color: "#1d4ed8", border: "rgba(59,130,246,0.25)" },
  low: { bg: "rgba(0,0,0,0.05)", color: "rgba(0,0,0,0.45)", border: "rgba(0,0,0,0.12)" },
};

const STATUS_COLOR: Record<IncidentStatus, string> = {
  pending: "#dc2626",
  reported: "#3b82f6",
  investigating: "#d97706",
  resolved: "#15803d",
  closed: "rgba(0,0,0,0.35)",
};

const STATUS_LABEL: Record<IncidentStatus, string> = {
  pending: "Pending",
  reported: "Segnalato",
  investigating: "In indagine",
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
  notificationTier: "serious_standard_15d" as NotificationTier,
  description: "",
  authority: "AGID",
  affectedUsers: "",
  actions: "",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function PostMarketPage() {
  const [tab, setTab] = useState<"incidents" | "plan">("incidents");
  const [incidents, setIncidents] = useState<Incident[]>(() => loadIncidents());
  const [plan, setPlan] = useState<MonitoringCheck[]>(() => loadPlan());
  const [selected, setSelected] = useState<Incident | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<Severity | "all">("all");
  const [filterStatus, setFilterStatus] = useState<IncidentStatus | "all">("all");
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  // Plan: expanded rows
  const [expandedChecks, setExpandedChecks] = useState<Set<string>>(new Set());

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
      ? Math.min(...toNotify.map((i) => getDaysRemaining(i)))
      : null;
  const urgentCount = toNotify.filter((i) => getDaysRemaining(i) <= 3).length;

  const planDone = plan.filter((c) => c.done).length;
  const planTotal = plan.length;

  // ── Filtered + sorted incident list ────────────────────────────────────────

  const filtered = incidents
    .filter((i) => filterSeverity === "all" || i.severity === filterSeverity)
    .filter((i) => filterStatus === "all" || i.status === filterStatus)
    .sort((a, b) => {
      if (!a.notified && !b.notified)
        return getDaysRemaining(a) - getDaysRemaining(b);
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
      notificationTier: form.notificationTier,
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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl">
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
        <div className="flex gap-2 mt-2">
          {["Art. 72", "Art. 73"].map((art) => (
            <span
              key={art}
              className="text-[10px] rounded-full px-2 py-0.5"
              style={{ background: "rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.45)" }}
            >
              {art}
            </span>
          ))}
        </div>
      </div>

      {/* Urgent banner */}
      {urgentCount > 0 && minDays !== null && (
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
            {urgentCount > 1 ? "ono" : ""} notifica entro {minDays} giorn
            {minDays === 1 ? "o" : "i"} (Art. 73)
          </p>
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
            value: minDays !== null ? String(minDays) : "—",
            sub: minDays !== null ? " giorni" : "",
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
        <div className="grid lg:grid-cols-3 gap-5">
          {/* Left: list + form */}
          <div className="lg:col-span-2 space-y-4">
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
                {(["all", "pending", "investigating", "resolved"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
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
                    {s === "all"
                      ? "Tutti"
                      : s === "pending"
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
                  onClick={() => setShowForm((v) => !v)}
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
                        <input
                          style={INPUT_STYLE}
                          placeholder="Es. FaceID-API v2.3"
                          value={form.system}
                          onChange={(e) => setForm((f) => ({ ...f, system: e.target.value }))}
                        />
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
                      <label className="block text-[10px] font-medium mb-2" style={{ color: "rgba(0,0,0,0.45)" }}>
                        Gravità
                      </label>
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
                    </div>

                    <div>
                      <label className="block text-[10px] font-medium mb-2" style={{ color: "rgba(0,0,0,0.45)" }}>
                        Finestra di notifica — Art. 73
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {(Object.entries(NOTIFICATION_WINDOWS) as [NotificationTier, typeof NOTIFICATION_WINDOWS[NotificationTier]][]).map(
                          ([key, w]) => {
                            const active = form.notificationTier === key;
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => setForm((f) => ({ ...f, notificationTier: key }))}
                                style={{
                                  textAlign: "left",
                                  borderRadius: "8px",
                                  padding: "8px 10px",
                                  cursor: "pointer",
                                  border: active ? "1px solid rgba(220,38,38,0.3)" : "1px solid rgba(0,0,0,0.1)",
                                  background: active ? "rgba(220,38,38,0.05)" : "#fff",
                                  transition: "all 0.12s",
                                }}
                              >
                                <div style={{ fontSize: "9px", fontFamily: "monospace", color: active ? "#b91c1c" : "rgba(0,0,0,0.35)" }}>
                                  {w.artRef}
                                </div>
                                <div style={{ fontSize: "11px", fontWeight: 600, marginTop: 2, color: active ? "#b91c1c" : "#0D1016" }}>
                                  {w.label}
                                </div>
                                <div style={{ fontSize: "9px", marginTop: 1, lineHeight: 1.3, color: active ? "#b91c1c" : "rgba(0,0,0,0.4)" }}>
                                  {w.description}
                                </div>
                              </button>
                            );
                          }
                        )}
                      </div>
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
                    const days = getDaysRemaining(inc);
                    const sev = SEV_STYLE[inc.severity];
                    const tierWindow = NOTIFICATION_WINDOWS[inc.notificationTier];
                    const totalDays = tierWindow.hoursFromDetection / 24;
                    const isSelected = selected?.id === inc.id;
                    const progressPct = inc.notified ? 100 : ((totalDays - days) / totalDays) * 100;
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
                                ⚠ SCADUTO — notifica urgente ({tierWindow.artRef})
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
                                    Notifica entro {days} giorn{days === 1 ? "o" : "i"} ({tierWindow.artRef})
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

          {/* Right: detail */}
          <div className="lg:col-span-1 space-y-4">
            {!selected ? (
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
                {/* Card 1: Detail */}
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: "1px solid rgba(0,0,0,0.07)", background: "#fff" }}
                >
                  <div
                    className="px-4 py-3 flex items-start justify-between"
                    style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
                  >
                    <div>
                      <span
                        className="text-[10px] font-mono"
                        style={{ color: "rgba(0,0,0,0.35)" }}
                      >
                        {selected.id}
                      </span>
                      <p
                        className="text-[12px] font-medium"
                        style={{ color: "#0D1016" }}
                      >
                        {selected.title}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelected(null)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "rgba(0,0,0,0.3)",
                        padding: "2px",
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="px-4 py-3 space-y-2.5">
                    {[
                      { label: "Sistema", value: selected.system },
                      { label: "Data rilevamento", value: selected.date },
                      { label: "Autorità", value: selected.authority },
                      {
                        label: "Utenti impattati",
                        value: selected.affectedUsers || "—",
                      },
                    ].map((row) => (
                      <div key={row.label}>
                        <span
                          className="text-[9px] font-semibold uppercase tracking-wide block"
                          style={{ color: "rgba(0,0,0,0.35)" }}
                        >
                          {row.label}
                        </span>
                        <p className="text-[11px]" style={{ color: "#0D1016" }}>
                          {row.value}
                        </p>
                      </div>
                    ))}
                    <div>
                      <span
                        className="text-[9px] font-semibold uppercase tracking-wide block"
                        style={{ color: "rgba(0,0,0,0.35)" }}
                      >
                        Descrizione
                      </span>
                      <p
                        className="text-[11px] leading-relaxed"
                        style={{ color: "rgba(0,0,0,0.55)" }}
                      >
                        {selected.description}
                      </p>
                    </div>
                    {selected.actions && (
                      <div>
                        <span
                          className="text-[9px] font-semibold uppercase tracking-wide block"
                          style={{ color: "rgba(0,0,0,0.35)" }}
                        >
                          Azioni intraprese
                        </span>
                        <p
                          className="text-[11px] leading-relaxed"
                          style={{ color: "rgba(0,0,0,0.55)" }}
                        >
                          {selected.actions}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Status selector */}
                  <div
                    className="px-4 py-3"
                    style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
                  >
                    <p
                      className="text-[10px] font-semibold uppercase tracking-wide mb-2"
                      style={{ color: "rgba(0,0,0,0.35)" }}
                    >
                      Aggiorna status
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(["pending", "reported", "investigating", "resolved", "closed"] as IncidentStatus[]).map((s) => {
                        const active = selected.status === s;
                        return (
                          <button
                            key={s}
                            onClick={() => updateStatus(selected.id, s)}
                            style={{
                              padding: "3px 8px",
                              borderRadius: "6px",
                              fontSize: "10px",
                              fontWeight: 500,
                              cursor: "pointer",
                              background: active
                                ? `${STATUS_COLOR[s]}18`
                                : "rgba(0,0,0,0.04)",
                              color: active ? STATUS_COLOR[s] : "rgba(0,0,0,0.45)",
                              border: active
                                ? `1px solid ${STATUS_COLOR[s]}40`
                                : "1px solid transparent",
                              transition: "all 0.12s",
                            }}
                          >
                            {STATUS_LABEL[s]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Export */}
                  <div
                    className="px-4 py-3"
                    style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
                  >
                    <button
                      onClick={() => exportIncidentTxt(selected)}
                      className="flex items-center gap-1 text-[11px] hover:opacity-70 transition-opacity"
                      style={{
                        color: "rgba(0,0,0,0.5)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <Download className="h-3 w-3" /> Esporta scheda incidente
                    </button>
                  </div>
                </div>

                {/* Card 2: Action required */}
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: "1px solid rgba(0,0,0,0.07)", background: "#fff" }}
                >
                  <div
                    className="px-4 py-3"
                    style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
                  >
                    <p className="text-[12px] font-medium" style={{ color: "#0D1016" }}>
                      Azione richiesta
                    </p>
                  </div>
                  <div className="px-4 py-3">
                    {!selected.notified ? (
                      <>
                        <div
                          className="rounded-lg px-3 py-2.5 mb-3"
                          style={{
                            background: "rgba(220,38,38,0.05)",
                            border: "1px solid rgba(220,38,38,0.18)",
                          }}
                        >
                          <p
                            className="text-[11px] font-medium"
                            style={{ color: "#dc2626" }}
                          >
                            Notifica richiesta entro{" "}
                            {getDaysRemaining(selected)} giorn
                            {getDaysRemaining(selected) === 1 ? "o" : "i"}{" "}
                            ({NOTIFICATION_WINDOWS[selected.notificationTier].artRef})
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => setShowNotifyModal(true)}
                            className="flex items-center justify-center gap-1.5 w-full rounded-lg py-2 text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
                            style={{ background: "#dc2626", border: "none", cursor: "pointer" }}
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Genera testo notifica
                          </button>
                          <button
                            onClick={() => markNotified(selected.id)}
                            className="flex items-center justify-center gap-1.5 w-full rounded-lg py-2 text-[11px] font-semibold transition-opacity hover:opacity-80"
                            style={{
                              border: "1px solid rgba(220,38,38,0.3)",
                              color: "#dc2626",
                              background: "none",
                              cursor: "pointer",
                            }}
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Segna come notificato
                          </button>
                        </div>
                      </>
                    ) : (
                      <div
                        className="rounded-lg px-3 py-2.5 flex items-center gap-2"
                        style={{
                          background: "rgba(22,163,74,0.06)",
                          border: "1px solid rgba(22,163,74,0.2)",
                        }}
                      >
                        <CheckCircle className="h-4 w-4 flex-shrink-0" style={{ color: "#15803d" }} />
                        <p className="text-[11px] font-medium" style={{ color: "#15803d" }}>
                          ✓ Notificato il{" "}
                          {selected.notifiedAt?.slice(0, 10) ?? "—"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ── Rapporto Completo Art. 73(4) ── */}
            <div
              className="rounded-xl p-4"
              style={{ border: "1px solid rgba(0,0,0,0.07)", background: "#fff" }}
            >
              <p className="text-[12px] font-medium mb-1" style={{ color: "#0D1016" }}>
                Rapporto Completo — Art. 73(4)
              </p>
              <p className="text-[11px] mb-3" style={{ color: "rgba(0,0,0,0.42)" }}>
                Compila le sezioni obbligatorie per sbloccare la generazione del rapporto completo.
              </p>

              {/* Sezione 4: Causa radice */}
              <div style={{ marginBottom: 10 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "rgba(0,0,0,0.42)", marginBottom: 4 }}>
                  Sezione 4 — Analisi causa radice <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <textarea
                  value={selected?.rootCause ?? ""}
                  rows={3}
                  placeholder="Causa radice: errore sistema, gap nel training data, failure deployment, errore operativo…"
                  onChange={(e) => {
                    const val = e.target.value;
                    const sid = selected?.id;
                    if (!sid) return;
                    const update = (inc: Incident) => inc.id === sid ? { ...inc, rootCause: val } : inc;
                    setIncidents(prev => { const next = prev.map(update); localStorage.setItem(INCIDENTS_KEY, JSON.stringify(next)); return next; });
                    setSelected(s => s ? { ...s, rootCause: val } : s);
                  }}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)", fontSize: 12, color: "#0D1016", background: "#fff", outline: "none", resize: "vertical" }}
                />
              </div>

              {/* Sezione 6: Misure definitive */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "rgba(0,0,0,0.42)", marginBottom: 4 }}>
                  Sezione 6 — Misure definitive adottate <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <textarea
                  value={selected?.finalMeasures ?? ""}
                  rows={3}
                  placeholder="Misure permanenti: patch, retraining, modifica processo, nuovi controlli…"
                  onChange={(e) => {
                    const val = e.target.value;
                    const sid = selected?.id;
                    if (!sid) return;
                    const update = (inc: Incident) => inc.id === sid ? { ...inc, finalMeasures: val } : inc;
                    setIncidents(prev => { const next = prev.map(update); localStorage.setItem(INCIDENTS_KEY, JSON.stringify(next)); return next; });
                    setSelected(s => s ? { ...s, finalMeasures: val } : s);
                  }}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)", fontSize: 12, color: "#0D1016", background: "#fff", outline: "none", resize: "vertical" }}
                />
              </div>

              {/* Bottone genera rapporto completo */}
              {(() => {
                const canGenerate = !!(selected?.rootCause?.trim() && selected?.finalMeasures?.trim());
                return (
                  <button
                    disabled={!canGenerate}
                    onClick={() => {
                      if (!selected) return;
                      const text = generateFullReport(selected);
                      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
                      const url  = URL.createObjectURL(blob);
                      const a    = document.createElement("a");
                      a.href = url;
                      a.download = `rapporto-completo-art73-${selected.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.txt`;
                      a.click();
                      URL.revokeObjectURL(url);
                      appendEvidence("incident", {
                        type: "Post-Market Report Completo Art. 73(4)",
                        incidentId: selected.id,
                        system: selected.system,
                        generatedAt: new Date().toISOString(),
                      }, "post-market");
                    }}
                    className="w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-semibold transition-opacity"
                    style={{
                      background: canGenerate ? "#0D1016" : "rgba(0,0,0,0.08)",
                      color: canGenerate ? "#fff" : "rgba(0,0,0,0.3)",
                      border: "none",
                      cursor: canGenerate ? "pointer" : "not-allowed",
                    }}
                  >
                    <Download className="h-3.5 w-3.5" />
                    {canGenerate
                      ? "Genera Rapporto Completo Art. 73(4)"
                      : "Compila le sezioni obbligatorie per sbloccare"}
                  </button>
                );
              })()}
            </div>

            {/* Art. 73 timeline ref */}
            <div
              className="rounded-xl p-4"
              style={{ border: "1px solid rgba(0,0,0,0.07)", background: "#fff" }}
            >
              <p className="text-[12px] font-medium mb-3" style={{ color: "#0D1016" }}>
                Scadenze Art. 73
              </p>
              {[
                { label: `${NOTIFICATION_WINDOWS.life_threat_24h.description}`, time: NOTIFICATION_WINDOWS.life_threat_24h.label },
                { label: `${NOTIFICATION_WINDOWS.fundamental_rights_72h.description}`, time: NOTIFICATION_WINDOWS.fundamental_rights_72h.label },
                { label: `${NOTIFICATION_WINDOWS.death_followup_10d.description}`, time: NOTIFICATION_WINDOWS.death_followup_10d.label },
                { label: `${NOTIFICATION_WINDOWS.serious_standard_15d.description}`, time: NOTIFICATION_WINDOWS.serious_standard_15d.label },
              ].map((r) => (
                <div
                  key={r.label}
                  className="flex justify-between text-[11px] py-1"
                  style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}
                >
                  <span style={{ color: "rgba(0,0,0,0.5)" }}>{r.label}</span>
                  <span className="font-mono" style={{ color: "#0D1016" }}>
                    {r.time}
                  </span>
                </div>
              ))}
            </div>
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
