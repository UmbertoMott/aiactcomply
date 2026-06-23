"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Download, X, Pencil, Check, Bold, Italic, Underline, Highlighter } from "lucide-react";
import { readFromStorage, writeToStorage } from "@/lib/dossier/storage-schema";
import type { ClassifierResult, DataAuditResult } from "@/lib/dossier/storage-schema";
import { patchDPIA, patchShared } from "@/lib/assessment/assessment-helpers";
import type { DpiaGuidedDoc, DpiaAnswer } from "@/lib/dpia/dpia-guided-types";
import { createEmptyGuidedDoc, mapGuidedToDPIA } from "@/lib/dpia/dpia-guided-types";
import { computeGuidedDpiaProgress } from "@/lib/dpia/dpia-guided-progress";
import { DPIA_SUBPOINTS } from "@/lib/dpia/dpia-template";
import { DpiaProgressRail } from "./DpiaProgressRail";
import { DpiaLivePreview } from "./DpiaLivePreview";
import { DpiaGuidedChat } from "./DpiaGuidedChat";

const T = {
  border: "rgba(0,0,0,0.08)",
  bg:     "#f8f8f7",
  card:   "#ffffff",
  text:   "#0D1016",
  muted:  "rgba(0,0,0,0.42)",
  green:  "#23403a",
  amber:  "#b45309",
} as const;

const RAIL_W   = 220;
const SPLITTER = 6;

function simpleHash(obj: unknown): string {
  const s = JSON.stringify(obj ?? "");
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
  return h.toString(36);
}

interface DpiaGuidedModeProps {
  ghostClassifier?: ClassifierResult | null;
  ghostDataAudit?: DataAuditResult | null;
  onExitGuidedMode?: () => void;
}

