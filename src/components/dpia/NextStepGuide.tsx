"use client";
import type { DPIAResult } from "@/lib/dossier/storage-schema";

// ─── Design tokens (aligned with FRIA) ───────────────────────────────────────

const T = {
  text:     "#0D1016",
  muted:    "rgba(0,0,0,0.42)",
  faint:    "rgba(0,0,0,0.28)",
  border:   "rgba(0,0,0,0.08)",
  card:     "#ffffff",
  bg:       "#f8f8f7",
} as const;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface NextStepGuideProps {
  dpia: DPIAResult;
  gapCheck?: unknown; // riempito in Fase 4
  onNavigateToStep?: (step: number) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NextStepGuide({ dpia: _dpia }: NextStepGuideProps) {
  return (
    <div style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: 10,
      padding: "16px 20px",
      marginTop: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Prossimo passo consigliato</span>
        <span style={{
          fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 9999,
          background: T.bg, border: `1px solid ${T.border}`, color: T.muted,
        }}>
          In arrivo — Fase 4
        </span>
      </div>
      <p style={{ fontSize: 12, color: T.muted, margin: 0, lineHeight: 1.5 }}>
        Il motore a stati analizzerà il tuo progresso DPIA e suggerirà il prossimo step.
      </p>
    </div>
  );
}
