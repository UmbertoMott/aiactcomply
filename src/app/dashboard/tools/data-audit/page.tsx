"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MOCK_DATASETS,
  calculateBiasReport,
  getTemporalSnapshots,
  COLUMN_LINEAGE,
  RISK_COLORS,
  type TemporalSnapshot,
} from "@/lib/simulation/data-audit-engine";

// ─── Liquid Glass card ────────────────────────────────────────────────────────
function GlassCard({
  children,
  className = "",
  style = {},
  alert = false,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  alert?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0, sx: 50, sy: 50 });

  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setTilt({
      x: ((e.clientX - r.left) / r.width  - 0.5) * 7,
      y: ((e.clientY - r.top)  / r.height - 0.5) * 7,
      sx: ((e.clientX - r.left) / r.width)  * 100,
      sy: ((e.clientY - r.top)  / r.height) * 100,
    });
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0, sx: 50, sy: 50 })}
      className={`relative rounded-2xl overflow-hidden ${className}`}
      style={{
        background: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: alert ? "1px solid rgba(239,68,68,0.35)" : "1px solid rgba(255,255,255,0.1)",
        transform: `perspective(700px) rotateX(${-tilt.y}deg) rotateY(${tilt.x}deg)`,
        transition: "transform 0.15s ease",
        ...style,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          background: `radial-gradient(circle at ${tilt.sx}% ${tilt.sy}%, rgba(255,255,255,0.09) 0%, transparent 55%)`,
          opacity: tilt.x !== 0 ? 1 : 0,
          transition: "opacity 0.2s",
        }}
      />
      {children}
    </div>
  );
}

