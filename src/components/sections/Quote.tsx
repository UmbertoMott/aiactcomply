"use client";

import { motion } from "framer-motion";

const SERIF = "Georgia, 'Times New Roman', serif";

export default function Quote() {
  return (
    <section
      className="px-12 py-24"
      style={{ background: "#FAFAF9", borderTop: "1px solid rgba(0,0,0,0.07)" }}
    >
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          style={{ position: "relative" }}
        >
          {/* Decorative large quotation mark */}
          <span
            aria-hidden="true"
            style={{
              fontFamily: SERIF,
              fontSize: 140,
              fontWeight: 300,
              color: "rgba(0,0,0,0.06)",
              position: "absolute",
              top: -28,
              left: -12,
              lineHeight: 1,
              userSelect: "none",
              pointerEvents: "none",
            }}
          >
            &ldquo;
          </span>
          <div style={{ paddingLeft: 52 }}>
            <p
              style={{
                fontFamily: SERIF,
                fontSize: "clamp(20px, 2.5vw, 32px)",
                fontWeight: 300,
                letterSpacing: "-0.8px",
                lineHeight: 1.35,
                color: "#0D1016",
                marginBottom: 32,
              }}
            >
              &ldquo;La compliance nasce come strumento lungo e burocratico — pensato per
              scoraggiare più che guidare. La nostra missione è renderla fluida:
              perché le aziende rispettino davvero i diritti degli utenti,
              non solo per evitare sanzioni salate.&rdquo;
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/founder.jpg"
                alt="Umberto Mottola"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  objectFit: "cover",
                  flexShrink: 0,
                  filter: "grayscale(100%)",
                  border: "1.5px solid rgba(0,0,0,0.10)",
                }}
              />
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: "#0D1016", lineHeight: 1.3 }}>
                  Umberto Mottola
                </p>
                <p style={{ fontSize: 12, color: "rgba(0,0,0,0.38)" }}>Founder, RegulaeOS</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
