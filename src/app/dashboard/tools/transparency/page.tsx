"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle, Download, BookOpen, FileSearch } from "lucide-react";
import Link from "next/link";
import {
  NUTRITION_LABEL, INSTRUCTIONS, SAMPLE_DECISIONS,
  generateExplanation, type DecisionExplanation,
} from "@/lib/simulation/transparency-engine";
import { writeToStorage, readFromStorage } from "@/lib/dossier/storage-schema";
import type { TransparencyResult, ClassifierResult, OversightResult, ResilienceResult } from "@/lib/dossier/storage-schema";
import { processTransparencyNotice, type TransparencyNoticeResult } from "@/app/actions/processTransparencyNotice";
import { appendEvidence } from "@/lib/evidence/evidence-layer";
import { SystemSelector } from "@/components/compliance/SystemSelector";
import { useT, useLocale } from "@/i18n/LocaleProvider";

type TFn = (key: string) => string;

const card = { background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" };

const ART13_FIELD_IDS = [
  "provider_identity",
  "performance_specs",
  "training_data_specs",
  "accuracy_metrics",
  "human_oversight_required",
  "lifecycle_updates",
] as const;

function buildArt13Fields(t: TFn) {
  return ART13_FIELD_IDS.map((id) => ({
    id,
    label: t(`art13_${id}_label`),
    placeholder: t(`art13_${id}_ph`),
  }));
}

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
              style={{ background: "#0D1016" }} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Confidence gauge ─────────────────────────────────────────────────────────
function ConfidenceGauge({ value, uncertain, t }: { value: number; uncertain: boolean; t: TFn }) {
  const pct = value * 100;
  const color = uncertain ? "#ca8a04" : value > 0.8 ? "#16a34a" : value > 0.65 ? "#0D1016" : "#ca8a04";
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-[10px]" style={{ color: "rgba(0,0,0,0.4)" }}>{t("confidence")}</span>
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
          {t("uncertaintyZoneReview")}
        </p>
      )}
    </div>
  );
}

