"use client";

import React, { useState } from "react";
import type { CSSProperties } from "react";
import { GuidedQuestion } from "@/components/assessment/GuidedQuestion";
import {
  FRIA_GUIDED_QUESTIONS,
  FRIA_GUIDED_SECTIONS,
} from "@/lib/fria/fria-template";
import type { GuidedAnswers } from "@/lib/guided/guided-types";

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
  amber: "#d97706",
  amberBg: "rgba(202,138,4,0.06)",
  amberBdr: "rgba(202,138,4,0.18)",
} as const;

const cardSt: CSSProperties = {
  background: T.card,
  border: `1px solid ${T.border}`,
  borderRadius: 12,
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};

interface Props {
  onApply: (answers: GuidedAnswers) => void;
  onClose: () => void;
  initialAnswers?: GuidedAnswers;
}

export default function FriaGuidedMode({ onApply, onClose, initialAnswers = {} }: Props) {
  const allQuestions = FRIA_GUIDED_QUESTIONS;
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<GuidedAnswers>(initialAnswers);
  const [activeSectionKey, setActiveSectionKey] = useState("A");

  const currentQ = allQuestions[currentIdx];
  const totalQ = allQuestions.length;
  const answered = Object.values(answers).filter(Boolean).length;

  function setAnswer(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function goNext() {
    if (currentIdx < totalQ - 1) setCurrentIdx((i) => i + 1);
  }
  function goPrev() {
    if (currentIdx > 0) setCurrentIdx((i) => i - 1);
  }

  function goToQuestion(id: string) {
    const idx = allQuestions.findIndex((q) => q.id === id);
    if (idx >= 0) setCurrentIdx(idx);
  }

  const sectionForCurrent = FRIA_GUIDED_SECTIONS.find((s) =>
    s.ids.includes(currentQ.id)
  );

  return (
    <div style={{ display: "flex", gap: 20, height: "100%", minHeight: 560 }}>
      {/* ── Left: question navigator ─────────────────────────────────── */}
      <div style={{
        width: 200, flexShrink: 0, borderRight: `1px solid ${T.border}`,
        paddingRight: 16, display: "flex", flexDirection: "column", gap: 4,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 8 }}>
          Domande FRIA
        </div>
        {FRIA_GUIDED_SECTIONS.map((sec) => (
          <div key={sec.key}>
            <div
              style={{ fontSize: 10, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.4px",
                padding: "6px 0 3px", cursor: "pointer" }}
              onClick={() => { setActiveSectionKey(sec.key); goToQuestion(sec.ids[0]); }}
            >
              {sec.key} — {sec.label}
            </div>
            {sec.ids.map((qid) => {
              const q = allQuestions.find((x) => x.id === qid);
              if (!q) return null;
              const isActive = q.id === currentQ.id;
              const isDone = Boolean(answers[qid]);
              return (
                <button
                  key={qid}
                  onClick={() => goToQuestion(qid)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    width: "100%", textAlign: "left", padding: "4px 8px",
                    borderRadius: 7, border: "none", cursor: "pointer",
                    background: isActive ? T.text : "none",
                    fontSize: 11, lineHeight: 1.35,
                    color: isActive ? "#fff" : isDone ? T.text : T.muted,
                    fontWeight: isActive ? 600 : isDone ? 500 : 400,
                  }}
                >
                  <span style={{
                    width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
                    background: isActive ? "rgba(255,255,255,0.25)" : isDone ? T.green : T.bg,
                    border: `1px solid ${isActive ? "transparent" : isDone ? T.green : T.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 8,
                  }}>
                    {isDone && !isActive ? "✓" : ""}
                  </span>
                  <span style={{ flex: 1 }}>{q.question.slice(0, 50)}{q.question.length > 50 ? "…" : ""}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── Right: current question ──────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Progress bar */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: T.muted }}>
              Domanda {currentIdx + 1} di {totalQ} · {answered} risposte
            </span>
            <span style={{ fontSize: 11, color: T.muted }}>
              Sezione {sectionForCurrent?.key} — {sectionForCurrent?.label}
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

        {/* Question card */}
        <div style={{ ...cardSt, padding: 24, flex: 1 }}>
          <GuidedQuestion
            q={currentQ}
            value={answers[currentQ.id] ?? ""}
            onChange={(v) => setAnswer(currentQ.id, v)}
          />
        </div>

        {/* Navigation */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={goPrev}
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
              onClick={goNext}
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
            style={{
              padding: "7px 14px", borderRadius: 8, fontSize: 11, fontWeight: 500,
              cursor: "pointer", background: T.bg, border: `1px solid ${T.border}`, color: T.muted,
            }}
          >
            Applica ora
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "7px 14px", borderRadius: 8, fontSize: 11, fontWeight: 500,
              cursor: "pointer", background: "none", border: `1px solid ${T.border}`, color: T.muted,
            }}
          >
            ✕ Chiudi
          </button>
        </div>

        {/* Info note */}
        <p style={{ fontSize: 11, color: T.faint, margin: 0, lineHeight: 1.5 }}>
          ✦ La modalità guidata pre-compila il form — il salvataggio richiede sempre il pulsante "Salva dossier".
          Puoi modificare manualmente qualsiasi campo dopo aver applicato le risposte.
        </p>
      </div>
    </div>
  );
}
