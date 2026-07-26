"use client";

// Barra di fasi guidata (scaletta) — stessa impostazione di AssessmentStepper (FRIA).
// Mostra l'avanzamento del tool e permette di saltare alla sezione (scroll all'àncora).

export interface ToolPhase {
  id: string;
  label: string;
  sublabel: string;
  anchor: string; // id dell'elemento a cui scrollare
}

export function ToolPhaseBar({ phases, currentIdx }: { phases: ToolPhase[]; currentIdx: number }) {
  const go = (anchor: string) => {
    document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div style={{
      display: "flex", gap: 0, marginBottom: 20,
      border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10, overflow: "hidden",
    }}>
      {phases.map((step, i) => {
        const isDone = i < currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <button
            key={step.id}
            onClick={() => go(step.anchor)}
            style={{
              flex: 1, border: "none", textAlign: "left", cursor: "pointer",
              padding: "10px 14px",
              background: isCurrent ? "#0D1016" : isDone ? "rgba(0,0,0,0.03)" : "#ffffff",
              borderRight: i < phases.length - 1 ? "1px solid rgba(0,0,0,0.08)" : "none",
            }}
          >
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
              <span style={{ fontSize: 12, fontWeight: 600, color: isCurrent ? "#ffffff" : isDone ? "#0D1016" : "rgba(0,0,0,0.4)" }}>
                {step.label}
              </span>
            </div>
            <div style={{ fontSize: 10, paddingLeft: 24, color: isCurrent ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.35)" }}>
              {step.sublabel}
            </div>
          </button>
        );
      })}
    </div>
  );
}