// ─── Decision card ────────────────────────────────────────────────────────────
function DecisionCard({ dec, active, onClick, t, loc }: { dec: DecisionExplanation; active: boolean; onClick: () => void; t: TFn; loc: string }) {
  const colors = { APPROVED: { bg: "rgba(22,163,74,0.08)", text: "#16a34a", border: "rgba(22,163,74,0.2)" },
                   REJECTED: { bg: "rgba(220,38,38,0.08)", text: "#dc2626", border: "rgba(220,38,38,0.2)" },
                   REVIEW:   { bg: "rgba(202,138,4,0.08)",  text: "#ca8a04", border: "rgba(202,138,4,0.2)"  } };
  const c = colors[dec.output];
  return (
    <button onClick={onClick} className="w-full text-left rounded-xl p-3.5 transition-all"
      style={{ ...card, border: active ? "1px solid rgba(13,16,22,0.25)" : "1px solid rgba(0,0,0,0.07)", background: active ? "rgba(13,16,22,0.04)" : "#fff" }}>
      <div className="flex items-start justify-between mb-1.5">
        <span className="text-[11px] font-medium" style={{ color: "#0D1016" }}>{dec.inferenceId}</span>
        <span className="text-[10px] px-2 py-0.5 rounded font-semibold"
          style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
          {dec.output}
        </span>
      </div>
      <p className="text-[10px]" style={{ color: "rgba(0,0,0,0.4)" }}>
        {dec.timestamp.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" })} · {(dec.confidence * 100).toFixed(0)}% {t("confAbbr")}
      </p>
      {dec.uncertaintyZone && (
        <p className="text-[9px] mt-1" style={{ color: "#ca8a04" }}>⚠ {t("uncertaintyZone")}</p>
      )}
    </button>
  );
}

// ─── Explainability view ──────────────────────────────────────────────────────
function ExplainView({ dec, confirmed, onConfirm, t }: {
  dec: DecisionExplanation;
  confirmed: boolean;
  onConfirm: (id: string, value: boolean) => void;
  t: TFn;
}) {
  const [expanded, setExpanded] = useState(false);
  const maxShap = Math.max(...dec.features.map((f) => f.absInfluence));

  const outputColor = { APPROVED: "#16a34a", REJECTED: "#dc2626", REVIEW: "#ca8a04" }[dec.output];

  return (
    <motion.div key={dec.inferenceId} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>

      {/* Output + confidence */}
      <div className="rounded-xl p-4 mb-4" style={card}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] font-semibold uppercase mb-0.5" style={{ color: "rgba(0,0,0,0.3)", letterSpacing: "1px" }}>
              {t("decisionLabel")} — {dec.inferenceId}
            </p>
            <p className="text-[22px] font-semibold" style={{ color: outputColor, letterSpacing: "-0.5px" }}>{dec.output}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px]" style={{ color: "rgba(0,0,0,0.35)" }}>{t("model")} {dec.modelVersion}</p>
            <p className="text-[10px]" style={{ color: "rgba(0,0,0,0.35)" }}>{t("op")} {dec.operatorId}</p>
          </div>
        </div>
        <ConfidenceGauge value={dec.confidence} uncertain={dec.uncertaintyZone} t={t} />
      </div>

      {/* Short explanation — progressive disclosure */}
      <div className="rounded-xl p-4 mb-4" style={card}>
        <p className="text-[10px] font-semibold uppercase mb-2" style={{ color: "rgba(0,0,0,0.3)", letterSpacing: "1px" }}>
          {t("explanationArt86")}
        </p>
        <p className="text-[13px] leading-relaxed" style={{ color: "#0D1016" }}>{dec.shortExplanation}</p>

        <button onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 mt-3 text-[11px] transition-opacity hover:opacity-70"
          style={{ color: "rgba(0,0,0,0.45)" }}>
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          {expanded ? t("hideTechnical") : t("expandForAuditor")}
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
            {t("featureInfluence")}
          </p>
          <div className="flex items-center gap-3 text-[9px]" style={{ color: "rgba(0,0,0,0.35)" }}>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-400 inline-block" />{t("negative")}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ background: "#0D1016" }} />{t("positive")}</span>
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
                  style={{ color: f.direction === "positive" ? "#0D1016" : f.direction === "negative" ? "#dc2626" : "rgba(0,0,0,0.4)" }}>
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
          <input type="checkbox" checked={confirmed}
            onChange={(e) => onConfirm(dec.inferenceId, e.target.checked)}
            className="mt-0.5" />
          <div>
            <p className="text-[12px] font-medium" style={{ color: "#0D1016" }}>
              {t("confirmUnderstood")}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "rgba(0,0,0,0.42)" }}>
              {t("confirmUnderstoodDesc")}
            </p>
          </div>
        </label>
        {confirmed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="mt-3 flex items-center gap-2 text-[11px]" style={{ color: "#16a34a" }}>
            <CheckCircle className="h-3.5 w-3.5" />
            {t("understandingConfirmed")}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Nutrition Label ──────────────────────────────────────────────────────────
function NutritionView({ onDownload, t }: { onDownload: () => void; t: TFn }) {
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
              <p className="text-[10px] font-semibold uppercase" style={{ color: "rgba(0,0,0,0.4)", letterSpacing: "0.8px" }}>{t("riskClass")}</p>
              <p className="text-[13px] font-semibold mt-0.5" style={{ color: "#dc2626" }}>{nl.riskClass}</p>
            </div>
            <span className="text-[9px] px-2 py-1 rounded font-semibold"
              style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.2)" }}>
              {t("annexIII4")}
            </span>
          </div>

          {/* Accuracy */}
          <div className="pb-4" style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
            <p className="text-[10px] font-semibold uppercase mb-2" style={{ color: "rgba(0,0,0,0.4)", letterSpacing: "0.8px" }}>{t("accuracy")}</p>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-[20px] font-semibold" style={{ color: "#0D1016", letterSpacing: "-0.5px" }}>
                  {(nl.measuredAccuracy * 100).toFixed(1)}%
                </p>
                <p className="text-[9px]" style={{ color: "rgba(0,0,0,0.4)" }}>{t("measured")}</p>
              </div>
              <div className="text-[11px]" style={{ color: "rgba(0,0,0,0.3)" }}>vs</div>
              <div>
                <p className="text-[20px] font-semibold" style={{ color: "rgba(0,0,0,0.35)", letterSpacing: "-0.5px" }}>
                  {(nl.declaredAccuracy * 100).toFixed(0)}%
                </p>
                <p className="text-[9px]" style={{ color: "rgba(0,0,0,0.4)" }}>{t("declared")}</p>
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
            <p className="text-[10px] font-semibold uppercase mb-2" style={{ color: "rgba(0,0,0,0.4)", letterSpacing: "0.8px" }}>{t("trainingData")}</p>
            {nl.trainingDataSources.map((s) => (
              <p key={s} className="text-[11px] mb-0.5" style={{ color: "#0D1016" }}>· {s}</p>
            ))}
          </div>

          {/* Limits */}
          <div>
            <p className="text-[10px] font-semibold uppercase mb-2" style={{ color: "rgba(0,0,0,0.4)", letterSpacing: "0.8px" }}>{t("knownLimits")}</p>
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
            {nl.annexIVRef} · {t("auditLabel")} {nl.lastAudit}
          </span>
          <button
            onClick={onDownload}
            className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded transition-opacity hover:opacity-70"
            style={{ background: "#0D1016", color: "#fff" }}>
            <Download className="h-3 w-3" /> {t("download")}
          </button>
        </div>
      </div>

      {/* Input requirements + forbidden use */}
      <div className="space-y-4">
        <div className="rounded-xl p-4" style={card}>
          <p className="text-[10px] font-semibold uppercase mb-3" style={{ color: "rgba(0,0,0,0.3)", letterSpacing: "1px" }}>
            {t("inputRequirements")}
          </p>
          {nl.inputRequirements.map((r) => (
            <div key={r} className="flex items-start gap-2 mb-2">
              <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: "#0D1016" }} />
              <span className="text-[11px]" style={{ color: "#0D1016" }}>{r}</span>
            </div>
          ))}
        </div>

        <div className="rounded-xl p-4" style={card}>
          <p className="text-[10px] font-semibold uppercase mb-3" style={{ color: "rgba(0,0,0,0.3)", letterSpacing: "1px" }}>
            {t("performanceLimits")}
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
            {t("forbiddenUses")}
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
function InstructionsView({ t }: { t: TFn }) {
  const ins = INSTRUCTIONS;
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="space-y-4">
        <div className="rounded-xl p-4" style={card}>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="h-4 w-4" style={{ color: "#16a34a" }} />
            <p className="text-[12px] font-semibold" style={{ color: "#0D1016" }}>{t("operatorObligations")}</p>
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
            <p className="text-[12px] font-semibold" style={{ color: "#0D1016" }}>{t("operationalProhibitions")}</p>
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
            <p className="text-[12px] font-semibold" style={{ color: "#0D1016" }}>{t("humanOversightRequired")}</p>
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
            {t("instructionsVersion")}
          </p>
          {[
            [t("systemVersion"), ins.version],
            [t("linkedCommit"), ins.commitSha],
            [t("uncertaintyThreshold"), `${ins.uncertaintyThreshold * 100}%`],
            [t("generatedBy"), "DocuGen AI — Art. 11"],
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
  const t = useT("toolTransparency");
  const locale = useLocale();
  const loc = locale === "it" ? "it-IT" : "en-GB";
  const ART13_FIELDS = buildArt13Fields(t);
  const [tab,        setTab]        = useState<Tab>("explain");
  const [selectedId, setSelectedId] = useState(0);
  const [customSeed, setCustomSeed] = useState<number | null>(null);
  const [toast,      setToast]      = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [confirmedDecisions, setConfirmedDecisions] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = localStorage.getItem("transparency_confirmed_decisions");
      return raw ? new Set<string>(JSON.parse(raw) as string[]) : new Set<string>();
    } catch { return new Set<string>(); }
  });
  const [savedAt,    setSavedAt]    = useState<string | null>(() =>
    readFromStorage<TransparencyResult>("transparency")?.completedAt ?? null
  );
  const [classifierData, setClassifierData] = useState<{ riskLevel?: string; systemName?: string } | null>(null);
  const [art13Fields, setArt13Fields] = useState<Record<string, string>>({});
  // AG Part 4 — Transparency notice evaluation
  const [noticeLoading, setNoticeLoading] = useState(false);
  const [noticeResult, setNoticeResult] = useState<TransparencyNoticeResult | null>(null);
  const [noticeError, setNoticeError] = useState<string | null>(null);

  useEffect(() => {
    const cls = readFromStorage<ClassifierResult>("classifier");
    const ovs = readFromStorage<OversightResult>("oversight");
    const res = readFromStorage<ResilienceResult>("resilience");
    if (cls) setClassifierData({ riskLevel: cls.riskLevel, systemName: cls.systemName });
    const pre: Record<string, string> = {};
    if (ovs?.responsiblePersons?.length) {
      pre.human_oversight_required = ovs.responsiblePersons.join(", ");
    }
    if (res?.accuracyMetric) {
      pre.accuracy_metrics = `${res.accuracyMetric}%`;
    }
    if (Object.keys(pre).length) setArt13Fields(pre);
  }, []);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function handleConfirm(inferenceId: string, value: boolean) {
    setConfirmedDecisions((prev) => {
      const next = new Set(prev);
      if (value) next.add(inferenceId);
      else next.delete(inferenceId);
      localStorage.setItem("transparency_confirmed_decisions", JSON.stringify([...next]));
      return next;
    });
    if (value) {
      appendEvidence(
        "decision",
        {
          type: "Supervisione umana confermata — Art. 14",
          inferenceId,
          confirmedAt: new Date().toISOString(),
          operator: "operatore_corrente",
        },
        "transparency"
      );
      showToast(`${t("toastUnderstoodFor")} ${inferenceId}`);
    }
  }

  function saveToDossier() {
    const completedAt = new Date().toISOString();
    writeToStorage<TransparencyResult>("transparency", {
      userInformedOfAI: true,
      informationProvided: NUTRITION_LABEL.inputRequirements,
      contactPoint: "compliance@azienda.eu",
      languagesAvailable: ["italiano", "inglese"],
      completedAt,
    });
    appendEvidence(
      "decision",
      {
        type: "Transparency & XAI — Configurazione Art. 13",
        systemName: NUTRITION_LABEL.systemName,
        riskClass: NUTRITION_LABEL.riskClass,
        measuredAccuracy: NUTRITION_LABEL.measuredAccuracy,
        declaredAccuracy: NUTRITION_LABEL.declaredAccuracy,
        confirmedDecisionsCount: confirmedDecisions.size,
        confirmedDecisionIds: [...confirmedDecisions],
        modelVersion: NUTRITION_LABEL.modelVersion,
        lastAudit: NUTRITION_LABEL.lastAudit,
        savedAt: completedAt,
      },
      "transparency"
    );
    setSavedAt(completedAt);
    showToast(t("toastSaved"));
  }

  function downloadNutritionLabel() {
    const blob = new Blob([JSON.stringify(NUTRITION_LABEL, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `ai-nutrition-label-${NUTRITION_LABEL.systemName.replace(/\s+/g, "_").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(t("toastExported"));
  }

  const allDecisions = customSeed !== null
    ? [generateExplanation(customSeed), ...SAMPLE_DECISIONS]
    : SAMPLE_DECISIONS;

  const selected = allDecisions[selectedId];

  return (
    <div className="w-full" style={{ fontFamily: "var(--font-inter, system-ui)" }}>

      <SystemSelector checkProhibited={true} />

      {/* Dossier saved banner */}
      {savedAt ? (
        <div className="flex items-center gap-2 rounded-lg px-4 py-2.5 mb-5 text-[12px]"
          style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)" }}>
          <span style={{ color: "#15803d" }}>✓ {t("dossierSaved")} · {t("dossierUpdatedOn")} {new Date(savedAt).toLocaleDateString(loc)}</span>
          <Link href="/dashboard/dossier" className="ml-auto text-[11px] font-medium hover:opacity-70 transition-opacity" style={{ color: "#15803d" }}>{t("seeDossier")}</Link>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg px-4 py-2.5 mb-5 text-[12px]"
          style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)" }}>
          <span style={{ color: "rgba(0,0,0,0.45)" }}>{t("saveToDossierHint")}</span>
          <button onClick={saveToDossier} className="text-[11px] font-medium rounded-full px-3 py-1 transition-opacity hover:opacity-80"
            style={{ background: "#0D1016", color: "#ffffff", border: "none", cursor: "pointer" }}>
            {t("saveToDossier")}
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase mb-1"
            style={{ color: "rgba(0,0,0,0.3)", letterSpacing: "1.2px" }}>{t("headerKicker")}</p>
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
        {([["explain", t("tabExplain")], ["nutrition", t("tabNutrition")], ["instructions", t("tabInstructions")]] as [Tab, string][]).map(([tabId, label]) => (
          <button key={tabId} onClick={() => setTab(tabId)}
            className="text-[12px] px-4 py-2 rounded-full transition-all"
            style={tab === tabId
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
              style={{ color: "rgba(0,0,0,0.3)", letterSpacing: "1px" }}>{t("recentDecisions")}</p>
            {allDecisions.map((d, i) => (
              <DecisionCard key={d.inferenceId} dec={d} active={i === selectedId}
                onClick={() => setSelectedId(i)} t={t} loc={loc} />
            ))}
            <button
              onClick={() => { const s = Math.floor(Math.random() * 100); setCustomSeed(s); setSelectedId(0); }}
              className="w-full text-[11px] py-2 rounded-xl transition-opacity hover:opacity-70"
              style={{ background: "#f5f5f4", border: "1px solid rgba(0,0,0,0.08)", color: "rgba(0,0,0,0.45)" }}>
              {t("loadNewDecision")}
            </button>
          </div>

          {/* Explanation detail */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <ExplainView
                key={selected.inferenceId}
                dec={selected}
                confirmed={confirmedDecisions.has(selected.inferenceId)}
                onConfirm={handleConfirm}
                t={t}
              />
            </AnimatePresence>
          </div>
        </div>
      )}

      {tab === "nutrition"    && <NutritionView onDownload={downloadNutritionLabel} t={t} />}
      {tab === "instructions" && <InstructionsView t={t} />}

      {/* XAI Center promo */}
      <div
        className="mt-8 rounded-xl p-4 flex items-center gap-3"
        style={{ background: "rgba(13,16,22,0.03)", border: "1px solid rgba(13,16,22,0.10)" }}
      >
        <div className="rounded-lg p-2 flex-shrink-0" style={{ background: "rgba(13,16,22,0.07)" }}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "#0D1016" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium" style={{ color: "#0D1016" }}>{t("xaiPromoTitle")}</p>
          <p className="text-[11px] mt-0.5" style={{ color: "rgba(0,0,0,0.45)" }}>
            {t("xaiPromoDesc")}
          </p>
        </div>
        <a
          href="/dashboard/modules/xai"
          className="flex-shrink-0 flex items-center gap-1 text-[11px] font-medium rounded-full px-3 py-1.5"
          style={{ background: "#0D1016", color: "#ffffff" }}
        >
          {t("goToModule")}
        </a>
      </div>

      {/* Art. 13(3) — only for high-risk systems */}
      {(classifierData?.riskLevel === "high" || classifierData?.riskLevel === "High") && (
        <div style={{ marginTop: 28, padding: 20, borderRadius: 10, border: "1px solid rgba(220,38,38,0.18)", background: "rgba(220,38,38,0.03)" }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "rgba(220,38,38,0.7)", marginBottom: 16, margin: "0 0 16px" }}>
            {t("art13SectionTitle")}
          </p>
          {ART13_FIELDS.map((field) => (
            <div key={field.id} style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: "#0D1016", display: "block", marginBottom: 4 }}>
                {field.label}
              </label>
              <textarea
                value={art13Fields[field.id] ?? ""}
                onChange={(e) => setArt13Fields((prev) => ({ ...prev, [field.id]: e.target.value }))}
                placeholder={field.placeholder}
                rows={2}
                style={{
                  width: "100%", padding: "7px 10px", borderRadius: 8,
                  border: "1px solid rgba(0,0,0,0.07)", fontSize: 12,
                  resize: "vertical" as const, fontFamily: "inherit", background: "#fff",
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* AG Part 4 — Art. 13 Notice Evaluator */}
      {(classifierData?.riskLevel === "high" || classifierData?.riskLevel === "High") && Object.keys(art13Fields).length > 1 && (
        <div style={{ marginTop: 20, padding: 18, borderRadius: 10, border: "1px solid rgba(0,0,0,0.09)", background: "rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FileSearch size={15} style={{ color: "rgba(0,0,0,0.4)" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#0D1016" }}>✦ {t("noticeAnalyzerTitle")}</span>
            </div>
            <button
              disabled={noticeLoading}
              onClick={async () => {
                setNoticeLoading(true);
                setNoticeError(null);
                setNoticeResult(null);
                const res = await processTransparencyNotice(art13Fields, classifierData?.systemName ?? "Sistema AI");
                setNoticeLoading(false);
                if (res.error) setNoticeError(res.error);
                else setNoticeResult(res.result);
              }}
              style={{
                padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: noticeLoading ? "rgba(0,0,0,0.07)" : "#0D1016",
                color: noticeLoading ? "rgba(0,0,0,0.4)" : "#fff",
                border: "none", cursor: noticeLoading ? "not-allowed" : "pointer",
              }}
            >
              {noticeLoading ? t("analyzing") : `✦ ${t("analyzeNotice")}`}
            </button>
          </div>
          {noticeError && <p style={{ fontSize: 11, color: "#dc2626" }}>{t("analysisError")}</p>}
          {noticeResult && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  background: noticeResult.art13Score >= 80 ? "rgba(22,163,74,0.1)" : noticeResult.art13Score >= 50 ? "rgba(202,138,4,0.1)" : "rgba(220,38,38,0.1)",
                  border: `2px solid ${noticeResult.art13Score >= 80 ? "rgba(22,163,74,0.4)" : noticeResult.art13Score >= 50 ? "rgba(202,138,4,0.4)" : "rgba(220,38,38,0.4)"}`,
                }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: noticeResult.art13Score >= 80 ? "#15803d" : noticeResult.art13Score >= 50 ? "#92400e" : "#dc2626" }}>
                    {noticeResult.art13Score}
                  </span>
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#0D1016", margin: 0 }}>{t("scoreArt13")} {noticeResult.art13Score}/100</p>
                  <p style={{ fontSize: 11, color: "rgba(0,0,0,0.45)", margin: 0 }}>{noticeResult.overallAssessment}</p>
                </div>
              </div>
              {noticeResult.missingFields.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#dc2626", marginBottom: 6 }}>{t("missingFieldsLabel")}</p>
                  {noticeResult.missingFields.map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 6, padding: "6px 10px", borderRadius: 7, background: f.priority === "obbligatorio" ? "rgba(220,38,38,0.05)" : "rgba(202,138,4,0.05)", border: `1px solid ${f.priority === "obbligatorio" ? "rgba(220,38,38,0.18)" : "rgba(202,138,4,0.18)"}` }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: f.priority === "obbligatorio" ? "rgba(220,38,38,0.15)" : "rgba(202,138,4,0.15)", color: f.priority === "obbligatorio" ? "#dc2626" : "#92400e", whiteSpace: "nowrap" }}>
                        {f.priority === "obbligatorio" ? t("badgeReq") : t("badgeRec")}
                      </span>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 600, color: "#0D1016", margin: 0 }}>{f.field}</p>
                        <p style={{ fontSize: 10, color: "rgba(0,0,0,0.45)", margin: 0 }}>{f.article} — {f.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p style={{ fontSize: 10, color: "rgba(0,0,0,0.35)", marginTop: 8 }}>✦ {t("aiVerify")}</p>
            </div>
          )}
        </div>
      )}

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
