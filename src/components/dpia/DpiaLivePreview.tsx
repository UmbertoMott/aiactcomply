"use client";
// Viewer centrale della DPIA guidata — anteprima HTML in stile documento PDF.
import React from "react";
import { DPIA_GUIDED_SECTIONS, DPIA_SUBPOINTS, DPIA_TEMPLATE_META } from "@/lib/dpia/dpia-template";
import type { DpiaGuidedDoc } from "@/lib/dpia/dpia-guided-types";
import { WP248_CRITERIA } from "@/lib/dpia/dpia-template";

const DOC = {
  bg:        "#ffffff",
  pageBg:    "#f5f4f0",
  text:      "#1a1a1a",
  muted:     "rgba(0,0,0,0.38)",
  border:    "rgba(0,0,0,0.10)",
  headerBg:  "#0D1016",
  headerFg:  "#ffffff",
  sectionBg: "#f0eeea",
  labelFg:   "rgba(0,0,0,0.50)",
  empty:     "rgba(0,0,0,0.18)",
  emptyBg:   "rgba(0,0,0,0.03)",
  green:     "#23403a",
  greenBg:   "rgba(35,64,58,0.07)",
  greenBdr:  "rgba(35,64,58,0.18)",
  amber:     "#b45309",
  amberBg:   "rgba(180,83,9,0.06)",
  amberBdr:  "rgba(180,83,9,0.18)",
  red:       "#b91c1c",
  redBg:     "rgba(185,28,28,0.06)",
  redBdr:    "rgba(185,28,28,0.18)",
} as const;

import { useT } from "@/i18n/LocaleProvider";

const SANS = "var(--font-inter, system-ui, sans-serif)";

function doneValue(doc: DpiaGuidedDoc, id: string): string | null {
  const a = doc.answers[id];
  if (!a) return null;
  if (a.status === "done" && (a.source === "manual" || a.aiConfirmed)) return a.value || null;
  return null;
}

function Placeholder({ label }: { label: string }) {
  const t = useT("toolDpia");
  return (
    <span style={{ color: DOC.empty, fontStyle: "italic", fontSize: 11 }}>
      [{label} — {t("dlp_toFill")}]
    </span>
  );
}

// Layout tabellare identico al Risk Register: label bold sinistra | valore destra
function Field({ label, value, placeholder }: { label: string; value: string | null; placeholder: string }) {
  return (
    <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
      <td data-noedit="true" style={{
        padding: "8px 12px 8px 0",
        fontWeight: 700, color: "#0D1016",
        width: "40%", verticalAlign: "top",
        fontSize: 12.5, lineHeight: 1.5,
      }}>
        {label}
      </td>
      <td style={{ padding: "8px 0", color: DOC.text, lineHeight: 1.6, fontSize: 12.5, verticalAlign: "top" }}>
        {value
          ? <span style={{ whiteSpace: "pre-wrap" }}>{value}</span>
          : <Placeholder label={placeholder} />
        }
      </td>
    </tr>
  );
}

// Divisore orizzontale usabile dentro <tbody>
function TrDivider() {
  return (
    <tr>
      <td colSpan={2} style={{ padding: "4px 0" }}>
        <div style={{ height: 1, background: DOC.border }} />
      </td>
    </tr>
  );
}

