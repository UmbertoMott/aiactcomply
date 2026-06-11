"use client";
export const maxDuration = 60;

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Shield, CheckCircle, Clock, Send, Download, RotateCcw,
  ChevronRight, AlertTriangle, Loader2, Volume2, VolumeX,
  FileText, ChevronDown,
} from "lucide-react";
import { riskManagerChat, type ChatMessage, type RiskDocumentation, type RiskPhaseId } from "@/app/actions/riskManagerChat";
import { writeToStorage, readFromStorage } from "@/lib/dossier/storage-schema";
import type { RiskManagerResult, ClassifierResult } from "@/lib/dossier/storage-schema";
import AIOutputLabel from "@/components/disclosure/AIOutputLabel";
import { SystemContextBanner } from "@/components/compliance/SystemContextBanner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Rimuove la formattazione markdown (**, *, __, _) dal testo */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1");
}

// ─── Phase definitions ────────────────────────────────────────────────────────

interface Phase { id: RiskPhaseId; label: string; subtitle: string; article: string }

const PHASES: Phase[] = [
  { id: "scoping",        label: "1. Scoping",                 subtitle: "Ambito e contesto",        article: "Art. 9" },
  { id: "identification", label: "2. Identificazione Rischi",  subtitle: "Catalogo rischi AI Act",   article: "Art. 9(2)" },
  { id: "montecarlo",     label: "3. Simulazione Monte Carlo", subtitle: "Analisi quantitativa",     article: "ENISA Guidelines" },
  { id: "bitemporal",     label: "4. Audit Bitemporale",       subtitle: "Versionamento e storico",  article: "Art. 12, 17" },
  { id: "drift",          label: "5. Drift Detection",         subtitle: "Monitoraggio deriva",      article: "Art. 72" },
  { id: "gpai",           label: "6. GPAI & Rischio Sistemico",subtitle: "Modelli uso generale",    article: "Art. 51-55" },
  { id: "governance",     label: "7. Governance & Sanzioni",   subtitle: "Misure e responsabilità", article: "Art. 9, 99-100" },
  { id: "final",          label: "8. Finalizzazione",          subtitle: "Risk Register completo",  article: "Art. 9(9)" },
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

// ─── TTS hook ────────────────────────────────────────────────────────────────

function useTTS() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);

  const speak = useCallback(async (text: string, id: number) => {
    // Stop current audio
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (playingId === id) { setPlayingId(null); return; }

    setPlayingId(id);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: stripMarkdown(text) }),
      });
      if (!res.ok) { setPlayingId(null); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setPlayingId(null); URL.revokeObjectURL(url); };
      audio.onerror = () => { setPlayingId(null); };
      audio.play();
    } catch {
      setPlayingId(null);
    }
  }, [playingId]);

  return { speak, playingId };
}

// ─── Phase row ────────────────────────────────────────────────────────────────

function PhaseRow({
  phase, status, isExpanded, onToggle, documentation,
}: {
  phase: Phase; status: PhaseStatus; isExpanded: boolean;
  onToggle: () => void; documentation: RiskDocumentation;
}) {
  const data = documentation[phase.id as keyof RiskDocumentation];
  const hasData = data && Object.keys(data).length > 0;

  const borderColor = status === "active" ? "rgba(0,0,0,0.2)" : status === "complete" ? "rgba(22,163,74,0.2)" : "rgba(0,0,0,0.07)";
  const bg = status === "active" ? "rgba(0,0,0,0.03)" : status === "complete" ? "rgba(22,163,74,0.04)" : "transparent";

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
            <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid #0D1016" }} />
          ) : (
            <Clock size={14} style={{ color: "rgba(0,0,0,0.2)" }} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: status === "active" ? "#0D1016" : status === "complete" ? "#15803d" : "rgba(0,0,0,0.4)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
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
                  <span style={{ color: "rgba(0,0,0,0.35)", flexShrink: 0, textTransform: "capitalize" }}>{k.replace(/([A-Z])/g, " $1").toLowerCase()}:</span>
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

function ChatBubble({ message, index, onSpeak, isPlaying }: {
  message: ChatMessage; index: number;
  onSpeak: (text: string, id: number) => void; isPlaying: boolean;
}) {
  const isUser = message.role === "user";
  const clean = stripMarkdown(message.content);

  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 10 }}>
      <div style={{ maxWidth: "82%", position: "relative" }}>
        <div style={{
          borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
          padding: "10px 14px",
          fontSize: 13, lineHeight: 1.55,
          background: isUser ? "#0D1016" : "#f5f5f4",
          color: isUser ? "#ffffff" : "#0D1016",
          border: isUser ? "none" : "1px solid rgba(0,0,0,0.07)",
        }}>
          {!isUser && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Shield size={10} style={{ color: "#0D1016" }} />
                <span style={{ fontSize: 9, color: "#0D1016", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Risk Manager AI
                </span>
              </div>
              <button
                onClick={() => onSpeak(clean, index)}
                title={isPlaying ? "Ferma audio" : "Ascolta"}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "0 0 0 8px", color: isPlaying ? "#2563eb" : "rgba(0,0,0,0.25)", display: "flex", alignItems: "center" }}
              >
                {isPlaying ? <VolumeX size={12} /> : <Volume2 size={12} />}
              </button>
            </div>
          )}
          <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{clean}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Export dropdown ──────────────────────────────────────────────────────────