// ─── Animated bar ─────────────────────────────────────────────────────────────
function Bar({ value, max = 1, color }: { value: number; max?: number; color: string }) {
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
      <motion.div
        className="h-full rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(1, value / max) * 100}%` }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        style={{ background: color }}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DataAuditPage() {
  const [datasetId, setDatasetId] = useState(MOCK_DATASETS[0].id);
  const [snapIdx,   setSnapIdx]   = useState(5);
  const [ctgan,     setCtgan]     = useState(false);

  const dataset   = MOCK_DATASETS.find((d) => d.id === datasetId)!;
  const snapshots = getTemporalSnapshots(datasetId);
  const asOf      = snapshots[snapIdx].asOf;
  const report    = calculateBiasReport(datasetId, asOf, ctgan);
  const risk      = RISK_COLORS[report.riskLevel];

  const metrics = [
    { key: "OFI",  label: "Objective Fairness Index", sub: "B − E",            value: report.ofi, alert: report.ofi > 0.15, max: 0.5,  fmt: (v: number) => v.toFixed(3) },
    { key: "SPD",  label: "Statistical Parity Diff.", sub: "Art. 10 §2",        value: report.spd, alert: report.spd > 0.1,  max: 0.5,  fmt: (v: number) => v.toFixed(3) },
    { key: "DI",   label: "Disparate Impact",         sub: "4/5 rule < 0.8",   value: report.di,  alert: report.di  < 0.8,  max: 1,    fmt: (v: number) => v.toFixed(2) },
    { key: "EOD",  label: "Equalized Odds Diff.",     sub: "ΔTPR / ΔFPR",       value: report.eod, alert: report.eod > 0.1,  max: 0.5,  fmt: (v: number) => v.toFixed(3) },
  ];

  return (
    <div
      className="min-h-full rounded-2xl p-6 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg,#08091a 0%,#0d1016 55%,#080d1a 100%)" }}
    >
      {/* Ambient light blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute w-[500px] h-[500px] rounded-full opacity-[0.07] blur-[80px]"
          style={{ background: "#3b82f6", top: "-120px", left: "-120px" }} />
        <div className="absolute w-96 h-96 rounded-full opacity-[0.06] blur-[60px]"
          style={{ background: "#6366f1", bottom: "-60px", right: "-60px" }} />
      </div>

      {/* ── Header ── */}
      <div className="relative flex flex-wrap items-start justify-between gap-4 mb-7">
        <div>
          <p className="text-[10px] font-semibold uppercase mb-1"
            style={{ color: "rgba(255,255,255,0.22)", letterSpacing: "1.5px" }}>
            Art. 10 — Governance dei Dati
          </p>
          <h1 className="text-[24px] font-medium text-white" style={{ letterSpacing: "-0.8px" }}>
            Data Audit
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={datasetId}
            onChange={(e) => { setDatasetId(e.target.value); setSnapIdx(5); setCtgan(false); }}
            className="text-[12px] rounded-lg px-3 py-2 outline-none"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.75)" }}
          >
            {MOCK_DATASETS.map((d) => (
              <option key={d.id} value={d.id} style={{ background: "#0d1016" }}>{d.name}</option>
            ))}
          </select>

          <button
            onClick={() => setCtgan(!ctgan)}
            className="flex items-center gap-2 text-[11px] rounded-lg px-3 py-2 transition-all"
            style={ctgan
              ? { background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.45)", color: "#93c5fd" }
              : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.38)" }}
          >
            <span className={`w-1.5 h-1.5 rounded-full transition-colors ${ctgan ? "bg-blue-400" : "bg-white/20"}`} />
            CTGAN Debiasing {ctgan ? "ON" : "OFF"}
          </button>

          <div className="text-[11px] font-semibold px-3 py-2 rounded-lg"
            style={{ background: risk.bg, border: `1px solid ${risk.border}`, color: risk.text }}>
            {report.riskLevel.toUpperCase()}
          </div>
        </div>
      </div>

      {/* ── Dataset strip ── */}
      <GlassCard className="p-3.5 mb-5">
        <div className="flex flex-wrap gap-5 text-[11px]" style={{ color: "rgba(255,255,255,0.38)" }}>
          {[
            ["Fonte",        dataset.source],
            ["Righe",        dataset.rows.toLocaleString("it-IT")],
            ["Valido dal",   dataset.validFrom.toLocaleDateString("it-IT")],
            ["Feature",      dataset.sensitiveFeatures.join(", ")],
            ["As Of",        asOf.toLocaleDateString("it-IT")],
          ].map(([k, v]) => (
            <span key={k}><span style={{ color: "rgba(255,255,255,0.6)" }}>{k}:</span> {v}</span>
          ))}
          {ctgan && <span style={{ color: "#93c5fd" }}>✦ CTGAN attivo — campioni sintetici generati</span>}
        </div>
      </GlassCard>

      {/* ── Temporal timeline ── */}
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase mb-3"
          style={{ color: "rgba(255,255,255,0.18)", letterSpacing: "1px" }}>
          Timeline bitemporale — clicca per interrogare «As Of»
        </p>
        <div className="relative flex items-center">
          <div className="absolute left-0 right-0 top-[11px] h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
          {snapshots.map((snap: TemporalSnapshot, i: number) => {
            const r = snap.report;
            const active = i === snapIdx;
            const dot = r.riskLevel === "critical" ? "#ef4444" : r.riskLevel === "high" ? "#f97316" : r.riskLevel === "medium" ? "#eab308" : "#22c55e";
            return (
              <button key={i} onClick={() => setSnapIdx(i)}
                className="relative flex flex-col items-center flex-1 gap-1">
                <motion.div animate={{ scale: active ? 1.5 : 1 }}
                  className="w-3 h-3 rounded-full z-10"
                  style={{ background: dot, boxShadow: active ? `0 0 10px ${dot}` : "none" }} />
                <span className="text-[9px]" style={{ color: active ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.22)" }}>
                  {snap.label}
                </span>
                <span className="text-[9px]" style={{ color: active ? dot : "rgba(255,255,255,0.18)" }}>
                  DI {r.di.toFixed(2)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Metric cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <AnimatePresence mode="wait">
          {metrics.map((m) => (
            <motion.div key={`${m.key}-${snapIdx}-${ctgan}`}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <GlassCard alert={m.alert} className="p-4">
                <div className="flex items-start justify-between mb-2.5">
                  <div>
                    <p className="text-[20px] font-semibold"
                      style={{ color: m.alert ? "#fca5a5" : "#fff", letterSpacing: "-0.5px" }}>
                      {m.fmt(m.value)}
                    </p>
                    <p className="text-[10px] font-bold mt-0.5" style={{ color: m.alert ? "#f87171" : "#60a5fa" }}>
                      {m.key}
                    </p>
                  </div>
                  {m.alert && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold mt-1"
                      style={{ background: "rgba(239,68,68,0.18)", color: "#fca5a5" }}>
                      ALERT
                    </span>
                  )}
                </div>
                <Bar
                  value={m.key === "DI" ? 1 - m.value : m.value}
                  max={m.key === "DI" ? 0.4 : m.max}
                  color={m.alert ? "#ef4444" : "linear-gradient(90deg,#3b82f6,#6366f1)"}
                />
                <p className="text-[9px] mt-2" style={{ color: "rgba(255,255,255,0.22)" }}>{m.label}</p>
                <p className="text-[9px]"      style={{ color: "rgba(255,255,255,0.15)" }}>{m.sub}</p>
              </GlassCard>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Bottom: groups + lineage ── */}
      <div className="grid lg:grid-cols-2 gap-4">

        {/* Group comparison */}
        <GlassCard className="p-4">
          <p className="text-[10px] font-semibold uppercase mb-4"
            style={{ color: "rgba(255,255,255,0.25)", letterSpacing: "1px" }}>
            Confronto gruppi
          </p>
          <div className="space-y-3">
            {report.groups.map((g) => (
              <div key={g.group}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.65)" }}>
                    {g.group}
                    {g.selectionRate < 0.15 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(239,68,68,0.18)", color: "#fca5a5" }}>
                        CTGAN req.
                      </span>
                    )}
                  </span>
                  <div className="flex gap-3 text-[10px]" style={{ color: "rgba(255,255,255,0.38)" }}>
                    <span>TPR {(g.tpr * 100).toFixed(0)}%</span>
                    <span>FPR {(g.fpr * 100).toFixed(0)}%</span>
                    <span className="font-semibold w-8 text-right"
                      style={{ color: g.selectionRate < 0.3 ? "#f87171" : "#86efac" }}>
                      {(g.selectionRate * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <Bar
                  value={g.selectionRate}
                  max={0.5}
                  color={g.selectionRate < 0.3 ? "linear-gradient(90deg,#ef4444,#f97316)" : "linear-gradient(90deg,#3b82f6,#22c55e)"}
                />
              </div>
            ))}
          </div>
          {ctgan && (
            <div className="mt-4 rounded-lg px-3 py-2 text-[10px]"
              style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.18)", color: "#93c5fd" }}>
              ✦ CTGAN ha generato campioni sintetici per bilanciare i gruppi sottorappresentati
            </div>
          )}
        </GlassCard>

        {/* Column lineage */}
        <GlassCard className="p-4">
          <p className="text-[10px] font-semibold uppercase mb-4"
            style={{ color: "rgba(255,255,255,0.25)", letterSpacing: "1px" }}>
            Column Lineage — proxy detector
          </p>
          <div className="space-y-2">
            {COLUMN_LINEAGE.map((col) => (
              <div key={col.column}
                className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{
                  background: col.isProxy ? "rgba(239,68,68,0.07)" : "rgba(255,255,255,0.03)",
                  border: col.isProxy ? "1px solid rgba(239,68,68,0.2)" : "1px solid rgba(255,255,255,0.05)",
                }}>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[11px] font-mono" style={{ color: "#93c5fd" }}>{col.column}</span>
                    <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "9px" }}>→</span>
                    <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.55)" }}>{col.feature}</span>
                    {col.isProxy && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
                        style={{ background: "rgba(239,68,68,0.18)", color: "#fca5a5" }}>
                        PROXY {col.proxyFor}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.18)" }}>{col.source}</span>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <div className="w-14 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                    <div className="h-full rounded-full"
                      style={{ width: `${col.influence * 100}%`, background: col.isProxy ? "#ef4444" : "#3b82f6" }} />
                  </div>
                  <span className="text-[10px] w-7 text-right"
                    style={{ color: col.isProxy ? "#fca5a5" : "rgba(255,255,255,0.38)" }}>
                    {(col.influence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[9px] mt-3" style={{ color: "rgba(255,255,255,0.18)" }}>
            Colonne PROXY come surrogati di attributi protetti — deployment bloccato se influenza {'>'} 50%
          </p>
        </GlassCard>
      </div>

      {/* ── CTGAN alert ── */}
      {report.ctganRequired && !ctgan && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-xl px-5 py-4 flex items-start gap-3"
          style={{ background: "rgba(234,88,12,0.1)", border: "1px solid rgba(234,88,12,0.28)" }}>
          <span style={{ color: "#fb923c" }}>⚠</span>
          <div className="flex-1">
            <p className="text-[12px] font-semibold" style={{ color: "#fdba74" }}>
              DI {report.di.toFixed(2)} &lt; 0.8 — Regola dei Quattro Quinti violata
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "rgba(253,186,116,0.55)" }}>
              Attiva CTGAN per bilanciare i gruppi sottorappresentati e sbloccare il deployment.
            </p>
          </div>
          <button onClick={() => setCtgan(true)}
            className="text-[11px] rounded-lg px-3 py-1.5 flex-shrink-0 transition-opacity hover:opacity-80"
            style={{ background: "rgba(234,88,12,0.2)", border: "1px solid rgba(234,88,12,0.35)", color: "#fdba74" }}>
            Attiva →
          </button>
        </motion.div>
      )}

      {/* ── CycloneDX footer ── */}
      <div className="mt-4 flex items-center justify-between rounded-lg px-4 py-2.5"
        style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>
          CycloneDX ML BOM · SHA-256: {datasetId === "ds_hiring_2024" ? "a3f9c2…d841" : datasetId === "ds_credit_2024" ? "b7e1a4…c293" : "c4d2f1…e751"} · Firmato: Compliance Officer
        </span>
        <button className="text-[10px] px-3 py-1 rounded transition-opacity hover:opacity-80"
          style={{ background: "rgba(59,130,246,0.13)", border: "1px solid rgba(59,130,246,0.18)", color: "#93c5fd" }}>
          Esporta BOM ↓
        </button>
      </div>
    </div>
  );
}
