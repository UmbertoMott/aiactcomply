"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import { useT } from "@/i18n/LocaleProvider";

export default function CtaFinal() {
  const t = useT("ctaFinal");
  return (
    <section
      className="px-12 py-28 text-center"
      style={{ background: "#0D1016" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="max-w-2xl mx-auto"
      >
        <h2
          className="text-white mb-5"
          style={{
            fontSize: "clamp(36px, 4vw, 52px)",
            fontWeight: 400,
            letterSpacing: "-2.5px",
            lineHeight: 1.05,
          }}
        >
          {t("titleLine1")}<br />{t("titleLine2")}
        </h2>
        <p
          className="mb-9 leading-relaxed"
          style={{
            fontSize: "16px",
            fontWeight: 300,
            color: "rgba(255,255,255,0.4)",
          }}
        >
          {t("subtitle")}
        </p>
        <div className="flex gap-3 justify-center">
          <Button href="/contatti" variant="primary">
            {t("ctaPrimary")}
          </Button>
          <Button href="/contatti" variant="ghost">{t("ctaSecondary")}</Button>
        </div>
      </motion.div>
    </section>
  );
}
