"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { useT } from "@/i18n/LocaleProvider";

const SERIF = "Georgia, 'Times New Roman', serif";

type Stat = {
  raw: number;
  display: (n: number) => string;
  sectionLabel: string;
  label: string;
};

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

function StatCol({
  stat,
  inView,
  isLast,
}: {
  stat: Stat;
  inView: boolean;
  isLast: boolean;
}) {
  const count = useCountUp(stat.raw, 1200, inView);
  return (
    <div className={`stats-col${isLast ? " stats-col-last" : ""}`} style={{ flex: 1 }}>
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
  const t = useT("stats");

  const stats: Stat[] = [
    {
      raw: 30,
      display: () => "30%",
      sectionLabel: t("stat1_section"),
      label: t("stat1_label"),
    },
    {
      raw: 300,
      display: (n: number) => `${n}+`,
      sectionLabel: t("stat2_section"),
      label: t("stat2_label"),
    },
    {
      raw: 48,
      display: () => "<48h",
      sectionLabel: t("stat3_section"),
      label: t("stat3_label"),
    },
  ];

  return (
    <section
      style={{ background: "#ffffff", borderTop: "1px solid rgba(0,0,0,0.07)" }}
    >
      {/* Su smartphone le tre colonne diventano righe */}
      <style>{`
        .stats-row { display: flex; }
        .stats-col { padding: 36px 40px; border-right: 1px solid rgba(0,0,0,0.07); }
        .stats-col-last { border-right: none; }
        @media (max-width: 768px) {
          .stats-row { flex-direction: column; }
          .stats-col { padding: 28px 0; border-right: none; border-bottom: 1px solid rgba(0,0,0,0.07); }
          .stats-col-last { border-bottom: none; }
        }
      `}</style>
      <div className="max-w-5xl mx-auto px-6 md:px-8" ref={ref}>
        <div className="stats-row">
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
