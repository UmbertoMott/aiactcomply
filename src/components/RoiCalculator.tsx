"use client";

import { useState } from "react";
import Link from "next/link";
import { TIERS, computeRoi, fmtFull, fmtCompact, type TierKey } from "@/lib/roi";
import RoiLeadModal from "@/components/RoiLeadModal";

const SERIF = "Georgia, 'Times New Roman', serif";
const MONO  = "'DM Mono', monospace";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "12px 14px", fontSize: 15, color: "#0D1016",
  background: "#ffffff", border: "1px solid rgba(0,0,0,0.14)", borderRadius: 9, outline: "none",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontFamily: MONO, fontSize: 11, fontWeight: 500,
  color: "rgba(0,0,0,0.55)", letterSpacing: "0.02em", marginBottom: 7,
};

function Cell({ value, blurred, strong }: { value: string; blurred: boolean; strong?: boolean }) {
  return (
    <div style={{
      textAlign: "right",
      fontSize: 14,
      fontWeight: strong ? 700 : 500,
      color: strong ? "#0D1016" : "rgba(0,0,0,0.7)",
      filter: blurred ? "blur(7px)" : "none",
      userSelect: blurred ? "none" : "auto",
      transition: "filter 0.3s ease",
    }}>
      {value}
    </div>
  );
}

