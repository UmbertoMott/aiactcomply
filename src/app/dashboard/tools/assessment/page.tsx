"use client";
import React, { useState, useEffect } from "react";
import type { CSSProperties } from "react";
import { SystemSelector } from "@/components/compliance/SystemSelector";
import { AssessmentSharedHeader } from "@/components/assessment/AssessmentSharedHeader";
import { UnifiedIntake } from "@/components/assessment/UnifiedIntake";
import { SharedSpine } from "@/components/assessment/SharedSpine";
import { CorrelatedRisksPanel } from "@/components/assessment/CorrelatedRisksPanel";
import { DpiaBranch } from "@/components/assessment/DpiaBranch";
import { FriaBranch } from "@/components/assessment/FriaBranch";
import { AssessmentSignOff } from "@/components/assessment/AssessmentSignOff";
import {
  getAssessment, patchShared, patchDPIA, patchFRIA,
  syncCorrelatedRisksFromDPIA, syncCorrelatedRisksFromFRIA,
  migrateLegacyFRIA,
} from "@/lib/assessment/assessment-helpers";
import type { AssessmentShared } from "@/lib/assessment/assessment-schema";
import type { DPIAResult } from "@/lib/dossier/storage-schema";
import type { FRIADocument } from "@/lib/simulation/fria-engine";
import type { IntakeContext } from "@/app/actions/parseIntakeContext";
import { T } from "@/components/assessment/tokens";
import { UnifiedDraftPanel } from "@/components/assessment/UnifiedDraftPanel";

const cardSt: CSSProperties = {
  background: T.card, border: `1px solid ${T.border}`,
  borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};

type AssessmentStage = "intake" | "spine" | "branch" | "draft" | "export";

const STAGES: { key: AssessmentStage; label: string; idx: number }[] = [
  { key: "intake",  label: "① Intake",           idx: 0 },
  { key: "spine",   label: "② Dati Condivisi",   idx: 1 },
  { key: "branch",  label: "③ Rami DPIA/FRIA",   idx: 2 },
  { key: "draft",   label: "④ Bozza AI",          idx: 3 },
  { key: "export",  label: "⑤ Export",            idx: 4 },
];

function stageIndex(s: AssessmentStage): number {
  return STAGES.find(x => x.key === s)!.idx;
}

function primaryBtn(disabled?: boolean): CSSProperties {
  return {
    padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 600,
    border: "none", cursor: disabled ? "default" : "pointer",
    background: disabled ? "rgba(0,0,0,0.06)" : T.text,
    color: disabled ? T.muted : "#fff",
  };
}

function secondaryBtn(): CSSProperties {
  return {
    padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500,
    border: `1px solid ${T.border}`, cursor: "pointer",
    background: T.card, color: T.muted,
  };
}

