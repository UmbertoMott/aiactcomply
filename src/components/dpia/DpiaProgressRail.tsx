"use client";
import React, { useState } from "react";
import { ChevronRight, CheckCircle, Clock } from "lucide-react";
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

function ProgressBar({ pct, color = T.green }: { pct: number; color?: string }) {
  return (
    <div style={{ height: 3, background: "rgba(0,0,0,0.06)", borderRadius: 2, overflow: "hidden", marginTop: 4 }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 0.35s ease" }} />
    </div>
  );
}

export interface DpiaProgressRailProps {
  progress: GuidedDpiaProgress;
  activeSection: string | null;
  onSectionClick: (sectionKey: string, anchor: string) => void;
  onSubPointClick: (subPointId: string) => void;
}

export function DpiaProgressRail({
  progress, activeSection, onSectionClick,
}: DpiaProgressRailProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["screening"]));
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
      {/* Header */}
      <div style={{ padding: "14px 14px 10px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Avanzamento
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: globalColor, fontFamily: "monospace" }}>
            {pct}%
          </span>
        </div>
        <ProgressBar pct={pct} color={globalColor} />
      </div>

      {/* Sezioni */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
        {progress.sections.map(sec => {
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
              background: bg,
              borderRadius: 8,
              overflow: "hidden",
              marginBottom: 4,
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
                    ? <CheckCircle size={14} style={{ color: T.green }} />
                    : sec.percent > 0
                    ? <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${T.amber}` }} />
                    : <Clock size={14} style={{ color: T.faint }} />
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 11.5,
                    fontWeight: isActive ? 700 : 600,
                    color: sec.percent === 100 ? T.green : T.text,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {sec.label}
                  </div>
                  <ProgressBar pct={sec.percent} color={secColor} />
                </div>
                <ChevronRight size={11} style={{
                  flexShrink: 0, color: "rgba(0,0,0,0.25)",
                  transform: isExpanded ? "rotate(90deg)" : "none",
                  transition: "transform 0.15s",
                }} />
              </button>

              {isExpanded && (
                <div style={{ padding: "0 10px 8px 34px" }}>
                  <span style={{ fontSize: 10, color: sec.percent === 100 ? T.green : T.muted }}>
                    {doneCount} / {totalCount} completati
                  </span>
                  {sec.legalRef && (
                    <span style={{ fontSize: 9, color: T.faint, marginLeft: 5 }}>· {sec.legalRef}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: "8px 12px", borderTop: `1px solid ${T.border}` }}>
        <p style={{ fontSize: 9, color: T.faint, margin: 0, lineHeight: 1.4 }}>
          WP248 Allegato 2 — pesi somma = 100
        </p>
      </div>
    </div>
  );
}
