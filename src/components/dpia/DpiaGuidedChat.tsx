"use client";
// Chat guidata DPIA — pannello destro.
// - Pone UNA domanda alla volta nell'ordine deterministico di DPIA_SUBPOINTS.
// - L'AI propone una bozza da examples[] + ghost data con badge ✦.
// - L'utente Conferma (aiConfirmed: true, status: "done") o Modifica (status: "draft").
// - Nessun salvataggio automatico: tutto passa per azioni esplicite dell'utente.
import React, { useState, useRef, useEffect } from "react";
import { FileText, ChevronRight, ChevronLeft, Check, RotateCcw, Sparkles } from "lucide-react";
import { DPIA_SUBPOINTS } from "@/lib/dpia/dpia-template";
import type { DpiaGuidedDoc, DpiaAnswer } from "@/lib/dpia/dpia-guided-types";
import { emptyAnswer } from "@/lib/dpia/dpia-guided-types";
import { nextSubPointId } from "@/lib/dpia/dpia-guided-progress";
import { draftDpiaSubPointAnswer } from "@/app/actions/draftDpiaSubPointAnswer";
import type { ClassifierResult, DataAuditResult } from "@/lib/dossier/storage-schema";

// ─── Token ────────────────────────────────────────────────────────────────────
const T = {
  text:     "#0D1016",
  muted:    "rgba(0,0,0,0.42)",
  faint:    "rgba(0,0,0,0.22)",
  border:   "rgba(0,0,0,0.08)",
  card:     "#ffffff",
  bg:       "#f8f8f7",
  green:    "#23403a",
  greenBg:  "rgba(35,64,58,0.08)",
  greenBdr: "rgba(35,64,58,0.20)",
  amber:    "#b45309",
  amberBg:  "rgba(180,83,9,0.06)",
  amberBdr: "rgba(180,83,9,0.20)",
} as const;

