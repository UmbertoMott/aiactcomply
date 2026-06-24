"use client";

import { motion } from "framer-motion";

const SERIF = "Georgia, 'Times New Roman', serif";

const certs = ["ISO 27001", "GDPR", "ISO 42001", "EU AI Act Ready"];

export default function Quote() {
  return (
    <section
      className="px-12 py-24"
      style={{ background: "#FAFAF9", borderTop: "1px solid rgba(0,0,0,0.07)" }}
    >
      <div className="max-w-5xl mx-auto">
        <div
          style={{
            display: "flex",
            gap: 56,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          {/* Quote */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            style={{ flex: "1 1 360px" }}
          >
            <p
              style={{
                fontFamily: SERIF,
                fontSize: "clamp(22px, 2.8vw, 34px)",
                fontWeight: 300,
                letterSpacing: "-1px",
                lineHeight: 1.3,
                color: "#0D1016",
                marginBottom: 32,
              }}
            >
              &ldquo;La conformità all&rsquo;AI Act non è un audit una tantum.
              È un sistema di gestione continuo — e va costruito adesso.&rdquo;
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.07)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "rgba(0,0,0,0.40)",
                  flexShrink: 0,
                }}
              >
                AC
              </div>
              <div>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#0D1016",
                    lineHeight: 1.3,
                  }}
                >
                  Team AIComply
                </p>
                <p style={{ fontSize: 12, color: "rgba(0,0,0,0.38)" }}>
                  Co-fondatori
                </p>
              </div>
            </div>
          </motion.div>

          {/* Certifications */}
          <div
            style={{
              minWidth: 200,
              borderLeft: "1px solid rgba(0,0,0,0.08)",
              paddingLeft: 48,
            }}
          >
            <p
              style={{
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                color: "rgba(0,0,0,0.28)",
                marginBottom: 18,
              }}
            >
              Certificazioni
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {certs.map((cert) => (
                <div
                  key={cert}
                  style={{
                    border: "1px solid rgba(0,0,0,0.09)",
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "rgba(0,0,0,0.52)",
                    background: "#ffffff",
                    letterSpacing: "-0.1px",
                  }}
                >
                  {cert}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
