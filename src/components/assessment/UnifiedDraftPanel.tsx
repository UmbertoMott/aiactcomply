"use client";
import React, { useState } from "react";
import type { CSSProperties } from "react";
import { T } from "@/components/assessment/tokens";
import type { DPIAResult } from "@/lib/dossier/storage-schema";
import type { FRIADocument } from "@/lib/simulation/fria-engine";
import type { AssessmentShared } from "@/lib/assessment/assessment-schema";
import type { IntakeContext } from "@/app/actions/parseIntakeContext";
import type { DpiaDraft } from "@/app/actions/draftDpiaSections";
import type { FriaDraft } from "@/app/actions/draftFria";
import { draftDpiaSections } from "@/app/actions/draftDpiaSections";
import { draftFria } from "@/app/actions/draftFria";
import { buildComplianceContextFromStorage } from "@/hooks/useComplianceContext";

// ── Props ─────────────────────────────────────────────────────────────────────

interface UnifiedDraftPanelProps {
  shared: AssessmentShared;
  intake: IntakeContext;
  dpia: DPIAResult;
  fria: FRIADocument;
  onDpiaChange: (updater: (prev: DPIAResult) => DPIAResult) => void;
  onFriaChange: (updater: (prev: FRIADocument) => FRIADocument) => void;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type DraftState = "idle" | "loading" | "done" | "error";

// ── Badge components ──────────────────────────────────────────────────────────

function AiBadge() {
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3,
      background: T.amberBg, color: T.amber, border: `1px solid ${T.amberBdr}`,
      letterSpacing: "0.04em",
    }}>
      ✦ AI
    </span>
  );
}

function ConfidenceBadge({ level }: { level: "alta" | "media" | "bassa" }) {
  const cfg = {
    alta:  { bg: T.greenBg, color: T.green, border: T.greenBdr },
    media: { bg: T.amberBg, color: T.amber, border: T.amberBdr },
    bassa: { bg: T.redBg,   color: T.red,   border: T.redBdr   },
  }[level];
  return (
    <span style={{
      fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 3,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
    }}>
      Confidenza {level}
    </span>
  );
}

function ImpactBadge({ level }: { level: string }) {
  const cfg: Record<string, { bg: string; color: string; border: string }> = {
    none:   { bg: "rgba(0,0,0,0.04)", color: T.muted, border: T.border },
    low:    { bg: T.greenBg, color: T.green, border: T.greenBdr },
    medium: { bg: T.amberBg, color: T.amber, border: T.amberBdr },
    high:   { bg: T.redBg,   color: T.red,   border: T.redBdr   },
  };
  const c = cfg[level] ?? cfg.none;
  return (
    <span style={{
      fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 3,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>
      {level}
    </span>
  );
}

function ResidualRiskBadge({ risk }: { risk: string }) {
  return <ImpactBadge level={risk} />;
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: 0, padding: "0 0 0 16px", listStyle: "disc" }}>
      {items.map((item, i) => (
        <li key={i} style={{ fontSize: 11, color: T.text, marginBottom: 3 }}>{item}</li>
      ))}
    </ul>
  );
}

// ── Local style helpers ───────────────────────────────────────────────────────

const cardSt: CSSProperties = {
  background: T.card, border: `1px solid ${T.border}`,
  borderRadius: 10, padding: 16,
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};

const sectionCardSt: CSSProperties = {
  background: T.bg, border: `1px solid ${T.border}`,
  borderRadius: 8, padding: 14, marginBottom: 12,
};

function primaryBtnSt(disabled?: boolean): CSSProperties {
  return {
    padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600,
    border: "none", cursor: disabled ? "default" : "pointer",
    background: disabled ? "rgba(0,0,0,0.06)" : T.text,
    color: disabled ? T.muted : "#fff",
  };
}

function secondaryBtnSt(): CSSProperties {
  return {
    padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 500,
    border: `1px solid ${T.border}`, cursor: "pointer",
    background: T.card, color: T.muted,
  };
}

// ── Confidence calculation ────────────────────────────────────────────────────

