"use client";

import React, { useState } from "react";
import type { CSSProperties } from "react";
import type { GuidedQ } from "@/lib/guided/guided-types";

// ─── Design tokens (no blue) ─────────────────────────────────────────────────
const T = {
  text: "#0D1016",
  muted: "rgba(0,0,0,0.42)",
  faint: "rgba(0,0,0,0.22)",
  border: "rgba(0,0,0,0.08)",
  card: "#ffffff",
  bg: "#f9f9fb",
  green: "#15803d",
  greenBg: "rgba(21,128,61,0.06)",
  greenBdr: "rgba(21,128,61,0.18)",
} as const;

const YES_NO_PARTIAL = ["Sì", "No", "Parzialmente"];
const YES_NO = ["Sì", "No"];

interface Props {
  q: GuidedQ;
  value: string;
  onChange: (value: string) => void;
}

export function GuidedQuestion({ q, value, onChange }: Props) {
  const [showExamples, setShowExamples] = useState(true);

  const buttons =
    q.answerType === "yes_no_partial" ? YES_NO_PARTIAL
    : q.answerType === "yes_no" ? YES_NO
    : q.answerType === "choices" ? (q.choices ?? [])
    : [];

  function pickExample(text: string) {
    onChange(text);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Ref badge */}
      <div>
        <span style={{
          fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 9999,
          background: "rgba(13,16,22,0.04)", border: "1px solid rgba(13,16,22,0.1)",
          color: T.muted, letterSpacing: "0.3px",
        }}>
          {q.ref}
        </span>
      </div>

      {/* Question */}
      <p style={{ fontSize: 14, fontWeight: 600, color: T.text, margin: 0, lineHeight: 1.5 }}>
        {q.question}
        {q.required && <span style={{ color: "#dc2626", marginLeft: 3 }}>*</span>}
      </p>

      {/* ESEMPI box */}
      {q.examples.length > 0 && (
        <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10 }}>
          <button
            onClick={() => setShowExamples((v) => !v)}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 12px", background: "none", border: "none", cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.6px" }}>
              ESEMPI
            </span>
            <span style={{ fontSize: 10, color: T.faint }}>{showExamples ? "▲" : "▼"}</span>
          </button>

          {showExamples && (
            <div style={{ borderTop: `1px solid ${T.border}`, padding: "4px 8px 8px" }}>
              {q.examples.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => pickExample(ex.text)}
                  style={{
                    display: "block", width: "100%", textAlign: "left", padding: "6px 8px",
                    marginTop: 4, borderRadius: 7, border: "1px solid transparent",
                    background: "none", cursor: "pointer", fontSize: 12, color: T.muted,
                    lineHeight: 1.45, transition: "all 0.1s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(13,16,22,0.04)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = T.border;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "none";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent";
                  }}
                >
                  <span style={{ fontWeight: 600, color: T.text, marginRight: 4 }}>{ex.label}</span>
                  {ex.text}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick-answer buttons */}
      {buttons.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {buttons.map((btn) => {
            const isActive = value === btn;
            return (
              <button
                key={btn}
                onClick={() => onChange(btn)}
                style={{
                  padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                  cursor: "pointer", transition: "all 0.1s",
                  background: isActive ? T.text : "rgba(13,16,22,0.04)",
                  color: isActive ? "#fff" : T.text,
                  border: isActive ? "1px solid transparent" : `1px solid ${T.border}`,
                }}
              >
                {btn}
              </button>
            );
          })}
        </div>
      )}

      {/* Free-text area */}
      <div>
        <label style={{ display: "block", fontSize: 10, fontWeight: 500, color: T.faint, marginBottom: 4 }}>
          {buttons.length > 0 ? "Oppure scrivi una risposta personalizzata…" : "Risposta"}
        </label>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder={q.examples[0]?.text ?? "Scrivi qui…"}
          style={{
            width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${T.border}`,
            fontSize: 12, color: T.text, background: T.card, outline: "none",
            resize: "vertical", lineHeight: 1.5, fontFamily: "inherit",
          }}
        />
      </div>
    </div>
  );
}
