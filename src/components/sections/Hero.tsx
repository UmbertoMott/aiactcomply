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
const START_DELAY = 2000; // wait for entrance anim

function TypewriterWord() {
  const [wordIdx, setWordIdx] = useState(0);
  const [displayed, setDisplayed] = useState(CYCLING_WORDS[0]);
  const [phase, setPhase] = useState<"idle" | "deleting" | "typing" | "waiting">("idle");
  const [started, setStarted] = useState(false);

  // Delay start until entrance animation finishes
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
      <span
        style={{
          display: "inline-block",
          width: 2,
          height: "0.8em",
          background: "#0D1016",
          marginLeft: 3,
          verticalAlign: "middle",
          animation: showCursor ? "none" : "cursorBlink 1.1s ease-in-out infinite",
          opacity: showCursor ? 1 : undefined,
          borderRadius: 1,
        }}
      />
    </span>
  );
}

const LINE1 = ["AI", "Act", "compliance,"];

const FRAMEWORKS = [
  { name: "EU AI Act",    sub: "Reg. 2024/1689",      dot: "#003399" },
  { name: "ISO 42001",    sub: "AI Management System", dot: "#1a1a1a" },
  { name: "NIST AI RMF",  sub: "v1.0",                dot: "#0B3D2E" },
  { name: "GDPR",         sub: "Reg. 2016/679",        dot: "#003399" },
  { name: "ISO 27001",    sub: "Information Security", dot: "#1a1a1a" },
  { name: "EDPB · WP29",  sub: "AI Guidelines",        dot: "#003399" },
];

export default function Hero() {
  return (
    <section
      className="relative overflow-hidden text-center px-6 pt-24 pb-0"
      style={{ background: "#ffffff" }}
    >
      <style>{`
        @keyframes cursorBlink {
          0%, 100% { opacity: 1 }
          50% { opacity: 0 }
        }
      `}</style>

      <motion.div
        initial="hidden"
        animate="show"
        className="relative z-10 flex flex-col items-center max-w-4xl mx-auto"
      >
        {/* Badge */}
        <motion.div variants={wordVariant}>
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8"
            style={{ border: "1px solid rgba(0,0,0,0.10)", fontSize: 12, color: "rgba(0,0,0,0.45)" }}
          >
            <span
              className="block w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: "#0D1016" }}
            />
            EU AI Act — In vigore agosto 2026
          </div>
        </motion.div>

        {/* H1 — word-by-word stagger + cycling second line */}
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
            <motion.span
              key={word}
              variants={wordVariant}
              style={{ display: "inline-block", marginRight: "0.22em" }}
            >
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
          style={{
            fontSize: 17,
            fontWeight: 300,
            color: "rgba(0,0,0,0.45)",
            letterSpacing: "-0.2px",
            lineHeight: 1.65,
          }}
        >
          AIComply automatizza risk assessment, documentazione e integrazione nei tuoi workflow.
          Dal caos normativo alla conformità certificata.
        </motion.p>

        {/* CTAs */}
        <motion.div variants={wordVariant} className="flex gap-3 mb-20">
          <Link
            href="/register"
            className="text-[13px] font-medium rounded-full px-6 py-3 transition-opacity hover:opacity-80"
            style={{ background: "#0D1016", color: "#ffffff", letterSpacing: "-0.2px" }}
          >
            Inizia gratis
          </Link>
          <Link
            href="/pricing"
            className="text-[13px] rounded-full px-6 py-3 transition-colors"
            style={{
              border: "1px solid rgba(0,0,0,0.14)",
              color: "rgba(0,0,0,0.55)",
              background: "transparent",
            }}
          >
            Scopri i prezzi
          </Link>
        </motion.div>
      </motion.div>

      {/* Framework trust row */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.7 }}
        className="max-w-5xl mx-auto"
        style={{ borderTop: "1px solid rgba(0,0,0,0.07)" }}
      >
        <p
          className="text-center mt-7 mb-6"
          style={{
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.09em",
            textTransform: "uppercase",
            color: "rgba(0,0,0,0.28)",
            fontFamily: MONO,
          }}
        >
          Framework supportati nativamente
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pb-14">
          {FRAMEWORKS.map((fw) => (
            <div
              key={fw.name}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 14px",
                border: "1px solid rgba(0,0,0,0.09)",
                borderRadius: 8,
                background: "#ffffff",
                boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: fw.dot, flexShrink: 0 }} />
              <div>
                <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: "#0D1016", letterSpacing: "-0.1px", lineHeight: 1.2 }}>
                  {fw.name}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: "rgba(0,0,0,0.35)", letterSpacing: "0.02em", marginTop: 1 }}>
                  {fw.sub}
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
