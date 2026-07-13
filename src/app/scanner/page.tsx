"use client";

import { useState, useRef, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Nav from "@/components/Nav";
import BookDemoBanner from "@/components/BookDemoBanner";
import ScannerTrustSection from "@/components/scanner/ScannerTrustSection";
import type { Art50ScanResult, Art50Signal, CriterionKey } from "@/lib/scanner/art50-detector";

// ─── Design constants ─────────────────────────────────────────────────────────
const SERIF = "Georgia, 'Times New Roman', serif";
const MONO  = "'DM Mono', monospace";

const GRADE_COLOR: Record<string, string> = {
  A: "#16a34a", B: "#374151", C: "#ca8a04", D: "#ea580c", F: "#dc2626",
};
const SEVERITY_COLORS = {
  critical: { border: "rgba(220,38,38,0.20)",  bg: "rgba(220,38,38,0.06)",  text: "#dc2626",  badge: "rgba(220,38,38,0.10)",  label: "CRITICO"   },
  warning:  { border: "rgba(180,83,9,0.20)",   bg: "rgba(180,83,9,0.06)",   text: "#b45309",  badge: "rgba(180,83,9,0.10)",   label: "ATTENZIONE" },
  ok:       { border: "rgba(22,163,74,0.20)",  bg: "rgba(22,163,74,0.06)",  text: "#16a34a",  badge: "rgba(22,163,74,0.10)",  label: "OK"         },
};
const RISK_COLORS = { alto: "#dc2626", medio: "#b45309", basso: "#16a34a" };

// ─── Radar chart helpers ──────────────────────────────────────────────────────
const RADAR_ORDER: CriterionKey[] = [
  "disclosure_present",
  "disclosure_visible",
  "machine_readable",
  "language_match",
  "synthetic_media",
];
const RADAR_LABELS = ["Disclosure", "Visibilità", "Machine-\nreadable", "Lingua", "Media"];
const CX = 150, CY = 150, R_MAX = 100, R_LABEL = 128;

function axisAngle(i: number) { return (-90 + i * 72) * (Math.PI / 180); }

function polygonPoints(ratios: number[], radius: number): string {
  return ratios
    .map((r, i) => {
      const a = axisAngle(i);
      return `${CX + radius * r * Math.cos(a)},${CY + radius * r * Math.sin(a)}`;
    })
    .join(" ");
}

function maxPolygon(r: number): string {
  return Array.from({ length: 5 }, (_, i) => {
    const a = axisAngle(i);
    return `${CX + r * Math.cos(a)},${CY + r * Math.sin(a)}`;
  }).join(" ");
}

function labelPos(i: number): { x: number; y: number } {
  const a = axisAngle(i);
  return { x: CX + R_LABEL * Math.cos(a), y: CY + R_LABEL * Math.sin(a) };
}

function RadarChart({ signals }: { signals: Art50Signal[] }) {
  const ratios = RADAR_ORDER.map(key => {
    const s = signals.find(sig => sig.criterion === key);
    return s ? s.score / s.maxScore : 0;
  });
  const actualPts = polygonPoints(ratios, R_MAX);

  return (
    <svg viewBox="0 0 300 300" className="w-full max-w-[260px]" aria-label="Radar di conformità">
      {[0.25, 0.5, 0.75, 1].map(t => (
        <polygon
          key={t}
          points={maxPolygon(R_MAX * t)}
          fill="none"
          stroke={t === 1 ? "rgba(0,0,0,0.10)" : "rgba(0,0,0,0.06)"}
          strokeWidth={t === 1 ? 1 : 0.75}
        />
      ))}
      {Array.from({ length: 5 }, (_, i) => {
        const a = axisAngle(i);
        return (
          <line
            key={i}
            x1={CX} y1={CY}
            x2={CX + R_MAX * Math.cos(a)}
            y2={CY + R_MAX * Math.sin(a)}
            stroke="rgba(0,0,0,0.06)"
            strokeWidth={0.75}
          />
        );
      })}
      <polygon
        points={maxPolygon(R_MAX)}
        fill="rgba(0,0,0,0.03)"
        stroke="rgba(0,0,0,0.10)"
        strokeWidth={1}
      />
      <polygon
        points={actualPts}
        fill="rgba(0,0,0,0.08)"
        stroke="rgba(0,0,0,0.55)"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {RADAR_ORDER.map((key, i) => {
        const ratio = ratios[i];
        const a = axisAngle(i);
        const x = CX + R_MAX * ratio * Math.cos(a);
        const y = CY + R_MAX * ratio * Math.sin(a);
        const sig = signals.find(s => s.criterion === key);
        const col = sig ? SEVERITY_COLORS[sig.severity].text : "#9ca3af";
        return (
          <circle key={key} cx={x} cy={y} r={3.5} fill={col} stroke="#fafaf9" strokeWidth={1.5} />
        );
      })}
      {RADAR_LABELS.map((label, i) => {
        const { x, y } = labelPos(i);
        const lines = label.split("\n");
        return (
          <text
            key={i}
            x={x} y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={9}
            fill="rgba(0,0,0,0.45)"
            fontFamily={MONO}
          >
            {lines.map((line, li) => (
              <tspan key={li} x={x} dy={li === 0 ? (lines.length > 1 ? "-0.5em" : "0") : "1.2em"}>
                {line}
              </tspan>
            ))}
          </text>
        );
      })}
    </svg>
  );
}

// ─── Score circle ──────────────────────────────────────────────────────────────
const CIRC = 2 * Math.PI * 46;

function ScoreCircle({ score, grade }: { score: number; grade: string }) {
  const color = GRADE_COLOR[grade] ?? "#9ca3af";
  const dash  = (score / 100) * CIRC;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r="46" fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="7" />
          <circle
            cx="60" cy="60" r="46"
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${CIRC}`}
            style={{ filter: `drop-shadow(0 0 6px ${color}55)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-light tabular-nums" style={{ color, letterSpacing: "-1.5px" }}>
            {score}
          </span>
          <span className="text-[10px]" style={{ color: "rgba(0,0,0,0.35)", fontFamily: MONO }}>/100</span>
        </div>
      </div>
    </div>
  );
}

