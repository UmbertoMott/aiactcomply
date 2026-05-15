"use client";

import { useState } from "react";
import { Shield, Zap, AlertTriangle, Play, RefreshCw, CheckCircle } from "lucide-react";
import Link from "next/link";
import { simulateRedTeamAttack, getDefenseHealth, type RedTeamAttack } from "@/lib/simulation/red-team";
import { writeToStorage, readFromStorage } from "@/lib/dossier/storage-schema";
import type { ResilienceResult } from "@/lib/dossier/storage-schema";

export default function ResiliencePage() {
  const [attacks, setAttacks] = useState<RedTeamAttack[]>([]);
  const [running, setRunning] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(() =>
    readFromStorage<ResilienceResult>("resilience")?.completedAt ?? null
  );

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

  function saveToDossier() {
    const completedAt = new Date().toISOString();
    writeToStorage<ResilienceResult>("resilience", {
      accuracyMetric: health.defenseRate,
      robustnessTested: attacks.length > 0,
      cybersecurityMeasures: ["Rilevamento adversarial inputs", "Rate limiting", "Output sanitization", "Audit log immutabile"],
      fallbackProcedure: "In caso di breach: disabilitazione automatica e notifica al compliance officer",
      lastTestedAt: attacks.length > 0 ? new Date().toISOString() : "",
      completedAt,
    });
    setSavedAt(completedAt);
  }

  return (
    <div className="max-w-5xl">
      {savedAt ? (
        <div className="flex items-center gap-2 rounded-lg px-4 py-2.5 mb-5 text-[12px]"
          style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", fontFamily: "var(--font-inter, system-ui)" }}>
          <CheckCircle size={13} strokeWidth={1.5} style={{ color: "#15803d" }} />
          <span style={{ color: "#15803d" }}>✓ Risultati salvati nel dossier · Aggiornato il {new Date(savedAt).toLocaleDateString("it-IT")}</span>
          <Link href="/dashboard/dossier" className="ml-auto text-[11px] font-medium hover:opacity-70 transition-opacity" style={{ color: "#15803d" }}>Vedi dossier →</Link>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg px-4 py-2.5 mb-5 text-[12px]"
          style={{ background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.12)", fontFamily: "var(--font-inter, system-ui)" }}>
          <span style={{ color: "rgba(0,0,0,0.45)" }}>Salva i risultati Red Teaming nel dossier di compliance</span>
          <button onClick={saveToDossier} className="text-[11px] font-medium rounded-full px-3 py-1 hover:opacity-80"
            style={{ background: "#3b82f6", color: "#ffffff", border: "none", cursor: "pointer" }}>
            Salva nel dossier
          </button>
        </div>
      )}

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
