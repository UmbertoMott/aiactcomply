"use client";
import React, { useState, useRef, useEffect } from "react";
import { Send, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { DPIA_SUBPOINTS } from "@/lib/dpia/dpia-template";
import type { DpiaGuidedDoc, DpiaAnswer } from "@/lib/dpia/dpia-guided-types";
import { nextSubPointId } from "@/lib/dpia/dpia-guided-progress";
import { draftDpiaSubPointAnswer } from "@/app/actions/draftDpiaSubPointAnswer";
import type { ClassifierResult, DataAuditResult } from "@/lib/dossier/storage-schema";

const T = {
  text:     "#0D1016",
  muted:    "rgba(0,0,0,0.42)",
  faint:    "rgba(0,0,0,0.22)",
  border:   "rgba(0,0,0,0.08)",
  card:     "#ffffff",
  bg:       "#f5f5f4",
  green:    "#23403a",
  greenBg:  "rgba(35,64,58,0.08)",
  greenBdr: "rgba(35,64,58,0.20)",
  amber:    "#b45309",
  amberBg:  "rgba(180,83,9,0.06)",
  amberBdr: "rgba(180,83,9,0.20)",
} as const;

const AI_BADGE = "✦ AI — verifica e conferma";

export interface DpiaGuidedChatProps {
  doc: DpiaGuidedDoc;
  ghostClassifier?: ClassifierResult | null;
  ghostDataAudit?: DataAuditResult | null;
  onAnswerUpdate: (subPointId: string, answer: DpiaAnswer) => void;
  onNavigateToSubPoint?: (subPointId: string) => void;
  forcedSubPointId?: string | null;
}

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

  const [input, setInput]         = useState(existing?.value ?? "");
  const [aiDraft, setAiDraft]     = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError]     = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInput(existing?.value ?? "");
    setAiDraft(null);
    setAiError(null);
  }, [currentId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentId, aiDraft]);

  const handleRequestAI = async () => {
    if (!sp) return;
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
      setInput(result.draft);
    }
  };

  const handleSend = (valueOverride?: string) => {
    const val = (valueOverride ?? input).trim();
    if (!val || !sp) return;
    const answer: DpiaAnswer = {
      value: val,
      source: aiDraft && val === aiDraft.trim() ? "ai_suggested" : "manual",
      aiConfirmed: true,
      status: "done",
      updatedAt: new Date().toISOString(),
    };
    onAnswerUpdate(sp.id, answer);
    setAiDraft(null);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handlePrev = () => { if (currentIdx > 0) onNavigateToSubPoint?.(allIds[currentIdx - 1]); };
  const handleNext = () => { if (currentIdx < allIds.length - 1) onNavigateToSubPoint?.(allIds[currentIdx + 1]); };

  // Conversazione passata: ultime 6 risposte confermate (esclusa quella corrente)
  const history = DPIA_SUBPOINTS
    .filter(s => s.id !== currentId && doc.answers[s.id]?.status === "done")
    .slice(-6);

  if (!sp) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: T.muted }}>
        <p style={{ fontSize: 12 }}>DPIA completata — tutte le sezioni compilate.</p>
      </div>
    );
  }

  const isDone = existing?.status === "done";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: T.bg }}>

      {/* Header */}
      <div style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}`, background: T.card, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.green }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>DPIA Guidata AI</span>
          </div>
          <span style={{ fontSize: 10, color: T.muted, fontFamily: "monospace" }}>
            {currentIdx + 1} / {allIds.length}
          </span>
        </div>
        <div style={{ height: 3, background: "rgba(0,0,0,0.06)", borderRadius: 2, marginTop: 8 }}>
          <div style={{
            height: "100%",
            width: `${Math.round(((currentIdx + 1) / allIds.length) * 100)}%`,
            background: T.green, borderRadius: 2, transition: "width 0.3s",
          }} />
        </div>
      </div>

      {/* Messaggi */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>

        {/* Storico Q&A */}
        {history.map(s => {
          const a = doc.answers[s.id];
          return (
            <React.Fragment key={s.id}>
              {/* Domanda (sistema, sinistra) */}
              <div style={{ display: "flex" }}>
                <div style={{
                  maxWidth: "82%",
                  background: T.card,
                  border: `1px solid ${T.border}`,
                  borderRadius: "12px 12px 12px 3px",
                  padding: "7px 11px",
                  fontSize: 11, color: T.muted,
                }}>
                  <span style={{ fontWeight: 600, color: T.text }}>{s.label}</span>
                </div>
              </div>
              {/* Risposta (utente, destra) */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{
                  maxWidth: "82%",
                  background: T.text,
                  borderRadius: "12px 12px 3px 12px",
                  padding: "7px 11px",
                  fontSize: 11, color: "#ffffff", lineHeight: 1.45,
                }}>
                  {(a?.value.length ?? 0) > 90 ? a?.value.slice(0, 87) + "…" : a?.value}
                </div>
              </div>
            </React.Fragment>
          );
        })}

        {/* Domanda corrente (sistema, sinistra) */}
        <div style={{ display: "flex" }}>
          <div style={{
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: "12px 12px 12px 3px",
            padding: "10px 14px",
            maxWidth: "90%",
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: T.green, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {sp.ref}
            </div>
            <p style={{ fontSize: 13, fontWeight: 500, color: T.text, margin: 0, lineHeight: 1.5 }}>
              {sp.question}
            </p>
            {/* Esempi come chip cliccabili */}
            {!isDone && sp.examples.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 5 }}>
                <span style={{ fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>Esempi:</span>
                {sp.examples.slice(0, 2).map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(ex)}
                    style={{
                      textAlign: "left", border: `1px solid ${T.border}`,
                      borderRadius: 7, padding: "6px 9px",
                      background: "rgba(0,0,0,0.02)", color: T.text,
                      fontSize: 10.5, lineHeight: 1.4, cursor: "pointer",
                    }}
                  >
                    {ex.length > 110 ? ex.slice(0, 107) + "…" : ex}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Risposta confermata (utente, destra) */}
        {isDone && (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div style={{
              maxWidth: "85%",
              background: T.text,
              borderRadius: "12px 12px 3px 12px",
              padding: "10px 14px",
              fontSize: 12, color: "#ffffff", lineHeight: 1.5, whiteSpace: "pre-wrap",
            }}>
              {existing!.value}
              <div style={{ marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
                <Check size={10} style={{ color: "rgba(255,255,255,0.55)" }} />
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.55)" }}>Confermata</span>
              </div>
            </div>
          </div>
        )}

        {/* Bozza AI (sistema, sinistra) */}
        {aiDraft && (
          <div style={{ display: "flex" }}>
            <div style={{
              maxWidth: "92%",
              background: T.amberBg,
              border: `1px solid ${T.amberBdr}`,
              borderRadius: "12px 12px 12px 3px",
              padding: "10px 14px",
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: T.amber, marginBottom: 6 }}>{AI_BADGE}</div>
              <p style={{ fontSize: 12, color: T.text, margin: "0 0 10px", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                {aiDraft}
              </p>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => handleSend(aiDraft)}
                  style={{
                    flex: 1, padding: "6px 0", borderRadius: 7, border: "none",
                    background: T.green, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  ✓ Usa
                </button>
                <button
                  onClick={() => { setAiDraft(null); }}
                  style={{
                    padding: "6px 10px", borderRadius: 7,
                    border: `1px solid ${T.border}`, background: "none",
                    color: T.muted, fontSize: 11, cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}

        {aiError && (
          <p style={{
            fontSize: 10, color: "#b91c1c", margin: 0,
            padding: "6px 10px", background: "rgba(185,28,28,0.06)", borderRadius: 6,
          }}>
            {aiError}
          </p>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input fisso in basso */}
      <div style={{ padding: "10px 14px", borderTop: `1px solid ${T.border}`, background: T.card, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isDone ? "Modifica risposta…" : `Rispondi: ${sp.label}…`}
            rows={2}
            style={{
              flex: 1, fontSize: 12.5, padding: "10px 13px",
              borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)",
              color: T.text, resize: "none", outline: "none",
              fontFamily: "inherit", background: "#ffffff", lineHeight: 1.5,
            }}
            onFocus={e => (e.target.style.borderColor = "rgba(35,64,58,0.4)")}
            onBlur={e => (e.target.style.borderColor = "rgba(0,0,0,0.12)")}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim()}
            style={{
              flexShrink: 0, width: 38, height: 38,
              background: input.trim() ? T.green : "rgba(0,0,0,0.06)",
              color: input.trim() ? "#fff" : T.faint,
              border: "none", borderRadius: 10,
              cursor: input.trim() ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.15s",
            }}
          >
            <Send size={15} />
          </button>
        </div>

        {/* Controlli footer */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
          <button
            onClick={handlePrev}
            disabled={currentIdx === 0}
            style={{
              padding: "5px 8px", borderRadius: 7, border: `1px solid ${T.border}`,
              background: "none", cursor: currentIdx === 0 ? "default" : "pointer",
              color: currentIdx === 0 ? T.faint : T.muted,
              display: "flex", alignItems: "center",
            }}
          >
            <ChevronLeft size={13} />
          </button>
          <div style={{ flex: 1 }} />
          <button
            onClick={handleNext}
            disabled={currentIdx === allIds.length - 1}
            style={{
              padding: "5px 8px", borderRadius: 7, border: `1px solid ${T.border}`,
              background: "none",
              cursor: currentIdx === allIds.length - 1 ? "default" : "pointer",
              color: currentIdx === allIds.length - 1 ? T.faint : T.muted,
              display: "flex", alignItems: "center",
            }}
          >
            <ChevronRight size={13} />
          </button>
        </div>
        <p style={{ fontSize: 9, color: T.faint, marginTop: 5, textAlign: "center", marginBottom: 0 }}>
          Enter per inviare · Shift+Enter per andare a capo
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
