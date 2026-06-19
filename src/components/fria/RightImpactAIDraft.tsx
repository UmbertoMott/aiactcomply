"use client";
import React, { useState } from "react";
import type { CSSProperties } from "react";
import { draftRightImpact, type RightImpactDraft } from "@/app/actions/draftRightImpact";
import type { FRIASeverityAssessment } from "@/lib/simulation/fria-engine";

const T = {
  text: "#0D1016", muted: "rgba(0,0,0,0.42)", faint: "rgba(0,0,0,0.28)",
  border: "rgba(0,0,0,0.08)", card: "#ffffff", bg: "#f8f8f7",
  amber: "#d97706", amberBg: "rgba(202,138,4,0.06)", amberBdr: "rgba(202,138,4,0.2)",
  green: "#16a34a", greenBg: "rgba(22,163,74,0.06)", greenBdr: "rgba(22,163,74,0.2)",
  red: "#dc2626",
} as const;

interface RightImpactAIDraftProps {
  systemName: string;
  systemDescription: string;
  riskLevel: string;
  scenarioTitle: string;
  scenarioDescription: string;
  rightId: string;
  rightName: string;
  rightDescription: string;
  triggerQuestions: string[];
  onApply: (sevPatch: Partial<FRIASeverityAssessment>, likelihood: string, note: string) => void;
}

export function RightImpactAIDraft({ ...props }: RightImpactAIDraftProps) {
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<RightImpactDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  async function handleGenerate() {
    setLoading(true); setError(null); setDraft(null); setConfirmed(false);
    const result = await draftRightImpact({ ...props });
    setLoading(false);
    if ("error" in result) { setError(result.error); return; }
    setDraft(result);
  }

  function handleConfirm() {
    if (!draft) return;
    props.onApply(
      {
        extent_of_interference: draft.suggested_extent,
        scope_of_impact: draft.suggested_scope,
        gravity: draft.suggested_gravity,
        irreversibility: draft.suggested_irreversibility,
      },
      draft.suggested_likelihood,
      draft.scenario_brief,
    );
    setConfirmed(true);
  }

  const btnSt: CSSProperties = {
    fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6,
    border: `1px solid ${T.border}`, cursor: "pointer",
    background: T.card, color: T.muted,
  };

  return (
    <div style={{ marginBottom: 12 }}>
      {!draft && !loading && (
        <button onClick={handleGenerate} style={{ ...btnSt, background: "rgba(0,0,0,0.04)" }}>
          ✦ Genera bozza AI per questo diritto
        </button>
      )}
      {loading && <span style={{ fontSize: 11, color: T.muted }}>⟳ Generazione in corso…</span>}
      {error && <p style={{ fontSize: 11, color: T.red }}>{error}</p>}
      {draft && !confirmed && (
        <div style={{ padding: 12, background: T.amberBg, border: `1px solid ${T.amberBdr}`, borderRadius: 8, marginTop: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: T.amber, background: "rgba(202,138,4,0.12)", padding: "2px 7px", borderRadius: 9999 }}>
              ✦ AI — verifica e conferma
            </span>
          </div>
          <p style={{ fontSize: 12, color: T.text, marginBottom: 6, lineHeight: 1.5 }}>{draft.scenario_brief}</p>
          <p style={{ fontSize: 11, color: T.muted, marginBottom: 8, fontStyle: "italic" }}>{draft.severity_rationale}</p>
          {draft.mitigation_hints.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: T.text, marginBottom: 4 }}>Suggerimenti mitigazione:</p>
              {draft.mitigation_hints.map((h, i) => (
                <p key={i} style={{ fontSize: 11, color: T.muted, marginBottom: 2 }}>• {h}</p>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={handleConfirm} style={{ ...btnSt, background: T.text, color: "#fff", borderColor: T.text }}>
              ✓ Conferma e applica
            </button>
            <button onClick={() => setDraft(null)} style={btnSt}>
              ✕ Ignora
            </button>
            <button onClick={handleGenerate} style={btnSt}>
              ↺ Rigenera
            </button>
          </div>
        </div>
      )}
      {confirmed && (
        <span style={{ fontSize: 11, color: T.green }}>✓ Applicato — rivedi e salva</span>
      )}
    </div>
  );
}
