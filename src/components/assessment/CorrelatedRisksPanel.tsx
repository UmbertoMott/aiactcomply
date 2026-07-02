// src/components/assessment/CorrelatedRisksPanel.tsx
"use client";

import { useState, useEffect } from "react";
import { getAssessment, applyMitigationToRegister } from "@/lib/assessment/assessment-helpers";
import type { CorrelatedRisk } from "@/lib/assessment/assessment-schema";

const SEV_STYLE: Record<CorrelatedRisk["severity"], { bg: string; color: string; border: string }> = {
  low:      { bg: "rgba(0,0,0,0.03)", color: "rgba(0,0,0,0.45)", border: "rgba(0,0,0,0.08)" },
  medium:   { bg: "rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.60)", border: "rgba(0,0,0,0.14)" },
  high:     { bg: "rgba(0,0,0,0.12)", color: "rgba(0,0,0,0.80)", border: "rgba(0,0,0,0.22)" },
  critical: { bg: "#0D1016",          color: "#ffffff",           border: "#0D1016"           },
};

export function CorrelatedRisksPanel() {
  const [risks, setRisks] = useState<CorrelatedRisk[]>([]);
  const [mitigationTexts, setMitigationTexts] = useState<Record<string, string>>({});
  const [applying, setApplying] = useState<string | null>(null);

  useEffect(() => {
    setRisks(getAssessment().correlatedRisks);
  }, []);

  function handleApply(riskId: string) {
    const text = mitigationTexts[riskId] ?? "";
    if (!text.trim()) return;
    setApplying(riskId);
    applyMitigationToRegister(riskId, text);
    setRisks(getAssessment().correlatedRisks);
    setApplying(null);
  }

  if (risks.length === 0) {
    return (
      <div style={{ padding: "12px 16px", borderRadius: 10,
        border: "1px solid rgba(0,0,0,0.07)", background: "rgba(0,0,0,0.02)" }}>
        <p style={{ fontSize: 12, color: "rgba(0,0,0,0.40)", margin: 0 }}>
          Nessun rischio correlato generato. Completa la sezione Rischi nella DPIA o gli Scenari nella FRIA, poi salva per generarli.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {risks.map(r => {
        const sev = SEV_STYLE[r.severity];
        const applied = r.mitigation?.appliedToRegister ?? false;
        return (
          <div key={r.id} style={{
            borderRadius: 10, border: "1px solid rgba(0,0,0,0.08)",
            background: "#ffffff", padding: 14,
          }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                background: sev.bg, color: sev.color, border: `1px solid ${sev.border}`,
                flexShrink: 0, whiteSpace: "nowrap",
              }}>
                {r.severity.toUpperCase()}
              </span>
              <p style={{ fontSize: 12, color: "#0D1016", fontWeight: 500, margin: 0, flex: 1 }}>
                {r.description}
              </p>
              <span style={{
                fontSize: 9, padding: "2px 6px", borderRadius: 4,
                background: "rgba(0,0,0,0.04)", color: "rgba(0,0,0,0.40)",
                border: "1px solid rgba(0,0,0,0.07)", flexShrink: 0,
              }}>
                {r.sourceView}
              </span>
            </div>

            {/* References */}
            {r.refs.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                {r.refs.map((ref, i) => (
                  <span key={i} style={{
                    fontSize: 9, padding: "1px 6px", borderRadius: 4, fontFamily: "monospace",
                    background: "rgba(0,0,0,0.03)", color: "rgba(0,0,0,0.50)",
                    border: "1px solid rgba(0,0,0,0.07)",
                  }}>
                    {ref.framework} · {ref.citation}
                  </span>
                ))}
              </div>
            )}

            {/* Mitigation */}
            {applied ? (
              <div style={{ fontSize: 11, color: "rgba(0,0,0,0.40)" }}>
                ✓ Applicata al Risk Register — ID: {r.mitigation?.registerRiskId}
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <input
                  value={mitigationTexts[r.id] ?? ""}
                  onChange={e => setMitigationTexts(prev => ({ ...prev, [r.id]: e.target.value }))}
                  placeholder="Descrivi la mitigazione..."
                  style={{
                    flex: 1, padding: "6px 10px", borderRadius: 7, fontSize: 11,
                    border: "1px solid rgba(0,0,0,0.10)", color: "#0D1016",
                    background: "#f9f9fb", outline: "none",
                  }}
                />
                <button
                  disabled={!mitigationTexts[r.id]?.trim() || applying === r.id}
                  onClick={() => handleApply(r.id)}
                  style={{
                    padding: "6px 14px", borderRadius: 7, fontSize: 11, fontWeight: 600,
                    cursor: mitigationTexts[r.id]?.trim() ? "pointer" : "not-allowed",
                    background: mitigationTexts[r.id]?.trim() ? "#0D1016" : "rgba(0,0,0,0.05)",
                    color: mitigationTexts[r.id]?.trim() ? "#ffffff" : "rgba(0,0,0,0.30)",
                    border: "1px solid rgba(0,0,0,0.10)",
                    whiteSpace: "nowrap",
                  }}>
                  Applica al Risk Register
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