// ─── Signal row ────────────────────────────────────────────────────────────────
function SignalRow({ signal, index }: { signal: Art50Signal; index: number }) {
  const c = SEVERITY_COLORS[signal.severity];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-xl border p-4"
      style={{ borderColor: c.border, background: c.bg }}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[18px] flex-shrink-0" style={{ color: c.text }}>
            {signal.detected ? "✓" : "✗"}
          </span>
          <div className="min-w-0">
            <span className="text-[13px] font-medium" style={{ color: "#0D1016" }}>{signal.label}</span>
            <span className="ml-2 text-[10px]" style={{ color: "rgba(0,0,0,0.38)", fontFamily: MONO }}>
              {signal.legalRef}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full"
            style={{ background: c.badge, color: c.text, fontFamily: MONO }}
          >
            {c.label}
          </span>
          <span className="text-[12px]" style={{ color: "rgba(0,0,0,0.45)", fontFamily: MONO }}>
            {signal.score}/{signal.maxScore}
          </span>
        </div>
      </div>
      {signal.evidence && (
        <div
          className="mt-2.5 text-[11px] px-2.5 py-1.5 rounded truncate"
          style={{ background: "rgba(0,0,0,0.04)", color: "rgba(0,0,0,0.45)", fontFamily: MONO }}
        >
          {signal.evidence}
        </div>
      )}
      <p className="mt-2.5 text-[11px] leading-relaxed" style={{ color: "rgba(0,0,0,0.52)" }}>
        {signal.contextNote}
      </p>
    </motion.div>
  );
}