function computeConfidence(intake: IntakeContext, shared: AssessmentShared): "alta" | "media" | "bassa" {
  let score = 0;
  if (intake.systemName?.trim()) score++;
  if (intake.processingPurpose?.trim()) score++;
  if ((intake.dataCategories?.length ?? 0) > 0) score++;
  if (shared.legalBasis?.trim()) score++;
  if (intake.systemScope && intake.systemScope !== "other") score++;
  if (intake.highRiskAIAct !== "unknown") score++;
  return score >= 5 ? "alta" : score >= 3 ? "media" : "bassa";
}

// ── Section card wrapper ──────────────────────────────────────────────────────

interface SectionCardProps {
  title: string;
  confirmed: boolean;
  ignored: boolean;
  onConfirm: () => void;
  onIgnore: () => void;
  children: React.ReactNode;
}

function SectionCard({ title, confirmed, ignored, onConfirm, onIgnore, children }: SectionCardProps) {
  return (
    <div style={{ ...sectionCardSt, opacity: ignored ? 0.4 : 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{title}</span>
        <AiBadge />
      </div>
      <div style={{ marginBottom: 10 }}>{children}</div>
      {confirmed ? (
        <span style={{
          fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 4,
          background: T.greenBg, color: T.green, border: `1px solid ${T.greenBdr}`,
        }}>
          ✓ Applicato
        </span>
      ) : ignored ? null : (
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button style={primaryBtnSt()} onClick={onConfirm}>✓ Conferma</button>
          <button style={secondaryBtnSt()} onClick={onIgnore}>Ignora</button>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function UnifiedDraftPanel({
  shared, intake, dpia: _dpia, fria: _fria, onDpiaChange, onFriaChange,
}: UnifiedDraftPanelProps) {
  const [draftState, setDraftState] = useState<DraftState>("idle");
  const [draftError, setDraftError] = useState<string | null>(null);
  const [dpiaDraft, setDpiaDraft] = useState<DpiaDraft | null>(null);
  const [friaDraft, setFriaDraft] = useState<FriaDraft | null>(null);
  const [confirmedSections, setConfirmedSections] = useState<Set<string>>(new Set());
  const [ignoredSections, setIgnoredSections] = useState<Set<string>>(new Set());

  const confidence = computeConfidence(intake, shared);

  // ── Generate handler ─────────────────────────────────────────────────────────

  async function handleGenerate() {
    setDraftState("loading");
    setDraftError(null);
    const ctx = buildComplianceContextFromStorage();

    const [dpiaResult, friaResult] = await Promise.allSettled([
      draftDpiaSections(ctx, intake),
      draftFria(
        shared.systemName || intake.systemName || "sistema AI",
        shared.purpose || intake.processingPurpose || "",
        ctx.riskTier ?? "non classificato",
        ctx.identifiedRisks?.map(r => ({ title: r.scenario, severity: r.severity })) ?? [],
        (intake.dataCategories?.length ?? 0) > 0 || shared.processesPersonalData,
      ),
    ]);

    let hasError = false;
    let dpiaOk = false;
    let friaOk = false;

    if (dpiaResult.status === "fulfilled" && !("error" in dpiaResult.value)) {
      setDpiaDraft(dpiaResult.value as DpiaDraft);
      dpiaOk = true;
    } else {
      const errMsg = dpiaResult.status === "rejected"
        ? "Errore generazione DPIA"
        : ("error" in (dpiaResult.value as { error: string })
            ? (dpiaResult.value as { error: string }).error
            : "Errore DPIA");
      setDraftError(prev => prev ? `${prev} | ${errMsg}` : errMsg);
      hasError = true;
    }

    if (friaResult.status === "fulfilled" && !("error" in friaResult.value)) {
      setFriaDraft(friaResult.value as FriaDraft);
      friaOk = true;
    } else {
      const errMsg = friaResult.status === "rejected"
        ? "Errore generazione FRIA"
        : ("error" in (friaResult.value as { error: string })
            ? (friaResult.value as { error: string }).error
            : "Errore FRIA");
      setDraftError(prev => prev ? `${prev} | ${errMsg}` : errMsg);
      hasError = true;
    }

    setDraftState(hasError && !dpiaOk && !friaOk ? "error" : "done");
  }

  // ── Section state helpers ────────────────────────────────────────────────────

  function confirm(id: string) {
    setConfirmedSections(prev => new Set([...prev, id]));
  }

  function ignore(id: string) {
    setIgnoredSections(prev => new Set([...prev, id]));
  }

  function isConfirmed(id: string) { return confirmedSections.has(id); }
  function isIgnored(id: string)   { return ignoredSections.has(id); }

  // ── Apply-to-DPIA functions ──────────────────────────────────────────────────

  function applyDpiaAssets(draft: DpiaDraft) {
    onDpiaChange(prev => ({
      ...prev,
      description: {
        ...prev.description,
        assets: draft.assets.map(a => ({
          id: crypto.randomUUID(),
          name: a.assetName,
          type: "database" as const,
          description: `${a.dataCategory} — ${a.legalBasis}`,
          personal_data: true,
        })),
      },
    }));
  }

  function applyDpiaThreats(draft: DpiaDraft) {
    const toLevel = (n: number): "low" | "medium" | "high" => n >= 4 ? "high" : n >= 3 ? "medium" : "low";
    onDpiaChange(prev => ({
      ...prev,
      risks: {
        ...prev.risks,
        threats: draft.threats.map(t => ({
          id: crypto.randomUUID(),
          category: "illegitimate_access" as const,
          source: "✦ AI — da verificare",
          description: `${t.threatName}: ${t.description}`,
          likelihood: toLevel(t.likelihood),
          severity: toLevel(t.impact),
          risk_level: toLevel(Math.max(t.likelihood, t.impact)),
          mitigation: t.mitigation ?? "",
          residual_likelihood: "low" as const,
          residual_severity: "low" as const,
          residual_risk: (["low", "medium", "high"].includes(t.residualRisk)
            ? t.residualRisk
            : "medium") as "low" | "medium" | "high",
        })),
      },
    }));
  }

  function applyDpiaMeasures(draft: DpiaDraft) {
    onDpiaChange(prev => ({
      ...prev,
      measures: {
        ...prev.measures,
        technical_measures: draft.technicalMeasures.join("\n"),
        organizational_measures: draft.organizationalMeasures.join("\n"),
        prior_consultation_required: draft.priorConsultationRequired,
      },
    }));
  }

  // ── Apply-to-FRIA functions ──────────────────────────────────────────────────

  function applyFriaContext(draft: FriaDraft) {
    onFriaChange(prev => ({
      ...prev,
      context: { ...prev.context, intended_purpose_explanation: draft.phase1_description },
    }));
  }

  function applyFriaScenarios(draft: FriaDraft) {
    onFriaChange(prev => ({
      ...prev,
      scenarios: [
        ...prev.scenarios,
        ...draft.phase3_scenarios.map(s => ({
          id: crypto.randomUUID(),
          title: s.scenario,
          description: `Soggetti colpiti: ${s.affectedPersons}. Probabilità stimata: ${s.likelihood}/5. ✦ AI — da verificare`,
          type: "automated_decision",
          right_impacts: [],
        })),
      ],
    }));
  }

  function applyDpiaConsultation(draft: DpiaDraft) {
    onDpiaChange(prev => ({
      ...prev,
      measures: {
        ...prev.measures,
        prior_consultation_required: draft.priorConsultationRequired,
      },
    }));
  }

  function applyFriaRights(draft: FriaDraft) {
    const text = draft.phase2_rights
      .map(r => `${r.right} [${r.impactLevel}]: ${r.rationale}`)
      .join("\n");
    onFriaChange(prev => ({
      ...prev,
      deployment: {
        ...prev.deployment,
        qualified_rights_necessity_proportionality: text,
      },
    }));
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header card */}
      <div style={{ ...cardSt, padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: 0 }}>
              ④ Bozza AI — DPIA + FRIA
            </h2>
            <p style={{ fontSize: 12, color: T.muted, marginTop: 6, marginBottom: 0 }}>
              L&apos;AI genera suggerimenti basati sul contesto del progetto. Conferma ogni sezione per applicarla al ramo corrispondente.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <ConfidenceBadge level={confidence} />
            <button
              style={primaryBtnSt(draftState === "loading")}
              onClick={handleGenerate}
              disabled={draftState === "loading"}
            >
              {draftState === "loading" ? "Generazione..." : "✦ Genera bozza AI"}
            </button>
          </div>
        </div>

        {draftState === "loading" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
            <span style={{
              display: "inline-block", width: 14, height: 14, borderRadius: "50%",
              border: `2px solid ${T.border}`, borderTopColor: T.amber,
              animation: "spin 0.8s linear infinite",
            }} />
            <span style={{ fontSize: 12, color: T.muted }}>Generazione in corso...</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {draftError && (
          <div style={{
            marginTop: 12, padding: "8px 12px", borderRadius: 6,
            background: T.redBg, border: `1px solid ${T.redBdr}`,
            fontSize: 11, color: T.red,
          }}>
            {draftError}
          </div>
        )}
      </div>

      {/* Draft sections — two-column grid */}
      {(dpiaDraft !== null || friaDraft !== null) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

          {/* Left — DPIA sections */}
          <div>
            {dpiaDraft !== null && (
              <>
                <p style={{
                  fontSize: 11, fontWeight: 700, color: T.text, marginBottom: 12,
                  textTransform: "uppercase", letterSpacing: "0.06em",
                }}>
                  DPIA — Bozza AI
                </p>

                {/* Assets */}
                <SectionCard
                  title="Assets"
                  confirmed={isConfirmed("dpia-assets")}
                  ignored={isIgnored("dpia-assets")}
                  onConfirm={() => { applyDpiaAssets(dpiaDraft); confirm("dpia-assets"); }}
                  onIgnore={() => ignore("dpia-assets")}
                >
                  <ul style={{ margin: 0, padding: "0 0 0 16px", listStyle: "disc" }}>
                    {dpiaDraft.assets.map((a, i) => (
                      <li key={i} style={{ fontSize: 11, color: T.text, marginBottom: 3 }}>
                        <span style={{ fontWeight: 600 }}>{a.assetName}</span>
                        {" — "}
                        <span style={{ color: T.muted }}>{a.dataCategory}</span>
                      </li>
                    ))}
                  </ul>
                </SectionCard>

                {/* Threats */}
                <SectionCard
                  title="Minacce"
                  confirmed={isConfirmed("dpia-threats")}
                  ignored={isIgnored("dpia-threats")}
                  onConfirm={() => { applyDpiaThreats(dpiaDraft); confirm("dpia-threats"); }}
                  onIgnore={() => ignore("dpia-threats")}
                >
                  <ul style={{ margin: 0, padding: "0 0 0 16px", listStyle: "disc" }}>
                    {dpiaDraft.threats.map((t, i) => (
                      <li key={i} style={{ fontSize: 11, color: T.text, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600 }}>{t.threatName}</span>
                        {" "}
                        <ResidualRiskBadge risk={t.residualRisk} />
                      </li>
                    ))}
                  </ul>
                </SectionCard>

                {/* Technical measures */}
                <SectionCard
                  title="Misure tecniche"
                  confirmed={isConfirmed("dpia-tech")}
                  ignored={isIgnored("dpia-tech")}
                  onConfirm={() => { applyDpiaMeasures(dpiaDraft); confirm("dpia-tech"); confirm("dpia-org"); }}
                  onIgnore={() => ignore("dpia-tech")}
                >
                  <BulletList items={dpiaDraft.technicalMeasures} />
                </SectionCard>

                {/* Organizational measures */}
                <SectionCard
                  title="Misure organizzative"
                  confirmed={isConfirmed("dpia-org")}
                  ignored={isIgnored("dpia-org")}
                  onConfirm={() => { applyDpiaMeasures(dpiaDraft); confirm("dpia-tech"); confirm("dpia-org"); }}
                  onIgnore={() => ignore("dpia-org")}
                >
                  <BulletList items={dpiaDraft.organizationalMeasures} />
                </SectionCard>

                {/* Prior consultation */}
                <SectionCard
                  title="Consultazione preventiva Art.36"
                  confirmed={isConfirmed("dpia-consult")}
                  ignored={isIgnored("dpia-consult")}
                  onConfirm={() => { applyDpiaConsultation(dpiaDraft); confirm("dpia-consult"); }}
                  onIgnore={() => ignore("dpia-consult")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: T.muted }}>Richiesta:</span>
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: dpiaDraft.priorConsultationRequired ? T.red : T.green,
                    }}>
                      {dpiaDraft.priorConsultationRequired ? "Sì" : "No"}
                    </span>
                  </div>
                  {dpiaDraft.priorConsultationRationale && (
                    <p style={{ fontSize: 11, color: T.muted, margin: 0 }}>
                      {dpiaDraft.priorConsultationRationale}
                    </p>
                  )}
                </SectionCard>
              </>
            )}
          </div>

          {/* Right — FRIA sections */}
          <div>
            {friaDraft !== null && (
              <>
                <p style={{
                  fontSize: 11, fontWeight: 700, color: T.text, marginBottom: 12,
                  textTransform: "uppercase", letterSpacing: "0.06em",
                }}>
                  FRIA — Bozza AI
                </p>

                {/* Context description */}
                <SectionCard
                  title="Descrizione contesto"
                  confirmed={isConfirmed("fria-context")}
                  ignored={isIgnored("fria-context")}
                  onConfirm={() => { applyFriaContext(friaDraft); confirm("fria-context"); }}
                  onIgnore={() => ignore("fria-context")}
                >
                  <p style={{ fontSize: 11, color: T.text, margin: 0, lineHeight: 1.6 }}>
                    {friaDraft.phase1_description}
                  </p>
                </SectionCard>

                {/* Rights impact */}
                <SectionCard
                  title="Impatto diritti fondamentali"
                  confirmed={isConfirmed("fria-rights")}
                  ignored={isIgnored("fria-rights")}
                  onConfirm={() => { applyFriaRights(friaDraft); confirm("fria-rights"); }}
                  onIgnore={() => ignore("fria-rights")}
                >
                  <ul style={{ margin: 0, padding: "0 0 0 16px", listStyle: "disc" }}>
                    {friaDraft.phase2_rights.map((r, i) => (
                      <li key={i} style={{ fontSize: 11, color: T.text, marginBottom: 5 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontWeight: 600 }}>{r.right}</span>
                          <ImpactBadge level={r.impactLevel} />
                        </div>
                        <span style={{ color: T.muted, fontSize: 10 }}>{r.rationale}</span>
                      </li>
                    ))}
                  </ul>
                </SectionCard>

                {/* Scenarios */}
                <SectionCard
                  title="Scenari"
                  confirmed={isConfirmed("fria-scenarios")}
                  ignored={isIgnored("fria-scenarios")}
                  onConfirm={() => { applyFriaScenarios(friaDraft); confirm("fria-scenarios"); }}
                  onIgnore={() => ignore("fria-scenarios")}
                >
                  <ul style={{ margin: 0, padding: "0 0 0 16px", listStyle: "disc" }}>
                    {friaDraft.phase3_scenarios.map((s, i) => (
                      <li key={i} style={{ fontSize: 11, color: T.text, marginBottom: 5 }}>
                        <span style={{ fontWeight: 600 }}>{s.scenario}</span>
                        {" — "}
                        <span style={{ color: T.muted }}>probabilità {s.likelihood}/5</span>
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              </>
            )}
          </div>
        </div>
      )}

      {/* Idle state hint */}
      {draftState === "idle" && (
        <div style={{
          textAlign: "center", padding: "40px 24px",
          background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10,
        }}>
          <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>
            Clicca <strong style={{ color: T.text }}>✦ Genera bozza AI</strong> per creare suggerimenti contestuali per DPIA e FRIA in parallelo.
          </p>
        </div>
      )}
    </div>
  );
}
