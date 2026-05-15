"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

function useCountUp(target: number, duration = 1500, inView = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration, inView]);
  return count;
}

const stats = [
  { raw: 50, display: (n: number) => `${n}+`, label: "aziende europee conformi con AIComply" },
  { raw: 300, display: (n: number) => `${n}+`, label: "sistemi AI classificati e documentati" },
  { raw: 48, display: () => "<48h", label: "dal primo accesso al primo assessment completo" },
];

function StatItem({ raw, display, label, inView }: typeof stats[0] & { inView: boolean }) {
  const count = useCountUp(raw, 1200, inView);
  return (
    <div className="pt-12" style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}>
      <div
        style={{
          fontSize: "44px",
          fontWeight: 300,
          letterSpacing: "-2px",
          color: "#0D1016",
          marginBottom: "6px",
        }}
      >
        {display(count)}
      </div>
      <p className="text-[13px] leading-relaxed" style={{ color: "rgba(0,0,0,0.4)" }}>
        {label}
      </p>
    </div>
  );
}

export default function Stats() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="px-12 py-24" style={{ background: "#FAFAF9" }}>
      <div className="max-w-5xl mx-auto" ref={ref}>
        <p
          className="text-[12px] font-medium uppercase mb-12"
          style={{ letterSpacing: "1.5px", color: "rgba(0,0,0,0.3)" }}
        >
          Adottato in Europa
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {stats.map((stat) => (
            <StatItem key={stat.label} {...stat} inView={inView} />
          ))}
        </div>
      </div>
    </section>
  );
}
