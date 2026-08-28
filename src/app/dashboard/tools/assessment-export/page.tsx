"use client";

import { useState, useEffect } from "react";
import { getAssessment } from "@/lib/assessment/assessment-helpers";
import type { Assessment, CorrelatedRisk } from "@/lib/assessment/assessment-schema";
import { AssessmentStepper } from "@/components/assessment/AssessmentStepper";
import { AssessmentSharedHeader } from "@/components/assessment/AssessmentSharedHeader";
import { SystemSelector } from "@/components/compliance/SystemSelector";
import { Download } from "lucide-react";
import { useT } from "@/i18n/LocaleProvider";

const T = {
  text:    "#0D1016",
  muted:   "rgba(0,0,0,0.42)",
  faint:   "rgba(0,0,0,0.28)",
  border:  "rgba(0,0,0,0.08)",
  card:    "#ffffff",
  bgAlt:   "#FAFAF9",
  red:     "#dc2626",  redBg:   "rgba(220,38,38,0.06)",
  amber:   "#d97706",  amberBg: "rgba(202,138,4,0.06)",
  green:   "#15803d",  greenBg: "rgba(21,128,61,0.06)",
} as const;

const cardSt = {
  background: T.card,
  border: `1px solid ${T.border}`,
  borderRadius: 12,
  padding: "20px 24px",
  marginBottom: 16,
} as const;

const SEV: Record<string, { bg: string; color: string }> = {
  low:      { bg: "rgba(0,0,0,0.04)", color: T.muted },
  medium:   { bg: T.amberBg,          color: T.amber },
  high:     { bg: T.redBg,            color: T.red   },
  critical: { bg: "#0D1016",          color: "#ffffff" },
};

function SevBadge({ s }: { s: string }) {
  const c = SEV[s] ?? SEV.low;
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
      background: c.bg, color: c.color, textTransform: "uppercase" as const }}>
      {s}
    </span>
  );
}

function SectionTitle({ tag, title, count }: { tag: string; title: string; count?: number }) {
  const t = useT("toolAssessmentExport");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1px",
        color: "rgba(0,0,0,0.3)", textTransform: "uppercase" as const,
        padding: "2px 7px", borderRadius: 4, background: "rgba(0,0,0,0.05)" }}>
        {tag}
      </span>
      <h2 style={{ fontSize: 15, fontWeight: 600, color: T.text, margin: 0 }}>{title}</h2>
      {count !== undefined && (
        <span style={{ fontSize: 11, color: T.muted, marginLeft: "auto" }}>
          {count} {t("elements")}
        </span>
      )}
    </div>
  );
}

