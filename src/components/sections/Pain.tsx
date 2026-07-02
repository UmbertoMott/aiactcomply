"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";

// ─── Counter hook ────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1800, started = false) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!started) return;
    let startTime: number | null = null;
    let frame: number;

    function step(ts: number) {
      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(step);
    }

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [started, target, duration]);

  return count;
}

// ─── Single stat card ────────────────────────────────────────────────────────

function StatCard({
  target,
  format,
  label,
  delay,
}: {
  target: number;
  format: (n: number) => string;
  label: string;
  delay: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const count = useCountUp(target, 1600, inView);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay }}
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
        {format(count)}
      </div>
      <p
        className="text-[13px] leading-relaxed"
        style={{ color: "rgba(0,0,0,0.45)" }}
      >
        {label}
      </p>
    </motion.div>
  );
}

// ─── Pain section ─────────────────────────────────────────────────────────────

const painData = [
  {
    target: 18,
    format: (n: number) => `${Math.min(n, 6) === 0 && n < 6 ? 0 : 6}–${n}`,
    label: "per completare un audit di conformità AI manuale",
    delay: 0,
  },
  {
    target: 100,
    format: (n: number) => `${n}+`,
    label: "requisiti dell'AI Act da mappare articolo per articolo",
    delay: 0.1,
  },
  {
    target: 35,
    format: (n: number) => `${n}M€`,
    label: "sanzione massima per non conformità ai sistemi ad alto rischio",
    delay: 0.2,
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
          {painData.map((item) => (
            <StatCard key={item.target + item.label} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
}
