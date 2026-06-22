"use client";
// Wrapper della modalità "DPIA guidata" — layout 3 colonne:
//   [AVANZAMENTO 220px] [VIEWER ridimensionabile] [splitter 6px] [CHAT flex:1]
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Download } from "lucide-react";
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

const RAIL_W    = 220;
const SPLITTER  = 6;

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

  const [activeSection, setActiveSection]     = useState<string | null>("screening");
  const [forcedSubPointId, setForcedSubPointId] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading]           = useState(false);
  const [stale, setStale]                     = useState(false);
  const [lastSaved, setLastSaved]             = useState<Date | null>(null);

  // ── Resize splitter ────────────────────────────────────────────────────────
  const [previewWidth, setPreviewWidth] = useState(0); // 0 = non ancora misurato
  const [isResizing, setIsResizing]     = useState(false);
  const layoutRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  // Al mount, divide lo spazio disponibile a metà tra viewer e chat
  useEffect(() => {
    const el = layoutRef.current;
    if (!el) return;
    const avail = el.clientWidth - RAIL_W - SPLITTER;
    setPreviewWidth(Math.max(260, Math.floor(avail / 2)));
  }, []);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX     = e.clientX;
    const startWidth = previewWidth;
    const onMove = (ev: MouseEvent) => {
      const total = layoutRef.current?.clientWidth ?? 1200;
      const max   = (total - RAIL_W - SPLITTER) * 0.72;
      setPreviewWidth(Math.min(Math.max(startWidth + (ev.clientX - startX), 220), max));
    };
    const onUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [previewWidth]);

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
    if (viewerRef.current) {
      const el = viewerRef.current.querySelector(`#${anchor}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

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
            Allegato 2 WP248 · {progress.overallPercent}% completata
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

      {/* ── Layout 3 colonne con splitter trascinabile ── */}
      <div ref={layoutRef} style={{ flex: 1, display: "flex", minHeight: 0, userSelect: isResizing ? "none" : "auto" }}>

        {/* SINISTRA — Rail (220px fissi) */}
        <div style={{
          width: RAIL_W, flexShrink: 0,
          borderRight: `1px solid ${T.border}`,
          overflow: "hidden", display: "flex", flexDirection: "column",
        }}>
          <DpiaProgressRail
            progress={progress}
            activeSection={activeSection}
            onSectionClick={handleSectionClick}
            onSubPointClick={handleSubPointClick}
          />
        </div>

        {/* CENTRO — Documento live (larghezza uguale alla chat all'avvio, poi ridimensionabile) */}
        <div ref={viewerRef} style={{
          width: previewWidth || undefined,
          flex: previewWidth ? undefined : 1,
          flexShrink: 0,
          overflowY: "auto", background: T.bg,
          minWidth: 220,
        }}>
          <DpiaLivePreview doc={doc} activeSection={activeSection} />
        </div>

        {/* SPLITTER trascinabile */}
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

        {/* DESTRA — Chat (flex:1 — prende lo spazio rimanente) */}
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
