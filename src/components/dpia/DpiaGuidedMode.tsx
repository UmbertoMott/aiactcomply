"use client";

import React, { useState } from "react";
import type { CSSProperties } from "react";
import { DPIA_SUBPOINTS, DPIA_GUIDED_SECTIONS } from "@/lib/dpia/dpia-template";
import type { DpiaSubPoint } from "@/lib/dpia/dpia-template";

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

const cardSt: CSSProperties = {
  background: T.card, border: `1px solid ${T.border}`, borderRadius: 12,
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};

export type DpiaGuidedAnswers = Record<string, string>;

interface Props {
  onApply: (answers: DpiaGuidedAnswers) => void;
  onClose: () => void;
  initialAnswers?: DpiaGuidedAnswers;
  /** Limit to specific sectionKey(s). If omitted, all sections are shown. */
  sectionFilter?: string[];
}

const YNP_BUTTONS = ["Sì", "No", "Parzialmente"];
const YN_BUTTONS = ["Sì", "No"];

function SubPointCard({
  sp,
  value,
  onChange,
}: {
  sp: DpiaSubPoint;
  value: string;
  onChange: (v: string) => void;
}) {
  const [showExamples, setShowExamples] = useState(true);

  const buttons =
    sp.fieldType === "select_ynp" ? YNP_BUTTONS
    : sp.fieldType === "select_yn" ? YN_BUTTONS
    : sp.fieldType === "select_compliance"
      ? ["conforme", "parzialmente_conforme", "non_conforme", "n/a"]
    : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Ref badge */}
      <span style={{
        fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 9999,
        background: "rgba(13,16,22,0.04)", border: "1px solid rgba(13,16,22,0.1)",
        color: T.muted, letterSpacing: "0.3px", alignSelf: "flex-start",
      }}>
        {sp.ref}
      </span>

      {/* Question */}
      <p style={{ fontSize: 14, fontWeight: 600, color: T.text, margin: 0, lineHeight: 1.5 }}>
        {sp.question}
        {sp.required && <span style={{ color: "#dc2626", marginLeft: 3 }}>*</span>}
      </p>

      {/* ESEMPI box */}
      {sp.examples.length > 0 && (
        <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10 }}>
          <button
            onClick={() => setShowExamples((v) => !v)}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 12px", background: "none", border: "none", cursor: "pointer" }}
          >
            <span style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.6px" }}>ESEMPI</span>
            <span style={{ fontSize: 10, color: T.faint }}>{showExamples ? "▲" : "▼"}</span>
          </button>
          {showExamples && (
            <div style={{ borderTop: `1px solid ${T.border}`, padding: "4px 8px 8px" }}>
              {sp.examples.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => onChange(ex)}
                  style={{
                    display: "block", width: "100%", textAlign: "left", padding: "6px 8px", marginTop: 4,
                    borderRadius: 7, border: "1px solid transparent", background: "none",
                    cursor: "pointer", fontSize: 12, color: T.muted, lineHeight: 1.45, transition: "all 0.1s",
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
                  {ex}
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

      {/* Free text */}
      {sp.fieldType !== "info" && (
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 500, color: T.faint, marginBottom: 4 }}>
            {buttons.length > 0 ? "Oppure scrivi una risposta personalizzata…" : "Risposta"}
          </label>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={sp.fieldType === "multiline" ? 4 : 2}
            placeholder={sp.ghostHint ?? "Scrivi qui…"}
            style={{
              width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${T.border}`,
              fontSize: 12, color: T.text, background: T.card, outline: "none",
              resize: "vertical", lineHeight: 1.5, fontFamily: "inherit",
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function DpiaGuidedMode({ onApply, onClose, initialAnswers = {}, sectionFilter }: Props) {
  const allSubpoints = sectionFilter
    ? DPIA_SUBPOINTS.filter((sp) => sectionFilter.includes(sp.sectionKey))
    : DPIA_SUBPOINTS;

  const sections = sectionFilter
    ? DPIA_GUIDED_SECTIONS.filter((s) => sectionFilter.includes(s.key))
    : DPIA_GUIDED_SECTIONS;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<DpiaGuidedAnswers>(initialAnswers);

  const currentSP = allSubpoints[currentIdx];
  const totalQ = allSubpoints.length;
  const answered = Object.values(answers).filter(Boolean).length;

  function setAnswer(fieldPath: string, value: string) {
    setAnswers((prev) => ({ ...prev, [fieldPath]: value }));
  }

  const sectionForCurrent = sections.find((s) => s.key === currentSP?.sectionKey);

  return (
    <div style={{ display: "flex", gap: 20, minHeight: 520 }}>
      {/* Left nav */}
      <div style={{
        width: 190, flexShrink: 0, borderRight: `1px solid ${T.border}`,
        paddingRight: 16, display: "flex", flexDirection: "column", gap: 4,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 8 }}>
          Sotto-punti DPIA
        </div>
        {sections.map((sec) => {
          const secSubpoints = allSubpoints.filter((sp) => sp.sectionKey === sec.key);
          return (
            <div key={sec.key}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.4px", padding: "6px 0 3px" }}>
                {sec.label}
              </div>
              {secSubpoints.map((sp) => {
                const idx = allSubpoints.indexOf(sp);
                const isActive = idx === currentIdx;
                const isDone = Boolean(answers[sp.fieldPath]);
                return (
                  <button
                    key={sp.id}
                    onClick={() => setCurrentIdx(idx)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, width: "100%",
                      textAlign: "left", padding: "4px 8px", borderRadius: 7,
                      border: "none", cursor: "pointer",
                      background: isActive ? T.text : "none",
                      fontSize: 10, lineHeight: 1.35,
                      color: isActive ? "#fff" : isDone ? T.text : T.muted,
                      fontWeight: isActive ? 600 : isDone ? 500 : 400,
                    }}
                  >
                    <span style={{
                      width: 12, height: 12, borderRadius: "50%", flexShrink: 0,
                      background: isActive ? "rgba(255,255,255,0.25)" : isDone ? T.green : T.bg,
                      border: `1px solid ${isActive ? "transparent" : isDone ? T.green : T.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7,
                    }}>
                      {isDone && !isActive ? "✓" : ""}
                    </span>
                    <span style={{ flex: 1 }}>{sp.label.slice(0, 40)}{sp.label.length > 40 ? "…" : ""}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Right: current subpoint */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Progress */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: T.muted }}>
              {currentIdx + 1} / {totalQ} · {answered} risposte
            </span>
            <span style={{ fontSize: 11, color: T.muted }}>
              {sectionForCurrent?.label}
            </span>
          </div>
          <div style={{ height: 3, background: T.bg, borderRadius: 9999 }}>
            <div style={{
              height: "100%", borderRadius: 9999, transition: "width 0.3s",
              width: `${Math.round((answered / totalQ) * 100)}%`,
              background: answered === totalQ ? T.green : T.text,
            }} />
          </div>
        </div>

        {/* Current subpoint card */}
        {currentSP && (
          <div style={{ ...cardSt, padding: 24, flex: 1 }}>
            <SubPointCard
              sp={currentSP}
              value={answers[currentSP.fieldPath] ?? ""}
              onChange={(v) => setAnswer(currentSP.fieldPath, v)}
            />
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            disabled={currentIdx === 0}
            style={{
              padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 500,
              cursor: currentIdx === 0 ? "not-allowed" : "pointer",
              background: T.bg, border: `1px solid ${T.border}`, color: T.muted,
              opacity: currentIdx === 0 ? 0.4 : 1,
            }}
          >
            ← Precedente
          </button>

          {currentIdx < totalQ - 1 ? (
            <button
              onClick={() => setCurrentIdx((i) => i + 1)}
              style={{
                padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 500,
                cursor: "pointer", background: T.text, border: "none", color: "#fff",
              }}
            >
              Successiva →
            </button>
          ) : (
            <button
              onClick={() => onApply(answers)}
              style={{
                padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                cursor: "pointer", background: T.green, border: "none", color: "#fff",
              }}
            >
              Applica al form →
            </button>
          )}

          <div style={{ flex: 1 }} />
          <button
            onClick={() => onApply(answers)}
            style={{ padding: "7px 14px", borderRadius: 8, fontSize: 11, fontWeight: 500, cursor: "pointer", background: T.bg, border: `1px solid ${T.border}`, color: T.muted }}
          >
            Applica ora
          </button>
          <button
            onClick={onClose}
            style={{ padding: "7px 14px", borderRadius: 8, fontSize: 11, fontWeight: 500, cursor: "pointer", background: "none", border: `1px solid ${T.border}`, color: T.muted }}
          >
            ✕ Chiudi
          </button>
        </div>

        <p style={{ fontSize: 11, color: T.faint, margin: 0 }}>
          ✦ La modalità guidata pre-compila il form — il salvataggio richiede sempre il pulsante "Salva nel dossier". Puoi modificare manualmente qualsiasi campo.
        </p>
      </div>
    </div>
  );
}