const AI_BADGE = "✦ AI — verifica e conferma";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface DpiaGuidedChatProps {
  doc: DpiaGuidedDoc;
  ghostClassifier?: ClassifierResult | null;
  ghostDataAudit?: DataAuditResult | null;
  onAnswerUpdate: (subPointId: string, answer: DpiaAnswer) => void;
  onNavigateToSubPoint?: (subPointId: string) => void;
  forcedSubPointId?: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DpiaGuidedChat({
  doc, ghostClassifier, ghostDataAudit,
  onAnswerUpdate, onNavigateToSubPoint, forcedSubPointId,
}: DpiaGuidedChatProps) {
  const allIds = DPIA_SUBPOINTS.map(sp => sp.id);

  const currentId = forcedSubPointId
    ?? doc.currentSubPointId
    ?? nextSubPointId(doc)
    ?? allIds[0];

  const currentIdx = allIds.indexOf(currentId ?? "");
  const sp = DPIA_SUBPOINTS.find(s => s.id === currentId);

  const existing = sp ? doc.answers[sp.id] : undefined;

  const [editValue, setEditValue]     = useState<string>(existing?.value ?? "");
  const [aiDraft, setAiDraft]         = useState<string | null>(null);
  const [aiLoading, setAiLoading]     = useState(false);
  const [aiError, setAiError]         = useState<string | null>(null);
  const [mode, setMode]               = useState<"view" | "edit">("view");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset lokale ogni volta che cambia il sotto-punto corrente
  useEffect(() => {
    const ans = sp ? doc.answers[sp.id] : undefined;
    setEditValue(ans?.value ?? "");
    setAiDraft(null);
    setAiError(null);
    setMode("view");
  }, [currentId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!sp) {
    return (
      <div style={{ padding: 20, textAlign: "center", color: T.muted }}>
        <FileText style={{ width: 32, height: 32, margin: "0 auto 8px", opacity: 0.3 }} />
        <p style={{ fontSize: 12 }}>DPIA completata. Tutte le sezioni sono state compilate.</p>
      </div>
    );
  }

  const isDone = existing?.status === "done";
  const isDraft = existing?.status === "draft";

  // ── Richiedi bozza AI ─────────────────────────────────────────────────────
  const handleRequestAI = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiDraft(null);

    const previousAnswers: Record<string, string> = {};
    DPIA_SUBPOINTS.forEach(s => {
      const a = doc.answers[s.id];
      if (a?.status === "done") previousAnswers[s.id] = a.value;
    });

    const result = await draftDpiaSubPointAnswer({
      subPointId: sp.id,
      ghostClassifier,
      ghostDataAudit,
      previousAnswers,
    });

    setAiLoading(false);
    if ("error" in result) {
      setAiError(result.error);
    } else {
      setAiDraft(result.draft);
    }
  };

  // ── Conferma risposta (dalla textarea o da bozza AI accettata) ────────────
  const handleConfirm = (value: string, fromAI: boolean) => {
    if (!value.trim()) return;
    const answer: DpiaAnswer = {
      value: value.trim(),
      source: fromAI ? "ai_suggested" : "manual",
      aiConfirmed: true,
      status: "done",
      updatedAt: new Date().toISOString(),
    };
    onAnswerUpdate(sp.id, answer);
    setAiDraft(null);
    setMode("view");
  };

  // ── Salva come bozza ─────────────────────────────────────────────────────
  const handleSaveDraft = () => {
    const value = editValue.trim();
    if (!value) return;
    const answer: DpiaAnswer = {
      value, source: "manual", aiConfirmed: false,
      status: "draft", updatedAt: new Date().toISOString(),
    };
    onAnswerUpdate(sp.id, answer);
    setMode("view");
  };

  // ── Salta sotto-punto ─────────────────────────────────────────────────────
  const handleSkip = () => {
    if (currentIdx < allIds.length - 1) {
      const nextId = allIds[currentIdx + 1];
      if (onNavigateToSubPoint) onNavigateToSubPoint(nextId);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      const prevId = allIds[currentIdx - 1];
      if (onNavigateToSubPoint) onNavigateToSubPoint(prevId);
    }
  };

  const sectionLabel = DPIA_SUBPOINTS.find(s => s.id === sp.id)
    ? (DPIA_SUBPOINTS.findIndex(s => s.sectionKey !== sp.sectionKey) >= 0 ? "" : "")
    : "";

  const sectionObj = DPIA_SUBPOINTS.reduce<Record<string, string>>((acc, s) => {
    if (!acc[s.sectionKey]) acc[s.sectionKey] = s.sectionKey;
    return acc;
  }, {});

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: T.bg }}>
      {/* ── Header chat ── */}
      <div style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}`, background: T.card, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: T.text, margin: 0 }}>Chat guidata DPIA</p>
          <span style={{ fontSize: 9, color: T.muted }}>
            {currentIdx + 1} / {allIds.length} sotto-punti
          </span>
        </div>
        {/* Barra avanzamento globale dei sotto-punti */}
        <div style={{ height: 3, background: "rgba(0,0,0,0.06)", borderRadius: 2, overflow: "hidden", marginTop: 4 }}>
          <div style={{
            height: "100%",
            width: `${Math.round(((currentIdx + 1) / allIds.length) * 100)}%`,
            background: T.green, borderRadius: 2, transition: "width 0.3s",
          }} />
        </div>
      </div>

      {/* ── Corpo chat ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>

        {/* Rif. normativo */}
        <div style={{ fontSize: 9, color: T.faint, textAlign: "right" }}>{sp.ref}</div>

        {/* Domanda */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px" }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: T.muted, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {sp.label}
          </p>
          <p style={{ fontSize: 13, fontWeight: 500, color: T.text, margin: 0, lineHeight: 1.5 }}>
            {sp.question}
          </p>
        </div>

        {/* Risposta confermata — solo lettura */}
        {isDone && !mode.startsWith("edit") && (
          <div style={{
            background: T.greenBg, border: `1px solid ${T.greenBdr}`,
            borderRadius: 10, padding: "10px 14px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <Check style={{ width: 12, height: 12, color: T.green }} />
              <p style={{ fontSize: 9, fontWeight: 700, color: T.green, margin: 0, textTransform: "uppercase" }}>Confermata</p>
            </div>
            <p style={{ fontSize: 12, color: T.text, margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {existing!.value}
            </p>
            <button
              onClick={() => { setEditValue(existing?.value ?? ""); setMode("edit"); }}
              style={{ marginTop: 8, fontSize: 10, color: T.muted, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
            >
              Modifica
            </button>
          </div>
        )}

        {/* Bozza AI proposta */}
        {aiDraft && !isDone && (
          <div style={{
            background: T.amberBg, border: `1px solid ${T.amberBdr}`,
            borderRadius: 10, padding: "10px 14px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <Sparkles style={{ width: 12, height: 12, color: T.amber }} />
              <p style={{ fontSize: 9, fontWeight: 700, color: T.amber, margin: 0 }}>{AI_BADGE}</p>
            </div>
            <p style={{ fontSize: 12, color: T.text, margin: "0 0 10px", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {aiDraft}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => handleConfirm(aiDraft, true)}
                style={{
                  flex: 1, padding: "7px 0", borderRadius: 7, border: "none", cursor: "pointer",
                  background: T.green, color: "#fff", fontSize: 11, fontWeight: 700,
                }}
              >
                ✓ Conferma e usa
              </button>
              <button
                onClick={() => { setEditValue(aiDraft); setAiDraft(null); setMode("edit"); }}
                style={{
                  flex: 1, padding: "7px 0", borderRadius: 7,
                  border: `1px solid ${T.border}`, cursor: "pointer",
                  background: T.card, color: T.text, fontSize: 11,
                }}
              >
                Modifica
              </button>
              <button
                onClick={() => setAiDraft(null)}
                style={{
                  padding: "7px 10px", borderRadius: 7,
                  border: `1px solid ${T.border}`, cursor: "pointer",
                  background: "none", color: T.muted, fontSize: 11,
                }}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Errore AI */}
        {aiError && (
          <p style={{ fontSize: 10, color: "#b91c1c", padding: "6px 10px", background: "rgba(185,28,28,0.06)", borderRadius: 6, margin: 0 }}>
            {aiError}
          </p>
        )}

        {/* Esempi suggeriti */}
        {!isDone && !aiDraft && !mode.startsWith("edit") && (
          <div>
            <p style={{ fontSize: 9, color: T.muted, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
              Esempi di risposta
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {sp.examples.slice(0, 2).map((ex, i) => (
                <button
                  key={i}
                  onClick={() => { setEditValue(ex); setMode("edit"); }}
                  style={{
                    width: "100%", textAlign: "left", border: `1px solid ${T.border}`,
                    borderRadius: 7, padding: "8px 10px", cursor: "pointer",
                    background: T.card, color: T.text, fontSize: 10, lineHeight: 1.5,
                  }}
                >
                  {ex.length > 140 ? ex.slice(0, 137) + "…" : ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Area modifica */}
        {(mode === "edit" || (isDraft && !aiDraft)) && (
          <div>
            <textarea
              ref={textareaRef}
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              rows={5}
              placeholder="Scrivi la risposta qui…"
              style={{
                width: "100%", boxSizing: "border-box",
                border: `1px solid ${T.border}`, borderRadius: 8,
                padding: "10px 12px", fontSize: 12, color: T.text,
                fontFamily: "inherit", resize: "vertical", outline: "none",
                background: T.card,
              }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button
                onClick={() => handleConfirm(editValue, false)}
                disabled={!editValue.trim()}
                style={{
                  flex: 1, padding: "8px 0", borderRadius: 7, border: "none", cursor: "pointer",
                  background: editValue.trim() ? T.green : "rgba(0,0,0,0.08)",
                  color: editValue.trim() ? "#fff" : T.faint, fontSize: 12, fontWeight: 700,
                  transition: "background 0.15s",
                }}
              >
                ✓ Conferma
              </button>
              <button
                onClick={handleSaveDraft}
                disabled={!editValue.trim()}
                style={{
                  padding: "8px 14px", borderRadius: 7,
                  border: `1px solid ${T.border}`, cursor: "pointer",
                  background: T.card, color: T.text, fontSize: 12,
                }}
              >
                Bozza
              </button>
              <button
                onClick={() => { setEditValue(existing?.value ?? ""); setMode("view"); }}
                style={{
                  padding: "8px 10px", borderRadius: 7,
                  border: "none", background: "none", cursor: "pointer", color: T.muted,
                }}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Input libero se non in edit e non done */}
        {!isDone && !aiDraft && mode === "view" && (
          <button
            onClick={() => { setEditValue(""); setMode("edit"); setTimeout(() => textareaRef.current?.focus(), 50); }}
            style={{
              width: "100%", padding: "9px 0", borderRadius: 8,
              border: `1px dashed ${T.border}`, background: "none",
              cursor: "pointer", fontSize: 11, color: T.muted,
            }}
          >
            + Scrivi risposta personalizzata
          </button>
        )}
      </div>

      {/* ── Footer: navigazione + bottone AI ── */}
      <div style={{
        padding: "10px 14px", borderTop: `1px solid ${T.border}`,
        background: T.card, display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
      }}>
        {/* Prev */}
        <button
          onClick={handlePrev}
          disabled={currentIdx === 0}
          style={{
            padding: "6px 10px", borderRadius: 7, border: `1px solid ${T.border}`,
            background: "none", cursor: currentIdx === 0 ? "default" : "pointer",
            color: currentIdx === 0 ? T.faint : T.text, display: "flex", alignItems: "center",
          }}
        >
          <ChevronLeft style={{ width: 14, height: 14 }} />
        </button>

        {/* AI suggest */}
        <button
          onClick={handleRequestAI}
          disabled={aiLoading}
          style={{
            flex: 1, padding: "7px 0", borderRadius: 7,
            border: `1px solid ${T.amberBdr}`, background: T.amberBg,
            cursor: aiLoading ? "default" : "pointer",
            color: T.amber, fontSize: 11, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
          }}
        >
          {aiLoading ? (
            <RotateCcw style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />
          ) : (
            <Sparkles style={{ width: 12, height: 12 }} />
          )}
          {aiLoading ? "Elaborazione…" : "✦ Bozza AI"}
        </button>

        {/* Skip / Next */}
        <button
          onClick={isDone ? () => onNavigateToSubPoint?.(allIds[currentIdx + 1] ?? allIds[currentIdx]) : handleSkip}
          disabled={currentIdx === allIds.length - 1}
          style={{
            padding: "6px 10px", borderRadius: 7, border: `1px solid ${T.border}`,
            background: isDone ? T.green : "none",
            cursor: currentIdx === allIds.length - 1 ? "default" : "pointer",
            color: isDone ? "#fff" : currentIdx === allIds.length - 1 ? T.faint : T.text,
            display: "flex", alignItems: "center",
          }}
        >
          <ChevronRight style={{ width: 14, height: 14 }} />
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
