"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MOCK_DATASETS, calculateBiasReport, getTemporalSnapshots,
  COLUMN_LINEAGE, type TemporalSnapshot,
} from "@/lib/simulation/data-audit-engine";

function Bar({ value, max = 1, color }: { value: number; max?: number; color: string }) {
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.07)" }}>
      <motion.div className="h-full rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(1, value / max) * 100}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ background: color }}
      />
    </div>
  );
}

export default function DataAuditPage() {
  const [datasetId, setDatasetId] = useState(MOCK_DATASETS[0].id);
  const [snapIdx,   setSnapIdx]   = useState(5);
  const [ctgan,     setCtgan]     = useState(false);

  const dataset   = MOCK_DATASETS.find((d) => d.id === datasetId)!;
  const snapshots = getTemporalSnapshots(datasetId);
  const asOf      = snapshots[snapIdx].asOf;
  const report    = calculateBiasReport(datasetId, asOf, ctgan);

  const riskColors = {
    critical: { bg: "rgba(220,38,38,0.07)",  text: "#dc2626", border: "rgba(220,38,38,0.2)"  },
    high:     { bg: "rgba(234,88,12,0.07)",  text: "#ea580c", border: "rgba(234,88,12,0.2)"  },
    medium:   { bg: "rgba(202,138,4,0.07)",  text: "#ca8a04", border: "rgba(202,138,4,0.2)"  },
    low:      { bg: "rgba(22,163,74,0.07)",  text: "#16a34a", border: "rgba(22,163,74,0.2)"  },
  };
  const risk = riskColors[report.riskLevel];

  const metrics = [
    { key: "OFI",  label: "Objective Fairness Index", sub: "B − E",          value: report.ofi, alert: report.ofi > 0.15, max: 0.5, fmt: (v: number) => v.toFixed(3) },
    { key: "SPD",  label: "Statistical Parity Diff.", sub: "Art. 10 §2",      value: report.spd, alert: report.spd > 0.1,  max: 0.5, fmt: (v: number) => v.toFixed(3) },
    { key: "DI",   label: "Disparate Impact",         sub: "4/5 rule < 0.8", value: report.di,  alert: report.di  < 0.8,  max: 1,   fmt: (v: number) => v.toFixed(2)  },
    { key: "EOD",  label: "Equalized Odds Diff.",     sub: "ΔTPR / ΔFPR",     value: report.eod, alert: report.eod > 0.1,  max: 0.5, fmt: (v: number) => v.toFixed(3) },
  ];

  const card = { background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" };

  return (
    <div className="max-w-5xl" style={{ fontFamily: "var(--font-inter, system-ui)" }}>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase mb-1"
            style={{ color: "rgba(0,0,0,0.3)", letterSpacing: "1.2px" }}>Art. 10 — Governance dei Dati</p>
          <h1 className="text-[24px] font-medium" style={{ color: "#0D1016", letterSpacing: "-0.8px" }}>
            Data Audit
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={datasetId}
            onChange={(e) => { setDatasetId(e.target.value); setSnapIdx(5); setCtgan(false); }}
            className="text-[12px] rounded-lg px-3 py-2 outline-none"
            style={{ background: "#f5f5f4", border: "1px solid rgba(0,0,0,0.09)", color: "#0D1016" }}>
            {MOCK_DATASETS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <button onClick={() => setCtgan(!ctgan)}
            className="text-[11px] flex items-center gap-1.5 rounded-lg px-3 py-2 transition-all"
            style={ctgan
              ? { background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.25)", color: "#2563eb" }
              : { background: "#f5f5f4", border: "1px solid rgba(0,0,0,0.09)", color: "rgba(0,0,0,0.45)" }}>
            <span className={`w-1.5 h-1.5 rounded-full ${ctgan ? "bg-blue-500" : "bg-black/20"}`} />
            CTGAN Debiasing {ctgan ? "ON" : "OFF"}
          </button>
          <span className="text-[11px] font-medium px-3 py-2 rounded-lg"
            style={{ background: risk.bg, border: `1px solid ${risk.border}`, color: risk.text }}>
            {report.riskLevel.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Dataset strip */}
      <div className="rounded-xl p-3.5 mb-5" style={card}>
        <div className="flex flex-wrap gap-5 text-[11px]" style={{ color: "rgba(0,0,0,0.42)" }}>
          {[["Fonte", dataset.source], ["Righe", dataset.rows.toLocaleString("it-IT")],
            ["Valido dal", dataset.validFrom.toLocaleDateString("it-IT")],
            ["Feature sensibili", dataset.sensitiveFeatures.join(", ")],
            ["As Of", asOf.toLocaleDateString("it-IT")]].map(([k, v]) => (
            <span key={k}><span style={{ color: "rgba(0,0,0,0.6)", fontWeight: 500 }}>{k}:</span> {v}</span>
          ))}
          {ctgan && <span style={{ color: "#2563eb" }}>✦ CTGAN attivo</span>}
        </div>
      </div>

      {/* Temporal timeline */}
      <div className="rounded-xl p-4 mb-5" style={card}>
        <p className="text-[10px] font-semibold uppercase mb-4"
          style={{ color: "rgba(0,0,0,0.28)", letterSpacing: "1px" }}>
          Timeline bitemporale — clicca per interrogare «As Of»
        </p>
        <div className="relative flex items-start">
          <div className="absolute left-0 right-0 top-[10px] h-px" style={{ background: "rgba(0,0,0,0.08)" }} />
          {snapshots.map((snap: TemporalSnapshot, i: number) => {
            const r = snap.report;
            const active = i === snapIdx;
            const dot = r.riskLevel === "critical" ? "#dc2626" : r.riskLevel === "high" ? "#ea580c" : r.riskLevel === "medium" ? "#ca8a04" : "#16a34a";
            return (
              <button key={i} onClick={() => setSnapIdx(i)} className="relative flex flex-col items-center flex-1 gap-1">
                <motion.div animate={{ scale: active ? 1.35 : 1 }}
                  className="w-[20px] h-[20px] rounded-full z-10 flex items-center justify-center"
                  style={{ background: active ? dot : "#fff", border: `2px solid ${dot}`, boxShadow: active ? `0 0 0 3px ${dot}22` : "none" }}>
                  {active && <div className="w-2 h-2 rounded-full" style={{ background: dot }} />}
                </motion.div>
                <span className="text-[10px] mt-1" style={{ color: active ? "#0D1016" : "rgba(0,0,0,0.35)", fontWeight: active ? 500 : 400 }}>
                  {snap.label}
                </span>
                <span className="text-[9px]" style={{ color: active ? dot : "rgba(0,0,0,0.28)" }}>
                  DI {r.di.toFixed(2)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <AnimatePresence mode="wait">
          {metrics.map((m) => (
            <motion.div key={`${m.key}-${snapIdx}-${ctgan}`}
              initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <div className="rounded-xl p-4"
                style={{
                  background: m.alert ? "rgba(220,38,38,0.04)" : "#ffffff",
                  border: m.alert ? "1px solid rgba(220,38,38,0.18)" : "1px solid rgba(0,0,0,0.07)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}>
                <div className="flex items-start justify-between mb-2.5">
                  <div>
                    <p className="text-[20px] font-semibold"
                      style={{ color: m.alert ? "#dc2626" : "#0D1016", letterSpacing: "-0.5px" }}>
                      {m.fmt(m.value)}
                    </p>
                    <p className="text-[10px] font-bold mt-0.5" style={{ color: m.alert ? "#dc2626" : "#3b82f6" }}>
                      {m.key}
                    </p>
                  </div>
                  {m.alert && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold mt-0.5"
                      style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626" }}>
                      ALERT
                    </span>
                  )}
                </div>
                <Bar
                  value={m.key === "DI" ? 1 - m.value : m.value}
                  max={m.key === "DI" ? 0.4 : m.max}
                  color={m.alert ? "#ef4444" : "linear-gradient(90deg,#3b82f6,#6366f1)"}
                />
                <p className="text-[9px] mt-2" style={{ color: "rgba(0,0,0,0.35)" }}>{m.label}</p>
                <p className="text-[9px]" style={{ color: "rgba(0,0,0,0.25)" }}>{m.sub}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Bottom: groups + lineage */}
      <div className="grid lg:grid-cols-2 gap-4">

        {/* Group comparison */}
        <div className="rounded-xl p-4" style={card}>
          <p className="text-[10px] font-semibold uppercase mb-4"
            style={{ color: "rgba(0,0,0,0.3)", letterSpacing: "1px" }}>Confronto gruppi</p>
          <div className="space-y-3">
            {report.groups.map((g) => (
              <div key={g.group}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] flex items-center gap-1.5" style={{ color: "#0D1016" }}>
                    {g.group}
                    {g.selectionRate < 0.15 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626" }}>CTGAN req.</span>
                    )}
                  </span>
                  <div className="flex gap-3 text-[10px]" style={{ color: "rgba(0,0,0,0.4)" }}>
                    <span>TPR {(g.tpr * 100).toFixed(0)}%</span>
                    <span>FPR {(g.fpr * 100).toFixed(0)}%</span>
                    <span className="font-semibold w-8 text-right"
                      style={{ color: g.selectionRate < 0.3 ? "#dc2626" : "#16a34a" }}>
                      {(g.selectionRate * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <Bar value={g.selectionRate} max={0.5}
                  color={g.selectionRate < 0.3 ? "linear-gradient(90deg,#ef4444,#f97316)" : "linear-gradient(90deg,#3b82f6,#22c55e)"} />
              </div>
            ))}
          </div>
          {ctgan && (
            <div className="mt-4 rounded-lg px-3 py-2 text-[11px]"
              style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)", color: "#2563eb" }}>
              ✦ CTGAN ha generato campioni sintetici per bilanciare i gruppi
            </div>
          )}
        </div>

        {/* Column lineage */}
        <div className="rounded-xl p-4" style={card}>
          <p className="text-[10px] font-semibold uppercase mb-4"
            style={{ color: "rgba(0,0,0,0.3)", letterSpacing: "1px" }}>Column Lineage — proxy detector</p>
          <div className="space-y-2">
            {COLUMN_LINEAGE.map((col) => (
              <div key={col.column} className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{
                  background: col.isProxy ? "rgba(220,38,38,0.04)" : "#FAFAF9",
                  border: col.isProxy ? "1px solid rgba(220,38,38,0.15)" : "1px solid rgba(0,0,0,0.06)",
                }}>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[11px] font-mono" style={{ color: "#2563eb" }}>{col.column}</span>
                    <span style={{ color: "rgba(0,0,0,0.25)", fontSize: "9px" }}>→</span>
                    <span className="text-[11px]" style={{ color: "rgba(0,0,0,0.6)" }}>{col.feature}</span>
                    {col.isProxy && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
                        style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626" }}>
                        PROXY {col.proxyFor}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px]" style={{ color: "rgba(0,0,0,0.3)" }}>{col.source}</span>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <div className="w-14 h-1 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.07)" }}>
                    <div className="h-full rounded-full"
                      style={{ width: `${col.influence * 100}%`, background: col.isProxy ? "#ef4444" : "#3b82f6" }} />
                  </div>
                  <span className="text-[10px] w-7 text-right font-medium"
                    style={{ color: col.isProxy ? "#dc2626" : "rgba(0,0,0,0.45)" }}>
                    {(col.influence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[9px] mt-3" style={{ color: "rgba(0,0,0,0.3)" }}>
            Colonne PROXY come surrogati di attributi protetti — deployment bloccato se influenza {'>'} 50%
          </p>
        </div>
      </div>

      {/* CTGAN alert */}
      {report.ctganRequired && !ctgan && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-xl px-5 py-4 flex items-start gap-3"
          style={{ background: "rgba(234,88,12,0.06)", border: "1px solid rgba(234,88,12,0.2)" }}>
          <span style={{ color: "#ea580c" }}>⚠</span>
          <div className="flex-1">
            <p className="text-[12px] font-semibold" style={{ color: "#ea580c" }}>
              DI {report.di.toFixed(2)} &lt; 0.8 — Regola dei Quattro Quinti violata
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "rgba(0,0,0,0.45)" }}>
              Attiva CTGAN per bilanciare i gruppi sottorappresentati e sbloccare il deployment.
            </p>
          </div>
          <button onClick={() => setCtgan(true)}
            className="text-[11px] rounded-lg px-3 py-1.5 flex-shrink-0"
            style={{ background: "#0D1016", color: "#fff" }}>
            Attiva CTGAN →
          </button>
        </motion.div>
      )}

      {/* CycloneDX footer */}
      <div className="mt-4 flex items-center justify-between rounded-lg px-4 py-2.5"
        style={{ background: "#f5f5f4", border: "1px solid rgba(0,0,0,0.07)" }}>
        <span className="text-[10px]" style={{ color: "rgba(0,0,0,0.35)" }}>
          CycloneDX ML BOM · SHA-256: {datasetId === "ds_hiring_2024" ? "a3f9c2…d841" : datasetId === "ds_credit_2024" ? "b7e1a4…c293" : "c4d2f1…e751"} · Firmato: Compliance Officer
        </span>
        <button className="text-[10px] px-3 py-1 rounded transition-opacity hover:opacity-70"
          style={{ background: "#0D1016", color: "#fff" }}>
          Esporta BOM ↓
        </button>
      </div>
    </div>
  );
}