function ExportMenu({ documentation, systemName }: { documentation: RiskDocumentation; systemName?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const name = systemName ?? "sistema";
  const date = new Date().toISOString().slice(0, 10);

  const buildSections = () => PHASES.map(p => {
    const data = documentation[p.id as keyof RiskDocumentation];
    return {
      title: `${p.label} (${p.article})`,
      content: data && Object.keys(data).length > 0
        ? Object.entries(data as Record<string, unknown>).map(([k, v]) => `${k}: ${Array.isArray(v) ? (v as string[]).join(", ") : String(v ?? "")}`).join("\n")
        : "Non completata",
    };
  });

  function exportMarkdown() {
    const lines = ["# Risk Register — AI Act Art. 9", `**Sistema**: ${name}`, `**Data**: ${date}`, ""];
    buildSections().forEach(s => { lines.push(`## ${s.title}`, s.content, ""); });
    lines.push("---\n*[verify against current AI Act text] — Generato da AIComply*");
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `RiskRegister_${name}_${date}.md` });
    a.click(); URL.revokeObjectURL(a.href);
    setOpen(false);
  }

  async function exportPDF() {
    const sections = buildSections().map(s => ({ title: s.title, content: s.content, status: s.content === "Non completata" ? "empty" as const : "complete" as const }));
    try {
      const res = await fetch("/api/compliance/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemName: name, tier: "high", sections }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `RiskRegister_${name}_${date}.pdf` });
      a.click(); URL.revokeObjectURL(a.href);
    } catch { /* silent */ }
    setOpen(false);
  }

  function exportWord() {
    const sections = buildSections();
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#1a1a1a;margin:2cm}
h1{font-size:18pt;font-weight:600;margin-bottom:4pt}
h2{font-size:13pt;font-weight:600;margin-top:18pt;margin-bottom:4pt;color:#1d4ed8;border-bottom:1px solid #e0e0e0;padding-bottom:4pt}
p{margin:4pt 0;line-height:1.5}
.meta{font-size:9pt;color:#666;margin-bottom:16pt}
.footer{font-size:8pt;color:#999;margin-top:24pt;border-top:1px solid #ddd;padding-top:8pt}
</style></head><body>
<h1>Risk Register — AI Act Art. 9</h1>
<p class="meta">Sistema: ${name} &nbsp;·&nbsp; Data: ${date} &nbsp;·&nbsp; Generato da AIComply</p>
${sections.map(s => `<h2>${s.title}</h2><p>${s.content.replace(/\n/g, "<br>")}</p>`).join("\n")}
<p class="footer">[verify against current AI Act text] — Documento generato da AIComply. Richiedere verifica legale professionale prima dell&apos;utilizzo.</p>
</body></html>`;
    const blob = new Blob([html], { type: "application/msword" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `RiskRegister_${name}_${date}.doc` });
    a.click(); URL.revokeObjectURL(a.href);
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 500, padding: "6px 12px", borderRadius: 20, background: "rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.6)", border: "none", cursor: "pointer" }}
      >
        <Download size={12} /> Esporta <ChevronDown size={10} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", background: "#ffffff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", zIndex: 50, minWidth: 160, overflow: "hidden" }}>
          {[
            { label: "PDF", icon: "📄", action: exportPDF },
            { label: "Word (.doc)", icon: "📝", action: exportWord },
            { label: "Markdown", icon: "📋", action: exportMarkdown },
          ].map(item => (
            <button
              key={item.label}
              onClick={item.action}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 14px", fontSize: 12, color: "#0D1016", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.04)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </div>
      )}
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
  const { speak, playingId } = useTTS();

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
        content: `Benvenuto nel Risk Manager AI Act di AIComply.\n\nTi guiderò attraverso 8 fasi per costruire un Risk Register completo ai sensi dell'Art. 9 Reg. UE 2024/1689.\n\nCominciamo con lo Scoping: indica il nome del sistema AI e il contesto in cui viene utilizzato (settore, uso previsto, categorie di utenti coinvolti).`,
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
    const result = await Promise.race([
      riskManagerChat(newMessages, currentPhase.id, documentation, systemContext),
      new Promise<Awaited<ReturnType<typeof riskManagerChat>>>(resolve =>
        setTimeout(() => resolve({ error: "Timeout: risposta AI troppo lenta. Riprova." }), 55000)
      ),
    ]);

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
      updatedMessages.push({
        role: "assistant",
        content: `Fase "${currentPhase.label}" completata e documentata.\n\nProcediamo con la fase "${PHASES[newPhaseIndex].label}" (${PHASES[newPhaseIndex].article}).`,
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

  if (!hydrated) return null;

  const progressPct = Math.round((completedPhases.length / PHASES.length) * 100);
  const hasContent = completedPhases.length > 0 || Object.keys(documentation).length > 0;

  return (
    <div style={{ fontFamily: "var(--font-inter, system-ui)", background: "#ffffff", height: "calc(100vh - 4rem)", display: "flex", flexDirection: "column" }}>
      <SystemContextBanner />

      {/* Header */}
      <div style={{ paddingBottom: 16 }}>
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
              Framework guidato AI — Monte Carlo, audit bitemporale, drift detection, GPAI. Ogni risposta AI include audio con voce Chirp3-HD.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {hasContent && <ExportMenu documentation={documentation} systemName={systemContext.systemName} />}
            <button
              onClick={resetChat}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, padding: "6px 12px", borderRadius: 20, background: "rgba(0,0,0,0.04)", color: "rgba(0,0,0,0.4)", border: "1px solid rgba(0,0,0,0.07)", cursor: "pointer" }}
            >
              <RotateCcw size={12} /> Reset
            </button>
          </div>
        </div>
      </div>

      {/* Split layout */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, gap: 16, overflow: "hidden" }}>

        {/* LEFT — progress */}
        <div style={{ width: 256, flexShrink: 0, display: "flex", flexDirection: "column", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, overflow: "hidden", background: "#fafafa" }}>
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

          <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
            {PHASES.map((phase, idx) => {
              const status: PhaseStatus = completedPhases.includes(phase.id) ? "complete" : idx === currentPhaseIndex ? "active" : "pending";
              return (
                <PhaseRow
                  key={phase.id} phase={phase} status={status}
                  isExpanded={expandedPhase === phase.id}
                  onToggle={() => setExpandedPhase(expandedPhase === phase.id ? null : phase.id)}
                  documentation={documentation}
                />
              );
            })}
          </div>

          <div style={{ padding: "8px 12px", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 9, color: "rgba(0,0,0,0.35)" }}>
              <AlertTriangle size={10} style={{ flexShrink: 0, marginTop: 1, color: "#b45309" }} />
              <span>I campi estratti dall&apos;AI richiedono verifica legale professionale.</span>
            </div>
          </div>
        </div>

        {/* RIGHT — chat */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, overflow: "hidden", minWidth: 0 }}>
          <div style={{ padding: "8px 16px", borderBottom: "1px solid rgba(0,0,0,0.07)", background: "#f5f5f4", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#0D1016" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#0D1016" }}>
              Fase corrente: {PHASES[currentPhaseIndex]?.label}
            </span>
            <span style={{ fontSize: 11, color: "rgba(0,0,0,0.45)" }}>
              — {PHASES[currentPhaseIndex]?.article}
            </span>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
              <FileText size={10} style={{ color: "rgba(0,0,0,0.25)" }} />
              <span style={{ fontSize: 9, color: "rgba(0,0,0,0.25)" }}>Audio Chirp3-HD disponibile</span>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px" }}>
            {messages.map((msg, i) => (
              <ChatBubble
                key={i} message={msg} index={i}
                onSpeak={speak} isPlaying={playingId === i}
              />
            ))}
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
              Enter per inviare · Shift+Enter per andare a capo
            </p>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
