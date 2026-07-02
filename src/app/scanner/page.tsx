"use client";

import { useState, useRef, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Nav from "@/components/Nav";
import ScannerTrustSection from "@/components/scanner/ScannerTrustSection";
import type { Art50ScanResult, Art50Signal, CriterionKey } from "@/lib/scanner/art50-detector";

// ─── Design constants ─────────────────────────────────────────────────────────
const GRADE_COLOR: Record<string, string> = {
  A: "#4ade80", B: "#60a5fa", C: "#facc15", D: "#fb923c", F: "#f87171",
};
const SEVERITY_COLORS = {
  critical: { border: "rgba(239,68,68,0.35)",  bg: "rgba(127,29,29,0.25)",  text: "#f87171",  badge: "rgba(239,68,68,0.15)",  label: "CRITICO"   },
  warning:  { border: "rgba(234,179,8,0.35)",   bg: "rgba(113,63,18,0.25)",  text: "#facc15",  badge: "rgba(234,179,8,0.15)",   label: "ATTENZIONE" },
  ok:       { border: "rgba(74,222,128,0.25)",  bg: "rgba(20,83,45,0.18)",   text: "#4ade80",  badge: "rgba(74,222,128,0.12)",  label: "OK"         },
};
const RISK_COLORS = { alto: "#f87171", medio: "#facc15", basso: "#4ade80" };

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
      {/* Grid rings */}
      {[0.25, 0.5, 0.75, 1].map(t => (
        <polygon
          key={t}
          points={maxPolygon(R_MAX * t)}
          fill="none"
          stroke={t === 1 ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)"}
          strokeWidth={t === 1 ? 1 : 0.75}
        />
      ))}

      {/* Axis lines */}
      {Array.from({ length: 5 }, (_, i) => {
        const a = axisAngle(i);
        return (
          <line
            key={i}
            x1={CX} y1={CY}
            x2={CX + R_MAX * Math.cos(a)}
            y2={CY + R_MAX * Math.sin(a)}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={0.75}
          />
        );
      })}

      {/* Max area */}
      <polygon
        points={maxPolygon(R_MAX)}
        fill="rgba(255,255,255,0.04)"
        stroke="rgba(255,255,255,0.10)"
        strokeWidth={1}
      />

      {/* Actual score area */}
      <polygon
        points={actualPts}
        fill="rgba(255,255,255,0.12)"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />

      {/* Score dots */}
      {RADAR_ORDER.map((key, i) => {
        const ratio = ratios[i];
        const a = axisAngle(i);
        const x = CX + R_MAX * ratio * Math.cos(a);
        const y = CY + R_MAX * ratio * Math.sin(a);
        const sig = signals.find(s => s.criterion === key);
        const col = sig ? SEVERITY_COLORS[sig.severity].text : "#6b7280";
        return (
          <circle key={key} cx={x} cy={y} r={3.5} fill={col} stroke="#0C1B33" strokeWidth={1.5} />
        );
      })}

      {/* Axis labels */}
      {RADAR_LABELS.map((label, i) => {
        const { x, y } = labelPos(i);
        const lines = label.split("\n");
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={9}
            fill="rgba(255,255,255,0.45)"
            fontFamily="'DM Mono', monospace"
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
const CIRC = 2 * Math.PI * 46; // ≈ 289

function ScoreCircle({ score, grade }: { score: number; grade: string }) {
  const color = GRADE_COLOR[grade] ?? "#6b7280";
  const dash  = (score / 100) * CIRC;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          {/* Track */}
          <circle cx="60" cy="60" r="46" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
          {/* Score arc */}
          <circle
            cx="60" cy="60" r="46"
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${CIRC}`}
            style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-light tabular-nums" style={{ color, letterSpacing: "-1.5px" }}>
            {score}
          </span>
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.28)" }}>/100</span>
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
          {/* Status icon */}
          <span className="text-[18px] flex-shrink-0" style={{ color: c.text }}>
            {signal.detected ? "✓" : "✗"}
          </span>
          <div className="min-w-0">
            <span className="text-[13px] font-medium text-white">{signal.label}</span>
            <span
              className="ml-2 text-[10px] font-mono"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              {signal.legalRef}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Severity badge */}
          <span
            className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full"
            style={{ background: c.badge, color: c.text }}
          >
            {c.label}
          </span>
          {/* Score */}
          <span className="text-[12px] font-mono" style={{ color: "rgba(255,255,255,0.45)" }}>
            {signal.score}/{signal.maxScore}
          </span>
        </div>
      </div>

      {/* Evidence */}
      {signal.evidence && (
        <div
          className="mt-2.5 text-[11px] font-mono px-2.5 py-1.5 rounded truncate"
          style={{ background: "rgba(0,0,0,0.25)", color: "rgba(255,255,255,0.38)" }}
        >
          {signal.evidence}
        </div>
      )}

      {/* Context note — WHY it matters, NOT how to fix */}
      <p className="mt-2.5 text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
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
          style={{ border: "1px solid rgba(255,255,255,0.08)", animation: "ping 2s cubic-bezier(0,0,0.2,1) infinite" }}
        />
        <div
          className="w-14 h-14 rounded-full border-2"
          style={{ borderColor: "rgba(255,255,255,0.10)", borderTopColor: "rgba(255,255,255,0.75)", animation: "spin 0.9s linear infinite" }}
        />
        <div className="absolute w-3 h-3 rounded-full" style={{ background: "rgba(255,255,255,0.85)", boxShadow: "0 0 12px rgba(255,255,255,0.35)" }} />
      </div>
      <p className="text-[14px] font-medium mb-1" style={{ color: "rgba(255,255,255,0.65)", letterSpacing: "-0.3px" }}>
        Analisi in corso…
      </p>
      <p className="text-[11px] truncate max-w-xs mx-auto mb-8" style={{ color: "rgba(255,255,255,0.25)" }}>
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
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.25)", animation: `pulse 1.5s ${i * 0.3}s infinite` }}
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
  const gradeColor = GRADE_COLOR[result.grade] ?? "#6b7280";
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
      {/* ── Header: score + risk ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Score card */}
        <div
          className="rounded-2xl p-6 text-center"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <ScoreCircle score={result.score} grade={result.grade} />
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="text-[26px] font-medium" style={{ color: gradeColor, letterSpacing: "-1px" }}>
              {result.grade}
            </span>
            <span className="text-[13px]" style={{ color: "rgba(255,255,255,0.5)", letterSpacing: "-0.2px" }}>
              {result.gradeLabel}
            </span>
          </div>
        </div>

        {/* Risk card */}
        <div
          className="rounded-2xl p-6"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>
            Livello di rischio sanzionatorio
          </p>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: riskColor, boxShadow: `0 0 8px ${riskColor}99` }}
            />
            <span className="text-2xl font-bold" style={{ color: riskColor, letterSpacing: "-0.8px" }}>
              {result.riskLevel.toUpperCase()}
            </span>
          </div>
          <p className="text-[12px] mb-4" style={{ color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
            {result.sanctionEstimate}
          </p>
          <div
            className="text-[12px] font-medium px-3 py-1.5 rounded-lg inline-block"
            style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.55)" }}
          >
            <span style={{ color: "#f87171" }}>{result.criticalCount} critico/i</span>
            <span style={{ color: "rgba(255,255,255,0.2)" }}> · </span>
            <span style={{ color: "#facc15" }}>{result.warningCount} da verificare</span>
          </div>
          <p className="mt-3 text-[10px]" style={{ color: "rgba(255,255,255,0.22)" }}>
            Scansione: {formattedDate} · {urlTrunc}
          </p>
        </div>
      </div>

      {/* ── Radar chart ── */}
      <div
        className="rounded-2xl p-6 mb-6 flex flex-col items-center"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-5" style={{ color: "rgba(255,255,255,0.3)" }}>
          Profilo di conformità Art. 50
        </p>
        <RadarChart signals={result.signals} />
      </div>

      {/* ── Signal rows ── */}
      <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>
        Analisi dettagliata
      </p>
      <div className="space-y-3 mb-8">
        {result.signals.map((s, i) => (
          <SignalRow key={s.criterion} signal={s} index={i} />
        ))}
      </div>

      {/* ── Gap report teaser (locked) ── */}
      {result.criticalCount > 0 && (
        <div
          className="relative rounded-2xl border p-6 mb-6 overflow-hidden"
          style={{ borderColor: "rgba(255,255,255,0.10)", background: "rgba(13,16,22,0.5)" }}
        >
          {/* Blurred fake report lines */}
          <div className="blur-sm select-none pointer-events-none space-y-2.5 mb-4" aria-hidden="true">
            <div className="h-2.5 rounded-full bg-white/20 w-3/4" />
            <div className="h-2.5 rounded-full bg-white/10 w-full" />
            <div className="h-2.5 rounded-full bg-white/10 w-5/6" />
            <div className="h-2.5 rounded-full bg-white/15 w-2/3" />
            <div className="h-2.5 rounded-full bg-white/10 w-full" />
            <div className="h-2.5 rounded-full bg-white/10 w-4/5" />
          </div>
          {/* Lock overlay */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl"
            style={{ background: "rgba(12,27,51,0.78)", backdropFilter: "blur(2px)" }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mb-3 text-xl"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.18)" }}
            >
              🔒
            </div>
            <p className="font-semibold text-white text-[15px] mb-1" style={{ letterSpacing: "-0.3px" }}>
              Piano di remediation completo
            </p>
            <p className="text-[12px] text-center max-w-xs" style={{ color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
              {result.criticalCount} gap critico/i rilevato/i. Il piano dettagliato con
              implementazione guidata è incluso nel piano Starter.
            </p>
          </div>
        </div>
      )}

      {/* ── CTA ── */}
      <div
        className="rounded-2xl p-8 text-center mb-6"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1 text-[11px] text-white/45 mb-4">
          <span className="block w-1.5 h-1.5 rounded-full bg-white/40" />
          Piano Starter · €49/mese
        </div>
        <h3 className="text-[20px] font-medium text-white mb-2" style={{ letterSpacing: "-0.8px" }}>
          {result.score >= 80
            ? "Genera il Registro di Implementazione Art. 50"
            : `Risolvi ${result.criticalCount + result.warningCount} gap e genera il registro`}
        </h3>
        <p className="text-[13px] max-w-md mx-auto mb-6" style={{ color: "rgba(255,255,255,0.45)", lineHeight: 1.65 }}>
          Il Registro di Implementazione Art. 50 documenta le azioni adottate ed è la base difendibile
          in caso di ispezione di mercato (Art. 74 AI Act). Incluso nel piano Starter.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/pricing"
            className="inline-flex items-center justify-center rounded-full text-[13px] font-medium transition-all duration-200 px-7 py-2.5"
            style={{ background: "#ffffff", color: "#0D1016" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#e5e7eb")}
            onMouseLeave={e => (e.currentTarget.style.background = "#ffffff")}
          >
            Inizia gratis — 14 giorni →
          </a>
          <button
            onClick={onReset}
            className="inline-flex items-center justify-center rounded-full text-[13px] font-medium transition-all duration-200 px-7 py-2.5"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)" }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.12)")}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)")}
          >
            Analizza un altro URL
          </button>
        </div>
        <p className="mt-4 text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>
          Deadline: 2 dicembre 2026 · Multa max: 1% fatturato globale · Nessuna carta richiesta per il trial
        </p>
      </div>

      {/* Disclaimer */}
      <p className="text-[11px] text-center" style={{ color: "rgba(255,255,255,0.22)", lineHeight: 1.7 }}>
        {result.disclaimer}
      </p>
    </motion.section>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function ScannerPage() {
  const [url, setUrl]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [result, setResult] = useState<Art50ScanResult | null>(null);
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
      <main className="relative min-h-screen overflow-hidden" style={{ background: "#0C1B33" }}>

        {/* Mesh gradient */}
        <div className="pointer-events-none absolute inset-0" style={{
          background: "radial-gradient(ellipse 70% 50% at 15% 5%, rgba(30,58,138,0.28) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 85% 80%, rgba(17,24,83,0.30) 0%, transparent 60%)",
        }} />
        {/* Grid */}
        <div className="pointer-events-none absolute inset-0" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.016) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.016) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }} />

        <div className="relative z-10">
          {/* ── Hero ── */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="pt-24 pb-14 text-center px-6 max-w-3xl mx-auto"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 text-[12px] text-white/50 mb-8">
              <span className="block w-1.5 h-1.5 rounded-full bg-blue-500" style={{ boxShadow: "0 0 8px rgba(59,130,246,0.8)" }} />
              EU AI Act — Art. 50 · Deadline: 2 dicembre 2026
            </div>

            <h1 className="text-white mb-5" style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "clamp(32px, 4.5vw, 56px)", fontWeight: 400, letterSpacing: "-2.5px", lineHeight: 1.05 }}>
              Il tuo sito è conforme
              <br />
              <em className="not-italic" style={{ color: "rgba(255,255,255,0.72)" }}>
                alla disclosure AI?
              </em>
            </h1>

            <p className="mb-10 max-w-md mx-auto" style={{ fontSize: "15px", fontWeight: 300, letterSpacing: "-0.2px", lineHeight: 1.7, color: "rgba(255,255,255,0.4)" }}>
              Verifica in 15 secondi se le tue interfacce AI rispettano i 5 criteri dell&rsquo;Art. 50.
              Obbligatorio dal 2 dicembre 2026. Nessuna registrazione richiesta.
            </p>

            {/* Form */}
            <form onSubmit={handleScan} className="max-w-xl mx-auto">
              <div
                className="flex flex-col sm:flex-row gap-2 p-1.5 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", boxShadow: "0 4px 24px rgba(0,0,0,0.35)" }}
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
                  style={{ color: "rgba(255,255,255,0.82)", letterSpacing: "-0.2px" }}
                />
                <button
                  type="submit"
                  disabled={loading || !url.trim()}
                  className="flex-shrink-0 rounded-xl px-6 py-2.5 text-[13px] font-medium transition-all duration-200 disabled:opacity-40"
                  style={{ background: "#ffffff", color: "#0C1B33" }}
                  onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "#e5e7eb"; }}
                  onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = "#ffffff")}
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
                  style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: "#fca5a5" }}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {!loading && !result && (
              <div className="flex flex-wrap items-center justify-center gap-5 mt-6 text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>
                {["Nessuna registrazione", "5 criteri Art. 50", "Risultato in 15s", "Scansione anonima"].map(s => (
                  <span key={s} className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.18)" }} />
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
      </main>
    </>
  );
}
