"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState, useEffect } from "react";

const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "'DM Mono', monospace";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

const wordVariant = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.52, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

const CYCLING_WORDS = ["compromessi.", "burocrazia.", "ritardi.", "rischi.", "eccezioni."];
const DELETE_SPEED = 48;
const TYPE_SPEED = 60;
const IDLE_MS = 2400;
const START_DELAY = 2000;

function TypewriterWord() {
  const [wordIdx, setWordIdx] = useState(0);
  const [displayed, setDisplayed] = useState(CYCLING_WORDS[0]);
  const [phase, setPhase] = useState<"idle" | "deleting" | "typing" | "waiting">("idle");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), START_DELAY);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!started) return;
    let t: ReturnType<typeof setTimeout>;
    if (phase === "idle") {
      t = setTimeout(() => setPhase("deleting"), IDLE_MS);
    } else if (phase === "deleting") {
      if (displayed.length > 0) {
        t = setTimeout(() => setDisplayed(d => d.slice(0, -1)), DELETE_SPEED);
      } else {
        setPhase("waiting");
      }
    } else if (phase === "waiting") {
      t = setTimeout(() => {
        const next = (wordIdx + 1) % CYCLING_WORDS.length;
        setWordIdx(next);
        setPhase("typing");
      }, 180);
    } else if (phase === "typing") {
      const target = CYCLING_WORDS[wordIdx];
      if (displayed.length < target.length) {
        t = setTimeout(() => setDisplayed(target.slice(0, displayed.length + 1)), TYPE_SPEED);
      } else {
        setPhase("idle");
      }
    }
    return () => clearTimeout(t);
  }, [started, phase, displayed, wordIdx]);

  const showCursor = phase !== "idle" || !started;

  return (
    <span style={{ position: "relative", fontStyle: "italic", fontWeight: 300 }}>
      {displayed}
      <span style={{
        display: "inline-block", width: 2, height: "0.8em", background: "#0D1016",
        marginLeft: 3, verticalAlign: "middle",
        animation: showCursor ? "none" : "cursorBlink 1.1s ease-in-out infinite",
        opacity: showCursor ? 1 : undefined, borderRadius: 1,
      }} />
    </span>
  );
}

// ─── FRAMEWORK BADGE ICONS (original SVG, no trademarks) ─────────────────────

function EuStarsIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30 - 90) * (Math.PI / 180);
        const x = 12 + 7.5 * Math.cos(angle);
        const y = 12 + 7.5 * Math.sin(angle);
        return <circle key={i} cx={x} cy={y} r="1.55" fill={color} />;
      })}
    </svg>
  );
}

function IsoGridIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" stroke={color} strokeWidth="1.6" fill="none" />
      <line x1="3" y1="9"  x2="21" y2="9"  stroke={color} strokeWidth="1"   opacity="0.45" />
      <line x1="3" y1="15" x2="21" y2="15" stroke={color} strokeWidth="1"   opacity="0.45" />
      <line x1="9"  y1="3" x2="9"  y2="21" stroke={color} strokeWidth="1"   opacity="0.45" />
      <line x1="15" y1="3" x2="15" y2="21" stroke={color} strokeWidth="1"   opacity="0.45" />
    </svg>
  );
}

function NistDotsIcon({ color }: { color: string }) {
  const pts = [4, 12, 20];
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      {pts.flatMap(x => pts.map(y => (
        <circle key={`${x}${y}`} cx={x} cy={y} r={x === 12 && y === 12 ? 2.8 : 2} fill={color}
          opacity={x === 12 && y === 12 ? 1 : 0.55} />
      )))}
    </svg>
  );
}

function GdprShieldIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 2.5L3 6.5v5.5c0 4.9 3.8 9.4 9 10.5 5.2-1.1 9-5.6 9-10.5V6.5L12 2.5z"
        stroke={color} strokeWidth="1.6" fill="none" strokeLinejoin="round" />
      <path d="M8.5 12l2.5 2.5 4.5-5" stroke={color} strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="11" width="16" height="11" rx="2.5" stroke={color} strokeWidth="1.6" fill="none" />
      <path d="M7.5 11V7.5a4.5 4.5 0 0 1 9 0V11" stroke={color} strokeWidth="1.6"
        fill="none" strokeLinecap="round" />
      <circle cx="12" cy="17" r="1.6" fill={color} />
      <line x1="12" y1="17" x2="12" y2="19.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function EdpbIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.6" fill="none" />
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i * 45 - 90) * (Math.PI / 180);
        return <circle key={i} cx={12 + 5 * Math.cos(angle)} cy={12 + 5 * Math.sin(angle)}
          r="1.3" fill={color} opacity={i % 2 === 0 ? 1 : 0.45} />;
      })}
    </svg>
  );
}

function FrameworkIcon({ type, color }: { type: string; color: string }) {
  switch (type) {
    case "eu":   return <EuStarsIcon color={color} />;
    case "iso":  return <IsoGridIcon color={color} />;
    case "nist": return <NistDotsIcon color={color} />;
    case "gdpr": return <GdprShieldIcon color={color} />;
    case "lock": return <LockIcon color={color} />;
    case "edpb": return <EdpbIcon color={color} />;
    default:     return null;
  }
}

// ─── FRAMEWORK BADGE COMPONENT ────────────────────────────────────────────────

const FRAMEWORKS = [
  { name: "EU AI Act",   sub: "Reg. 2024/1689",      color: "#003399", icon: "eu"   },
  { name: "ISO 42001",   sub: "AI Management",        color: "#111111", icon: "iso"  },
  { name: "NIST AI RMF", sub: "v1.0 · 2023",          color: "#0B3D2E", icon: "nist" },
  { name: "GDPR",        sub: "Reg. 2016/679",        color: "#003399", icon: "gdpr" },
  { name: "ISO 27001",   sub: "Info Security",        color: "#111111", icon: "lock" },
  { name: "EDPB · WP29", sub: "AI Guidelines",        color: "#003399", icon: "edpb" },
];

function FrameworkBadge({ name, sub, color, icon }: typeof FRAMEWORKS[0]) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        padding: "11px 18px 11px 12px",
        border: `1.5px solid ${hovered ? color : "rgba(0,0,0,0.10)"}`,
        borderRadius: 10,
        background: hovered ? `${color}08` : "#ffffff",
        boxShadow: hovered
          ? `0 6px 20px ${color}22, 0 1px 4px rgba(0,0,0,0.06)`
          : "0 1px 4px rgba(0,0,0,0.05), 0 0 0 0.5px rgba(0,0,0,0.04)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        transition: "all 0.22s cubic-bezier(0.34,1.56,0.64,1)",
        cursor: "default",
        userSelect: "none",
      }}
    >
      {/* Icon container */}
      <div style={{
        width: 36, height: 36,
        borderRadius: 7,
        background: hovered ? `${color}14` : `${color}0d`,
        border: `1px solid ${color}22`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        transition: "all 0.22s ease",
      }}>
        <FrameworkIcon type={icon} color={color} />
      </div>

      {/* Text */}
      <div>
        <div style={{
          fontFamily: MONO,
          fontSize: 12,
          fontWeight: 700,
          color: hovered ? color : "#0D1016",
          letterSpacing: "0.01em",
          lineHeight: 1.2,
          marginBottom: 3,
          transition: "color 0.2s ease",
        }}>
          {name}
        </div>
        <div style={{
          fontFamily: MONO,
          fontSize: 9,
          color: hovered ? `${color}99` : "rgba(0,0,0,0.35)",
          letterSpacing: "0.04em",
          transition: "color 0.2s ease",
        }}>
          {sub}
        </div>
      </div>
    </div>
  );
}

// ─── HERO ─────────────────────────────────────────────────────────────────────

const LINE1 = ["AI", "Act", "compliance,"];

