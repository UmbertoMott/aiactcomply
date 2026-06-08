"use client";

import { useState, useEffect } from "react";
import {
  Shield, AlertTriangle, Cpu, StopCircle, ChevronRight,
  UserCheck, Radio, RefreshCw, Settings, History, BarChart2,
} from "lucide-react";
import { appendEvidence } from "@/lib/evidence/evidence-layer";

// ─── Types ─────────────────────────────────────────────────────────────
type KillSwitchState = "disarmed" | "armed" | "triggered" | "overridden";
type LogSeverity    = "info" | "warning" | "critical";
type EscalationLevel = "watch" | "assist" | "autonomous";

interface LogEvent {
  time: string; agent: string; event: string;
  severity: LogSeverity; trace: string;
}
type HistoryEvent = {
  id: string; timestamp: string;
  type: "kill_switch" | "override" | "drift_alert" | "reset" | "friction_gate";
  description: string; metadata?: Record<string, string>;
};
type PersistedState = {
  killState: KillSwitchState; escalationLevel: EscalationLevel;
  driftThreshold: number; frictionGateMinSeconds: number;
  systemName: string; operatorEmail: string;
};

// ─── Persistence ────────────────────────────────────────────────────────
const STORAGE_KEY = "guardian_agent_state";
const HISTORY_KEY = "guardian_agent_history";

function defaultState(): PersistedState {
  return { killState: "disarmed", escalationLevel: "watch", driftThreshold: 5, frictionGateMinSeconds: 3, systemName: "AI System", operatorEmail: "" };
}
function loadState(): PersistedState {
  if (typeof window === "undefined") return defaultState();
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? { ...defaultState(), ...JSON.parse(raw) } : defaultState();
}
function saveState(s: PersistedState) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }
function loadHistory(): HistoryEvent[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(HISTORY_KEY);
  return raw ? JSON.parse(raw) : [];
}
function appendHistory(event: Omit<HistoryEvent, "id" | "timestamp">) {
  const history = loadHistory();
  history.unshift({ id: crypto.randomUUID(), timestamp: new Date().toISOString(), ...event });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 100)));
}

const INITIAL_LOGS: LogEvent[] = [
  { time: "14:32:15", agent: "Sentinel-α", event: "Drift detection: accuracy -2.3%",     severity: "warning",  trace: "inf-7a3f..." },
  { time: "14:30:00", agent: "Sentinel-β", event: "Pattern mismatch: input outlier",      severity: "info",     trace: "inf-7a3e..." },
  { time: "14:20:01", agent: "Sentinel-α", event: "Prompt injection attempt blocked",     severity: "critical", trace: "inf-7a3b..." },
];

// ─── Design tokens (matches app-wide palette) ───────────────────────────
const T = {
  text:    "#0D1016",
  muted:   "rgba(0,0,0,0.42)",
  faint:   "rgba(0,0,0,0.28)",
  border:  "rgba(0,0,0,0.07)",
  card:    "#ffffff",
  bg:      "#FAFAF9",
  red:     "#dc2626",
  redBg:   "rgba(220,38,38,0.06)",
  redBdr:  "rgba(220,38,38,0.18)",
  amber:   "#d97706",
  amberBg: "rgba(245,158,11,0.06)",
  blue:    "#2563eb",
  blueBg:  "rgba(37,99,235,0.06)",
  green:   "#15803d",
  greenBg: "rgba(22,163,74,0.06)",
};

