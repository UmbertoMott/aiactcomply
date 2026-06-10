"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Shield, CheckCircle, Clock, Send, Download, RotateCcw, ChevronRight, AlertTriangle, Loader2 } from "lucide-react";
import { riskManagerChat, type ChatMessage, type RiskDocumentation, type RiskPhaseId } from "@/app/actions/riskManagerChat";
import { writeToStorage, readFromStorage } from "@/lib/dossier/storage-schema";
import type { RiskManagerResult, ClassifierResult } from "@/lib/dossier/storage-schema";
import AIOutputLabel from "@/components/disclosure/AIOutputLabel";
import { SystemContextBanner } from "@/components/compliance/SystemContextBanner";

// ─── Phase definitions ────────────────────────────────────────────────────────

interface Phase { id: RiskPhaseId; label: string; subtitle: string; article: string }

const PHASES: Phase[] = [
  { id: "scoping",        label: "1. Scoping",                subtitle: "Ambito e contesto",        article: "Art. 9" },
  { id: "identification", label: "2. Identificazione Rischi", subtitle: "Catalogo rischi AI Act",   article: "Art. 9(2)" },
  { id: "montecarlo",     label: "3. Simulazione Monte Carlo",subtitle: "Analisi quantitativa",     article: "ENISA Guidelines" },
  { id: "bitemporal",     label: "4. Audit Bitemporale",      subtitle: "Versionamento e storico",  article: "Art. 12, 17" },
  { id: "drift",          label: "5. Drift Detection",        subtitle: "Monitoraggio deriva",      article: "Art. 72" },
  { id: "gpai",           label: "6. GPAI & Rischio Sistemico",subtitle: "Modelli uso generale",   article: "Art. 51-55" },
  { id: "governance",     label: "7. Governance & Sanzioni",  subtitle: "Misure e responsabilità", article: "Art. 9, 99-100" },
  { id: "final",          label: "8. Finalizzazione",         subtitle: "Risk Register completo",  article: "Art. 9(9)" },
];

type PhaseStatus = "pending" | "active" | "complete";

// ─── Persistence ──────────────────────────────────────────────────────────────

const CHAT_STORAGE_KEY = "aicomply_risk_manager_chat_v2";

interface PersistedChatState {
  messages: ChatMessage[];
  documentation: RiskDocumentation;
  currentPhaseIndex: number;
  completedPhases: RiskPhaseId[];
}

function loadChatState(): PersistedChatState | null {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedChatState) : null;
  } catch { return null; }
}

