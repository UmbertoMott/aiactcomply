"use client";

import { useState } from "react";
import { Shield, Zap, AlertTriangle, Play, RefreshCw, CheckCircle } from "lucide-react";
import { simulateRedTeamAttack, getDefenseHealth, type RedTeamAttack } from "@/lib/simulation/red-team";

export default function ResiliencePage() {
  const [attacks, setAttacks] = useState<RedTeamAttack[]>([]);
  const [running, setRunning] = useState(false);

  function runBatch() {
    setRunning(true);
    const batch = Array.from({ length: 5 }, () => simulateRedTeamAttack());
    setTimeout(() => {
      setAttacks((prev) => [...batch, ...prev]);
      setRunning(false);
    }, 1000);
  }

  const health = getDefenseHealth(attacks);
  const lastBreach = attacks.find((a) => a.result === "breach");

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold text-foreground mb-2">Continuous Red Teaming (Art. 15)</h1>
      <p className="text-sm text-muted-foreground mb-8">Bombardamento periodico del modello con attacchi simulati. Salute difensiva in tempo reale.</p>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Attacchi totali", value: health.total, color: "text-foreground" },
          { label: "Bloccati", value: health.blocked, color: "text-success" },
          { label: "Breach", value: health.breaches, color: health.breaches > 0 ? "text-danger" : "text-success" },
          { label: "Difesa", value: `${health.defenseRate}%`, color: health.defenseRate > 80 ? "text-success" : health.defenseRate > 60 ? "text-warning" : "text-danger" },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-4">
            <Shield className="h-4 w-4 text-muted-foreground mb-2" />
            <div className={`text-xl font-bold ${c.color}`}>{c.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{c.label}</div>
          </div>
        ))}
      </div>

      {lastBreach && (
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-danger mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-danger">Breach rilevato: {lastBreach.type}</p>
            <p className="text-xs text-muted-foreground mt-1">{lastBreach.details}</p>
            <p className="text-[10px] text-muted-foreground font-mono mt-1">{lastBreach.id} · {lastBreach.timestamp.slice(11, 19)}</p>
          </div>
        </div>
      )}

      <button onClick={runBatch} disabled={running} className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5 mb-6">
        {running ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
        {running ? "Simulazione in corso..." : "Esegui 5 attacchi simulati"}
      </button>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Log Attacchi</h2>
        </div>
        <div className="divide-y divide-border/50 max-h-80 overflow-y-auto">
          {attacks.map((a) => (
            <div key={a.id} className="px-5 py-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-mono text-foreground">{a.type}</span>
                  <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${
                    a.result === "breach" ? "bg-danger/10 text-danger" : a.result === "detected" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
                  }`}>{a.result}</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">{a.timestamp.slice(11, 19)}</span>
              </div>
              <p className="text-[10px] text-muted-foreground ml-5">{a.target.slice(0, 80)}...</p>
            </div>
          ))}
          {attacks.length === 0 && (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">Nessun attacco simulato. Esegui un batch.</div>
          )}
        </div>
      </div>
    </div>
  );
}
