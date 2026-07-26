"use client";

// Barra di fasi guidata (scaletta) — sticky in alto, segue lo scroll.
// Spunto da AssessmentStepper (FRIA). I numeri combaciano con PhaseHeading.

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
      position: "sticky", top: 0, zIndex: 30,
      background: "rgba(249,249,251,0.92)", backdropFilter: "blur(8px)",
      paddingTop: 8, paddingBottom: 8, marginBottom: 16,
    }}>
      <div style={{
        display: "flex", gap: 0,
        border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10, overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)", background: "#fff",
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
                padding: "9px 14px",
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
    </div>
  );
}

// Intestazione numerata a inizio fase — combacia con il numero nella barra.
export function PhaseHeading({ n, title, sub }: { n: number; title: string; sub?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11, margin: "6px 0 14px" }}>
      <span style={{
        width: 28, height: 28, borderRadius: "50%", background: "#0D1016", color: "#fff",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, fontWeight: 700, flexShrink: 0,
      }}>{n}</span>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#0D1016", letterSpacing: "-0.2px" }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: "rgba(0,0,0,0.42)" }}>{sub}</div>}
      </div>
    </div>
  );
}
