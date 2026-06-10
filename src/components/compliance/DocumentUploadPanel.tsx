"use client";
// Pannello upload documenti + mostra fatti estratti.
// Usabile in qualsiasi tool: <DocumentUploadPanel toolId="riskManager" />
// Il workflow è: upload → estrazione AI (suggested) → confirm/reject

import { useState, useRef, useCallback } from "react";
import { Upload, FileText, Loader2, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { ExtractedFactsPanel } from "./ExtractedFactsPanel";

interface DocumentUploadPanelProps {
  toolId: string;
  /** Chiamato quando l'utente conferma un fatto — il tool può applicarlo al suo stato */
  onFactConfirmed?: (fieldTarget: string, value: string) => void;
}

const T = {
  border: "rgba(0,0,0,0.08)",
  muted: "rgba(0,0,0,0.42)",
  blue: "#1d4ed8",
  blueBg: "rgba(29,78,216,0.05)",
  blueBdr: "rgba(29,78,216,0.16)",
  green: "#15803d",
  greenBg: "rgba(22,163,74,0.06)",
  amber: "#92400e",
  amberBg: "rgba(202,138,4,0.07)",
  amberBdr: "rgba(202,138,4,0.22)",
  red: "#dc2626",
} as const;

interface UploadState {
  status: "idle" | "uploading" | "processing" | "done" | "error";
  documentId: string | null;
  filename: string | null;
  error: string | null;
  factsCount: number;
  duplicate: boolean;
}

export function DocumentUploadPanel({ toolId, onFactConfirmed }: DocumentUploadPanelProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: "idle", documentId: null, filename: null, error: null, factsCount: 0, duplicate: false,
  });
  const [dragging, setDragging] = useState(false);
  const [showFacts, setShowFacts] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setUploadState({ status: "uploading", documentId: null, filename: file.name, error: null, factsCount: 0, duplicate: false });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("toolId", toolId);

    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json() as { documentId?: string; duplicate?: boolean; error?: string };

      if (!res.ok || !json.documentId) {
        setUploadState(prev => ({ ...prev, status: "error", error: json.error ?? "Upload fallito" }));
        return;
      }

      setUploadState(prev => ({
        ...prev,
        status: "processing",
        documentId: json.documentId!,
        duplicate: json.duplicate ?? false,
      }));

      // Poll per vedere quando l'estrazione è completata (max 30s)
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const r = await fetch(`/api/documents/${json.documentId}/status`);
          if (r.ok) {
            const s = await r.json() as { status: string; factsCount: number };
            if (s.status === "done" || s.status === "failed" || attempts > 15) {
              clearInterval(poll);
              setUploadState(prev => ({
                ...prev,
                status: "done",
                factsCount: s.factsCount ?? 0,
              }));
              if (s.factsCount > 0) setShowFacts(true);
            }
          } else if (attempts > 15) {
            clearInterval(poll);
            setUploadState(prev => ({ ...prev, status: "done" }));
          }
        } catch {
          if (attempts > 15) clearInterval(poll);
        }
      }, 2000);
    } catch (e) {
      setUploadState(prev => ({ ...prev, status: "error", error: String(e) }));
    }
  }, [toolId]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const reset = () => {
    setUploadState({ status: "idle", documentId: null, filename: null, error: null, factsCount: 0, duplicate: false });
    setShowFacts(false);
  };

  const { status, filename, error, factsCount, duplicate, documentId } = uploadState;

  return (
    <div style={{ marginBottom: 8 }}>
      {/* Upload area */}
      {status === "idle" && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? T.blue : T.border}`,
            borderRadius: 10,
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
            background: dragging ? T.blueBg : "transparent",
            transition: "all 0.15s",
          }}
        >
          <Upload size={20} style={{ color: T.muted }} />
          <p style={{ fontSize: 12, fontWeight: 500, color: T.muted, textAlign: "center" }}>
            Trascina un documento o clicca per caricare
          </p>
          <p style={{ fontSize: 10, color: "rgba(0,0,0,0.3)" }}>
            PDF, TXT, MD, DOCX — max 10 MB
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md,.docx"
            style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>
      )}

      {/* Uploading */}
      {status === "uploading" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 10, background: T.blueBg, border: `1px solid ${T.blueBdr}` }}>
          <Loader2 size={14} style={{ color: T.blue, animation: "spin 1s linear infinite" }} />
          <span style={{ fontSize: 12, color: T.blue }}>Caricamento <strong>{filename}</strong>…</span>
        </div>
      )}

      {/* Processing */}
      {status === "processing" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 10, background: T.amberBg, border: `1px solid ${T.amberBdr}` }}>
          <Loader2 size={14} style={{ color: T.amber, animation: "spin 1s linear infinite" }} />
          <div>
            <span style={{ fontSize: 12, fontWeight: 500, color: T.amber }}>
              ✦ AI — Estrazione fatti in corso…
            </span>
            <p style={{ fontSize: 10, color: "rgba(0,0,0,0.45)", margin: "2px 0 0" }}>
              {filename} — L&apos;AI sta leggendo il documento per estrarre campi di compliance
            </p>
          </div>
        </div>
      )}

      {/* Done */}
      {status === "done" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.18)" }}>
            <CheckCircle2 size={14} style={{ color: T.green, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: T.green }}>
                {duplicate ? "Documento già presente" : "Documento caricato"}
              </span>
              {factsCount > 0 && (
                <span style={{ fontSize: 11, color: "rgba(0,0,0,0.5)", marginLeft: 8 }}>
                  — {factsCount} {factsCount === 1 ? "fatto estratto" : "fatti estratti"} ✦ AI
                </span>
              )}
              {factsCount === 0 && (
                <span style={{ fontSize: 11, color: "rgba(0,0,0,0.4)", marginLeft: 8 }}>
                  — Nessun campo rilevante trovato nel documento
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {factsCount > 0 && (
                <button
                  onClick={() => setShowFacts(v => !v)}
                  style={{ fontSize: 11, color: T.blue, background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}
                >
                  {showFacts ? "Nascondi" : "Vedi fatti"}
                </button>
              )}
              <button
                onClick={reset}
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(0,0,0,0.3)", padding: 2 }}
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {showFacts && documentId && (
            <div style={{ marginTop: 10 }}>
              <ExtractedFactsPanel
                documentId={documentId}
                onFactConfirmed={onFactConfirmed}
              />
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.18)" }}>
          <AlertTriangle size={14} style={{ color: T.red, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: T.red }}>Errore caricamento</span>
            {error && <p style={{ fontSize: 11, color: "rgba(0,0,0,0.5)", margin: "2px 0 0" }}>{error}</p>}
          </div>
          <button onClick={reset} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(0,0,0,0.3)", padding: 2 }}>
            <X size={13} />
          </button>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export { FileText };
