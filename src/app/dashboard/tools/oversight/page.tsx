"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Brain, StopCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { writeToStorage, readFromStorage } from "@/lib/dossier/storage-schema";
import type { OversightResult } from "@/lib/dossier/storage-schema";
import { appendEvidence } from "@/lib/evidence/evidence-layer";

interface FrictionEvent {
  id: string;
  type: "approved" | "friction_bypassed" | "blocked";
  timestamp: string;
  elapsed: number;
  reason?: string;
}

export default function OversightPage() {
  const [approved,       setApproved]       = useState(false);
  const [frictionActive, setFrictionActive] = useState(false);
  const [frictionReason, setFrictionReason] = useState("");
  const [blocked,        setBlocked]        = useState(false);
  const [events,         setEvents]         = useState<FrictionEvent[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("oversight_events") ?? "[]") as FrictionEvent[]; }
    catch { return []; }
  });
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const startTime = useRef<number>(0);
  const [savedAt, setSavedAt] = useState<string | null>(() =>
    readFromStorage<OversightResult>("oversight")?.completedAt ?? null
  );

  // Avvia il timer quando il componente monta (non al click!)
  useEffect(() => {
    startTime.current = Date.now();
  }, []);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function addEvent(ev: FrictionEvent) {
    setEvents((prev) => {
      const next = [ev, ...prev].slice(0, 20); // tieni ultimi 20
      localStorage.setItem("oversight_events", JSON.stringify(next));
      return next;
    });
  }

  function saveToDossier() {
    const completedAt = new Date().toISOString();
    writeToStorage<OversightResult>("oversight", {
      oversightMechanism: "Safety Friction Gate — Anti Automation Bias (Art. 14)",
      humanInterventionPoints: ["Approvazione output AI con confidenza > 80%", "Override manuale obbligatorio per output critici"],
      stopCapability: true,
      responsiblePersons: ["Responsabile HR", "AI Compliance Officer"],
      completedAt,
    });
    appendEvidence(
      "decision",
      {
        type: "Oversight — Configurazione Friction Gate Art. 14",
        totalEvents: events.length,
        approvals: events.filter((e) => e.type === "approved").length,
        frictionGates: events.filter((e) => e.type === "friction_bypassed").length,
        blocks: events.filter((e) => e.type === "blocked").length,
        savedAt: completedAt,
      },
      "oversight"
    );
    setSavedAt(completedAt);
    showToast("Configurazione Oversight salvata nel dossier");
  }

  function handleApprove() {
    const elapsed = (Date.now() - startTime.current) / 1000;

    if (elapsed < 2.0) {
      // Troppo rapido — Automation Bias sospetto
      setFrictionActive(true);
      addEvent({
        id: crypto.randomUUID(),
        type: "friction_bypassed",
        timestamp: new Date().toISOString(),
        elapsed,
      });
      return;
    }

    // Approvazione normale (> 2s)
    setApproved(true);
    const ev: FrictionEvent = {
      id: crypto.randomUUID(),
      type: "approved",
      timestamp: new Date().toISOString(),
      elapsed,
    };
    addEvent(ev);
    appendEvidence(
      "decision",
      {
        type: "Supervisione umana — Approvazione deliberata Art. 14",
        scenario: "Screening CV: candidato respinto con confidenza 89%",
        elapsedSeconds: elapsed.toFixed(2),
        frictionTriggered: false,
        timestamp: ev.timestamp,
      },
      "oversight"
    );
    showToast("Output approvato e registrato nell'Evidence Layer");
  }

  function confirmWithReason() {
    if (!frictionReason.trim()) return;
    setApproved(true);
    setFrictionActive(false);
    const ev: FrictionEvent = {
      id: crypto.randomUUID(),
      type: "friction_bypassed",
      timestamp: new Date().toISOString(),
      elapsed: (Date.now() - startTime.current) / 1000,
      reason: frictionReason.trim(),
    };
    addEvent(ev);
    appendEvidence(
      "decision",
      {
        type: "Friction Gate superato con motivazione — Art. 14(4)",
        scenario: "Screening CV: candidato respinto con confidenza 89%",
        motivazione: frictionReason.trim(),
        elapsedSeconds: ev.elapsed.toFixed(2),
        frictionTriggered: true,
        timestamp: ev.timestamp,
      },
      "oversight"
    );
    showToast("Approvazione con motivazione registrata nell'Evidence Layer");
    setFrictionReason("");
  }

  return (
    <div className="w-full">
      {savedAt ? (
        <div className="flex items-center gap-2 rounded-lg px-4 py-2.5 mb-5 text-[12px]"
          style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", fontFamily: "var(--font-inter, system-ui)" }}>
          <span style={{ color: "#15803d" }}>✓ Risultati salvati nel dossier · Aggiornato il {new Date(savedAt).toLocaleDateString("it-IT")}</span>
          <Link href="/dashboard/dossier" className="ml-auto text-[11px] font-medium hover:opacity-70 transition-opacity" style={{ color: "#15803d" }}>Vedi dossier →</Link>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg px-4 py-2.5 mb-5 text-[12px]"
          style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", fontFamily: "var(--font-inter, system-ui)" }}>
          <span style={{ color: "rgba(0,0,0,0.45)" }}>Salva la configurazione Oversight nel dossier di compliance</span>
          <button onClick={saveToDossier} className="text-[11px] font-medium rounded-full px-3 py-1 hover:opacity-80"
            style={{ background: "#0D1016", color: "#ffffff", border: "none", cursor: "pointer" }}>
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
                <button
                  onClick={() => {
                    setFrictionActive(false);
                    setBlocked(true);
                    const ev: FrictionEvent = {
                      id: crypto.randomUUID(),
                      type: "blocked",
                      timestamp: new Date().toISOString(),
                      elapsed: (Date.now() - startTime.current) / 1000,
                      reason: frictionReason.trim() || "Output bloccato dall'operatore",
                    };
                    addEvent(ev);
                    appendEvidence(
                      "decision",
                      {
                        type: "Output bloccato da supervisore umano — Art. 14",
                        scenario: "Screening CV: candidato respinto con confidenza 89%",
                        reason: ev.reason,
                        timestamp: ev.timestamp,
                      },
                      "oversight"
                    );
                    showToast("Output bloccato e registrato nell'Evidence Layer", "error");
                    setFrictionReason("");
                  }}
                  className="rounded-lg border border-danger/30 px-3 py-2 text-xs font-medium text-danger hover:bg-danger/10">
                  Blocca output
                </button>
              </div>
            </div>
          )}

          {approved && !frictionActive && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-success/30 bg-success/5 p-3 text-xs flex items-center gap-2"
              style={{ color: "#16a34a" }}>
              <CheckCircle className="h-4 w-4" /> Output approvato e registrato nell&apos;Evidence Layer.
            </motion.div>
          )}
          {blocked && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-lg p-3 text-xs flex items-center gap-2"
              style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", color: "#dc2626" }}>
              <StopCircle className="h-4 w-4" /> Output bloccato — Registrato nell&apos;Evidence Layer.
            </motion.div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">Log Eventi Friction Gate</h2>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">Nessun evento registrato. Usa il pannello a sinistra per interagire.</p>
            ) : (
              events.map((ev) => (
                <div key={ev.id} className="flex items-start gap-2 py-1.5 border-b border-border/40 text-[11px]">
                  <span className="h-2 w-2 rounded-full flex-shrink-0 mt-1"
                    style={{ background: ev.type === "approved" ? "#16a34a" : ev.type === "blocked" ? "#dc2626" : "#ca8a04" }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium" style={{ color: "#0D1016" }}>
                        {ev.type === "approved" ? "Approvato" : ev.type === "blocked" ? "Bloccato" : "Friction Gate"}
                      </span>
                      <span className="text-[10px] font-mono flex-shrink-0" style={{ color: "rgba(0,0,0,0.35)" }}>
                        {new Date(ev.timestamp).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                    </div>
                    <p style={{ color: "rgba(0,0,0,0.4)" }}>{ev.elapsed.toFixed(1)}s · {ev.reason ?? (ev.type === "approved" ? "Deliberata" : "Attivato automaticamente")}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 rounded-lg bg-muted p-3 text-[10px] text-muted-foreground">
            <Brain className="h-3 w-3 inline mr-1 text-primary" />
            Art. 14(4): Il supervisore umano deve poter ignorare, annullare o ribaltare l&apos;output.
            Se l&apos;approvazione avviene in &lt; 2s, il sistema presume Automation Bias.
          </div>
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
            {toast.type === "error" ? "⛔" : "✓"} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
