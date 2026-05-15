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
} from "lucide-react";

type KillSwitchState = "disarmed" | "armed" | "triggered" | "overridden";
type LogSeverity = "info" | "warning" | "critical";

interface LogEvent {
  time: string;
  agent: string;
  event: string;
  severity: LogSeverity;
  trace: string;
}

const INITIAL_LOGS: LogEvent[] = [
  { time: "14:32:15", agent: "Sentinel-α", event: "Drift detection: accuracy -2.3%", severity: "warning", trace: "inf-7a3f..." },
  { time: "14:30:00", agent: "Sentinel-β", event: "Pattern mismatch: input outlier", severity: "info", trace: "inf-7a3e..." },
  { time: "14:20:01", agent: "Sentinel-α", event: "Prompt injection attempt blocked", severity: "critical", trace: "inf-7a3b..." },
];

export default function GuardianAgentPage() {
  type EscalationLevel = "watch" | "assist" | "autonomous";
  const [killState, setKillState] = useState<KillSwitchState>("disarmed");
  const [showConfirm, setShowConfirm] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [showOverride, setShowOverride] = useState(false);
  const [traceId, setTraceId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEvent[]>(INITIAL_LOGS);
  const [driftPct, setDriftPct] = useState(2.3);
  const [autoMode, setAutoMode] = useState<"normal" | "drift-alert">("normal");
  const [escalationLevel, setEscalationLevel] = useState<EscalationLevel>("watch");
  const [frictionActive, setFrictionActive] = useState(false);
  const [approvalTime, setApprovalTime] = useState(0);
  const [frictionReason, setFrictionReason] = useState("");

  useEffect(() => {
    if (driftPct > 5) {
      setAutoMode("drift-alert");
    } else {
      setAutoMode("normal");
    }
  }, [driftPct]);

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

  function armKillSwitch() {
    setKillState("armed");
    addLog("Operative-γ", "Kill switch armed — awaiting human confirmation", "critical");
  }

  function confirmKill() {
    setKillState("triggered");
    setShowConfirm(false);
    addLog("Operative-γ", "⚠ KILL SWITCH TRIGGERED by user — system halted", "critical");
    addLog("Sentinel-α", "System output stopped. All inference pipelines frozen.", "critical");
  }

  function executeOverride() {
    if (!overrideReason.trim()) return;
    setKillState("overridden");
    setShowOverride(false);
    addLog("Operative-γ", `Override executed — redirected to human operator. Reason: ${overrideReason}`, "info");
    addLog("Sentinel-α", "Human-in-the-loop activated. Operator assigned.", "info");
    setOverrideReason("");
  }

  function resetSystem() {
    setKillState("disarmed");
    addLog("Sentinel-β", "System reset complete. All agents reinitialized.", "info");
  }

  function simulateDrift() {
    const newDrift = +(Math.random() * 10).toFixed(1);
    setDriftPct(newDrift);
    addLog("Sentinel-α", `Drift detection: accuracy ${newDrift > 0 ? "-" : "+"}${Math.abs(newDrift)}%`, newDrift > 5 ? "critical" : "warning");
    if (newDrift > 5) {
      addLog("Operative-γ", "⚠ CRITICAL DRIFT — Auto-arming kill switch per policy", "critical");
      setKillState("armed");
    }
  }

  const severityDot = (s: LogSeverity) => {
    const colors = { info: "bg-primary", warning: "bg-warning", critical: "bg-danger" };
    return <span className={`h-2 w-2 rounded-full shrink-0 ${colors[s]}`} />;
  };

  return (
    <div className="max-w-6xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Guardian-Agent</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Control Plane di sorveglianza runtime. Governance attiva: kill switch,
            override HITL, explainability trace.
          </p>
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

      {/* Generative UI: auto-config on drift */}
      {autoMode === "drift-alert" && (
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-5 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-danger mt-0.5 shrink-0 animate-pulse" />
            <div>
              <h3 className="text-base font-bold text-danger">Allarme deriva critica</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Drift accuratezza al {driftPct}% — superata soglia del 5%. Il sistema si è
                auto-configurato in modalità mitigazione. Kill switch armato.
                {killState !== "triggered" && " Azione richiesta: conferma o override."}
              </p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => setShowConfirm(true)} className="rounded-lg bg-danger px-4 py-2 text-xs font-medium text-white hover:bg-danger/90 flex items-center gap-1.5">
                  <StopCircle className="h-3.5 w-3.5" /> Arresta sistema
                </button>
                <button onClick={() => setShowOverride(true)} className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-muted flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5" /> Delegare a operatore umano
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kill switch status cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border border-border bg-card p-4">
          <Cpu className="h-4 w-4 text-muted-foreground mb-2" />
          <div className={`text-lg font-bold ${
            killState === "triggered" ? "text-danger" : "text-success"
          }`}>
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
          <div className={`text-lg font-bold ${driftPct > 5 ? "text-danger" : "text-success"}`}>
            {driftPct}%
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Drift accuratezza</div>
        </div>
      </div>

      {/* Control panel */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Escalation Protocol — 3 livelli */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">
              Protocollo di Escalation — 3 livelli
            </h2>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {(["watch", "assist", "autonomous"] as const).map((level) => {
                const isActive = escalationLevel === level;
                const labels = { watch: "Watch (Osservazione)", assist: "Assist (Suggerimento)", autonomous: "Autonomous (Intervento)" };
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
                      {level === "watch" ? "Solo monitoraggio passivo" : level === "assist" ? "Suggerimenti con HITL" : "Kill switch e override"}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Friction Gate — Anti Automation Bias (Art. 14(4)) */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">
              Friction Gate — Anti Automation Bias
              <span className="ml-2 text-[10px] font-normal text-muted-foreground bg-muted rounded-full px-2 py-0.5">Art. 14(4)</span>
            </h2>
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-foreground mb-1">
                    Rilevato: approvazione rapida di output rischioso
                  </p>
                  <p className="text-[10px] text-muted-foreground mb-3">
                    Tempo di approvazione: 0.8s — Inferiore alla soglia di 3s.
                    L&apos;automation bias può portare a trascurare errori critici.
                  </p>
                  {!frictionActive ? (
                    <button
                      onClick={() => setFrictionActive(true)}
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
                      <div className="flex gap-2">
                        <button
                          disabled={!frictionReason.trim()}
                          onClick={() => {
                            addLog("Operative-γ", `Friction Gate superato: ${frictionReason.slice(0, 40)}...`, "info");
                            setFrictionActive(false);
                            setFrictionReason("");
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

          {/* Active controls */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">
              Pannello di Governance — Art. 14
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={armKillSwitch}
                disabled={killState === "triggered"}
                className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-30 transition-colors text-left"
              >
                <StopCircle className="h-4 w-4 mb-1" />
                Arma Kill Switch
                <p className="text-[10px] text-muted-foreground mt-0.5">Prepara arresto d&apos;emergenza</p>
              </button>
              <button
                onClick={() => setShowConfirm(true)}
                disabled={killState !== "armed"}
                className="rounded-lg bg-danger px-4 py-3 text-xs font-medium text-white hover:bg-danger/90 disabled:opacity-30 transition-colors text-left"
              >
                <StopCircle className="h-4 w-4 mb-1" />
                ATTIVA KILL SWITCH
                <p className="text-[10px] text-white/70 mt-0.5">Arresto immediato del sistema</p>
              </button>
              <button
                onClick={() => setShowOverride(true)}
                disabled={killState === "triggered"}
                className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-30 transition-colors text-left"
              >
                <UserCheck className="h-4 w-4 mb-1" />
                Override → Operatore Umano
                <p className="text-[10px] text-muted-foreground mt-0.5">Reindirizza a HITL</p>
              </button>
              <button
                onClick={resetSystem}
                disabled={killState === "disarmed"}
                className="rounded-lg border border-border px-4 py-3 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors text-left"
              >
                <RefreshCw className="h-4 w-4 mb-1" />
                Reset Sistema
                <p className="text-[10px] text-muted-foreground mt-0.5">Ripristino agenti</p>
              </button>
            </div>
          </div>

          {/* Agent log */}
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Agent Log — Real Time</h2>
              <div className="flex items-center gap-3">
                <button onClick={simulateDrift} className="rounded-lg border border-border px-2.5 py-1.5 text-[10px] text-muted-foreground hover:text-foreground">
                  Simula drift
                </button>
                <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                <span className="text-[10px] text-muted-foreground">Live</span>
              </div>
            </div>
            <div className="divide-y divide-border/50 max-h-64 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className="px-5 py-3 hover:bg-muted/30 cursor-pointer" onClick={() => setTraceId(log.trace)}>
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
          {/* Trace View */}
          {traceId ? (
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3">Explainability Trace</h2>
              <div className="font-mono text-[10px] text-primary">Trace ID: {traceId}</div>
              <div className="mt-3 space-y-2">
                {["Input: user_query_7823", "Layer 3: attention weights", "Layer 7: feature extraction", "Output: classification 0.89", "Override: " + (killState === "overridden" ? "human review active" : "pending")].map((step, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <ChevronRight className="h-3 w-3 mt-0.5 shrink-0" />
                    {step}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3">Explainability Trace</h2>
              <p className="text-xs text-muted-foreground">Art. 86 — Diritto alla spiegazione. Clicca un evento log per vedere la catena di inferenza.</p>
            </div>
          )}

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
            </div>
          </div>

          <div className="rounded-xl border border-danger/30 bg-danger/5 p-4 text-xs text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-danger inline mr-1" />
            <strong className="text-foreground">Art. 14(4) — </strong>
            Il supervisore umano può ignorare, annullare o ribaltare l&apos;output in qualsiasi momento.
          </div>
        </div>
      </div>

      {/* Confirm kill switch modal */}
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
              <button onClick={() => setShowConfirm(false)} className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors">
                Annulla
              </button>
              <button onClick={confirmKill} className="flex-1 rounded-lg bg-danger px-4 py-2.5 text-sm font-medium text-white hover:bg-danger/90 transition-colors">
                <StopCircle className="h-4 w-4 inline mr-1" />
                CONFERMA ARRESTO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Override modal */}
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
              <button onClick={() => setShowOverride(false)} className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors">
                Annulla
              </button>
              <button onClick={executeOverride} disabled={!overrideReason.trim()} className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
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
