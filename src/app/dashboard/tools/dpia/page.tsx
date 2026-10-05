"use client";
// DPIA (Art. 35 GDPR; Art. 26(9) AI Act). Un solo percorso in due viste dello stesso lavoro:
// - modalità guidata: guida a sinistra, documento al centro, chat a destra (ingresso);
// - modulo completo: il modello EDPB da compilare direttamente.
import React, { useCallback, useState } from "react";
import Link from "next/link";
import SignOffPanel from "@/components/ui/SignOffPanel";
import { DpiaGuidedMode } from "@/components/dpia/DpiaGuidedMode";
import DpiaEdpbForm from "@/components/dpia/DpiaEdpbForm";
import { SystemSelector } from "@/components/compliance/SystemSelector";
import { readFromStorage, type ClassifierResult, type DataAuditResult } from "@/lib/dossier/storage-schema";
import { useT } from "@/i18n/LocaleProvider";

const T = { text: "#0D1016", muted: "rgba(0,0,0,0.42)", border: "rgba(0,0,0,0.08)", bg: "#f8f8f7" } as const;
const VIEW_KEY = "aicomply_dpia_view";

export default function DPIAPage() {
  const tr = useT("toolDpia");
  // Il layout della dashboard monta le pagine solo nel browser: localStorage è disponibile
  const [guidedMode, setGuidedModeState] = useState(() => {
    try { return localStorage.getItem(VIEW_KEY) !== "form"; } catch { return true; }
  });
  const setGuidedMode = useCallback((v: boolean) => {
    setGuidedModeState(v);
    try { localStorage.setItem(VIEW_KEY, v ? "guided" : "form"); } catch { /* storage non disponibile */ }
  }, []);

  if (guidedMode) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: T.bg }}>
        <div style={{ padding: "12px 20px 0", flexShrink: 0 }}>
          <SystemSelector checkProhibited={true} />
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          <DpiaGuidedMode
            ghostClassifier={readFromStorage<ClassifierResult>("classifier")}
            ghostDataAudit={readFromStorage<DataAuditResult>("dataAudit")}
            onExitGuidedMode={() => setGuidedMode(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, padding: "24px 32px" }}>
      <SystemSelector checkProhibited={true} />
      <div style={{ marginBottom: 14, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button
          onClick={() => setGuidedMode(true)}
          style={{ fontSize: 11, fontWeight: 600, padding: "6px 12px", borderRadius: 8, border: "none", background: T.text, color: "#fff", cursor: "pointer" }}
        >
          {tr("modeGuidedTitle")} — {tr("modeGuidedDescShort")}
        </button>
        <Link href="/dashboard/tools/assessment-export" style={{ fontSize: 11, fontWeight: 600, padding: "6px 12px", borderRadius: 8, border: `1px solid ${T.border}`, background: "#fff", color: T.text }}>
          {tr("exportWithFria")}
        </Link>
      </div>
      <DpiaEdpbForm />
      <div style={{ marginTop: 24 }}>
        <SignOffPanel toolKey="dpia" toolLabel={tr("signOffLabel")} />
      </div>
    </div>
  );
}
