"use client";
import React from "react";
import type { DPIAResult } from "@/lib/dossier/storage-schema";

const T = {
  text:     "#0D1016",
  muted:    "rgba(0,0,0,0.42)",
  faint:    "rgba(0,0,0,0.28)",
  border:   "rgba(0,0,0,0.08)",
  card:     "#ffffff",
  bg:       "#f8f8f7",
  red:      "#dc2626",
  redBg:    "rgba(220,38,38,0.06)",
  redBdr:   "rgba(220,38,38,0.18)",
  amber:    "#d97706",
  amberBg:  "rgba(202,138,4,0.06)",
  amberBdr: "rgba(202,138,4,0.2)",
  green:    "#16a34a",
  greenBg:  "rgba(22,163,74,0.06)",
  greenBdr: "rgba(22,163,74,0.2)",
} as const;

interface ProportionalityBalanceProps {
  dpia: DPIAResult;
}

export function ProportionalityBalance({ dpia }: ProportionalityBalanceProps) {
  // Punteggio "finalità" (0-100): quanto è giustificato il trattamento
  const purposeScore = [
    (dpia.proportionality.necessity_justification?.trim().length ?? 0) > 50 ? 25 : 0,
    (dpia.proportionality.proportionality_checks?.filter(p => p.status === "compliant").length ?? 0) * 10,
    dpia.proportionality.processor_clauses_art28 === "yes" ? 15 : 0,
  ].reduce((a, b) => a + b, 0);

  // Punteggio "invasività" (0-100): quanto è invasivo il trattamento
  const invasivenessScore = [
    (dpia.risks.threats?.filter(t => t.risk_level === "high").length ?? 0) * 20,
    (dpia.risks.threats?.filter(t => t.risk_level === "medium").length ?? 0) * 10,
    (dpia.proportionality.rights_checks?.filter(r => r.applicable === "yes").length ?? 0) * 5,
    dpia.proportionality.international_transfers === "yes" ? 10 : 0,
  ].reduce((a, b) => a + b, 0);

  const purposeClamped     = Math.min(100, purposeScore);
  const invasivenessClamped = Math.min(100, invasivenessScore);

  // Determine indicator
  const diff = purposeClamped - invasivenessClamped;
  const indicator: { label: string; bg: string; color: string; border: string } =
    diff > 0
      ? { label: "Proporzionato",  bg: T.greenBg,  color: T.green,  border: T.greenBdr  }
      : invasivenessClamped - purposeClamped > 30
      ? { label: "Sproporzionato", bg: T.redBg,    color: T.red,    border: T.redBdr    }
      : { label: "Da verificare",  bg: T.amberBg,  color: T.amber,  border: T.amberBdr  };

  return (
    <div style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: 12,
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      padding: 16,
      marginBottom: 16,
    }}>
      {/* Title row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: T.text }}>
          Bilancia necessità / proporzionalità
        </p>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 9999,
          background: indicator.bg, color: indicator.color, border: `1px solid ${indicator.border}`,
        }}>
          {indicator.label}
        </span>
      </div>

      {/* Purpose bar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: T.muted }}>Giustificazione finalità</span>
          <span style={{ fontSize: 11, color: T.green, fontWeight: 600 }}>{purposeClamped} / 100</span>
        </div>
        <div style={{
          height: 8, borderRadius: 99, background: "rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}>
          <div style={{
            height: "100%",
            width: `${purposeClamped}%`,
            background: T.green,
            borderRadius: 99,
            transition: "width 0.4s ease",
          }} />
        </div>
        <p style={{ fontSize: 10, color: T.faint, marginTop: 3 }}>
          Finalità documentata + principi GDPR conformi + clausole Art. 28
        </p>
      </div>

      {/* Invasiveness bar */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: T.muted }}>Invasività del trattamento</span>
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: invasivenessClamped > purposeClamped ? T.red : T.amber,
          }}>
            {invasivenessClamped} / 100
          </span>
        </div>
        <div style={{
          height: 8, borderRadius: 99, background: "rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}>
          <div style={{
            height: "100%",
            width: `${invasivenessClamped}%`,
            background: invasivenessClamped > purposeClamped ? T.red : T.amber,
            borderRadius: 99,
            transition: "width 0.4s ease",
          }} />
        </div>
        <p style={{ fontSize: 10, color: T.faint, marginTop: 3 }}>
          Minacce ad alto/medio rischio + diritti applicabili + trasferimenti internazionali
        </p>
      </div>

      {/* Note */}
      <p style={{ fontSize: 10, color: T.faint, fontStyle: "italic", lineHeight: 1.55 }}>
        Questa stima è indicativa e deriva dai campi già compilati.
        {" "}[verifica contro il testo vigente del GDPR/WP248]
      </p>
    </div>
  );
}