export default function RoiCalculator() {
  const [fatturato, setFatturato] = useState(10_000_000);
  const [tierKey, setTierKey]     = useState<TierKey>("altorischio");
  const [costo, setCosto]         = useState(12_000);
  const [prob, setProb]           = useState(15); // %
  const [revealed, setRevealed]   = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const tier = TIERS.find((t) => t.key === tierKey)!;
  const model = computeRoi(fatturato, tierKey, prob, costo);

  const cols = (arr: number[], total: number) => [...arr, total];

  return (
    <div style={{
      background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 18,
      overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.06)",
      display: "grid", gridTemplateColumns: "300px 1fr",
    }} className="roi-grid">

      {/* ── Pannello INPUT ── */}
      <div style={{ padding: "clamp(24px, 3vw, 34px)", borderRight: "1px solid rgba(0,0,0,0.07)", background: "#fafaf9" }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: "#0D1016", marginBottom: 24, letterSpacing: "-0.2px" }}>
          La tua organizzazione
        </p>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Fatturato annuo mondiale</label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(0,0,0,0.4)", fontSize: 15 }}>€</span>
            <input type="number" min={0} value={fatturato}
              onChange={(e) => setFatturato(Math.max(0, Number(e.target.value)))}
              style={{ ...inputStyle, paddingLeft: 30 }} />
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Tipo di violazione potenziale</label>
          <select value={tierKey} onChange={(e) => setTierKey(e.target.value as typeof tierKey)}
            style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}>
            {TIERS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <p style={{ fontSize: 11.5, color: "rgba(0,0,0,0.42)", lineHeight: 1.5, marginTop: 7 }}>{tier.note}</p>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Costo annuo della conformità</label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(0,0,0,0.4)", fontSize: 15 }}>€</span>
            <input type="number" min={0} value={costo}
              onChange={(e) => setCosto(Math.max(0, Number(e.target.value)))}
              style={{ ...inputStyle, paddingLeft: 30 }} />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Probabilità stimata di sanzione — {prob}%</label>
          <input type="range" min={1} max={60} value={prob}
            onChange={(e) => setProb(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#0D1016" }} />
          <p style={{ fontSize: 11, color: "rgba(0,0,0,0.38)", lineHeight: 1.5, marginTop: 6 }}>
            Ipotesi modificabile. Cresce con l&rsquo;intensificarsi dei controlli post-2026.
          </p>
        </div>
      </div>

      {/* ── Pannello RISULTATI ── */}
      <div style={{ padding: "clamp(24px, 3vw, 36px)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
          <div>
            <p style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.35)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
              Esposizione sanzionatoria massima
            </p>
            <p style={{ fontFamily: SERIF, fontSize: "clamp(32px, 4.5vw, 48px)", fontWeight: 400, letterSpacing: "-1.5px", color: "#0D1016", lineHeight: 1 }}>
              {fmtFull(model.E)}
            </p>
            <p style={{ fontSize: 12, color: "rgba(0,0,0,0.42)", marginTop: 6 }}>
              Il maggiore tra {fmtCompact(tier.cap)} e il {(tier.pct * 100).toLocaleString("it-IT")}% del fatturato · Art. 99 AI Act
            </p>
          </div>
          {!revealed && (
            <button onClick={() => setModalOpen(true)}
              style={{
                flexShrink: 0, fontFamily: MONO, fontSize: 12, fontWeight: 600,
                color: "#ffffff", background: "#0D1016", border: "none",
                borderRadius: 9, padding: "11px 18px", cursor: "pointer",
              }}>
              Rivela i risultati completi
            </button>
          )}
        </div>

        {/* Tabella 3 anni */}
        <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: 18 }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr repeat(4, 1fr)", gap: 12, paddingBottom: 12, borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
            <div />
            {["Anno 1", "Anno 2", "Anno 3", "Totale"].map((h) => (
              <div key={h} style={{ textAlign: "right", fontFamily: MONO, fontSize: 10, color: "rgba(0,0,0,0.4)", letterSpacing: "0.04em" }}>{h}</div>
            ))}
          </div>

          {[
            { label: "Rischio atteso evitato", vals: cols(model.rischio, model.totRischio), strong: false },
            { label: "Costo della conformità", vals: cols(model.costoY.map((c) => -c), -model.totCosto), strong: false },
            { label: "Valore netto protetto", vals: cols(model.netto, model.totNetto), strong: true },
          ].map((row) => (
            <div key={row.label} style={{ display: "grid", gridTemplateColumns: "1.6fr repeat(4, 1fr)", gap: 12, padding: "14px 0", borderBottom: "1px solid rgba(0,0,0,0.05)", alignItems: "center" }}>
              <div style={{ fontSize: 13.5, fontWeight: row.strong ? 700 : 500, color: row.strong ? "#0D1016" : "rgba(0,0,0,0.6)" }}>{row.label}</div>
              {row.vals.map((v, i) => (
                <Cell key={i} value={fmtCompact(v)} strong={row.strong} blurred={!revealed && i >= 1} />
              ))}
            </div>
          ))}
        </div>

        {/* Metricone ROI */}
        <div style={{ marginTop: 22, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16, background: "#0D1016", borderRadius: 12, padding: "20px 24px" }}>
          <div>
            <p style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
              Ritorno sulla prevenzione · 3 anni
            </p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.5, maxWidth: 340 }}>
              Ogni euro in conformità protegge da{" "}
              <strong style={{ color: "#fff", filter: revealed ? "none" : "blur(5px)" }}>
                {model.roi > 0 ? `${Math.round(model.roi).toLocaleString("it-IT")} €` : "—"}
              </strong>{" "}
              di sanzione attesa.
            </p>
          </div>
          <p style={{ fontFamily: SERIF, fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 400, letterSpacing: "-1.5px", color: "#ffffff", lineHeight: 1, filter: revealed ? "none" : "blur(9px)", transition: "filter 0.3s ease" }}>
            {model.roi > 0 ? `${Math.round(model.roi).toLocaleString("it-IT")}×` : "—"}
          </p>
        </div>

        {/* Push post-reveal */}
        {revealed && (
          <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14, border: "1px solid rgba(0,0,0,0.1)", borderRadius: 12, padding: "16px 20px", background: "#fafaf9" }}>
            <p style={{ fontSize: 13.5, color: "rgba(0,0,0,0.6)", lineHeight: 1.5, maxWidth: 420 }}>
              Vuoi che <strong style={{ color: "#0D1016" }}>l&rsquo;avvocato validi questi numeri</strong> sul tuo caso reale e ti mostri come azzerare l&rsquo;esposizione?
            </p>
            <Link href="/prenota-demo"
              className="inline-flex text-[13px] font-medium rounded-full px-6 py-3 transition-opacity hover:opacity-85"
              style={{ background: "#0D1016", color: "#fff", letterSpacing: "-0.2px", textDecoration: "none", flexShrink: 0 }}>
              Prenota una demo
            </Link>
          </div>
        )}
      </div>

      {modalOpen && (
        <RoiLeadModal
          calc={{ fatturato, tierKey, prob, costo }}
          onSuccess={() => { setRevealed(true); setModalOpen(false); }}
          onClose={() => setModalOpen(false)}
        />
      )}

      <style>{`
        @media (max-width: 820px) {
          .roi-grid { grid-template-columns: 1fr !important; }
          .roi-grid > div:first-child { border-right: none !important; border-bottom: 1px solid rgba(0,0,0,0.07) !important; }
        }
      `}</style>
    </div>
  );
}
