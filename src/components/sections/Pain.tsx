"use client";

import { motion } from "framer-motion";

const painData = [
  {
    value: "6–18",
    unit: "mesi",
    label: "per completare un audit di conformità AI manuale",
  },
  {
    value: "100+",
    unit: "",
    label: "requisiti dell'AI Act da mappare articolo per articolo",
  },
  {
    value: "35M€",
    unit: "",
    label: "sanzione massima per non conformità ai sistemi ad alto rischio",
  },
];

export default function Pain() {
  return (
    <section className="px-12 py-24" style={{ background: "#FAFAF9" }}>
      <div className="max-w-5xl mx-auto">
        <p
          className="text-[12px] font-medium uppercase mb-4"
          style={{ letterSpacing: "1.5px", color: "rgba(0,0,0,0.3)" }}
        >
          Il problema
        </p>
        <h2
          className="mb-16 max-w-2xl"
          style={{
            fontSize: "48px",
            fontWeight: 400,
            letterSpacing: "-2px",
            lineHeight: 1.05,
            color: "#0D1016",
          }}
        >
          La conformità normativa AI è un problema non risolto.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {painData.map(({ value, label }, i) => (
            <motion.div
              key={value}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="pt-7"
              style={{ borderTop: "1px solid rgba(0,0,0,0.1)" }}
            >
              <div
                className="mb-2"
                style={{
                  fontSize: "40px",
                  fontWeight: 300,
                  letterSpacing: "-2px",
                  color: "#0D1016",
                }}
              >
                {value}
              </div>
              <p
                className="text-[13px] leading-relaxed"
                style={{ color: "rgba(0,0,0,0.45)" }}
              >
                {label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
