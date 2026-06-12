"use client";
export const maxDuration = 60;

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Shield, CheckCircle, Clock, Send, Download, RotateCcw,
  ChevronRight, AlertTriangle, Loader2, Play, Pause,
  FileText, ChevronDown, Bold, Italic, Underline, Highlighter,
  Pencil, Check,
} from "lucide-react";
import { riskManagerChat, type ChatMessage, type RiskDocumentation, type RiskPhaseId } from "@/app/actions/riskManagerChat";
import { writeToStorage, readFromStorage } from "@/lib/dossier/storage-schema";
import type { RiskManagerResult, ClassifierResult } from "@/lib/dossier/storage-schema";
import AIOutputLabel from "@/components/disclosure/AIOutputLabel";
import { SystemContextBanner } from "@/components/compliance/SystemContextBanner";
import { RiskRegisterViewer } from "./components/RiskRegisterViewer";
import { buildRiskRegisterDocument, buildAnnexSections, type AnnexSection } from "@/lib/risk/risk-register-mapper";
import type { RiskRegisterDocument } from "@/lib/risk/risk-register-types";

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
  docEdits?: Partial<Record<RiskPhaseId, string>>;
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
  const audioIdRef = useRef<number | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);

  const speak = useCallback(async (text: string, id: number) => {
    // Stesso messaggio in riproduzione → pausa
    if (playingId === id && audioRef.current) {
      audioRef.current.pause();
      setPlayingId(null);
      return;
    }
    // Stesso messaggio in pausa → riprendi
    if (audioIdRef.current === id && audioRef.current) {
      audioRef.current.play();
      setPlayingId(id);
      return;
    }
    // Messaggio diverso → ferma il precedente e scarica il nuovo audio
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; audioIdRef.current = null; }

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
      audioIdRef.current = id;
      audio.onended = () => { setPlayingId(null); audioIdRef.current = null; URL.revokeObjectURL(url); };
      audio.onerror = () => { setPlayingId(null); audioIdRef.current = null; };
      audio.play();
    } catch {
      setPlayingId(null);
    }
  }, [playingId]);

  return { speak, playingId };
}

// ─── Phase row ────────────────────────────────────────────────────────────────

function PhaseRow({
  phase, status, onOpen, hasData,
}: {
  phase: Phase; status: PhaseStatus; onOpen: () => void; hasData: boolean;
}) {
  const borderColor = status === "active" ? "rgba(0,0,0,0.2)" : status === "complete" ? "rgba(22,163,74,0.2)" : "rgba(0,0,0,0.07)";
  const bg = status === "active" ? "rgba(0,0,0,0.03)" : status === "complete" ? "rgba(22,163,74,0.04)" : "transparent";

  return (
    <div style={{ border: `1px solid ${borderColor}`, background: bg, borderRadius: 8, overflow: "hidden", marginBottom: 4 }}>
      <button
        onClick={onOpen}
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
          {hasData && <ChevronRight size={11} style={{ color: "rgba(0,0,0,0.25)" }} />}
        </div>
      </button>
    </div>
  );
}

// ─── Error boundary ──────────────────────────────────────────────────────────

class ViewerErrorBoundary extends React.Component<
  { children: React.ReactNode; onClose: () => void },
  { error: string | null }
> {
  constructor(props: { children: React.ReactNode; onClose: () => void }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(err: unknown) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, overflow: "hidden", background: "#ffffff" }}>
          <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(0,0,0,0.07)", background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#991b1b" }}>Errore visualizzazione documento</span>
            <button onClick={this.props.onClose} style={{ fontSize: 12, background: "none", border: "none", cursor: "pointer", color: "rgba(0,0,0,0.4)" }}>✕</button>
          </div>
          <div style={{ flex: 1, padding: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ fontSize: 12, color: "#991b1b", margin: 0, fontFamily: "monospace", background: "#FEE2E2", padding: "8px 12px", borderRadius: 6 }}>{this.state.error}</p>
            <p style={{ fontSize: 11, color: "rgba(0,0,0,0.45)", margin: 0 }}>Ricarica la pagina o resetta la conversazione per ripristinare.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Phase viewer modal ───────────────────────────────────────────────────────