export function DpiaGuidedMode({ ghostClassifier, ghostDataAudit, onExitGuidedMode }: DpiaGuidedModeProps) {
  const [doc, setDoc] = useState<DpiaGuidedDoc>(() => {
    const saved = readFromStorage<DpiaGuidedDoc>("dpiaGuided");
    return saved ?? createEmptyGuidedDoc();
  });

  const [activeSection, setActiveSection]       = useState<string | null>(null);
  const [forcedSubPointId, setForcedSubPointId] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading]             = useState(false);
  const [stale, setStale]                       = useState(false);
  const [lastSaved, setLastSaved]               = useState<Date | null>(null);

  // ── Documento: visibile solo se cliccato dal rail ─────────────────────────
  const [viewerOpen, setViewerOpen] = useState(false);
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

  // Al primo click apertura: divide lo spazio disponibile a metà
  const openViewer = useCallback(() => {
    if (!viewerOpen) {
      const total = layoutRef.current?.clientWidth ?? 1200;
      const avail = total - RAIL_W - SPLITTER;
      setDocWidth(Math.max(280, Math.floor(avail / 2)));
    }
    setViewerOpen(true);
  }, [viewerOpen]);

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

  const progress = computeGuidedDpiaProgress(doc);

  const saveDoc = useCallback((next: DpiaGuidedDoc) => {
    writeToStorage("dpiaGuided", next);
    setDoc(next);
    setLastSaved(new Date());
    const partial = mapGuidedToDPIA(next);
    patchDPIA(prev => ({ ...prev, ...partial }));
    const sysName = next.answers["a_system_name"];
    const purpose = next.answers["a_processing_purposes"];
    if (sysName?.status === "done") patchShared({ systemName: sysName.value });
    if (purpose?.status === "done") patchShared({ purpose: purpose.value });
  }, []);

  useEffect(() => {
    if (!doc.inputHash) { setStale(false); return; }
    const currentHash = simpleHash({ classifier: ghostClassifier, dataAudit: ghostDataAudit });
    setStale(doc.inputHash !== currentHash);
  }, [doc.inputHash, ghostClassifier, ghostDataAudit]);

  const handleAnswerUpdate = useCallback((subPointId: string, answer: DpiaAnswer) => {
    setDoc(prev => {
      const next: DpiaGuidedDoc = {
        ...prev,
        answers: { ...prev.answers, [subPointId]: answer },
        currentSubPointId: subPointId,
      };
      saveDoc(next);
      return next;
    });
    if (answer.status === "done") {
      const allIds = DPIA_SUBPOINTS.map(sp => sp.id);
      const idx = allIds.indexOf(subPointId);
      if (idx < allIds.length - 1) {
        setTimeout(() => setForcedSubPointId(allIds[idx + 1]), 200);
      }
    }
  }, [saveDoc]);

  const handleSectionClick = useCallback((sectionKey: string, anchor: string) => {
    setActiveSection(sectionKey);
    openViewer();
    // scroll al anchor dopo che il viewer è montato
    setTimeout(() => {
      if (viewerRef.current) {
        const el = viewerRef.current.querySelector(`#${anchor}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50);
  }, [openViewer]);

  const handleSubPointClick = useCallback((subPointId: string) => {
    setForcedSubPointId(subPointId);
    const sp = DPIA_SUBPOINTS.find(s => s.id === subPointId);
    if (sp) setActiveSection(sp.sectionKey);
  }, []);

  const handleExportPDF = async () => {
    setPdfLoading(true);
    try {
      const res = await fetch("/api/dpia-guided/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc }),
      });
      if (!res.ok) throw new Error("Errore nella generazione del PDF");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ?? "DPIA.pdf";
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

      {/* ── Toolbar ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 16px", background: T.card, borderBottom: `1px solid ${T.border}`,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: T.text, margin: 0 }}>DPIA guidata</p>
          <span style={{ fontSize: 10, color: T.muted }}>
            WP248 Allegato 2 · {progress.overallPercent}% completata
          </span>
          {lastSaved && (
            <span style={{ fontSize: 9, color: T.green }}>✓ Salvato automaticamente</span>
          )}
          {stale && (
            <span style={{
              fontSize: 9, fontWeight: 700, color: T.amber,
              background: "rgba(180,83,9,0.08)", border: "1px solid rgba(180,83,9,0.2)",
              borderRadius: 9999, padding: "2px 8px",
            }}>
              ⚠ Dati aggiornati — da rivedere
            </span>
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

      {/* ── Layout: [Rail] [Doc?] [Splitter?] [Chat] ── */}
      <div
        ref={layoutRef}
        style={{ flex: 1, display: "flex", minHeight: 0, userSelect: isResizing ? "none" : "auto" }}
      >

        {/* SINISTRA — Avanzamento (220px fissi) */}
        <div style={{
          width: RAIL_W, flexShrink: 0,
          borderRight: `1px solid ${T.border}`,
          overflow: "hidden", display: "flex", flexDirection: "column",
          background: "#fafafa",
        }}>
          <DpiaProgressRail
            progress={progress}
            activeSection={activeSection}
            onSectionClick={handleSectionClick}
            onSubPointClick={handleSubPointClick}
          />
        </div>

        {/* CENTRO — Documento live (solo se viewerOpen) */}
        {viewerOpen && (
          <>
            <div style={{
              width: docWidth, flexShrink: 0, minWidth: 260, maxWidth: "65%",
              display: "flex", flexDirection: "column",
              border: "none", borderLeft: `1px solid ${T.border}`,
              overflow: "hidden", background: T.card,
            }}>
              {/* Header stile Risk Register */}
              <div style={{
                padding: "8px 12px", borderBottom: `1px solid rgba(0,0,0,0.07)`,
                background: "#fafafa", display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 9, fontWeight: 600, color: "rgba(0,0,0,0.35)", letterSpacing: "0.8px", textTransform: "uppercase", margin: 0 }}>
                    Art. 35 GDPR · Documento
                  </p>
                  <p style={{ fontSize: 12, fontWeight: 700, color: T.text, margin: "1px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    DPIA — WP248 rev.01
                  </p>
                </div>

                {/* Toolbar formattazione (solo in edit) */}
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

                <button
                  onClick={() => { setViewerOpen(false); setEditing(false); }}
                  title="Chiudi documento"
                  style={{
                    flexShrink: 0, width: 24, height: 24, borderRadius: 12,
                    background: "rgba(0,0,0,0.05)", border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "rgba(0,0,0,0.45)",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.10)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(0,0,0,0.05)")}
                >
                  <X size={12} />
                </button>
              </div>

              {/* Contenuto scrollabile */}
              <div ref={viewerRef} style={{ flex: 1, overflowY: "auto", padding: "16px", background: "#FAFAFA" }}>
                {editing ? (
                  /* Modalità modifica — contentEditable */
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
                  /* HTML salvato dall'utente */
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
                  /* Preview React live */
                  <div ref={previewRef}>
                    <DpiaLivePreview doc={doc} activeSection={activeSection} />
                  </div>
                )}
              </div>
            </div>

            {/* Splitter trascinabile */}
            <div
              onMouseDown={startResize}
              style={{
                width: SPLITTER, flexShrink: 0, cursor: "col-resize",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: isResizing ? "rgba(0,0,0,0.10)" : "transparent",
                transition: isResizing ? "none" : "background 0.15s",
              }}
              onMouseEnter={e => { if (!isResizing) e.currentTarget.style.background = "rgba(0,0,0,0.06)"; }}
              onMouseLeave={e => { if (!isResizing) e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{ width: 2, height: 28, borderRadius: 1, background: "rgba(0,0,0,0.18)" }} />
            </div>
          </>
        )}

        {/* DESTRA — Chat (flex:1 — prende tutto se documento chiuso) */}
        <div style={{
          flex: 1, minWidth: 0,
          borderLeft: `1px solid ${T.border}`,
          overflow: "hidden", display: "flex", flexDirection: "column",
        }}>
          <DpiaGuidedChat
            doc={doc}
            ghostClassifier={ghostClassifier}
            ghostDataAudit={ghostDataAudit}
            onAnswerUpdate={handleAnswerUpdate}
            onNavigateToSubPoint={setForcedSubPointId}
            forcedSubPointId={forcedSubPointId}
          />
        </div>

      </div>
    </div>
  );
}