// ─── Loading state ─────────────────────────────────────────────────────────────
function ScanLoading({ url }: { url: string }) {
  const criteria = ["Disclosure AI", "Posizione prominente", "Machine-readable", "Lingua corretta", "Media sintetici"];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-3xl mx-auto px-4 pb-20 text-center pt-4"
    >
      <div className="relative inline-flex items-center justify-center mb-5">
        <div
          className="absolute w-20 h-20 rounded-full"
          style={{ border: "1px solid rgba(0,0,0,0.07)", animation: "ping 2s cubic-bezier(0,0,0.2,1) infinite" }}
        />
        <div
          className="w-14 h-14 rounded-full border-2"
          style={{ borderColor: "rgba(0,0,0,0.08)", borderTopColor: "rgba(0,0,0,0.70)", animation: "spin 0.9s linear infinite" }}
        />
        <div className="absolute w-3 h-3 rounded-full" style={{ background: "rgba(0,0,0,0.70)" }} />
      </div>
      <p className="text-[14px] font-medium mb-1" style={{ color: "rgba(0,0,0,0.65)", letterSpacing: "-0.3px" }}>
        Analisi in corso…
      </p>
      <p className="text-[11px] truncate max-w-xs mx-auto mb-8" style={{ color: "rgba(0,0,0,0.32)", fontFamily: MONO }}>
        {url}
      </p>
      <div className="space-y-2 max-w-[200px] mx-auto text-left">
        {criteria.map((label, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: [0, 0.55, 0.55], x: 0 }}
            transition={{ delay: i * 0.32, duration: 0.4 }}
            className="flex items-center gap-2.5 text-[11px]"
            style={{ color: "rgba(0,0,0,0.40)", fontFamily: MONO }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: "rgba(0,0,0,0.22)", animation: `pulse 1.5s ${i * 0.3}s infinite` }}
            />
            {label}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Results ───────────────────────────────────────────────────────────────────
function ScanResults({ result, onReset }: { result: Art50ScanResult; onReset: () => void }) {
  const gradeColor = GRADE_COLOR[result.grade] ?? "#9ca3af";
  const riskColor  = RISK_COLORS[result.riskLevel];
  const formattedDate = new Date(result.scannedAt).toLocaleString("it-IT", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const urlTrunc = result.url.length > 40 ? result.url.slice(0, 40) + "…" : result.url;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-3xl mx-auto px-4 pb-24"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div
          className="rounded-2xl p-6 text-center"
          style={{ background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.08)" }}
        >
          <ScoreCircle score={result.score} grade={result.grade} />
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="text-[26px] font-medium" style={{ color: gradeColor, letterSpacing: "-1px" }}>
              {result.grade}
            </span>
            <span className="text-[13px]" style={{ color: "rgba(0,0,0,0.52)", letterSpacing: "-0.2px" }}>
              {result.gradeLabel}
            </span>
          </div>
        </div>

        <div
          className="rounded-2xl p-6"
          style={{ background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.08)" }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(0,0,0,0.38)", fontFamily: MONO }}>
            Livello di rischio sanzionatorio
          </p>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full" style={{ background: riskColor }} />
            <span className="text-2xl font-bold" style={{ color: riskColor, letterSpacing: "-0.8px" }}>
              {result.riskLevel.toUpperCase()}
            </span>
          </div>
          <p className="text-[12px] mb-4" style={{ color: "rgba(0,0,0,0.52)", lineHeight: 1.5 }}>
            {result.sanctionEstimate}
          </p>
          <div
            className="text-[12px] font-medium px-3 py-1.5 rounded-lg inline-block"
            style={{ background: "rgba(0,0,0,0.04)", color: "rgba(0,0,0,0.55)" }}
          >
            <span style={{ color: "#dc2626" }}>{result.criticalCount} critico/i</span>
            <span style={{ color: "rgba(0,0,0,0.22)" }}> · </span>
            <span style={{ color: "#b45309" }}>{result.warningCount} da verificare</span>
          </div>
          <p className="mt-3 text-[10px]" style={{ color: "rgba(0,0,0,0.32)", fontFamily: MONO }}>
            Scansione: {formattedDate} · {urlTrunc}
          </p>
        </div>
      </div>

      <div
        className="rounded-2xl p-6 mb-6 flex flex-col items-center"
        style={{ background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.07)" }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-5" style={{ color: "rgba(0,0,0,0.38)", fontFamily: MONO }}>
          Profilo di conformità Art. 50
        </p>
        <RadarChart signals={result.signals} />
      </div>

      <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "rgba(0,0,0,0.38)", fontFamily: MONO }}>
        Analisi dettagliata
      </p>
      <div className="space-y-3 mb-8">
        {result.signals.map((s, i) => (
          <SignalRow key={s.criterion} signal={s} index={i} />
        ))}
      </div>

      {result.criticalCount > 0 && (
        <div
          className="relative rounded-2xl border p-6 mb-6 overflow-hidden"
          style={{ borderColor: "rgba(0,0,0,0.08)", background: "rgba(0,0,0,0.02)" }}
        >
          <div className="blur-sm select-none pointer-events-none space-y-2.5 mb-4" aria-hidden="true">
            <div className="h-2.5 rounded-full w-3/4" style={{ background: "rgba(0,0,0,0.10)" }} />
            <div className="h-2.5 rounded-full w-full" style={{ background: "rgba(0,0,0,0.06)" }} />
            <div className="h-2.5 rounded-full w-5/6" style={{ background: "rgba(0,0,0,0.06)" }} />
            <div className="h-2.5 rounded-full w-2/3" style={{ background: "rgba(0,0,0,0.08)" }} />
            <div className="h-2.5 rounded-full w-full" style={{ background: "rgba(0,0,0,0.06)" }} />
            <div className="h-2.5 rounded-full w-4/5" style={{ background: "rgba(0,0,0,0.06)" }} />
          </div>
          <div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl"
            style={{ background: "rgba(250,250,249,0.92)", backdropFilter: "blur(2px)" }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mb-3 text-xl"
              style={{ background: "rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.12)" }}
            >
              🔒
            </div>
            <p className="font-semibold text-[15px] mb-1" style={{ color: "#0D1016", letterSpacing: "-0.3px" }}>
              Piano di remediation completo
            </p>
            <p className="text-[12px] text-center max-w-xs" style={{ color: "rgba(0,0,0,0.55)", lineHeight: 1.6 }}>
              {result.criticalCount} gap critico/i rilevato/i. Il piano dettagliato con
              implementazione guidata è incluso nel piano Starter.
            </p>
          </div>
        </div>
      )}

      <div
        className="rounded-2xl p-8 text-center mb-6"
        style={{ background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.08)" }}
      >
        <div
          className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-[11px] mb-4"
          style={{ border: "1px solid rgba(0,0,0,0.10)", background: "rgba(0,0,0,0.04)", color: "rgba(0,0,0,0.45)" }}
        >
          <span className="block w-1.5 h-1.5 rounded-full" style={{ background: "rgba(0,0,0,0.25)" }} />
          Piano Starter · €49/mese
        </div>
        <h3 className="text-[20px] font-medium mb-2" style={{ color: "#0D1016", letterSpacing: "-0.8px", fontFamily: SERIF }}>
          {result.score >= 80
            ? "Genera il Registro di Implementazione Art. 50"
            : `Risolvi ${result.criticalCount + result.warningCount} gap e genera il registro`}
        </h3>
        <p className="text-[13px] max-w-md mx-auto mb-6" style={{ color: "rgba(0,0,0,0.50)", lineHeight: 1.65 }}>
          Il Registro di Implementazione Art. 50 documenta le azioni adottate ed è la base difendibile
          in caso di ispezione di mercato (Art. 74 AI Act). Incluso nel piano Starter.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/pricing"
            className="inline-flex items-center justify-center rounded-full text-[13px] font-medium transition-all duration-200 px-7 py-2.5"
            style={{ background: "#0D1016", color: "#ffffff" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            Inizia gratis — 14 giorni →
          </a>
          <button
            onClick={onReset}
            className="inline-flex items-center justify-center rounded-full text-[13px] font-medium transition-all duration-200 px-7 py-2.5"
            style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.10)", color: "rgba(0,0,0,0.65)" }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.08)")}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.04)")}
          >
            Analizza un altro URL
          </button>
        </div>
        <p className="mt-4 text-[11px]" style={{ color: "rgba(0,0,0,0.32)", fontFamily: MONO }}>
          Deadline: 2 dicembre 2026 · Multa max: 1% fatturato globale · Nessuna carta richiesta per il trial
        </p>
      </div>

      <p className="text-[11px] text-center" style={{ color: "rgba(0,0,0,0.35)", lineHeight: 1.7 }}>
        {result.disclaimer}
      </p>
    </motion.section>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function ScannerPage() {
  const [url, setUrl]         = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [result, setResult]   = useState<Art50ScanResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() { setResult(null); setUrl(""); setError(null); }

  function scrollToInput() {
    inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    inputRef.current?.focus({ preventScroll: true });
  }

  async function handleScan(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const target = url.trim();
    if (!target) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res  = await fetch("/api/scanner/art50", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      const data = (await res.json()) as Art50ScanResult & { error?: string };
      if (!res.ok || data.error) setError(data.error ?? "Errore durante la scansione.");
      else setResult(data);
    } catch { setError("Impossibile completare la scansione. Controlla la connessione."); }
    finally { setLoading(false); }
  }

  return (
    <>
      <Nav />
      <main className="relative min-h-screen overflow-hidden" style={{ background: "#fafaf9" }}>
        <div className="relative z-10">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="pt-24 pb-14 text-center px-6 max-w-3xl mx-auto"
          >
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[12px] mb-8"
              style={{ border: "1px solid rgba(0,0,0,0.10)", background: "rgba(0,0,0,0.04)", color: "rgba(0,0,0,0.50)" }}
            >
              <span className="block w-1.5 h-1.5 rounded-full" style={{ background: "rgba(0,0,0,0.22)" }} />
              EU AI Act — Art. 50 · Deadline: 2 dicembre 2026
            </div>

            <h1 style={{ fontFamily: SERIF, fontSize: "clamp(32px, 4.5vw, 56px)", fontWeight: 400, letterSpacing: "-2.5px", lineHeight: 1.05, color: "#0D1016", marginBottom: 20 }}>
              Il tuo sito è conforme
              <br />
              <em className="not-italic" style={{ color: "rgba(0,0,0,0.52)" }}>
                alla disclosure AI?
              </em>
            </h1>

            <p className="mb-10 max-w-md mx-auto" style={{ fontSize: "15px", fontWeight: 300, letterSpacing: "-0.2px", lineHeight: 1.7, color: "rgba(0,0,0,0.50)" }}>
              Verifica in 15 secondi se le tue interfacce AI rispettano i 5 criteri dell&rsquo;Art. 50.
              Obbligatorio dal 2 dicembre 2026. Nessuna registrazione richiesta.
            </p>

            <form onSubmit={handleScan} className="max-w-xl mx-auto">
              <div
                className="flex flex-col sm:flex-row gap-2 p-1.5 rounded-2xl"
                style={{ background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.09)", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}
              >
                <input
                  ref={inputRef}
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://tuo-sito.it"
                  required
                  disabled={loading}
                  className="scanner-input flex-1 bg-transparent outline-none px-4 py-2.5 text-[14px] disabled:opacity-50"
                  style={{ color: "rgba(0,0,0,0.82)", letterSpacing: "-0.2px" }}
                />
                <button
                  type="submit"
                  disabled={loading || !url.trim()}
                  className="flex-shrink-0 rounded-xl px-6 py-2.5 text-[13px] font-medium transition-all duration-200 disabled:opacity-40"
                  style={{ background: "#0D1016", color: "#ffffff" }}
                  onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.opacity = "0.85"; }}
                  onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.opacity = "1")}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Analisi…
                    </span>
                  ) : "Analizza gratis →"}
                </button>
              </div>
            </form>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 text-[12px] px-4 py-2.5 rounded-xl inline-block"
                  style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.20)", color: "#dc2626" }}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {!loading && !result && (
              <div className="flex flex-wrap items-center justify-center gap-5 mt-6 text-[11px]" style={{ color: "rgba(0,0,0,0.32)", fontFamily: MONO }}>
                {["Nessuna registrazione", "5 criteri Art. 50", "Risultato in 15s", "Scansione anonima"].map(s => (
                  <span key={s} className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full" style={{ background: "rgba(0,0,0,0.18)" }} />
                    {s}
                  </span>
                ))}
              </div>
            )}
          </motion.section>

          <AnimatePresence mode="wait">
            {loading  && <ScanLoading key="load" url={url} />}
            {!loading && result && <ScanResults key="res" result={result} onReset={reset} />}
          </AnimatePresence>

          {!loading && !result && (
            <ScannerTrustSection onScanRequest={scrollToInput} />
          )}
        </div>
        <BookDemoBanner />
      </main>
    </>
  );
}
