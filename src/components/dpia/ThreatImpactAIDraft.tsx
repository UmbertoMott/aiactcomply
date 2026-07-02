"use client";
import React, { useState } from "react";
import type { CSSProperties } from "react";
import { draftDpiaThreat, type DpiaThreatDraft } from "@/app/actions/draftDpiaThreat";
import type { DPIAThreat } from "@/lib/dossier/storage-schema";

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

function computeRiskLevel(
  l: "low" | "medium" | "high",
  s: "low" | "medium" | "high",
): "low" | "medium" | "high" {
  if (l === "high" && s === "high") return "high";
  if (l === "high" || s === "high") return "medium";
  if (l === "medium" || s === "medium") return "medium";
  return "low";
}

function riskBadge(level: "low" | "medium" | "high") {
  const cfg = {
    high:   { label: "Alto",  bg: T.redBg,   color: T.red,   border: T.redBdr   },
    medium: { label: "Medio", bg: T.amberBg, color: T.amber, border: T.amberBdr },
    low:    { label: "Basso", bg: T.greenBg, color: T.green, border: T.greenBdr },
  }[level];
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
    }}>
      {cfg.label}
    </span>
  );
}

interface ThreatImpactAIDraftProps {
  threat: DPIAThreat;
  systemName: string;
  systemDescription: string;
  personalDataCategories: string;
  onApply: (patch: {
    mitigation: string;
    residual_likelihood: DPIAThreat["residual_likelihood"];
    residual_severity: DPIAThreat["residual_severity"];
    residual_risk: DPIAThreat["residual_risk"];
  }) => void;
}

export function ThreatImpactAIDraft({
  threat,
  systemName,
  systemDescription,
  personalDataCategories,
  onApply,
}: ThreatImpactAIDraftProps) {
  const [loading, setLoading]       = useState(false);
  const [draft, setDraft]           = useState<DpiaThreatDraft | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [confirmed, setConfirmed]   = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setDraft(null);
    setConfirmed(false);

    const result = await draftDpiaThreat({
      systemName,
      systemDescription,
      threatCategory:        threat.category,
      threatDescription:     threat.description,
      threatSource:          threat.source,
      likelihood:            threat.likelihood,
      severity:              threat.severity,
      personalDataCategories,
    });

    setLoading(false);

    if ("error" in result) {
      setError(result.error);
      return;
    }
    setDraft(result);
  }

  function handleConfirm() {
    if (!draft) return;
    const residual_risk = computeRiskLevel(
      draft.suggested_residual_likelihood,
      draft.suggested_residual_severity,
    );
    onApply({
      mitigation:           draft.suggested_mitigation,
      residual_likelihood:  draft.suggested_residual_likelihood,
      residual_severity:    draft.suggested_residual_severity,
      residual_risk,
    });
    setConfirmed(true);
  }

  const btnSt: CSSProperties = {
    fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6,
    border: `1px solid ${T.border}`, cursor: "pointer",
    background: T.card, color: T.muted,
  };

  if (confirmed) {
    return (
      <div style={{ marginBottom: 10 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color: T.green,
          background: T.greenBg, padding: "2px 8px", borderRadius: 9999,
          border: `1px solid ${T.greenBdr}`,
        }}>
          ✓ Suggerimento applicato
        </span>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 10 }}>
      {/* Header badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color: T.amber,
          background: "rgba(202,138,4,0.10)", padding: "2px 8px",
          borderRadius: 9999, border: `1px solid ${T.amberBdr}`,
        }}>
          ✦ AI — verifica e conferma
        </span>
      </div>

      {/* Generate button (idle) */}
      {!draft && !loading && (
        <button
          onClick={handleGenerate}
          style={{ ...btnSt, background: "rgba(0,0,0,0.04)" }}
        >
          ✦ Genera suggerimento AI
        </button>
      )}

      {/* Loading */}
      {loading && (
        <span style={{ fontSize: 11, color: T.muted }}>⟳ Generazione…</span>
      )}

      {/* Error */}
      {error && (
        <p style={{ fontSize: 11, color: T.red, marginTop: 4 }}>{error}</p>
      )}

      {/* Draft available */}
      {draft && (
        <div style={{
          padding: 12,
          background: T.amberBg,
          border: `1px solid ${T.amberBdr}`,
          borderRadius: 8,
          marginTop: 4,
        }}>
          {/* Suggested mitigation */}
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: T.amber, marginBottom: 4 }}>
            Misura suggerita
          </p>
          <p style={{ fontSize: 12, color: T.text, lineHeight: 1.55, marginBottom: 8 }}>
            {draft.suggested_mitigation}
          </p>

          {/* Residual risk */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: T.muted }}>Rischio residuo stimato:</span>
            {riskBadge(computeRiskLevel(draft.suggested_residual_likelihood, draft.suggested_residual_severity))}
            <span style={{ fontSize: 10, color: T.faint }}>
              ({draft.suggested_residual_likelihood} × {draft.suggested_residual_severity})
            </span>
          </div>

          {/* Rationale */}
          <p style={{ fontSize: 11, color: T.muted, fontStyle: "italic", lineHeight: 1.5, marginBottom: 10 }}>
            {draft.rationale}
          </p>

          {/* Actions */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              onClick={handleConfirm}
              style={{ ...btnSt, background: T.text, color: "#fff", borderColor: T.text }}
            >
              ✓ Conferma e applica
            </button>
            <button
              onClick={() => setDraft(null)}
              style={btnSt}
            >
              ✕ Ignora
            </button>
            <button
              onClick={handleGenerate}
              style={btnSt}
            >
              ↺ Rigenera
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
