"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertOctagon, AlertTriangle, CheckCircle, HelpCircle,
  ChevronRight, ChevronDown, ChevronUp, ArrowLeft, Printer,
} from "lucide-react";
import {
  PROHIBITED_CHECKS,
  calculateVerdict,
  type CheckAnswer,
  type FinalVerdict,
} from "@/lib/simulation/prohibited-practices-engine";

// ─── Design tokens ────────────────────────────────────────────────────────────
const card = {
  background: "#ffffff",
  border: "1px solid rgba(0,0,0,0.07)",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};
const font = { fontFamily: "var(--font-inter, system-ui)" };

// ─── Answer button config ─────────────────────────────────────────────────────
const ANSWER_OPTS: {
  value: CheckAnswer;
  label: string;
  activeStyle: React.CSSProperties;
  idleStyle: React.CSSProperties;
}[] = [
  {
    value: "no",
    label: "✓  No, il mio sistema non fa questo",
    activeStyle: { background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.5)", color: "#15803d" },
    idleStyle:   { background: "#fafafa", border: "1px solid rgba(0,0,0,0.08)", color: "rgba(0,0,0,0.65)" },
  },
  {
    value: "yes",
    label: "✕  Sì, il mio sistema potrebbe farlo",
    activeStyle: { background: "rgba(220,38,38,0.07)", border: "1.5px solid rgba(220,38,38,0.45)", color: "#b91c1c" },
    idleStyle:   { background: "#fafafa", border: "1px solid rgba(0,0,0,0.08)", color: "rgba(0,0,0,0.65)" },
  },
  {
    value: "unsure",
    label: "?  Non sono sicuro",
    activeStyle: { background: "rgba(202,138,4,0.07)", border: "1.5px solid rgba(202,138,4,0.4)", color: "#a16207" },
    idleStyle:   { background: "#fafafa", border: "1px solid rgba(0,0,0,0.08)", color: "rgba(0,0,0,0.65)" },
  },
];

// ─── Status dot for sidebar ───────────────────────────────────────────────────
function StatusDot({ answer }: { answer: CheckAnswer }) {
  if (answer === "no")
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold flex-shrink-0"
        style={{ background: "rgba(22,163,74,0.1)", color: "#15803d" }}>✓</span>
    );
  if (answer === "yes")
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold flex-shrink-0"
        style={{ background: "rgba(220,38,38,0.1)", color: "#b91c1c" }}>✕</span>
    );
  if (answer === "unsure")
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold flex-shrink-0"
        style={{ background: "rgba(202,138,4,0.1)", color: "#a16207" }}>?</span>
    );
  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-full flex-shrink-0"
      style={{ border: "1.5px solid rgba(0,0,0,0.15)" }} />
  );
}

// ─── Verdict banner meta ──────────────────────────────────────────────────────
import type { LucideProps } from "lucide-react";

const VERDICT_META: Record<
  FinalVerdict["verdict"],
  { bg: string; border: string; color: string; label: string; Icon: React.FC<LucideProps> }
