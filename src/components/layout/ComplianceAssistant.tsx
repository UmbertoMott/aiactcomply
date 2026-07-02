"use client";

import { useState, useRef, useEffect } from "react";
import { complianceChat } from "@/app/actions/complianceChat";
import { readFromStorage } from "@/lib/dossier/storage-schema";
import type { ClassifierResult } from "@/lib/dossier/storage-schema";

interface Props {
  currentTool: string;
}

interface Message {
  role: "user" | "ai";
  text: string;
}

const TOOL_IDS = [
  "classifier", "riskManager", "dataAudit", "docugen", "logvault",
  "transparency", "oversight", "resilience", "qms", "fria", "dpia",
  "deployer", "conformity", "eudb", "gpai", "l132",
];

export function ComplianceAssistant({ currentTool }: Props) {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function buildContext() {
    const classifier = readFromStorage<ClassifierResult>("classifier");
    const completed  = TOOL_IDS.filter((id) => readFromStorage(id as keyof typeof import("@/lib/dossier/storage-schema").STORAGE_KEYS) !== null);
    return {
      currentTool,
      completedTools: completed,
      riskLevel:  classifier?.riskLevel ?? null,
      systemName: classifier?.systemName ?? null,
      role:       [],
    };
  }

  async function handleSend() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);
    const result = await complianceChat(userMsg, buildContext());
    setLoading(false);
    setMessages((prev) => [
      ...prev,
      { role: "ai", text: "error" in result ? result.error : result.answer },
    ]);
  }

  // Closed — floating button
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Assistente EU AI Act"
        style={{
          position: "fixed", bottom: 80, right: 20, zIndex: 190,
          width: 46, height: 46, borderRadius: "50%",
          background: "#2563eb", color: "white", border: "none",
          fontSize: 18, cursor: "pointer",
          boxShadow: "0 4px 16px rgba(37,99,235,0.35)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        ✦
      </button>
    );
  }

  return (
    <div style={{
      position: "fixed", bottom: 80, right: 20, zIndex: 190,
      width: 340, height: 460, background: "white",
      border: "1px solid rgba(0,0,0,0.12)", borderRadius: 14,
      boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "11px 16px", background: "#2563eb", color: "white",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexShrink: 0,
      }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 600 }}>✦ Assistente EU AI Act</span>
          <div style={{ fontSize: 10, opacity: 0.75, marginTop: 1 }}>
            Tool: {currentTool}
          </div>
        </div>
        <button
          onClick={() => setOpen(false)}
          style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: 16, lineHeight: 1 }}
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.length === 0 && (
          <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>
            Chiedimi qualcosa su questo tool o sul tuo percorso di conformità EU AI Act.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              maxWidth: "88%", padding: "8px 12px", borderRadius: 10, fontSize: 13,
              lineHeight: 1.45,
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              background: m.role === "user" ? "#2563eb" : "#f3f4f6",
              color: m.role === "user" ? "white" : "#111827",
            }}
          >
            {m.text}
          </div>
        ))}
        {loading && (
          <div style={{
            alignSelf: "flex-start", padding: "8px 14px", borderRadius: 10,
            background: "#f3f4f6", fontSize: 14, color: "#9ca3af",
          }}>
            …
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(0,0,0,0.08)", display: "flex", gap: 8, flexShrink: 0 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Es. Cosa devo fare dopo?"
          style={{
            flex: 1, padding: "7px 10px", borderRadius: 8,
            border: "1px solid rgba(0,0,0,0.15)", fontSize: 12, outline: "none",
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          style={{
            padding: "7px 14px", borderRadius: 8, border: "none",
            background: input.trim() && !loading ? "#2563eb" : "#e5e7eb",
            color: input.trim() && !loading ? "white" : "#9ca3af",
            fontSize: 12, fontWeight: 600, cursor: input.trim() && !loading ? "pointer" : "default",
          }}
        >
          Invia
        </button>
      </div>
    </div>
  );
}