export default function AssessmentExportPage() {
  const t = useT("toolAssessmentExport");
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setAssessment(getAssessment());
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function exportJSON() {
    if (!assessment) return;
    const blob = new Blob([JSON.stringify(assessment, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `assessment-${assessment.shared.systemName.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(t("toast_jsonOk"));
  }

  async function exportPDF() {
    if (!assessment) return;
    setExporting(true);
    try {
      const sections = [
        {
          title: t("pdf_sec_shared"),
          article: "Assessment §shared",
          content: [
            `${t("pdf_l_system")} ${assessment.shared.systemName}`,
            `${t("pdf_l_org")} ${assessment.shared.organization}`,
            `${t("pdf_l_risk")} ${assessment.shared.riskLevel}`,
            `${t("pdf_l_annexIII")} ${assessment.shared.annexIII ? t("yes") : t("no")}`,
            `${t("pdf_l_purpose")} ${assessment.shared.purpose}`,
            `${t("pdf_l_legalBasis")} ${assessment.shared.legalBasis}`,
            `${t("pdf_l_personalData")} ${assessment.shared.processesPersonalData ? t("yes") : t("no")}`,
          ].join("\n"),
          status: assessment.shared.systemName ? "complete" : "empty" as "complete" | "empty",
        },
        {
          title: t("pdf_sec_dpia"),
          article: "GDPR Art. 35 / WP248",
          content: [
            `${t("pdf_l_dpiaRequired")} ${assessment.dpia.screening.dpia_required}`,
            `${t("pdf_l_compliant")} ${assessment.dpia.conclusion.compliant || t("na")}`,
            `${t("pdf_l_residualRisk")} ${assessment.dpia.measures.overall_risk_after || t("na")}`,
            `${t("pdf_l_threats")} ${assessment.dpia.risks.threats.length}`,
          ].join("\n"),
          status: (assessment.dpia.conclusion.compliant ? "complete" : "partial") as "complete" | "partial",
        },
        {
          title: t("pdf_sec_fria"),
          article: "AI Act Art. 27 / DIHR",
          content: assessment.fria.scenarios.length > 0
            ? assessment.fria.scenarios.map(s =>
                `• ${s.title}: ${s.right_impacts.length} ${t("pdf_rightsImpacted")}`
              ).join("\n")
            : t("pdf_scenarioNone"),
          status: (assessment.fria.scenarios.length > 0 ? "complete" : "empty") as "complete" | "empty",
        },
        {
          title: t("pdf_sec_corr"),
          article: "WP29 ⇄ DIHR / CFR",
          content: assessment.correlatedRisks.length > 0
            ? assessment.correlatedRisks.map(r =>
                `[${r.severity.toUpperCase()}] ${r.description} — ${r.refs.map(rf => rf.citation).join(", ")}`
              ).join("\n")
            : t("pdf_corrNone"),
          status: (assessment.correlatedRisks.length > 0 ? "complete" : "empty") as "complete" | "empty",
        },
      ];

      const res = await fetch("/api/compliance/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemName: assessment.shared.systemName || t("systemAI_default"),
          systemId: assessment.id,
          tier: assessment.shared.riskLevel,
          sections,
        }),
      });
      if (!res.ok) { showToast(t("toast_pdfErr")); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `AIComply_Assessment_${(assessment.shared.systemName || "sistema").replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(t("toast_pdfOk"));
    } catch {
      showToast(t("toast_pdfErr"));
    } finally {
      setExporting(false);
    }
  }

  if (!assessment) {
    return (
      <div style={{ padding: 32, color: "rgba(0,0,0,0.42)", fontSize: 13 }}>
        {t("loading")}
      </div>
    );
  }

  const { shared, dpia, fria, correlatedRisks, meta } = assessment;

  return (
    <div className="w-full" style={{ fontFamily: "system-ui, sans-serif" }}>
      <SystemSelector checkProhibited={true} />
      <AssessmentStepper currentTool="export" />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        flexWrap: "wrap" as const, gap: 12, marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1.2px",
            color: "rgba(0,0,0,0.3)", textTransform: "uppercase" as const, marginBottom: 4 }}>
            {t("kicker")}
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: T.text, letterSpacing: "-0.5px", margin: 0 }}>
            {shared.systemName || t("systemAI_default")} {t("title_suffix")}
          </h1>
          <p style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
            v{meta.version} · {t("updated")} {new Date(meta.updatedAt).toLocaleDateString("it-IT")}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={exportJSON}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "8px 14px",
              borderRadius: 8, border: "1px solid rgba(0,0,0,0.12)", background: T.card,
              color: T.muted, cursor: "pointer" }}>
            <Download size={13} /> JSON
          </button>
          <button onClick={exportPDF} disabled={exporting}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "8px 14px",
              borderRadius: 8, border: "none", background: "#0D1016",
              color: "#ffffff", cursor: exporting ? "wait" : "pointer", opacity: exporting ? 0.7 : 1 }}>
            <Download size={13} /> {exporting ? t("pdf_generating") : t("pdf_btn")}
          </button>
        </div>
      </div>

      <AssessmentSharedHeader />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: t("stat_scenari"),  value: fria.scenarios.length },
          { label: t("stat_minacce"),  value: dpia.risks.threats.length },
          { label: t("stat_correlati"), value: correlatedRisks.length },
          { label: t("stat_mitig"),    value: correlatedRisks.filter(r => r.mitigation?.appliedToRegister).length },
        ].map(c => (
          <div key={c.label} style={{ ...cardSt, padding: "14px 16px" }}>
            <div style={{ fontSize: 22, fontWeight: 600, color: c.value > 0 ? T.text : T.muted,
              letterSpacing: "-0.5px" }}>{c.value}</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* DPIA */}
      <div style={cardSt}>
        <SectionTitle tag="DPIA · WP248" title={t("sec_dpia_title")} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { label: t("f_dpiaRequired"), value: dpia.screening.dpia_required },
            { label: t("f_compliant"),    value: dpia.conclusion.compliant || "—" },
            { label: t("f_riskBefore"),   value: dpia.risks.overall_risk_before || "—" },
            { label: t("f_riskAfter"),    value: dpia.measures.overall_risk_after || "—" },
            { label: t("f_intlTransfers"), value: dpia.proportionality.international_transfers || "—" },
            { label: t("f_nextReview"),   value: dpia.conclusion.next_review_date || "—" },
          ].map(f => (
            <div key={f.label} style={{ padding: "8px 12px", background: T.bgAlt,
              borderRadius: 8, border: "1px solid rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: 10, color: T.faint, fontWeight: 600,
                textTransform: "uppercase" as const, letterSpacing: "0.6px", marginBottom: 3 }}>
                {f.label}
              </div>
              <div style={{ fontSize: 12, color: T.text }}>{String(f.value)}</div>
            </div>
          ))}
        </div>
        {dpia.risks.threats.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 8 }}>
              {t("threats_identified")}
            </div>
            {dpia.risks.threats.slice(0, 5).map(th => (
              <div key={th.id} style={{ display: "flex", gap: 8, marginBottom: 6, padding: "6px 10px",
                background: T.bgAlt, borderRadius: 8, border: "1px solid rgba(0,0,0,0.05)" }}>
                <SevBadge s={th.risk_level} />
                <span style={{ fontSize: 12, color: T.text }}>{th.description || th.source}</span>
              </div>
            ))}
            {dpia.risks.threats.length > 5 && (
              <p style={{ fontSize: 11, color: T.muted }}>{t("and_other")} {dpia.risks.threats.length - 5} {t("risks_word")}</p>
            )}
          </div>
        )}
      </div>

      {/* FRIA */}
      <div style={cardSt}>
        <SectionTitle tag="FRIA · AI Act Art. 27" title={t("sec_fria_title")}
          count={fria.scenarios.length} />
        {fria.scenarios.length === 0 ? (
          <p style={{ fontSize: 12, color: T.muted, fontStyle: "italic" }}>
            {t("fria_empty")}
          </p>
        ) : (
          fria.scenarios.map(scenario => (
            <div key={scenario.id} style={{ marginBottom: 12, padding: "10px 14px",
              background: T.bgAlt, borderRadius: 10, border: "1px solid rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{scenario.title}</span>
                <span style={{ fontSize: 10, color: T.muted }}>
                  {scenario.right_impacts.length} {t("rights_impacted")}
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                {scenario.right_impacts.slice(0, 6).map(ri => (
                  <span key={ri.right_id} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99,
                    background: "rgba(0,0,0,0.05)", color: T.muted }}>
                    {ri.right_id} · {ri.likelihood.computed_priority}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Correlated Risks */}
      <div style={cardSt}>
        <SectionTitle tag={t("sec_corr_tag")} title={t("sec_corr_title")}
          count={correlatedRisks.length} />
        {correlatedRisks.length === 0 ? (
          <p style={{ fontSize: 12, color: T.muted, fontStyle: "italic" }}>
            {t("corr_empty")}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
            {correlatedRisks.map((cr: CorrelatedRisk) => (
              <div key={cr.id} style={{ padding: "10px 14px", borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.07)", background: T.bgAlt }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
                  <SevBadge s={cr.severity} />
                  <span style={{ fontSize: 12, color: T.text, flex: 1 }}>{cr.description}</span>
                  <span style={{ fontSize: 10, color: T.faint, flexShrink: 0 }}>
                    {cr.sourceView === "both" ? "DPIA + FRIA" : cr.sourceView.toUpperCase()}
                  </span>
                </div>
                {cr.refs.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 4, marginBottom: 4 }}>
                    {cr.refs.map((ref, i) => (
                      <span key={i} style={{ fontSize: 9, fontWeight: 600, padding: "1px 7px", borderRadius: 99,
                        background: "rgba(0,0,0,0.06)", color: T.muted }}>
                        {ref.framework}: {ref.citation}
                      </span>
                    ))}
                  </div>
                )}
                {cr.mitigation?.appliedToRegister && (
                  <div style={{ fontSize: 10, color: T.green, marginTop: 4 }}>
                    {t("mitig_applied")} {cr.mitigation.registerRiskId}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Document preview */}
      <div style={{ ...cardSt, padding: "48px 64px", maxWidth: 700, margin: "0 auto 40px",
        fontFamily: "Georgia, 'Times New Roman', serif" }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: T.text, marginBottom: 4,
          fontFamily: "system-ui, sans-serif" }}>
          {shared.systemName || t("systemAI_default")}
        </h1>
        <p style={{ fontSize: 11, color: T.muted, marginBottom: 24,
          fontFamily: "system-ui, sans-serif", letterSpacing: "0.3px" }}>
          {t("doc_subtitle")}{" "}
          {new Date().toLocaleDateString("it-IT", { year: "numeric", month: "long", day: "numeric" })}
        </p>
        <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 8 }}>
            {t("doc_execSummary")}
          </h2>
          <p style={{ fontSize: 13, lineHeight: 1.8, color: "rgba(0,0,0,0.72)" }}>
            {shared.purpose || t("doc_purposeFallback")}
          </p>
          {shared.legalBasis && (
            <p style={{ fontSize: 13, lineHeight: 1.8, color: "rgba(0,0,0,0.72)", marginTop: 8 }}>
              {t("doc_legalBasis")} {shared.legalBasis}.
              {" "}{t("doc_riskClass")} {shared.riskLevel}.
              {" "}{t("doc_rightsImpacted")}{" "}
              {fria.scenarios.reduce((n, s) => n + s.right_impacts.length, 0)}.
            </p>
          )}
        </div>
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 50,
          background: "#0D1016", color: "#fff", borderRadius: 12, padding: "12px 16px",
          fontSize: 13, boxShadow: "0 4px 24px rgba(0,0,0,0.15)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