function saveChatState(s: PersistedChatState) {
  try { localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

// ─── Phase row (left panel) ───────────────────────────────────────────────────

function PhaseRow({
  phase, status, isExpanded, onToggle, documentation,
}: {
  phase: Phase; status: PhaseStatus; isExpanded: boolean;
  onToggle: () => void; documentation: RiskDocumentation;
}) {
  const data = documentation[phase.id as keyof RiskDocumentation];
  const hasData = data && Object.keys(data).length > 0;

  const borderColor = status === "active"
    ? "rgba(59,130,246,0.25)"
    : status === "complete"
    ? "rgba(22,163,74,0.2)"
    : "rgba(0,0,0,0.07)";

  const bg = status === "active"
    ? "rgba(59,130,246,0.04)"
    : status === "complete"
    ? "rgba(22,163,74,0.04)"
    : "transparent";

  return (
    <div style={{ border: `1px solid ${borderColor}`, background: bg, borderRadius: 8, overflow: "hidden", marginBottom: 4 }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2.5 text-left transition-colors"
        style={{ padding: "8px 10px", cursor: "pointer", background: "transparent" }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.02)")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      >
        <div style={{ flexShrink: 0 }}>
          {status === "complete" ? (
            <CheckCircle size={14} style={{ color: "#16a34a" }} />
          ) : status === "active" ? (
            <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid #2563eb" }} />
          ) : (
            <Clock size={14} style={{ color: "rgba(0,0,0,0.2)" }} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: status === "active" ? "#1d4ed8" : status === "complete" ? "#15803d" : "rgba(0,0,0,0.4)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {phase.label}
          </div>
          <div style={{ fontSize: 10, color: "rgba(0,0,0,0.3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {phase.subtitle}
          </div>
        </div>
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 9, color: "rgba(0,0,0,0.25)", fontFamily: "monospace" }}>{phase.article}</span>
          {hasData && (
            <ChevronRight size={11} style={{ color: "rgba(0,0,0,0.25)", transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
          )}
        </div>
      </button>

      {isExpanded && hasData && (
        <div style={{ padding: "8px 10px 10px", borderTop: "1px solid rgba(0,0,0,0.05)" }}>
          <AIOutputLabel documentType="Estrazione automatica" />
          <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 3 }}>
            {Object.entries(data as Record<string, unknown>).map(([k, v]) => {
              if (v === undefined || v === null) return null;
              const displayVal = Array.isArray(v) ? (v as string[]).join(", ") : typeof v === "boolean" ? (v ? "Sì" : "No") : String(v);
              return (
                <div key={k} style={{ display: "flex", gap: 6, fontSize: 10 }}>
                  <span style={{ color: "rgba(0,0,0,0.35)", flexShrink: 0, textTransform: "capitalize" }}>
                    {k.replace(/([A-Z])/g, " $1").toLowerCase()}:
                  </span>
                  <span style={{ color: "#92400e", wordBreak: "break-word" }}>{displayVal}</span>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: 9, color: "rgba(0,0,0,0.2)", marginTop: 6, fontStyle: "italic" }}>
            [verify against current AI Act text]
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Chat bubble ──────────────────────────────────────────────────────────────

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 10 }}>
      <div style={{
        maxWidth: "82%",
        borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
        padding: "10px 14px",
        fontSize: 13,
        lineHeight: 1.55,
        background: isUser ? "#0D1016" : "#f5f5f4",
        color: isUser ? "#ffffff" : "#0D1016",
        border: isUser ? "none" : "1px solid rgba(0,0,0,0.07)",
      }}>
        {!isUser && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
            <Shield size={10} style={{ color: "#2563eb" }} />
            <span style={{ fontSize: 9, color: "#2563eb", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Risk Manager AI
            </span>
          </div>
        )}
        <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{message.content}</p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RiskManagerPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [documentation, setDocumentation] = useState<RiskDocumentation>({});
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [completedPhases, setCompletedPhases] = useState<RiskPhaseId[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedPhase, setExpandedPhase] = useState<RiskPhaseId | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const classifierData = readFromStorage<ClassifierResult>("classifier");
  const systemContext = {
    systemName: classifierData?.systemName,
    riskLevel: classifierData?.riskLevel,
    isGPAI: classifierData?.isGPAI,
  };

  useEffect(() => {
    const saved = loadChatState();
    if (saved) {
      setMessages(saved.messages);
      setDocumentation(saved.documentation);
      setCurrentPhaseIndex(saved.currentPhaseIndex);
      setCompletedPhases(saved.completedPhases);
    } else {
      setMessages([{
        role: "assistant",
        content: `Benvenuto nel Risk Manager AI Act di AIComply.\n\nTi guiderò attraverso 8 fasi per costruire un Risk Register completo ai sensi dell'Art. 9 Reg. UE 2024/1689.\n\nCominciamo con lo Scoping: indica il nome del sistema AI e il contesto in cui viene utilizzato (es. settore, uso previsto, categorie di utenti coinvolti).`,
      }]);
    }
    setHydrated(true);
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => { if (hydrated) setExpandedPhase(PHASES[currentPhaseIndex]?.id ?? null); }, [currentPhaseIndex, hydrated]);

  const persistState = useCallback((msgs: ChatMessage[], doc: RiskDocumentation, phaseIdx: number, completed: RiskPhaseId[]) => {
    saveChatState({ messages: msgs, documentation: doc, currentPhaseIndex: phaseIdx, completedPhases: completed });
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    const currentPhase = PHASES[currentPhaseIndex];
    const result = await riskManagerChat(newMessages, currentPhase.id, documentation, systemContext);

    if (result.error) {
      const updated = [...newMessages, { role: "assistant" as const, content: result.error }];
      setMessages(updated);
      persistState(updated, documentation, currentPhaseIndex, completedPhases);
      setIsLoading(false);
      return;
    }

    const assistantMsg: ChatMessage = { role: "assistant", content: result.reply ?? "" };
    const updatedMessages = [...newMessages, assistantMsg];
    let newDoc = documentation;
    let newPhaseIndex = currentPhaseIndex;
    let newCompleted = completedPhases;

    if (result.patch) {
      newDoc = { ...documentation, ...result.patch };
      setDocumentation(newDoc);
      setExpandedPhase(currentPhase.id);
    }

    if (result.stepComplete && currentPhaseIndex < PHASES.length - 1) {
      newCompleted = [...completedPhases, currentPhase.id];
      setCompletedPhases(newCompleted);
      newPhaseIndex = currentPhaseIndex + 1;
      setCurrentPhaseIndex(newPhaseIndex);
      const nextPhase = PHASES[newPhaseIndex];
      updatedMessages.push({
        role: "assistant",
        content: `✓ Fase "${currentPhase.label}" completata e documentata.\n\nProcediamo con la fase "${nextPhase.label}" (${nextPhase.article}).`,
      });
    } else if (result.stepComplete && currentPhaseIndex === PHASES.length - 1) {
      newCompleted = [...completedPhases, currentPhase.id];
      setCompletedPhases(newCompleted);
      writeToStorage<RiskManagerResult>("riskManager", {
        risks: [],
        overallRiskLevel: newDoc.final?.overallRisk === "alto" ? "high" : newDoc.final?.overallRisk === "critico" ? "critical" : "medium",
        completedAt: new Date().toISOString(),
        nextReviewDate: newDoc.final?.nextReviewDate,
      });
    }

    setMessages(updatedMessages);
    persistState(updatedMessages, newDoc, newPhaseIndex, newCompleted);
    setIsLoading(false);
  }, [input, isLoading, messages, currentPhaseIndex, documentation, completedPhases, systemContext, persistState]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const resetChat = () => {
    localStorage.removeItem(CHAT_STORAGE_KEY);
    setMessages([{
      role: "assistant",
      content: `Benvenuto nel Risk Manager AI Act di AIComply.\n\nTi guiderò attraverso 8 fasi per costruire un Risk Register completo ai sensi dell'Art. 9 Reg. UE 2024/1689.\n\nCominciamo con lo Scoping: indica il nome del sistema AI e il contesto in cui viene utilizzato.`,
    }]);
    setDocumentation({});
    setCurrentPhaseIndex(0);
    setCompletedPhases([]);
    setInput("");
  };

  const exportDocumentation = () => {
    const lines = ["# Risk Register — AI Act Art. 9", ""];
    PHASES.forEach(p => {
      const data = documentation[p.id as keyof RiskDocumentation];
      lines.push(`## ${p.label} (${p.article})`);
      if (data && Object.keys(data).length > 0) {
        Object.entries(data as Record<string, unknown>).forEach(([k, v]) => {
          lines.push(`- **${k}**: ${Array.isArray(v) ? (v as string[]).join(", ") : String(v ?? "")}`);
        });
      } else { lines.push("_Non completata_"); }
      lines.push("");
    });
    lines.push("---\n_Generato da AIComply · [verify against current AI Act text]_");
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `RiskRegister_${systemContext.systemName ?? "sistema"}_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!hydrated) return null;

  const progressPct = Math.round((completedPhases.length / PHASES.length) * 100);

  return (
    <div style={{ fontFamily: "var(--font-inter, system-ui)", background: "#ffffff", height: "calc(100vh - 4rem)", display: "flex", flexDirection: "column" }}>
      <SystemContextBanner />

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ padding: "0 0 16px 0" }}>
        <AIOutputLabel documentType="Risk Manager · Art. 9 AI Act" />
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginTop: 12 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(0,0,0,0.3)", letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: 4 }}>
              Art. 9 · Reg. UE 2024/1689
            </p>
            <h1 style={{ fontSize: 24, fontWeight: 500, color: "#0D1016", letterSpacing: "-0.8px", margin: 0 }}>
              Risk Manager
            </h1>
            <p style={{ fontSize: 12, color: "rgba(0,0,0,0.4)", marginTop: 4 }}>
              Framework guidato AI per il sistema di gestione dei rischi — Monte Carlo, audit bitemporale, drift detection, GPAI.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {completedPhases.length > 0 && (
              <button
                onClick={exportDocumentation}
                style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 500, padding: "6px 12px", borderRadius: 20, background: "rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.6)", border: "none", cursor: "pointer" }}
              >
                <Download size={12} /> Esporta
              </button>
            )}
            <button
              onClick={resetChat}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, padding: "6px 12px", borderRadius: 20, background: "rgba(0,0,0,0.04)", color: "rgba(0,0,0,0.4)", border: "1px solid rgba(0,0,0,0.07)", cursor: "pointer" }}
            >
              <RotateCcw size={12} /> Reset
            </button>
          </div>
        </div>
      </div>

      {/* ── Split layout ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, gap: 16, overflow: "hidden" }}>

        {/* LEFT — progress panel */}
        <div style={{ width: 256, flexShrink: 0, display: "flex", flexDirection: "column", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, overflow: "hidden", background: "#fafafa" }}>
          {/* Progress header */}
          <div style={{ padding: "12px 12px 10px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Stato Avanzamento
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#0D1016", fontFamily: "monospace" }}>
                {completedPhases.length}/{PHASES.length}
              </span>
            </div>
            <div style={{ width: "100%", height: 4, background: "rgba(0,0,0,0.07)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progressPct}%`, background: "linear-gradient(to right, #2563eb, #16a34a)", borderRadius: 2, transition: "width 0.5s ease" }} />
            </div>
          </div>

          {/* Phase list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px" }}>
            {PHASES.map((phase, idx) => {
              const status: PhaseStatus = completedPhases.includes(phase.id) ? "complete" : idx === currentPhaseIndex ? "active" : "pending";
              return (
                <PhaseRow
                  key={phase.id}
                  phase={phase}
                  status={status}
                  isExpanded={expandedPhase === phase.id}
                  onToggle={() => setExpandedPhase(expandedPhase === phase.id ? null : phase.id)}
                  documentation={documentation}
                />
              );
            })}
          </div>

          {/* Warning footer */}
          <div style={{ padding: "8px 12px", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 9, color: "rgba(0,0,0,0.35)" }}>
              <AlertTriangle size={10} style={{ flexShrink: 0, marginTop: 1, color: "#b45309" }} />
              <span>I campi estratti dall&apos;AI richiedono verifica legale professionale.</span>
            </div>
          </div>
        </div>

        {/* RIGHT — chat panel */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, overflow: "hidden", minWidth: 0 }}>
          {/* Phase indicator */}
          <div style={{ padding: "8px 16px", borderBottom: "1px solid rgba(0,0,0,0.07)", background: "rgba(37,99,235,0.04)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#2563eb" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#1d4ed8" }}>
              Fase corrente: {PHASES[currentPhaseIndex]?.label}
            </span>
            <span style={{ fontSize: 11, color: "rgba(0,0,0,0.35)" }}>
              — {PHASES[currentPhaseIndex]?.article}
            </span>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px" }}>
            {messages.map((msg, i) => <ChatBubble key={i} message={msg} />)}
            {isLoading && (
              <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 10 }}>
                <div style={{ background: "#f5f5f4", border: "1px solid rgba(0,0,0,0.07)", borderRadius: "14px 14px 14px 4px", padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                  <Loader2 size={13} style={{ color: "#2563eb", animation: "spin 1s linear infinite" }} />
                  <span style={{ fontSize: 12, color: "rgba(0,0,0,0.4)" }}>Analisi in corso…</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(0,0,0,0.07)", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Fase: ${PHASES[currentPhaseIndex]?.subtitle} — scrivi la tua risposta…`}
                rows={2}
                disabled={isLoading}
                style={{
                  flex: 1, fontSize: 13, padding: "10px 14px", borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.12)", color: "#0D1016", resize: "none",
                  outline: "none", fontFamily: "var(--font-inter, system-ui)",
                  background: "#ffffff", lineHeight: 1.5,
                  opacity: isLoading ? 0.5 : 1,
                }}
                onFocus={e => (e.target.style.borderColor = "rgba(37,99,235,0.5)")}
                onBlur={e => (e.target.style.borderColor = "rgba(0,0,0,0.12)")}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                style={{
                  flexShrink: 0, width: 40, height: 40,
                  background: (!input.trim() || isLoading) ? "rgba(0,0,0,0.06)" : "#0D1016",
                  color: (!input.trim() || isLoading) ? "rgba(0,0,0,0.25)" : "#ffffff",
                  border: "none", borderRadius: 10, cursor: (!input.trim() || isLoading) ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s",
                }}
              >
                <Send size={15} />
              </button>
            </div>
            <p style={{ fontSize: 10, color: "rgba(0,0,0,0.25)", marginTop: 6 }}>
              Invio con Enter · Shift+Enter per andare a capo
            </p>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