export default function AssessmentPage() {
  const [stage, setStage] = useState<AssessmentStage>("intake");
  const [shared, setShared] = useState<AssessmentShared>(() => getAssessment().shared);
  const [dpia, setDpia] = useState<DPIAResult>(() => getAssessment().dpia);
  const [fria, setFria] = useState<FRIADocument>(() => getAssessment().fria);
  const [intake, setIntake] = useState<IntakeContext>({
    systemName: "", systemScope: "other", processingPurpose: "",
    dataCategories: [], subjectScale: "large_scale_unknown",
    automatedDecisions: "no", highRiskAIAct: "unknown",
    crossBorderTransfer: false, vulnerableSubjects: false, dpiaJustification: "",
  });

  useEffect(() => {
    migrateLegacyFRIA();
    const a = getAssessment();
    setShared(a.shared);
    setDpia(a.dpia);
    setFria(a.fria);
    if (a.shared.systemName) {
      setIntake(p => ({
        ...p,
        systemName: p.systemName || a.shared.systemName,
        processingPurpose: p.processingPurpose || (a.shared.purpose ?? ""),
      }));
    }
  }, []);

  function handleSharedChange(patch: Partial<AssessmentShared>) {
    const next = { ...shared, ...patch };
    setShared(next);
    patchShared(patch);
  }

  function handleDpiaChange(updater: (prev: DPIAResult) => DPIAResult) {
    setDpia(prev => {
      const next = updater(prev);
      patchDPIA(() => next);
      return next;
    });
  }

  function handleFriaChange(updater: (prev: FRIADocument) => FRIADocument) {
    setFria(prev => {
      const next = updater(prev);
      patchFRIA(() => next);
      return next;
    });
  }

  const currentIdx = stageIndex(stage);

  const stageNav = (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {STAGES.map(({ key, label, idx }) => {
        const isActive = key === stage;
        const isPast = idx < currentIdx;
        const style: CSSProperties = {
          padding: "6px 14px", borderRadius: 20, fontSize: 11, fontWeight: 600,
          cursor: "pointer", border: "1px solid",
          background: isActive ? T.text : isPast ? T.greenBg : "transparent",
          color: isActive ? "#fff" : isPast ? T.green : T.muted,
          borderColor: isActive ? T.text : isPast ? T.greenBdr : T.border,
        };
        return (
          <button key={key} style={style} onClick={() => setStage(key)}>
            {label}
          </button>
        );
      })}
    </div>
  );

  function renderStage() {
    switch (stage) {
      case "intake":
        return (
          <div>
            <UnifiedIntake
              intake={intake}
              setIntake={setIntake}
              onParsed={(ctx) => {
                handleSharedChange({
                  systemName: ctx.systemName,
                  purpose: ctx.processingPurpose,
                  personalDataCategories: ctx.dataCategories,
                });
              }}
              defaultOpen={true}
            />
            <button
              onClick={() => setStage("spine")}
              disabled={!intake.systemName.trim() || !intake.processingPurpose.trim()}
              style={primaryBtn(!intake.systemName.trim() || !intake.processingPurpose.trim())}>
              Avanti — Dati condivisi →
            </button>
          </div>
        );

      case "spine":
        return (
          <div>
            <SharedSpine shared={shared} onSharedChange={handleSharedChange} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setStage("intake")} style={secondaryBtn()}>← Indietro</button>
              <button onClick={() => setStage("branch")} style={primaryBtn()}>Avanti — DPIA / FRIA →</button>
            </div>
          </div>
        );

      case "branch":
        return (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: T.text, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Atto 1 — DPIA Art.35 GDPR
                </p>
                <DpiaBranch dpia={dpia} onDpiaChange={handleDpiaChange} />
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: T.text, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Atto 2 — FRIA Art.27 AI Act
                </p>
                <FriaBranch fria={fria} onFriaChange={handleFriaChange} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button onClick={() => setStage("spine")} style={secondaryBtn()}>← Indietro</button>
              <button onClick={() => setStage("draft")} style={primaryBtn()}>Avanti — Bozza AI →</button>
            </div>
          </div>
        );

      case "draft":
        return (
          <div>
            <UnifiedDraftPanel
              shared={shared}
              intake={intake}
              dpia={dpia}
              fria={fria}
              onDpiaChange={handleDpiaChange}
              onFriaChange={handleFriaChange}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button onClick={() => setStage("branch")} style={secondaryBtn()}>← Indietro</button>
              <button onClick={() => setStage("export")} style={primaryBtn()}>Avanti — Export →</button>
            </div>
          </div>
        );

      case "export":
        return (
          <div>
            <div style={{ ...cardSt, padding: 24, marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 12 }}>Rischi correlati DPIA ⇄ FRIA</p>
              <CorrelatedRisksPanel />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={cardSt}>
                <div style={{ padding: 16 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 8 }}>
                    Atto 1 — DPIA Art. 35 GDPR
                  </p>
                  <AssessmentSignOff toolKey="dpia" toolLabel="DPIA Art. 35 GDPR" shared={shared} />
                </div>
              </div>
              <div style={cardSt}>
                <div style={{ padding: 16 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 8 }}>
                    Atto 2 — FRIA Art. 27 AI Act
                  </p>
                  <AssessmentSignOff toolKey="fria" toolLabel="FRIA Art. 27 AI Act" shared={shared} />
                </div>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <button onClick={() => setStage("draft")} style={secondaryBtn()}>← Indietro</button>
            </div>
          </div>
        );
    }
  }

  return (
    <div style={{ padding: "24px 32px", maxWidth: 900, margin: "0 auto" }}>
      <SystemSelector checkProhibited={true} />
      <AssessmentSharedHeader />

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: T.text }}>Assessment Unificato</h1>
        <p style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>
          DPIA (Art. 35 GDPR) + FRIA (Art. 27 AI Act) — 1 conversazione → 2 atti firmati
        </p>
      </div>

      {stageNav}

      <div style={{ marginTop: 24 }}>
        {renderStage()}
      </div>
    </div>
  );
}
