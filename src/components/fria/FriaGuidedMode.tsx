"use client";
import React, { useState, useRef, useCallback } from "react";
import { Download, Pencil, Check, Bold, Italic, Underline, Highlighter } from "lucide-react";
import { readFromStorage, writeToStorage } from "@/lib/dossier/storage-schema";
import type { FriaGuidedDoc, FriaAnswer } from "@/lib/fria/fria-guided-types";
import { createEmptyFriaGuidedDoc } from "@/lib/fria/fria-guided-types";
import { computeGuidedFriaProgress } from "@/lib/fria/fria-guided-progress";
import { FRIA_SUBPOINTS } from "@/lib/fria/fria-template";
import { FriaProgressRail } from "./FriaProgressRail";
import { FriaLivePreview } from "./FriaLivePreview";
import { FriaGuidedChat } from "./FriaGuidedChat";

const T = {
  border: "rgba(0,0,0,0.08)",
  bg:     "#f8f8f7",
  card:   "#ffffff",
  text:   "#0D1016",
  muted:  "rgba(0,0,0,0.42)",
  green:  "#23403a",
  amber:  "#b45309",
} as const;

const RAIL_W   = 256;
const SPLITTER = 6;

interface FriaGuidedModeProps {
  onExitGuidedMode?: () => void;
}

