"use client";

import { motion } from "framer-motion";
import { useT } from "@/i18n/LocaleProvider";

const SERIF = "Georgia, 'Times New Roman', serif";
const MONO  = "'DM Mono', monospace";

export default function ChiEroga() {
  const t = useT("chiEroga");
  return (
    <section
      id="chi-eroga"
      style={{ background: "#fafaf9", borderTop: "1px solid rgba(0,0,0,0.07)", borderBottom: "1px solid rgba(0,0,0,0.07)", padding: "72px 24px" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.55 }}
        style={{ maxWidth: 760, margin: "0 auto" }}
      >
        {/* Eyebrow */}
        <p style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.35)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>
          {t("kicker")}
        </p>

        {/* Title */}
        <h2 style={{
          fontFamily: SERIF,
          fontSize: "clamp(24px, 3.5vw, 36px)",
          fontWeight: 400,
          letterSpacing: "-0.5px",
          lineHeight: 1.2,
          color: "#0D1016",
          marginBottom: 20,
        }}>
          {t("title")}
        </h2>

        {/* Body */}
        <p
          style={{ fontSize: 16, lineHeight: 1.7, color: "rgba(0,0,0,0.62)", marginBottom: 16 }}
          dangerouslySetInnerHTML={{ __html: t("body1") }}
        />
        <p
          style={{ fontSize: 16, lineHeight: 1.7, color: "rgba(0,0,0,0.62)", marginBottom: 16 }}
          dangerouslySetInnerHTML={{ __html: t("body2") }}
        />

        {/* Divider + legal note */}
        <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", marginTop: 28, paddingTop: 20 }}>
          <p style={{ fontFamily: MONO, fontSize: 11, color: "rgba(0,0,0,0.38)", lineHeight: 1.65 }}>
            {t("legalNote")}
          </p>
        </div>
      </motion.div>
    </section>
  );
}
