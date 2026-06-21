"use client";
// Wrapper della modalità "DPIA guidata" — layout 3 colonne:
//   [AVANZAMENTO] [VIEWER] [CHAT]
// Gestisce lo stato DpiaGuidedDoc, lo persiste con readFromStorage/writeToStorage,
// e sincronizza su DPIAResult via mapGuidedToDPIA() + patchDPIA().
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

// ─── Token ────────────────────────────────────────────────────────────────────
const T = {
  border: "rgba(0,0,0,0.08)",
  bg:     "#f8f8f7",
  card:   "#ffffff",
  text:   "#0D1016",
  muted:  "rgba(0,0,0,0.42)",
  green:  "#23403a",
  amber:  "#b45309",
} as const;

// ─── Staleness hash ───────────────────────────────────────────────────────────
function simpleHash(obj: unknown): string {
  const s = JSON.stringify(obj ?? "");
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
  return h.toString(36);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface DpiaGuidedModeProps {
  ghostClassifier?: ClassifierResult | null;
  ghostDataAudit?: DataAuditResult | null;
}

export function DpiaGuidedMode({ ghostClassifier, ghostDataAudit }: DpiaGuidedModeProps) {
  const [doc, setDoc] = useState<DpiaGuidedDoc>(() => {
    const saved = readFromStorage<DpiaGuidedDoc>("dpiaGuided");
    return saved ?? createEmptyGuidedDoc();
  });

  const [activeSection, setActiveSection] = useState<string | null>("screening");
  const [forcedSubPointId, setForcedSubPointId] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [stale, setStale] = useState(false);

  const viewerRef = useRef<HTMLDivElement>(null);

  // Calcolo avanzamento
  const progress = computeGuidedDpiaProgress(doc);

  // Persistenza e sync DPIAResult
  const saveDoc = useCallback((next: DpiaGuidedDoc) => {
    writeToStorage("dpiaGuided", next);
    setDoc(next);

    // Sync su DPIAResult per DocuGen / form a 6 step
    const partial = mapGuidedToDPIA(next);
    patchDPIA(prev => ({ ...prev, ...partial }));

    // Patch shared con dati base
    const sysName = next.answers["a_system_name"];
    const purpose = next.answers["a_processing_purposes"];
    if (sysName?.status === "done") patchShared({ systemName: sysName.value });
    if (purpose?.status === "done") patchShared({ purpose: purpose.value });
  }, []);

  // Staleness: se ghost data cambia rispetto all'hash al momento del sign-off
  useEffect(() => {
    if (!doc.inputHash) { setStale(false); return; }
    const currentHash = simpleHash({ classifier: ghostClassifier, dataAudit: ghostDataAudit });
    setStale(doc.inputHash !== currentHash);
  }, [doc.inputHash, ghostClassifier, ghostDataAudit]);

  // Aggiornamento risposta dalla chat
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
    // Avanza al prossimo sotto-punto automaticamente se confermato
    if (answer.status === "done") {
      const allIds = DPIA_SUBPOINTS.map(sp => sp.id);
      const idx = allIds.indexOf(subPointId);
      if (idx < allIds.length - 1) {
        setTimeout(() => setForcedSubPointId(allIds[idx + 1]), 200);
      }
    }
  }, [saveDoc]);

  // Navigazione sezione (dal Rail)
  const handleSectionClick = useCallback((sectionKey: string, anchor: string) => {
    setActiveSection(sectionKey);
    if (viewerRef.current) {
      const el = viewerRef.current.querySelector(`#${anchor}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // Navigazione sotto-punto (da Rail → Chat)
  const handleSubPointClick = useCallback((subPointId: string) => {
    setForcedSubPointId(subPointId);
    // Aggiorna anche la sezione attiva
    const sp = DPIA_SUBPOINTS.find(s => s.id === subPointId);
    if (sp) setActiveSection(sp.sectionKey);
  }, []);

  // Export PDF
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
        <button
          onClick={handleExportPDF}
          disabled={pdfLoading || progress.overallPercent < 20}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 12px", borderRadius: 7,
            border: `1px solid rgba(0,0,0,0.10)`, background: T.card,
            cursor: progress.overallPercent < 20 ? "default" : "pointer",
            fontSize: 11, fontWeight: 600, color: progress.overallPercent < 20 ? "rgba(0,0,0,0.28)" : T.text,
          }}
        >
          <Download style={{ width: 13, height: 13 }} />
          {pdfLoading ? "Generazione…" : "Genera PDF"}
        </button>
      </div>

      {/* ── Layout 3 colonne ── */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "200px 1fr 280px", minHeight: 0, overflow: "hidden" }}>
        {/* SINISTRA — Avanzamento */}
        <div style={{ borderRight: `1px solid ${T.border}`, overflow: "hidden" }}>
          <DpiaProgressRail
            progress={progress}
            activeSection={activeSection}
            onSectionClick={handleSectionClick}
            onSubPointClick={handleSubPointClick}
          />
        </div>

        {/* CENTRO — Viewer */}
        <div ref={viewerRef} style={{ overflowY: "auto", background: T.bg }}>
          <DpiaLivePreview doc={doc} activeSection={activeSection} />
        </div>

        {/* DESTRA — Chat */}
        <div style={{ borderLeft: `1px solid ${T.border}`, overflow: "hidden" }}>
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