export function FriaGuidedMode({ onExitGuidedMode }: FriaGuidedModeProps) {
  const [doc, setDoc] = useState<FriaGuidedDoc>(() => {
    const saved = readFromStorage<FriaGuidedDoc>("friaGuided");
    return saved ?? createEmptyFriaGuidedDoc();
  });

  const [activeSection, setActiveSection]       = useState<string | null>(null);
  const [forcedSubPointId, setForcedSubPointId] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading]             = useState(false);
  const [lastSaved, setLastSaved]               = useState<Date | null>(null);

  const [viewerOpen, setViewerOpen] = useState(true);
  const [docWidth, setDocWidth]     = useState(380);
  const [isResizing, setIsResizing] = useState(false);
  const [editing, setEditing]       = useState(false);
  const [editedHtml, setEditedHtml] = useState<string | null>(null);

  const layoutRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const editRef   = useRef<HTMLDivElement>(null);

  const exec = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editRef.current?.focus();
  };

  const enterEdit = () => {
    const source = editedHtml ?? previewRef.current?.innerHTML ?? "";
    setEditing(true);
    setTimeout(() => {
      if (editRef.current) {
        editRef.current.innerHTML = source;
        editRef.current.querySelectorAll("[data-noedit]").forEach(el => {
          (el as HTMLElement).contentEditable = "false";
        });
        // Strip inline color from editable elements — prevents cursor inheriting
        // stale color (e.g. red) from a previously styled value element
        editRef.current.querySelectorAll("p, span, em, i, b, strong").forEach(el => {
          const htmlEl = el as HTMLElement;
          if (!htmlEl.closest("[data-noedit]")) htmlEl.style.color = "";
        });
        editRef.current.focus();
      }
    }, 0);
  };

  const confirmEdit = () => {
    if (editRef.current) setEditedHtml(editRef.current.innerHTML);
    setEditing(false);
  };

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX     = e.clientX;
    const startWidth = docWidth;
    const onMove = (ev: MouseEvent) => {
      const total = layoutRef.current?.clientWidth ?? 1200;
      const max   = (total - RAIL_W - SPLITTER) * 0.70;
      setDocWidth(Math.min(Math.max(startWidth + (ev.clientX - startX), 260), max));
    };
    const onUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [docWidth]);

  const progress = computeGuidedFriaProgress(doc);

  const saveDoc = useCallback((next: FriaGuidedDoc) => {
    writeToStorage("friaGuided", next);
    setDoc(next);
    setLastSaved(new Date());
  }, []);

  const handleAnswerUpdate = useCallback((subPointId: string, answer: FriaAnswer) => {
    setDoc(prev => {
      const next: FriaGuidedDoc = {
        ...prev,
        answers: { ...prev.answers, [subPointId]: answer },
        currentSubPointId: subPointId,
      };
      saveDoc(next);
      return next;
    });
    if (answer.status === "done") {
      const allIds = FRIA_SUBPOINTS.map(sp => sp.id);
      const idx = allIds.indexOf(subPointId);
      if (idx < allIds.length - 1) {
        setTimeout(() => setForcedSubPointId(allIds[idx + 1]), 200);
      }
    }
  }, [saveDoc]);

  const handleSectionClick = useCallback((sectionKey: string, anchor: string) => {
    setActiveSection(sectionKey);
    setTimeout(() => {
      if (viewerRef.current) {
        const el = viewerRef.current.querySelector(`#${anchor}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50);
  }, []);

  const handleSubPointClick = useCallback((subPointId: string) => {
    setForcedSubPointId(subPointId);
    const sp = FRIA_SUBPOINTS.find(s => s.id === subPointId);
    if (sp) setActiveSection(sp.sectionKey);
  }, []);

  const handleExportPDF = async () => {
    setPdfLoading(true);
    try {
      const res = await fetch("/api/fria-guided/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc }),
      });
      if (!res.ok) throw new Error("Errore nella generazione del PDF");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ?? "FRIA.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Errore PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>

      {/* Toolbar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 16px", background: T.card, borderBottom: `1px solid ${T.border}`,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: T.text, margin: 0 }}>FRIA guidata</p>
          <span style={{ fontSize: 10, color: T.muted }}>
            Art. 27 AI Act · {progress.overallPercent}% completata
          </span>
          {lastSaved && (
            <span style={{ fontSize: 9, color: T.green }}>✓ Salvato automaticamente</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {onExitGuidedMode && (
            <button
              onClick={onExitGuidedMode}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 7,
                border: `1px solid ${T.green}`, background: T.green,
                cursor: "pointer", fontSize: 11, fontWeight: 700, color: "#fff",
              }}
            >
              Vai al Form completo →
            </button>
          )}
          <button
            onClick={handleExportPDF}
            disabled={pdfLoading || progress.overallPercent < 5}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px", borderRadius: 7,
              border: `1px solid rgba(0,0,0,0.10)`, background: T.card,
              cursor: progress.overallPercent < 5 ? "default" : "pointer",
              fontSize: 11, fontWeight: 600,
              color: progress.overallPercent < 5 ? "rgba(0,0,0,0.28)" : T.text,
            }}
          >
            <Download style={{ width: 13, height: 13 }} />
            {pdfLoading ? "Generazione…" : "Genera PDF"}
          </button>
        </div>
      </div>

      {/* Layout: [Rail] [Doc?] [Splitter?] [Chat] */}
      <div
        ref={layoutRef}
        style={{ flex: 1, display: "flex", minHeight: 0, gap: 12, padding: "12px", userSelect: isResizing ? "none" : "auto" }}
      >
        {/* SINISTRA — Rail avanzamento */}
        <div style={{
          width: RAIL_W, flexShrink: 0,
          border: `1px solid rgba(0,0,0,0.07)`,
          borderRadius: 10,
          overflow: "hidden", display: "flex", flexDirection: "column",
          background: "#fafafa",
        }}>
          <FriaProgressRail
            progress={progress}
            activeSection={activeSection}
            currentSubPointId={forcedSubPointId ?? doc.currentSubPointId}
            onSectionClick={handleSectionClick}
            onSubPointClick={handleSubPointClick}
          />
        </div>

        {/* CENTRO — Documento live */}
        {viewerOpen && (
          <>
            <div style={{
              width: docWidth, flexShrink: 0, minWidth: 260, maxWidth: "65%",
              display: "flex", flexDirection: "column",
              border: "none", borderLeft: `1px solid ${T.border}`,
              overflow: "hidden", background: T.card,
            }}>
              {/* Header documento */}
              <div style={{
                padding: "8px 12px", borderBottom: `1px solid rgba(0,0,0,0.07)`,
                background: "#fafafa", display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 9, fontWeight: 600, color: "rgba(0,0,0,0.35)", letterSpacing: "0.8px", textTransform: "uppercase", margin: 0 }}>
                    Art. 27 AI Act · Documento
                  </p>
                  <p style={{ fontSize: 12, fontWeight: 700, color: T.text, margin: "1px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    FRIA — DIHR/ECNL 2025
                  </p>
                </div>

                {/* Toolbar formattazione */}
                {editing && (
                  <div style={{ display: "flex", alignItems: "center", gap: 2, padding: "2px 4px", background: T.card, border: `1px solid ${T.border}`, borderRadius: 8 }}>
                    {([
                      { icon: <Bold size={12} />,        cmd: "bold",        title: "Grassetto" },
                      { icon: <Italic size={12} />,      cmd: "italic",      title: "Corsivo" },
                      { icon: <Underline size={12} />,   cmd: "underline",   title: "Sottolineato" },
                      { icon: <Highlighter size={12} />, cmd: "hiliteColor", title: "Evidenzia", val: "#fef08a" },
                    ] as { icon: React.ReactNode; cmd: string; title: string; val?: string }[]).map(b => (
                      <button
                        key={b.cmd}
                        onMouseDown={e => { e.preventDefault(); exec(b.cmd, b.val); }}
                        title={b.title}
                        style={{
                          width: 24, height: 24, borderRadius: 5, border: "none",
                          background: "transparent", cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "rgba(0,0,0,0.55)",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.07)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        {b.icon}
                      </button>
                    ))}
                  </div>
                )}

                {/* Matita / conferma */}
                <button
                  onClick={editing ? confirmEdit : enterEdit}
                  title={editing ? "Salva modifiche" : "Modifica documento"}
                  style={{
                    flexShrink: 0, width: 26, height: 26, borderRadius: 6,
                    background: editing ? T.text : "transparent",
                    color: editing ? "#fff" : "rgba(0,0,0,0.45)",
                    border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={e => { if (!editing) e.currentTarget.style.background = "rgba(0,0,0,0.07)"; }}
                  onMouseLeave={e => { if (!editing) e.currentTarget.style.background = "transparent"; }}
                >
                  {editing ? <Check size={12} /> : <Pencil size={12} />}
                </button>

              </div>

              {/* Contenuto scrollabile */}
              <div ref={viewerRef} style={{ flex: 1, overflowY: "auto", padding: "16px", background: "#FAFAFA" }}>
                {editing ? (
                  <div
                    ref={editRef}
                    contentEditable
                    suppressContentEditableWarning
                    style={{
                      outline: "none", minHeight: 400,
                      fontFamily: "Georgia, 'Times New Roman', serif",
                      fontSize: 13, color: T.text, lineHeight: 1.7,
                      background: T.card, borderRadius: 8, padding: "28px 32px",
                      border: "1px solid rgba(13,16,22,0.25)",
                      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                    }}
                  />
                ) : editedHtml ? (
                  <div
                    ref={previewRef}
                    dangerouslySetInnerHTML={{ __html: editedHtml }}
                    style={{
                      fontFamily: "Georgia, 'Times New Roman', serif",
                      fontSize: 13, color: T.text, lineHeight: 1.7,
                      background: T.card, borderRadius: 8, padding: "28px 32px",
                      border: "1px solid rgba(0,0,0,0.08)",
                      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                    }}
                  />
                ) : (
                  <div ref={previewRef}>
                    <FriaLivePreview doc={doc} activeSection={activeSection} />
                  </div>
                )}
              </div>
            </div>

            {/* Splitter */}
            <div
              onMouseDown={startResize}
              style={{
                width: SPLITTER, flexShrink: 0, cursor: "col-resize",
                background: isResizing ? "rgba(35,64,58,0.15)" : "transparent",
                borderLeft: `1px solid ${T.border}`,
                transition: "background 0.15s",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.06)")}
              onMouseLeave={e => { if (!isResizing) e.currentTarget.style.background = "transparent"; }}
            />
          </>
        )}

        {/* DESTRA — Chat guidata */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <FriaGuidedChat
            doc={doc}
            onAnswerUpdate={handleAnswerUpdate}
            onNavigateToSubPoint={handleSubPointClick}
            forcedSubPointId={forcedSubPointId}
          />
        </div>
      </div>
    </div>
  );
}
