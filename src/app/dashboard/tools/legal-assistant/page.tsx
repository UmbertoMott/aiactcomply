"use client";

import { useState, useRef, useEffect } from "react";
import { BookOpen, Scale, Send, Menu, Plus, Pencil, Trash2 } from "lucide-react";
import HighlightedSourceText from "@/components/legal/HighlightedSourceText";

// ─── Types ────────────────────────────────────────────────────

type LayoutMode = "chat" | "split" | "source";

interface CitationItem {
  text: string;
  artRef: string;
  rawCitation: string;
}

interface ParsedAnswer {
  intro: string;
  bullets: CitationItem[];
}

interface SourceWithChunk {
  documentTitle: string;
  sectionRef?: string;
  similarity: number;
  chunkText: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  parsed?: ParsedAnswer;
  sources?: SourceWithChunk[];
  confidence?: string;
  latencyMs?: number;
  chunksFound?: number;
  userQuery?: string; // domanda che ha prodotto la risposta — usata per l'highlight Tier 2
}

// ─── Chat session persistence ──────────────────────────────────

const LEGAL_CHATS_KEY = "aicomply_legal_chats_v1";

interface LegalChatSession {
  id: string;
  name: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

function loadSessions(): LegalChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LEGAL_CHATS_KEY);
    return raw ? (JSON.parse(raw) as LegalChatSession[]) : [];
  } catch { return []; }
}

function saveSessions(ss: LegalChatSession[]): void {
  try { localStorage.setItem(LEGAL_CHATS_KEY, JSON.stringify(ss)); } catch {}
}

