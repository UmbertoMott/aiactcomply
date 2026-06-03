"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";

// ─── Animated preview ─────────────────────────────────────────────────────────
// Score gauge counts 0→47, arc draws in, signal bars stagger in on scroll

const CIRC          = 2 * Math.PI * 38; // r=38 → ≈238.76
const PREVIEW_SCORE = 47;
const PREVIEW_DASH  = (PREVIEW_SCORE / 100) * CIRC;

const PREVIEW_SIGNALS = [
  { label: "Disclosure AI presente",      severity: "critical" as const },
  { label: "Posizione prominente",         severity: "critical" as const },
  { label: "Machine-readable",            severity: "warning"  as const },
  { label: "Lingua corretta",             severity: "ok"       as const },
  { label: "Media sintetici etichettati", severity: "ok"       as const },
];

const SEV_COLOR = {
  critical: { dot: "#f87171", bg: "rgba(127,29,29,0.22)"  },
  warning:  { dot: "#facc15", bg: "rgba(113,63,18,0.20)"  },
  ok:       { dot: "#4ade80", bg: "rgba(20,83,45,0.18)"   },
};

// ease-out cubic
function easeOut(t: number) { return 1 - Math.pow(1 - t, 3); }

function AnimatedPreview() {
  const ref      = useRef<HTMLDivElement>(null);
  const inView   = useInView(ref, { once: true, margin: "-80px" });

  const [score,          setScore]          = useState(0);
  const [arcDash,        setArcDash]        = useState(0);
  const [visibleSignals, setVisibleSignals] = useState<Set<number>>(new Set());

  // ── Spotlight state ────────────────────────────────────────────────────────
  const [spotlight, setSpotlight] = useState<{ x: number; y: number; opacity: number }>({ x: 50, y: 50, opacity: 0 });
  const [clicked,   setClicked]   = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setSpotlight({
      x: ((e.clientX - rect.left) / rect.width)  * 100,
      y: ((e.clientY - rect.top)  / rect.height) * 100,
      opacity: 1,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setSpotlight(s => ({ ...s, opacity: 0 }));
  }, []);

  const handleClick = useCallback(() => {
    setClicked(true);
    setTimeout(() => setClicked(false), 350);
  }, []);

  useEffect(() => {
    if (!inView) return;

    // ── Counter + arc (1.4 s) ──────────────────────────────────────────────
    const DURATION = 1400;
    const start    = performance.now();
    let raf: number;

    function tick(now: number) {
      const t       = Math.min((now - start) / DURATION, 1);
      const eased   = easeOut(t);
      setScore(Math.round(eased * PREVIEW_SCORE));
      setArcDash(eased * PREVIEW_DASH);
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    // ── Signal bars stagger (start after 300 ms) ──────────────────────────
    PREVIEW_SIGNALS.forEach((_, i) => {
      setTimeout(() => setVisibleSignals(prev => new Set([...prev, i])), 300 + i * 130);
    });

    return () => cancelAnimationFrame(raf);
  }, [inView]);

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      className="rounded-2xl p-5 w-full max-w-sm relative overflow-hidden cursor-pointer select-none"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${clicked ? "rgba(250,204,21,0.35)" : "rgba(255,255,255,0.08)"}`,
        boxShadow: clicked
          ? "0 24px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(250,204,21,0.2), 0 0 40px rgba(250,204,21,0.08)"
          : "0 24px 48px rgba(0,0,0,0.4)",
        transition: "box-shadow 0.25s ease, border-color 0.25s ease",
      }}
    >
      {/* Spotlight layer */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          pointerEvents: "none",
          background: `radial-gradient(280px circle at ${spotlight.x}% ${spotlight.y}%, rgba(250,204,21,0.07) 0%, transparent 70%)`,
          opacity: spotlight.opacity,
          transition: "opacity 0.4s ease",
          zIndex: 0,
        }}
      />
      {/* Click flash layer */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          pointerEvents: "none",
          background: "rgba(250,204,21,0.06)",
          opacity: clicked ? 1 : 0,
          transition: clicked ? "opacity 0s" : "opacity 0.35s ease",
          zIndex: 0,
        }}
      />
      {/* Content wrapper — above spotlight layers */}
      <div style={{ position: "relative", zIndex: 1 }}>
      {/* Score circle row */}
      <div className="flex items-center gap-4 mb-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        {/* Animated SVG gauge */}
        <div className="relative flex-shrink-0 w-16 h-16">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
            <circle
              cx="50" cy="50" r="38"
              fill="none"
              stroke="#facc15"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={`${arcDash} ${CIRC}`}
              style={{ filter: "drop-shadow(0 0 5px rgba(250,204,21,0.5))", transition: "none" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="text-[18px] font-light tabular-nums"
              style={{ color: "#facc15", letterSpacing: "-1px" }}
            >
              {score}
            </span>
          </div>
        </div>

        <div>
          <motion.div
            initial={{ opacity: 0, x: -6 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="flex items-center gap-1.5 mb-0.5"
          >
            <span className="text-xl font-medium" style={{ color: "#facc15", letterSpacing: "-0.8px" }}>C</span>
            <span
              className="text-[10px] font-semibold rounded-full px-2 py-0.5"
              style={{ background: "rgba(250,204,21,0.12)", color: "#facc15", border: "1px solid rgba(250,204,21,0.25)" }}
            >
              Parzialmente conforme
            </span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="flex items-center gap-1.5 text-[11px]"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#f87171" }} />
            <span style={{ color: "#f87171" }}>2 critici</span>
            <span>·</span>
            <span style={{ color: "#facc15" }}>1 attenzione</span>
          </motion.div>
        </div>
      </div>

      {/* Signal bars — staggered reveal */}
      <div className="space-y-2">
        {PREVIEW_SIGNALS.map((sig, i) => {
          const c       = SEV_COLOR[sig.severity];
          const visible = visibleSignals.has(i);
          return (
            <div
              key={sig.label}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg"
              style={{
                background: c.bg,
                opacity: visible ? 1 : 0,
                transform: visible ? "translateX(0)" : "translateX(-10px)",
                transition: "opacity 0.35s ease, transform 0.35s ease",
              }}
            >
              {/* Pulsing dot on critical */}
              <span className="relative flex-shrink-0 w-1.5 h-1.5">
                <span
                  className="block w-1.5 h-1.5 rounded-full"
                  style={{ background: c.dot }}
                />
                {sig.severity === "critical" && (
                  <span
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{ background: c.dot, opacity: 0.4 }}
                  />
                )}
              </span>
              <span className="text-[11px] flex-1 truncate" style={{ color: "rgba(255,255,255,0.55)" }}>
                {sig.label}
              </span>
              <span
                className="text-[9px] font-bold tracking-wide flex-shrink-0 rounded-full px-1.5 py-0.5"
                style={{ background: `${c.dot}22`, color: c.dot }}
              >
                {sig.severity === "critical" ? "CRITICO" : sig.severity === "warning" ? "ATTENZIONE" : "OK"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Fake lock teaser */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.4, delay: 1.1 }}
        className="mt-4 rounded-xl px-3 py-2 flex items-center gap-2.5 text-[11px]"
        style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)" }}
      >
        <span>🔒</span>
        <span style={{ color: "rgba(255,255,255,0.45)" }}>Piano di remediation bloccato — Starter</span>
      </motion.div>
      </div>{/* end content wrapper */}
    </div>
  );
}

// ─── Teaser section ───────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = { show: { transition: { staggerChildren: 0.08 } } };

export default function ScannerTeaser() {
  return (
    <section className="relative overflow-hidden px-6 py-20" style={{ background: "#0A1628" }}>
      {/* Subtle gradient accent */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 110%, rgba(30,58,138,0.28) 0%, transparent 65%)",
        }}
      />
      {/* Grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.014) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.014) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        className="relative z-10 max-w-5xl mx-auto"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* ── Left: copy ── */}
          <div>
            <motion.div variants={fadeUp}>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 text-[12px] text-white/50 mb-7">
                <span
                  className="block w-1.5 h-1.5 rounded-full bg-blue-500"
                  style={{ boxShadow: "0 0 8px rgba(59,130,246,0.8)" }}
                />
                Scanner gratuito · Nessuna registrazione
              </div>
            </motion.div>

            <motion.h2
              variants={fadeUp}
              className="text-white mb-4"
              style={{
                fontSize: "clamp(26px, 3.2vw, 42px)",
                fontWeight: 400,
                letterSpacing: "-2px",
                lineHeight: 1.08,
              }}
            >
              Testa il tuo sito{" "}
              <em
                className="not-italic"
                style={{
                  background: "linear-gradient(135deg, #93c5fd 0%, #6366f1 60%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                in 15 secondi.
              </em>
            </motion.h2>

            <motion.p
              variants={fadeUp}
              style={{
                fontSize: "15px",
                fontWeight: 300,
                letterSpacing: "-0.2px",
                lineHeight: 1.7,
                color: "rgba(255,255,255,0.38)",
                marginBottom: "28px",
              }}
            >
              Lo scanner Art. 50 analizza 5 criteri normativi e ti mostra esattamente
              dove sei esposto a sanzioni. Deadline obbligatoria:{" "}
              <span style={{ color: "rgba(255,255,255,0.65)" }}>2 dicembre 2026</span>.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/scanner"
                className="inline-flex items-center justify-center rounded-full text-[13px] font-medium transition-all duration-200 px-7 py-2.5"
                style={{ background: "#ffffff", color: "#0D1016" }}
              >
                Analizza gratis →
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-full text-[13px] font-medium transition-all duration-200 px-7 py-2.5"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.65)",
                }}
              >
                Scopri il piano Starter
              </Link>
            </motion.div>

            {/* Micro-stats */}
            <motion.div
              variants={fadeUp}
              className="flex flex-wrap items-center gap-4 mt-7 text-[11px]"
              style={{ color: "rgba(255,255,255,0.22)" }}
            >
              {["Nessuna registrazione", "5 criteri Art. 50", "Risultato in 15s"].map((s, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.18)" }} />
                  {s}
                </span>
              ))}
            </motion.div>
          </div>

          {/* ── Right: animated preview ── */}
          <motion.div
            variants={fadeUp}
            className="flex justify-center lg:justify-end"
          >
            <AnimatedPreview />
          </motion.div>

        </div>

        {/* Bottom rule */}
        <motion.div
          variants={fadeUp}
          className="mt-16"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        />
      </motion.div>
    </section>
  );
}
