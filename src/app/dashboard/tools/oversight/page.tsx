"use client";

import { useState, useRef } from "react";
import { CheckCircle, Brain, StopCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { writeToStorage, readFromStorage } from "@/lib/dossier/storage-schema";
import type { OversightResult } from "@/lib/dossier/storage-schema";

export default function OversightPage() {
  const [approved, setApproved] = useState(false);
  const [frictionActive, setFrictionActive] = useState(false);
  const [frictionReason, setFrictionReason] = useState("");
  const [approvalTime, setApprovalTime] = useState<number | null>(null);
  const startTime = useRef<number>(0);
  const [savedAt, setSavedAt] = useState<string | null>(() =>
    readFromStorage<OversightResult>("oversight")?.completedAt ?? null
  );

  function saveToDossier() {
    const completedAt = new Date().toISOString();
    writeToStorage<OversightResult>("oversight", {
      oversightMechanism: "Safety Friction Gate — Anti Automation Bias (Art. 14)",
      humanInterventionPoints: ["Approvazione output AI con confidenza > 80%", "Override manuale obbligatorio per output critici"],
      stopCapability: true,
      responsiblePersons: ["Responsabile HR", "AI Compliance Officer"],
      completedAt,
    });
    setSavedAt(completedAt);
  }

  function handleApprove() {
    startTime.current = Date.now();
    const elapsed = (Date.now() - startTime.current) / 1000;
    setApprovalTime(elapsed);

    if (elapsed < 1.5) {
      // Too fast! Trigger Friction Gate
      setFrictionActive(true);
      return;
    }
    setApproved(true);
  }

  function confirmWithReason() {
    if (!frictionReason.trim()) return;
    setApproved(true);
    setFrictionActive(false);
  }

  return (
    <div className="max-w-4xl">
      {savedAt ? (
        <div className="flex items-center gap-2 rounded-lg px-4 py-2.5 mb-5 text-[12px]"
          style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", fontFamily: "var(--font-inter, system-ui)" }}>
          <span style={{ color: "#15803d" }}>✓ Risultati salvati nel dossier · Aggiornato il {new Date(savedAt).toLocaleDateString("it-IT")}</span>
          <Link href="/dashboard/dossier" className="ml-auto text-[11px] font-medium hover:opacity-70 transition-opacity" style={{ color: "#15803d" }}>Vedi dossier →</Link>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg px-4 py-2.5 mb-5 text-[12px]"
          style={{ background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.12)", fontFamily: "var(--font-inter, system-ui)" }}>
          <span style={{ color: "rgba(0,0,0,0.45)" }}>Salva la configurazione Oversight nel dossier di compliance</span>
          <button onClick={saveToDossier} className="text-[11px] font-medium rounded-full px-3 py-1 hover:opacity-80"
            style={{ background: "#3b82f6", color: "#ffffff", border: "none", cursor: "pointer" }}>
            Salva nel dossier
          </button>
        </div>
      )}
      <h1 className="text-2xl font-bold text-foreground mb-2">Safety Friction Gate (Art. 14)</h1>
      <p className="text-sm text-muted-foreground mb-8">Se il supervisore approva un&apos;azione rischiosa in &lt; 2s, il sistema blocca il tasto Confirm e richiede motivazione testuale obbligatoria (Anti Automation Bias).</p>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">Scenario: Output rischioso rilevato</h2>
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 mb-4">
            <AlertTriangle className="h-4 w-4 text-warning inline mr-1 mb-2" />
            <p className="text-xs text-foreground font-medium">Screening CV: candidato respinto con confidenza 89%</p>
            <p className="text-[10px] text-muted-foreground mt-1">Il sistema ha rilevato un pattern di bias di genere nel training set. L&apos;output potrebbe violare l&apos;Art. 21 Carta UE.</p>
          </div>

          {!approved && !frictionActive && (
            <button
              onClick={handleApprove}
              className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Approva output
            </button>
          )}

          {frictionActive && (
            <div className="rounded-lg border border-danger/30 bg-danger/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <StopCircle className="h-5 w-5 text-danger" />
                <span className="text-xs font-bold text-danger">⛔ Friction Gate ATTIVATO</span>
              </div>
              <p className="text-[10px] text-muted-foreground mb-3">Approvazione troppo rapida. Motivazione obbligatoria (Art. 14(4)).</p>
              <textarea value={frictionReason} onChange={(e) => setFrictionReason(e.target.value)}
                placeholder="Spiega perché questo output è accettabile nonostante il bias rilevato..."
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground mb-3" rows={3} />
              <div className="flex gap-2">
                <button onClick={confirmWithReason} disabled={!frictionReason.trim()}
                  className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50">
                  Conferma con motivazione
                </button>
                <button className="rounded-lg border border-danger/30 px-3 py-2 text-xs font-medium text-danger hover:bg-danger/10">
                  Blocca output
                </button>
              </div>
            </div>
          )}

          {approved && !frictionActive && (
            <div className="rounded-lg border border-success/30 bg-success/5 p-3 text-xs text-success flex items-center gap-2">
              <CheckCircle className="h-4 w-4" /> Output approvato e registrato nell&apos;Evidence Layer.
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">Log Eventi Friction Gate</h2>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 py-1 border-b border-border/50">
              <span className="h-2 w-2 rounded-full bg-success" />
              <span>Ultima approvazione: {approved ? "ok" : "—"}</span>
            </div>
            <div className="flex items-center gap-2 py-1 border-b border-border/50">
              <span className="h-2 w-2 rounded-full bg-warning" />
              <span>Friction Gate: {frictionActive ? "Attivato" : "Inattivo"}</span>
            </div>
            <div className="flex items-center gap-2 py-1">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span>Automation Bias: Contrastato con motivazione obbligatoria</span>
            </div>
          </div>
          <div className="mt-4 rounded-lg bg-muted p-3 text-[10px] text-muted-foreground">
            <Brain className="h-3 w-3 inline mr-1 text-primary" />
            Art. 14(4): Il supervisore umano deve poter ignorare, annullare o ribaltare l&apos;output.
            Se l&apos;approvazione avviene in &lt; 2s, il sistema presume Automation Bias.
          </div>
        </div>
      </div>
    </div>
  );
}
