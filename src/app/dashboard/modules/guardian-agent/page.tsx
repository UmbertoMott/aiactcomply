"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  Eye,
  AlertTriangle,
  Cpu,
  StopCircle,
  ChevronRight,
  UserCheck,
  Radio,
  RefreshCw,
  Settings,
  History,
  BarChart2,
} from "lucide-react";
import { appendEvidence } from "@/lib/evidence/evidence-layer";

// Suppress unused import warning — kept for potential future use
void Eye;

// ─── Types ────────────────────────────────────────────────────────────────────

type KillSwitchState = "disarmed" | "armed" | "triggered" | "overridden";
type LogSeverity = "info" | "warning" | "critical";
type EscalationLevel = "watch" | "assist" | "autonomous";

interface LogEvent {
  time: string;
  agent: string;
  event: string;
  severity: LogSeverity;
  trace: string;
}

type HistoryEvent = {
  id: string;
  timestamp: string;
  type: "kill_switch" | "override" | "drift_alert" | "reset" | "friction_gate";
  description: string;
  metadata?: Record<string, string>;
};

type PersistedState = {
  killState: KillSwitchState;
  escalationLevel: EscalationLevel;
  driftThreshold: number;
  frictionGateMinSeconds: number;
  systemName: string;
  operatorEmail: string;
};

// ─── Persistence helpers ──────────────────────────────────────────────────────

const STORAGE_KEY = "guardian_agent_state";
const HISTORY_KEY = "guardian_agent_history";

function defaultState(): PersistedState {
  return {
    killState: "disarmed",
    escalationLevel: "watch",
    driftThreshold: 5,
    frictionGateMinSeconds: 3,
    systemName: "AI System",
    operatorEmail: "",
  };
}

function loadState(): PersistedState {
  if (typeof window === "undefined") return defaultState();
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? { ...defaultState(), ...JSON.parse(raw) } : defaultState();
}

function saveState(s: PersistedState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function loadHistory(): HistoryEvent[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(HISTORY_KEY);
  return raw ? JSON.parse(raw) : [];
}

function appendHistory(event: Omit<HistoryEvent, "id" | "timestamp">) {
  const history = loadHistory();
  history.unshift({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...event,
  });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 100)));
}

// ─── Initial log data ─────────────────────────────────────────────────────────

