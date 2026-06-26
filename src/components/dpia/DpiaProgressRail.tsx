"use client";
import React, { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { GuidedDpiaProgress } from "@/lib/dpia/dpia-guided-progress";

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

export interface DpiaProgressRailProps {
  progress: GuidedDpiaProgress;
  activeSection: string | null;
  onSectionClick: (sectionKey: string, anchor: string) => void;
  onSubPointClick: (subPointId: string) => void;
}

export function DpiaProgressRail({
  progress, activeSection, onSectionClick, onSubPointClick,
}: DpiaProgressRailProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["screening"]));

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
          <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Documento</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: T.text, fontFamily: "monospace" }}>{progress.overallPercent}%</span>
        </div>
        <div style={{ width: "100%", height: 4, background: "rgba(0,0,0,0.07)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress.overallPercent}%`, background: T.text, borderRadius: 2, transition: "width 0.5s ease" }} />
        </div>
      </div>

      {/* Sezioni */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
        {progress.sections.map((sec, idx) => {
          const isActive   = activeSection === sec.key;
          const isExpanded = expanded.has(sec.key);
          const doneCount  = sec.subPoints.filter(sp => sp.status === "done").length;
          const totalCount = sec.subPoints.length;
          const circleColor = sec.percent === 100 ? T.green : "#dc2626";
          const pctColor    = sec.percent === 100 ? T.green : sec.percent > 0 ? T.amber : T.faint;

          const borderColor = isActive
            ? T.greenBdr
            : sec.percent === 100
            ? "rgba(35,64,58,0.12)"
            : "rgba(0,0,0,0.07)";
          const bg = isActive ? T.greenBg : "transparent";

          return (
            <div key={sec.key} style={{
              border: `1px solid ${borderColor}`,
              background: bg,
              borderRadius: 8,
              overflow: "hidden",
              marginBottom: 6,
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
                  <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${circleColor}` }} />
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
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: pctColor, fontFamily: "monospace" }}>
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

              {/* Progress bar */}
              <div style={{ height: 2, background: "rgba(0,0,0,0.04)" }}>
                <div style={{ height: "100%", width: `${sec.percent}%`, background: circleColor, transition: "width 0.35s" }} />
              </div>

              {/* Sotto-punti espansi */}
              {isExpanded && sec.subPoints.length > 0 && (
                <div style={{ borderTop: "1px solid rgba(0,0,0,0.05)", padding: "4px 6px 6px 6px" }}>
                  {sec.subPoints.map(sp => (
                    <div
                      key={sp.id}
                      onClick={() => onSubPointClick(sp.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "4px 4px", borderRadius: 5, cursor: "pointer",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.03)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <div style={{ flexShrink: 0 }}>
                        {sp.status === "done"
                          ? <div style={{ width: 10, height: 10, borderRadius: "50%", border: `1.5px solid ${T.green}` }} />
                          : <div style={{ width: 10, height: 10, borderRadius: "50%", border: `1.5px solid #dc2626` }} />
                        }
                      </div>
                      <p style={{
                        fontSize: 10, color: sp.status === "done" ? T.muted : T.text,
                        margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        textDecoration: sp.status === "done" ? "line-through" : "none",
                        opacity: sp.status === "done" ? 0.55 : 1,
                      }}>
                        {sp.label}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
