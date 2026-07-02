"use client";

const ITEMS = [
  { text: "EU AI Act 2024/1689", weight: 500 },
  { text: "Art. 6 — Classificazione rischio", weight: 400 },
  { text: "Art. 9 — Risk Management System", weight: 500 },
  { text: "Art. 11 — Documentazione tecnica", weight: 400 },
  { text: "Art. 27 — FRIA", weight: 400 },
  { text: "Art. 50 — Trasparenza AI", weight: 400 },
  { text: "Art. 72 — Post-Market Monitoring", weight: 500 },
  { text: "Allegato III — Alto rischio", weight: 400 },
  { text: "Allegato IV — Technical dossier", weight: 400 },
  { text: "GPAI — Art. 51-55", weight: 400 },
  { text: "ISO 42001 — AI Management", weight: 400 },
  { text: "DPIA — Reg. UE 2016/679", weight: 400 },
];

export default function MarqueeTicker() {
  const doubled = [...ITEMS, ...ITEMS];

  return (
    <div
      style={{
        overflow: "hidden",
        borderTop: "1px solid rgba(0,0,0,0.07)",
        borderBottom: "1px solid rgba(0,0,0,0.07)",
        background: "#FAFAF9",
        padding: "11px 0",
      }}
    >
      <style>{`
        @keyframes aicomply-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .aicomply-marquee-track {
          display: flex;
          width: max-content;
          animation: aicomply-marquee 36s linear infinite;
        }
        .aicomply-marquee-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="aicomply-marquee-track">
        {doubled.map((item, i) => (
          <span
            key={i}
            style={{
              fontSize: 11,
              fontWeight: item.weight,
              whiteSpace: "nowrap",
              padding: "0 20px",
              borderRight: "1px solid rgba(0,0,0,0.08)",
              color: item.weight === 500 ? "rgba(0,0,0,0.70)" : "rgba(0,0,0,0.38)",
              letterSpacing: item.weight === 500 ? "-0.1px" : "0",
            }}
          >
            {item.text}
          </span>
        ))}
      </div>
    </div>
  );
}