const INITIAL_LOGS: LogEvent[] = [
  { time: "14:32:15", agent: "Sentinel-α", event: "Drift detection: accuracy -2.3%", severity: "warning", trace: "inf-7a3f..." },
  { time: "14:30:00", agent: "Sentinel-β", event: "Pattern mismatch: input outlier", severity: "info", trace: "inf-7a3e..." },
  { time: "14:20:01", agent: "Sentinel-α", event: "Prompt injection attempt blocked", severity: "critical", trace: "inf-7a3b..." },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function GuardianAgentPage() {
  const [killState, setKillState] = useState<KillSwitchState>("disarmed");
  const [showConfirm, setShowConfirm] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [showOverride, setShowOverride] = useState(false);
  const [selectedLog, setSelectedLog] = useState<LogEvent | null>(null);
  const [logs, setLogs] = useState<LogEvent[]>(INITIAL_LOGS);
  const [driftPct, setDriftPct] = useState(2.3);
  const [autoMode, setAutoMode] = useState<"normal" | "drift-alert">("normal");
  const [escalationLevel, setEscalationLevel] = useState<EscalationLevel>("watch");
  const [frictionActive, setFrictionActive] = useState(false);
  const [frictionReason, setFrictionReason] = useState("");
  const [frictionStartTime, setFrictionStartTime] = useState<number | null>(null);
  const [frictionElapsed, setFrictionElapsed] = useState(0);
  // Config
  const [driftThreshold, setDriftThreshold] = useState(5);
  const [frictionGateMinSeconds, setFrictionGateMinSeconds] = useState(3);
  const [systemName, setSystemName] = useState("AI System");
  const [operatorEmail, setOperatorEmail] = useState("");
  // Navigation
  const [activeTab, setActiveTab] = useState<"monitor" | "config" | "history">("monitor");
  // History
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  // Config save feedback
  const [configSaved, setConfigSaved] = useState(false);

  // ── Load from localStorage on mount ────────────────────────────────────────
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

  // ── Persist state on change ─────────────────────────────────────────────────
  useEffect(() => {
    saveState({ killState, escalationLevel, driftThreshold, frictionGateMinSeconds, systemName, operatorEmail });
  }, [killState, escalationLevel, driftThreshold, frictionGateMinSeconds, systemName, operatorEmail]);

  // ── Drift threshold check ───────────────────────────────────────────────────
  useEffect(() => {
    if (driftPct > driftThreshold) {
      setAutoMode("drift-alert");
    } else {
      setAutoMode("normal");
    }
  }, [driftPct, driftThreshold]);

  // ── Friction gate timer ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!frictionActive || frictionStartTime === null) return;
    const interval = setInterval(() => {
      setFrictionElapsed(Math.floor((Date.now() - frictionStartTime) / 1000));
    }, 500);
    return () => clearInterval(interval);
  }, [frictionActive, frictionStartTime]);

  // ── Escalation constraints ──────────────────────────────────────────────────
  const canArm = escalationLevel === "assist" || escalationLevel === "autonomous";
  const canTrigger = escalationLevel === "autonomous";
  const canOverride = escalationLevel === "assist" || escalationLevel === "autonomous";

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function addLog(agent: string, event: string, severity: LogSeverity) {
    const newLog: LogEvent = {
      time: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      agent,
      event,
      severity,
      trace: `inf-${Math.random().toString(16).slice(2, 10)}`,
    };
    setLogs((prev) => [newLog, ...prev]);
  }

  function activateFriction() {
    setFrictionActive(true);
    setFrictionStartTime(Date.now());
    setFrictionElapsed(0);
  }

  function buildTrace(log: LogEvent): string[] {
    const base = [
      `Agente: ${log.agent}`,
      `Trace ID: ${log.trace}`,
      `Timestamp: ${log.time}`,
      `Severity: ${log.severity.toUpperCase()}`,
    ];
    if (log.severity === "critical") {
      return [
        ...base,
        `Evento: ${log.event}`,
        "→ Policy check: soglia critica superata",
        "→ Kill switch protocol: ENGAGED",
        `→ Operatore notificato: ${operatorEmail || "non configurato"}`,
        "→ Evidence Layer: record scritto ✓",
      ];
    }
    if (log.severity === "warning") {
      return [
        ...base,
        `Evento: ${log.event}`,
        "→ Policy check: soglia warning superata",
        `→ Drift threshold: ${driftThreshold}%`,
        "→ Escalation: monitoraggio aumentato",
        "→ Azione richiesta: revisione umana raccomandata",
      ];
    }
    return [
      ...base,
      `Evento: ${log.event}`,
      "→ Policy check: OK",
      "→ Nessuna azione richiesta",
      "→ Log registrato: Evidence Layer (prossimo batch)",
    ];
  }

  const severityDot = (s: LogSeverity) => {
    const colors: Record<LogSeverity, string> = { info: "bg-primary", warning: "bg-warning", critical: "bg-danger" };
    return <span className={`h-2 w-2 rounded-full shrink-0 ${colors[s]}`} />;
  };

  // ── Actions ─────────────────────────────────────────────────────────────────

  function armKillSwitch() {
    setKillState("armed");
    addLog("Operative-γ", "Kill switch armed — awaiting human confirmation", "critical");
  }

  async function confirmKill() {
    setKillState("triggered");
    setShowConfirm(false);
    addLog("Operative-γ", "⚠ KILL SWITCH TRIGGERED by user — system halted", "critical");
    addLog("Sentinel-α", "System output stopped. All inference pipelines frozen.", "critical");
    appendHistory({
      type: "kill_switch",
      description: `Kill switch attivato per ${systemName}`,
      metadata: { drift: `${driftPct}%`, escalation: escalationLevel },
    });
    setHistory(loadHistory());
    await appendEvidence(
      "incident",
      {
        descrizione: `Kill switch attivato — ${systemName} arrestato`,
        data_incidente: new Date().toLocaleString("it-IT"),
        gravità: "Critico — notifica obbligatoria",
        componenti_coinvolti: systemName,
        azioni_intraprese: "Sistema arrestato tramite Guardian-Agent kill switch",
        notificato_autorità: "In valutazione",
        stato: "Aperto",
      },
      `guardian-agent${operatorEmail ? ` / ${operatorEmail}` : ""}`
    );
  }

  async function executeOverride() {
    if (!overrideReason.trim()) return;
    setKillState("overridden");
    setShowOverride(false);
    addLog("Operative-γ", `Override → HITL. Motivo: ${overrideReason}`, "info");
    addLog("Sentinel-α", "Human-in-the-loop activated. Operator assigned.", "info");
    appendHistory({
      type: "override",
      description: `Override eseguito. Motivo: ${overrideReason.slice(0, 100)}`,
      metadata: { operator: operatorEmail || "non specificato" },
    });
    setHistory(loadHistory());
    await appendEvidence(
      "decision",
      {
        titolo: `Override HITL — ${systemName}`,
        decisione_presa: "Controllo delegato a operatore umano",
        motivazione_algoritmica: overrideReason,
        revisione_umana: "Sì, approvata",
        stakeholder: operatorEmail || "Team Operations",
      },
      `guardian-agent${operatorEmail ? ` / ${operatorEmail}` : ""}`
    );
    setOverrideReason("");
  }

  function resetSystem() {
    appendHistory({ type: "reset", description: `Sistema ripristinato da stato: ${killState}` });
    setKillState("disarmed");
    setHistory(loadHistory());
    addLog("Sentinel-β", "System reset complete. All agents reinitialized.", "info");
  }

  function simulateDrift() {
    const newDrift = +(Math.random() * 10).toFixed(1);
    setDriftPct(newDrift);
    addLog(
      "Sentinel-α",
      `Drift detection: accuracy ${newDrift > 0 ? "-" : "+"}${Math.abs(newDrift)}%`,
      newDrift > driftThreshold ? "critical" : "warning"
    );
    appendHistory({
      type: "drift_alert",
      description: `Drift rilevato: ${newDrift}% ${newDrift > driftThreshold ? "(soglia superata)" : ""}`,
      metadata: { threshold: `${driftThreshold}%` },
    });
    setHistory(loadHistory());
    if (newDrift > driftThreshold) {
      addLog("Operative-γ", "⚠ CRITICAL DRIFT — Auto-arming kill switch per policy", "critical");
      setKillState("armed");
    }
  }

  function handleSaveConfig() {
    saveState({ killState, escalationLevel, driftThreshold, frictionGateMinSeconds, systemName, operatorEmail });
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 2000);
  }

  function clearHistory() {
    if (!confirm("Cancellare tutto lo storico eventi?")) return;
    localStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Guardian-Agent
            {systemName && (
              <span className="text-muted-foreground font-normal"> — {systemName}</span>
            )}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Control Plane di sorveglianza runtime. Governance attiva: kill switch,
            override HITL, explainability trace.
          </p>
          <div className="flex gap-2 mt-2">
            {["Art. 14", "Art. 9", "Art. 15"].map((art) => (
              <span key={art} className="text-[10px] bg-muted rounded-full px-2 py-0.5 text-muted-foreground">
                {art}
              </span>
            ))}
          </div>
        </div>
        <div className={`rounded-lg px-4 py-2 text-xs font-medium flex items-center gap-2 ${
          autoMode === "drift-alert"
            ? "bg-danger/10 text-danger border border-danger/30 animate-pulse"
            : "bg-success/10 text-success border border-success/30"
        }`}>
          <Radio className="h-3 w-3" />
          {autoMode === "drift-alert" ? "DRIFT CRITICO — Modalità mitigazione attiva" : "Operativo — nessuna anomalia"}
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-5 mb-6" style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
        {[
          { id: "monitor" as const, label: "Monitor", Icon: Radio },
          { id: "config" as const, label: "Configurazione", Icon: Settings },
          { id: "history" as const, label: "Storico", Icon: History },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="flex items-center gap-1.5 pb-3 text-[13px] font-medium transition-all border-b-2"
            style={
              activeTab === id
                ? { borderColor: "#0D1016", color: "#0D1016" }
                : { borderColor: "transparent", color: "rgba(0,0,0,0.42)" }
            }
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {id === "history" && history.length > 0 && (
              <span
                className="ml-0.5 text-[10px] font-semibold rounded-full px-1.5 py-0.5"
                style={{ background: "rgba(0,0,0,0.07)", color: "rgba(0,0,0,0.45)" }}
              >
                {history.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB: Monitor ──────────────────────────────────────────────────────── */}
      {activeTab === "monitor" && (
        <>
          {/* Drift alert banner */}
          {autoMode === "drift-alert" && (
            <div className="rounded-xl border border-danger/30 bg-danger/5 p-5 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-danger mt-0.5 shrink-0 animate-pulse" />
                <div>
                  <h3 className="text-base font-bold text-danger">Allarme deriva critica</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Drift accuratezza al {driftPct}% — superata soglia del {driftThreshold}%. Il sistema si è
                    auto-configurato in modalità mitigazione. Kill switch armato.
                    {killState !== "triggered" && " Azione richiesta: conferma o override."}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setShowConfirm(true)}
                      className="rounded-lg bg-danger px-4 py-2 text-xs font-medium text-white hover:bg-danger/90 flex items-center gap-1.5"
                    >
                      <StopCircle className="h-3.5 w-3.5" /> Arresta sistema
                    </button>
                    <button
                      onClick={() => setShowOverride(true)}
                      className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-muted flex items-center gap-1.5"
                    >
                      <UserCheck className="h-3.5 w-3.5" /> Delegare a operatore umano
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stats cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="rounded-xl border border-border bg-card p-4">
              <Cpu className="h-4 w-4 text-muted-foreground mb-2" />
              <div className={`text-lg font-bold ${killState === "triggered" ? "text-danger" : "text-success"}`}>
                {killState === "triggered" ? "HALTED" : "Active"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">System state</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <StopCircle className="h-4 w-4 text-muted-foreground mb-2" />
              <div className={`text-lg font-bold ${
                killState === "triggered" ? "text-danger" :
                killState === "armed" ? "text-warning" :
                killState === "overridden" ? "text-primary" : "text-muted-foreground"
              }`}>
                {killState === "disarmed" ? "Disarmato" :
                 killState === "armed" ? "Armato" :
                 killState === "triggered" ? "ATTIVATO" : "Overridden"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Kill switch</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <UserCheck className="h-4 w-4 text-muted-foreground mb-2" />
              <div className="text-lg font-bold text-primary">
                {killState === "overridden" ? "Attivo" : "In attesa"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Human-in-the-loop</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <AlertTriangle className="h-4 w-4 text-muted-foreground mb-2" />
              <div className={`text-lg font-bold ${driftPct > driftThreshold ? "text-danger" : "text-success"}`}>
                {driftPct}%
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Drift accuratezza</div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">Soglia: {driftThreshold}%</div>
            </div>
          </div>

          {/* Control panel */}
          <div className="grid lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2 space-y-4">
              {/* Escalation Protocol */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-sm font-semibold text-foreground mb-4">
                  Protocollo di Escalation — 3 livelli
                </h2>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {(["watch", "assist", "autonomous"] as const).map((level) => {
                    const isActive = escalationLevel === level;
                    const labels = {
                      watch: "Watch (Osservazione)",
                      assist: "Assist (Suggerimento)",
                      autonomous: "Autonomous (Intervento)",
                    };
                    return (
                      <button
                        key={level}
                        onClick={() => setEscalationLevel(level)}
                        className={`rounded-lg border px-3 py-3 text-xs font-medium transition-colors text-left ${
                          isActive ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        <div className={`h-1.5 w-full rounded-full mb-2 ${isActive ? "bg-primary" : "bg-muted"}`} />
                        {labels[level]}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {level === "watch"
                            ? "Solo monitoraggio passivo"
                            : level === "assist"
                            ? "Suggerimenti con HITL"
                            : "Kill switch e override"}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Friction Gate */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-sm font-semibold text-foreground mb-4">
                  Friction Gate — Anti Automation Bias
                  <span className="ml-2 text-[10px] font-normal text-muted-foreground bg-muted rounded-full px-2 py-0.5">Art. 14(4)</span>
                </h2>
                <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-warning mt-0.5 shrink-0" />
                    <div className="w-full">
                      <p className="text-xs font-medium text-foreground mb-1">
                        Rilevato: approvazione rapida di output rischioso
                      </p>
                      <p className="text-[10px] text-muted-foreground mb-3">
                        Soglia minima impostata: {frictionGateMinSeconds}s (configurabile nel tab Configurazione).
                        L&apos;automation bias può portare a trascurare errori critici.
                      </p>
                      {!frictionActive ? (
                        <button
                          onClick={activateFriction}
                          className="rounded-lg border border-warning/30 px-3 py-1.5 text-[10px] font-medium text-warning hover:bg-warning/10"
                        >
                          Simula approvazione rapida
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-[10px] text-danger font-medium">⛔ Friction Gate attivato — motivazione obbligatoria</p>
                          <textarea
                            value={frictionReason}
                            onChange={(e) => setFrictionReason(e.target.value)}
                            placeholder="Spiega perché questo output è accettabile nonostante il rischio..."
                            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-[10px] text-foreground placeholder:text-muted-foreground"
                            rows={2}
                          />
                          <p className={`text-[10px] font-medium ${frictionElapsed >= frictionGateMinSeconds ? "text-success" : "text-muted-foreground"}`}>
                            {frictionElapsed < frictionGateMinSeconds
                              ? `⏱ Attendi ancora ${frictionGateMinSeconds - frictionElapsed}s prima di confermare`
                              : "✓ Tempo minimo di riflessione completato"}
                          </p>
                          <div className="flex gap-2">
                            <button
                              disabled={!frictionReason.trim() || frictionElapsed < frictionGateMinSeconds}
                              onClick={() => {
                                addLog("Operative-γ", `Friction Gate superato dopo ${frictionElapsed}s: ${frictionReason.slice(0, 40)}...`, "info");
                                appendHistory({
                                  type: "friction_gate",
                                  description: `Friction Gate superato (${frictionElapsed}s). Motivo: ${frictionReason.slice(0, 80)}`,
                                });
                                setHistory(loadHistory());
                                setFrictionActive(false);
                                setFrictionReason("");
                                setFrictionStartTime(null);
                                setFrictionElapsed(0);
                              }}
                              className="rounded-lg bg-primary px-3 py-1.5 text-[10px] font-medium text-primary-foreground disabled:opacity-50"
                            >
                              Conferma con motivazione
                            </button>
                            <button
                              onClick={() => setShowConfirm(true)}
                              className="rounded-lg border border-danger/30 px-3 py-1.5 text-[10px] font-medium text-danger hover:bg-danger/10"
                            >
                              Blocca output (Kill Switch)
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Governance Panel — with escalation constraints */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-sm font-semibold text-foreground mb-4">
                  Pannello di Governance — Art. 14
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {/* Arm kill switch */}
                  <div>
                    <button
                      onClick={armKillSwitch}
                      disabled={killState === "triggered" || !canArm}
                      className="w-full rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-30 transition-colors text-left"
                    >
                      <StopCircle className="h-4 w-4 mb-1" />
                      Arma Kill Switch
                      <p className="text-[10px] text-muted-foreground mt-0.5">Prepara arresto d&apos;emergenza</p>
                    </button>
                    {!canArm && (
                      <p className="text-[9px] text-muted-foreground mt-0.5 px-1">
                        Richiede escalation: Assist o Autonomous
                      </p>
                    )}
                  </div>

                  {/* Trigger kill switch */}
                  <div>
                    <button
                      onClick={() => setShowConfirm(true)}
                      disabled={killState !== "armed" || !canTrigger}
                      className="w-full rounded-lg bg-danger px-4 py-3 text-xs font-medium text-white hover:bg-danger/90 disabled:opacity-30 transition-colors text-left"
                    >
                      <StopCircle className="h-4 w-4 mb-1" />
                      ATTIVA KILL SWITCH
                      <p className="text-[10px] text-white/70 mt-0.5">Arresto immediato del sistema</p>
                    </button>
                    {!canTrigger && (
                      <p className="text-[9px] text-muted-foreground mt-0.5 px-1">
                        Richiede escalation: Autonomous
                      </p>
                    )}
                  </div>

                  {/* Override */}
                  <div>
                    <button
                      onClick={() => setShowOverride(true)}
                      disabled={killState === "triggered" || !canOverride}
                      className="w-full rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-30 transition-colors text-left"
                    >
                      <UserCheck className="h-4 w-4 mb-1" />
                      Override → Operatore Umano
                      <p className="text-[10px] text-muted-foreground mt-0.5">Reindirizza a HITL</p>
                    </button>
                    {!canOverride && (
                      <p className="text-[9px] text-muted-foreground mt-0.5 px-1">
                        Richiede escalation: Assist o Autonomous
                      </p>
                    )}
                  </div>

                  {/* Reset */}
                  <div>
                    <button
                      onClick={resetSystem}
                      disabled={killState === "disarmed"}
                      className="w-full rounded-lg border border-border px-4 py-3 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors text-left"
                    >
                      <RefreshCw className="h-4 w-4 mb-1" />
                      Reset Sistema
                      <p className="text-[10px] text-muted-foreground mt-0.5">Ripristino agenti</p>
                    </button>
                  </div>
                </div>
              </div>

              {/* Agent log */}
              <div className="rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                  <h2 className="text-sm font-semibold text-foreground">Agent Log — Real Time</h2>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={simulateDrift}
                      className="rounded-lg border border-border px-2.5 py-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      Simula drift
                    </button>
                    <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                    <span className="text-[10px] text-muted-foreground">Live</span>
                  </div>
                </div>
                <div className="divide-y divide-border/50 max-h-64 overflow-y-auto">
                  {logs.map((log, i) => (
                    <div
                      key={i}
                      className={`px-5 py-3 hover:bg-muted/30 cursor-pointer transition-colors ${selectedLog?.trace === log.trace ? "bg-muted/40" : ""}`}
                      onClick={() => setSelectedLog(log)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {severityDot(log.severity)}
                          <span className="text-xs text-muted-foreground font-mono">{log.agent}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">{log.time}</span>
                      </div>
                      <p className={`mt-1 text-xs ml-4 ${
                        log.severity === "critical" ? "text-danger font-medium" : "text-foreground"
                      }`}>{log.event}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right panel */}
            <div className="lg:col-span-1 space-y-4">
              {/* Trace view */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-foreground">Explainability Trace</h2>
                  {selectedLog && (
                    <span className="text-[10px] font-mono text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                      {selectedLog.trace}
                    </span>
                  )}
                </div>
                {selectedLog ? (
                  <div className="space-y-1.5">
                    {buildTrace(selectedLog).map((step, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <ChevronRight className="h-3 w-3 mt-0.5 shrink-0 text-primary/60" />
                        <span className={step.startsWith("→") ? "text-foreground" : ""}>{step}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Art. 86 — Diritto alla spiegazione. Clicca un evento nel log per vedere la catena di inferenza.
                  </p>
                )}
              </div>

              {/* Kill switch status */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-sm font-semibold text-foreground mb-3">Stato Kill Switch</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Stato</span>
                    <span className={`text-xs font-mono font-medium ${
                      killState === "triggered" ? "text-danger" :
                      killState === "armed" ? "text-warning" :
                      killState === "overridden" ? "text-primary" : "text-muted-foreground"
                    }`}>{killState.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">HITL</span>
                    <span className={`text-xs font-mono ${killState === "overridden" ? "text-success" : "text-muted-foreground"}`}>
                      {killState === "overridden" ? "Active" : "Standby"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Ultimo override</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {killState === "overridden" ? new Date().toLocaleTimeString() : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Escalation</span>
                    <span className="text-xs font-mono text-primary capitalize">{escalationLevel}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-danger/30 bg-danger/5 p-4 text-xs text-muted-foreground">
                <AlertTriangle className="h-4 w-4 text-danger inline mr-1" />
                <strong className="text-foreground">Art. 14(4) — </strong>
                Il supervisore umano può ignorare, annullare o ribaltare l&apos;output in qualsiasi momento.
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── TAB: Configurazione ───────────────────────────────────────────────── */}
      {activeTab === "config" && (
        <div className="max-w-2xl space-y-5">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold text-foreground mb-5">Impostazioni Guardian-Agent</h2>

            <div className="space-y-4">
              {/* System name */}
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Nome sistema monitorato
                </label>
                <input
                  type="text"
                  value={systemName}
                  onChange={(e) => setSystemName(e.target.value)}
                  placeholder="Es. CV-Screener, MedDiag Pro"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Operator email */}
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Email operatore per notifiche override
                </label>
                <input
                  type="email"
                  value={operatorEmail}
                  onChange={(e) => setOperatorEmail(e.target.value)}
                  placeholder="operatore@azienda.it"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Drift threshold */}
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Soglia drift critica (%)
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={driftThreshold}
                  onChange={(e) => setDriftThreshold(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Sopra questa soglia il kill switch viene armato automaticamente
                </p>
              </div>

              {/* Friction gate timer */}
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Tempo minimo friction gate (secondi)
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={frictionGateMinSeconds}
                  onChange={(e) => setFrictionGateMinSeconds(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Secondi minimi di riflessione prima di confermare azioni rischiose
                </p>
              </div>

              {/* Escalation default */}
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-2">
                  Livello escalation predefinito
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(["watch", "assist", "autonomous"] as const).map((level) => {
                    const isActive = escalationLevel === level;
                    const labels = {
                      watch: "Watch",
                      assist: "Assist",
                      autonomous: "Autonomous",
                    };
                    const descs = {
                      watch: "Solo monitoraggio passivo",
                      assist: "Suggerimenti con HITL",
                      autonomous: "Kill switch e override",
                    };
                    return (
                      <button
                        key={level}
                        onClick={() => setEscalationLevel(level)}
                        className={`rounded-lg border px-3 py-3 text-xs font-medium transition-colors text-left ${
                          isActive ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        <div className={`h-1.5 w-full rounded-full mb-2 ${isActive ? "bg-primary" : "bg-muted"}`} />
                        {labels[level]}
                        <p className="text-[10px] text-muted-foreground mt-1">{descs[level]}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Save button */}
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={handleSaveConfig}
                className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Salva configurazione
              </button>
              {configSaved && (
                <span className="text-sm text-success font-medium flex items-center gap-1">
                  ✓ Configurazione salvata
                </span>
              )}
            </div>
          </div>

          {/* Art. 14 banner */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 text-[11px] text-muted-foreground">
            <BarChart2 className="h-4 w-4 text-muted-foreground inline mr-1.5 mb-0.5" />
            <strong className="text-foreground">Art. 14(4) — </strong>
            Le soglie configurate qui determinano il comportamento automatico del Guardian-Agent in produzione.
            Ogni modifica viene registrata nell&apos;Evidence Layer.
          </div>
        </div>
      )}

      {/* ── TAB: Storico ──────────────────────────────────────────────────────── */}
      {activeTab === "history" && (
        <div className="space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Kill switch attivati", count: history.filter((h) => h.type === "kill_switch").length, color: "text-danger" },
              { label: "Override eseguiti", count: history.filter((h) => h.type === "override").length, color: "text-primary" },
              { label: "Alert drift", count: history.filter((h) => h.type === "drift_alert").length, color: "text-warning" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.count}</div>
                <div className="mt-1 text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Event list */}
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Eventi registrati</h2>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-xs text-danger hover:opacity-70 transition-opacity"
                >
                  Cancella storico
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <History className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground font-medium mb-1">Nessun evento registrato</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Le azioni critiche (kill switch, override, drift alert) appariranno qui e
                  verranno archiviate sull&apos;Evidence Layer.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {history.map((event) => {
                  const iconMap: Record<HistoryEvent["type"], { Icon: React.FC<React.SVGProps<SVGSVGElement>>; color: string }> = {
                    kill_switch: { Icon: StopCircle, color: "text-danger" },
                    override: { Icon: UserCheck, color: "text-primary" },
                    drift_alert: { Icon: AlertTriangle, color: "text-warning" },
                    reset: { Icon: RefreshCw, color: "text-muted-foreground" },
                    friction_gate: { Icon: Shield, color: "text-yellow-500" },
                  };
                  const { Icon, color } = iconMap[event.type];
                  return (
                    <div key={event.id} className="px-5 py-3 hover:bg-muted/20 transition-colors">
                      <div className="flex items-start gap-3">
                        <Icon className={`h-4 w-4 ${color} mt-0.5 shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground">{event.description}</p>
                          {event.metadata && Object.keys(event.metadata).length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-1">
                              {Object.entries(event.metadata).map(([k, v]) => (
                                <span key={k} className="text-[10px] text-muted-foreground font-mono">
                                  {k}: {v}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span
                            className="text-[10px] font-medium rounded-full px-2 py-0.5"
                            style={{
                              background: event.type === "kill_switch" ? "rgba(220,38,38,0.1)" :
                                          event.type === "override" ? "rgba(59,130,246,0.1)" :
                                          event.type === "drift_alert" ? "rgba(245,158,11,0.1)" :
                                          event.type === "friction_gate" ? "rgba(234,179,8,0.1)" :
                                          "rgba(0,0,0,0.06)",
                              color: event.type === "kill_switch" ? "#b91c1c" :
                                     event.type === "override" ? "#1d4ed8" :
                                     event.type === "drift_alert" ? "#92400e" :
                                     event.type === "friction_gate" ? "#854d0e" :
                                     "rgba(0,0,0,0.45)",
                            }}
                          >
                            {event.type.replace("_", " ")}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {new Date(event.timestamp).toLocaleString("it-IT", {
                              day: "2-digit", month: "2-digit",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Confirm kill switch modal ─────────────────────────────────────────── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl border border-danger/30 bg-card p-6">
            <AlertTriangle className="h-10 w-10 text-danger mx-auto mb-4" />
            <h3 className="text-lg font-bold text-foreground text-center mb-2">Conferma arresto d&apos;emergenza</h3>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Stai per attivare il Kill Switch. Il sistema AI verrà arrestato immediatamente.
              Questa azione viene registrata nell&apos;Evidence Layer con hash crittografico.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={confirmKill}
                className="flex-1 rounded-lg bg-danger px-4 py-2.5 text-sm font-medium text-white hover:bg-danger/90 transition-colors"
              >
                <StopCircle className="h-4 w-4 inline mr-1" />
                CONFERMA ARRESTO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Override modal ────────────────────────────────────────────────────── */}
      {showOverride && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl border border-primary/30 bg-card p-6">
            <UserCheck className="h-10 w-10 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-bold text-foreground text-center mb-2">Delega a operatore umano</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Il controllo passa a un supervisore umano (Human-in-the-loop).
              Specifica il motivo dell&apos;override.
            </p>
            <textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              className="w-full rounded-lg border border-border bg-muted px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
              placeholder="Motivo dell'override (es. falso positivo critico, bias rilevato...)"
              rows={3}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowOverride(false)}
                className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={executeOverride}
                disabled={!overrideReason.trim()}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <UserCheck className="h-4 w-4 inline mr-1" />
                Conferma override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
