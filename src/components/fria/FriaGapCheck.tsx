"use client";
import React, { useState } from "react";
import type { CSSProperties } from "react";
import { checkFriaGaps, type FriaGapCheck, type FriaGapItem } from "@/app/actions/checkFriaGaps";
import type { FRIADocument } from "@/lib/simulation/fria-engine";

const T = {
  text: "#0D1016", muted: "rgba(0,0,0,0.42)", faint: "rgba(0,0,0,0.28)",
  border: "rgba(0,0,0,0.08)", card: "#ffffff", bg: "#f8f8f7",
  red: "#dc2626", redBg: "rgba(220,38,38,0.06)", redBdr: "rgba(220,38,38,0.2)",
  amber: "#d97706", amberBg: "rgba(202,138,4,0.06)", amberBdr: "rgba(202,138,4,0.2)",
  green: "#16a34a", greenBg: "rgba(22,163,74,0.06)", greenBdr: "rgba(22,163,74,0.2)",
} as const;

interface FriaGapCheckProps {
  doc: FRIADocument;
  onNavigateToPhase: (phase: string) => void;
}

export function FriaGapCheck({ doc, onNavigateToPhase }: FriaGapCheckProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FriaGapCheck | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCheck() {
    setLoading(true); setError(null); setResult(null);
    const r = await checkFriaGaps(doc);
    setLoading(false);
    if ("error" in r) { setError(r.error); return; }
    setResult(r);
  }

  const statusIcon = (s: FriaGapItem["status"]) =>
    s === "ok" ? "✓" : s === "incomplete" ? "△" : "✕";
  const statusColor = (s: FriaGapItem["status"]) =>
    s === "ok" ? T.green : s === "incomplete" ? T.amber : T.red;
  const statusBg = (s: FriaGapItem["status"]) =>
    s === "ok" ? T.greenBg : s === "incomplete" ? T.amberBg : T.redBg;
  const statusBdr = (s: FriaGapItem["status"]) =>
    s === "ok" ? T.greenBdr : s === "incomplete" ? T.amberBdr : T.redBdr;

  const overallColor = result?.overall_coverage === "complete" ? T.green :
    result?.overall_coverage === "partial" ? T.amber : T.red;
  const overallLabel = result?.overall_coverage === "complete" ? "Copertura completa" :
    result?.overall_coverage === "partial" ? "Copertura parziale" : "Copertura insufficiente";

  const cardSt: CSSProperties = {
    background: T.card, border: `1px solid ${T.border}`,
    borderRadius: 12, overflow: "hidden",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: 16,
  };

  return (
    <div>
      <div style={{ ...cardSt }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: T.text, margin: 0 }}>
              Verifica copertura Art. 27 AI Act
            </p>
            <p style={{ fontSize: 11, color: T.muted, marginTop: 2, marginBottom: 0 }}>
              Controlla la presenza di tutti gli elementi obbligatori 27(1)(a–f) + 27(2) + 27(4)
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: T.amber, background: "rgba(202,138,4,0.10)", padding: "2px 7px", borderRadius: 9999 }}>
              ✦ AI — verifica e conferma
            </span>
            <button
              onClick={handleCheck}
              disabled={loading}
              style={{ fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 8, border: "none", background: loading ? "rgba(0,0,0,0.04)" : T.text, color: loading ? T.muted : "#fff", cursor: loading ? "default" : "pointer" }}
            >
              {loading ? "⟳ Analisi…" : result ? "↺ Ri-analizza" : "Avvia gap-check"}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ padding: 16, color: T.red, fontSize: 12 }}>{error}</div>
        )}

        {result && (
          <div style={{ padding: "0 20px 20px" }}>
            {/* Overall badge */}
            <div style={{ padding: "12px 0", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: overallColor, background: `${overallColor}15`, padding: "3px 10px", borderRadius: 9999 }}>
                {overallLabel}
              </span>
              {result.critical_gaps.length > 0 && (
                <span style={{ fontSize: 11, color: T.red }}>
                  {result.critical_gaps.length} gap critico/i
                </span>
              )}
            </div>

            {/* Items */}
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {result.items.map((item) => (
                <div key={item.articleRef} style={{
                  padding: "10px 12px", borderRadius: 8, border: `1px solid ${statusBdr(item.status)}`,
                  background: statusBg(item.status),
                  display: "flex", alignItems: "flex-start", gap: 10,
                }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: statusColor(item.status), minWidth: 16, flexShrink: 0 }}>
                    {statusIcon(item.status)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: T.text, background: "rgba(0,0,0,0.06)", padding: "1px 6px", borderRadius: 4 }}>
                        {item.articleRef}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{item.label}</span>
                    </div>
                    <p style={{ fontSize: 11, color: T.muted, margin: "2px 0", lineHeight: 1.4 }}>{item.finding}</p>
                    {item.status !== "ok" && item.cta_phase !== "none" && (
                      <button
                        onClick={() => onNavigateToPhase(item.cta_phase)}
                        style={{ marginTop: 4, fontSize: 10, fontWeight: 600, color: T.text, background: "rgba(0,0,0,0.06)", border: "none", borderRadius: 4, padding: "2px 8px", cursor: "pointer" }}
                      >
                        → {item.cta_label}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Recommendation */}
            <div style={{ marginTop: 14, padding: "10px 12px", background: T.bg, borderRadius: 8, border: `1px solid ${T.border}` }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: T.text, textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: 4 }}>
                Raccomandazione
              </p>
              <p style={{ fontSize: 12, color: T.muted, margin: 0, lineHeight: 1.5 }}>{result.recommendation}</p>
            </div>
          </div>
        )}

        {!result && !loading && !error && (
          <div style={{ padding: "32px 20px", textAlign: "center" }}>
            <p style={{ fontSize: 12, color: T.faint }}>
              Clicca &quot;Avvia gap-check&quot; per analizzare la copertura degli elementi Art. 27 obbligatori.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
