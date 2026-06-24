"use client";

import { motion } from "framer-motion";

const SERIF = "Georgia, 'Times New Roman', serif";

const modules = [
  { art: "Art. 6",  name: "AI Classifier",  desc: "Classificazione rischio automatica AI Act" },
  { art: "Art. 9",  name: "Risk Manager",   desc: "Risk register, gap analysis, Art. 9" },
  { art: "Art. 11", name: "Documentazione", desc: "AIA, FRIA e DPIA generate automaticamente" },
  { art: "Art. 10", name: "Data Audit",     desc: "Qualità dati, bias detection e data lineage" },
  { art: "Art. 12", name: "LogVault",       desc: "Logging hash-chained e audit trail immutabile" },
  { art: "Art. 27", name: "FRIA",           desc: "Fundamental Rights Impact Assessment guidato" },
  { art: "Art. 72", name: "Post-Market",    desc: "Monitoraggio continuo e drift detection" },
  { art: "Art. 50", name: "Scanner",        desc: "Verifica trasparenza AI gratuita e anonima" },
];

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
          Un unico sistema che connette classificazione, documentazione ed esecuzione degli obblighi
          normativi EU AI Act — con tutti i moduli integrati.
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
            <motion.div
              key={m.name}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
              style={{ background: "#FAFAF9", padding: "20px 18px" }}
            >
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  color: "rgba(0,0,0,0.28)",
                  letterSpacing: "0.06em",
                  marginBottom: 8,
                  textTransform: "uppercase",
                }}
              >
                {m.art}
              </p>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#0D1016",
                  marginBottom: 6,
                  letterSpacing: "-0.3px",
                }}
              >
                {m.name}
              </p>
              <p style={{ fontSize: 12, color: "rgba(0,0,0,0.40)", lineHeight: 1.55 }}>
                {m.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
