"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  Send,
  FileText,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  ClipboardList,
  Building2,
  Clock,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  Download,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  submitToAuthority,
  generateSMEFastTrack,
  getRegistrationRequirements,
  getDeadline,
  type AuthoritySubmission,
  type SandboxRegistration,
} from "@/lib/compliance/gateway";
import { appendEvidence } from "@/lib/evidence/evidence-layer";

// Suppress unused import warning
void LinkIcon;

// ─── Types ────────────────────────────────────────────────────────────────────

type NexusState = {
  submissions: AuthoritySubmission[];
  sandbox: SandboxRegistration | null;
  riskClass: string;
  companyName: string;
  systemName: string;
  systemDesc: string;
  vatNumber: string;
  checklistOverrides: Record<string, boolean>;
};

type TimelineEvent = {
  date: string;
  label: string;
  article: string;
  status: "past" | "urgent" | "upcoming";
};

type ChecklistItem = {
  id: string;
  label: string;
  article: string;
  description: string;
  toolLink?: string;
  priority: "critical" | "high" | "medium";
};

// ─── Persistence ──────────────────────────────────────────────────────────────

const NEXUS_KEY = "compliance_nexus_state";

function defaultNexus(): NexusState {
  return {
    submissions: [],
    sandbox: null,
    riskClass: "high",
    companyName: "",
    systemName: "",
    systemDesc: "",
    vatNumber: "",
    checklistOverrides: {},
  };
}

function loadNexus(): NexusState {
  if (typeof window === "undefined") return defaultNexus();
  const raw = localStorage.getItem(NEXUS_KEY);
  return raw ? { ...defaultNexus(), ...JSON.parse(raw) } : defaultNexus();
}

function saveNexus(s: NexusState) {
  localStorage.setItem(NEXUS_KEY, JSON.stringify(s));
}

