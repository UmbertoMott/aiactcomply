"use client";
// Pannello di avanzamento sinistro (tipo Risk Register).
// - Barra overallPercent + lista sezioni Allegato 2
// - Clic su sezione → scrolla il viewer all'anchor + notifica onSectionClick
// - Evidenzia sezione attiva; mostra sotto-punti mancanti della sezione attiva
import React from "react";
import type { GuidedDpiaProgress } from "@/lib/dpia/dpia-guided-progress";

// ─── Token ───────────────────────────────────────────────────────────────────
const T = {
  text:     "#0D1016",
  muted:    "rgba(0,0,0,0.42)",
  faint:    "rgba(0,0,0,0.22)",
  border:   "rgba(0,0,0,0.08)",
  card:     "#ffffff",
  bg:       "#f8f8f7",
  green:    "#23403a",
  greenBg:  "rgba(35,64,58,0.07)",
  greenBdr: "rgba(35,64,58,0.20)",
  amber:    "#b45309",
  amberBg:  "rgba(180,83,9,0.06)",
  amberBdr: "rgba(180,83,9,0.20)",
  red:      "#b91c1c",
  redBg:    "rgba(185,28,28,0.06)",
  redBdr:   "rgba(185,28,28,0.18)",
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatusDot({ percent, size = 10 }: { percent: number; size?: number }) {
  const color = percent === 100 ? T.green : percent > 0 ? T.amber : T.faint;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: color, flexShrink: 0,
    }} />
  );
}

function ProgressBar({ pct, color = T.green }: { pct: number; color?: string }) {
  return (
    <div style={{ height: 4, background: "rgba(0,0,0,0.06)", borderRadius: 2, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 0.35s ease" }} />
    </div>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface DpiaProgressRailProps {
  progress: GuidedDpiaProgress;
  activeSection: string | null;
  onSectionClick: (sectionKey: string, anchor: string) => void;
  onSubPointClick: (subPointId: string) => void;
}

export function DpiaProgressRail({
  progress, activeSection, onSectionClick, onSubPointClick,
}: DpiaProgressRailProps) {
  const pct = progress.overallPercent;
  const globalColor = pct >= 80 ? T.green : pct >= 40 ? T.amber : T.faint;

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 0,
      height: "100%", background: T.bg, overflowY: "auto",
    }}>
      {/* ── Header globale ── */}
      <div style={{ padding: "16px 14px 10px", borderBottom: `1px solid ${T.border}` }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: T.text, margin: "0 0 6px" }}>
          Avanzamento DPIA
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <p style={{ fontSize: 10, color: T.muted, margin: 0 }}>Completamento complessivo</p>
          <span style={{ fontSize: 14, fontWeight: 700, color: globalColor }}>{pct}%</span>
        </div>
        <ProgressBar pct={pct} color={globalColor} />
        <p style={{ fontSize: 9, color: T.faint, margin: "5px 0 0" }}>
          Pesi Allegato 2 WP248 — somma = 100
        </p>
      </div>

      {/* ── Lista sezioni ── */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {progress.sections.map(sec => {
          const isActive = activeSection === sec.key;
          const secColor = sec.percent === 100 ? T.green : sec.percent > 0 ? T.amber : T.faint;
          const missing  = sec.subPoints.filter(sp => sp.required && sp.status !== "done");

          return (
            <div key={sec.key} style={{
              borderBottom: `1px solid ${T.border}`,
              background: isActive ? T.greenBg : "transparent",
              transition: "background 0.15s ease",
            }}>
              {/* Riga sezione — cliccabile */}
              <button
                onClick={() => onSectionClick(sec.key, sec.anchor)}
                style={{
                  width: "100%", textAlign: "left", border: "none", cursor: "pointer",
                  background: "none", padding: "10px 14px",
                  display: "flex", alignItems: "center", gap: 8,
                }}
              >
                <StatusDot percent={sec.percent} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                    <p style={{ fontSize: 11, fontWeight: isActive ? 700 : 500, color: T.text, margin: 0, lineHeight: 1.3 }}>
                      {sec.label}
                    </p>
                    <span style={{ fontSize: 10, fontWeight: 700, color: secColor, flexShrink: 0, marginLeft: 4 }}>
                      {sec.percent}%
                    </span>
                  </div>
                  <p style={{ fontSize: 9, color: T.faint, margin: "1px 0 3px" }}>
                    {sec.legalRef} · peso {sec.weight}
                  </p>
                  <ProgressBar pct={sec.percent} color={secColor} />
                </div>
              </button>

              {/* Sotto-punti mancanti — visibili solo se sezione attiva */}
              {isActive && missing.length > 0 && (
                <div style={{ padding: "0 14px 10px 32px" }}>
                  <p style={{ fontSize: 9, color: T.muted, margin: "0 0 4px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Da completare
                  </p>
                  {missing.slice(0, 6).map(sp => (
                    <button
                      key={sp.id}
                      onClick={() => onSubPointClick(sp.id)}
                      style={{
                        display: "block", width: "100%", textAlign: "left",
                        background: "none", border: "none", cursor: "pointer",
                        padding: "3px 0",
                        fontSize: 10, color: T.amber,
                        textDecoration: "underline", textDecorationColor: "rgba(180,83,9,0.3)",
                      }}
                    >
                      → {sp.label}
                    </button>
                  ))}
                  {missing.length > 6 && (
                    <p style={{ fontSize: 9, color: T.faint, margin: "2px 0 0" }}>
                      e altri {missing.length - 6}…
                    </p>
                  )}
                </div>
              )}

              {/* Label stato sezione attiva */}
              {isActive && missing.length === 0 && sec.status !== "not_started" && (
                <div style={{ padding: "0 14px 8px 32px" }}>
                  <p style={{ fontSize: 9, color: T.green, margin: 0, fontWeight: 600 }}>
                    ✓ {sec.detail}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Footer ── */}
      <div style={{ padding: "10px 14px", borderTop: `1px solid ${T.border}` }}>
        <p style={{ fontSize: 9, color: T.faint, margin: 0, lineHeight: 1.4 }}>
          Clic su una sezione → il viewer scorre all'ancora corrispondente.
          I sotto-punti in arancione rimandano alla domanda nella chat.
        </p>
      </div>
    </div>
  );
}
