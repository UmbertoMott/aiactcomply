"use client";
import { getAssessment } from "@/lib/assessment/assessment-helpers";

type Tool = "dpia" | "fria" | "export";

const STEPS = [
  { id: "intake",       label: "Intake",      sublabel: "Dati sistema",    href: "/dashboard/tools/classifier" },
  { id: "analysis",    label: "Analisi",     sublabel: "DPIA + FRIA",     href: null },
  { id: "mitigations", label: "Mitigazioni", sublabel: "Rischi correlati", href: null },
  { id: "export",      label: "Export",      sublabel: "PDF DPO",          href: "/dashboard/tools/assessment-export" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

function computePhase(): StepId {
  const a = getAssessment();
  if (a.correlatedRisks.some(r => r.mitigation?.appliedToRegister)) return "export";
  if (a.correlatedRisks.length > 0) return "mitigations";
  if (a.dpia.conclusion.compliant !== "" || a.fria.scenarios.length > 0) return "analysis";
  return "intake";
}

export function AssessmentStepper({ currentTool }: { currentTool: Tool }) {
  const phase = computePhase();
  const phaseIdx = STEPS.findIndex(s => s.id === phase);

  return (
    <div style={{
      display: "flex", gap: 0, marginBottom: 20,
      border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10,
      overflow: "hidden",
    }}>
      {STEPS.map((step, i) => {
        const isDone = i < phaseIdx;
        const isCurrent =
          step.id === phase ||
          (currentTool === "dpia"   && step.id === "analysis") ||
          (currentTool === "fria"   && step.id === "analysis") ||
          (currentTool === "export" && step.id === "export");

        const inner = (
          <div style={{
            padding: "10px 14px",
            background: isCurrent ? "#0D1016" : isDone ? "rgba(0,0,0,0.03)" : "#ffffff",
            borderRight: i < 3 ? "1px solid rgba(0,0,0,0.08)" : "none",
            cursor: step.href && !isCurrent ? "pointer" : "default",
            textAlign: "left" as const,
            width: "100%",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span style={{
                width: 18, height: 18, borderRadius: "50%",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700, flexShrink: 0,
                background: isCurrent ? "#ffffff" : isDone ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.06)",
                color: isCurrent ? "#0D1016" : isDone ? "#0D1016" : "rgba(0,0,0,0.35)",
              }}>
                {isDone ? "✓" : i + 1}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600,
                color: isCurrent ? "#ffffff" : isDone ? "#0D1016" : "rgba(0,0,0,0.4)" }}>
                {step.label}
              </span>
            </div>
            <div style={{ fontSize: 10, paddingLeft: 24,
              color: isCurrent ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.35)" }}>
              {step.sublabel}
            </div>
          </div>
        );

        if (step.href && !isCurrent) {
          return (
            <a key={step.id} href={step.href}
              style={{ flex: 1, textDecoration: "none", display: "block" }}>
              {inner}
            </a>
          );
        }
        return (
          <div key={step.id} style={{ flex: 1 }}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}
