"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle, Download, BookOpen } from "lucide-react";
import Link from "next/link";
import {
  NUTRITION_LABEL, INSTRUCTIONS, SAMPLE_DECISIONS,
  generateExplanation, type DecisionExplanation,
} from "@/lib/simulation/transparency-engine";
import { writeToStorage, readFromStorage } from "@/lib/dossier/storage-schema";
import type { TransparencyResult } from "@/lib/dossier/storage-schema";

const card = { background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" };

// ─── Tab nav ──────────────────────────────────────────────────────────────────
type Tab = "explain" | "nutrition" | "instructions";

// ─── SHAP feature bar ─────────────────────────────────────────────────────────
function ShapBar({ value, max }: { value: number; max: number }) {
  const pct = Math.abs(value) / max;
  const positive = value >= 0;
  return (
    <div className="flex items-center gap-2 w-full">
      {/* Negative side */}
      <div className="flex-1 flex justify-end">
        <div className="h-2 rounded-l overflow-hidden" style={{ width: "100%", background: "rgba(0,0,0,0.05)" }}>
          {!positive && (
            <motion.div className="h-full rounded-l float-right"
              initial={{ width: 0 }} animate={{ width: `${pct * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              style={{ background: "#ef4444" }} />
          )}
        </div>
      </div>
      {/* Center line */}
      <div className="w-px h-3 flex-shrink-0" style={{ background: "rgba(0,0,0,0.15)" }} />
      {/* Positive side */}
      <div className="flex-1">
        <div className="h-2 rounded-r overflow-hidden" style={{ background: "rgba(0,0,0,0.05)" }}>
          {positive && (
            <motion.div className="h-full rounded-r"
              initial={{ width: 0 }} animate={{ width: `${pct * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              style={{ background: "#3b82f6" }} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Confidence gauge ─────────────────────────────────────────────────────────
function ConfidenceGauge({ value, uncertain }: { value: number; uncertain: boolean }) {
  const pct = value * 100;
  const color = uncertain ? "#ca8a04" : value > 0.8 ? "#16a34a" : value > 0.65 ? "#3b82f6" : "#ca8a04";
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-[10px]" style={{ color: "rgba(0,0,0,0.4)" }}>Confidenza</span>
        <span className="text-[11px] font-semibold" style={{ color }}>{pct.toFixed(1)}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.07)" }}>
        <motion.div className="h-full rounded-full"
          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ background: color }} />
      </div>
      {uncertain && (
        <p className="text-[10px] mt-1 flex items-center gap-1" style={{ color: "#ca8a04" }}>
          <AlertTriangle className="h-3 w-3" />
          Zona incertezza — revisione umana obbligatoria
        </p>
      )}
    </div>
  );
}

// ─── Decision card ────────────────────────────────────────────────────────────
function DecisionCard({ dec, active, onClick }: { dec: DecisionExplanation; active: boolean; onClick: () => void }) {
  const colors = { APPROVED: { bg: "rgba(22,163,74,0.08)", text: "#16a34a", border: "rgba(22,163,74,0.2)" },
                   REJECTED: { bg: "rgba(220,38,38,0.08)", text: "#dc2626", border: "rgba(220,38,38,0.2)" },
                   REVIEW:   { bg: "rgba(202,138,4,0.08)",  text: "#ca8a04", border: "rgba(202,138,4,0.2)"  } };
  const c = colors[dec.output];
  return (
    <button onClick={onClick} className="w-full text-left rounded-xl p-3.5 transition-all"
      style={{ ...card, border: active ? "1px solid rgba(59,130,246,0.3)" : "1px solid rgba(0,0,0,0.07)", background: active ? "rgba(59,130,246,0.03)" : "#fff" }}>
      <div className="flex items-start justify-between mb-1.5">
        <span className="text-[11px] font-medium" style={{ color: "#0D1016" }}>{dec.inferenceId}</span>
        <span className="text-[10px] px-2 py-0.5 rounded font-semibold"
          style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
          {dec.output}
        </span>
      </div>
      <p className="text-[10px]" style={{ color: "rgba(0,0,0,0.4)" }}>
        {dec.timestamp.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })} · {(dec.confidence * 100).toFixed(0)}% conf.
      </p>
      {dec.uncertaintyZone && (
        <p className="text-[9px] mt-1" style={{ color: "#ca8a04" }}>⚠ Zona incertezza</p>
      )}
    </button>
  );
}

// ─── Explainability view ──────────────────────────────────────────────────────
function ExplainView({ dec }: { dec: DecisionExplanation }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmedUnderstanding, setConfirmedUnderstanding] = useState(false);
  const maxShap = Math.max(...dec.features.map((f) => f.absInfluence));

  const outputColor = { APPROVED: "#16a34a", REJECTED: "#dc2626", REVIEW: "#ca8a04" }[dec.output];

  return (
    <motion.div key={dec.inferenceId} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>

      {/* Output + confidence */}
      <div className="rounded-xl p-4 mb-4" style={card}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] font-semibold uppercase mb-0.5" style={{ color: "rgba(0,0,0,0.3)", letterSpacing: "1px" }}>
              Decisione — {dec.inferenceId}
            </p>
            <p className="text-[22px] font-semibold" style={{ color: outputColor, letterSpacing: "-0.5px" }}>{dec.output}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px]" style={{ color: "rgba(0,0,0,0.35)" }}>Modello {dec.modelVersion}</p>
            <p className="text-[10px]" style={{ color: "rgba(0,0,0,0.35)" }}>op: {dec.operatorId}</p>
          </div>
        </div>
        <ConfidenceGauge value={dec.confidence} uncertain={dec.uncertaintyZone} />
      </div>

      {/* Short explanation — progressive disclosure */}
      <div className="rounded-xl p-4 mb-4" style={card}>
        <p className="text-[10px] font-semibold uppercase mb-2" style={{ color: "rgba(0,0,0,0.3)", letterSpacing: "1px" }}>
          Spiegazione — Art. 86
        </p>
        <p className="text-[13px] leading-relaxed" style={{ color: "#0D1016" }}>{dec.shortExplanation}</p>

        <button onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 mt-3 text-[11px] transition-opacity hover:opacity-70"
          style={{ color: "#3b82f6" }}>
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          {expanded ? "Nascondi dettagli tecnici" : "Espandi per auditor"}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
              className="overflow-hidden">
              <div className="mt-3 rounded-lg p-3 text-[11px] font-mono"
                style={{ background: "#f5f5f4", color: "rgba(0,0,0,0.6)" }}>
                {dec.technicalSummary}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* SHAP feature importance */}
      <div className="rounded-xl p-4 mb-4" style={card}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-semibold uppercase" style={{ color: "rgba(0,0,0,0.3)", letterSpacing: "1px" }}>
            Influenza Feature — SHAP Values
          </p>
          <div className="flex items-center gap-3 text-[9px]" style={{ color: "rgba(0,0,0,0.35)" }}>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-400 inline-block" />Negativo</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-400 inline-block" />Positivo</span>
          </div>
        </div>

        <div className="space-y-3">
          {dec.features.map((f) => (
            <div key={f.feature}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px]" style={{ color: "#0D1016" }}>{f.feature}</span>
                  {f.isProxy && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
                      style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626" }}>
                      PROXY {f.proxyFor}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono font-semibold"
                  style={{ color: f.direction === "positive" ? "#3b82f6" : f.direction === "negative" ? "#dc2626" : "rgba(0,0,0,0.4)" }}>
                  {f.shapValue >= 0 ? "+" : ""}{f.shapValue.toFixed(3)}
                </span>
              </div>
              <ShapBar value={f.shapValue} max={maxShap} />
              <p className="text-[10px] mt-1" style={{ color: "rgba(0,0,0,0.42)" }}>{f.humanLabel}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Human understanding confirmation — Art. 14 */}
      <div className="rounded-xl p-4" style={card}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={confirmedUnderstanding}
            onChange={(e) => setConfirmedUnderstanding(e.target.checked)}
            className="mt-0.5" />
          <div>
            <p className="text-[12px] font-medium" style={{ color: "#0D1016" }}>
              Confermo di aver compreso la spiegazione — Art. 14
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "rgba(0,0,0,0.42)" }}>
              La mia supervisione umana è stata applicata a questa decisione. Il campo è tracciato nel registro di trasparenza.
            </p>
          </div>
        </label>
        {confirmedUnderstanding && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="mt-3 flex items-center gap-2 text-[11px]" style={{ color: "#16a34a" }}>
            <CheckCircle className="h-3.5 w-3.5" />
            Comprensione confermata — registrata nel transparency_records
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Nutrition Label ──────────────────────────────────────────────────────────
function NutritionView() {
  const nl = NUTRITION_LABEL;
  const accuracyDiff = nl.declaredAccuracy - nl.measuredAccuracy;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Main label */}
      <div className="rounded-xl overflow-hidden" style={card}>
        {/* Header bar */}
        <div className="px-5 py-3" style={{ background: "#0D1016" }}>
          <p className="text-[10px] font-semibold uppercase mb-0.5" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "1.5px" }}>
            AI Nutrition Label — Art. 13.3
          </p>
          <p className="text-white text-[15px] font-medium" style={{ letterSpacing: "-0.4px" }}>{nl.systemName}</p>
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>{nl.intendedPurpose}</p>
        </div>

        <div className="p-5 space-y-4">
          {/* Risk class */}
          <div className="flex items-start justify-between pb-4" style={{ borderBottom: "2px solid rgba(0,0,0,0.1)" }}>
            <div>
              <p className="text-[10px] font-semibold uppercase" style={{ color: "rgba(0,0,0,0.4)", letterSpacing: "0.8px" }}>Classe di rischio</p>
              <p className="text-[13px] font-semibold mt-0.5" style={{ color: "#dc2626" }}>{nl.riskClass}</p>
            </div>
            <span className="text-[9px] px-2 py-1 rounded font-semibold"
              style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.2)" }}>
              Allegato III §4
            </span>
          </div>

          {/* Accuracy */}
          <div className="pb-4" style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
            <p className="text-[10px] font-semibold uppercase mb-2" style={{ color: "rgba(0,0,0,0.4)", letterSpacing: "0.8px" }}>Accuratezza</p>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-[20px] font-semibold" style={{ color: "#0D1016", letterSpacing: "-0.5px" }}>
                  {(nl.measuredAccuracy * 100).toFixed(1)}%
                </p>
                <p className="text-[9px]" style={{ color: "rgba(0,0,0,0.4)" }}>Misurata</p>
              </div>
              <div className="text-[11px]" style={{ color: "rgba(0,0,0,0.3)" }}>vs</div>
              <div>
                <p className="text-[20px] font-semibold" style={{ color: "rgba(0,0,0,0.35)", letterSpacing: "-0.5px" }}>
                  {(nl.declaredAccuracy * 100).toFixed(0)}%
                </p>
                <p className="text-[9px]" style={{ color: "rgba(0,0,0,0.4)" }}>Dichiarata</p>
              </div>
              {accuracyDiff > 0.01 && (
                <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: "rgba(234,88,12,0.08)", color: "#ea580c" }}>
                  -{(accuracyDiff * 100).toFixed(1)}% gap
                </span>
              )}
            </div>
          </div>

          {/* Data sources */}
          <div className="pb-4" style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
            <p className="text-[10px] font-semibold uppercase mb-2" style={{ color: "rgba(0,0,0,0.4)", letterSpacing: "0.8px" }}>Dati di addestramento</p>
            {nl.trainingDataSources.map((s) => (
              <p key={s} className="text-[11px] mb-0.5" style={{ color: "#0D1016" }}>· {s}</p>
            ))}
          </div>

          {/* Limits */}
          <div>
            <p className="text-[10px] font-semibold uppercase mb-2" style={{ color: "rgba(0,0,0,0.4)", letterSpacing: "0.8px" }}>Limiti noti</p>
            {nl.trainingDataLimits.map((l) => (
              <p key={l} className="text-[11px] mb-0.5 flex items-start gap-1.5" style={{ color: "#0D1016" }}>
                <span style={{ color: "#ca8a04" }}>⚠</span>{l}
              </p>
            ))}
          </div>
        </div>

        <div className="px-5 py-3 flex items-center justify-between"
          style={{ background: "#f5f5f4", borderTop: "1px solid rgba(0,0,0,0.07)" }}>
          <span className="text-[9px]" style={{ color: "rgba(0,0,0,0.35)" }}>
            {nl.annexIVRef} · Audit: {nl.lastAudit}
          </span>
          <button className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded transition-opacity hover:opacity-70"
            style={{ background: "#0D1016", color: "#fff" }}>
            <Download className="h-3 w-3" /> Scarica
          </button>
        </div>
      </div>

      {/* Input requirements + forbidden use */}
      <div className="space-y-4">
        <div className="rounded-xl p-4" style={card}>
          <p className="text-[10px] font-semibold uppercase mb-3" style={{ color: "rgba(0,0,0,0.3)", letterSpacing: "1px" }}>
            Requisiti input
          </p>
          {nl.inputRequirements.map((r) => (
            <div key={r} className="flex items-start gap-2 mb-2">
              <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: "#3b82f6" }} />
              <span className="text-[11px]" style={{ color: "#0D1016" }}>{r}</span>
            </div>
          ))}
        </div>

        <div className="rounded-xl p-4" style={card}>
          <p className="text-[10px] font-semibold uppercase mb-3" style={{ color: "rgba(0,0,0,0.3)", letterSpacing: "1px" }}>
            Limiti di performance
          </p>
          {nl.performanceLimits.map((l) => (
            <div key={l} className="flex items-start gap-2 mb-2">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: "#ca8a04" }} />
              <span className="text-[11px]" style={{ color: "#0D1016" }}>{l}</span>
            </div>
          ))}
        </div>

        <div className="rounded-xl p-4" style={{ ...card, background: "rgba(220,38,38,0.03)", border: "1px solid rgba(220,38,38,0.12)" }}>
          <p className="text-[10px] font-semibold uppercase mb-3" style={{ color: "#dc2626", letterSpacing: "1px" }}>
            Usi vietati — Art. 13.1
          </p>
          {nl.forbiddenUseCases.map((u) => (
            <div key={u} className="flex items-start gap-2 mb-2">
              <span style={{ color: "#dc2626", fontSize: "11px" }}>✕</span>
              <span className="text-[11px]" style={{ color: "#0D1016" }}>{u}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Instructions view ────────────────────────────────────────────────────────
function InstructionsView() {
  const ins = INSTRUCTIONS;
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="space-y-4">
        <div className="rounded-xl p-4" style={card}>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="h-4 w-4" style={{ color: "#16a34a" }} />
            <p className="text-[12px] font-semibold" style={{ color: "#0D1016" }}>Obblighi dell&apos;operatore</p>
          </div>
          {ins.mustDo.map((d) => (
            <div key={d} className="flex items-start gap-2 mb-2.5 pl-1">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: "#16a34a" }} />
              <span className="text-[12px]" style={{ color: "#0D1016" }}>{d}</span>
            </div>
          ))}
        </div>

        <div className="rounded-xl p-4" style={{ ...card, background: "rgba(220,38,38,0.03)", border: "1px solid rgba(220,38,38,0.1)" }}>
          <div className="flex items-center gap-2 mb-3">
            <span style={{ color: "#dc2626", fontSize: "16px" }}>✕</span>
            <p className="text-[12px] font-semibold" style={{ color: "#0D1016" }}>Divieti operativi</p>
          </div>
          {ins.mustNotDo.map((d) => (
            <div key={d} className="flex items-start gap-2 mb-2.5 pl-1">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: "#dc2626" }} />
              <span className="text-[12px]" style={{ color: "#0D1016" }}>{d}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl p-4" style={{ ...card, background: "rgba(202,138,4,0.04)", border: "1px solid rgba(202,138,4,0.15)" }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4" style={{ color: "#ca8a04" }} />
            <p className="text-[12px] font-semibold" style={{ color: "#0D1016" }}>Supervisione umana richiesta</p>
          </div>
          {ins.humanOversightRequired.map((h) => (
            <div key={h} className="flex items-start gap-2 mb-2.5 pl-1">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: "#ca8a04" }} />
              <span className="text-[12px]" style={{ color: "#0D1016" }}>{h}</span>
            </div>
          ))}
        </div>

        <div className="rounded-xl p-4" style={card}>
          <p className="text-[10px] font-semibold uppercase mb-3" style={{ color: "rgba(0,0,0,0.3)", letterSpacing: "1px" }}>
            Versione istruzioni
          </p>
          {[
            ["Versione sistema", ins.version],
            ["Commit collegato", ins.commitSha],
            ["Soglia incertezza", `${ins.uncertaintyThreshold * 100}%`],
            ["Generato da", "DocuGen AI — Art. 11"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-1.5" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
              <span className="text-[11px]" style={{ color: "rgba(0,0,0,0.45)" }}>{k}</span>
              <span className="text-[11px] font-medium" style={{ color: "#0D1016" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TransparencyPage() {
  const [tab,        setTab]        = useState<Tab>("explain");
  const [selectedId, setSelectedId] = useState(0);
  const [customSeed, setCustomSeed] = useState<number | null>(null);
  const [savedAt,    setSavedAt]    = useState<string | null>(() =>
    readFromStorage<TransparencyResult>("transparency")?.completedAt ?? null
  );

  function saveToDossier() {
    const completedAt = new Date().toISOString();
    writeToStorage<TransparencyResult>("transparency", {
      userInformedOfAI: true,
      informationProvided: NUTRITION_LABEL.inputRequirements,
      contactPoint: "compliance@azienda.eu",
      languagesAvailable: ["italiano", "inglese"],
      completedAt,
    });
    setSavedAt(completedAt);
  }

  const allDecisions = customSeed !== null
    ? [generateExplanation(customSeed), ...SAMPLE_DECISIONS]
    : SAMPLE_DECISIONS;

  const selected = allDecisions[selectedId];

  return (
    <div className="max-w-6xl" style={{ fontFamily: "var(--font-inter, system-ui)" }}>

      {/* Dossier saved banner */}
      {savedAt ? (
        <div className="flex items-center gap-2 rounded-lg px-4 py-2.5 mb-5 text-[12px]"
          style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)" }}>
          <span style={{ color: "#15803d" }}>✓ Risultati salvati nel dossier · Aggiornato il {new Date(savedAt).toLocaleDateString("it-IT")}</span>
          <Link href="/dashboard/dossier" className="ml-auto text-[11px] font-medium hover:opacity-70 transition-opacity" style={{ color: "#15803d" }}>Vedi dossier →</Link>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg px-4 py-2.5 mb-5 text-[12px]"
          style={{ background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.12)" }}>
          <span style={{ color: "rgba(0,0,0,0.45)" }}>Salva la configurazione Transparency nel dossier di compliance</span>
          <button onClick={saveToDossier} className="text-[11px] font-medium rounded-full px-3 py-1 transition-opacity hover:opacity-80"
            style={{ background: "#3b82f6", color: "#ffffff", border: "none", cursor: "pointer" }}>
            Salva nel dossier
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase mb-1"
            style={{ color: "rgba(0,0,0,0.3)", letterSpacing: "1.2px" }}>Art. 13 — Trasparenza & Spiegabilità</p>
          <h1 className="text-[24px] font-medium" style={{ color: "#0D1016", letterSpacing: "-0.8px" }}>
            Transparency & XAI
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" style={{ color: "rgba(0,0,0,0.35)" }} />
          <span className="text-[12px]" style={{ color: "rgba(0,0,0,0.45)" }}>SHAP · LIME · AI Nutrition Label · Art. 86</span>
        </div>
      </div>

      {/* Tab pills */}
      <div className="flex gap-2 mb-6">
        {([["explain", "Explain Cards"], ["nutrition", "AI Nutrition Label"], ["instructions", "Istruzioni d'uso"]] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className="text-[12px] px-4 py-2 rounded-full transition-all"
            style={tab === t
              ? { background: "#0D1016", color: "#fff" }
              : { background: "#f5f5f4", border: "1px solid rgba(0,0,0,0.08)", color: "rgba(0,0,0,0.5)" }}>
            {label}
          </button>
        ))}
      </div>

      {/* Explain tab */}
      {tab === "explain" && (
        <div className="flex gap-4">
          {/* Decision list */}
          <div className="flex-shrink-0 w-52 space-y-2">
            <p className="text-[10px] font-semibold uppercase mb-2"
              style={{ color: "rgba(0,0,0,0.3)", letterSpacing: "1px" }}>Decisioni recenti</p>
            {allDecisions.map((d, i) => (
              <DecisionCard key={d.inferenceId} dec={d} active={i === selectedId}
                onClick={() => setSelectedId(i)} />
            ))}
            <button
              onClick={() => { const s = Math.floor(Math.random() * 100); setCustomSeed(s); setSelectedId(0); }}
              className="w-full text-[11px] py-2 rounded-xl transition-opacity hover:opacity-70"
              style={{ background: "#f5f5f4", border: "1px solid rgba(0,0,0,0.08)", color: "rgba(0,0,0,0.45)" }}>
              + Carica nuova decisione
            </button>
          </div>

          {/* Explanation detail */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <ExplainView key={selected.inferenceId} dec={selected} />
            </AnimatePresence>
          </div>
        </div>
      )}

      {tab === "nutrition"    && <NutritionView />}
      {tab === "instructions" && <InstructionsView />}
    </div>
  );
}