const card = { background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" };

// ─── Small shared components ────────────────────────────────────────────
function SeverityPip({ s }: { s: LogSeverity }) {
  const c = s === "critical" ? T.red : s === "warning" ? T.amber : T.blue;
  return <span style={{ width: 6, height: 6, borderRadius: "50%", background: c, flexShrink: 0, display: "inline-block" }} />;
}

// ─── Page ───────────────────────────────────────────────────────────────
export default function GuardianAgentPage() {
  const [killState,    setKillState]    = useState<KillSwitchState>("disarmed");
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [showOverride, setShowOverride] = useState(false);
  const [selectedLog,  setSelectedLog]  = useState<LogEvent | null>(null);
  const [logs,         setLogs]         = useState<LogEvent[]>(INITIAL_LOGS);
  const [driftPct,     setDriftPct]     = useState(2.3);
  const [autoMode,     setAutoMode]     = useState<"normal" | "drift-alert">("normal");
  const [escalationLevel, setEscalationLevel] = useState<EscalationLevel>("watch");
  const [frictionActive,  setFrictionActive]  = useState(false);
  const [frictionReason,  setFrictionReason]  = useState("");
  const [frictionStartTime, setFrictionStartTime] = useState<number | null>(null);
  const [frictionElapsed,   setFrictionElapsed]   = useState(0);
  const [driftThreshold,    setDriftThreshold]    = useState(5);
  const [frictionGateMinSeconds, setFrictionGateMinSeconds] = useState(3);
  const [systemName,   setSystemName]   = useState("AI System");
  const [operatorEmail, setOperatorEmail] = useState("");
  const [activeTab,    setActiveTab]    = useState<"monitor" | "config" | "history">("monitor");
  // Webhook configurazione per kill switch reale (Art. 14)
  const [webhookUrl,    setWebhookUrl]    = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("guardian_webhook_url") ?? "" : ""
  );
  const [webhookSecret, setWebhookSecret] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("guardian_webhook_secret") ?? "" : ""
  );
  const [webhookStatus, setWebhookStatus] = useState<"idle" | "firing" | "sent" | "error">("idle");
  const [history,      setHistory]      = useState<HistoryEvent[]>([]);
  const [configSaved,  setConfigSaved]  = useState(false);

  useEffect(() => {
    const s = loadState();
    setKillState(s.killState === "triggered" ? "disarmed" : s.killState);
    setEscalationLevel(s.escalationLevel);
    setDriftThreshold(s.driftThreshold);
    setFrictionGateMinSeconds(s.frictionGateMinSeconds);
    setSystemName(s.systemName);
    setOperatorEmail(s.operatorEmail);
    setHistory(loadHistory());
  }, []);

  useEffect(() => {
    saveState({ killState, escalationLevel, driftThreshold, frictionGateMinSeconds, systemName, operatorEmail });
  }, [killState, escalationLevel, driftThreshold, frictionGateMinSeconds, systemName, operatorEmail]);

  useEffect(() => {
    setAutoMode(driftPct > driftThreshold ? "drift-alert" : "normal");
  }, [driftPct, driftThreshold]);

  useEffect(() => {
    if (!frictionActive || frictionStartTime === null) return;
    const interval = setInterval(() => setFrictionElapsed(Math.floor((Date.now() - frictionStartTime) / 1000)), 500);
    return () => clearInterval(interval);
  }, [frictionActive, frictionStartTime]);

  const canArm     = escalationLevel === "assist" || escalationLevel === "autonomous";
  const canTrigger = escalationLevel === "autonomous";
  const canOverride = escalationLevel === "assist" || escalationLevel === "autonomous";

  function addLog(agent: string, event: string, severity: LogSeverity) {
    setLogs((prev) => [{
      time: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      agent, event, severity, trace: `inf-${Math.random().toString(16).slice(2, 10)}`,
    }, ...prev]);
  }

  function activateFriction() {
    setFrictionActive(true); setFrictionStartTime(Date.now()); setFrictionElapsed(0);
  }

  function buildTrace(log: LogEvent): string[] {
    const base = [`Agente: ${log.agent}`, `Trace ID: ${log.trace}`, `Timestamp: ${log.time}`, `Severity: ${log.severity.toUpperCase()}`];
    if (log.severity === "critical") return [...base, `Evento: ${log.event}`, "→ Policy check: soglia critica superata", "→ Kill switch protocol: ENGAGED", `→ Operatore: ${operatorEmail || "non configurato"}`, "→ Evidence Layer: record scritto ✓"];
    if (log.severity === "warning")  return [...base, `Evento: ${log.event}`, "→ Policy check: warning superata", `→ Drift threshold: ${driftThreshold}%`, "→ Azione: revisione umana raccomandata"];
    return [...base, `Evento: ${log.event}`, "→ Policy check: OK", "→ Nessuna azione richiesta"];
  }

  async function armKillSwitch() {
    setKillState("armed");
    addLog("Operative-γ", "Kill switch armed — awaiting human confirmation", "critical");
  }

  /**
   * Invia il segnale di stop reale all'infrastruttura del cliente via webhook HTTP POST
   * firmato con HMAC SHA-256. Il webhook è configurato nella tab Configurazione.
   */
  async function fireWebhookKillSwitch() {
    if (!webhookUrl) {
      addLog("Guardian-API", "⚠ Webhook non configurato — configura l'URL nella tab Configurazione", "warning");
      return;
    }
    setWebhookStatus("firing");
    addLog("Guardian-API", `→ Invio segnale di stop a ${webhookUrl}`, "critical");
    try {
      const res = await fetch("/api/guardian/kill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl, secret: webhookSecret || undefined }),
      });
      if (res.ok) {
        setWebhookStatus("sent");
        addLog("Guardian-API", "✓ Segnale di stop inviato con successo — sistema esterno notificato", "critical");
      } else {
        setWebhookStatus("error");
        addLog("Guardian-API", `✗ Errore webhook HTTP ${res.status} — verifica URL e raggiungibilità`, "warning");
      }
    } catch {
      setWebhookStatus("error");
      addLog("Guardian-API", "✗ Errore di rete — webhook irraggiungibile", "warning");
    }
  }

  async function confirmKill() {
    setKillState("triggered"); setShowConfirm(false);
    addLog("Operative-γ", "⚠ KILL SWITCH TRIGGERED — system halted", "critical");
    addLog("Sentinel-α", "All inference pipelines frozen.", "critical");
    appendHistory({ type: "kill_switch", description: `Kill switch attivato per ${systemName}`, metadata: { drift: `${driftPct}%`, escalation: escalationLevel } });
    setHistory(loadHistory());
    await appendEvidence("incident", { descrizione: `Kill switch attivato — ${systemName}`, data_incidente: new Date().toLocaleString("it-IT"), gravità: "Critico — notifica obbligatoria", componenti_coinvolti: systemName, azioni_intraprese: "Sistema arrestato tramite Guardian-Agent kill switch", notificato_autorità: "In valutazione", stato: "Aperto" }, `guardian-agent${operatorEmail ? ` / ${operatorEmail}` : ""}`);
  }

  async function executeOverride() {
    if (!overrideReason.trim()) return;
    setKillState("overridden"); setShowOverride(false);
    addLog("Operative-γ", `Override → HITL. Motivo: ${overrideReason}`, "info");
    addLog("Sentinel-α", "Human-in-the-loop activated.", "info");
    appendHistory({ type: "override", description: `Override eseguito. Motivo: ${overrideReason.slice(0, 100)}`, metadata: { operator: operatorEmail || "non specificato" } });
    setHistory(loadHistory());
    await appendEvidence("decision", { titolo: `Override HITL — ${systemName}`, decisione_presa: "Controllo delegato a operatore umano", motivazione_algoritmica: overrideReason, revisione_umana: "Sì, approvata", stakeholder: operatorEmail || "Team Operations" }, `guardian-agent${operatorEmail ? ` / ${operatorEmail}` : ""}`);
    setOverrideReason("");
  }

  function resetSystem() {
    appendHistory({ type: "reset", description: `Sistema ripristinato da stato: ${killState}` });
    setKillState("disarmed"); setHistory(loadHistory());
    addLog("Sentinel-β", "System reset complete. All agents reinitialized.", "info");
  }

  function simulateDrift() {
    const newDrift = +(Math.random() * 10).toFixed(1);
    setDriftPct(newDrift);
    addLog("Sentinel-α", `Drift detection: accuracy ${newDrift > 0 ? "-" : "+"}${Math.abs(newDrift)}%`, newDrift > driftThreshold ? "critical" : "warning");
    appendHistory({ type: "drift_alert", description: `Drift rilevato: ${newDrift}% ${newDrift > driftThreshold ? "(soglia superata)" : ""}`, metadata: { threshold: `${driftThreshold}%` } });
    setHistory(loadHistory());
    if (newDrift > driftThreshold) {
      addLog("Operative-γ", "⚠ CRITICAL DRIFT — Auto-arming kill switch", "critical");
      setKillState("armed");
    }
  }

  function handleSaveConfig() {
    saveState({ killState, escalationLevel, driftThreshold, frictionGateMinSeconds, systemName, operatorEmail });
    setConfigSaved(true); setTimeout(() => setConfigSaved(false), 2000);
  }

  function clearHistory() {
    if (!confirm("Cancellare tutto lo storico eventi?")) return;
    localStorage.removeItem(HISTORY_KEY); setHistory([]);
  }

  // ── Kill switch pill label / color ──────────────────────────────────
  const ksColor = killState === "triggered" ? T.red : killState === "armed" ? T.amber : killState === "overridden" ? T.blue : T.faint;
  const ksLabel = killState === "disarmed" ? "Disarmato" : killState === "armed" ? "Armato" : killState === "triggered" ? "ATTIVATO" : "Overridden";

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <div className="w-full">

      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.5px", color: T.text }}>
              Guardian Agent
            </h1>
            {systemName && (
              <span style={{ fontSize: 13, color: T.muted, fontWeight: 400 }}>— {systemName}</span>
            )}
          </div>
          <p style={{ fontSize: 13, color: T.muted }}>
            Control plane di sorveglianza runtime · Kill switch · Override HITL · Explainability trace
          </p>
          <div className="flex gap-1.5 mt-2">
            {["Art. 14", "Art. 9", "Art. 15"].map((art) => (
              <span key={art} style={{ fontSize: 10, color: T.faint, background: "rgba(0,0,0,0.04)", borderRadius: 4, padding: "2px 7px" }}>
                {art}
              </span>
            ))}
          </div>
        </div>

        {/* Status pill */}
        <div
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl flex-shrink-0"
          style={autoMode === "drift-alert"
            ? { background: T.redBg, border: `1px solid ${T.redBdr}` }
            : { background: T.greenBg, border: "1px solid rgba(22,163,74,0.18)" }}
        >
          <Radio
            className="h-3 w-3"
            style={{ color: autoMode === "drift-alert" ? T.red : T.green }}
          />
          <span style={{ fontSize: 11, fontWeight: 600, color: autoMode === "drift-alert" ? T.red : T.green }}>
            {autoMode === "drift-alert" ? "Drift critico — mitigazione attiva" : "Operativo"}
          </span>
        </div>
      </div>

      {/* ── TABS ──────────────────────────────────────────────────────── */}
      <div className="flex gap-6 mb-6" style={{ borderBottom: `1px solid ${T.border}` }}>
        {([
          { id: "monitor" as const, label: "Monitor",        Icon: Radio },
          { id: "config"  as const, label: "Configurazione", Icon: Settings },
          { id: "history" as const, label: "Storico",        Icon: History },
        ] as const).map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="flex items-center gap-1.5 pb-3 transition-all"
            style={{
              fontSize: 13,
              fontWeight: activeTab === id ? 500 : 400,
              color: activeTab === id ? T.text : T.muted,
              background: "none",
              border: "none",
              borderBottom: `2px solid ${activeTab === id ? T.text : "transparent"}`,
              cursor: "pointer",
              paddingBottom: 12,
            }}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {id === "history" && history.length > 0 && (
              <span style={{ fontSize: 10, fontWeight: 600, color: T.faint, background: "rgba(0,0,0,0.05)", borderRadius: 10, padding: "1px 6px" }}>
                {history.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TAB: MONITOR
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === "monitor" && (
        <>
          {/* Drift alert — only if active */}
          {autoMode === "drift-alert" && (
            <div className="rounded-xl px-5 py-4 mb-5 flex items-start gap-4"
              style={{ background: T.redBg, border: `1px solid ${T.redBdr}` }}>
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: T.red }} />
              <div className="flex-1">
                <p style={{ fontSize: 13, fontWeight: 600, color: T.red, marginBottom: 4 }}>
                  Deriva critica — {driftPct}% (soglia: {driftThreshold}%)
                </p>
                <p style={{ fontSize: 12, color: T.muted }}>
                  Kill switch armato automaticamente. Azione richiesta: conferma arresto o delega a operatore.
                </p>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => setShowConfirm(true)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5"
                    style={{ background: T.red, color: "#fff", fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer" }}>
                    <StopCircle className="h-3 w-3" /> Arresta sistema
                  </button>
                  <button onClick={() => setShowOverride(true)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5"
                    style={{ background: "transparent", color: T.text, fontSize: 11, fontWeight: 500, border: `1px solid ${T.border}`, cursor: "pointer" }}>
                    <UserCheck className="h-3 w-3" /> Delega operatore
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── STATS STRIP ─────────────────────────────────────────── */}
          <div className="rounded-xl mb-5" style={card}>
            <div className="grid grid-cols-4">
              {[
                { label: "System state",    value: killState === "triggered" ? "HALTED" : "Active",
                  color: killState === "triggered" ? T.red : T.green },
                { label: "Kill switch",     value: ksLabel, color: ksColor },
                { label: "Human-in-loop",   value: killState === "overridden" ? "Attivo" : "Standby",
                  color: killState === "overridden" ? T.blue : T.faint },
                { label: `Drift (soglia ${driftThreshold}%)`, value: `${driftPct}%`,
                  color: driftPct > driftThreshold ? T.red : T.green },
              ].map((s, i) => (
                <div key={s.label} className="px-5 py-4"
                  style={{ borderRight: i < 3 ? `1px solid ${T.border}` : "none" }}>
                  <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.4px", color: s.color, lineHeight: 1.1 }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 11, color: T.faint, marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── MAIN GRID ───────────────────────────────────────────── */}
          <div className="grid lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-4">

              {/* Escalation protocol */}
              <div className="rounded-xl p-5" style={card}>
                <div className="flex items-center justify-between mb-4">
                  <h2 style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                    Protocollo di escalation
                  </h2>
                  <span style={{ fontSize: 10, color: T.faint, background: "rgba(0,0,0,0.04)", borderRadius: 4, padding: "2px 7px" }}>
                    3 livelli
                  </span>
                </div>
                {/* Segmented control */}
                <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
                  {(["watch", "assist", "autonomous"] as const).map((level, i) => {
                    const isActive = escalationLevel === level;
                    const labels = { watch: "Watch", assist: "Assist", autonomous: "Autonomous" };
                    const descs  = { watch: "Monitoraggio passivo", assist: "Suggerimenti HITL", autonomous: "Kill switch + override" };
                    return (
                      <button
                        key={level}
                        onClick={() => setEscalationLevel(level)}
                        className="flex-1 px-4 py-3 text-left transition-colors"
                        style={{
                          background: isActive ? T.text : T.card,
                          borderRight: i < 2 ? `1px solid ${isActive ? "transparent" : T.border}` : "none",
                          cursor: "pointer",
                          border: "none",
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? "#fff" : T.text, marginBottom: 2 }}>
                          {labels[level]}
                        </div>
                        <div style={{ fontSize: 10, color: isActive ? "rgba(255,255,255,0.6)" : T.faint }}>
                          {descs[level]}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Friction Gate */}
              <div className="rounded-xl p-5" style={card}>
                <div className="flex items-center gap-2 mb-3">
                  <h2 style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Friction Gate</h2>
                  <span style={{ fontSize: 10, color: T.faint, background: "rgba(0,0,0,0.04)", borderRadius: 4, padding: "2px 7px" }}>
                    Art. 14(4) · Anti automation bias
                  </span>
                </div>
                <div className="rounded-lg p-4" style={{ background: T.amberBg, border: `1px solid rgba(245,158,11,0.2)` }}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: T.text, marginBottom: 4 }}>
                    Rilevato: approvazione rapida di output rischioso
                  </p>
                  <p style={{ fontSize: 11, color: T.muted, marginBottom: 12 }}>
                    Soglia minima impostata: {frictionGateMinSeconds}s. L&apos;automation bias può portare a trascurare errori critici.
                  </p>
                  {!frictionActive ? (
                    <button onClick={activateFriction} className="rounded-lg px-3 py-1.5"
                      style={{ fontSize: 11, fontWeight: 500, color: T.amber, background: "transparent", border: `1px solid rgba(245,158,11,0.3)`, cursor: "pointer" }}>
                      Simula approvazione rapida
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p style={{ fontSize: 11, fontWeight: 600, color: T.red }}>
                        Friction Gate attivato — motivazione obbligatoria
                      </p>
                      <textarea value={frictionReason} onChange={(e) => setFrictionReason(e.target.value)}
                        placeholder="Spiega perché questo output è accettabile nonostante il rischio..."
                        className="w-full rounded-lg px-3 py-2 focus:outline-none"
                        style={{ fontSize: 11, border: `1px solid ${T.border}`, background: T.card, color: T.text, resize: "none" }}
                        rows={2}
                      />
                      <p style={{ fontSize: 11, color: frictionElapsed >= frictionGateMinSeconds ? T.green : T.muted }}>
                        {frictionElapsed < frictionGateMinSeconds
                          ? `Attendi ancora ${frictionGateMinSeconds - frictionElapsed}s prima di confermare`
                          : "✓ Tempo minimo di riflessione completato"}
                      </p>
                      <div className="flex gap-2">
                        <button
                          disabled={!frictionReason.trim() || frictionElapsed < frictionGateMinSeconds}
                          onClick={() => {
                            addLog("Operative-γ", `Friction Gate superato dopo ${frictionElapsed}s`, "info");
                            appendHistory({ type: "friction_gate", description: `Friction Gate superato (${frictionElapsed}s). Motivo: ${frictionReason.slice(0, 80)}` });
                            setHistory(loadHistory()); setFrictionActive(false); setFrictionReason(""); setFrictionStartTime(null); setFrictionElapsed(0);
                          }}
                          className="rounded-lg px-3 py-1.5"
                          style={{ fontSize: 11, fontWeight: 600, background: T.text, color: "#fff", border: "none", cursor: "pointer", opacity: (!frictionReason.trim() || frictionElapsed < frictionGateMinSeconds) ? 0.35 : 1 }}>
                          Conferma con motivazione
                        </button>
                        <button onClick={() => setShowConfirm(true)} className="rounded-lg px-3 py-1.5"
                          style={{ fontSize: 11, fontWeight: 500, color: T.red, background: T.redBg, border: `1px solid ${T.redBdr}`, cursor: "pointer" }}>
                          Blocca output
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Governance panel */}
              <div className="rounded-xl p-5" style={card}>
                <div className="flex items-center justify-between mb-4">
                  <h2 style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Pannello di governance</h2>
                  <span style={{ fontSize: 10, color: T.faint, background: "rgba(0,0,0,0.04)", borderRadius: 4, padding: "2px 7px" }}>Art. 14</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    {
                      label: "Arma Kill Switch",
                      sub: "Prepara arresto d'emergenza",
                      Icon: StopCircle,
                      onClick: armKillSwitch,
                      disabled: killState === "triggered" || !canArm,
                      hint: !canArm ? "Richiede Assist o Autonomous" : undefined,
                      variant: "outline-danger" as const,
                    },
                    {
                      label: "ATTIVA KILL SWITCH",
                      sub: "Arresto immediato del sistema",
                      Icon: StopCircle,
                      onClick: () => setShowConfirm(true),
                      disabled: killState !== "armed" || !canTrigger,
                      hint: !canTrigger ? "Richiede Autonomous" : undefined,
                      variant: "filled-danger" as const,
                    },
                    {
                      label: "Override → Operatore",
                      sub: "Reindirizza a HITL",
                      Icon: UserCheck,
                      onClick: () => setShowOverride(true),
                      disabled: killState === "triggered" || !canOverride,
                      hint: !canOverride ? "Richiede Assist o Autonomous" : undefined,
                      variant: "outline-blue" as const,
                    },
                    {
                      label: "Reset sistema",
                      sub: "Ripristino agenti",
                      Icon: RefreshCw,
                      onClick: resetSystem,
                      disabled: killState === "disarmed",
                      hint: undefined,
                      variant: "outline-neutral" as const,
                    },
                  ].map((btn) => {
                    const styles: Record<string, React.CSSProperties> = {
                      "outline-danger":  { background: T.redBg, border: `1px solid ${T.redBdr}`, color: T.red },
                      "filled-danger":   { background: T.red, border: "none", color: "#fff" },
                      "outline-blue":    { background: T.blueBg, border: `1px solid rgba(37,99,235,0.2)`, color: T.blue },
                      "outline-neutral": { background: "rgba(0,0,0,0.02)", border: `1px solid ${T.border}`, color: T.muted },
                    };
                    return (
                      <div key={btn.label}>
                        <button
                          onClick={btn.onClick}
                          disabled={btn.disabled}
                          className="w-full rounded-lg px-4 py-3 text-left transition-opacity hover:opacity-80"
                          style={{ ...styles[btn.variant], cursor: "pointer", opacity: btn.disabled ? 0.3 : 1 }}
                        >
                          <btn.Icon className="h-3.5 w-3.5 mb-1.5" />
                          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{btn.label}</div>
                          <div style={{ fontSize: 10, opacity: 0.65 }}>{btn.sub}</div>
                        </button>
                        {btn.hint && btn.disabled && (
                          <p style={{ fontSize: 10, color: T.faint, marginTop: 3, paddingLeft: 2 }}>{btn.hint}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Agent log */}
              <div className="rounded-xl overflow-hidden" style={card}>
                <div className="flex items-center justify-between px-5 py-3"
                  style={{ borderBottom: `1px solid ${T.border}` }}>
                  <h2 style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Agent Log</h2>
                  <div className="flex items-center gap-3">
                    <button onClick={simulateDrift} className="rounded-md px-2.5 py-1.5"
                      style={{ fontSize: 10, color: T.muted, background: "rgba(0,0,0,0.03)", border: `1px solid ${T.border}`, cursor: "pointer" }}>
                      Simula drift
                    </button>
                    <div className="flex items-center gap-1.5">
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, display: "inline-block" }} />
                      <span style={{ fontSize: 10, color: T.faint }}>Live</span>
                    </div>
                  </div>
                </div>
                <div style={{ maxHeight: 240, overflowY: "auto", background: "#FAFAFA" }}>
                  {logs.map((log, i) => (
                    <div
                      key={i}
                      onClick={() => setSelectedLog(log)}
                      className="flex items-start gap-3 px-5 py-2.5 cursor-pointer transition-colors hover:bg-white"
                      style={{ borderBottom: `1px solid rgba(0,0,0,0.04)`, background: selectedLog?.trace === log.trace ? "#fff" : undefined }}
                    >
                      <SeverityPip s={log.severity} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span style={{ fontSize: 10, fontWeight: 600, color: T.muted, fontFamily: "monospace" }}>{log.agent}</span>
                          <span style={{ fontSize: 10, color: T.faint, fontFamily: "monospace", flexShrink: 0 }}>{log.time}</span>
                        </div>
                        <p style={{ fontSize: 11, color: log.severity === "critical" ? T.red : T.text, fontFamily: "monospace" }}>
                          {log.event}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── RIGHT PANEL ─────────────────────────────────────────── */}
            <div className="lg:col-span-1 space-y-4">

              {/* Explainability trace */}
              <div className="rounded-xl p-5" style={card}>
                <div className="flex items-center justify-between mb-3">
                  <h2 style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Explainability Trace</h2>
                  {selectedLog && (
                    <span style={{ fontSize: 9, fontFamily: "monospace", color: T.faint, background: "rgba(0,0,0,0.04)", borderRadius: 4, padding: "2px 6px" }}>
                      {selectedLog.trace}
                    </span>
                  )}
                </div>
                {selectedLog ? (
                  <div className="space-y-1.5">
                    {buildTrace(selectedLog).map((step, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0" style={{ color: "rgba(37,99,235,0.5)" }} />
                        <span style={{ fontSize: 11, color: step.startsWith("→") ? T.text : T.muted, fontFamily: "monospace" }}>
                          {step}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 11, color: T.muted }}>
                    Art. 86 — Diritto alla spiegazione. Clicca un evento nel log per vedere la catena di inferenza.
                  </p>
                )}
              </div>

              {/* Kill switch status */}
              <div className="rounded-xl p-5" style={card}>
                <h2 style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 16 }}>Stato sistema</h2>
                {[
                  { label: "Kill switch", value: ksLabel, color: ksColor },
                  { label: "HITL", value: killState === "overridden" ? "Attivo" : "Standby", color: killState === "overridden" ? T.green : T.faint },
                  { label: "Ultimo override", value: killState === "overridden" ? new Date().toLocaleTimeString("it-IT") : "—", color: T.faint },
                  { label: "Escalation", value: escalationLevel, color: T.blue },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-2.5"
                    style={{ borderBottom: `1px solid rgba(0,0,0,0.04)` }}>
                    <span style={{ fontSize: 11, color: T.muted }}>{row.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "monospace", color: row.color, textTransform: "capitalize" }}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Art 14 note */}
              <div className="rounded-xl px-4 py-3.5" style={{ background: "rgba(0,0,0,0.02)", border: `1px solid ${T.border}` }}>
                <p style={{ fontSize: 11, color: T.muted, lineHeight: 1.5 }}>
                  <span style={{ fontWeight: 600, color: T.text }}>Art. 14(4) — </span>
                  Il supervisore umano può ignorare, annullare o ribaltare l&apos;output del sistema AI in qualsiasi momento.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB: CONFIGURAZIONE
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === "config" && (
        <div className="max-w-xl space-y-4">
          <div className="rounded-xl p-6" style={card}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 20 }}>
              Impostazioni Guardian-Agent
            </h2>
            <div className="space-y-4">
              {[
                { label: "Nome sistema monitorato", value: systemName, setter: setSystemName, type: "text", placeholder: "Es. CV-Screener, MedDiag Pro", hint: undefined },
                { label: "Email operatore", value: operatorEmail, setter: setOperatorEmail, type: "email", placeholder: "operatore@azienda.it", hint: undefined },
              ].map((field) => (
                <div key={field.label}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: T.muted, marginBottom: 5 }}>
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    value={field.value}
                    onChange={(e) => field.setter(e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full rounded-lg px-3 py-2 focus:outline-none"
                    style={{ fontSize: 12, border: `1px solid ${T.border}`, background: "#FAFAF9", color: T.text }}
                  />
                </div>
              ))}

              {[
                { label: "Soglia drift critica (%)", value: driftThreshold, setter: setDriftThreshold, hint: "Sopra questa soglia il kill switch viene armato automaticamente" },
                { label: "Tempo minimo friction gate (s)", value: frictionGateMinSeconds, setter: setFrictionGateMinSeconds, hint: "Secondi minimi di riflessione prima di confermare azioni rischiose" },
              ].map((field) => (
                <div key={field.label}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: T.muted, marginBottom: 5 }}>
                    {field.label}
                  </label>
                  <input type="number" min={1} max={30} value={field.value}
                    onChange={(e) => field.setter(Number(e.target.value))}
                    className="w-full rounded-lg px-3 py-2 focus:outline-none"
                    style={{ fontSize: 12, border: `1px solid ${T.border}`, background: "#FAFAF9", color: T.text }}
                  />
                  {field.hint && <p style={{ fontSize: 10, color: T.faint, marginTop: 4 }}>{field.hint}</p>}
                </div>
              ))}

              {/* ── Webhook Kill Switch (Art. 14) ─────────────────────────────── */}
              <div
                className="rounded-xl p-4 space-y-3"
                style={{ border: `1px solid ${T.border}`, background: "rgba(220,38,38,0.02)" }}
              >
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 2 }}>
                    Webhook Kill Switch (Art. 14)
                  </p>
                  <p style={{ fontSize: 10, color: T.faint }}>
                    Endpoint HTTP POST del tuo container AI. Quando il kill switch viene attivato, AIComply invia un segnale firmato HMAC SHA-256.
                  </p>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: T.muted, marginBottom: 5 }}>
                    URL endpoint di emergenza
                  </label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => {
                      setWebhookUrl(e.target.value);
                      if (typeof window !== "undefined") localStorage.setItem("guardian_webhook_url", e.target.value);
                    }}
                    placeholder="https://tua-infrastruttura.com/api/emergency-stop"
                    className="w-full rounded-lg px-3 py-2 focus:outline-none"
                    style={{ fontSize: 12, border: `1px solid ${T.border}`, background: "#FAFAF9", color: T.text }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: T.muted, marginBottom: 5 }}>
                    Secret HMAC (opzionale)
                  </label>
                  <input
                    type="password"
                    value={webhookSecret}
                    onChange={(e) => {
                      setWebhookSecret(e.target.value);
                      if (typeof window !== "undefined") localStorage.setItem("guardian_webhook_secret", e.target.value);
                    }}
                    placeholder="••••••••••••"
                    className="w-full rounded-lg px-3 py-2 focus:outline-none"
                    style={{ fontSize: 12, border: `1px solid ${T.border}`, background: "#FAFAF9", color: T.text }}
                  />
                  <p style={{ fontSize: 10, color: T.faint, marginTop: 4 }}>
                    Se configurato, la richiesta viene firmata con X-AIComply-Signature: sha256=...
                  </p>
                </div>
                {/* Test webhook */}
                <button
                  onClick={fireWebhookKillSwitch}
                  disabled={!webhookUrl || webhookStatus === "firing"}
                  className="rounded-lg px-4 py-2 text-[12px] font-medium transition-opacity"
                  style={{
                    background: webhookStatus === "sent" ? "#15803d" : webhookStatus === "error" ? "#dc2626" : T.text,
                    color: "#fff",
                    opacity: (!webhookUrl || webhookStatus === "firing") ? 0.5 : 1,
                    cursor: !webhookUrl ? "not-allowed" : "pointer",
                  }}
                >
                  {webhookStatus === "firing" ? "Invio in corso..." :
                   webhookStatus === "sent"   ? "✓ Segnale inviato" :
                   webhookStatus === "error"  ? "✗ Errore — riprova" :
                   "Test Kill Switch Webhook"}
                </button>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: T.muted, marginBottom: 8 }}>
                  Livello escalation predefinito
                </label>
                <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
                  {(["watch", "assist", "autonomous"] as const).map((level, i) => {
                    const isActive = escalationLevel === level;
                    const labels = { watch: "Watch", assist: "Assist", autonomous: "Autonomous" };
                    const descs  = { watch: "Monitoraggio passivo", assist: "Suggerimenti HITL", autonomous: "Kill switch + override" };
                    return (
                      <button key={level} onClick={() => setEscalationLevel(level)}
                        className="flex-1 px-3 py-3 text-left transition-colors"
                        style={{ background: isActive ? T.text : T.card, borderRight: i < 2 ? `1px solid ${isActive ? "transparent" : T.border}` : "none", cursor: "pointer", border: "none" }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? "#fff" : T.text, marginBottom: 2 }}>{labels[level]}</div>
                        <div style={{ fontSize: 10, color: isActive ? "rgba(255,255,255,0.55)" : T.faint }}>{descs[level]}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button onClick={handleSaveConfig} className="rounded-lg px-5 py-2"
                style={{ fontSize: 12, fontWeight: 600, background: T.text, color: "#fff", border: "none", cursor: "pointer" }}>
                Salva configurazione
              </button>
              {configSaved && (
                <span style={{ fontSize: 12, fontWeight: 500, color: T.green }}>✓ Salvato</span>
              )}
            </div>
          </div>

          <div className="rounded-xl px-4 py-3.5" style={{ background: "rgba(0,0,0,0.02)", border: `1px solid ${T.border}` }}>
            <p style={{ fontSize: 11, color: T.muted, lineHeight: 1.5 }}>
              <BarChart2 className="h-3.5 w-3.5 inline mr-1.5 mb-0.5" style={{ color: T.faint }} />
              <span style={{ fontWeight: 600, color: T.text }}>Art. 14(4) — </span>
              Le soglie configurate qui determinano il comportamento automatico del Guardian-Agent in produzione. Ogni modifica viene registrata nell&apos;Evidence Layer.
            </p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB: STORICO
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="rounded-xl" style={card}>
            <div className="grid grid-cols-3">
              {[
                { label: "Kill switch attivati", count: history.filter((h) => h.type === "kill_switch").length, color: T.red },
                { label: "Override eseguiti",    count: history.filter((h) => h.type === "override").length,    color: T.blue },
                { label: "Alert drift",           count: history.filter((h) => h.type === "drift_alert").length, color: T.amber },
              ].map((s, i) => (
                <div key={s.label} className="px-6 py-4"
                  style={{ borderRight: i < 2 ? `1px solid ${T.border}` : "none" }}>
                  <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.5px", color: s.color }}>{s.count}</div>
                  <div style={{ fontSize: 11, color: T.faint, marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl overflow-hidden" style={card}>
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${T.border}` }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Eventi registrati</h2>
              {history.length > 0 && (
                <button onClick={clearHistory}
                  style={{ fontSize: 11, color: T.red, background: "none", border: "none", cursor: "pointer" }}>
                  Cancella storico
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <History className="h-8 w-8 mx-auto mb-3" style={{ color: "rgba(0,0,0,0.12)" }} />
                <p style={{ fontSize: 13, fontWeight: 500, color: T.text, marginBottom: 6 }}>Nessun evento registrato</p>
                <p style={{ fontSize: 12, color: T.muted, maxWidth: 340, margin: "0 auto" }}>
                  Kill switch, override e drift alert appariranno qui e saranno archiviati sull&apos;Evidence Layer.
                </p>
              </div>
            ) : (
              <div>
                {history.map((event, i) => {
                  const typeColors: Record<HistoryEvent["type"], string> = {
                    kill_switch: T.red, override: T.blue, drift_alert: T.amber, reset: T.faint, friction_gate: T.amber,
                  };
                  const typeIcons: Record<HistoryEvent["type"], React.FC<React.SVGProps<SVGSVGElement>>> = {
                    kill_switch: StopCircle, override: UserCheck, drift_alert: AlertTriangle, reset: RefreshCw, friction_gate: Shield,
                  };
                  const Icon = typeIcons[event.type];
                  const color = typeColors[event.type];
                  return (
                    <div key={event.id} className="flex items-start gap-3 px-5 py-3 hover:bg-black/[0.01] transition-colors"
                      style={{ borderBottom: i < history.length - 1 ? `1px solid rgba(0,0,0,0.04)` : "none" }}>
                      <Icon className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color }} />
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: 12, color: T.text }}>{event.description}</p>
                        {event.metadata && Object.keys(event.metadata).length > 0 && (
                          <div className="flex flex-wrap gap-3 mt-1">
                            {Object.entries(event.metadata).map(([k, v]) => (
                              <span key={k} style={{ fontSize: 10, color: T.faint, fontFamily: "monospace" }}>
                                {k}: {v}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span style={{ fontSize: 10, fontWeight: 600, color, background: `${color}18`, borderRadius: 4, padding: "1px 6px", textTransform: "capitalize" }}>
                          {event.type.replace("_", " ")}
                        </span>
                        <span style={{ fontSize: 10, color: T.faint, fontFamily: "monospace" }}>
                          {new Date(event.timestamp).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CONFIRM KILL SWITCH MODAL ─────────────────────────────── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.55)" }}>
          <div className="max-w-md w-full rounded-2xl p-7" style={{ background: T.card, border: `1px solid ${T.redBdr}`, boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: T.redBg }}>
              <StopCircle className="h-5 w-5" style={{ color: T.red }} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: T.text, textAlign: "center", marginBottom: 8 }}>
              Conferma arresto d&apos;emergenza
            </h3>
            <p style={{ fontSize: 12, color: T.muted, textAlign: "center", lineHeight: 1.6, marginBottom: 24 }}>
              Stai per attivare il Kill Switch. Il sistema AI verrà arrestato immediatamente.
              Questa azione viene registrata nell&apos;Evidence Layer con hash crittografico.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 rounded-xl py-2.5"
                style={{ fontSize: 13, fontWeight: 500, color: T.text, background: "rgba(0,0,0,0.03)", border: `1px solid ${T.border}`, cursor: "pointer" }}>
                Annulla
              </button>
              <button onClick={confirmKill} className="flex-1 rounded-xl py-2.5"
                style={{ fontSize: 13, fontWeight: 600, color: "#fff", background: T.red, border: "none", cursor: "pointer" }}>
                Conferma arresto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── OVERRIDE MODAL ─────────────────────────────────────────── */}
      {showOverride && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.55)" }}>
          <div className="max-w-md w-full rounded-2xl p-7" style={{ background: T.card, border: `1px solid rgba(37,99,235,0.2)`, boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: T.blueBg }}>
              <UserCheck className="h-5 w-5" style={{ color: T.blue }} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: T.text, textAlign: "center", marginBottom: 8 }}>
              Delega a operatore umano
            </h3>
            <p style={{ fontSize: 12, color: T.muted, textAlign: "center", lineHeight: 1.6, marginBottom: 16 }}>
              Il controllo passa a un supervisore umano (Human-in-the-loop). Specifica il motivo dell&apos;override.
            </p>
            <textarea value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Motivo dell'override (es. falso positivo critico, bias rilevato...)"
              className="w-full rounded-xl px-4 py-3 focus:outline-none mb-4"
              style={{ fontSize: 12, border: `1px solid ${T.border}`, background: "#FAFAF9", color: T.text, resize: "none" }}
              rows={3}
            />
            <div className="flex gap-3">
              <button onClick={() => setShowOverride(false)} className="flex-1 rounded-xl py-2.5"
                style={{ fontSize: 13, fontWeight: 500, color: T.text, background: "rgba(0,0,0,0.03)", border: `1px solid ${T.border}`, cursor: "pointer" }}>
                Annulla
              </button>
              <button onClick={executeOverride} disabled={!overrideReason.trim()} className="flex-1 rounded-xl py-2.5"
                style={{ fontSize: 13, fontWeight: 600, color: "#fff", background: T.blue, border: "none", cursor: "pointer", opacity: !overrideReason.trim() ? 0.4 : 1 }}>
                Conferma override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
