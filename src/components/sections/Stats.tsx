"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

const SERIF = "Georgia, 'Times New Roman', serif";

function useCountUp(target: number, duration = 1400, inView = false) {
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
  {
    raw: 30,
    display: () => "30%",
    sectionLabel: "Riduzione tempi audit",
    label: "delle ore non fatturabili eliminate grazie all'automazione AI",
  },
  {
    raw: 300,
    display: (n: number) => `${n}+`,
    sectionLabel: "Sistemi AI mappati",
    label: "sistemi classificati e documentati in Europa",
  },
  {
    raw: 48,
    display: () => "<48h",
    sectionLabel: "Dal primo accesso all'assessment",
    label: "primo risk assessment completo e certificabile",
  },
];

function StatCol({
  stat,
  inView,
  isLast,
}: {
  stat: (typeof stats)[0];
  inView: boolean;
  isLast: boolean;
}) {
  const count = useCountUp(stat.raw, 1200, inView);
  return (
    <div
      style={{
        flex: 1,
        padding: "36px 40px",
        borderRight: isLast ? "none" : "1px solid rgba(0,0,0,0.07)",
      }}
    >
      <p
        style={{
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: "0.09em",
          textTransform: "uppercase",
          color: "rgba(0,0,0,0.28)",
          marginBottom: 16,
        }}
      >
        {stat.sectionLabel}
      </p>
      <div
        style={{
          fontFamily: SERIF,
          fontSize: "clamp(44px, 5vw, 60px)",
          fontWeight: 300,
          letterSpacing: "-3px",
          color: "#0D1016",
          lineHeight: 1,
          marginBottom: 14,
        }}
      >
        {stat.display(count)}
      </div>
      <p style={{ fontSize: 13, color: "rgba(0,0,0,0.42)", lineHeight: 1.6 }}>
        {stat.label}
      </p>
    </div>
  );
}

export default function Stats() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      style={{ background: "#ffffff", borderTop: "1px solid rgba(0,0,0,0.07)" }}
    >
      <div className="max-w-5xl mx-auto px-8" ref={ref}>
        <div style={{ display: "flex" }}>
          {stats.map((stat, i) => (
            <StatCol
              key={stat.label}
              stat={stat}
              inView={inView}
              isLast={i === stats.length - 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
