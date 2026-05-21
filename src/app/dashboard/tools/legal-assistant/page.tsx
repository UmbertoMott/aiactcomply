"use client";

import { useState, useRef, useEffect } from "react";
import { BookOpen, Scale, Send } from "lucide-react";

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
        const artMatch = rawCitation.match(/Art\.\s*(\d+)(?:[,\s]+([a-z\d]+)\))?/i);
        const artRef = artMatch
          ? `Art. ${artMatch[1]}${artMatch[2] ? `(${artMatch[2]})` : ""}`
          : rawCitation.replace("[Fonte:", "").replace("]", "").trim().slice(0, 20);
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
  const base = artRef.replace(/\([^)]+\)$/, "").trim();
  const idx = sources.findIndex((s) => s.sectionRef?.startsWith(base));
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

const SUGGESTIONS = [
  "Sistemi ad alto rischio",
  "Obblighi GPAI",
  "Sanzioni Art. 99",
  "Valutazione conformità",
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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
        flex: 1,
        borderRight: layout === "split" ? "1px solid rgba(0,0,0,0.06)" : "none",
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
                    <p className="text-muted-foreground mb-2 text-[11px]">
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
                            className={`flex items-start gap-1.5 px-1.5 py-1 rounded-md transition-colors${b.artRef && !isActive ? " hover:bg-[rgba(99,102,241,0.05)] hover:border-[rgba(99,102,241,0.15)]" : ""}`}
                            style={{
                              cursor: b.artRef ? "pointer" : "default",
                              border: isActive
                                ? "1px solid rgba(99,102,241,0.2)"
                                : "1px solid transparent",
                              background: isActive ? "rgba(99,102,241,0.07)" : "transparent",
                            }}
                          >
                            <span className="text-[10px] text-muted-foreground mt-0.5 flex-shrink-0">•</span>
                            <span className="text-[11px] text-foreground flex-1">{b.text}</span>
                            {b.artRef && (
                              <span
                                className="text-[9px] font-semibold rounded px-1.5 py-0.5 flex-shrink-0"
                                style={{ background: "rgba(99,102,241,0.1)", color: "#4f46e5" }}
                              >
                                {b.artRef} ↗
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {(!msg.parsed?.bullets || msg.parsed.bullets.length === 0) && (
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
                            style={{ background: "rgba(99,102,241,0.08)", color: "#4f46e5" }}
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
                      background: "rgba(99,102,241,0.5)",
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
              onClick={() => { setInput(s); inputRef.current?.focus(); }}
              className="text-[9px] text-muted-foreground px-2 py-0.5 rounded transition-colors hover:text-accent"
              style={{ background: "#FAFAF9", border: "1px solid rgba(0,0,0,0.08)" }}
            >
              {s.length > 32 ? s.slice(0, 32) + "…" : s}
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
        width: layout === "source" ? "100%" : "42%",
        background: "#FAFAF9",
        flexShrink: 0,
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
            style={{ background: "rgba(99,102,241,0.1)", color: "#4f46e5" }}
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
              style={{ background: "rgba(99,102,241,0.08)" }}
            >
              <BookOpen className="h-4 w-4" style={{ color: "#4f46e5" }} />
            </div>
            <p className="text-xs text-muted-foreground max-w-[180px]">
              Fai una domanda per vedere le fonti
            </p>
          </div>
        ) : (
          <div
            className="rounded-md p-3 my-2"
            style={{
              background: "rgba(99,102,241,0.06)",
              border: "1px solid rgba(99,102,241,0.18)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-[9px] font-semibold uppercase tracking-wider"
                style={{ color: "#4f46e5", letterSpacing: "0.06em" }}
              >
                Chunk selezionato
              </span>
              <span
                className="text-[8px] font-semibold rounded px-1 py-0.5"
                style={{ background: "rgba(99,102,241,0.1)", color: "#4f46e5" }}
              >
                rilevanza {activeSource.similarity.toFixed(2)}
              </span>
            </div>
            <p className="text-[11px] text-foreground leading-[1.7]">
              {activeSource.chunkText}
            </p>
          </div>
        )}
      </div>

      {activeMsg?.sources && activeMsg.sources.length > 0 && (
        <div
          className="px-4 py-3 flex-shrink-0"
          style={{ borderTop: "1px solid rgba(0,0,0,0.06)", background: "#fff" }}
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
                className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors${activeChunkIndex !== i ? " hover:bg-[rgba(99,102,241,0.05)] hover:border-[rgba(99,102,241,0.1)]" : ""}`}
                style={{
                  border:
                    activeChunkIndex === i
                      ? "1px solid rgba(99,102,241,0.2)"
                      : "1px solid transparent",
                  background:
                    activeChunkIndex === i ? "rgba(99,102,241,0.07)" : "transparent",
                }}
              >
                <span
                  className="text-[9px] font-semibold rounded px-1.5 py-0.5 flex-shrink-0"
                  style={{ background: "rgba(99,102,241,0.1)", color: "#4f46e5" }}
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
        className="rounded-xl mt-4 overflow-hidden flex"
        style={{
          border: "1px solid rgba(0,0,0,0.08)",
          height: "calc(100vh - 200px)",
          minHeight: "500px",
        }}
      >
        {layout !== "source" && chatPanel}
        {layout !== "chat" && sourcePanel}
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
