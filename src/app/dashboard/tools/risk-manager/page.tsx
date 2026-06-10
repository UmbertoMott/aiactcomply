"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Shield,
  CheckCircle,
  Clock,
  Send,
  Download,
  RotateCcw,
  ChevronRight,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { riskManagerChat, type ChatMessage, type RiskDocumentation, type RiskPhaseId } from "@/app/actions/riskManagerChat";
import { writeToStorage, readFromStorage } from "@/lib/dossier/storage-schema";
import type { RiskManagerResult, ClassifierResult } from "@/lib/dossier/storage-schema";
import AIOutputLabel from "@/components/disclosure/AIOutputLabel";
import { SystemContextBanner } from "@/components/compliance/SystemContextBanner";

// ─── Phase definitions ────────────────────────────────────────────────────────

interface Phase {
  id: RiskPhaseId;
  label: string;
  subtitle: string;
  article: string;
}

const PHASES: Phase[] = [
  { id: "scoping",        label: "1. Scoping",               subtitle: "Ambito e contesto",        article: "Art. 9" },
  { id: "identification", label: "2. Identificazione Rischi", subtitle: "Catalogo rischi AI Act",   article: "Art. 9(2)" },
  { id: "montecarlo",     label: "3. Simulazione Monte Carlo",subtitle: "Analisi quantitativa",     article: "ENISA Guidelines" },
  { id: "bitemporal",     label: "4. Audit Bitemporale",      subtitle: "Versionamento e storico",  article: "Art. 12, 17" },
  { id: "drift",          label: "5. Drift Detection",        subtitle: "Monitoraggio deriva",      article: "Art. 72" },
  { id: "gpai",           label: "6. GPAI & Rischio Sistemico",subtitle: "Modelli uso generale",   article: "Art. 51-55" },
  { id: "governance",     label: "7. Governance & Sanzioni",  subtitle: "Misure e responsabilità", article: "Art. 9, 99-100" },
  { id: "final",          label: "8. Finalizzazione",         subtitle: "Risk Register completo",  article: "Art. 9(9)" },
];

type PhaseStatus = "pending" | "active" | "complete";

// ─── Storage key for chat state ───────────────────────────────────────────────

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
  } catch {
    return null;
  }
}

