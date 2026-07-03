"use client";
import React, { useState, useRef, useCallback } from "react";
import { Download, X } from "lucide-react";
import { readFromStorage, writeToStorage } from "@/lib/dossier/storage-schema";
import type { RiskRegisterGuidedDoc, RiskRegisterAnswer } from "@/lib/risk/risk-register-guided-types";
import { createEmptyRiskRegisterGuidedDoc, RISK_REGISTER_SECTIONS, RISK_REGISTER_SUBPOINTS } from "@/lib/risk/risk-register-guided-types";
import { computeGuidedRRProgress } from "@/lib/risk/risk-register-guided-progress";
import { RiskRegisterProgressRail } from "./RiskRegisterProgressRail";
import { RiskRegisterGuidedChat } from "./RiskRegisterGuidedChat";

const T = {
  border: "rgba(0,0,0,0.08)",
  bg:     "#f8f8f7",
  card:   "#ffffff",
  text:   "#0D1016",
  muted:  "rgba(0,0,0,0.42)",
  faint:  "rgba(0,0,0,0.22)",
  green:  "#23403a",
} as const;

const RAIL_W   = 256;
const SPLITTER = 6;

function LivePreview({ doc }: { doc: RiskRegisterGuidedDoc }) {
  const answered = RISK_REGISTER_SUBPOINTS.filter(sp => doc.answers[sp.id]?.status === "done");
  const bySection = RISK_REGISTER_SECTIONS.map(sec => ({
    sec,
    items: answered.filter(sp => sp.sectionKey === sec.key),
  })).filter(g => g.items.length > 0);

  if (bySection.length === 0) {
    return (
      <div style={{ padding: "32px 24px", textAlign: "center", color: T.muted }}>
        <p style={{ fontSize: 12 }}>Le risposte appariranno qui man mano che completi la chat guidata.</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 13, color: T.text, lineHeight: 1.7 }}>
      <div style={{ background: T.card, borderRadius: 8, padding: "28px 32px", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: T.text, letterSpacing: "-0.5px" }}>
          Risk Register — Art. 9 EU AI Act
        </h1>
        <p style={{ fontSize: 10, fontFamily: "monospace", color: T.muted, marginBottom: 24, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          ISO/IEC 23894 · Reg. (UE) 2024/1689
        </p>

        {bySection.map(({ sec, items }) => (
          <div key={sec.key} id={sec.anchor} style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: T.text, borderBottom: "1.5px solid rgba(0,0,0,0.10)", paddingBottom: 6, marginBottom: 12, letterSpacing: "-0.2px" }}>
              {sec.label}
            </h2>
            <p style={{ fontSize: 9, fontFamily: "monospace", color: T.muted, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {sec.legalRef}
            </p>
            {items.map(sp => (
              <div key={sp.id} style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 10, fontFamily: "monospace", fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>
                  {sp.label}
                </p>
                <p style={{ fontSize: 12.5, color: T.text, lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>
                  {doc.answers[sp.id]?.value}
                </p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

interface RiskRegisterGuidedModeProps {
  onExitGuidedMode?: () => void;
}

export function RiskRegisterGuidedMode({ onExitGuidedMode }: RiskRegisterGuidedModeProps) {
  const [doc, setDoc] = useState<RiskRegisterGuidedDoc>(() => {
    const saved = readFromStorage<RiskRegisterGuidedDoc>("riskRegisterGuided");
    return saved ?? createEmptyRiskRegisterGuidedDoc();
  });

  const [activeSection, setActiveSection]       = useState<string | null>(null);
  const [forcedSubPointId, setForcedSubPointId] = useState<string | null>(null);
  const [lastSaved, setLastSaved]               = useState<Date | null>(null);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [docWidth, setDocWidth]     = useState(380);
  const [isResizing, setIsResizing] = useState(false);

  const layoutRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  const progress = computeGuidedRRProgress(doc);

  const saveDoc = useCallback((next: RiskRegisterGuidedDoc) => {
    writeToStorage("riskRegisterGuided", next);
    setDoc(next);
    setLastSaved(new Date());
  }, []);

  const handleAnswerUpdate = useCallback((subPointId: string, answer: RiskRegisterAnswer) => {
    setDoc(prev => {
      const next: RiskRegisterGuidedDoc = {
        ...prev,
        answers: { ...prev.answers, [subPointId]: answer },
        currentSubPointId: subPointId,
      };
      saveDoc(next);
      return next;
    });
    if (answer.status === "done") {
      const allIds = RISK_REGISTER_SUBPOINTS.map(sp => sp.id);
      const idx = allIds.indexOf(subPointId);
      if (idx < allIds.length - 1) {
        setTimeout(() => setForcedSubPointId(allIds[idx + 1]), 200);
      }
    }
  }, [saveDoc]);

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

  const handleSectionClick = useCallback((sectionKey: string, anchor: string) => {
    setActiveSection(sectionKey);
    openViewer();
    setTimeout(() => {
      if (viewerRef.current) {
        const el = viewerRef.current.querySelector(`#${anchor}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50);
  }, [openViewer]);

  const handleSubPointClick = useCallback((subPointId: string) => {
    setForcedSubPointId(subPointId);
    const sp = RISK_REGISTER_SUBPOINTS.find(s => s.id === subPointId);
    if (sp) setActiveSection(sp.sectionKey);
  }, []);

  const handleExportJSON = () => {
    const data = JSON.stringify(doc, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "risk-register-guidato.json";
    a.click();
    URL.revokeObjectURL(url);
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
          <p style={{ fontSize: 12, fontWeight: 700, color: T.text, margin: 0 }}>Risk Register guidato</p>
          <span style={{ fontSize: 10, color: T.muted }}>
            Art. 9 AI Act · {progress.overallPercent}% completato
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
              Vai alla modalità completa →
            </button>
          )}
          <button
            onClick={handleExportJSON}
            disabled={progress.overallPercent < 5}
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
            Esporta JSON
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
          <RiskRegisterProgressRail
            progress={progress}
            activeSection={activeSection}
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
              borderLeft: `1px solid ${T.border}`,
              overflow: "hidden", background: T.card,
            }}>
              {/* Header documento */}
              <div style={{
                padding: "8px 12px", borderBottom: `1px solid rgba(0,0,0,0.07)`,
                background: "#fafafa", display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 9, fontWeight: 600, color: "rgba(0,0,0,0.35)", letterSpacing: "0.8px", textTransform: "uppercase", margin: 0 }}>
                    Art. 9 AI Act · Documento
                  </p>
                  <p style={{ fontSize: 12, fontWeight: 700, color: T.text, margin: "1px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    Risk Register — ISO 23894
                  </p>
                </div>
                <button
                  onClick={() => setViewerOpen(false)}
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
                <LivePreview doc={doc} />
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
          <RiskRegisterGuidedChat
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
