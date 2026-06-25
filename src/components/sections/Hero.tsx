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

const TRUST_LOGOS = [
  "Fintech Group",
  "LegalCo EU",
  "HealthAI Systems",
  "Manifattura Srl",
  "Studio Legale XYZ",
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

      {/* Trust logos row */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.7 }}
        className="max-w-4xl mx-auto"
        style={{ borderTop: "1px solid rgba(0,0,0,0.07)" }}
      >
        <p
          className="text-center mt-6 mb-5"
          style={{
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.09em",
            textTransform: "uppercase",
            color: "rgba(0,0,0,0.28)",
          }}
        >
          Utilizzato da team compliance di
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 pb-14">
          {TRUST_LOGOS.map((name) => (
            <span
              key={name}
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "rgba(0,0,0,0.18)",
                letterSpacing: "-0.3px",
              }}
            >
              {name}
            </span>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