function readCrossToolStatus(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  return {
    hasAnnexIV: !!localStorage.getItem("aia_architect_annex"),
    hasFRIA: !!localStorage.getItem("fria_document"),
    hasConformity: !!localStorage.getItem("conformity_assessment"),
    hasQMS: !!localStorage.getItem("qms_document"),
    hasEvidenceRecords: (() => {
      const ev = localStorage.getItem("algorithmic_trust_evidence");
      return ev ? JSON.parse(ev).length > 0 : false;
    })(),
  };
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

const TIMELINE_EVENTS: TimelineEvent[] = [
  { date: "2025-02-02", label: "Pratiche vietate in vigore", article: "Art. 5", status: "past" },
  { date: "2025-08-02", label: "GPAI models — obblighi", article: "Art. 53-55", status: "past" },
  { date: "2026-08-02", label: "Alto rischio Allegato III", article: "Art. 6 + Allegato III", status: "upcoming" },
  { date: "2027-08-02", label: "Alto rischio Allegato III pt. 6-8", article: "Art. 6", status: "upcoming" },
];

function computeTimelineStatus(events: TimelineEvent[]): TimelineEvent[] {
  const today = new Date();
  return events.map((ev) => {
    const d = new Date(ev.date);
    const diffDays = Math.ceil(
      (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    let status: TimelineEvent["status"];
    if (diffDays < 0) status = "past";
    else if (diffDays <= 120) status = "urgent";
    else status = "upcoming";
    return { ...ev, status };
  });
}

// ─── Checklist ────────────────────────────────────────────────────────────────

const HIGH_RISK_CHECKLIST: ChecklistItem[] = [
  { id: "risk_mgmt",  label: "Sistema di gestione dei rischi",           article: "Art. 9",  description: "Processo continuo per identificare e mitigare i rischi del sistema AI",           toolLink: "/dashboard/tools/risk-manager",     priority: "critical" },
  { id: "data_gov",   label: "Governance dei dati di training",           article: "Art. 10", description: "Pratiche di gestione dati, controllo bias, qualità del dataset",                 toolLink: "/dashboard/tools/data-audit",       priority: "critical" },
  { id: "annex_iv",   label: "Documentazione tecnica — Allegato IV",      article: "Art. 11", description: "Documentazione completa del sistema prima dell'immissione",                      toolLink: "/dashboard/modules/aia-architect",  priority: "critical" },
  { id: "logging",    label: "Sistema di logging automatico",              article: "Art. 12", description: "Log di tutti gli eventi rilevanti durante il ciclo di vita",                    toolLink: "/dashboard/tools/logvault",         priority: "critical" },
  { id: "transp",     label: "Trasparenza e istruzioni d'uso",            article: "Art. 13", description: "Informazioni chiare per i deployer sul funzionamento del sistema",              toolLink: "/dashboard/tools/transparency",     priority: "high"     },
  { id: "oversight",  label: "Misure di sorveglianza umana",              article: "Art. 14", description: "Meccanismi che consentono a operatori umani di monitorare e intervenire",       toolLink: "/dashboard/modules/guardian-agent", priority: "critical" },
  { id: "robustness", label: "Accuratezza, robustezza e sicurezza",       article: "Art. 15", description: "Metriche di performance e test di robustezza documentati",                     toolLink: "/dashboard/tools/resilience",       priority: "high"     },
  { id: "qms",        label: "Sistema di gestione della qualità",         article: "Art. 17", description: "QMS documentato con politiche, procedure e responsabilità",                    toolLink: "/dashboard/tools/qms",              priority: "high"     },
  { id: "fria",       label: "Valutazione impatto diritti fondamentali",  article: "Art. 27", description: "FRIA completata e depositata prima del deployment",                             toolLink: "/dashboard/tools/fria",             priority: "critical" },
  { id: "conformity", label: "Valutazione di conformità",                 article: "Art. 43", description: "Self-assessment o valutazione organismo notificato",                           toolLink: "/dashboard/tools/conformity",       priority: "critical" },
  { id: "decl_conf",  label: "Dichiarazione di conformità UE",            article: "Art. 47", description: "Dichiarazione scritta che il sistema soddisfa i requisiti AIA",                                                               priority: "critical" },
  { id: "ce_mark",    label: "Marcatura CE",                              article: "Art. 48", description: "Apposizione della marcatura CE prima della messa in servizio",                                                                priority: "high"     },
  { id: "reg_db",     label: "Registrazione banca dati UE",               article: "Art. 49", description: "Registrazione nel database EU AI Act prima del deployment",                                                                   priority: "critical" },
  { id: "post_mkt",   label: "Piano di monitoraggio post-market",         article: "Art. 72", description: "Piano di sorveglianza continua dopo l'immissione sul mercato",                 toolLink: "/dashboard/post-market",            priority: "high"     },
];

const PRIORITY_STYLE: Record<ChecklistItem["priority"], { bg: string; color: string }> = {
  critical: { bg: "rgba(220,38,38,0.08)", color: "#b91c1c" },
  high:     { bg: "rgba(245,158,11,0.08)", color: "#92400e" },
  medium:   { bg: "rgba(0,0,0,0.05)", color: "rgba(0,0,0,0.45)" },
};

const RISK_CLASSES = [
  { id: "high",         label: "High Risk",   desc: "Allegato III — impatta aree critiche: lavoro, credito, istruzione, biometria" },
  { id: "limited",      label: "Limited",     desc: "Chatbot, sistemi generativi — obblighi di trasparenza Art. 50" },
  { id: "minimal",      label: "Minimal",     desc: "Filtri spam, raccomandazioni — nessun obbligo specifico" },
  { id: "unacceptable", label: "Vietato",     desc: "Pratiche vietate Art. 5 — social scoring, manipolazione" },
];

const STATUS_SANDBOX_COLOR: Record<SandboxRegistration["status"], string> = {
  draft: "#d97706",
  submitted: "#3b82f6",
  approved: "#15803d",
  rejected: "#dc2626",
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function ComplianceNexusPage() {
  const [nexus, setNexus] = useState<NexusState>(() => loadNexus());
  const [tab, setTab] = useState<"checklist" | "registration" | "sandbox">("checklist");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [crossStatus, setCrossStatus] = useState<Record<string, boolean>>({});
  const [expandedRisk, setExpandedRisk] = useState(false);
  // Sandbox extra fields
  const [isSME, setIsSME] = useState(true);
  const [sector, setSector] = useState("Occupazione");
  const [phase, setPhase] = useState("Prototipo");
  const [objective, setObjective] = useState("");

  const timeline = computeTimelineStatus(TIMELINE_EVENTS);

  useEffect(() => {
    setCrossStatus(readCrossToolStatus());
  }, []);

  function updateNexus(updates: Partial<NexusState>) {
    const updated = { ...nexus, ...updates };
    setNexus(updated);
    saveNexus(updated);
  }

  function showToastMsg(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  // ── Checklist ──────────────────────────────────────────────────────────────

  function isItemDone(item: ChecklistItem): boolean {
    if (nexus.checklistOverrides[item.id] !== undefined) {
      return nexus.checklistOverrides[item.id];
    }
    const autoMap: Record<string, boolean> = {
      annex_iv: crossStatus.hasAnnexIV,
      fria: crossStatus.hasFRIA,
      conformity: crossStatus.hasConformity,
      qms: crossStatus.hasQMS,
      logging: crossStatus.hasEvidenceRecords,
    };
    return autoMap[item.id] ?? false;
  }

  function toggleChecklistItem(id: string) {
    const current = isItemDone(HIGH_RISK_CHECKLIST.find((i) => i.id === id)!);
    updateNexus({
      checklistOverrides: { ...nexus.checklistOverrides, [id]: !current },
    });
  }

  function exportChecklist() {
    const lines = [
      "CHECKLIST CONFORMITÀ EU AI ACT — SISTEMA ALTO RISCHIO",
      `Generata il: ${new Date().toLocaleDateString("it-IT")}`,
      "",
      ...HIGH_RISK_CHECKLIST.map((item) => {
        const done = isItemDone(item);
        return `[${done ? "✓" : " "}] ${item.article.padEnd(10)} ${item.label} (${item.priority.toUpperCase()})`;
      }),
      "",
      `Completate: ${HIGH_RISK_CHECKLIST.filter(isItemDone).length}/${HIGH_RISK_CHECKLIST.length}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "checklist-eu-ai-act.txt";
    a.click();
    URL.revokeObjectURL(url);
    showToastMsg("Checklist esportata");
  }

  // ── Registration ───────────────────────────────────────────────────────────

  async function handleSubmitRegistration() {
    if (!nexus.systemName.trim()) return;
    setSubmitting(true);
    try {
      const reqs = getRegistrationRequirements(nexus.riskClass);
      const result = await submitToAuthority(nexus.systemName, nexus.riskClass, reqs);
      const updated = { ...nexus, submissions: [result, ...nexus.submissions] };
      setNexus(updated);
      saveNexus(updated);
      showToastMsg(`✓ Pacchetto preparato — Rif: ${result.referenceNumber}`);
      void appendEvidence(
        "audit",
        {
          evento: `Registrazione banca dati UE preparata`,
          sistema: nexus.systemName,
          azienda: nexus.companyName,
          classe_rischio: nexus.riskClass,
          riferimento: result.referenceNumber,
          art: "Art. 49",
        },
        "compliance-nexus"
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ── Sandbox ────────────────────────────────────────────────────────────────

  function handleGenerateSandbox() {
    const sb = generateSMEFastTrack(
      nexus.companyName || "Azienda",
      nexus.systemName || "Sistema AI",
      objective || nexus.systemDesc || "Test sistema AI ad alto rischio"
    );
    updateNexus({ sandbox: sb });
    showToastMsg("✓ Pacchetto sandbox generato");
  }

  function exportSandboxJSON() {
    if (!nexus.sandbox) return;
    const blob = new Blob([JSON.stringify(nexus.sandbox, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sandbox-${nexus.sandbox.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToastMsg("JSON sandbox scaricato");
  }

  // ── Computed ──────────────────────────────────────────────────────────────

  const doneCount = HIGH_RISK_CHECKLIST.filter(isItemDone).length;
  const totalCount = HIGH_RISK_CHECKLIST.length;
  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
  const progressColor = pct >= 80 ? "#15803d" : pct >= 50 ? "#d97706" : "#dc2626";

  const urgentEvents = timeline.filter((e) => e.status === "urgent");
  const nextUrgent = urgentEvents[0];
  const daysToUrgent = nextUrgent
    ? Math.ceil((new Date(nextUrgent.date).getTime() - Date.now()) / 86400000)
    : null;

  const requirements = getRegistrationRequirements(nexus.riskClass);
  const deadline = getDeadline(nexus.riskClass);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="mb-5">
        <h1
          style={{ fontSize: "22px", fontWeight: 400, letterSpacing: "-0.5px", color: "#0D1016" }}
        >
          Compliance-Nexus
        </h1>
        <p className="text-[12px] mt-0.5" style={{ color: "rgba(0,0,0,0.42)" }}>
          Gateway normativo EU AI Act — registrazione, sandbox e checklist di conformità.
        </p>
        <div className="flex gap-2 mt-2">
          {["Art. 49", "Art. 57", "Art. 71"].map((art) => (
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

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          {
            label: "Checklist",
            value: `${doneCount}/${totalCount}`,
            sub: "",
            color: progressColor,
          },
          {
            label: "Prossima scadenza",
            value: nextUrgent ? `${daysToUrgent}` : "—",
            sub: nextUrgent ? " giorni" : "",
            color: daysToUrgent !== null && daysToUrgent <= 30 ? "#dc2626" : "#d97706",
          },
          {
            label: "Registrazioni UE",
            value: String(nexus.submissions.length),
            sub: "",
            color: "#0D1016",
          },
          {
            label: "Sandbox",
            value: nexus.sandbox ? nexus.sandbox.status : "—",
            sub: "",
            color: nexus.sandbox
              ? STATUS_SANDBOX_COLOR[nexus.sandbox.status]
              : "rgba(0,0,0,0.3)",
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
              className="text-[20px] font-semibold"
              style={{ letterSpacing: "-0.5px", color: card.color }}
            >
              {card.value}
              {card.sub && (
                <span className="text-[12px] font-normal" style={{ color: "rgba(0,0,0,0.3)" }}>
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

      {/* Urgency banner */}
      {nextUrgent && daysToUrgent !== null && (
        <div
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 mb-4"
          style={{
            background: "rgba(245,158,11,0.05)",
            border: "1px solid rgba(245,158,11,0.25)",
          }}
        >
          <Clock className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#d97706" }} />
          <p className="text-[11px] font-medium flex-1" style={{ color: "#92400e" }}>
            ⚡ Scadenza imminente:{" "}
            <strong>{nextUrgent.label}</strong> — {nextUrgent.article} — Mancano{" "}
            <strong>{daysToUrgent} giorni</strong>
          </p>
        </div>
      )}

      {/* Tab nav */}
      <div
        className="flex gap-5 mb-5"
        style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}
      >
        {[
          { id: "checklist" as const, label: "Checklist conformità", Icon: ClipboardList },
          { id: "registration" as const, label: "Registrazione EU", Icon: Building2 },
          { id: "sandbox" as const, label: "Sandbox Art. 57", Icon: Shield },
        ].map(({ id, label, Icon }) => (
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
            {id === "checklist" && (
              <span
                className="text-[10px] font-semibold rounded-full px-1.5 py-0.5"
                style={{ background: `${progressColor}18`, color: progressColor }}
              >
                {pct}%
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* ── Main content ── */}
        <div className="lg:col-span-2">

          {/* ── TAB: Checklist ── */}
          {tab === "checklist" && (
            <div className="space-y-4">
              {/* Header + progress */}
              <div
                className="rounded-xl p-5"
                style={{ border: "1px solid rgba(0,0,0,0.07)", background: "#fff" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[13px] font-medium" style={{ color: "#0D1016" }}>
                      Checklist conformità — Sistema Alto Rischio (Allegato III)
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: "rgba(0,0,0,0.4)" }}>
                      {doneCount} completat{doneCount === 1 ? "o" : "i"} su {totalCount} requisiti
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Risk class quick selector */}
                    <div className="flex gap-1.5">
                      {RISK_CLASSES.map(({ id, label }) => (
                        <button
                          key={id}
                          onClick={() => updateNexus({ riskClass: id })}
                          style={{
                            padding: "3px 10px",
                            borderRadius: "999px",
                            fontSize: "10px",
                            fontWeight: 500,
                            cursor: "pointer",
                            border:
                              nexus.riskClass === id
                                ? "1px solid #0D1016"
                                : "1px solid rgba(0,0,0,0.1)",
                            background: nexus.riskClass === id ? "#0D1016" : "#fff",
                            color: nexus.riskClass === id ? "#fff" : "rgba(0,0,0,0.5)",
                            transition: "all 0.12s",
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={exportChecklist}
                      className="flex items-center gap-1 text-[11px] font-medium rounded-lg px-2.5 py-1.5 hover:opacity-80 transition-opacity"
                      style={{ border: "1px solid rgba(0,0,0,0.1)", color: "rgba(0,0,0,0.55)" }}
                    >
                      <Download className="h-3 w-3" /> Esporta
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="flex-1 h-1.5 rounded-full"
                    style={{ background: "rgba(0,0,0,0.07)" }}
                  >
                    <div
                      className="h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: progressColor }}
                    />
                  </div>
                  <span
                    className="text-[12px] font-semibold flex-shrink-0"
                    style={{ color: progressColor }}
                  >
                    {pct}%
                  </span>
                </div>
              </div>

              {/* Non-high risk message */}
              {nexus.riskClass !== "high" && (
                <div
                  className="rounded-xl p-5"
                  style={{
                    background: "rgba(59,130,246,0.04)",
                    border: "1px solid rgba(59,130,246,0.15)",
                  }}
                >
                  <p className="text-[12px]" style={{ color: "rgba(0,0,0,0.6)" }}>
                    {RISK_CLASSES.find((r) => r.id === nexus.riskClass)?.desc}.
                    La checklist completa è richiesta solo per sistemi <strong>High Risk (Allegato III)</strong>.
                  </p>
                </div>
              )}

              {/* Checklist items */}
              {nexus.riskClass === "high" && (
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: "1px solid rgba(0,0,0,0.07)", background: "#fff" }}
                >
                  <div className="divide-y" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
                    {HIGH_RISK_CHECKLIST.map((item) => {
                      const done = isItemDone(item);
                      const isAuto =
                        nexus.checklistOverrides[item.id] === undefined &&
                        ["annex_iv", "fria", "conformity", "qms", "logging"].includes(item.id);
                      const ps = PRIORITY_STYLE[item.priority];
                      return (
                        <div
                          key={item.id}
                          className="px-5 py-3.5 flex items-start gap-3"
                          style={{
                            borderLeft: !done && item.priority === "critical"
                              ? "3px solid rgba(220,38,38,0.4)"
                              : "3px solid transparent",
                          }}
                        >
                          {/* Checkbox */}
                          <button
                            onClick={() => toggleChecklistItem(item.id)}
                            className="flex-shrink-0 mt-0.5"
                            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                          >
                            <div
                              style={{
                                width: "16px",
                                height: "16px",
                                borderRadius: "4px",
                                border: done ? "none" : "1.5px solid rgba(0,0,0,0.25)",
                                background: done ? "#15803d" : "transparent",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.12s",
                              }}
                            >
                              {done && <CheckCircle className="h-3 w-3" style={{ color: "#fff" }} />}
                            </div>
                          </button>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span
                                  className="text-[12px] font-medium"
                                  style={{
                                    color: done ? "#15803d" : "#0D1016",
                                    textDecoration: done ? "none" : "none",
                                  }}
                                >
                                  {item.label}
                                </span>
                                {isAuto && done && (
                                  <span
                                    className="block text-[9px]"
                                    style={{ color: "rgba(0,0,0,0.35)" }}
                                  >
                                    (rilevato automaticamente da AIComply ✓)
                                  </span>
                                )}
                                <p
                                  className="text-[11px] mt-0.5"
                                  style={{ color: "rgba(0,0,0,0.45)" }}
                                >
                                  {item.description}
                                </p>
                                {item.toolLink && (
                                  <Link
                                    href={item.toolLink}
                                    className="text-[11px] font-medium hover:underline"
                                    style={{ color: "#3b82f6" }}
                                  >
                                    → Apri tool
                                  </Link>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                <span
                                  className="text-[9px] font-semibold rounded px-1.5 py-0.5"
                                  style={{
                                    background: "rgba(0,0,0,0.05)",
                                    color: "rgba(0,0,0,0.4)",
                                  }}
                                >
                                  {item.article}
                                </span>
                                <span
                                  className="text-[9px] font-semibold rounded px-1.5 py-0.5"
                                  style={{ background: ps.bg, color: ps.color }}
                                >
                                  {item.priority}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Registrazione EU ── */}
          {tab === "registration" && (
            <div className="space-y-4">
              {/* Disclaimer */}
              <div
                className="rounded-xl p-4"
                style={{
                  background: "rgba(245,158,11,0.04)",
                  border: "1px solid rgba(245,158,11,0.25)",
                }}
              >
                <p className="text-[11px] leading-relaxed" style={{ color: "rgba(0,0,0,0.55)" }}>
                  <span className="font-semibold" style={{ color: "#d97706" }}>ℹ️ Strumento di preparazione —</span>{" "}
                  Questa sezione genera la documentazione necessaria per la registrazione nella
                  banca dati UE (Art. 49). La sottomissione definitiva avviene sul portale
                  ufficiale EU AI Office.
                </p>
              </div>

              {/* Form */}
              <div
                className="rounded-xl overflow-hidden"
                style={{ border: "1px solid rgba(0,0,0,0.07)", background: "#fff" }}
              >
                <div
                  className="px-5 py-3.5"
                  style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
                >
                  <p className="text-[13px] font-medium" style={{ color: "#0D1016" }}>
                    Dati sistema AI
                  </p>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-medium mb-1" style={{ color: "rgba(0,0,0,0.45)" }}>
                        Nome azienda
                      </label>
                      <input
                        style={INPUT_STYLE}
                        placeholder="Es. Acme S.r.l."
                        value={nexus.companyName}
                        onChange={(e) => updateNexus({ companyName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium mb-1" style={{ color: "rgba(0,0,0,0.45)" }}>
                        Partita IVA
                      </label>
                      <input
                        style={INPUT_STYLE}
                        placeholder="Es. IT12345678901"
                        value={nexus.vatNumber}
                        onChange={(e) => updateNexus({ vatNumber: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium mb-1" style={{ color: "rgba(0,0,0,0.45)" }}>
                      Nome sistema AI
                    </label>
                    <input
                      style={INPUT_STYLE}
                      placeholder="Es. CV-Screener v2.3"
                      value={nexus.systemName}
                      onChange={(e) => updateNexus({ systemName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium mb-1" style={{ color: "rgba(0,0,0,0.45)" }}>
                      Descrizione funzionale
                    </label>
                    <textarea
                      style={{ ...INPUT_STYLE, minHeight: "56px", resize: "vertical" }}
                      rows={2}
                      placeholder="Cosa fa il sistema, chi lo usa, quale decisione supporta"
                      value={nexus.systemDesc}
                      onChange={(e) => updateNexus({ systemDesc: e.target.value })}
                    />
                  </div>

                  {/* Risk class */}
                  <div>
                    <label className="block text-[10px] font-medium mb-2" style={{ color: "rgba(0,0,0,0.45)" }}>
                      Classe di rischio
                    </label>
                    <div className="space-y-1.5">
                      {RISK_CLASSES.map(({ id, label, desc }) => {
                        const active = nexus.riskClass === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => updateNexus({ riskClass: id })}
                            className="w-full text-left rounded-lg p-3 transition-colors"
                            style={{
                              background: active ? "rgba(0,0,0,0.03)" : "transparent",
                              border: active ? "1px solid rgba(0,0,0,0.15)" : "1px solid rgba(0,0,0,0.07)",
                              cursor: "pointer",
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className="text-[12px] font-medium"
                                style={{ color: "#0D1016" }}
                              >
                                {label}
                              </span>
                              {active && (
                                <CheckCircle
                                  className="h-3.5 w-3.5 flex-shrink-0"
                                  style={{ color: "#15803d" }}
                                />
                              )}
                            </div>
                            <p
                              className="text-[10px] mt-0.5"
                              style={{ color: "rgba(0,0,0,0.45)" }}
                            >
                              {desc}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Requirements */}
                  <div
                    className="rounded-lg p-3"
                    style={{ background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.07)" }}
                  >
                    <p
                      className="text-[10px] font-semibold mb-2"
                      style={{ color: "rgba(0,0,0,0.45)" }}
                    >
                      Documenti richiesti · Scadenza: {deadline}
                    </p>
                    <div className="space-y-1.5">
                      {requirements.map((r, i) => {
                        const autoDetected =
                          (r.includes("Allegato IV") && crossStatus.hasAnnexIV) ||
                          (r.includes("FRIA") && crossStatus.hasFRIA) ||
                          (r.includes("conformità") && crossStatus.hasConformity) ||
                          (r.includes("gestione") && crossStatus.hasQMS);
                        return (
                          <div key={i} className="flex items-start gap-2">
                            <CheckCircle
                              className="h-3 w-3 flex-shrink-0 mt-0.5"
                              style={{ color: autoDetected ? "#15803d" : "rgba(0,0,0,0.25)" }}
                            />
                            <span
                              className="text-[11px]"
                              style={{ color: autoDetected ? "#15803d" : "rgba(0,0,0,0.5)" }}
                            >
                              {r}
                              {autoDetected && (
                                <span className="text-[9px] ml-1">(rilevato ✓)</span>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    onClick={handleSubmitRegistration}
                    disabled={submitting || !nexus.systemName.trim()}
                    style={{
                      width: "100%",
                      padding: "9px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: 600,
                      background: nexus.systemName.trim() ? "#0D1016" : "rgba(0,0,0,0.1)",
                      color: nexus.systemName.trim() ? "#fff" : "rgba(0,0,0,0.3)",
                      border: "none",
                      cursor: nexus.systemName.trim() ? "pointer" : "not-allowed",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      opacity: submitting ? 0.7 : 1,
                    }}
                  >
                    <Send className="h-3.5 w-3.5" />
                    {submitting ? "Preparazione..." : "Prepara pacchetto registrazione"}
                  </button>
                </div>
              </div>

              {/* Previous submissions */}
              {nexus.submissions.length > 0 && (
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: "1px solid rgba(0,0,0,0.07)", background: "#fff" }}
                >
                  <div
                    className="flex items-center justify-between px-5 py-3.5"
                    style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
                  >
                    <p className="text-[13px] font-medium" style={{ color: "#0D1016" }}>
                      Pacchetti preparati ({nexus.submissions.length})
                    </p>
                    <a
                      href="https://artificialintelligence.ec.europa.eu/register"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] font-medium hover:opacity-80 transition-opacity"
                      style={{ color: "#3b82f6" }}
                    >
                      <ExternalLink className="h-3 w-3" />
                      EU AI Office Database
                    </a>
                  </div>
                  <div className="divide-y" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
                    {nexus.submissions.map((sub, i) => (
                      <div key={i} className="px-5 py-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium" style={{ color: "#0D1016" }}>
                            {sub.systemName}
                          </span>
                          <span
                            className="text-[10px] font-semibold rounded-full px-2 py-0.5"
                            style={{
                              background: "rgba(59,130,246,0.08)",
                              color: "#1d4ed8",
                            }}
                          >
                            {sub.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span
                            className="text-[10px] font-mono"
                            style={{ color: "rgba(0,0,0,0.4)" }}
                          >
                            {sub.referenceNumber}
                          </span>
                          <span
                            className="text-[10px]"
                            style={{ color: "rgba(0,0,0,0.35)" }}
                          >
                            {sub.submissionDate.slice(0, 10)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Sandbox ── */}
          {tab === "sandbox" && (
            <div className="space-y-4">
              {/* Info banner */}
              <div
                className="rounded-xl p-4"
                style={{
                  background: "rgba(59,130,246,0.04)",
                  border: "1px solid rgba(59,130,246,0.15)",
                }}
              >
                <p className="text-[11px] leading-relaxed" style={{ color: "rgba(0,0,0,0.55)" }}>
                  <span className="font-semibold" style={{ color: "#1d4ed8" }}>Art. 57 — </span>
                  Le Sandbox regolatorie permettono alle PMI di testare sistemi AI ad alto
                  rischio in un ambiente controllato prima dell'immissione sul mercato. In
                  Italia la sandbox è gestita da AGID.
                </p>
              </div>

              {!nexus.sandbox ? (
                /* Sandbox form */
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: "1px solid rgba(0,0,0,0.07)", background: "#fff" }}
                >
                  <div
                    className="px-5 py-3.5"
                    style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
                  >
                    <p className="text-[13px] font-medium" style={{ color: "#0D1016" }}>
                      SME Fast-Track — Sandbox (Art. 57)
                    </p>
                  </div>
                  <div className="px-5 py-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-medium mb-1" style={{ color: "rgba(0,0,0,0.45)" }}>
                          Nome azienda
                        </label>
                        <input
                          style={INPUT_STYLE}
                          placeholder="Es. Acme S.r.l."
                          value={nexus.companyName}
                          onChange={(e) => updateNexus({ companyName: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium mb-1" style={{ color: "rgba(0,0,0,0.45)" }}>
                          Partita IVA
                        </label>
                        <input
                          style={INPUT_STYLE}
                          placeholder="Es. IT12345678901"
                          value={nexus.vatNumber}
                          onChange={(e) => updateNexus({ vatNumber: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-medium mb-1" style={{ color: "rgba(0,0,0,0.45)" }}>
                        Nome sistema AI
                      </label>
                      <input
                        style={INPUT_STYLE}
                        placeholder="Es. CV-Screener v2.3"
                        value={nexus.systemName}
                        onChange={(e) => updateNexus({ systemName: e.target.value })}
                      />
                    </div>

                    {/* PMI */}
                    <div>
                      <label className="block text-[10px] font-medium mb-2" style={{ color: "rgba(0,0,0,0.45)" }}>
                        Sei una PMI (&lt; 250 dipendenti)?
                      </label>
                      <div className="flex gap-2">
                        {[true, false].map((v) => (
                          <button
                            key={String(v)}
                            type="button"
                            onClick={() => setIsSME(v)}
                            style={{
                              padding: "4px 14px",
                              borderRadius: "999px",
                              fontSize: "11px",
                              fontWeight: 500,
                              cursor: "pointer",
                              border: isSME === v ? "1px solid #0D1016" : "1px solid rgba(0,0,0,0.12)",
                              background: isSME === v ? "#0D1016" : "#fff",
                              color: isSME === v ? "#fff" : "rgba(0,0,0,0.5)",
                            }}
                          >
                            {v ? "Sì" : "No"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-medium mb-1" style={{ color: "rgba(0,0,0,0.45)" }}>
                          Settore di applicazione
                        </label>
                        <select
                          style={{ ...INPUT_STYLE, cursor: "pointer" }}
                          value={sector}
                          onChange={(e) => setSector(e.target.value)}
                        >
                          {["Occupazione", "Credito", "Salute", "Istruzione", "Giustizia", "Altro"].map(
                            (s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium mb-1" style={{ color: "rgba(0,0,0,0.45)" }}>
                          Fase di sviluppo
                        </label>
                        <select
                          style={{ ...INPUT_STYLE, cursor: "pointer" }}
                          value={phase}
                          onChange={(e) => setPhase(e.target.value)}
                        >
                          {["Prototipo", "MVP", "Produzione limitata", "Già in produzione"].map(
                            (p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-medium mb-1" style={{ color: "rgba(0,0,0,0.45)" }}>
                        Obiettivo sandbox
                      </label>
                      <textarea
                        style={{ ...INPUT_STYLE, minHeight: "60px", resize: "vertical" }}
                        rows={2}
                        placeholder="Cosa vuoi testare/validare nella sandbox?"
                        value={objective}
                        onChange={(e) => setObjective(e.target.value)}
                      />
                    </div>

                    {!isSME && (
                      <div
                        className="rounded-lg p-3"
                        style={{
                          background: "rgba(245,158,11,0.05)",
                          border: "1px solid rgba(245,158,11,0.2)",
                        }}
                      >
                        <p className="text-[11px]" style={{ color: "#92400e" }}>
                          ⚠ Le Sandbox con Fast-Track sono prioritariamente riservate alle PMI.
                          Le grandi aziende possono comunque fare richiesta tramite percorso standard.
                        </p>
                      </div>
                    )}

                    <button
                      onClick={handleGenerateSandbox}
                      style={{
                        width: "100%",
                        padding: "9px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: 600,
                        background: "#0D1016",
                        color: "#fff",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Genera pacchetto SME Fast-Track
                    </button>
                  </div>
                </div>
              ) : (
                /* Sandbox result */
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: "1px solid rgba(0,0,0,0.07)", background: "#fff" }}
                >
                  <div
                    className="flex items-center justify-between px-5 py-3.5"
                    style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
                  >
                    <p className="text-[13px] font-medium" style={{ color: "#0D1016" }}>
                      Pacchetto sandbox generato
                    </p>
                    <span
                      className="text-[10px] font-semibold rounded-full px-2.5 py-0.5"
                      style={{
                        background: `${STATUS_SANDBOX_COLOR[nexus.sandbox.status]}18`,
                        color: STATUS_SANDBOX_COLOR[nexus.sandbox.status],
                      }}
                    >
                      {nexus.sandbox.status}
                    </span>
                  </div>
                  <div className="px-5 py-4 space-y-2">
                    {[
                      { label: "ID Sandbox", value: nexus.sandbox.id },
                      { label: "Nome", value: nexus.sandbox.sandboxName },
                      { label: "Azienda", value: nexus.sandbox.companyName },
                      { label: "Sistema", value: nexus.sandbox.systemName },
                      { label: "Classe rischio", value: nexus.sandbox.riskClass },
                      { label: "PMI", value: nexus.sandbox.smeStatus ? "Sì" : "No" },
                      { label: "Creato il", value: nexus.sandbox.submittedAt.slice(0, 10) },
                    ].map((row) => (
                      <div
                        key={row.label}
                        className="flex justify-between text-[11px] py-1"
                        style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}
                      >
                        <span style={{ color: "rgba(0,0,0,0.45)" }}>{row.label}</span>
                        <span className="font-mono" style={{ color: "#0D1016", fontSize: "10px" }}>
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div
                    className="px-5 py-4 space-y-2"
                    style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
                  >
                    <div className="flex gap-2">
                      <a
                        href="https://www.agid.gov.it"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[11px] font-medium rounded-lg px-2.5 py-1.5 hover:opacity-80 transition-opacity"
                        style={{ border: "1px solid rgba(0,0,0,0.1)", color: "#3b82f6" }}
                      >
                        <ExternalLink className="h-3 w-3" /> Sandbox Italia (AGID)
                      </a>
                      <a
                        href="https://digital-strategy.ec.europa.eu/en/policies/ai-regulatory-sandboxes"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[11px] font-medium rounded-lg px-2.5 py-1.5 hover:opacity-80 transition-opacity"
                        style={{ border: "1px solid rgba(0,0,0,0.1)", color: "#3b82f6" }}
                      >
                        <ExternalLink className="h-3 w-3" /> Sandbox UE (AI Office)
                      </a>
                    </div>
                    <div className="flex items-center justify-between">
                      <button
                        onClick={exportSandboxJSON}
                        className="flex items-center gap-1 text-[11px] font-medium hover:opacity-70 transition-opacity"
                        style={{
                          color: "rgba(0,0,0,0.55)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        <Download className="h-3 w-3" /> Scarica JSON sandbox
                      </button>
                      <button
                        onClick={() => updateNexus({ sandbox: null })}
                        className="text-[11px] hover:opacity-70 transition-opacity"
                        style={{
                          color: "#dc2626",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        Resetta sandbox
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right sidebar: Timeline + Status ── */}
        <div className="lg:col-span-1 space-y-4">
          {/* Timeline */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid rgba(0,0,0,0.07)", background: "#fff" }}
          >
            <div
              className="px-4 py-3.5"
              style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
            >
              <p className="text-[12px] font-medium" style={{ color: "#0D1016" }}>
                Timeline normativa EU AI Act
              </p>
            </div>
            <div className="px-4 py-3 space-y-3">
              {timeline.map((ev, i) => {
                const days =
                  ev.status !== "past"
                    ? Math.ceil(
                        (new Date(ev.date).getTime() - Date.now()) / 86400000
                      )
                    : null;
                return (
                  <div key={i} className="flex items-start gap-2.5">
                    {/* Dot */}
                    <div className="flex-shrink-0 mt-1">
                      {ev.status === "past" && (
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ background: "#15803d" }}
                        />
                      )}
                      {ev.status === "urgent" && (
                        <div
                          className="h-2 w-2 rounded-full animate-pulse"
                          style={{ background: "#d97706" }}
                        />
                      )}
                      {ev.status === "upcoming" && (
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ background: "rgba(0,0,0,0.18)" }}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[11px] font-medium"
                        style={{
                          color:
                            ev.status === "past"
                              ? "rgba(0,0,0,0.4)"
                              : ev.status === "urgent"
                              ? "#92400e"
                              : "#0D1016",
                        }}
                      >
                        {ev.label}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className="text-[10px] font-mono"
                          style={{ color: "rgba(0,0,0,0.35)" }}
                        >
                          {ev.date}
                        </span>
                        <span
                          className="text-[9px] font-semibold rounded px-1 py-0.5"
                          style={{
                            background: "rgba(0,0,0,0.05)",
                            color: "rgba(0,0,0,0.4)",
                          }}
                        >
                          {ev.article}
                        </span>
                      </div>
                      {ev.status === "past" && (
                        <p
                          className="text-[10px] mt-0.5"
                          style={{ color: "#15803d" }}
                        >
                          ✓ In vigore
                        </p>
                      )}
                      {ev.status === "urgent" && days !== null && (
                        <p
                          className="text-[10px] font-semibold mt-0.5"
                          style={{ color: "#dc2626" }}
                        >
                          {days} giorni
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dynamic status */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid rgba(0,0,0,0.07)", background: "#fff" }}
          >
            <div
              className="px-4 py-3.5"
              style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
            >
              <p className="text-[12px] font-medium" style={{ color: "#0D1016" }}>
                Status conformità
              </p>
            </div>
            <div className="px-4 py-3 space-y-2">
              {[
                {
                  label: "Banca dati UE (Art. 49)",
                  ok: nexus.submissions.length > 0,
                  value: nexus.submissions.length > 0 ? "✓ Preparata" : "⚬ Mancante",
                  critical: true,
                },
                {
                  label: "Sandbox (Art. 57)",
                  ok: !!nexus.sandbox,
                  value: nexus.sandbox ? nexus.sandbox.status : "⚬ Non avviata",
                  critical: false,
                },
                {
                  label: "Allegato IV",
                  ok: crossStatus.hasAnnexIV,
                  value: crossStatus.hasAnnexIV ? "✓ Generato" : "⚬ Mancante",
                  critical: true,
                },
                {
                  label: "FRIA (Art. 27)",
                  ok: crossStatus.hasFRIA,
                  value: crossStatus.hasFRIA ? "✓ Completata" : "⚬ Mancante",
                  critical: true,
                },
                {
                  label: "Conformity Assessment",
                  ok: crossStatus.hasConformity,
                  value: crossStatus.hasConformity ? "✓ Completata" : "⚬ Mancante",
                  critical: true,
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between py-1.5"
                  style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}
                >
                  <span className="text-[11px]" style={{ color: "rgba(0,0,0,0.55)" }}>
                    {row.label}
                  </span>
                  <span
                    className="text-[10px] font-medium"
                    style={{
                      color: row.ok
                        ? "#15803d"
                        : row.critical
                        ? "#dc2626"
                        : "rgba(0,0,0,0.35)",
                    }}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Art. 57 info */}
          <div
            className="rounded-xl p-4"
            style={{
              background: "rgba(22,163,74,0.04)",
              border: "1px solid rgba(22,163,74,0.15)",
            }}
          >
            <Shield className="h-4 w-4 mb-1.5" style={{ color: "#15803d" }} />
            <p className="text-[11px] leading-relaxed" style={{ color: "rgba(0,0,0,0.55)" }}>
              <span className="font-semibold" style={{ color: "#15803d" }}>
                Art. 57 — PMI Fast-Track:{" "}
              </span>
              Le PMI hanno accesso prioritario alle Sandbox regolatorie con procedura
              semplificata. La sandbox italiana è operativa tramite AGID.
            </p>
          </div>
        </div>
      </div>

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
