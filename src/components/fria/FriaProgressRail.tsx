"use client";
import React, { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { GuidedFriaProgress } from "@/lib/fria/fria-guided-progress";

const T = {
  text:     "#0D1016",
  muted:    "rgba(0,0,0,0.42)",
  faint:    "rgba(0,0,0,0.22)",
  border:   "rgba(0,0,0,0.08)",
  bg:       "#fafafa",
  green:    "#23403a",
  greenBg:  "rgba(35,64,58,0.06)",
  greenBdr: "rgba(35,64,58,0.20)",
  amber:    "#b45309",
} as const;

function ProgressBar({ pct, color = T.green }: { pct: number; color?: string }) {
  return (
    <div style={{ height: 3, background: "rgba(0,0,0,0.06)", borderRadius: 2, overflow: "hidden", marginTop: 4 }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 0.35s ease" }} />
    </div>
  );
}

export interface FriaProgressRailProps {
  progress: GuidedFriaProgress;
  activeSection: string | null;
  currentSubPointId?: string | null;
  onSectionClick: (sectionKey: string, anchor: string) => void;
  onSubPointClick: (subPointId: string) => void;
}

export function FriaProgressRail({
  progress, activeSection, currentSubPointId, onSectionClick, onSubPointClick,
}: FriaProgressRailProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const pct = progress.overallPercent;
  const globalColor = pct >= 80 ? T.green : pct >= 40 ? T.amber : T.faint;

  const toggle = (key: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: T.bg }}>
      {/* Header — stile Risk Manager */}
      <div style={{ padding: "12px 12px 10px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Avanzamento</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: T.text, fontFamily: "monospace" }}>{pct}%</span>
        </div>
        <div style={{ width: "100%", height: 4, background: "rgba(0,0,0,0.07)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: T.text, borderRadius: 2, transition: "width 0.5s ease" }} />
        </div>
      </div>

      {/* Sezioni */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
        {progress.sections.map((sec, idx) => {
          const isActive   = activeSection === sec.key;
          const isExpanded = expanded.has(sec.key);
          const doneCount  = sec.subPoints.filter(sp => sp.status === "done").length;
          const totalCount = sec.subPoints.length;
          const secColor   = sec.percent === 100 ? T.green : sec.percent > 0 ? T.amber : T.faint;

          const borderColor = isActive
            ? T.greenBdr
            : sec.percent === 100
            ? "rgba(35,64,58,0.12)"
            : "rgba(0,0,0,0.07)";
          const bg = isActive ? T.greenBg : "transparent";

          return (
            <div key={sec.key} style={{
              border: `1px solid ${borderColor}`,
              background: isActive ? T.greenBg : "#fff",
              borderRadius: 8,
              overflow: "hidden",
              marginBottom: 10,
            }}>
              <button
                onClick={() => { onSectionClick(sec.key, sec.anchor); toggle(sec.key); }}
                style={{
                  width: "100%", textAlign: "left", border: "none",
                  background: "transparent", padding: "9px 10px",
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(0,0,0,0.02)"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ flexShrink: 0 }}>
                  {sec.percent === 100
                    ? <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${T.green}` }} />
                    : <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid #dc2626` }} />
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: T.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {idx + 1}. {sec.label}
                  </p>
                  <p style={{ fontSize: 9, color: T.muted, margin: 0, marginTop: 1 }}>
                    {doneCount}/{totalCount} · {sec.legalRef}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: secColor, fontFamily: "monospace" }}>
                    {sec.percent}%
                  </span>
                  <ChevronRight
                    size={10}
                    style={{
                      color: T.faint,
                      transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                      transition: "transform 0.2s",
                    }}
                  />
                </div>
              </button>

              {/* Sotto-punti espansi */}
              {isExpanded && sec.subPoints.length > 0 && (
                <div style={{ borderTop: `1px solid rgba(0,0,0,0.05)`, padding: "4px 6px 6px 6px" }}>
                  {sec.subPoints.map(sp => {
                    const isCurrent = currentSubPointId === sp.id;
                    return (
                      <button
                        key={sp.id}
                        onClick={() => onSubPointClick(sp.id)}
                        style={{
                          width: "100%", textAlign: "left", border: "none",
                          background: isCurrent ? T.greenBg : "transparent",
                          borderRadius: 5, cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "4px 6px",
                          outline: isCurrent ? `1px solid ${T.greenBdr}` : "none",
                        }}
                        onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = "rgba(0,0,0,0.03)"; }}
                        onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = "transparent"; }}
                      >
                        <div style={{ flexShrink: 0 }}>
                          {sp.status === "done"
                            ? <div style={{ width: 10, height: 10, borderRadius: "50%", border: `1.5px solid ${T.green}` }} />
                            : <div style={{ width: 10, height: 10, borderRadius: "50%", border: `1.5px solid ${isCurrent ? T.amber : "#dc2626"}` }} />
                          }
                        </div>
                        <p style={{
                          fontSize: 10, fontWeight: isCurrent ? 600 : 400,
                          color: sp.status === "done" ? T.muted : isCurrent ? T.green : T.text,
                          margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          textDecoration: sp.status === "done" ? "line-through" : "none",
                          opacity: sp.status === "done" ? 0.55 : 1,
                        }}>
                          {sp.label}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
