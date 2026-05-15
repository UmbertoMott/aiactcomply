"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

const stagger = {
  show: { transition: { staggerChildren: 0.1 } },
};

export default function Hero() {
  return (
    <section
      className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden text-center px-6 pb-24 pt-20"
      style={{ background: "#0D1016" }}
    >
      {/* Mesh gradient */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 20% 10%, rgba(30,58,138,0.35) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 90%, rgba(17,24,83,0.4) 0%, transparent 60%)",
        }}
      />
      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="relative z-10 flex flex-col items-center max-w-4xl"
      >
        {/* Badge */}
        <motion.div variants={fadeUp}>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 text-[12px] text-white/55 mb-9">
            <span
              className="block w-1.5 h-1.5 rounded-full bg-blue-500"
              style={{ boxShadow: "0 0 8px rgba(59,130,246,0.8)" }}
            />
            EU AI Act — In vigore agosto 2026
          </div>
        </motion.div>

        {/* H1 */}
        <motion.h1
          variants={fadeUp}
          className="text-white mb-6"
          style={{
            fontSize: "clamp(40px, 5vw, 68px)",
            fontWeight: 400,
            letterSpacing: "-3px",
            lineHeight: 1.0,
          }}
        >
          AI Act compliance,{" "}
          <em
            className="not-italic"
            style={{
              background:
                "linear-gradient(135deg, #93c5fd 0%, #6366f1 50%, #818cf8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            senza compromessi.
          </em>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={fadeUp}
          className="mb-11 max-w-lg text-white/45"
          style={{ fontSize: "18px", fontWeight: 300, letterSpacing: "-0.2px", lineHeight: 1.6 }}
        >
          AIComply automatizza risk assessment, documentazione e integrazione
          nei tuoi workflow. Dal caos normativo alla conformità certificata.
        </motion.p>

        {/* CTAs */}
        <motion.div variants={fadeUp} className="flex gap-3 mb-18">
          <Button href="/register" variant="primary">
            Inizia gratis
          </Button>
          <Button variant="ghost">Scopri come funziona</Button>
        </motion.div>

        {/* Product mockup */}
        <motion.div
          variants={fadeUp}
          transition={{ delay: 0.15 }}
          className="w-full max-w-4xl rounded-2xl overflow-hidden"
          style={{
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.04)",
            boxShadow:
              "0 40px 80px rgba(0,0,0,0.6), 0 0 120px rgba(59,130,246,0.08)",
          }}
        >
          {/* Browser chrome */}
          <div
            className="flex items-center gap-1.5 px-4 py-3"
            style={{
              background: "rgba(255,255,255,0.05)",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {["rgba(255,255,255,0.12)", "rgba(255,255,255,0.12)", "rgba(255,255,255,0.12)"].map(
              (bg, i) => (
                <span
                  key={i}
                  className="block w-2.5 h-2.5 rounded-full"
                  style={{ background: bg }}
                />
              )
            )}
            <span
              className="mx-auto rounded px-4 py-1 text-[11px] text-white/25"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              app.aicomply.eu
            </span>
          </div>

          {/* Dashboard content */}
          <div className="grid p-6 gap-4" style={{ gridTemplateColumns: "180px 1fr" }}>
            {/* Sidebar */}
            <div
              className="rounded-xl p-4"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div
                className="text-[13px] font-semibold text-white/75 mb-5"
                style={{ letterSpacing: "-0.3px" }}
              >
                AIComply
              </div>
              {["Dashboard", "Risk Assessment", "Documenti", "Integrazioni"].map(
                (item, i) => (
                  <div
                    key={item}
                    className="text-[11px] px-2.5 py-2 rounded-md mb-0.5"
                    style={
                      i === 0
                        ? {
                            background: "rgba(59,130,246,0.15)",
                            color: "rgba(255,255,255,0.8)",
                          }
                        : { color: "rgba(255,255,255,0.3)" }
                    }
                  >
                    {item}
                  </div>
                )
              )}
            </div>

            {/* Main */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span
                  className="text-[15px] font-semibold text-white/85"
                  style={{ letterSpacing: "-0.4px" }}
                >
                  Compliance Overview
                </span>
                <span
                  className="text-[10px] font-semibold rounded-full px-2.5 py-0.5"
                  style={{
                    background: "rgba(34,197,94,0.15)",
                    color: "#4ade80",
                    border: "1px solid rgba(74,222,128,0.2)",
                  }}
                >
                  Compliant
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { label: "Sistemi mappati", value: "12", sub: "3 alto rischio" },
                  { label: "Documenti generati", value: "47", sub: "Aggiornati auto" },
                  { label: "Prossima scadenza", value: "14d", sub: "Review Q2 2026" },
                ].map(({ label, value, sub }) => (
                  <div
                    key={label}
                    className="rounded-lg p-3"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div className="text-[10px] text-white/30 mb-1">{label}</div>
                    <div
                      className="text-[20px] font-semibold text-white/85"
                      style={{ letterSpacing: "-0.8px" }}
                    >
                      {value}
                    </div>
                    <div className="text-[10px] text-white/25 mt-0.5">{sub}</div>
                  </div>
                ))}
              </div>

              <div
                className="rounded-lg p-3"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <div className="flex justify-between text-[10px] text-white/30 mb-2">
                  <span>Completamento requisiti AI Act</span>
                  <span className="text-white/60 font-medium">84%</span>
                </div>
                <div
                  className="h-[3px] rounded-full overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: "84%",
                      background: "linear-gradient(90deg, #3b82f6, #6366f1)",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