function genId(): string {
  return `lc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function relTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "ora";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min fa`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h fa`;
  return `${Math.floor(diff / 86_400_000)} gg fa`;
}

// ─── Answer parsing ───────────────────────────────────────────

function parseAnswer(raw: string): ParsedAnswer {
  const lines = raw.split("\n").filter((l) => l.trim());
  const bullets: CitationItem[] = [];
  const introLines: string[] = [];

  for (const line of lines) {
    const isBullet = /^[\*•\-]\s+/.test(line.trim());
    if (isBullet) {
      const clean = line.replace(/^[\*•\-]\s+/, "").trim();
      const allFonteMatches = [...clean.matchAll(/\[Fonte:[^\]]+\]/gi)];
      const fonteMatch = allFonteMatches.length > 0 ? allFonteMatches[allFonteMatches.length - 1] : null;
      if (fonteMatch) {
        const rawCitation = fonteMatch[0];
        const text = clean.replace(rawCitation, "").trim();
        // Try Art. X(y) pattern first, then §X.Y.Z, then fallback to sectionRef-like token
        const artMatch = rawCitation.match(/Art(?:icle|icolo|\.)\s*(\d+)(?:\s*[\(,]\s*([a-z\d]+)\)?)?/i);
        const secMatch = rawCitation.match(/§\s*([\d.]+)/);
        const artRef = artMatch
          ? `Art. ${artMatch[1]}${artMatch[2] ? `(${artMatch[2]})` : ""}`
          : secMatch
          ? `§${secMatch[1]}`
          : rawCitation.replace(/^\[Fonte:\s*/i, "").replace(/\]$/, "").split("—").pop()?.trim().slice(0, 20) ?? "";
        bullets.push({ text, artRef, rawCitation });
      } else {
        bullets.push({ text: clean, artRef: "", rawCitation: "" });
      }
    } else if (bullets.length === 0) {
      introLines.push(line.trim());
    }
  }

  return { intro: introLines.join(" "), bullets };
}

function findChunkIndex(artRef: string, sources: SourceWithChunk[]): number {
  // Strip trailing paragraph specifier: "Art. 16(a)" → "Art. 16", "§3.6.2" → "§3.6"
  const base = artRef.replace(/\([^)]+\)$/, "").replace(/(\.\d+)$/, "").trim();
  const idx = sources.findIndex(
    (s) => s.sectionRef?.startsWith(artRef) || s.sectionRef?.startsWith(base)
  );
  return idx;
}

// ─── Layout toggle icons (inline SVG) ────────────────────────

function IconChatOnly() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3" width="12" height="10" rx="1.5"
        stroke="currentColor" strokeWidth="1.3" />
      <line x1="4" y1="6.5" x2="12" y2="6.5"
        stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      <line x1="4" y1="9" x2="9" y2="9"
        stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

function IconSplit() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3" width="5.5" height="10" rx="1.5"
        stroke="currentColor" strokeWidth="1.3" />
      <rect x="8.5" y="3" width="5.5" height="10" rx="1.5"
        stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function IconSourceOnly() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="3" y="2" width="10" height="12" rx="1.5"
        stroke="currentColor" strokeWidth="1.3" />
      <line x1="5.5" y1="5.5" x2="10.5" y2="5.5"
        stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      <rect x="5.5" y="7.5" width="5" height="2.5" rx="1"
        fill="currentColor" opacity="0.5" />
      <line x1="5.5" y1="11.5" x2="9" y2="11.5"
        stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

// ─── Suggestions ──────────────────────────────────────────────
// label shown on chip, query sent to RAG (short labels → no chunks)

const SUGGESTIONS: { label: string; query: string }[] = [
  {
    label: "Sistemi ad alto rischio",
    query: "Quali sistemi di intelligenza artificiale sono classificati ad alto rischio ai sensi del Regolamento UE 2024/1689?",
  },
  {
    label: "Obblighi GPAI",
    query: "Quali sono gli obblighi dei fornitori di modelli di IA per uso generale (GPAI) secondo il Regolamento UE 2024/1689?",
  },
  {
    label: "Sanzioni Art. 99",
    query: "Quali sanzioni amministrative sono previste dall'articolo 99 del Regolamento UE 2024/1689 per la violazione degli obblighi?",
  },
  {
    label: "Valutazione conformità",
    query: "Come si svolge la procedura di valutazione della conformità per i sistemi AI ad alto rischio ai sensi del Regolamento UE 2024/1689?",
  },
];

// ─── EU AI Act navigation sections ───────────────────────────────

const EU_ACT_SECTIONS: { label: string; ref: string; query: string }[] = [
  { label: "Pratiche proibite", ref: "Art. 5", query: "Quali pratiche AI sono vietate dall'Art. 5 dell'EU AI Act?" },
  { label: "Classificazione alto rischio", ref: "Art. 6–7", query: "Come si classificano i sistemi AI ad alto rischio secondo l'EU AI Act?" },
  { label: "Requisiti tecnici", ref: "Art. 8–15", query: "Quali requisiti tecnici devono rispettare i sistemi AI ad alto rischio?" },
  { label: "Obblighi fornitori", ref: "Art. 16", query: "Quali sono gli obblighi dei fornitori di sistemi AI ad alto rischio?" },
  { label: "Obblighi deployer", ref: "Art. 26", query: "Quali sono gli obblighi dei deployer di sistemi AI?" },
  { label: "FRIA", ref: "Art. 27", query: "Quando è obbligatoria la Fundamental Rights Impact Assessment (FRIA) ai sensi dell'Art. 27?" },
  { label: "Conformità e certificazione", ref: "Art. 43–49", query: "Come funziona la procedura di valutazione della conformità per sistemi AI ad alto rischio?" },
  { label: "Modelli GPAI", ref: "Art. 51–56", query: "Quali obblighi hanno i fornitori di modelli AI general purpose (GPAI)?" },
  { label: "Governance e vigilanza", ref: "Art. 64–70", query: "Come funziona la governance dell'EU AI Act e le strutture di vigilanza nazionale?" },
  { label: "Sanzioni", ref: "Art. 99–101", query: "Quali sanzioni prevede l'EU AI Act per la non conformità?" },
];

// ─── Toggle button (outside component to avoid remount on render) ─

function ToggleBtn({
  mode,
  active,
  title,
  onSelect,
  children,
}: {
  mode: LayoutMode;
  active: boolean;
  title: string;
  onSelect: (m: LayoutMode) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={() => onSelect(mode)}
      className="flex items-center justify-center w-[30px] h-[26px] rounded-[5px] transition-colors"
      style={
        active
          ? { background: "#0D1016", color: "#fff" }
          : { background: "transparent", color: "rgba(0,0,0,0.35)" }
      }
    >
      {children}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────

export default function LegalAssistantPage() {
  const [layout, setLayout] = useState<LayoutMode>("split");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeChunkIndex, setActiveChunkIndex] = useState<number>(-1);
  const [activeMsgIndex, setActiveMsgIndex] = useState<number>(-1);

  // Chat session state
  const [sessions, setSessions] = useState<LegalChatSession[]>([]);
  const [currentSid, setCurrentSid] = useState<string>(() => genId());
  const [showChatList, setShowChatList] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const [splitRatio, setSplitRatio] = useState(58); // % width for chat panel in split mode
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const ratio = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitRatio(Math.min(75, Math.max(25, ratio)));
    }
    function onMouseUp() {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Load sessions on mount
  useEffect(() => { setSessions(loadSessions()); }, []);

  // Persist current session whenever messages change
  useEffect(() => {
    if (messages.length === 0) return;
    setSessions(prev => {
      const existing = prev.find(s => s.id === currentSid);
      const firstName = messages.find(m => m.role === "user")?.content.slice(0, 55) ?? "Nuova chat";
      const now = Date.now();
      const updated: LegalChatSession = {
        id: currentSid,
        name: existing?.name ?? firstName,
        messages,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      const next = [updated, ...prev.filter(s => s.id !== currentSid)];
      saveSessions(next);
      return next;
    });
  }, [messages, currentSid]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    // Abort any in-flight request before starting a new one
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/rag/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text.trim(), lang: "it", topK: 5 }),
        signal: controller.signal,
      });
      const data = await res.json();

      const sources: SourceWithChunk[] = (data.sources ?? []).map(
        (s: { documentTitle: string; sectionRef?: string; similarity: number }, i: number) => ({
          documentTitle: s.documentTitle,
          sectionRef: s.sectionRef,
          similarity: s.similarity,
          chunkText: (data.chunkTexts ?? [])[i] ?? "",
        })
      );

      const parsed = parseAnswer(data.answer ?? "");
      const aiMsg: ChatMessage = {
        role: "assistant",
        content: data.answer ?? "",
        parsed,
        sources,
        confidence: data.confidence,
        latencyMs: data.latencyMs,
        chunksFound: data.chunksFound ?? 0,
        userQuery: text.trim(),
      };

      setMessages((prev) => {
        const next = [...prev, aiMsg];
        setActiveMsgIndex(next.length - 1);
        return next;
      });
      setActiveChunkIndex(sources.length > 0 ? 0 : -1);
    } catch (err) {
      // Ignore aborted requests (user fired a new query)
      if (err instanceof Error && err.name === "AbortError") return;
      console.error("[LegalAssistant] sendMessage error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Errore di connessione. Riprova." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleBadgeClick(artRef: string, msgIdx: number) {
    const msg = messages[msgIdx];
    if (!msg?.sources) return;
    setActiveMsgIndex(msgIdx);
    setActiveChunkIndex(findChunkIndex(artRef, msg.sources));
    if (layout === "chat") setLayout("split");
  }

  function startNewChat() {
    setMessages([]);
    setCurrentSid(genId());
    setActiveChunkIndex(-1);
    setActiveMsgIndex(-1);
    setInput("");
    setShowChatList(false);
  }

  function loadSession(s: LegalChatSession) {
    setMessages(s.messages);
    setCurrentSid(s.id);
    setActiveChunkIndex(-1);
    setActiveMsgIndex(s.messages.length - 1);
    setShowChatList(false);
  }

  function deleteSession(id: string) {
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      saveSessions(next);
      return next;
    });
    if (id === currentSid) {
      setMessages([]);
      setCurrentSid(genId());
      setActiveChunkIndex(-1);
      setActiveMsgIndex(-1);
    }
  }

  function renameSession(id: string, name: string) {
    setSessions(prev => {
      const next = prev.map(s => s.id === id ? { ...s, name: name.trim() || s.name } : s);
      saveSessions(next);
      return next;
    });
    setEditingId(null);
  }

  function handleSourceRowClick(chunkIdx: number, msgIdx: number) {
    setActiveMsgIndex(msgIdx);
    setActiveChunkIndex(chunkIdx);
    if (layout === "chat") setLayout("split");
  }

  const activeMsg = activeMsgIndex >= 0 ? messages[activeMsgIndex] : undefined;
  const activeSource = activeMsg?.sources?.[activeChunkIndex];



  const chatPanel = (
    <div
      className="flex flex-col min-w-0"
      style={{
        flex: layout === "split" ? `0 0 ${splitRatio}%` : "1 1 auto",
        minWidth: 0,
      }}
    >
      <div
        className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
        style={{ background: "#FAFAF9", borderBottom: "1px solid rgba(0,0,0,0.06)" }}
      >
        <div
          className="w-[26px] h-[26px] flex items-center justify-center rounded-md flex-shrink-0"
          style={{ background: "#0D1016" }}
        >
          <Scale className="h-3.5 w-3.5 text-white" />
        </div>
        <div>
          <div className="text-xs font-semibold text-foreground">AI Act Assistant</div>
          <div className="text-[9px] text-muted-foreground">
            789 chunk · EU AI Act, ISO 22989, 3 Guidelines
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "#FAFAF9", border: "1px solid rgba(0,0,0,0.08)" }}
            >
              <BookOpen className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              Fai una domanda sul Regolamento UE 2024/1689 (EU AI Act) o sui documenti collegati.
            </p>
          </div>
        )}

        {messages.map((msg, msgIdx) => (
          <div key={msgIdx}>
            {msg.role === "user" ? (
              <div className="flex justify-end">
                <div
                  className="text-xs leading-relaxed px-3 py-2 max-w-[72%]"
                  style={{
                    background: "#0D1016",
                    color: "#fff",
                    borderRadius: "12px 12px 2px 12px",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ) : (
              <div className="flex gap-2 items-start">
                <div
                  className="w-[22px] h-[22px] flex items-center justify-center rounded-md flex-shrink-0 mt-0.5"
                  style={{ background: "#FAFAF9", border: "1px solid rgba(0,0,0,0.1)" }}
                >
                  <BookOpen className="h-3 w-3 text-muted-foreground" />
                </div>
                <div
                  className="text-xs leading-relaxed px-3 py-2.5 max-w-[88%]"
                  style={{
                    background: "#FAFAF9",
                    border: "1px solid rgba(0,0,0,0.08)",
                    borderRadius: "2px 10px 10px 10px",
                  }}
                >
                  {msg.parsed?.intro && (
                    <p className={`mb-2 text-[11px] ${msg.parsed.bullets?.length ? "text-muted-foreground" : "text-foreground"}`}>
                      {msg.parsed.intro}
                    </p>
                  )}

                  {msg.parsed?.bullets && msg.parsed.bullets.length > 0 && (
                    <div className="flex flex-col gap-0.5 mb-2">
                      {msg.parsed.bullets.map((b, bi) => {
                        const chunkIdx = b.artRef ? findChunkIndex(b.artRef, msg.sources ?? []) : -1;
                        const isActive =
                          activeMsgIndex === msgIdx && chunkIdx === activeChunkIndex;
                        return (
                          <div
                            key={bi}
                            onClick={() => b.artRef && handleBadgeClick(b.artRef, msgIdx)}
                            className={`flex items-start gap-1.5 px-1.5 py-1 rounded-md transition-colors${b.artRef && !isActive ? " hover:bg-[rgba(0,0,0,0.03)] hover:border-[rgba(0,0,0,0.08)]" : ""}`}
                            style={{
                              cursor: b.artRef ? "pointer" : "default",
                              border: isActive
                                ? "1px solid rgba(0,0,0,0.10)"
                                : "1px solid transparent",
                              background: isActive ? "rgba(0,0,0,0.05)" : "transparent",
                            }}
                          >
                            <span className="text-[10px] text-muted-foreground mt-0.5 flex-shrink-0">•</span>
                            <span className="text-[11px] text-foreground flex-1">{b.text}</span>
                            {b.artRef && (
                              <span
                                className="text-[9px] font-semibold rounded px-1.5 py-0.5 flex-shrink-0"
                                style={{ background: "rgba(0,0,0,0.07)", color: "rgba(0,0,0,0.55)" }}
                              >
                                {b.artRef} ↗
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Raw fallback: only when parseAnswer produced neither intro nor bullets */}
                  {!msg.parsed?.intro && (!msg.parsed?.bullets || msg.parsed.bullets.length === 0) && (
                    <p className="text-[11px] text-foreground whitespace-pre-wrap">{msg.content}</p>
                  )}

                  {msg.sources && msg.sources.length > 0 && (
                    <div
                      className="flex items-center gap-1.5 flex-wrap mt-2 pt-2"
                      style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
                    >
                      <span className="text-[9px] text-muted-foreground">Fonti:</span>
                      {Array.from(new Set(msg.sources.map((s) => s.sectionRef ?? s.documentTitle)))
                        .slice(0, 4)
                        .map((ref, i) => (
                          <span
                            key={i}
                            className="text-[9px] font-medium rounded px-1.5 py-0.5"
                            style={{ background: "rgba(0,0,0,0.05)", color: "rgba(0,0,0,0.55)" }}
                          >
                            {ref}
                          </span>
                        ))}
                      <span className="ml-auto text-[9px] text-muted-foreground">
                        {((msg.latencyMs ?? 0) / 1000).toFixed(1)}s · {msg.confidence}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2 items-start">
            <div
              className="w-[22px] h-[22px] flex items-center justify-center rounded-md flex-shrink-0"
              style={{ background: "#FAFAF9", border: "1px solid rgba(0,0,0,0.1)" }}
            >
              <BookOpen className="h-3 w-3 text-muted-foreground" />
            </div>
            <div
              className="px-3 py-2.5"
              style={{
                background: "#FAFAF9",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: "2px 10px 10px 10px",
              }}
            >
              <div className="flex gap-1 items-center">
                {[0, 0.2, 0.4].map((delay, i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: "rgba(0,0,0,0.35)",
                      animation: `pulse 1.2s ${delay}s infinite`,
                    }}
                  />
                ))}
                <span className="text-[10px] text-muted-foreground ml-1">Ricerca in corso…</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div
        className="px-4 py-3 flex-shrink-0"
        style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
      >
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: "#FAFAF9", border: "1px solid rgba(0,0,0,0.1)" }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
            disabled={loading}
            placeholder="Fai una domanda sull'AI Act, ISO 22989, Guidelines…"
            className="flex-1 bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="flex items-center justify-center w-7 h-7 rounded transition-colors disabled:opacity-40"
            style={{ background: "#0D1016", color: "#fff" }}
          >
            <Send className="h-3 w-3" />
          </button>
        </div>
        <div className="flex gap-1.5 flex-wrap mt-2">
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              onClick={() => { sendMessage(s.query); }}
              className="text-[9px] text-muted-foreground px-2 py-0.5 rounded transition-colors hover:text-foreground"
              style={{ background: "#FAFAF9", border: "1px solid rgba(0,0,0,0.08)" }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const sourcePanel = (
    <div
      className="flex flex-col min-w-0"
      style={{
        flex: "1 1 auto",
        minWidth: 0,
        background: "#ffffff",
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ background: "#fff", borderBottom: "1px solid rgba(0,0,0,0.06)" }}
      >
        <div>
          <div className="text-[11px] font-semibold text-foreground">
            {activeSource
              ? `📄 ${activeSource.sectionRef ?? "Fonte"} — ${activeSource.documentTitle}`
              : "Pannello sorgente"}
          </div>
          <div className="text-[9px] text-muted-foreground mt-0.5">
            {activeSource
              ? "Regolamento (UE) 2024/1689 · EU AI Act"
              : "Clicca un badge per vedere il testo"}
          </div>
        </div>
        {activeSource && (
          <span
            className="text-[9px] font-semibold rounded px-1.5 py-0.5 flex-shrink-0"
            style={{ background: "rgba(0,0,0,0.07)", color: "rgba(0,0,0,0.55)", fontFamily: "'DM Mono', monospace", letterSpacing: "0.02em" }}
          >
            {activeSource.sectionRef}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {activeChunkIndex === -1 && activeMsg?.sources && activeMsg.sources.length > 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <p className="text-xs text-muted-foreground max-w-[220px]">
              Fonte non disponibile nei chunk recuperati
            </p>
          </div>
        ) : !activeSource ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.05)" }}
            >
              <BookOpen className="h-4 w-4" style={{ color: "rgba(0,0,0,0.55)" }} />
            </div>
            <p className="text-xs text-muted-foreground max-w-[180px]">
              Fai una domanda per vedere le fonti
            </p>
          </div>
        ) : (
          <div
            className="rounded-md p-3 my-2"
            style={{
              background: "#FAFAF9",
              border: "1px solid rgba(0,0,0,0.08)",
              borderLeft: "3px solid rgba(0,0,0,0.15)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-[9px] font-semibold uppercase tracking-wider"
                style={{ color: "rgba(0,0,0,0.55)", letterSpacing: "0.06em" }}
              >
                Chunk selezionato
              </span>
              <span
                className="text-[8px] font-semibold rounded px-1 py-0.5"
                style={{ background: "rgba(0,0,0,0.07)", color: "rgba(0,0,0,0.55)" }}
              >
                rilevanza {activeSource.similarity.toFixed(2)}
              </span>
            </div>
            <HighlightedSourceText
              text={activeSource.chunkText}
              query={activeMsg?.userQuery}
            />
          </div>
        )}
      </div>

      {activeMsg?.sources && activeMsg.sources.length > 0 && (
        <div
          className="px-4 py-3 flex-shrink-0"
          style={{ borderTop: "1px solid rgba(0,0,0,0.06)", background: "#ffffff" }}
        >
          <p
            className="text-[9px] font-semibold uppercase mb-2"
            style={{ color: "rgba(0,0,0,0.3)", letterSpacing: "0.07em" }}
          >
            Tutte le fonti trovate
          </p>
          <div className="flex flex-col gap-1">
            {activeMsg.sources.map((src, i) => (
              <div
                key={i}
                onClick={() => handleSourceRowClick(i, activeMsgIndex)}
                className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors${activeChunkIndex !== i ? " hover:bg-[rgba(0,0,0,0.03)] hover:border-[rgba(0,0,0,0.07)]" : ""}`}
                style={{
                  border:
                    activeChunkIndex === i
                      ? "1px solid rgba(0,0,0,0.10)"
                      : "1px solid transparent",
                  background:
                    activeChunkIndex === i ? "rgba(0,0,0,0.05)" : "transparent",
                }}
              >
                <span
                  className="text-[9px] font-semibold rounded px-1.5 py-0.5 flex-shrink-0"
                  style={{ background: "rgba(0,0,0,0.07)", color: "rgba(0,0,0,0.55)", fontFamily: "'DM Mono', monospace", fontSize: 8 }}
                >
                  {src.sectionRef ?? "—"}
                </span>
                <span className="text-[10px] text-muted-foreground flex-1 truncate">
                  {src.documentTitle}
                </span>
                <span className="text-[9px] text-muted-foreground flex-shrink-0">
                  {src.similarity.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full">
      <div className="mb-0 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Legal Assistant</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Domande su EU AI Act, ISO 22989 e Guidelines — risposte citate con testo sorgente
          </p>
        </div>

        <div
          className="flex gap-0.5 p-[3px] rounded-[7px] mt-1"
          style={{ background: "#FAFAF9", border: "1px solid rgba(0,0,0,0.08)" }}
        >
          <ToggleBtn mode="chat" active={layout === "chat"} title="Solo chat" onSelect={setLayout}><IconChatOnly /></ToggleBtn>
          <ToggleBtn mode="split" active={layout === "split"} title="Chat + testo sorgente" onSelect={setLayout}><IconSplit /></ToggleBtn>
          <ToggleBtn mode="source" active={layout === "source"} title="Solo testo sorgente" onSelect={setLayout}><IconSourceOnly /></ToggleBtn>
        </div>
      </div>

      <div
        className="mt-4 flex gap-3"
        style={{ height: "calc(100vh - 200px)", minHeight: "500px" }}
      >
        {/* ── Left sidebar: EU AI Act sections / Chat history ── */}
        <div style={{ width: 220, flexShrink: 0, border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, overflow: "hidden", background: "#fafafa", display: "flex", flexDirection: "column" }}>
          {/* Header */}
          <div style={{ padding: "10px 10px 8px", borderBottom: "1px solid rgba(0,0,0,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(0,0,0,0.4)", textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>
                {showChatList ? "Cronologia" : "Documento"}
              </span>
              {!showChatList && (
                <p style={{ fontSize: 9, color: "rgba(0,0,0,0.3)", margin: "2px 0 0", lineHeight: 1.3 }}>Reg. UE 2024/1689 · EU AI Act</p>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              {showChatList && (
                <button
                  onClick={startNewChat}
                  title="Nuova chat"
                  style={{ width: 22, height: 22, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 5, color: "rgba(0,0,0,0.45)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.06)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                ><Plus size={13} /></button>
              )}
              <button
                onClick={() => setShowChatList(p => !p)}
                title={showChatList ? "Sezioni EU AI Act" : "Cronologia chat"}
                style={{ width: 22, height: 22, border: "none", background: showChatList ? "rgba(0,0,0,0.08)" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 5, color: "rgba(0,0,0,0.5)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.06)")}
                onMouseLeave={e => (e.currentTarget.style.background = showChatList ? "rgba(0,0,0,0.08)" : "transparent")}
              ><Menu size={13} /></button>
            </div>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: "auto" as const, padding: "8px" }}>
            {showChatList ? (
              sessions.length === 0 ? (
                <p style={{ fontSize: 10, color: "rgba(0,0,0,0.3)", padding: "12px 4px", margin: 0 }}>Nessuna chat salvata.</p>
              ) : (
                sessions.map(s => (
                  <div key={s.id} style={{
                    borderRadius: 7, marginBottom: 3, overflow: "hidden",
                    border: `1px solid ${s.id === currentSid ? "rgba(0,0,0,0.14)" : "rgba(0,0,0,0.06)"}`,
                    background: s.id === currentSid ? "rgba(0,0,0,0.03)" : "transparent",
                  }}>
                    {editingId === s.id ? (
                      <div style={{ padding: "6px 8px" }}>
                        <input
                          value={editingName}
                          onChange={e => setEditingName(e.target.value)}
                          onBlur={() => renameSession(s.id, editingName)}
                          onKeyDown={e => { if (e.key === "Enter") renameSession(s.id, editingName); if (e.key === "Escape") setEditingId(null); }}
                          autoFocus
                          style={{ width: "100%", fontSize: 11, border: "1px solid rgba(0,0,0,0.15)", borderRadius: 4, padding: "2px 5px", background: "#fff", outline: "none", boxSizing: "border-box" as const }}
                        />
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <button
                          onClick={() => loadSession(s)}
                          style={{ flex: 1, textAlign: "left" as const, background: "none", border: "none", padding: "7px 8px", cursor: "pointer", minWidth: 0 }}
                        >
                          <p style={{ fontSize: 11, fontWeight: s.id === currentSid ? 600 : 400, color: "#0D1016", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{s.name}</p>
                          <p style={{ fontSize: 9, color: "rgba(0,0,0,0.35)", margin: 0, marginTop: 1 }}>{relTime(s.updatedAt)}</p>
                        </button>
                        <div style={{ display: "flex", gap: 1, paddingRight: 4, flexShrink: 0 }}>
                          <button
                            onClick={() => { setEditingId(s.id); setEditingName(s.name); }}
                            title="Rinomina"
                            style={{ width: 20, height: 20, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, color: "rgba(0,0,0,0.35)" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.06)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                          ><Pencil size={10} /></button>
                          <button
                            onClick={() => deleteSession(s.id)}
                            title="Elimina"
                            style={{ width: 20, height: 20, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, color: "rgba(0,0,0,0.35)" }}
                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(220,38,38,0.08)"; e.currentTarget.style.color = "#dc2626"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(0,0,0,0.35)"; }}
                          ><Trash2 size={10} /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )
            ) : (
              EU_ACT_SECTIONS.map((s) => (
                <button
                  key={s.ref}
                  onClick={() => { sendMessage(s.query); setInput(""); }}
                  style={{ width: "100%", textAlign: "left" as const, border: "1px solid rgba(0,0,0,0.07)", background: "transparent", padding: "9px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, borderRadius: 8, marginBottom: 4 }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,0,0,0.03)"; e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(0,0,0,0.07)"; }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#0D1016", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{s.label}</p>
                    <p style={{ fontSize: 9, color: "rgba(0,0,0,0.42)", margin: 0, marginTop: 2, fontFamily: "monospace" }}>{s.ref}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Existing chat + source panels ── */}
        <div
          ref={containerRef}
          className="rounded-xl overflow-hidden flex"
          style={{
            border: "1px solid rgba(0,0,0,0.08)",
            flex: 1,
            minWidth: 0,
          }}
        >
          {layout !== "source" && chatPanel}
          {layout === "split" && (
            <div
              style={{
                flex: "0 0 5px",
                cursor: "col-resize",
                background: "transparent",
                position: "relative",
                zIndex: 10,
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                isDragging.current = true;
                document.body.style.cursor = "col-resize";
                document.body.style.userSelect = "none";
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "3px",
                  height: "36px",
                  borderRadius: "2px",
                  background: "rgba(0,0,0,0.12)",
                  transition: "background 0.15s",
                }}
              />
            </div>
          )}
          {layout !== "chat" && sourcePanel}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}
