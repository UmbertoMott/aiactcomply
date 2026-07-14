"use client";

import { useState, useMemo } from "react";

const SERIF = "Georgia, 'Times New Roman', serif";
const MONO  = "'DM Mono', monospace";

// Sanzioni Art. 99 EU AI Act — "il maggiore tra" importo fisso e % del fatturato mondiale.
const TIERS = [
  { key: "vietate",    label: "Pratiche vietate (Art. 5)",           pct: 0.07,  cap: 35_000_000, note: "Sistemi vietati: manipolazione, social scoring, biometria proibita." },
  { key: "altorischio",label: "Obblighi alto rischio / GPAI",        pct: 0.03,  cap: 15_000_000, note: "Violazione degli obblighi per sistemi ad alto rischio o GPAI." },
  { key: "info",       label: "Informazioni errate alle autorità",   pct: 0.015, cap: 7_500_000,  note: "Dati falsi, incompleti o fuorvianti forniti alle autorità." },
] as const;

const fmtEUR = (n: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  fontSize: 15,
  color: "#0D1016",
  background: "#ffffff",
  border: "1px solid rgba(0,0,0,0.14)",
  borderRadius: 9,
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: MONO,
  fontSize: 11,
  fontWeight: 500,
  color: "rgba(0,0,0,0.55)",
  letterSpacing: "0.02em",
  marginBottom: 7,
};

export default function RoiCalculator() {
  const [fatturato, setFatturato] = useState(10_000_000);
  const [tierKey, setTierKey]     = useState<(typeof TIERS)[number]["key"]>("altorischio");
  const [costo, setCosto]         = useState(12_000);

  const tier = TIERS.find((t) => t.key === tierKey)!;

  const esposizione = useMemo(
    () => Math.max(tier.cap, tier.pct * (fatturato || 0)),
    [tier, fatturato]
  );

  const roi = costo > 0 ? esposizione / costo : 0;

  return (
    <div style={{
      background: "#ffffff",
      border: "1px solid rgba(0,0,0,0.08)",
      borderRadius: 18,
      padding: "clamp(24px, 4vw, 40px)",
      boxShadow: "0 20px 60px rgba(0,0,0,0.06)",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "clamp(24px, 4vw, 48px)",
    }} className="roi-grid">

      {/* ── Input ── */}
      <div>
        <p style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 22 }}>
          I tuoi dati
        </p>

        <div style={{ marginBottom: 22 }}>
          <label style={labelStyle}>Fatturato annuo mondiale</label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(0,0,0,0.4)", fontSize: 15 }}>€</span>
            <input
              type="number"
              min={0}
              value={fatturato}
              onChange={(e) => setFatturato(Math.max(0, Number(e.target.value)))}
              style={{ ...inputStyle, paddingLeft: 30 }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 22 }}>
          <label style={labelStyle}>Tipo di violazione potenziale</label>
          <select
            value={tierKey}
            onChange={(e) => setTierKey(e.target.value as typeof tierKey)}
            style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}
          >
            {TIERS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <p style={{ fontSize: 12, color: "rgba(0,0,0,0.42)", lineHeight: 1.5, marginTop: 8 }}>{tier.note}</p>
        </div>

        <div>
          <label style={labelStyle}>Costo annuo della prevenzione (conformità)</label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(0,0,0,0.4)", fontSize: 15 }}>€</span>
            <input
              type="number"
              min={0}
              value={costo}
              onChange={(e) => setCosto(Math.max(0, Number(e.target.value)))}
              style={{ ...inputStyle, paddingLeft: 30 }}
            />
          </div>
        </div>
      </div>

      {/* ── Output ── */}
      <div style={{
        background: "#0D1016",
        borderRadius: 14,
        padding: "clamp(24px, 3vw, 34px)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}>
        <p style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
          Esposizione sanzionatoria massima
        </p>
        <p style={{ fontFamily: SERIF, fontSize: "clamp(34px, 5vw, 52px)", fontWeight: 400, letterSpacing: "-1.5px", color: "#ffffff", lineHeight: 1, marginBottom: 8 }}>
          {fmtEUR(esposizione)}
        </p>
        <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.45)", lineHeight: 1.55, marginBottom: 24 }}>
          Il maggiore tra {fmtEUR(tier.cap)} e il {(tier.pct * 100).toLocaleString("it-IT")}% del fatturato (Art. 99 AI Act).
        </p>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 22 }}>
          <p style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
            ROI della prevenzione
          </p>
          <p style={{ fontFamily: SERIF, fontSize: "clamp(30px, 4vw, 44px)", fontWeight: 400, letterSpacing: "-1px", color: "#ffffff", lineHeight: 1, marginBottom: 8 }}>
            {roi > 0 ? `${Math.round(roi).toLocaleString("it-IT")}×` : "—"}
          </p>
          <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.45)", lineHeight: 1.55 }}>
            Ogni euro investito in prevenzione ti protegge da{" "}
            <strong style={{ color: "rgba(255,255,255,0.85)" }}>{roi > 0 ? `${Math.round(roi).toLocaleString("it-IT")} €` : "—"}</strong>{" "}
            di sanzione potenziale.
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 760px) {
          .roi-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