// Header sezione identico al SectionTitle del Risk Register
function SectionHeader({ id, title, legalRef }: { id: string; title: string; legalRef: string }) {
  return (
    <div id={id} data-noedit="true" style={{
      background: DOC.headerBg, color: "#ffffff",
      borderRadius: 6, padding: "11px 18px",
      margin: "20px 0 12px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <span style={{ fontSize: 13, fontWeight: 700, fontFamily: SANS }}>{title}</span>
      <span style={{ fontSize: 9.5, opacity: 0.5, letterSpacing: "0.05em", fontFamily: SANS, whiteSpace: "nowrap", marginLeft: 12 }}>
        {legalRef}
      </span>
    </div>
  );
}

// ─── SEZIONE SCREENING ────────────────────────────────────────────────────────

function ScreeningSection({ doc }: { doc: DpiaGuidedDoc }) {
  const t = useT("toolDpia");
  const criterionLabel = (idx: number) => WP248_CRITERIA[idx]?.label ?? `Criterio ${idx + 1}`;
  const criterionRef   = (idx: number) => WP248_CRITERIA[idx]?.ref ?? "";

  const rows = ["sc_c1","sc_c2","sc_c3","sc_c4","sc_c5","sc_c6","sc_c7","sc_c8","sc_c9"].map((id, i) => {
    const val = doneValue(doc, id);
    const applies = val ? (val.toLowerCase().startsWith("sì") || val.toLowerCase().startsWith("si") ? "yes" : val.toLowerCase().startsWith("no") ? "no" : "partial") : null;
    return { id, val, applies, idx: i };
  });

  const metCount = rows.filter(r => r.applies === "yes" || r.applies === "partial").length;

  return (
    <>
      <SectionHeader id="sec-screening" title={t("dlp_screeningTitle")} legalRef="GDPR Art. 35(1) + WP248" />
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, marginBottom: 8 }}>
        <thead>
          <tr style={{ background: DOC.sectionBg }}>
            <th style={{ padding: "5px 8px", textAlign: "left", fontWeight: 600, width: "5%", border: `1px solid ${DOC.border}` }}>#</th>
            <th style={{ padding: "5px 8px", textAlign: "left", fontWeight: 600, width: "45%", border: `1px solid ${DOC.border}` }}>{t("dlp_criterion")}</th>
            <th style={{ padding: "5px 8px", textAlign: "center", fontWeight: 600, width: "10%", border: `1px solid ${DOC.border}` }}>{t("dlp_applies")}</th>
            <th style={{ padding: "5px 8px", textAlign: "left", fontWeight: 600, width: "40%", border: `1px solid ${DOC.border}` }}>{t("dlp_notesJust")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} style={{ background: r.applies === "yes" ? DOC.amberBg : "transparent" }}>
              <td style={{ padding: "4px 8px", border: `1px solid ${DOC.border}`, color: DOC.muted }}>{r.idx + 1}</td>
              <td style={{ padding: "4px 8px", border: `1px solid ${DOC.border}` }}>
                <span style={{ fontWeight: r.applies === "yes" ? 600 : 400 }}>{criterionLabel(r.idx)}</span>
                <span style={{ fontSize: 8, color: DOC.muted, marginLeft: 4 }}>{criterionRef(r.idx)}</span>
              </td>
              <td style={{ padding: "4px 8px", border: `1px solid ${DOC.border}`, textAlign: "center" }}>
                {r.applies === "yes"     ? <span style={{ color: DOC.amber, fontWeight: 700 }}>{t("yes")}</span>
                 : r.applies === "partial" ? <span style={{ color: DOC.amber }}>{t("dlp_partialAbbr")}</span>
                 : r.applies === "no"    ? <span style={{ color: DOC.muted }}>{t("no")}</span>
                 : <Placeholder label="?" />}
              </td>
              <td style={{ padding: "4px 8px", border: `1px solid ${DOC.border}`, color: DOC.text }}>
                {r.val ? <span style={{ fontSize: 10 }}>{r.val.length > 120 ? r.val.slice(0, 117) + "…" : r.val}</span> : <Placeholder label={t("dlp_answer")} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {metCount >= 2 && (
        <p style={{ fontSize: 10, fontWeight: 700, color: DOC.amber, margin: "0 0 4px", padding: "4px 8px", background: DOC.amberBg, borderRadius: 3 }}>
          ⚠ {metCount}/9 {t("dlp_criteriaMet")}
        </p>
      )}
    </>
  );
}

// ─── SEZIONE A ────────────────────────────────────────────────────────────────

function DescrSection({ doc }: { doc: DpiaGuidedDoc }) {
  const t = useT("toolDpia");
  return (
    <>
      <SectionHeader id="sec-descr" title={t("dlp_secA")} legalRef="GDPR Art. 35(7)(a)" />
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          <Field label={t("dlp_systemController")}       value={doneValue(doc, "a_system_name")}              placeholder={t("dlp_ph_systemController")} />
          <Field label={t("organization")}           value={doneValue(doc, "a_organization")}             placeholder={t("dlp_ph_organization")} />
          <Field label="DPO"                      value={doneValue(doc, "a_dpo")}                      placeholder={t("dlp_ph_dpo")} />
          <Field label={t("dlp_processors")}   value={doneValue(doc, "a_processor")}               placeholder={t("dlp_ph_processors")} />
          <TrDivider />
          <Field label={t("purposes")}         value={doneValue(doc, "a_processing_purposes")}          placeholder={t("dlp_ph_purposes")} />
          <Field label={t("dataCategories")}      value={doneValue(doc, "a_personal_data_categories")}     placeholder={t("dlp_ph_dataCat")} />
          <Field label={t("specialCategories")}   value={doneValue(doc, "a_special_categories")}           placeholder={t("dlp_ph_specialCat")} />
          <Field label={t("subjectCategories")}         value={doneValue(doc, "a_data_subjects_categories")}     placeholder={t("dlp_ph_subjects")} />
          <Field label={t("recipients")}                      value={doneValue(doc, "a_recipients")}                  placeholder={t("dlp_ph_recipients")} />
          <Field label={t("retention")}         value={doneValue(doc, "a_retention_period")}            placeholder={t("dlp_ph_retention")} />
          <Field label={t("dlp_assets")}                value={doneValue(doc, "a_assets")}                      placeholder={t("dlp_ph_assets")} />
        </tbody>
      </table>
    </>
  );
}

// ─── SEZIONE B ────────────────────────────────────────────────────────────────

function NecessitySection({ doc }: { doc: DpiaGuidedDoc }) {
  const t = useT("toolDpia");
  const checks = [
    { id: "b_lawful_basis",           label: t("dlp_lawfulBasis") },
    { id: "b_data_minimisation",      label: t("dlp_minimisation") },
    { id: "b_storage_limitation",     label: t("dlp_storageLimit") },
    { id: "b_proportionality",        label: t("dlp_proportionality") },
    { id: "b_processor_clauses",      label: t("dlp_processorClauses") },
    { id: "b_international_transfers", label: t("dlp_extraEu") },
  ];
  return (
    <>
      <SectionHeader id="sec-necessity" title={t("dlp_secB")} legalRef="GDPR Art. 35(7)(b)" />
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          <Field label={t("dlp_necessityJust")}  value={doneValue(doc, "b_necessity")} placeholder={t("dlp_ph_necessity")} />
          <Field label={t("dlp_dataSubjectRights")}     value={doneValue(doc, "b_data_subject_rights")} placeholder={t("dlp_ph_guarantees")} />
        </tbody>
      </table>
      <div style={{ height: 1, background: DOC.border, margin: "10px 0" }} />
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
        <thead>
          <tr style={{ background: DOC.sectionBg }}>
            <th style={{ padding: "4px 8px", textAlign: "left", border: `1px solid ${DOC.border}` }}>{t("colPrinciple")}</th>
            <th style={{ padding: "4px 8px", textAlign: "left", border: `1px solid ${DOC.border}` }}>{t("dlp_descMeasure")}</th>
          </tr>
        </thead>
        <tbody>
          {checks.map(c => (
            <tr key={c.id}>
              <td style={{ padding: "4px 8px", border: `1px solid ${DOC.border}`, fontWeight: 600, whiteSpace: "nowrap" }}>{c.label}</td>
              <td style={{ padding: "4px 8px", border: `1px solid ${DOC.border}` }}>
                {doneValue(doc, c.id) ?? <Placeholder label={c.label.toLowerCase()} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

// ─── SEZIONE C ────────────────────────────────────────────────────────────────

function RisksSection({ doc }: { doc: DpiaGuidedDoc }) {
  const t = useT("toolDpia");
  const threats = [
    { id: "c_threat_access",        label: t("dlp_threatAccess"),    cat: "WP248 §1" },
    { id: "c_threat_modification",  label: t("dlp_threatModif"), cat: "WP248 §2" },
    { id: "c_threat_disappearance", label: t("dlp_threatDisap"),   cat: "WP248 §3" },
  ];
  const riskBefore = doneValue(doc, "c_overall_risk_before");
  const riskColor  = riskBefore?.toLowerCase().includes("alto") ? DOC.red
    : riskBefore?.toLowerCase().includes("medio") ? DOC.amber : DOC.green;

  return (
    <>
      <SectionHeader id="sec-risks" title={t("dlp_secC")} legalRef="GDPR Art. 35(7)(c)" />
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, marginBottom: 10 }}>
        <thead>
          <tr style={{ background: DOC.sectionBg }}>
            <th style={{ padding: "4px 8px", textAlign: "left", border: `1px solid ${DOC.border}`, width: "25%" }}>{t("dlp_fearedEvent")}</th>
            <th style={{ padding: "4px 8px", textAlign: "left", border: `1px solid ${DOC.border}` }}>{t("dlp_scenarioPI")}</th>
          </tr>
        </thead>
        <tbody>
          {threats.map(th => (
            <tr key={th.id}>
              <td style={{ padding: "4px 8px", border: `1px solid ${DOC.border}`, fontWeight: 600 }}>
                {th.label}<br /><span style={{ fontSize: 8, color: DOC.muted, fontWeight: 400 }}>{th.cat}</span>
              </td>
              <td style={{ padding: "4px 8px", border: `1px solid ${DOC.border}` }}>
                {doneValue(doc, th.id) ?? <Placeholder label={t("dlp_ph_scenario")} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
        <tbody>
          <Field label={t("technicalMeasures")}       value={doneValue(doc, "c_technical_measures")}     placeholder={t("dlp_ph_technical")} />
          <Field label={t("organizationalMeasures")}  value={doneValue(doc, "c_organizational_measures")} placeholder={t("dlp_ph_organizational")} />
        </tbody>
      </table>
      <div style={{
        padding: "6px 10px", borderRadius: 4, fontSize: 11, fontWeight: 700,
        color: riskBefore ? riskColor : DOC.empty,
        background: riskBefore ? (riskColor === DOC.red ? DOC.redBg : riskColor === DOC.amber ? DOC.amberBg : DOC.greenBg) : DOC.emptyBg,
        border: `1px solid ${riskBefore ? (riskColor === DOC.red ? DOC.redBdr : riskColor === DOC.amber ? DOC.amberBdr : DOC.greenBdr) : DOC.border}`,
      }}>
        {t("dlp_riskBefore")}{" "}
        {riskBefore ? riskBefore : <Placeholder label={t("dlp_ph_riskLevel")} />}
      </div>
    </>
  );
}

// ─── SEZIONE D ────────────────────────────────────────────────────────────────

function PartiesSection({ doc }: { doc: DpiaGuidedDoc }) {
  const t = useT("toolDpia");
  const riskAfter = doneValue(doc, "d_overall_risk_after");
  const riskColor  = riskAfter?.toLowerCase().includes("alto") ? DOC.red
    : riskAfter?.toLowerCase().includes("medio") ? DOC.amber : DOC.green;
  const priorConsult = doneValue(doc, "d_prior_consultation");

  return (
    <>
      <SectionHeader id="sec-parties" title={t("dlp_secD")} legalRef="WP248 Allegato 2 §D / GDPR Art. 36" />
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          <Field label={t("dlp_dpoOpinion")}             value={doneValue(doc, "d_dpo_opinion")}           placeholder={t("dlp_ph_dpoOpinion")} />
          <Field label={t("dlp_subjectsOpinions")}  value={doneValue(doc, "d_data_subjects_opinions")} placeholder={t("dlp_ph_subjectsConsult")} />
        </tbody>
      </table>
      <div style={{ height: 1, background: DOC.border, margin: "10px 0" }} />
      <div style={{
        padding: "6px 10px", borderRadius: 4, fontSize: 11, fontWeight: 700, marginBottom: 8,
        color: riskAfter ? riskColor : DOC.empty,
        background: riskAfter ? (riskColor === DOC.red ? DOC.redBg : riskColor === DOC.amber ? DOC.amberBg : DOC.greenBg) : DOC.emptyBg,
        border: `1px solid ${riskAfter ? (riskColor === DOC.red ? DOC.redBdr : riskColor === DOC.amber ? DOC.amberBdr : DOC.greenBdr) : DOC.border}`,
      }}>
        {t("dlp_riskAfter")}{" "}
        {riskAfter ? riskAfter : <Placeholder label={t("dlp_ph_residualLevel")} />}
      </div>
      {priorConsult?.toLowerCase().startsWith("sì") && (
        <div style={{ padding: "6px 10px", borderRadius: 4, background: DOC.redBg, border: `1px solid ${DOC.redBdr}`, marginBottom: 8 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: DOC.red, margin: 0 }}>
            ⚠ {t("dlp_art36Title")}
          </p>
          <p style={{ fontSize: 9, color: DOC.red, margin: "2px 0 0", opacity: 0.8 }}>
            {t("dlp_art36Body")}

          </p>
        </div>
      )}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          <Field label={t("dlp_reviewPlan")} value={doneValue(doc, "d_review_schedule")} placeholder={t("dlp_ph_reviewCadence")} />
        </tbody>
      </table>
    </>
  );
}

// ─── FIRMA / CONCLUSIONE ──────────────────────────────────────────────────────

function SignoffSection({ doc }: { doc: DpiaGuidedDoc }) {
  const t = useT("toolDpia");
  const compliant = doneValue(doc, "e_compliant");
  const compliantColor =
    compliant?.toLowerCase().includes("non confor") ? DOC.red
    : compliant?.toLowerCase().includes("condiz")   ? DOC.amber
    : compliant ? DOC.green : DOC.empty;

  return (
    <>
      <SectionHeader id="sec-signoff" title={t("dlp_secSignoff")} legalRef="GDPR Art. 35 / Art. 36" />
      <div style={{
        padding: "8px 12px", borderRadius: 4, fontSize: 12, fontWeight: 700, marginBottom: 10,
        color: compliantColor,
        background: compliant ? (compliantColor === DOC.red ? DOC.redBg : compliantColor === DOC.amber ? DOC.amberBg : DOC.greenBg) : DOC.emptyBg,
        border: `1px solid ${compliant ? (compliantColor === DOC.red ? DOC.redBdr : compliantColor === DOC.amber ? DOC.amberBdr : DOC.greenBdr) : DOC.border}`,
      }}>
        {t("dlp_complianceDecision")}{" "}
        {compliant ? compliant : <Placeholder label={t("dlp_ph_compliance")} />}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          <Field label={t("dlp_conditions")} value={doneValue(doc, "e_conditions")}      placeholder={t("dlp_ph_conditions")} />
          <Field label={t("execSummary")}              value={doneValue(doc, "e_summary")}          placeholder={t("dlp_ph_summary")} />
          <Field label={t("dlp_nextReview")}               value={doneValue(doc, "e_next_review_date")} placeholder={t("dlp_ph_reviewDate")} />
        </tbody>
      </table>

      {/* Linee firma */}
      <div style={{ marginTop: 24, paddingTop: 14, borderTop: `1px solid ${DOC.border}`, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, fontFamily: SANS }}>
        {[
          t("dlp_controllerDpo"),
          t("dlp_gdprContact"),
          t("lp_date2"),
        ].map(label => (
          <div key={label}>
            <p style={{ fontSize: 9, fontWeight: 700, color: DOC.labelFg, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 16px" }}>
              {label}
            </p>
            <div style={{ borderBottom: `1px solid ${DOC.border}`, height: 24 }} />
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12 }}>
        <p style={{ fontSize: 9, color: DOC.muted, margin: 0 }}>
          {DPIA_TEMPLATE_META.disclaimer}
        </p>
      </div>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface DpiaLivePreviewProps {
  doc: DpiaGuidedDoc;
  activeSection?: string | null;
}

export function DpiaLivePreview({ doc, activeSection }: DpiaLivePreviewProps) {
  const t = useT("toolDpia");
  void activeSection;
  return (
    <div style={{ background: "#FAFAFA", minHeight: "100%", padding: "16px" }}>
      <div style={{
        background: DOC.bg, borderRadius: 8, padding: "28px 32px",
        border: "1px solid rgba(0,0,0,0.08)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: 13, color: DOC.text, lineHeight: 1.7,
      }}>
        {/* Intestazione documento */}
        <div data-noedit="true" style={{ marginBottom: 20, paddingBottom: 14, borderBottom: `2px solid ${DOC.headerBg}` }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: DOC.muted, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 4px", fontFamily: SANS }}>
            {DPIA_TEMPLATE_META.legalBasis}
          </p>
          <h1 style={{ fontSize: 17, fontWeight: 700, color: DOC.text, margin: "0 0 6px", fontFamily: SANS }}>
            {DPIA_TEMPLATE_META.title}
          </h1>
          <p style={{ fontSize: 10, color: DOC.muted, margin: 0, fontFamily: SANS }}>
            {t("lp_methodology2")}: {DPIA_TEMPLATE_META.methodology}
          </p>
        </div>

        <ScreeningSection  doc={doc} />
        <DescrSection      doc={doc} />
        <NecessitySection  doc={doc} />
        <RisksSection      doc={doc} />
        <PartiesSection    doc={doc} />
        <SignoffSection    doc={doc} />
      </div>
    </div>
  );
}