function ToolbarBtn({ icon, title, onClick, active }: {
  icon: React.ReactNode; title: string; onClick: () => void; active?: boolean;
}) {
  return (
    <button
      onMouseDown={e => e.preventDefault()} // non perdere la selezione di testo
      onClick={onClick}
      title={title}
      style={{
        width: 26, height: 26, borderRadius: 6,
        background: active ? "#0D1016" : "transparent",
        color: active ? "#ffffff" : "rgba(0,0,0,0.55)",
        border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "background 0.12s",
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(0,0,0,0.07)"; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      {icon}
    </button>
  );
}

function PhaseDocColumn({
  registerDoc, annexes, editedHtml, onSaveEdit, onClose,
}: {
  registerDoc: RiskRegisterDocument; annexes: AnnexSection[];
  editedHtml?: string; onSaveEdit: (html: string) => void;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const editRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  const exec = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editRef.current?.focus();
  };

  const enterEdit = () => {
    // Cattura l'HTML del viewer (o dell'html salvato) e passa a modalità edit
    const source = editedHtml ?? viewerRef.current?.innerHTML ?? "";
    setEditing(true);
    // Dopo il re-render, popola il div editabile
    setTimeout(() => {
      if (editRef.current) {
        editRef.current.innerHTML = source;
        editRef.current.focus();
      }
    }, 0);
  };

  const confirmEdit = () => {
    if (editRef.current) onSaveEdit(editRef.current.innerHTML);
    setEditing(false);
  };

  const docStyle: React.CSSProperties = {
    background: "#ffffff",
    borderRadius: 4,
    border: editing ? "1px solid rgba(13,16,22,0.35)" : "1px solid rgba(0,0,0,0.08)",
    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
    padding: "28px 32px",
    fontFamily: "Georgia, 'Times New Roman', serif",
    flex: 1,
    display: "flex",
    flexDirection: "column",
  };

  const docHeader = (
    <div style={{ borderBottom: "2px solid #0D1016", paddingBottom: 10, marginBottom: 18 }}>
      <p style={{ fontSize: 9, color: "rgba(0,0,0,0.45)", letterSpacing: "1px", textTransform: "uppercase", margin: 0, fontFamily: "var(--font-inter, system-ui)" }}>
        Art. 9 · Reg. UE 2024/1689 — Sistema di gestione dei rischi
      </p>
      <h3 style={{ fontSize: 17, fontWeight: 700, color: "#0D1016", margin: "5px 0 0" }}>
        Registro dei Rischi{registerDoc.identification.systemName ? ` — ${registerDoc.identification.systemName}` : ""}
      </h3>
    </div>
  );

  const docFooter = (
    <div style={{ borderTop: "1px solid rgba(0,0,0,0.12)", marginTop: 20, paddingTop: 8 }}>
      <p style={{ fontSize: 9, color: "rgba(0,0,0,0.4)", fontStyle: "italic", margin: 0 }}>
        Generato da AIComply · {new Date().toLocaleDateString("it-IT")} · [verificare sul testo AI Act vigente]
      </p>
    </div>
  );

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10,
      overflow: "hidden", background: "#ffffff", minWidth: 0,
    }}>
      {/* Header colonna */}
      <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(0,0,0,0.07)", background: "#fafafa", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 9, fontWeight: 600, color: "rgba(0,0,0,0.35)", letterSpacing: "0.8px", textTransform: "uppercase", margin: 0 }}>
            Art. 9 · Documento
          </p>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#0D1016", margin: "1px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            Registro dei Rischi
          </p>
        </div>

        {/* Toolbar formattazione — visibile solo in modifica */}
        {editing && (
          <div style={{ display: "flex", alignItems: "center", gap: 2, padding: "2px 4px", background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8 }}>
            <ToolbarBtn icon={<Bold size={13} />}        title="Grassetto"    onClick={() => exec("bold")} />
            <ToolbarBtn icon={<Italic size={13} />}      title="Corsivo"      onClick={() => exec("italic")} />
            <ToolbarBtn icon={<Underline size={13} />}   title="Sottolineato" onClick={() => exec("underline")} />
            <ToolbarBtn icon={<Highlighter size={13} />} title="Evidenzia"    onClick={() => exec("hiliteColor", "#fef08a")} />
          </div>
        )}

        {/* Matita / conferma modifica */}
        <ToolbarBtn
          icon={editing ? <Check size={13} /> : <Pencil size={13} />}
          title={editing ? "Salva modifiche" : "Modifica documento"}
          onClick={editing ? confirmEdit : enterEdit}
          active={editing}
        />

        <button
          onClick={onClose}
          title="Chiudi documento"
          style={{
            flexShrink: 0, width: 24, height: 24, borderRadius: 12,
            background: "rgba(0,0,0,0.05)", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "rgba(0,0,0,0.45)", fontSize: 12,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.1)")}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(0,0,0,0.05)")}
        >
          ✕
        </button>
      </div>

      {/* Corpo — pagina stile documento */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", background: "#f0f0ef", display: "flex", flexDirection: "column" }}>
        {editing ? (
          /* Modalità modifica: contentEditable puro, nessun componente React dentro */
          <div style={docStyle}>
            {docHeader}
            <div
              ref={editRef}
              contentEditable
              suppressContentEditableWarning
              style={{ outline: "none", cursor: "text", flex: 1 }}
            />
            {docFooter}
          </div>
        ) : (
          /* Modalità lettura: RiskRegisterViewer come normale componente React */
          <div style={docStyle}>
            {docHeader}
            <div ref={viewerRef} style={{ flex: 1 }}>
              {editedHtml
                ? <div dangerouslySetInnerHTML={{ __html: editedHtml }} />
                : <RiskRegisterViewer doc={registerDoc} annexes={annexes} />
              }
            </div>
            {docFooter}
          </div>
        )}
      </div>
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
                title={isPlaying ? "Pausa" : "Ascolta"}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "3px 10px", marginLeft: 8,
                  fontSize: 10, fontWeight: 500,
                  borderRadius: 20, cursor: "pointer",
                  background: isPlaying ? "#0D1016" : "rgba(0,0,0,0.05)",
                  color: isPlaying ? "#ffffff" : "rgba(0,0,0,0.45)",
                  border: "1px solid " + (isPlaying ? "#0D1016" : "rgba(0,0,0,0.08)"),
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={e => { if (!isPlaying) e.currentTarget.style.background = "rgba(0,0,0,0.08)"; }}
                onMouseLeave={e => { if (!isPlaying) e.currentTarget.style.background = "rgba(0,0,0,0.05)"; }}
              >
                {isPlaying ? <Pause size={10} /> : <Play size={10} />}
                {isPlaying ? "Pausa" : "Ascolta"}
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
  const [viewerPhase, setViewerPhase] = useState<Phase | null>(null);
  const [docEdits, setDocEdits] = useState<Partial<Record<RiskPhaseId, string>>>({});
  const [docWidth, setDocWidth] = useState(420);
  const [isResizing, setIsResizing] = useState(false);
  const layoutRef = useRef<HTMLDivElement>(null);

  // All'apertura, documento e chat si dividono lo spazio a metà
  const openViewer = useCallback((phase: Phase) => {
    const total = layoutRef.current?.clientWidth ?? 1200;
    const available = total - 256 - 12 * 3 - 6; // sinistra fissa + gap + splitter
    setDocWidth(Math.max(280, Math.floor(available / 2)));
    setViewerPhase(phase);
  }, []);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = docWidth;
    const onMove = (ev: MouseEvent) => {
      const max = (layoutRef.current?.clientWidth ?? 1200) * 0.6;
      setDocWidth(Math.min(Math.max(startWidth + (ev.clientX - startX), 280), max));
    };
    const onUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [docWidth]);
  const [hydrated, setHydrated] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { speak, playingId } = useTTS();

  const classifierData = readFromStorage<ClassifierResult>("classifier");
  const systemContext = {
    systemName: classifierData?.systemName,
    riskLevel: classifierData?.riskLevel,
    isGPAI: classifierData?.isGPAI,
  };

  // Registro dei Rischi derivato (sola lettura) dallo stato chat
  const registerDoc: RiskRegisterDocument = useMemo(
    () => buildRiskRegisterDocument(documentation, classifierData),
    [documentation, classifierData]
  );
  const annexes: AnnexSection[] = useMemo(
    () => buildAnnexSections(documentation),
    [documentation]
  );

  useEffect(() => {
    const saved = loadChatState();
    if (saved) {
      setMessages(saved.messages);
      setDocumentation(saved.documentation);
      setCurrentPhaseIndex(saved.currentPhaseIndex);
      setCompletedPhases(saved.completedPhases);
      setDocEdits(saved.docEdits ?? {});
    } else {
      setMessages([{
        role: "assistant",
        content: `Benvenuto nel Risk Manager AI Act di AIComply.\n\nTi guiderò attraverso 8 fasi per costruire un Risk Register completo ai sensi dell'Art. 9 Reg. UE 2024/1689.\n\nCominciamo con lo Scoping: indica il nome del sistema AI e il contesto in cui viene utilizzato (settore, uso previsto, categorie di utenti coinvolti).`,
      }]);
    }
    setHydrated(true);
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const persistState = useCallback((msgs: ChatMessage[], doc: RiskDocumentation, phaseIdx: number, completed: RiskPhaseId[]) => {
    saveChatState({ messages: msgs, documentation: doc, currentPhaseIndex: phaseIdx, completedPhases: completed, docEdits });
  }, [docEdits]);

  const saveDocEdit = useCallback((phaseId: RiskPhaseId, html: string) => {
    setDocEdits(prev => {
      const next = { ...prev, [phaseId]: html };
      const saved = loadChatState();
      if (saved) saveChatState({ ...saved, docEdits: next });
      return next;
    });
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
    setDocEdits({});
    setViewerPhase(null);
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

      {/* Split layout: sinistra fissa · documento (ridimensionabile) · chat */}
      <div ref={layoutRef} style={{ display: "flex", flex: 1, minHeight: 0, gap: 12, overflow: "hidden" }}>

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
                  onOpen={() => openViewer(phase)}
                  hasData={!!documentation[phase.id as keyof RiskDocumentation]}
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

        {/* CENTER — documento (apribile, ridimensionabile) */}
        {viewerPhase && (
          <>
            <div style={{ width: docWidth, flexShrink: 0, minWidth: 280, maxWidth: "60%" }}>
              <ViewerErrorBoundary onClose={() => setViewerPhase(null)}>
                <PhaseDocColumn
                  registerDoc={registerDoc}
                  annexes={annexes}
                  editedHtml={docEdits["scoping"]}
                  onSaveEdit={html => saveDocEdit("scoping", html)}
                  onClose={() => setViewerPhase(null)}
                />
              </ViewerErrorBoundary>
            </div>
            {/* Splitter trascinabile */}
            <div
              onMouseDown={startResize}
              style={{
                width: 6, flexShrink: 0, cursor: "col-resize",
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 3,
                background: isResizing ? "rgba(0,0,0,0.12)" : "transparent",
                transition: isResizing ? "none" : "background 0.15s",
              }}
              onMouseEnter={e => { if (!isResizing) e.currentTarget.style.background = "rgba(0,0,0,0.08)"; }}
              onMouseLeave={e => { if (!isResizing) e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{ width: 2, height: 32, borderRadius: 1, background: "rgba(0,0,0,0.2)" }} />
            </div>
          </>
        )}

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
