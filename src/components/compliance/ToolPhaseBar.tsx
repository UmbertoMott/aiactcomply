"use client";

// Barra di fasi guidata (scaletta) — sticky in alto, segue lo scroll.
// Spunto da AssessmentStepper (FRIA). I numeri combaciano con PhaseHeading.
//
// Retrocompatibile: i tool esistenti passano solo { phases, currentIdx }.
// Nuove prop opzionali:
//  - status:      stato reale di completamento per fase ("done" | "active" | "todo")
//                 → la ✓ verde riflette il lavoro fatto, non la posizione di scroll
//  - activeIdx:   fase attualmente in viewport (scroll-spy) → evidenziazione scura
//  - progressPct: linea di avanzamento sottile sotto la barra (0-100), sempre visibile
//  - meta:        etichetta compatta a destra della linea (es. "3/10 pratiche")

export interface ToolPhase {
  id: string;
  label: string;
  sublabel: string;
  anchor: string; // id dell'elemento a cui scrollare
}

export type PhaseStatus = "done" | "active" | "todo";

const GREEN = "#15803d";
const GREEN_BG = "rgba(22,163,74,0.10)";

export function ToolPhaseBar({
  phases, currentIdx, status, activeIdx, progressPct, meta, onSelect,
}: {
  phases: ToolPhase[];
  currentIdx: number;
  status?: PhaseStatus[];
  activeIdx?: number;
  progressPct?: number;
  meta?: string;
  // Se fornito, il click seleziona la fase (tool modali come DocuGen) invece di scrollare.
  onSelect?: (index: number) => void;
}) {
  const go = (anchor: string) => {
    document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const highlight = activeIdx ?? currentIdx;

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
          // Stato di completamento reale (se fornito), altrimenti fallback storico.
          const st: PhaseStatus = status?.[i] ?? (i < currentIdx ? "done" : i === currentIdx ? "active" : "todo");
          const isDone = st === "done";
          const isCurrent = i === highlight;
          return (
            <button
              key={step.id}
              onClick={() => onSelect ? onSelect(i) : go(step.anchor)}
              aria-current={isCurrent ? "step" : undefined}
              title={`${step.label} — ${step.sublabel}`}
              style={{
                flex: 1, border: "none", textAlign: "left", cursor: "pointer",
                padding: "9px 14px",
                background: isCurrent ? "#0D1016" : isDone ? "rgba(22,163,74,0.04)" : "#ffffff",
                borderRight: i < phases.length - 1 ? "1px solid rgba(0,0,0,0.08)" : "none",
                transition: "background 160ms ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <span style={{
                  width: 18, height: 18, borderRadius: "50%",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 700, flexShrink: 0,
                  background: isCurrent ? "#ffffff" : isDone ? GREEN_BG : st === "active" ? "rgba(0,0,0,0.10)" : "rgba(0,0,0,0.06)",
                  color: isCurrent ? "#0D1016" : isDone ? GREEN : st === "active" ? "#0D1016" : "rgba(0,0,0,0.35)",
                  border: isDone && !isCurrent ? "1px solid rgba(22,163,74,0.35)" : "1px solid transparent",
                  transition: "background 160ms ease, color 160ms ease",
                }}>
                  {isDone ? "✓" : i + 1}
                </span>
                <span style={{
                  fontSize: 12, fontWeight: 600,
                  color: isCurrent ? "#ffffff" : isDone ? GREEN : st === "active" ? "#0D1016" : "rgba(0,0,0,0.4)",
                }}>
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

      {/* Linea di avanzamento globale — resta visibile durante lo scroll */}
      {typeof progressPct === "number" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, padding: "0 2px" }}>
          <div style={{ flex: 1, height: 3, borderRadius: 99, background: "rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 99,
              width: `${Math.max(0, Math.min(100, progressPct))}%`,
              background: progressPct >= 100 ? GREEN : "#0D1016",
              transition: "width 400ms ease",
            }} />
          </div>
          {meta && (
            <span style={{ fontSize: 10, fontWeight: 600, color: progressPct >= 100 ? GREEN : "rgba(0,0,0,0.45)", whiteSpace: "nowrap" }}>
              {meta}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Intestazione numerata a inizio fase — combacia con il numero nella barra.
// `done` opzionale: cerchio verde con ✓ quando la fase è completata.
export function PhaseHeading({ n, title, sub, done }: { n: number; title: string; sub?: string; done?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11, margin: "6px 0 14px" }}>
      <span style={{
        width: 28, height: 28, borderRadius: "50%",
        background: done ? GREEN_BG : "#0D1016",
        color: done ? GREEN : "#fff",
        border: done ? "1.5px solid rgba(22,163,74,0.4)" : "1.5px solid transparent",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, fontWeight: 700, flexShrink: 0,
        transition: "background 160ms ease, color 160ms ease",
      }}>{done ? "✓" : n}</span>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#0D1016", letterSpacing: "-0.2px" }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: "rgba(0,0,0,0.42)" }}>{sub}</div>}
      </div>
    </div>
  );
}

// CTA di fine fase — guida alla fase successiva senza obbligare a usare la barra.
export function NextPhaseCta({ label, anchor }: { label: string; anchor: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
      <button
        onClick={() => document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" })}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontSize: 12, fontWeight: 500, padding: "7px 14px", borderRadius: 8,
          background: "transparent", color: "rgba(0,0,0,0.55)",
          border: "1px solid rgba(0,0,0,0.12)", cursor: "pointer",
          transition: "background 160ms ease, color 160ms ease",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "#0D1016"; e.currentTarget.style.color = "#fff"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(0,0,0,0.55)"; }}
      >
        {label} →
      </button>
    </div>
  );
}