export default function Hero() {
  return (
    <section
      className="relative overflow-hidden text-center px-6 pt-24 pb-0"
      style={{ background: "#ffffff" }}
    >
      <style>{`
        @keyframes cursorBlink {
          0%, 100% { opacity: 1 }
          50%       { opacity: 0 }
        }
        @keyframes frameworkTicker {
          from { transform: translateX(0) }
          to   { transform: translateX(-50%) }
        }
        .framework-ticker {
          display: flex;
          gap: 12px;
          width: max-content;
          animation: frameworkTicker 34s linear infinite;
        }
        .framework-ticker:hover {
          animation-play-state: paused;
        }
      `}</style>

      <motion.div
        initial="hidden"
        animate="show"
        variants={container}
        className="relative z-10 flex flex-col items-center max-w-4xl mx-auto"
      >
        {/* Badge */}
        <motion.div variants={wordVariant}>
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8"
            style={{ border: "1px solid rgba(0,0,0,0.10)", fontSize: 12, color: "rgba(0,0,0,0.45)" }}
          >
            <span className="block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#0D1016" }} />
            EU AI Act — In vigore agosto 2026
          </div>
        </motion.div>

        {/* H1 */}
        <motion.h1
          variants={container}
          className="mb-6"
          style={{
            fontFamily: SERIF,
            fontSize: "clamp(44px, 6.5vw, 80px)",
            fontWeight: 400,
            letterSpacing: "-3.5px",
            lineHeight: 1.0,
            color: "#0D1016",
          }}
        >
          {LINE1.map((word) => (
            <motion.span key={word} variants={wordVariant}
              style={{ display: "inline-block", marginRight: "0.22em" }}>
              {word}
            </motion.span>
          ))}
          <br />
          <motion.span variants={wordVariant} style={{ display: "inline-block", marginRight: "0.22em" }}>
            senza
          </motion.span>
          <motion.span variants={wordVariant} style={{ display: "inline-block" }}>
            <TypewriterWord />
          </motion.span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={wordVariant}
          className="mb-10 max-w-md"
          style={{ fontSize: 17, fontWeight: 300, color: "rgba(0,0,0,0.45)", letterSpacing: "-0.2px", lineHeight: 1.65 }}
        >
          AIComply automatizza risk assessment, documentazione e integrazione nei tuoi workflow.
          Dal caos normativo alla conformità certificata.
        </motion.p>

        {/* CTAs */}
        <motion.div variants={wordVariant} className="flex gap-3 mb-14">
          <Link href="/register"
            className="text-[13px] font-medium rounded-full px-6 py-3 transition-opacity hover:opacity-80"
            style={{ background: "#0D1016", color: "#ffffff", letterSpacing: "-0.2px" }}
          >
            Inizia gratis
          </Link>
          <Link href="/pricing"
            className="text-[13px] rounded-full px-6 py-3 transition-colors"
            style={{ border: "1px solid rgba(0,0,0,0.14)", color: "rgba(0,0,0,0.55)", background: "transparent" }}
          >
            Scopri i prezzi
          </Link>
        </motion.div>

        {/* Hero video */}
        <motion.div
          variants={wordVariant}
          className="w-full mb-0"
          style={{ maxWidth: 960 }}
        >
          <div
            style={{
              position: "relative",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 40px 100px rgba(0,0,0,0.22), 0 8px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.08)",
            }}
          >
            {/* Dark overlay for the "imbrunito" effect */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.18)",
                zIndex: 1,
                pointerEvents: "none",
                borderRadius: 16,
              }}
            />
            {/* Bottom gradient vignette */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "30%",
                background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.32))",
                zIndex: 2,
                pointerEvents: "none",
              }}
            />
            <video
              src="/videos/hero-demo.mp4"
              autoPlay
              muted
              loop
              playsInline
              style={{
                width: "100%",
                height: "auto",
                display: "block",
                filter: "brightness(0.80) contrast(1.04) saturate(0.88)",
              }}
            />
          </div>
        </motion.div>
      </motion.div>

      {/* Framework ticker */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.85, duration: 0.8 }}
        style={{
          borderTop: "1px solid rgba(0,0,0,0.07)",
          overflow: "hidden",
          paddingTop: 28,
          paddingBottom: 52,
          maskImage: "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
        }}
      >
        <div className="framework-ticker">
          {[...FRAMEWORKS, ...FRAMEWORKS, ...FRAMEWORKS].map((fw, i) => (
            <FrameworkBadge key={i} {...fw} />
          ))}
        </div>
      </motion.div>
    </section>
  );
}
