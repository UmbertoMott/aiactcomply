"use client";
import { getAssessment } from "@/lib/assessment/assessment-helpers";
import type { AssessmentShared } from "@/lib/assessment/assessment-schema";

const RISK_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  unacceptable: { bg: "rgba(220,38,38,0.08)", color: "#dc2626", label: "Inaccettabile" },
  high:         { bg: "rgba(220,38,38,0.06)", color: "#dc2626", label: "Alto Rischio" },
  limited:      { bg: "rgba(202,138,4,0.06)", color: "#92400e", label: "Rischio Limitato" },
  minimal:      { bg: "rgba(21,128,61,0.06)", color: "#15803d", label: "Rischio Minimo"  },
};

export function AssessmentSharedHeader() {
  const shared: AssessmentShared = getAssessment().shared;
  const risk = RISK_BADGE[shared.riskLevel] ?? RISK_BADGE.minimal;

  if (!shared.systemName) return null;

  return (
    <div style={{
      background: "#ffffff",
      border: "1px solid rgba(0,0,0,0.08)",
      borderRadius: 10,
      padding: "12px 16px",
      marginBottom: 16,
      display: "flex",
      flexWrap: "wrap" as const,
      gap: 16,
      alignItems: "flex-start",
    }}>
      <div style={{ flexShrink: 0 }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1px",
          color: "rgba(0,0,0,0.3)", textTransform: "uppercase" as const,
          display: "block", marginBottom: 4 }}>
          Assessment — Dati comuni
        </span>
        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99,
          background: "rgba(0,0,0,0.05)", color: "rgba(0,0,0,0.4)",
          fontStyle: "italic" }}>
          Sola lettura · modificabile da Classifier
        </span>
      </div>

      <Field label="Sistema" value={shared.systemName} />
      {shared.organization && <Field label="Organizzazione" value={shared.organization} />}

      <div>
        <Label>Livello rischio</Label>
        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99,
          background: risk.bg, color: risk.color, display: "inline-block" }}>
          {risk.label}
        </span>
      </div>

      {shared.annexIII && (
        <div>
          <Label>Allegato III</Label>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#dc2626" }}>✓ Applicabile</span>
        </div>
      )}

      {shared.purpose && <Field label="Finalità" value={shared.purpose} maxWidth={220} />}
      {shared.legalBasis && <Field label="Base giuridica" value={shared.legalBasis} maxWidth={180} />}

      {shared.processesPersonalData && (
        <div>
          <Label>Dati personali</Label>
          <span style={{ fontSize: 11, color: "#92400e" }}>
            ⚠ Sì
            {shared.personalDataCategories.length > 0 &&
              ` — ${shared.personalDataCategories.slice(0, 2).join(", ")}${shared.personalDataCategories.length > 2 ? "…" : ""}`}
          </span>
        </div>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.8px",
      color: "rgba(0,0,0,0.3)", textTransform: "uppercase" as const,
      marginBottom: 3 }}>
      {children}
    </div>
  );
}

function Field({ label, value, maxWidth }: { label: string; value: string; maxWidth?: number }) {
  return (
    <div style={{ maxWidth }}>
      <Label>{label}</Label>
      <div style={{ fontSize: 12, color: "#0D1016", overflow: "hidden",
        textOverflow: "ellipsis", whiteSpace: "nowrap" as const,
        maxWidth: maxWidth ?? 160 }}>
        {value}
      </div>
    </div>
  );
}
