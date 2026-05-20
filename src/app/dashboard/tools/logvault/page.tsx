"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Shield, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";
import Link from "next/link";
import {
  generateLogChain, verifyChain, LEVEL_STYLE,
  type LogEntry, type EventLevel,
} from "@/lib/simulation/logvault-engine";
import { writeToStorage, readFromStorage } from "@/lib/dossier/storage-schema";
import type { LogvaultResult } from "@/lib/dossier/storage-schema";
import { appendEvidence } from "@/lib/evidence/evidence-layer";

const card = { background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" };

// ─── Kill Switch — hold 3s to activate ───────────────────────────────────────
function KillSwitch({ onActivate }: { onActivate: () => void }) {
  const [holding, setHolding]     = useState(false);
  const [progress, setProgress]   = useState(0);
  const [activated, setActivated] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startHold = () => {
    if (activated) return;
    setHolding(true);
    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(intervalRef.current!);
          setActivated(true);
          setHolding(false);
          // onActivate() must NOT be called inside a setState updater (renders parent during render)
          // useEffect below fires it after the state commit
          return 100;
        }
        return p + 3.4; // ~3s
      });
    }, 100);
  };

  const stopHold = () => {
    if (activated) return;
    clearInterval(intervalRef.current!);
    setHolding(false);
    setProgress(0);
  };

  // Fire onActivate after activated becomes true — safe, outside render phase
  useEffect(() => {
    if (activated) onActivate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activated]);

  useEffect(() => () => clearInterval(intervalRef.current!), []);

  return (
    <div className="rounded-xl p-4 flex flex-col items-center gap-3"
      style={{ background: activated ? "rgba(220,38,38,0.07)" : "rgba(0,0,0,0.02)", border: `1px solid ${activated ? "rgba(220,38,38,0.2)" : "rgba(0,0,0,0.08)"}` }}>
      <p className="text-[10px] font-semibold uppercase" style={{ color: "rgba(0,0,0,0.35)", letterSpacing: "1px" }}>
        Kill Switch — Art. 14
      </p>

      {/* Button */}
      <div className="relative">
        <motion.button
          onMouseDown={startHold} onMouseUp={stopHold} onMouseLeave={stopHold}
          onTouchStart={startHold} onTouchEnd={stopHold}
          animate={{ scale: holding ? 0.93 : 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="w-16 h-16 rounded-full flex items-center justify-center select-none"
          style={{
            background: activated ? "#dc2626" : holding ? "#b91c1c" : "#0D1016",
            cursor: activated ? "not-allowed" : "pointer",
            boxShadow: holding ? "0 0 0 6px rgba(220,38,38,0.15)" : "0 2px 8px rgba(0,0,0,0.2)",
          }}
        >
          <span className="text-white text-[10px] font-bold text-center leading-tight select-none">
            {activated ? "STOP\nACTIVE" : "HOLD\nSTOP"}
          </span>
        </motion.button>

        {/* Progress ring */}
        {holding && (
          <svg className="absolute inset-0 w-16 h-16 pointer-events-none" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(220,38,38,0.2)" strokeWidth="3" />
            <circle cx="32" cy="32" r="28" fill="none" stroke="#dc2626" strokeWidth="3"
              strokeDasharray={`${2 * Math.PI * 28}`}
              strokeDashoffset={`${2 * Math.PI * 28 * (1 - progress / 100)}`}
              style={{ transition: "stroke-dashoffset 0.1s linear" }} />
          </svg>
        )}
      </div>

      <p className="text-[10px] text-center" style={{ color: "rgba(0,0,0,0.35)" }}>
        {activated ? "Sistema arrestato — Nessuna nuova inferenza" :
         holding ? `Rilascio emergenza… ${Math.round(progress)}%` :
         "Tieni premuto 3s per arrestare"}
      </p>
    </div>
  );
}

// ─── SVG turbulence filter for drift cards ────────────────────────────────────
function DriftOverlay({ intensity }: { intensity: number }) {
  if (intensity < 0.5) return null;
  const freq = 0.01 + intensity * 0.03;
  return (
    <div className="pointer-events-none absolute inset-0 rounded-xl overflow-hidden opacity-40">
      <svg width="100%" height="100%" className="absolute inset-0">
        <defs>
          <filter id={`turb-${Math.round(intensity * 10)}`}>
            <feTurbulence type="turbulence" baseFrequency={freq} numOctaves="3" seed="2" />
            <feDisplacementMap in="SourceGraphic" scale={intensity * 6} />
          </filter>
        </defs>
      </svg>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LogVaultPage() {
  const [tampered,     setTampered]     = useState(false);
  const [selected,     setSelected]     = useState<LogEntry | null>(null);
  const [filter,       setFilter]       = useState<EventLevel | "all">("all");
  const [killActive,   setKillActive]   = useState(false);
  const [autoScroll,   setAutoScroll]   = useState(true);
  const [systemName,   setSystemName]   = useState(() =>
    typeof window !== "undefined" ? (localStorage.getItem("logvault_system_name") ?? "CV-Screener AI") : "CV-Screener AI"
  );
  const [logCount,     setLogCount]     = useState(24);
  const [showConfig,   setShowConfig]   = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [savedAt,      setSavedAt]      = useState<string | null>(() =>
    readFromStorage<LogvaultResult>("logvault")?.completedAt ?? null
  );
  const listRef = useRef<HTMLDivElement>(null);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  const logs      = generateLogChain(logCount, tampered);
  const integrity = verifyChain(logs);
  const filtered  = filter === "all" ? logs : logs.filter((l) => l.level === filter);

  const criticalCount = logs.filter((l) => l.level === "critical").length;
  const warningCount  = logs.filter((l) => l.level === "warning").length;
  const driftMax      = Math.max(...logs.map((l) => l.driftScore));
  const integrityPct  = Math.round((integrity.verifiedCount / logs.length) * 100);

  const resetTamper = useCallback(() => { setTampered(false); setSelected(null); }, []);

  function saveToDossier() {
    const completedAt = new Date().toISOString();
    const eventTypes = [...new Set(logs.map((l) => l.eventType))];
    const storageLocation = `LogVault — ${systemName} — Append-Only Storage`;

    writeToStorage<LogvaultResult>("logvault", {
      loggingEnabled: true,
      retentionDays: 90,
      loggedEvents: eventTypes,
      storageLocation,
      accessControl: "Role-based — solo operatori autorizzati",
      completedAt,
    });

    appendEvidence(
      "log",
      {
        type: "LogVault — Registro Eventi AI Art. 12 & 14",
        systemName,
        totalEntries: logs.length,
        criticalEvents: logs.filter((l) => l.level === "critical").length,
        warningEvents: logs.filter((l) => l.level === "warning").length,
        chainIntegrity: integrity.valid ? "VALID" : `BROKEN at #${integrity.brokenAt}`,
        driftMax: `${(driftMax * 100).toFixed(0)}%`,
        killSwitchActivated: killActive,
        eventTypes,
        firstHash: logs[0]?.entryHash.slice(0, 12),
        lastHash: logs[logs.length - 1]?.entryHash.slice(0, 12),
        savedAt: completedAt,
      },
      "logvault"
    );

    setSavedAt(completedAt);
    showToast("Configurazione LogVault salvata nel dossier");
  }

  function exportEvidence() {
    const report = {
      export_type: "LogVault — Forensic Evidence Export",
      regulation: "EU 2024/1689 — Art. 12 (Logging), Art. 14 (Human Oversight)",
      exported_at: new Date().toISOString(),
      system_name: systemName,
      chain_integrity: {
        valid: integrity.valid,
        broken_at: integrity.brokenAt,
        verified_count: integrity.verifiedCount,
        total: logs.length,
      },
      summary: {
        critical_events: logs.filter((l) => l.level === "critical").length,
        warning_events: logs.filter((l) => l.level === "warning").length,
        safe_events: logs.filter((l) => l.level === "safe").length,
        drift_max: driftMax.toFixed(4),
        kill_switch_activated: killActive,
      },
      hash_anchors: {
        genesis: logs[0]?.prevHash ?? "—",
        head: logs[logs.length - 1]?.entryHash ?? "—",
      },
      entries: logs.map((e) => ({
        id: e.id,
        sequenceId: e.sequenceId,
        timestamp: e.timestamp.toISOString(),
        level: e.level,
        eventType: e.eventType,
        operatorId: e.operatorId,
        modelVersion: e.modelVersion,
        input: e.input,
        output: e.output,
        confidence: e.confidence,
        driftScore: e.driftScore,
        c2paAttested: e.c2paAttested,
        prevHash: e.prevHash,
        entryHash: e.entryHash,
      })),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `logvault-evidence-${systemName.replace(/\s+/g, "_").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Evidence esportata — " + logs.length + " record");
  }

  useEffect(() => {
    if (autoScroll && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [logs.length, autoScroll]);

  return (
    <div className="w-full" style={{ fontFamily: "var(--font-inter, system-ui)" }}>

      {/* Dossier saved banner */}
      {savedAt ? (
        <div className="flex items-center gap-2 rounded-lg px-4 py-2.5 mb-5 text-[12px]"
          style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)" }}>
          <CheckCircle size={13} strokeWidth={1.5} style={{ color: "#15803d" }} />
          <span style={{ color: "#15803d" }}>✓ Risultati salvati nel dossier · Aggiornato il {new Date(savedAt).toLocaleDateString("it-IT")}</span>
          <Link href="/dashboard/dossier" className="ml-auto text-[11px] font-medium hover:opacity-70 transition-opacity" style={{ color: "#15803d" }}>Vedi dossier →</Link>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg px-4 py-2.5 mb-5 text-[12px]"
          style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)" }}>
          <span style={{ color: "rgba(0,0,0,0.45)" }}>Salva la configurazione LogVault nel dossier di compliance</span>
          <button onClick={saveToDossier} className="text-[11px] font-medium rounded-full px-3 py-1 transition-opacity hover:opacity-80"
            style={{ background: "#0D1016", color: "#ffffff", border: "none", cursor: "pointer" }}>
            Salva nel dossier
          </button>
        </div>
      )}

      {/* SVG filter defs */}
      <svg style={{ width: 0, height: 0, position: "absolute" }}>
        <defs>
          <filter id="turb-main">
            <feTurbulence type="fractalNoise" baseFrequency="0.025" numOctaves="3" seed="7" />
            <feDisplacementMap in="SourceGraphic" scale="5" />
          </filter>
        </defs>
      </svg>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase mb-1"
            style={{ color: "rgba(0,0,0,0.3)", letterSpacing: "1.2px" }}>Art. 12 & 14 — Logging & Sorveglianza</p>
          <h1 className="text-[24px] font-medium" style={{ color: "#0D1016", letterSpacing: "-0.8px" }}>
            LogVault — Forensic Engine
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setTampered(!tampered)}
            className="text-[11px] px-3 py-2 rounded-lg transition-all"
            style={tampered
              ? { background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "#dc2626" }
              : { background: "#f5f5f4", border: "1px solid rgba(0,0,0,0.09)", color: "rgba(0,0,0,0.45)" }}>
            {tampered ? "⚠ Tamper simulato attivo" : "Simula manomissione"}
          </button>
          <button onClick={() => setShowConfig(!showConfig)}
            className="text-[11px] px-3 py-2 rounded-lg transition-all"
            style={{ background: showConfig ? "rgba(13,16,22,0.1)" : "#f5f5f4", border: "1px solid rgba(0,0,0,0.09)", color: "rgba(0,0,0,0.55)" }}>
            ⚙ Config
          </button>
          <button onClick={exportEvidence}
            className="flex items-center gap-1.5 text-[11px] px-3 py-2 rounded-lg transition-opacity hover:opacity-70"
            style={{ background: "#0D1016", color: "#fff" }}>
            <Download className="h-3.5 w-3.5" /> Esporta Evidence
          </button>
        </div>
      </div>

      {/* Config panel */}
      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="rounded-xl p-4" style={card}>
              <p className="text-[10px] font-semibold uppercase mb-3" style={{ color: "rgba(0,0,0,0.3)", letterSpacing: "1px" }}>
                Configurazione LogVault
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] block mb-1" style={{ color: "rgba(0,0,0,0.5)" }}>
                    Sistema monitorato
                  </label>
                  <input
                    type="text"
                    value={systemName}
                    onChange={(e) => {
                      setSystemName(e.target.value);
                      localStorage.setItem("logvault_system_name", e.target.value);
                    }}
                    className="w-full text-[12px] px-3 py-2 rounded-lg outline-none"
                    style={{ background: "#f5f5f4", border: "1px solid rgba(0,0,0,0.1)", color: "#0D1016" }}
                    placeholder="es. CV-Screener AI v2"
                  />
                </div>
                <div>
                  <label className="text-[11px] block mb-1" style={{ color: "rgba(0,0,0,0.5)" }}>
                    Numero di record simulati: <span style={{ color: "#0D1016", fontWeight: 600 }}>{logCount}</span>
                  </label>
                  <input
                    type="range"
                    min={12}
                    max={100}
                    step={4}
                    value={logCount}
                    onChange={(e) => setLogCount(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[9px] mt-0.5" style={{ color: "rgba(0,0,0,0.3)" }}>
                    <span>12</span><span>100</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Integrità catena hash", value: `${integrityPct}%`, color: integrity.valid ? "#16a34a" : "#dc2626" },
          { label: "Event critici",          value: criticalCount,      color: criticalCount > 0 ? "#dc2626" : "#0D1016" },
          { label: "Warning",               value: warningCount,       color: warningCount  > 0 ? "#ca8a04" : "#0D1016" },
          { label: "Drift massimo",          value: `${(driftMax * 100).toFixed(0)}%`, color: driftMax > 0.5 ? "#ea580c" : "#0D1016" },
        ].map((c) => (
          <div key={c.label} className="rounded-xl p-4" style={card}>
            <div className="text-[20px] font-semibold" style={{ color: c.color, letterSpacing: "-0.5px" }}>{c.value}</div>
            <div className="text-[11px] mt-0.5" style={{ color: "rgba(0,0,0,0.38)" }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Integrity alert */}
      {!integrity.valid && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl px-4 py-3 mb-4 flex items-start gap-3"
          style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}>
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "#dc2626" }} />
          <div className="flex-1">
            <p className="text-[12px] font-semibold" style={{ color: "#dc2626" }}>
              Integrità catena compromessa — record #{integrity.brokenAt} manomesso
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "rgba(0,0,0,0.45)" }}>
              SHA-256 mismatch rilevato. Prova forense non valida. Notifica obbligatoria all&apos;Autorità Nazionale (Art. 73).
            </p>
          </div>
          <button onClick={resetTamper} className="flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-lg flex-shrink-0"
            style={{ background: "#0D1016", color: "#fff" }}>
            <RefreshCw className="h-3 w-3" /> Ripristina
          </button>
        </motion.div>
      )}

      <div className="flex gap-4">

        {/* ── Forensic stream ── */}
        <div className="flex-1 min-w-0">
          {/* Filter pills */}
          <div className="flex items-center gap-2 mb-3">
            {(["all", "safe", "warning", "critical"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className="text-[11px] px-3 py-1.5 rounded-full transition-all"
                style={filter === f
                  ? { background: "#0D1016", color: "#fff" }
                  : { background: "#f5f5f4", border: "1px solid rgba(0,0,0,0.08)", color: "rgba(0,0,0,0.45)" }}>
                {f === "all" ? "Tutti" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
            <label className="ml-auto flex items-center gap-1.5 text-[11px] cursor-pointer" style={{ color: "rgba(0,0,0,0.45)" }}>
              <input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} />
              Auto-scroll
            </label>
          </div>

          {/* Log stream */}
          <div ref={listRef} className="rounded-xl overflow-hidden overflow-y-auto"
            style={{ ...card, maxHeight: "520px" }}>
            {/* Header */}
            <div className="sticky top-0 grid text-[9px] font-semibold uppercase px-4 py-2.5 z-10"
              style={{
                gridTemplateColumns: "60px 80px 1fr 70px 60px 80px",
                background: "#f5f5f4",
                borderBottom: "1px solid rgba(0,0,0,0.07)",
                color: "rgba(0,0,0,0.4)",
                letterSpacing: "0.5px",
              }}>
              <span>Seq</span><span>Ora</span><span>Evento</span>
              <span>Conf.</span><span>Drift</span><span>Operatore</span>
            </div>

            {filtered.map((entry) => {
              const s = LEVEL_STYLE[entry.level];
              const isSelected = selected?.id === entry.id;
              const isBroken   = tampered && entry.sequenceId === integrity.brokenAt;
              const hasDrift   = entry.driftScore > 0.5;

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => setSelected(isSelected ? null : entry)}
                  className="relative grid items-center px-4 py-2.5 cursor-pointer transition-colors"
                  style={{
                    gridTemplateColumns: "60px 80px 1fr 70px 60px 80px",
                    borderBottom: "1px solid rgba(0,0,0,0.04)",
                    background: isBroken ? "rgba(220,38,38,0.06)" : isSelected ? "rgba(59,130,246,0.05)" : "transparent",
                  }}
                >
                  {hasDrift && <DriftOverlay intensity={entry.driftScore} />}

                  {/* Seq + dot */}
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: isBroken ? "#dc2626" : s.dot, boxShadow: entry.level === "critical" ? `0 0 5px ${s.dot}` : "none" }} />
                    <span className="text-[10px] font-mono" style={{ color: "rgba(0,0,0,0.4)" }}>
                      #{entry.sequenceId}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono" style={{ color: "rgba(0,0,0,0.4)" }}>
                    {entry.timestamp.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>

                  <div>
                    <span className="text-[11px]" style={{ color: "#0D1016" }}>{entry.eventType}</span>
                    <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded font-medium"
                      style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
                      {entry.output}
                    </span>
                    {isBroken && (
                      <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded font-bold"
                        style={{ background: "rgba(220,38,38,0.12)", color: "#dc2626" }}>
                        HASH MISMATCH
                      </span>
                    )}
                    {entry.c2paAttested && (
                      <span className="ml-2 text-[9px]" style={{ color: "#3b82f6" }}>C2PA</span>
                    )}
                  </div>

                  <span className="text-[10px] font-mono" style={{ color: entry.confidence < 0.65 ? "#ca8a04" : "rgba(0,0,0,0.5)" }}>
                    {(entry.confidence * 100).toFixed(1)}%
                  </span>

                  <div>
                    {entry.driftScore > 0.3 ? (
                      <span className="text-[10px]" style={{ color: entry.driftScore > 0.6 ? "#dc2626" : "#ca8a04" }}>
                        {(entry.driftScore * 100).toFixed(0)}%
                      </span>
                    ) : (
                      <span className="text-[10px]" style={{ color: "rgba(0,0,0,0.3)" }}>—</span>
                    )}
                  </div>

                  <span className="text-[10px] font-mono truncate" style={{ color: "rgba(0,0,0,0.45)" }}>
                    {entry.operatorId}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="flex-shrink-0 w-60 space-y-3">

          {/* Kill switch */}
          <KillSwitch onActivate={() => setKillActive(true)} />

          {/* Chain integrity */}
          <div className="rounded-xl p-4" style={card}>
            <p className="text-[10px] font-semibold uppercase mb-3"
              style={{ color: "rgba(0,0,0,0.3)", letterSpacing: "1px" }}>Catena Hash SHA-256</p>
            <div className="space-y-2">
              {[
                ["Record verificati", `${integrity.verifiedCount}/${logs.length}`],
                ["Integrità", integrity.valid ? "✓ Integra" : "✗ Compromessa"],
                ["Primo hash", logs[0]?.entryHash.slice(0, 12) + "…"],
                ["Ultimo hash", logs[logs.length - 1]?.entryHash.slice(0, 12) + "…"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between items-center py-1"
                  style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                  <span className="text-[10px]" style={{ color: "rgba(0,0,0,0.4)" }}>{k}</span>
                  <span className="text-[10px] font-mono font-semibold"
                    style={{ color: k === "Integrità" ? (integrity.valid ? "#16a34a" : "#dc2626") : "#0D1016" }}>
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Selected entry detail */}
          <AnimatePresence>
            {selected && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }} className="rounded-xl p-4" style={card}>
                <p className="text-[10px] font-semibold uppercase mb-3"
                  style={{ color: "rgba(0,0,0,0.3)", letterSpacing: "1px" }}>Dettaglio record</p>
                <div className="space-y-2">
                  {[
                    ["ID", selected.id],
                    ["Tipo", selected.eventType],
                    ["Versione modello", selected.modelVersion],
                    ["Input", selected.input],
                    ["Output", selected.output],
                    ["Operatore", selected.operatorId],
                    ["Drift", `${(selected.driftScore * 100).toFixed(1)}%`],
                    ["C2PA", selected.c2paAttested ? "Attestato" : "—"],
                    ["Entry hash", selected.entryHash.slice(0, 16) + "…"],
                    ["Prev hash", selected.prevHash.slice(0, 16) + "…"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2 py-1"
                      style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                      <span className="text-[10px] flex-shrink-0" style={{ color: "rgba(0,0,0,0.4)" }}>{k}</span>
                      <span className="text-[10px] font-mono text-right break-all" style={{ color: "#0D1016" }}>{v}</span>
                    </div>
                  ))}
                </div>
                {selected.c2paAttested && (
                  <div className="mt-3 rounded-lg px-2.5 py-2 flex items-center gap-1.5 text-[10px]"
                    style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)", color: "#2563eb" }}>
                    <Shield className="h-3 w-3" />
                    C2PA Evidence Manifest generato
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Drift alert */}
          {driftMax > 0.5 && (
            <div className="rounded-xl p-4"
              style={{ background: "rgba(234,88,12,0.05)", border: "1px solid rgba(234,88,12,0.18)" }}>
              <p className="text-[11px] font-semibold mb-1" style={{ color: "#ea580c" }}>
                Drift rilevato — Art. 15
              </p>
              <p className="text-[10px]" style={{ color: "rgba(0,0,0,0.45)" }}>
                Degradazione performance rispetto al benchmark. Revisione umana obbligatoria.
              </p>
              <p className="text-[10px] mt-1 font-mono" style={{ color: "#ea580c" }}>
                Max drift: {(driftMax * 100).toFixed(0)}%
              </p>
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
