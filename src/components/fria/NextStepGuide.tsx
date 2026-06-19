"use client";

import type { CSSProperties } from "react";
import type { FRIADocument } from "@/lib/simulation/fria-engine";

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  text: "#0D1016", muted: "rgba(0,0,0,0.42)", faint: "rgba(0,0,0,0.28)",
  border: "rgba(0,0,0,0.08)", card: "#ffffff", bg: "#f8f8f7",
} as const;

// ─── Props ────────────────────────────────────────────────────────────────────
export interface NextStepGuideProps {
  fria: FRIADocument;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function NextStepGuide({ fria: _fria }: NextStepGuideProps) {
  const cardSt: CSSProperties = {
    background: T.card,
    border: `1px solid ${T.border}`,
    borderRadius: 10,
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    padding: "16px 20px",
    marginTop: 16,
  };

  return (
    <div style={cardSt}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
          Prossimo passo consigliato
        </span>
        <span style={{
          fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 9999,
          background: T.bg, border: `1px solid ${T.border}`, color: T.muted,
        }}>
          In arrivo — Fase 4
        </span>
      </div>
      <p style={{ fontSize: 12, color: T.muted, margin: 0, lineHeight: 1.5 }}>
        Il motore a stati analizzerà il tuo progresso FRIA e suggerirà il prossimo step.
      </p>
    </div>
  );
}