function saveChatState(state: PersistedChatState): void {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

// ─── Left panel: phase progress ───────────────────────────────────────────────

function PhaseRow({
  phase,
  status,
  isExpanded,
  onToggle,
  documentation,
}: {
  phase: Phase;
  status: PhaseStatus;
  isExpanded: boolean;
  onToggle: () => void;
  documentation: RiskDocumentation;
}) {
  const data = documentation[phase.id as keyof RiskDocumentation];
  const hasData = data && Object.keys(data).length > 0;

  return (
    <div
      className={`border rounded-lg overflow-hidden transition-all ${
        status === "active"
          ? "border-violet-500/60 bg-violet-500/5"
          : status === "complete"
          ? "border-emerald-500/40 bg-emerald-500/5"
          : "border-white/10 bg-white/2"
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex-shrink-0">
          {status === "complete" ? (
            <CheckCircle size={16} className="text-emerald-400" />
          ) : status === "active" ? (
            <div className="w-4 h-4 rounded-full border-2 border-violet-400 animate-pulse" />
          ) : (
            <Clock size={16} className="text-white/30" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-xs font-semibold truncate ${
            status === "active" ? "text-violet-300" :
            status === "complete" ? "text-emerald-300" : "text-white/40"
          }`}>
            {phase.label}
          </div>
          <div className="text-[10px] text-white/30 truncate">{phase.subtitle}</div>
        </div>
        <div className="flex-shrink-0 flex items-center gap-1">
          <span className="text-[9px] text-white/25 font-mono">{phase.article}</span>
          {hasData && (
            <ChevronRight
              size={12}
              className={`text-white/30 transition-transform ${isExpanded ? "rotate-90" : ""}`}
            />
          )}
        </div>
      </button>

      {isExpanded && hasData && (
        <div className="px-3 pb-3 space-y-1 border-t border-white/5 pt-2">
          <AIOutputLabel documentType="Estrazione automatica" />
          {Object.entries(data as Record<string, unknown>).map(([k, v]) => {
            if (v === undefined || v === null) return null;
            const displayVal = Array.isArray(v)
              ? (v as string[]).join(", ")
              : typeof v === "boolean"
              ? (v ? "Sì" : "No")
              : String(v);
            return (
              <div key={k} className="flex gap-2 text-[10px]">
                <span className="text-white/30 capitalize min-w-0 flex-shrink-0">{k.replace(/([A-Z])/g, " $1").toLowerCase()}:</span>
                <span className="text-amber-200/80 break-words">{displayVal}</span>
              </div>
            );
          })}
          <p className="text-[9px] text-white/20 mt-1 italic">
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
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-violet-600/80 text-white rounded-br-sm"
            : "bg-white/8 text-white/90 rounded-bl-sm border border-white/10"
        }`}
      >
        {!isUser && (
          <div className="flex items-center gap-1 mb-1.5">
            <Shield size={10} className="text-violet-400" />
            <span className="text-[9px] text-violet-300 font-semibold tracking-wide uppercase">
              Risk Manager AI
            </span>
          </div>
        )}
        <p className="whitespace-pre-wrap">{message.content}</p>
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
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const classifierData = readFromStorage<ClassifierResult>("classifier");
  const systemContext = {
    systemName: classifierData?.systemName,
    riskLevel: classifierData?.riskLevel,
    isGPAI: classifierData?.isGPAI,
  };

  // Load persisted state
  useEffect(() => {
    const saved = loadChatState();
    if (saved) {
      setMessages(saved.messages);
      setDocumentation(saved.documentation);
      setCurrentPhaseIndex(saved.currentPhaseIndex);
      setCompletedPhases(saved.completedPhases);
    } else {
      // First visit — AI opens the conversation
      const welcome: ChatMessage = {
        role: "assistant",
        content: `Benvenuto nel **Risk Manager AI Act** di AIComply.\n\nTi guiderò attraverso 8 fasi per costruire un Risk Register completo ai sensi dell'**Art. 9 Reg. UE 2024/1689**.\n\nCominciamo con lo **Scoping**: inizia dandomi il nome del sistema AI e il contesto in cui viene utilizzato (es. settore, uso previsto, categorie di utenti coinvolti).`,
      };
      setMessages([welcome]);
    }
    setHydrated(true);
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Set expanded phase to current when it advances
  useEffect(() => {
    if (hydrated) {
      setExpandedPhase(PHASES[currentPhaseIndex]?.id ?? null);
    }
  }, [currentPhaseIndex, hydrated]);

  const persistState = useCallback(
    (
      msgs: ChatMessage[],
      doc: RiskDocumentation,
      phaseIdx: number,
      completed: RiskPhaseId[]
    ) => {
      saveChatState({ messages: msgs, documentation: doc, currentPhaseIndex: phaseIdx, completedPhases: completed });
    },
    []
  );

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    const currentPhase = PHASES[currentPhaseIndex];

    const result = await riskManagerChat(
      newMessages,
      currentPhase.id,
      documentation,
      systemContext
    );

    if (result.error) {
      const errMsg: ChatMessage = { role: "assistant", content: result.error };
      const updated = [...newMessages, errMsg];
      setMessages(updated);
      persistState(updated, documentation, currentPhaseIndex, completedPhases);
      setIsLoading(false);
      return;
    }

    const assistantMsg: ChatMessage = { role: "assistant", content: result.reply ?? "" };
    const updatedMessages = [...newMessages, assistantMsg];

    let newDocumentation = documentation;
    let newPhaseIndex = currentPhaseIndex;
    let newCompleted = completedPhases;

    if (result.patch) {
      newDocumentation = { ...documentation, ...result.patch };
      setDocumentation(newDocumentation);
      setExpandedPhase(currentPhase.id);
    }

    if (result.stepComplete && currentPhaseIndex < PHASES.length - 1) {
      newCompleted = [...completedPhases, currentPhase.id];
      setCompletedPhases(newCompleted);
      newPhaseIndex = currentPhaseIndex + 1;
      setCurrentPhaseIndex(newPhaseIndex);

      const nextPhase = PHASES[newPhaseIndex];
      const transitionMsg: ChatMessage = {
        role: "assistant",
        content: `✓ Fase **${currentPhase.label}** completata e documentata.\n\nProcediamo con la fase **${nextPhase.label}** (${nextPhase.article}).`,
      };
      updatedMessages.push(transitionMsg);
    } else if (result.stepComplete && currentPhaseIndex === PHASES.length - 1) {
      // Final phase complete — save to dossier
      newCompleted = [...completedPhases, currentPhase.id];
      setCompletedPhases(newCompleted);
      const finalData = newDocumentation.final;
      const riskResult: RiskManagerResult = {
        risks: [],
        overallRiskLevel: finalData?.overallRisk === "alto" ? "high" : finalData?.overallRisk === "critico" ? "critical" : "medium",
        completedAt: new Date().toISOString(),
        nextReviewDate: finalData?.nextReviewDate,
      };
      writeToStorage("riskManager", riskResult);
    }

    setMessages(updatedMessages);
    persistState(updatedMessages, newDocumentation, newPhaseIndex, newCompleted);
    setIsLoading(false);
  }, [input, isLoading, messages, currentPhaseIndex, documentation, completedPhases, systemContext, persistState]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetChat = () => {
    localStorage.removeItem(CHAT_STORAGE_KEY);
    setMessages([]);
    setDocumentation({});
    setCurrentPhaseIndex(0);
    setCompletedPhases([]);
    setInput("");
    // Reinit welcome
    const welcome: ChatMessage = {
      role: "assistant",
      content: `Benvenuto nel **Risk Manager AI Act** di AIComply.\n\nTi guiderò attraverso 8 fasi per costruire un Risk Register completo ai sensi dell'**Art. 9 Reg. UE 2024/1689**.\n\nCominciamo con lo **Scoping**: inizia dandomi il nome del sistema AI e il contesto in cui viene utilizzato.`,
    };
    setMessages([welcome]);
  };

  const exportDocumentation = () => {
    const lines: string[] = ["# Risk Register — AI Act Art. 9", ""];
    PHASES.forEach((p) => {
      const data = documentation[p.id as keyof RiskDocumentation];
      lines.push(`## ${p.label} (${p.article})`);
      if (data && Object.keys(data).length > 0) {
        Object.entries(data as Record<string, unknown>).forEach(([k, v]) => {
          const val = Array.isArray(v) ? (v as string[]).join(", ") : String(v ?? "");
          lines.push(`- **${k}**: ${val}`);
        });
      } else {
        lines.push("_Non completata_");
      }
      lines.push("");
    });
    lines.push("---");
    lines.push("_Generato da AIComply · [verify against current AI Act text]_");

    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `RiskRegister_${systemContext.systemName ?? "sistema"}_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!hydrated) return null;

  const progressPct = Math.round(
    ((completedPhases.length + (currentPhaseIndex > 0 ? 0 : 0)) / PHASES.length) * 100
  );

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#0a0a0f]">
      <SystemContextBanner />

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/8 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Shield size={18} className="text-violet-400" />
          <div>
            <h1 className="text-sm font-semibold text-white">Risk Manager</h1>
            <p className="text-[10px] text-white/40">AI Act Art. 9 — Sistema di gestione dei rischi</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {completedPhases.length > 0 && (
            <button
              onClick={exportDocumentation}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/60 border border-white/15 rounded-lg hover:bg-white/5 transition-colors"
            >
              <Download size={12} />
              Esporta
            </button>
          )}
          <button
            onClick={resetChat}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/40 border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
          >
            <RotateCcw size={12} />
            Reset
          </button>
        </div>
      </div>

      {/* Main split layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── LEFT PANEL: progress ─────────────────────────────────────────── */}
        <div className="w-72 flex-shrink-0 border-r border-white/8 flex flex-col bg-white/2">
          {/* Progress header */}
          <div className="px-4 py-3 border-b border-white/8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">
                Stato Avanzamento
              </span>
              <span className="text-[10px] font-mono text-violet-300">
                {completedPhases.length}/{PHASES.length}
              </span>
            </div>
            <div className="w-full h-1 bg-white/8 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Phase list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {PHASES.map((phase, idx) => {
              const status: PhaseStatus =
                completedPhases.includes(phase.id)
                  ? "complete"
                  : idx === currentPhaseIndex
                  ? "active"
                  : "pending";

              return (
                <PhaseRow
                  key={phase.id}
                  phase={phase}
                  status={status}
                  isExpanded={expandedPhase === phase.id}
                  onToggle={() =>
                    setExpandedPhase(expandedPhase === phase.id ? null : phase.id)
                  }
                  documentation={documentation}
                />
              );
            })}
          </div>

          {/* Warning */}
          <div className="px-4 py-3 border-t border-white/8">
            <div className="flex items-start gap-2 text-[9px] text-amber-400/60">
              <AlertTriangle size={10} className="flex-shrink-0 mt-0.5" />
              <span>I dati estratti dall'AI richiedono verifica legale professionale.</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL: chat ────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Phase indicator */}
          <div className="px-4 py-2 border-b border-white/8 bg-violet-500/5 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
              <span className="text-xs text-violet-300 font-medium">
                Fase corrente: {PHASES[currentPhaseIndex]?.label}
              </span>
              <span className="text-[10px] text-white/30">
                — {PHASES[currentPhaseIndex]?.article}
              </span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
            {messages.map((msg, i) => (
              <ChatBubble key={i} message={msg} />
            ))}
            {isLoading && (
              <div className="flex justify-start mb-3">
                <div className="bg-white/8 border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                  <Loader2 size={14} className="text-violet-400 animate-spin" />
                  <span className="text-xs text-white/50">Analisi in corso…</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="px-4 py-3 border-t border-white/8 flex-shrink-0">
            <div className="flex gap-3 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Rispondi alla fase: ${PHASES[currentPhaseIndex]?.subtitle}…`}
                rows={2}
                disabled={isLoading}
                className="flex-1 bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 resize-none focus:outline-none focus:border-violet-500/60 disabled:opacity-50 transition-colors"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="flex-shrink-0 w-10 h-10 bg-violet-600 hover:bg-violet-500 disabled:bg-white/10 disabled:text-white/20 text-white rounded-xl flex items-center justify-center transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-[9px] text-white/20 mt-2">
              Invio con Enter · Shift+Enter per andare a capo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
