"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SERIF = "Georgia, 'Times New Roman', serif";

const modules = [
  { art: "Art. 6",  name: "AI Classifier",  desc: "Classificazione rischio automatica secondo gli allegati EU AI Act" },
  { art: "Art. 9",  name: "Risk Manager",   desc: "Risk register, gap analysis e copertura Art. 9" },
  { art: "Art. 11", name: "Documentazione", desc: "AIA, FRIA e DPIA generate automaticamente con AI" },
  { art: "Art. 10", name: "Data Audit",     desc: "Qualità dati, bias detection e data lineage traceability" },
  { art: "Art. 12", name: "LogVault",       desc: "Logging hash-chained e audit trail immutabile" },
  { art: "Art. 27", name: "FRIA",           desc: "Fundamental Rights Impact Assessment guidato passo-passo" },
  { art: "Art. 72", name: "Post-Market",    desc: "Monitoraggio continuo e drift detection AI" },
  { art: "Art. 50", name: "Scanner",        desc: "Verifica trasparenza AI gratuita e anonima" },
];

function ModuleCard({ m, i }: { m: (typeof modules)[0]; i: number }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.35, delay: i * 0.04 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "#0D1016" : "#FAFAF9",
        padding: "20px 18px",
        transition: "background 0.22s ease",
        cursor: "default",
        minHeight: 90,
      }}
    >
      <p
        style={{
          fontSize: 10,
          fontWeight: 500,
          color: hovered ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.28)",
          letterSpacing: "0.06em",
          marginBottom: 8,
          textTransform: "uppercase",
          transition: "color 0.22s ease",
        }}
      >
        {m.art}
      </p>
      <p
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: hovered ? "rgba(255,255,255,0.92)" : "#0D1016",
          marginBottom: hovered ? 6 : 0,
          letterSpacing: "-0.3px",
          transition: "color 0.22s ease, margin-bottom 0.22s ease",
        }}
      >
        {m.name}
      </p>
      <AnimatePresence>
        {hovered && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.45)",
              lineHeight: 1.55,
              margin: 0,
            }}
          >
            {m.desc}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function PlatformSection() {
  return (
    <section
      className="px-12 py-24"
      style={{ background: "#FAFAF9", borderTop: "1px solid rgba(0,0,0,0.07)" }}
    >
      <div className="max-w-5xl mx-auto">
        <p
          className="text-[12px] font-medium uppercase mb-5"
          style={{ letterSpacing: "1.5px", color: "rgba(0,0,0,0.28)" }}
        >
          La piattaforma
        </p>
        <h2
          className="mb-4"
          style={{
            fontFamily: SERIF,
            fontSize: "clamp(32px, 4vw, 48px)",
            fontWeight: 400,
            letterSpacing: "-2px",
            lineHeight: 1.05,
            color: "#0D1016",
          }}
        >
          La piattaforma unificata<br />per la conformità AI.
        </h2>
        <p
          className="mb-12 max-w-lg"
          style={{ fontSize: 14, color: "rgba(0,0,0,0.42)", lineHeight: 1.65 }}
        >
          Un unico sistema che connette classificazione, documentazione ed esecuzione degli obblighi normativi EU AI Act.
          <span style={{ color: "rgba(0,0,0,0.28)", fontStyle: "italic", marginLeft: 6 }}>
            Passa il mouse sui moduli.
          </span>
        </p>

        <div
          className="grid"
          style={{
            gridTemplateColumns: "repeat(4, 1fr)",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 12,
            overflow: "hidden",
            background: "rgba(0,0,0,0.06)",
            gap: 1,
          }}
        >
          {modules.map((m, i) => (
            <ModuleCard key={m.name} m={m} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
