"use client";

import { buildHighlightModel } from "@/lib/legal/highlight";

// Amber accent (--warning) — coerente con ScannerTrustSection. Nessun blu.
const MARK_BG = "rgba(217,119,6,0.16)";
const UNDERLINE = "rgba(217,119,6,0.45)";

interface HighlightedSourceTextProps {
  text: string;
  /** La domanda dell'utente che ha prodotto questa risposta (per il Tier 2). */
  query?: string;
}

export default function HighlightedSourceText({ text, query }: HighlightedSourceTextProps) {
  if (!text) return null;

  const model = buildHighlightModel(text, query ?? "");

  return (
    <p className="text-[11px] text-foreground leading-[1.7]">
      {model.map((sentence, si) => (
        <span
          key={si}
          style={
            sentence.relevant
              ? { borderBottom: `1.5px solid ${UNDERLINE}`, paddingBottom: 1 }
              : undefined
          }
        >
          {sentence.segments.map((seg, gi) =>
            seg.salient ? (
              <mark
                key={gi}
                style={{
                  background: MARK_BG,
                  color: "#0D1016",
                  borderRadius: 2,
                  padding: "0 1px",
                  fontWeight: 500,
                }}
              >
                {seg.text}
              </mark>
            ) : (
              <span key={gi}>{seg.text}</span>
            )
          )}
        </span>
      ))}
    </p>
  );
}
