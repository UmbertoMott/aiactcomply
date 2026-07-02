"use client";

import type { RiskItem, Severity, Probability } from "@/lib/simulation/risk-manager-engine";
import { RISK_CATEGORY_LABELS } from "@/lib/simulation/risk-manager-engine";

// ─── Design tokens — riusa la palette light del Risk Manager (nessuna nuova palette) ──

const T = {
  text:   "#0D1016",
  muted:  "rgba(0,0,0,0.42)",
  faint:  "rgba(0,0,0,0.28)",
  border: "rgba(0,0,0,0.07)",
  card:   "#ffffff",
};

/**
 * Matrice Probabilità × Severità — ISO 42001 Clause 8.2.
 * Adattata a 3×3 (non 5×5) perché il modello dati di questo modulo usa
 * solo i livelli ordinali low/medium/high per severity e probability —
 * usare una scala 1–5 fittizia introdurrebbe precisione che i dati non hanno.
 */

const LEVELS: { key: Severity; ord: number; label: string }[] = [
  { key: "low", ord: 1, label: "Bassa" },
  { key: "medium", ord: 2, label: "Media" },
  { key: "high", ord: 3, label: "Alta" },
];

function cellScore(probOrd: number, sevOrd: number): number {
  return probOrd * sevOrd; // 1–9
}

function cellPalette(score: number): { bg: string; border: string; text: string } {
  if (score <= 2) return { bg: "rgba(22,163,74,0.08)", border: "rgba(22,163,74,0.25)", text: "#15803d" };
  if (score <= 4) return { bg: "rgba(217,119,6,0.08)", border: "rgba(217,119,6,0.25)", text: "#92400e" };
  if (score <= 6) return { bg: "rgba(234,88,12,0.1)", border: "rgba(234,88,12,0.3)", text: "#9a3412" };
  return { bg: "rgba(220,38,38,0.1)", border: "rgba(220,38,38,0.3)", text: "#b91c1c" };
}

export interface MatrixFilter {
  p: string;
  s: string;
}

interface RiskMatrixProps {
  risks: RiskItem[];
  onCellClick?: (p: Probability, s: Severity) => void;
  activeFilter?: MatrixFilter | null;
}

export function RiskMatrix({ risks, onCellClick, activeFilter }: RiskMatrixProps) {
  const bucket: Record<string, RiskItem[]> = {};
  risks.forEach((r) => {
    const key = `${r.probability}-${r.severity}`;
    if (!bucket[key]) bucket[key] = [];
    bucket[key].push(r);
  });

  const filteredRisks = activeFilter
    ? bucket[`${activeFilter.p}-${activeFilter.s}`] ?? []
    : [];

  return (
    <div>
      <p style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 12 }}>
        Matrice Probabilità × Severità — ISO 42001 Clause 8.2
      </p>

      <div style={{ display: "flex", gap: 8 }}>
        {/* Asse Y */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: 16 }}>
          <span
            style={{ fontSize: 10, color: T.faint, textTransform: "uppercase", letterSpacing: "0.06em", writingMode: "vertical-rl" }}
          >
            Probabilità ↑
          </span>
        </div>

        <div style={{ flex: 1 }}>
          {/* Header colonne (Severità) */}
          <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr 1fr", gap: 6, marginBottom: 6 }}>
            <div />
            {LEVELS.map((s) => (
              <div key={s.key} style={{ textAlign: "center", fontSize: 10, color: T.muted, fontWeight: 600 }}>
                {s.label}
              </div>
            ))}
          </div>

          {/* Righe — probabilità alta in cima */}
          {[...LEVELS].reverse().map((p) => (
            <div key={p.key} style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr 1fr", gap: 6, marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: T.muted, fontWeight: 600 }}>
                {p.label}
              </div>
              {LEVELS.map((s) => {
                const score = cellScore(p.ord, s.ord);
                const palette = cellPalette(score);
                const key = `${p.key}-${s.key}`;
                const cellRisks = bucket[key] ?? [];
                const isActive = activeFilter?.p === p.key && activeFilter?.s === s.key;
                return (
                  <button
                    key={s.key}
                    onClick={() => onCellClick?.(p.key as Probability, s.key as Severity)}
                    style={{
                      position: "relative",
                      height: 56,
                      borderRadius: 8,
                      cursor: "pointer",
                      background: palette.bg,
                      border: isActive ? `2px solid ${palette.text}` : `1px solid ${palette.border}`,
                      transition: "all 0.12s",
                    }}
                  >
                    {cellRisks.length > 0 && (
                      <span style={{ fontSize: 15, fontWeight: 700, color: palette.text }}>
                        {cellRisks.length}
                      </span>
                    )}
                    <span style={{ position: "absolute", bottom: 3, right: 6, fontSize: 9, fontFamily: "monospace", color: T.faint }}>
                      {score}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}

          <p style={{ textAlign: "center", fontSize: 10, color: T.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 8 }}>
            Severità →
          </p>
        </div>
      </div>

      {/* Legenda */}
      <div style={{ display: "flex", gap: 14, marginTop: 12, flexWrap: "wrap" }}>
        {[
          { label: "Basso (1–2)", score: 1 },
          { label: "Medio (3–4)", score: 3 },
          { label: "Alto (5–6)", score: 5 },
          { label: "Critico (7–9)", score: 7 },
        ].map(({ label, score }) => {
          const palette = cellPalette(score);
          return (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: palette.bg, border: `1px solid ${palette.border}` }} />
              <span style={{ fontSize: 11, color: T.muted }}>{label}</span>
            </div>
          );
        })}
      </div>

      {/* Lista filtrata per cella selezionata */}
      {activeFilter && (
        <div style={{ marginTop: 16, borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
          <p style={{ fontSize: 11, color: T.muted, marginBottom: 8 }}>
            {filteredRisks.length} rischi in questa cella
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filteredRisks.map((r) => (
              <div
                key={r.id}
                style={{ borderRadius: 8, border: `1px solid ${T.border}`, padding: "8px 12px", background: T.card }}
              >
                <p style={{ fontSize: 12, fontWeight: 600, color: T.text, margin: 0 }}>{r.description}</p>
                <p style={{ fontSize: 10, color: T.faint, margin: "2px 0 0" }}>
                  {RISK_CATEGORY_LABELS[r.category]}
                  {r.sourceModule && r.sourceModule !== "manual" && (
                    <span
                      style={{
                        marginLeft: 6,
                        fontFamily: "monospace",
                        background: "rgba(0,0,0,0.04)",
                        color: T.muted,
                        borderRadius: 4,
                        padding: "1px 5px",
                      }}
                    >
                      {r.sourceModule.toUpperCase()}
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
