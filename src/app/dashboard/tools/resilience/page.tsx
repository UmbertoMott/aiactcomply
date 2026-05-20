"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Zap, AlertTriangle, Play, RefreshCw, CheckCircle, Download } from "lucide-react";
import Link from "next/link";
import { simulateRedTeamAttack, getDefenseHealth, type RedTeamAttack } from "@/lib/simulation/red-team";
import { writeToStorage, readFromStorage } from "@/lib/dossier/storage-schema";
import type { ResilienceResult } from "@/lib/dossier/storage-schema";
import { appendEvidence } from "@/lib/evidence/evidence-layer";

const STORAGE_KEY = "resilience_attacks";

export default function ResiliencePage() {
  const [attacks, setAttacks] = useState<RedTeamAttack[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as RedTeamAttack[]; }
    catch { return []; }
  });
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(() =>
    readFromStorage<ResilienceResult>("resilience")?.completedAt ?? null
  );

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function runBatch() {
    setRunning(true);
    const batch = Array.from({ length: 5 }, () => simulateRedTeamAttack());
    setTimeout(() => {
      setAttacks((prev) => {
        const next = [...batch, ...prev];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
      setRunning(false);

      // Registra breach nell'evidence layer
      const breaches = batch.filter((a) => a.result === "breach");
      if (breaches.length > 0) {
        breaches.forEach((b) => {
          appendEvidence(
            "incident",
            {
              type: "Red Team Breach — Art. 15 Resilienza",
              attackType: b.type,
              target: b.target.slice(0, 100),
              defenseScore: b.defenseScore,
              timestamp: b.timestamp,
              id: b.id,
            },
            "resilience"
          );
        });
        showToast(`⚠ ${breaches.length} breach rilevato/i — registrato nell'Evidence Layer`, "error");
      } else {
        showToast(`Batch completato — ${batch.length} attacchi bloccati`);
      }
    }, 1000);
  }

  function resetAttacks() {
    setAttacks([]);
    localStorage.removeItem(STORAGE_KEY);
    showToast("Log attacchi azzerato");
  }

  const health = getDefenseHealth(attacks);
  const lastBreach = attacks.find((a) => a.result === "breach");

  function saveToDossier() {
    if (attacks.length === 0) {
      showToast("Esegui almeno un batch prima di salvare nel dossier", "error");
      return;
    }
    const completedAt = new Date().toISOString();
    writeToStorage<ResilienceResult>("resilience", {
      accuracyMetric: health.defenseRate,
      robustnessTested: true,
      cybersecurityMeasures: ["Rilevamento adversarial inputs", "Rate limiting", "Output sanitization", "Audit log immutabile"],
      fallbackProcedure: "In caso di breach: disabilitazione automatica e notifica al compliance officer",
      lastTestedAt: completedAt,
      completedAt,
    });
    appendEvidence(
      "adr",
      {
        type: "Red Team Testing — Resilienza Art. 15",
        totalAttacks: health.total,
        blocked: health.blocked,
        breaches: health.breaches,
        defenseRate: `${health.defenseRate}%`,
        attackTypes: [...new Set(attacks.map((a) => a.type))],
        lastBreach: lastBreach ? { type: lastBreach.type, id: lastBreach.id, timestamp: lastBreach.timestamp } : null,
        savedAt: completedAt,
      },
      "resilience"
    );
    setSavedAt(completedAt);
    showToast("Risultati Red Teaming salvati nel dossier");
  }

  function exportReport() {
    const report = {
      export_type: "Resilience Red Team Report — Art. 15 EU AI Act",
      exported_at: new Date().toISOString(),
      regulation: "EU 2024/1689 — Art. 15 (Accuracy, Robustness, Cybersecurity)",
      summary: {
        total_attacks: health.total,
        blocked: health.blocked,
        breaches: health.breaches,
        defense_rate: `${health.defenseRate}%`,
      },
      attack_log: attacks.map((a) => ({
        id: a.id,
        type: a.type,
        timestamp: a.timestamp,
        result: a.result,
        defense_score: a.defenseScore,
        target: a.target,
        details: a.details,
      })),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `red-team-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Report esportato — " + attacks.length + " attacchi");
  }

  return (
    <div className="w-full">
      {savedAt ? (
        <div className="flex items-center gap-2 rounded-lg px-4 py-2.5 mb-5 text-[12px]"
          style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", fontFamily: "var(--font-inter, system-ui)" }}>
          <CheckCircle size={13} strokeWidth={1.5} style={{ color: "#15803d" }} />
          <span style={{ color: "#15803d" }}>✓ Risultati salvati nel dossier · Aggiornato il {new Date(savedAt).toLocaleDateString("it-IT")}</span>
          <Link href="/dashboard/dossier" className="ml-auto text-[11px] font-medium hover:opacity-70 transition-opacity" style={{ color: "#15803d" }}>Vedi dossier →</Link>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg px-4 py-2.5 mb-5 text-[12px]"
          style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", fontFamily: "var(--font-inter, system-ui)" }}>
          <span style={{ color: "rgba(0,0,0,0.45)" }}>Salva i risultati Red Teaming nel dossier di compliance</span>
          <button onClick={saveToDossier} className="text-[11px] font-medium rounded-full px-3 py-1 hover:opacity-80"
            style={{ background: "#0D1016", color: "#ffffff", border: "none", cursor: "pointer" }}>
            Salva nel dossier
          </button>
        </div>
      )}

      <h1 className="text-2xl font-bold text-foreground mb-2">Continuous Red Teaming (Art. 15)</h1>
      <p className="text-sm text-muted-foreground mb-8">Bombardamento periodico del modello con attacchi simulati. Salute difensiva in tempo reale.</p>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Attacchi totali", value: health.total,          textColor: "#0D1016" },
          { label: "Bloccati",        value: health.blocked,        textColor: "#16a34a" },
          { label: "Breach",          value: health.breaches,       textColor: health.breaches > 0 ? "#dc2626" : "#16a34a" },
          { label: "Difesa",          value: `${health.defenseRate}%`, textColor: health.defenseRate > 80 ? "#16a34a" : health.defenseRate > 60 ? "#ca8a04" : "#dc2626" },
        ].map((c) => (
          <div key={c.label} className="rounded-xl p-4"
            style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <Shield className="h-4 w-4 mb-2" style={{ color: "rgba(0,0,0,0.3)" }} />
            <div className="text-[20px] font-semibold" style={{ color: c.textColor, letterSpacing: "-0.5px" }}>{c.value}</div>
            <div className="mt-0.5 text-[11px]" style={{ color: "rgba(0,0,0,0.38)" }}>{c.label}</div>
          </div>
        ))}
      </div>

      {lastBreach && (
        <div className="rounded-xl p-4 mb-6 flex items-start gap-3"
          style={{ background: "rgba(220,38,38,0.05)", border: "1px solid rgba(220,38,38,0.2)" }}>
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" style={{ color: "#dc2626" }} />
          <div>
            <p className="text-[13px] font-medium" style={{ color: "#dc2626" }}>Breach rilevato: {lastBreach.type}</p>
            <p className="text-[11px] mt-1" style={{ color: "rgba(0,0,0,0.45)" }}>{lastBreach.details}</p>
            <p className="text-[10px] font-mono mt-1" style={{ color: "rgba(0,0,0,0.35)" }}>{lastBreach.id} · {lastBreach.timestamp.slice(11, 19)}</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button onClick={runBatch} disabled={running}
          className="flex items-center gap-1.5 text-[12px] px-4 py-2 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ background: "#0D1016", color: "#ffffff" }}>
          {running ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          {running ? "Simulazione in corso..." : "Esegui 5 attacchi simulati"}
        </button>
        {attacks.length > 0 && (
          <>
            <button onClick={exportReport}
              className="flex items-center gap-1.5 text-[12px] px-4 py-2 rounded-lg transition-opacity hover:opacity-70"
              style={{ background: "#f5f5f4", border: "1px solid rgba(0,0,0,0.09)", color: "rgba(0,0,0,0.6)" }}>
              <Download className="h-3.5 w-3.5" /> Esporta report
            </button>
            <button onClick={resetAttacks}
              className="text-[12px] px-4 py-2 rounded-lg transition-opacity hover:opacity-70"
              style={{ background: "#f5f5f4", border: "1px solid rgba(0,0,0,0.09)", color: "rgba(0,0,0,0.45)" }}>
              Reset log
            </button>
          </>
        )}
      </div>

      <div className="rounded-xl overflow-hidden"
        style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)" }}>
        <div className="px-5 py-3 flex items-center justify-between"
          style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
          <h2 className="text-[13px] font-semibold" style={{ color: "#0D1016" }}>Log Attacchi</h2>
          <span className="text-[11px]" style={{ color: "rgba(0,0,0,0.35)" }}>{attacks.length} record</span>
        </div>
        <div className="max-h-80 overflow-y-auto">
          <AnimatePresence initial={false}>
            {attacks.map((a) => (
              <motion.div key={a.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="px-5 py-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5" style={{ color: "rgba(0,0,0,0.3)" }} />
                    <span className="text-[11px] font-mono" style={{ color: "#0D1016" }}>{a.type}</span>
                    <span className="text-[10px] font-medium rounded-full px-2 py-0.5"
                      style={{
                        background: a.result === "breach" ? "rgba(220,38,38,0.1)" : a.result === "detected" ? "rgba(202,138,4,0.1)" : "rgba(22,163,74,0.1)",
                        color: a.result === "breach" ? "#dc2626" : a.result === "detected" ? "#ca8a04" : "#16a34a",
                      }}>
                      {a.result}
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: "rgba(0,0,0,0.35)" }}>
                      score: {a.defenseScore}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono" style={{ color: "rgba(0,0,0,0.35)" }}>
                    {a.timestamp.slice(11, 19)}
                  </span>
                </div>
                <p className="text-[10px] ml-5 truncate" style={{ color: "rgba(0,0,0,0.45)" }}>{a.target}</p>
              </motion.div>
            ))}
          </AnimatePresence>
          {attacks.length === 0 && (
            <div className="px-5 py-12 text-center text-[13px]" style={{ color: "rgba(0,0,0,0.35)" }}>
              Nessun attacco simulato. Esegui un batch per iniziare il Red Teaming.
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-[12px] font-medium shadow-lg"
            style={{
              background: toast.type === "error" ? "rgba(220,38,38,0.95)" : "#0D1016",
              color: "#ffffff",
            }}
          >
            {toast.type === "error" ? "⚠" : "✓"} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
