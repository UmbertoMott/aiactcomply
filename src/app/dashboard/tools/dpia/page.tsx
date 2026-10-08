"use client";
// DPIA (Art. 35 GDPR; Art. 26(9) AI Act). Un solo percorso: la procedura guidata
// (guida a sinistra, documento al centro, domande a destra). Il modello EDPB completo
// resta raggiungibile solo da un link secondario ("Modifica tutte le risposte").
import React, { useState } from "react";
import Link from "next/link";
import SignOffPanel from "@/components/ui/SignOffPanel";
import { DpiaGuidedMode } from "@/components/dpia/DpiaGuidedMode";
import DpiaEdpbForm from "@/components/dpia/DpiaEdpbForm";
import { SystemSelector } from "@/components/compliance/SystemSelector";
import { readFromStorage, type ClassifierResult, type DataAuditResult } from "@/lib/dossier/storage-schema";
import { useT } from "@/i18n/LocaleProvider";

const T = { text: "#0D1016", muted: "#0D1016", border: "rgba(0,0,0,0.08)", bg: "#f8f8f7" } as const;

export default function DPIAPage() {
  const tr = useT("toolDpia");
  // Si entra sempre nella procedura guidata; il modulo completo si apre solo su richiesta
  // (la vecchia scelta salvata in localStorage non viene più ripristinata).
  const [guidedMode, setGuidedMode] = useState(true);

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
      <div style={{ marginBottom: 14, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <button
          onClick={() => setGuidedMode(true)}
          style={{ fontSize: 11, padding: 0, border: "none", background: "none", color: T.text, textDecoration: "underline", textUnderlineOffset: 2, cursor: "pointer" }}
        >
          ← {tr("gm_backToGuided")}
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
