"use client";

import { useState, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Nav from "@/components/Nav";
import type { Art50ScanResult, Art50Signal, CriterionKey } from "@/lib/scanner/art50-detector";

const SERIF = "Georgia, 'Times New Roman', serif";
const MONO  = "'DM Mono', monospace";

// ─── Design constants (B&W) ────────────────────────────────────────────────────
const GRADE_COLOR: Record<string, string> = {
  A: "#0D1016",
  B: "rgba(0,0,0,0.72)",
  C: "rgba(0,0,0,0.50)",
  D: "rgba(0,0,0,0.35)",
  F: "rgba(0,0,0,0.22)",
};

const SEVERITY: Record<"critical" | "warning" | "ok", {
  borderLeft: string; bg: string; text: string; badge: string; badgeTxt: string; label: string;
}> = {
  critical: {
    borderLeft: "#0D1016",
    bg: "#ffffff",
    text: "#0D1016",
    badge: "rgba(0,0,0,0.07)",
    badgeTxt: "#0D1016",
    label: "CRITICO",
  },
  warning: {
    borderLeft: "rgba(0,0,0,0.45)",
    bg: "#ffffff",
    text: "rgba(0,0,0,0.65)",
    badge: "rgba(0,0,0,0.05)",
    badgeTxt: "rgba(0,0,0,0.55)",
    label: "ATTENZIONE",
  },
  ok: {
    borderLeft: "rgba(0,0,0,0.15)",
    bg: "#FAFAF9",
    text: "rgba(0,0,0,0.45)",
    badge: "rgba(0,0,0,0.04)",
    badgeTxt: "rgba(0,0,0,0.38)",
    label: "OK",
  },
};

const RISK_COLOR: Record<string, string> = {
  alto:  "#0D1016",
  medio: "rgba(0,0,0,0.55)",
  basso: "rgba(0,0,0,0.35)",
};

// ─── Radar chart ──────────────────────────────────────────────────────────────
const RADAR_ORDER: CriterionKey[] = [
  "disclosure_present", "disclosure_visible", "machine_readable", "language_match", "synthetic_media",
];
const RADAR_LABELS = ["Disclosure", "Visibilità", "Machine-\nreadable", "Lingua", "Media"];
const CX = 150, CY = 150, R_MAX = 100, R_LABEL = 128;

function axisAngle(i: number) { return (-90 + i * 72) * (Math.PI / 180); }

function polygon(ratios: number[], radius: number) {
  return ratios.map((r, i) => {
    const a = axisAngle(i);
    return `${CX + radius * r * Math.cos(a)},${CY + radius * r * Math.sin(a)}`;
  }).join(" ");
}

function maxPoly(r: number) {
  return Array.from({ length: 5 }, (_, i) => {
    const a = axisAngle(i);
    return `${CX + r * Math.cos(a)},${CY + r * Math.sin(a)}`;
  }).join(" ");
}

function RadarChart({ signals }: { signals: Art50Signal[] }) {
  const ratios = RADAR_ORDER.map(k => {
    const s = signals.find(sig => sig.criterion === k);
    return s ? s.score / s.maxScore : 0;
  });

  return (
    <svg viewBox="0 0 300 300" className="w-full max-w-[260px]" aria-label="Radar di conformità">
      {[0.25, 0.5, 0.75, 1].map(t => (
        <polygon key={t} points={maxPoly(R_MAX * t)} fill="none"
          stroke={t === 1 ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.06)"}
          strokeWidth={t === 1 ? 1 : 0.75} />
      ))}
      {Array.from({ length: 5 }, (_, i) => {
        const a = axisAngle(i);
        return <line key={i} x1={CX} y1={CY}
          x2={CX + R_MAX * Math.cos(a)} y2={CY + R_MAX * Math.sin(a)}
          stroke="rgba(0,0,0,0.07)" strokeWidth={0.75} />;
      })}
      <polygon points={maxPoly(R_MAX)} fill="rgba(0,0,0,0.02)" stroke="rgba(0,0,0,0.10)" strokeWidth={1} />
      <polygon points={polygon(ratios, R_MAX)} fill="rgba(0,0,0,0.06)" stroke="#0D1016"
        strokeWidth={1.5} strokeLinejoin="round" />
      {RADAR_ORDER.map((key, i) => {
        const ratio = ratios[i];
        const a = axisAngle(i);
        const x = CX + R_MAX * ratio * Math.cos(a);
        const y = CY + R_MAX * ratio * Math.sin(a);
        const sig = signals.find(s => s.criterion === key);
        const col = sig ? SEVERITY[sig.severity].text : "rgba(0,0,0,0.30)";
        return <circle key={key} cx={x} cy={y} r={3.5} fill={col} stroke="#fff" strokeWidth={1.5} />;
      })}
      {RADAR_LABELS.map((label, i) => {
        const a = axisAngle(i);
        const x = CX + R_LABEL * Math.cos(a);
        const y = CY + R_LABEL * Math.sin(a);
        const lines = label.split("\n");
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            fontSize={9} fill="rgba(0,0,0,0.38)" fontFamily={MONO}>
            {lines.map((line, li) => (
              <tspan key={li} x={x} dy={li === 0 ? (lines.length > 1 ? "-0.5em" : "0") : "1.2em"}>{line}</tspan>
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
  const color = GRADE_COLOR[grade] ?? "rgba(0,0,0,0.22)";
  const dash  = (score / 100) * CIRC;
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r="46" fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="7" />
          <circle cx="60" cy="60" r="46" fill="none" stroke={color} strokeWidth="7"
            strokeLinecap="round" strokeDasharray={`${dash} ${CIRC}`} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-light tabular-nums" style={{ color, letterSpacing: "-1.5px", fontFamily: SERIF }}>
            {score}
          </span>
          <span className="text-[10px]" style={{ fontFamily: MONO, color: "rgba(0,0,0,0.28)" }}>/100</span>
        </div>
      </div>
    </div>
  );
}

// ─── Signal row ────────────────────────────────────────────────────────────────
function SignalRow({ signal, index }: { signal: Art50Signal; index: number }) {
  const c = SEVERITY[signal.severity];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      style={{
        border: "1px solid rgba(0,0,0,0.08)",
        borderLeft: `3px solid ${c.borderLeft}`,
        background: c.bg,
        borderRadius: 10,
        padding: "14px 16px",
      }}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <span style={{ fontSize: 15, color: c.text, flexShrink: 0 }}>
            {signal.detected ? "✓" : "✗"}
          </span>
          <div className="min-w-0">
            <span style={{ fontSize: 13, fontWeight: 500, color: "#0D1016" }}>{signal.label}</span>
            <span style={{ marginLeft: 8, fontFamily: MONO, fontSize: 10, color: "rgba(0,0,0,0.30)" }}>
              {signal.legalRef}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span style={{
            fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: "0.06em",
            padding: "2px 8px", borderRadius: 20,
            background: c.badge, color: c.badgeTxt,
          }}>
            {c.label}
          </span>
          <span style={{ fontFamily: MONO, fontSize: 11, color: "rgba(0,0,0,0.32)" }}>
            {signal.score}/{signal.maxScore}
          </span>
        </div>
      </div>
      {signal.evidence && (
        <div style={{
          marginTop: 10, fontFamily: MONO, fontSize: 11,
          padding: "6px 10px", borderRadius: 6, background: "rgba(0,0,0,0.03)",
          color: "rgba(0,0,0,0.40)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {signal.evidence}
        </div>
      )}
      <p style={{ marginTop: 8, fontSize: 12, color: "rgba(0,0,0,0.42)", lineHeight: 1.6 }}>
        {signal.contextNote}
      </p>
    </motion.div>
  );
}

// ─── Loading state ─────────────────────────────────────────────────────────────
function ScanLoading({ url }: { url: string }) {
  const criteria = ["Disclosure AI", "Posizione prominente", "Machine-readable", "Lingua corretta", "Media sintetici"];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="max-w-3xl mx-auto px-4 pb-20 text-center pt-4">
      <div className="relative inline-flex items-center justify-center mb-5">
        <div className="absolute w-20 h-20 rounded-full"
          style={{ border: "1px solid rgba(0,0,0,0.08)", animation: "ping 2s cubic-bezier(0,0,0.2,1) infinite" }} />
        <div className="w-14 h-14 rounded-full border-2"
          style={{ borderColor: "rgba(0,0,0,0.07)", borderTopColor: "#0D1016", animation: "spin 0.9s linear infinite" }} />
        <div className="absolute w-3 h-3 rounded-full" style={{ background: "#0D1016" }} />
      </div>
      <p style={{ fontSize: 14, fontWeight: 500, color: "rgba(0,0,0,0.55)", letterSpacing: "-0.3px", marginBottom: 4 }}>
        Analisi in corso…
      </p>
      <p style={{ fontFamily: MONO, fontSize: 11, color: "rgba(0,0,0,0.28)", marginBottom: 32,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 320, margin: "0 auto 32px" }}>
        {url}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 200, margin: "0 auto", textAlign: "left" }}>
        {criteria.map((label, i) => (
          <motion.div key={label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: [0, 0.55, 0.55], x: 0 }}
            transition={{ delay: i * 0.32, duration: 0.4 }}
            style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: MONO,
              fontSize: 11, color: "rgba(0,0,0,0.38)" }}>
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: "rgba(0,0,0,0.35)", animation: `pulse 1.5s ${i * 0.3}s infinite` }} />
            {label}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Results ───────────────────────────────────────────────────────────────────
function ScanResults({ result, onReset }: { result: Art50ScanResult; onReset: () => void }) {
  const gradeColor = GRADE_COLOR[result.grade] ?? "rgba(0,0,0,0.22)";
  const riskColor  = RISK_COLOR[result.riskLevel] ?? "#0D1016";
  const formattedDate = new Date(result.scannedAt).toLocaleString("it-IT", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const urlTrunc = result.url.length > 40 ? result.url.slice(0, 40) + "…" : result.url;

  const CARD = {
    background: "#FAFAF9",
    border: "1px solid rgba(0,0,0,0.07)",
    borderRadius: 16,
    padding: "24px",
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-3xl mx-auto px-4 pb-24"
    >
      {/* Score + Risk */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div style={{ ...CARD, textAlign: "center" }}>
          <ScoreCircle score={result.score} grade={result.grade} />
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <span style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 400, color: gradeColor, letterSpacing: "-1px" }}>
              {result.grade}
            </span>
            <span style={{ fontSize: 13, color: "rgba(0,0,0,0.42)" }}>{result.gradeLabel}</span>
          </div>
        </div>

        <div style={CARD}>
          <p style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: "0.09em",
            textTransform: "uppercase", color: "rgba(0,0,0,0.30)", marginBottom: 10 }}>
            Livello di rischio sanzionatorio
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span className="w-2 h-2 rounded-full" style={{ background: riskColor, flexShrink: 0 }} />
            <span style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 400, color: riskColor, letterSpacing: "-0.8px" }}>
              {result.riskLevel.toUpperCase()}
            </span>
          </div>
          <p style={{ fontSize: 12, color: "rgba(0,0,0,0.42)", lineHeight: 1.55, marginBottom: 16 }}>
            {result.sanctionEstimate}
          </p>
          <div style={{ display: "inline-block", fontFamily: MONO, fontSize: 12, padding: "6px 12px",
            borderRadius: 8, background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.07)",
            color: "rgba(0,0,0,0.55)" }}>
            <span style={{ color: "#0D1016", fontWeight: 600 }}>{result.criticalCount} critico/i</span>
            <span style={{ color: "rgba(0,0,0,0.20)" }}> · </span>
            <span>{result.warningCount} da verificare</span>
          </div>
          <p style={{ marginTop: 12, fontFamily: MONO, fontSize: 10, color: "rgba(0,0,0,0.25)" }}>
            {formattedDate} · {urlTrunc}
          </p>
        </div>
      </div>

      {/* Radar */}
      <div style={{ ...CARD, display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
        <p style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: "0.09em",
          textTransform: "uppercase", color: "rgba(0,0,0,0.30)", marginBottom: 20 }}>
          Profilo di conformità Art. 50
        </p>
        <RadarChart signals={result.signals} />
      </div>

      {/* Signal rows */}
      <p style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: "0.09em",
        textTransform: "uppercase", color: "rgba(0,0,0,0.30)", marginBottom: 12 }}>
        Analisi dettagliata
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
        {result.signals.map((s, i) => <SignalRow key={s.criterion} signal={s} index={i} />)}
      </div>

      {/* Gap report teaser (locked) */}
      {result.criticalCount > 0 && (
        <div style={{ position: "relative", borderRadius: 16, border: "1px solid rgba(0,0,0,0.09)",
          background: "#FAFAF9", padding: 24, marginBottom: 24, overflow: "hidden" }}>
          <div style={{ filter: "blur(4px)", userSelect: "none", pointerEvents: "none", marginBottom: 16 }}
            aria-hidden="true">
            {[0.75, 1, 0.83, 0.67, 1, 0.9].map((w, i) => (
              <div key={i} style={{ height: 10, borderRadius: 5, background: "rgba(0,0,0,0.07)",
                width: `${w * 100}%`, marginBottom: 10 }} />
            ))}
          </div>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", borderRadius: 16,
            background: "rgba(255,255,255,0.90)", backdropFilter: "blur(2px)" }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", display: "flex",
              alignItems: "center", justifyContent: "center", marginBottom: 12, fontSize: 18,
              background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.10)" }}>🔒</div>
            <p style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 400, color: "#0D1016",
              letterSpacing: "-0.4px", marginBottom: 8 }}>
              Piano di remediation completo
            </p>
            <p style={{ fontSize: 12, textAlign: "center", maxWidth: 280, color: "rgba(0,0,0,0.45)",
              lineHeight: 1.65 }}>
              {result.criticalCount} gap critico/i rilevato/i. Il piano dettagliato con
              implementazione guidata è incluso nel piano Starter.
            </p>
          </div>
        </div>
      )}

      {/* CTA */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(0,0,0,0.09)", background: "#FAFAF9",
        padding: "40px 32px", textAlign: "center", marginBottom: 24 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 20,
          border: "1px solid rgba(0,0,0,0.09)", background: "rgba(0,0,0,0.03)",
          padding: "4px 14px", fontFamily: MONO, fontSize: 11, color: "rgba(0,0,0,0.38)", marginBottom: 20 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0D1016", display: "block" }} />
          Piano Starter · €49/mese
        </div>
        <h3 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 400, color: "#0D1016",
          letterSpacing: "-0.8px", marginBottom: 12 }}>
          {result.score >= 80
            ? "Genera il Registro di Implementazione Art. 50"
            : `Risolvi ${result.criticalCount + result.warningCount} gap e genera il registro`}
        </h3>
        <p style={{ fontSize: 13, color: "rgba(0,0,0,0.45)", lineHeight: 1.7,
          maxWidth: 440, margin: "0 auto 28px" }}>
          Il Registro di Implementazione Art. 50 documenta le azioni adottate ed è la base difendibile
          in caso di ispezione di mercato (Art. 74 AI Act). Incluso nel piano Starter.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
          <a href="/pricing" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center",
            borderRadius: 8, fontSize: 13, fontWeight: 500, fontFamily: MONO,
            padding: "11px 28px", background: "#0D1016", color: "#fff", textDecoration: "none",
            transition: "opacity .18s ease" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.82")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
            Inizia gratis — 14 giorni →
          </a>
          <button onClick={onReset} style={{ display: "inline-flex", alignItems: "center",
            justifyContent: "center", borderRadius: 8, fontSize: 13, fontWeight: 500,
            fontFamily: MONO, padding: "11px 24px", background: "transparent",
            border: "1px solid rgba(0,0,0,0.14)", color: "rgba(0,0,0,0.55)",
            cursor: "pointer", transition: "background .18s ease" }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.04)")}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}>
            Analizza un altro URL
          </button>
        </div>
        <p style={{ marginTop: 16, fontFamily: MONO, fontSize: 11, color: "rgba(0,0,0,0.25)" }}>
          Deadline: 2 dicembre 2026 · Multa max: 1% fatturato globale · Nessuna carta richiesta per il trial
        </p>
      </div>

      <p style={{ fontFamily: MONO, fontSize: 11, textAlign: "center",
        color: "rgba(0,0,0,0.25)", lineHeight: 1.7 }}>
        {result.disclaimer}
      </p>
    </motion.section>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function ScannerPage() {
  const [url,     setUrl]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [result,  setResult]  = useState<Art50ScanResult | null>(null);

  function reset() { setResult(null); setUrl(""); setError(null); }

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
    } catch {
      setError("Impossibile completare la scansione. Controlla la connessione.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Nav />
      <main style={{ background: "#ffffff", minHeight: "100vh" }}>
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ paddingTop: 96, paddingBottom: 56, textAlign: "center",
            maxWidth: 720, margin: "0 auto", padding: "96px 24px 56px" }}
        >
          {/* Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 20,
            border: "1px solid rgba(0,0,0,0.09)", background: "rgba(0,0,0,0.03)",
            padding: "5px 16px", fontFamily: MONO, fontSize: 11,
            color: "rgba(0,0,0,0.38)", marginBottom: 32 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%",
              background: "#0D1016", display: "block" }} />
            EU AI Act — Art. 50 · Deadline: 2 dicembre 2026
          </div>

          <h1 style={{ fontFamily: SERIF, fontSize: "clamp(32px, 4.5vw, 54px)", fontWeight: 400,
            letterSpacing: "-2.5px", lineHeight: 1.05, color: "#0D1016", marginBottom: 20 }}>
            Il tuo sito è conforme
            <br />
            alla disclosure AI?
          </h1>

          <p style={{ fontSize: 15, fontWeight: 300, color: "rgba(0,0,0,0.45)",
            lineHeight: 1.75, marginBottom: 40, maxWidth: 440, margin: "0 auto 40px" }}>
            Verifica in 15 secondi se le tue interfacce AI rispettano i 5 criteri dell&rsquo;Art. 50.
            Obbligatorio dal 2 dicembre 2026. Nessuna registrazione richiesta.
          </p>

          {/* Form */}
          <form onSubmit={handleScan} style={{ maxWidth: 520, margin: "0 auto" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 6,
              borderRadius: 12, background: "rgba(0,0,0,0.03)",
              border: "1px solid rgba(0,0,0,0.09)",
              boxShadow: "0 2px 16px rgba(0,0,0,0.05)" }}>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://tuo-sito.it"
                required
                disabled={loading}
                style={{ flex: 1, minWidth: 200, background: "transparent", outline: "none",
                  padding: "10px 16px", fontSize: 14, color: "#0D1016",
                  fontFamily: MONO, letterSpacing: "-0.2px" }}
              />
              <button
                type="submit"
                disabled={loading || !url.trim()}
                style={{ flexShrink: 0, borderRadius: 8, padding: "10px 24px",
                  fontSize: 13, fontWeight: 500, fontFamily: MONO,
                  background: "#0D1016", color: "#fff", border: "none", cursor: "pointer",
                  transition: "opacity .18s ease", opacity: (loading || !url.trim()) ? 0.4 : 1 }}
                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.opacity = "0.82"; }}
                onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.opacity = (loading || !url.trim()) ? "0.4" : "1")}
              >
                {loading ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <svg style={{ animation: "spin 0.9s linear infinite", width: 14, height: 14 }}
                      viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="4"/>
                      <path fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Analisi…
                  </span>
                ) : "Analizza gratis →"}
              </button>
            </div>
          </form>

          <AnimatePresence>
            {error && (
              <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ marginTop: 16, fontFamily: MONO, fontSize: 12, display: "inline-block",
                  padding: "8px 16px", borderRadius: 8,
                  background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.12)",
                  color: "rgba(0,0,0,0.60)" }}>
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {!loading && !result && (
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center",
              justifyContent: "center", gap: 20, marginTop: 24,
              fontFamily: MONO, fontSize: 11, color: "rgba(0,0,0,0.25)" }}>
              {["Nessuna registrazione", "5 criteri Art. 50", "Risultato in 15s", "Scansione anonima"].map(s => (
                <span key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 4, height: 4, borderRadius: "50%",
                    background: "rgba(0,0,0,0.18)", display: "block" }} />
                  {s}
                </span>
              ))}
            </div>
          )}
        </motion.section>

        <AnimatePresence mode="wait">
          {loading  && <ScanLoading  key="load" url={url} />}
          {!loading && result && <ScanResults key="res" result={result} onReset={reset} />}
        </AnimatePresence>
      </main>
    </>
  );
}