> = {
  violation: {
    bg: "rgba(220,38,38,0.05)", border: "rgba(220,38,38,0.2)", color: "#b91c1c",
    label: "VIOLAZIONE RILEVATA",
    Icon: AlertOctagon,
  },
  potential_violation: {
    bg: "rgba(234,88,12,0.05)", border: "rgba(234,88,12,0.2)", color: "#c2410c",
    label: "RISCHIO POTENZIALE",
    Icon: AlertTriangle,
  },
  clear: {
    bg: "rgba(22,163,74,0.05)", border: "rgba(22,163,74,0.2)", color: "#15803d",
    label: "NESSUNA VIOLAZIONE",
    Icon: CheckCircle,
  },
  conditional: {
    bg: "rgba(202,138,4,0.05)", border: "rgba(202,138,4,0.2)", color: "#a16207",
    label: "VALUTAZIONE INCOMPLETA",
    Icon: HelpCircle,
  },
};

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ProhibitedPage() {
  const [answers, setAnswers]       = useState<Record<string, CheckAnswer>>({});
  const [activeCheck, setActiveCheck] = useState(0);
  const [mode, setMode]             = useState<"checklist" | "result">("checklist");
  const [verdict, setVerdict]       = useState<FinalVerdict | null>(null);
  const [clearOpen, setClearOpen]   = useState(false);

  const total     = PROHIBITED_CHECKS.length;
  const answered  = Object.values(answers).filter((v) => v !== null).length;
  const allDone   = answered === total;
  const check     = PROHIBITED_CHECKS[activeCheck];

  function setAnswer(id: string, val: CheckAnswer) {
    setAnswers((prev) => ({ ...prev, [id]: val }));
  }

  function handleCalcVerdict() {
    const results = PROHIBITED_CHECKS.map((c) => ({
      checkId: c.id,
      answer: answers[c.id] ?? null,
    }));
    setVerdict(calculateVerdict(PROHIBITED_CHECKS, results));
    setMode("result");
  }

  // ── Checklist mode ──────────────────────────────────────────────────────────
  if (mode === "checklist") {
    return (
      <div className="max-w-5xl" style={font}>
        {/* Page header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 style={{ fontSize: "28px", fontWeight: 400, letterSpacing: "-1px", color: "#0D1016" }}>
              Pratiche Vietate — Art. 5
            </h1>
            <span
              className="text-[10px] font-semibold rounded-full px-2.5 py-1 uppercase"
              style={{ background: "rgba(220,38,38,0.1)", color: "#b91c1c", letterSpacing: "0.5px" }}
            >
              In vigore dal 2 feb 2025
            </span>
          </div>
          <p className="text-[13px]" style={{ color: "rgba(0,0,0,0.42)" }}>
            Verifica se il tuo sistema AI ricade nelle pratiche vietate in assoluto dal Regolamento UE 2024/1689.
            Sanzioni fino a <strong style={{ color: "#0D1016" }}>35M€</strong> o il{" "}
            <strong style={{ color: "#0D1016" }}>7% del fatturato globale</strong>.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">

          {/* ── Left: sidebar nav ── */}
          <div className="lg:col-span-1">
            <div className="rounded-xl overflow-hidden" style={card}>
              <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                <p className="text-[11px] font-semibold" style={{ color: "rgba(0,0,0,0.35)", letterSpacing: "0.5px" }}>
                  {answered} / {total} valutate
                </p>
                <div className="mt-1.5 h-1 rounded-full" style={{ background: "rgba(0,0,0,0.06)" }}>
                  <div
                    className="h-1 rounded-full transition-all duration-300"
                    style={{ width: `${(answered / total) * 100}%`, background: "#0D1016" }}
                  />
                </div>
              </div>
              <nav className="py-1">
                {PROHIBITED_CHECKS.map((c, i) => {
                  const isActive = i === activeCheck;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setActiveCheck(i)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-all"
                      style={{
                        background: isActive ? "rgba(59,130,246,0.05)" : "transparent",
                        borderLeft: isActive ? "2px solid #3b82f6" : "2px solid transparent",
                        cursor: "pointer",
                      }}
                    >
                      <StatusDot answer={answers[c.id] ?? null} />
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-[11px] font-medium truncate"
                          style={{ color: isActive ? "#0D1016" : "rgba(0,0,0,0.55)" }}
                        >
                          {c.title}
                        </p>
                        <p className="text-[10px]" style={{ color: "rgba(0,0,0,0.3)" }}>{c.article}</p>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* ── Right: question area ── */}
          <div className="lg:col-span-2">
            <div className="rounded-xl p-6" style={card}>
              {/* Progress + article badge */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px]" style={{ color: "rgba(0,0,0,0.3)" }}>
                  {activeCheck + 1} / {total}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-medium rounded px-2 py-0.5"
                    style={{ background: "rgba(220,38,38,0.08)", color: "#b91c1c" }}
                  >
                    {check.article}
                  </span>
                  {check.severity === "conditional" && (
                    <span
                      className="text-[10px] font-medium rounded px-2 py-0.5"
                      style={{ background: "rgba(202,138,4,0.08)", color: "#a16207" }}
                    >
                      Eccezioni previste
                    </span>
                  )}
                </div>
              </div>

              {/* Title + description */}
              <h2
                className="mb-2"
                style={{ fontSize: "18px", fontWeight: 500, letterSpacing: "-0.4px", color: "#0D1016" }}
              >
                {check.title}
              </h2>
              <p className="text-[12px] mb-4 leading-relaxed" style={{ color: "rgba(0,0,0,0.45)" }}>
                {check.description}
              </p>

              {/* Question box */}
              <div
                className="rounded-lg px-4 py-3 mb-5"
                style={{ background: "#fffbeb", border: "1px solid rgba(217,119,6,0.2)" }}
              >
                <p className="text-[13px] font-medium leading-relaxed" style={{ color: "#0D1016" }}>
                  {check.question}
                </p>
              </div>

              {/* Answer buttons */}
              <div className="flex flex-col gap-2 mb-5">
                {ANSWER_OPTS.map((opt) => {
                  const selected = answers[check.id] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setAnswer(check.id, opt.value)}
                      className="w-full text-left px-4 rounded-xl text-[13px] font-medium transition-all duration-150"
                      style={{
                        minHeight: 56,
                        ...(selected ? opt.activeStyle : opt.idleStyle),
                        cursor: "pointer",
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* Examples */}
              <details className="group mb-3">
                <summary
                  className="flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer select-none"
                  style={{ color: "rgba(0,0,0,0.35)", listStyle: "none" }}
                >
                  <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                  Esempi di sistemi in violazione
                </summary>
                <ul className="mt-2 flex flex-col gap-1 pl-4">
                  {check.exampleSystems.map((ex, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12px]" style={{ color: "rgba(0,0,0,0.55)" }}>
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: "#b91c1c" }} />
                      {ex}
                    </li>
                  ))}
                </ul>
              </details>

              {/* Exceptions (conditional only) */}
              {check.severity === "conditional" && check.exceptions.length > 0 && (
                <details className="group mb-3">
                  <summary
                    className="flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer select-none"
                    style={{ color: "rgba(0,0,0,0.35)", listStyle: "none" }}
                  >
                    <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                    Eccezioni previste dalla legge
                  </summary>
                  <ul className="mt-2 flex flex-col gap-1 pl-4">
                    {check.exceptions.map((ex, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12px]" style={{ color: "rgba(0,0,0,0.55)" }}>
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: "#15803d" }} />
                        {ex}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-6 pt-4" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                <button
                  onClick={() => setActiveCheck((p) => Math.max(0, p - 1))}
                  disabled={activeCheck === 0}
                  className="flex items-center gap-1.5 text-[12px] transition-opacity disabled:opacity-30"
                  style={{ color: "rgba(0,0,0,0.45)", background: "none", border: "none", cursor: activeCheck === 0 ? "not-allowed" : "pointer", padding: 0 }}
                >
                  <ArrowLeft size={13} /> Precedente
                </button>

                {activeCheck < total - 1 ? (
                  <button
                    onClick={() => setActiveCheck((p) => Math.min(total - 1, p + 1))}
                    disabled={!answers[check.id]}
                    className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-medium transition-all disabled:opacity-30"
                    style={{
                      background: answers[check.id] ? "#0D1016" : "rgba(0,0,0,0.08)",
                      color: answers[check.id] ? "#ffffff" : "rgba(0,0,0,0.3)",
                      border: "none",
                      cursor: answers[check.id] ? "pointer" : "not-allowed",
                    }}
                  >
                    Successivo <ChevronRight size={13} />
                  </button>
                ) : (
                  <button
                    onClick={handleCalcVerdict}
                    disabled={!allDone}
                    className="flex items-center gap-1.5 rounded-full px-5 py-1.5 text-[12px] font-medium transition-all disabled:opacity-30"
                    style={{
                      background: allDone ? "#3b82f6" : "rgba(0,0,0,0.08)",
                      color: allDone ? "#ffffff" : "rgba(0,0,0,0.3)",
                      border: "none",
                      cursor: allDone ? "pointer" : "not-allowed",
                    }}
                  >
                    Calcola verdetto <ChevronRight size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Result mode ─────────────────────────────────────────────────────────────
  if (!verdict) return null;
  const vm = VERDICT_META[verdict.verdict];

  return (
    <div className="max-w-5xl" style={font}>
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 style={{ fontSize: "28px", fontWeight: 400, letterSpacing: "-1px", color: "#0D1016" }}>
            Pratiche Vietate — Art. 5
          </h1>
          <span
            className="text-[10px] font-semibold rounded-full px-2.5 py-1 uppercase"
            style={{ background: "rgba(220,38,38,0.1)", color: "#b91c1c", letterSpacing: "0.5px" }}
          >
            In vigore dal 2 feb 2025
          </span>
        </div>
        <p className="text-[13px]" style={{ color: "rgba(0,0,0,0.42)" }}>
          Valutazione completata il{" "}
          {new Date(verdict.generatedAt).toLocaleString("it-IT", {
            day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
          })}
        </p>
      </div>

      {/* Verdict banner */}
      <div
        className="rounded-xl p-5 mb-5 flex items-start gap-4"
        style={{ background: vm.bg, border: `1px solid ${vm.border}` }}
      >
        <vm.Icon size={22} strokeWidth={1.5} style={{ color: vm.color, flexShrink: 0, marginTop: 1 }} />
        <div className="flex-1">
          <p className="text-[11px] font-semibold uppercase mb-1" style={{ color: vm.color, letterSpacing: "0.8px" }}>
            {vm.label}
          </p>
          <p className="text-[13px] leading-relaxed mb-3" style={{ color: "#0D1016" }}>
            {verdict.summaryText}
          </p>
          <div
            className="rounded-lg px-4 py-3"
            style={{ background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.07)" }}
          >
            <p className="text-[11px] font-semibold uppercase mb-0.5" style={{ color: "rgba(0,0,0,0.35)", letterSpacing: "0.5px" }}>
              Azione raccomandata
            </p>
            <p className="text-[12px]" style={{ color: "#0D1016" }}>{verdict.recommendedAction}</p>
          </div>
        </div>
      </div>

      {/* Violated checks */}
      {verdict.violatedChecks.length > 0 && (
        <section className="mb-4">
          <p className="text-[11px] font-semibold uppercase mb-2" style={{ color: "#b91c1c", letterSpacing: "0.8px" }}>
            🚫 Pratiche vietate rilevate ({verdict.violatedChecks.length})
          </p>
          <div className="flex flex-col gap-2">
            {verdict.violatedChecks.map((c) => (
              <div
                key={c.id}
                className="rounded-xl p-4"
                style={{ background: "rgba(220,38,38,0.04)", border: "1px solid rgba(220,38,38,0.15)" }}
              >
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[13px] font-semibold" style={{ color: "#0D1016" }}>{c.title}</span>
                  <span
                    className="text-[10px] font-medium rounded px-1.5 py-0.5"
                    style={{ background: "rgba(220,38,38,0.1)", color: "#b91c1c" }}
                  >
                    {c.article}
                  </span>
                </div>
                <p className="text-[12px] mb-2 leading-relaxed" style={{ color: "rgba(0,0,0,0.55)" }}>
                  {c.description}
                </p>
                <p
                  className="text-[11px] font-semibold rounded px-2 py-1 inline-block"
                  style={{ background: "rgba(220,38,38,0.08)", color: "#b91c1c" }}
                >
                  Vietato in assoluto — nessuna eccezione
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Potential checks */}
      {verdict.potentialChecks.length > 0 && (
        <section className="mb-4">
          <p className="text-[11px] font-semibold uppercase mb-2" style={{ color: "#d97706", letterSpacing: "0.8px" }}>
            ⚠️ Aree di rischio da verificare ({verdict.potentialChecks.length})
          </p>
          <div className="flex flex-col gap-2">
            {verdict.potentialChecks.map((c) => (
              <div
                key={c.id}
                className="rounded-xl p-4"
                style={{ background: "rgba(202,138,4,0.04)", border: "1px solid rgba(202,138,4,0.15)" }}
              >
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[13px] font-semibold" style={{ color: "#0D1016" }}>{c.title}</span>
                  <span
                    className="text-[10px] font-medium rounded px-1.5 py-0.5"
                    style={{ background: "rgba(202,138,4,0.1)", color: "#a16207" }}
                  >
                    {c.article}
                  </span>
                  {c.severity === "conditional" && (
                    <span
                      className="text-[10px] font-medium rounded px-1.5 py-0.5"
                      style={{ background: "rgba(0,0,0,0.05)", color: "rgba(0,0,0,0.4)" }}
                    >
                      Eccezioni disponibili
                    </span>
                  )}
                </div>
                <p className="text-[12px] mb-2 leading-relaxed" style={{ color: "rgba(0,0,0,0.55)" }}>
                  {c.description}
                </p>
                {c.severity === "conditional" && c.exceptions.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold mb-1" style={{ color: "rgba(0,0,0,0.35)", letterSpacing: "0.5px" }}>
                      ECCEZIONI PREVISTE:
                    </p>
                    <ul className="flex flex-col gap-0.5">
                      {c.exceptions.map((ex, i) => (
                        <li key={i} className="flex items-start gap-2 text-[11px]" style={{ color: "rgba(0,0,0,0.5)" }}>
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: "#15803d" }} />
                          {ex}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Clear checks — collapsible */}
      {verdict.clearChecks.length > 0 && (
        <section className="mb-6">
          <button
            onClick={() => setClearOpen((p) => !p)}
            className="flex items-center gap-2 text-[11px] font-semibold uppercase mb-2 transition-opacity hover:opacity-70"
            style={{ color: "#15803d", letterSpacing: "0.8px", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            {clearOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            ✓ Aree conformi
            <span
              className="ml-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{ background: "rgba(22,163,74,0.1)", color: "#15803d" }}
            >
              {verdict.clearChecks.length} verificate
            </span>
          </button>
          {clearOpen && (
            <div className="flex flex-col gap-2">
              {verdict.clearChecks.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl px-4 py-3 flex items-center gap-3"
                  style={{ background: "rgba(22,163,74,0.04)", border: "1px solid rgba(22,163,74,0.12)" }}
                >
                  <CheckCircle size={14} strokeWidth={1.5} style={{ color: "#15803d", flexShrink: 0 }} />
                  <div>
                    <span className="text-[12px] font-medium" style={{ color: "#0D1016" }}>{c.title}</span>
                    <span
                      className="ml-2 text-[10px] rounded px-1.5 py-0.5"
                      style={{ background: "rgba(22,163,74,0.1)", color: "#15803d" }}
                    >
                      {c.article}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Footer actions */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 pt-4"
        style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
      >
        <div className="flex gap-2">
          <button
            onClick={() => setMode("checklist")}
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-medium transition-all hover:opacity-80"
            style={{ background: "rgba(0,0,0,0.05)", color: "rgba(0,0,0,0.6)", border: "none", cursor: "pointer" }}
          >
            <ArrowLeft size={12} /> Rivedi le risposte
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-medium transition-all hover:opacity-80"
            style={{ background: "rgba(0,0,0,0.05)", color: "rgba(0,0,0,0.6)", border: "none", cursor: "pointer" }}
          >
            <Printer size={12} /> Esporta report
          </button>
        </div>

        {verdict.verdict !== "violation" && (
          <Link
            href="/dashboard/tools/classifier"
            className="flex items-center gap-1.5 rounded-full px-5 py-2 text-[12px] font-medium transition-all hover:opacity-85"
            style={{ background: "#3b82f6", color: "#ffffff" }}
          >
            Procedi al Risk Manager <ChevronRight size={12} />
          </Link>
        )}
      </div>
    </div>
  );
}
