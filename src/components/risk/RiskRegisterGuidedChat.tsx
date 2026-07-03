"use client";
import React, { useState, useRef, useEffect } from "react";
import { Send, Check, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { RISK_REGISTER_SUBPOINTS } from "@/lib/risk/risk-register-guided-types";
import type { RiskRegisterGuidedDoc, RiskRegisterAnswer } from "@/lib/risk/risk-register-guided-types";
import { nextRRSubPointId } from "@/lib/risk/risk-register-guided-progress";

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
} as const;

function quickReplies(fieldType: string): string[] {
  if (fieldType === "select_ynp") return ["Sì", "No", "Parzialmente"];
  if (fieldType === "select_yn")  return ["Sì", "No"];
  return [];
}

function optionExamples(examples: string[], fieldType: string): Record<string, string> | null {
  const opts = fieldType === "select_ynp" ? ["Sì", "No", "Parzialmente"]
             : fieldType === "select_yn"  ? ["Sì", "No"]
             : null;
  if (!opts) return null;
  const result: Record<string, string> = {};
  for (const opt of opts) {
    const ex = examples.find(e => e.toLowerCase().startsWith(opt.toLowerCase()));
    if (ex) {
      result[opt] = ex.replace(new RegExp(`^${opt}\\s*[\\u2014\\-\\(][^)]*\\)?\\s*`, "i"), "");
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}

export interface RiskRegisterGuidedChatProps {
  doc: RiskRegisterGuidedDoc;
  onAnswerUpdate: (subPointId: string, answer: RiskRegisterAnswer) => void;
  onNavigateToSubPoint?: (subPointId: string) => void;
  forcedSubPointId?: string | null;
}

export function RiskRegisterGuidedChat({
  doc,
  onAnswerUpdate, onNavigateToSubPoint, forcedSubPointId,
}: RiskRegisterGuidedChatProps) {
  const allIds = RISK_REGISTER_SUBPOINTS.map(sp => sp.id);

  const currentId = forcedSubPointId
    ?? doc.currentSubPointId
    ?? nextRRSubPointId(doc)
    ?? allIds[0];

  const currentIdx = allIds.indexOf(currentId ?? "");
  const sp = RISK_REGISTER_SUBPOINTS.find(s => s.id === currentId);
  const existing = sp ? doc.answers[sp.id] : undefined;

  const [input, setInput]               = useState(existing?.value ?? "");
  const [hoveredHistId, setHoveredHistId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInput(existing?.value ?? "");
  }, [currentId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentId]);

  const handleSend = (valueOverride?: string) => {
    const val = (valueOverride ?? input).trim();
    if (!val || !sp) return;
    const answer: RiskRegisterAnswer = {
      value: val,
      source: "manual",
      aiConfirmed: true,
      status: "done",
      updatedAt: new Date().toISOString(),
    };
    onAnswerUpdate(sp.id, answer);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handlePrev = () => { if (currentIdx > 0) onNavigateToSubPoint?.(allIds[currentIdx - 1]); };
  const handleNext = () => { if (currentIdx < allIds.length - 1) onNavigateToSubPoint?.(allIds[currentIdx + 1]); };

  const history = RISK_REGISTER_SUBPOINTS
    .filter(s => s.id !== currentId && doc.answers[s.id]?.status === "done")
    .slice(-6);

  if (!sp) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: T.muted }}>
        <p style={{ fontSize: 12 }}>Registro completato — tutte le sezioni compilate.</p>
        <p style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>Chiudi il pannello per finalizzare il documento.</p>
      </div>
    );
  }

  const isDone = existing?.status === "done";
  const qr = quickReplies(sp.fieldType);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: T.bg }}>

      {/* Header */}
      <div style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}`, background: T.card, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.green }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>Risk Register Guidato</span>
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
          const isHovered = hoveredHistId === s.id;
          return (
            <React.Fragment key={s.id}>
              <div style={{ display: "flex" }}>
                <div style={{
                  maxWidth: "82%", background: T.card,
                  border: `1px solid ${T.border}`, borderRadius: "12px 12px 12px 3px",
                  padding: "7px 11px", fontSize: 11, color: T.muted,
                }}>
                  <span style={{ fontWeight: 600, color: T.text }}>{s.label}</span>
                </div>
              </div>
              <div
                style={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-end", gap: 6 }}
                onMouseEnter={() => setHoveredHistId(s.id)}
                onMouseLeave={() => setHoveredHistId(null)}
              >
                {isHovered && (
                  <button
                    onClick={() => onNavigateToSubPoint?.(s.id)}
                    title="Modifica risposta"
                    style={{
                      display: "flex", alignItems: "center", gap: 4,
                      fontSize: 9, fontWeight: 600, padding: "3px 8px", borderRadius: 6,
                      border: `1px solid ${T.border}`, background: T.card,
                      color: T.muted, cursor: "pointer",
                    }}
                  >
                    <Pencil size={9} /> Modifica
                  </button>
                )}
                <div style={{
                  maxWidth: "82%", background: T.text,
                  borderRadius: "12px 12px 3px 12px",
                  padding: "7px 11px", fontSize: 11, color: "#ffffff", lineHeight: 1.45,
                }}>
                  {(a?.value.length ?? 0) > 90 ? a?.value.slice(0, 87) + "…" : a?.value}
                </div>
              </div>
            </React.Fragment>
          );
        })}

        {/* Domanda corrente */}
        <div style={{ display: "flex" }}>
          <div style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: "12px 12px 12px 3px", padding: "10px 14px", maxWidth: "90%",
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: T.green, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {sp.ref}
            </div>
            <p style={{ fontSize: 13, fontWeight: 500, color: T.text, margin: 0, lineHeight: 1.5 }}>
              {sp.question}
            </p>

            {/* Esempi per opzioni booleane */}
            {!isDone && qr.length > 0 && (() => {
              const opEx = optionExamples(sp.examples, sp.fieldType);
              if (!opEx) return null;
              return (
                <div style={{
                  marginTop: 10, padding: "9px 11px",
                  background: "rgba(0,0,0,0.025)", borderRadius: 8,
                  border: "1px solid rgba(0,0,0,0.06)",
                  display: "flex", flexDirection: "column", gap: 5,
                }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Esempi
                  </span>
                  {qr.map(opt => {
                    const ex = opEx[opt];
                    if (!ex) return null;
                    return (
                      <div key={opt} style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
                        <span style={{ fontSize: 9.5, fontWeight: 700, color: T.text, flexShrink: 0, minWidth: 70, paddingTop: 1 }}>
                          {opt}:
                        </span>
                        <span style={{ fontSize: 10.5, color: T.muted, lineHeight: 1.45, fontStyle: "italic" }}>
                          {ex.length > 110 ? ex.slice(0, 107) + "…" : ex}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Quick replies Sì/No/Parzialmente */}
            {!isDone && qr.length > 0 && (
              <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {qr.map(opt => (
                  <button
                    key={opt}
                    onClick={() => handleSend(opt)}
                    style={{
                      padding: "5px 14px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                      border: `1px solid ${T.border}`, background: T.card,
                      color: T.text, cursor: "pointer",
                      transition: "background 0.12s, border-color 0.12s",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = T.text;
                      e.currentTarget.style.color = "#fff";
                      e.currentTarget.style.borderColor = T.text;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = T.card;
                      e.currentTarget.style.color = T.text;
                      e.currentTarget.style.borderColor = T.border;
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {/* Esempi chip per testo libero */}
            {!isDone && qr.length === 0 && sp.examples.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 5 }}>
                <span style={{ fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>Esempi:</span>
                {sp.examples.slice(0, 2).map((ex, i) => (
                  <button
                    key={i} onClick={() => setInput(ex)}
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

        {/* Risposta confermata */}
        {isDone && (
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-end", gap: 6 }}>
            <div style={{
              maxWidth: "85%", background: T.text,
              borderRadius: "12px 12px 3px 12px",
              padding: "10px 14px", fontSize: 12, color: "#ffffff", lineHeight: 1.5, whiteSpace: "pre-wrap",
            }}>
              {existing!.value}
              <div style={{ marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
                <Check size={10} style={{ color: "rgba(255,255,255,0.55)" }} />
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.55)" }}>Confermata</span>
              </div>
            </div>
          </div>
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
            placeholder={isDone ? "Riscrivi per modificare la risposta…" : "Scrivi qui la tua risposta… (Invio per inviare)"}
            rows={2}
            style={{
              flex: 1, resize: "none", border: `1px solid ${T.border}`, borderRadius: 10,
              padding: "8px 12px", fontSize: 12, color: T.text, background: T.bg,
              outline: "none", lineHeight: 1.5, fontFamily: "inherit",
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim()}
            style={{
              width: 36, height: 36, borderRadius: 10, border: "none",
              background: input.trim() ? T.text : "rgba(0,0,0,0.08)",
              color: input.trim() ? "#fff" : "rgba(0,0,0,0.28)",
              cursor: input.trim() ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, transition: "background 0.15s",
            }}
          >
            <Send size={14} />
          </button>
        </div>

        {/* Navigazione */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
          <button
            onClick={handlePrev}
            disabled={currentIdx === 0}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              fontSize: 10, color: currentIdx === 0 ? T.faint : T.muted,
              background: "none", border: "none", cursor: currentIdx === 0 ? "default" : "pointer",
              padding: "3px 6px", borderRadius: 5,
            }}
          >
            <ChevronLeft size={12} /> Precedente
          </button>
          <span style={{ fontSize: 9, color: T.faint }}>
            {!sp.required && <span style={{ color: T.muted }}>facoltativo · </span>}
            {sp.label}
          </span>
          <button
            onClick={handleNext}
            disabled={currentIdx === allIds.length - 1}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              fontSize: 10, color: currentIdx === allIds.length - 1 ? T.faint : T.muted,
              background: "none", border: "none", cursor: currentIdx === allIds.length - 1 ? "default" : "pointer",
              padding: "3px 6px", borderRadius: 5,
            }}
          >
            Successiva <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
