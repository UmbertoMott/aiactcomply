"use client";
import React, { useState } from "react";
import type { CSSProperties } from "react";
import type {
  DPIAResult,
  DPIAProportionalityCheck,
  DPIARightsCheck,
} from "@/lib/dossier/storage-schema";
import { T, inputSt, textareaSt, selectSt, labelSt } from "./tokens";
import { useT } from "@/i18n/LocaleProvider";

type DpiaTab = "proportionality" | "rights" | "measures" | "art36";

interface DpiaBranchProps {
  dpia: DPIAResult;
  onDpiaChange: (updater: (prev: DPIAResult) => DPIAResult) => void;
}

const rowSt: CSSProperties = {
  display: "grid", gap: 8, padding: "10px 0",
  borderBottom: `1px solid ${T.border}`,
};

const STANDARD_PROPORTIONALITY_CHECKS: DPIAProportionalityCheck[] = [
  { id: "", principle: "Finalità determinata", description: "Il trattamento è limitato alla finalità dichiarata.", status: "", notes: "" },
  { id: "", principle: "Minimizzazione dei dati", description: "Solo i dati strettamente necessari vengono trattati.", status: "", notes: "" },
  { id: "", principle: "Limitazione della conservazione", description: "I dati non sono conservati più del necessario.", status: "", notes: "" },
  { id: "", principle: "Accuratezza", description: "I dati trattati sono accurati e aggiornati.", status: "", notes: "" },
  { id: "", principle: "Integrità e riservatezza", description: "Misure tecniche e organizzative garantiscono sicurezza.", status: "", notes: "" },
];

const STANDARD_RIGHTS_CHECKS: DPIARightsCheck[] = [
  { id: "", right: "Diritto di accesso", article: "Art. 15 GDPR", applicable: "", how_ensured: "" },
  { id: "", right: "Diritto di rettifica", article: "Art. 16 GDPR", applicable: "", how_ensured: "" },
  { id: "", right: "Diritto alla cancellazione", article: "Art. 17 GDPR", applicable: "", how_ensured: "" },
  { id: "", right: "Diritto alla limitazione", article: "Art. 18 GDPR", applicable: "", how_ensured: "" },
  { id: "", right: "Diritto alla portabilità", article: "Art. 20 GDPR", applicable: "", how_ensured: "" },
  { id: "", right: "Diritto di opposizione", article: "Art. 21 GDPR", applicable: "", how_ensured: "" },
  { id: "", right: "Diritti relativi a decisioni automatizzate", article: "Art. 22 GDPR", applicable: "", how_ensured: "" },
];

function riskColor(val: string): CSSProperties {
  if (val === "high") return { color: T.red, background: T.redBg, border: `1px solid ${T.redBdr}`, padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600 };
  if (val === "medium") return { color: T.amber, background: T.amberBg, border: `1px solid ${T.amberBdr}`, padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600 };
  if (val === "low") return { color: T.green, background: T.greenBg, border: `1px solid ${T.greenBdr}`, padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600 };
  return {};
}

export function DpiaBranch({ dpia, onDpiaChange }: DpiaBranchProps) {
  const t = useT("assessmentShared");
  const [tab, setTab] = useState<DpiaTab>("proportionality");

  function tabBtn(key: DpiaTab, label: string) {
    const active = tab === key;
    const st: CSSProperties = {
      padding: "6px 12px", fontSize: 11, fontWeight: 600,
      borderRadius: 6, border: `1px solid ${active ? T.text : T.border}`,
      background: active ? T.text : "transparent",
      color: active ? "#fff" : T.muted, cursor: "pointer",
    };
    return <button key={key} style={st} onClick={() => setTab(key)}>{label}</button>;
  }

  function addStandardProportionalityChecks() {
    onDpiaChange(prev => ({
      ...prev,
      proportionality: {
        ...prev.proportionality,
        proportionality_checks: STANDARD_PROPORTIONALITY_CHECKS.map(c => ({
          ...c,
          id: crypto.randomUUID(),
        })),
      },
    }));
  }

  function addStandardRightsChecks() {
    onDpiaChange(prev => ({
      ...prev,
      proportionality: {
        ...prev.proportionality,
        rights_checks: STANDARD_RIGHTS_CHECKS.map(c => ({
          ...c,
          id: crypto.randomUUID(),
        })),
      },
    }));
  }

  function updateProportionalityCheck(id: string, field: keyof DPIAProportionalityCheck, value: string) {
    onDpiaChange(prev => ({
      ...prev,
      proportionality: {
        ...prev.proportionality,
        proportionality_checks: prev.proportionality.proportionality_checks.map(c =>
          c.id === id ? { ...c, [field]: value } : c
        ),
      },
    }));
  }

  function updateRightsCheck(id: string, field: keyof DPIARightsCheck, value: string) {
    onDpiaChange(prev => ({
      ...prev,
      proportionality: {
        ...prev.proportionality,
        rights_checks: prev.proportionality.rights_checks.map(c =>
          c.id === id ? { ...c, [field]: value } : c
        ),
      },
    }));
  }

  const containerSt: CSSProperties = {
    background: T.card, border: `1px solid ${T.border}`,
    borderRadius: 10, padding: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  };

  return (
    <div style={containerSt}>
      {/* Tab navigation */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {tabBtn("proportionality", t("db_tabProp"))}
        {tabBtn("rights", t("db_tabRights"))}
        {tabBtn("measures", t("db_tabMeasures"))}
        {tabBtn("art36", "Art. 36")}
      </div>

      {/* Tab: Proporzionalità */}
      {tab === "proportionality" && (
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 8 }}>
            {t("db_necessityProp")}
          </p>

          <div style={{ marginBottom: 16 }}>
            <p style={labelSt}>{t("db_necessityJust")}</p>
            <textarea
              style={textareaSt}
              value={dpia.proportionality.necessity_justification}
              onChange={e => onDpiaChange(prev => ({
                ...prev,
                proportionality: { ...prev.proportionality, necessity_justification: e.target.value },
              }))}
              placeholder={t("db_ph_necessity")}
            />
          </div>

          <p style={labelSt}>{t("db_propChecks")}</p>

          {dpia.proportionality.proportionality_checks.length === 0 ? (
            <div style={{ padding: "16px 0", textAlign: "center" }}>
              <p style={{ fontSize: 12, color: T.muted, marginBottom: 10 }}>
                {t("db_noChecks")}
              </p>
              <button
                style={{
                  padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                  border: `1px solid ${T.border}`, cursor: "pointer",
                  background: T.bg, color: T.text,
                }}
                onClick={addStandardProportionalityChecks}
              >
                {t("db_addStandard")}
              </button>
            </div>
          ) : (
            <div>
              {dpia.proportionality.proportionality_checks.map(check => (
                <div key={check.id} style={rowSt}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: T.text, margin: 0 }}>
                    {check.principle}
                  </p>
                  <p style={{ fontSize: 11, color: T.muted, margin: 0 }}>
                    {check.description}
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <p style={labelSt}>{t("db_status")}</p>
                      <select
                        style={selectSt}
                        value={check.status}
                        onChange={e => updateProportionalityCheck(check.id, "status", e.target.value)}
                      >
                        <option value="">{t("db_notSet")}</option>
                        <option value="compliant">{t("db_compliant")}</option>
                        <option value="partial">{t("partial")}</option>
                        <option value="non_compliant">{t("db_nonCompliant")}</option>
                        <option value="na">N/A</option>
                      </select>
                    </div>
                    <div>
                      <p style={labelSt}>{t("db_notes")}</p>
                      <input
                        style={inputSt}
                        value={check.notes}
                        onChange={e => updateProportionalityCheck(check.id, "notes", e.target.value)}
                        placeholder={t("db_ph_notes")}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Diritti */}
      {tab === "rights" && (
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 8 }}>
            {t("db_dataSubjectRights")}
          </p>

          {dpia.proportionality.rights_checks.length === 0 ? (
            <div style={{ padding: "16px 0", textAlign: "center" }}>
              <p style={{ fontSize: 12, color: T.muted, marginBottom: 10 }}>
                {t("db_noChecks")}
              </p>
              <button
                style={{
                  padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                  border: `1px solid ${T.border}`, cursor: "pointer",
                  background: T.bg, color: T.text,
                }}
                onClick={addStandardRightsChecks}
              >
                {t("db_addStandard")}
              </button>
            </div>
          ) : (
            <div>
              {dpia.proportionality.rights_checks.map(check => (
                <div key={check.id} style={rowSt}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: T.text, margin: 0 }}>
                      {check.right}
                    </p>
                    <span style={{
                      fontSize: 10, fontWeight: 600, color: T.muted,
                      background: T.bg, border: `1px solid ${T.border}`,
                      borderRadius: 4, padding: "1px 6px",
                    }}>
                      {check.article}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <p style={labelSt}>{t("db_applicable")}</p>
                      <select
                        style={selectSt}
                        value={check.applicable}
                        onChange={e => updateRightsCheck(check.id, "applicable", e.target.value)}
                      >
                        <option value="">{t("db_notSet")}</option>
                        <option value="yes">{t("yes")}</option>
                        <option value="no">{t("no")}</option>
                        <option value="partial">{t("partial")}</option>
                      </select>
                    </div>
                    <div>
                      <p style={labelSt}>{t("db_howEnsured")}</p>
                      <input
                        style={inputSt}
                        value={check.how_ensured}
                        onChange={e => updateRightsCheck(check.id, "how_ensured", e.target.value)}
                        placeholder={t("db_ph_howEnsured")}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Misure */}
      {tab === "measures" && (
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 12 }}>
            {t("db_securityMeasures")}
          </p>

          <div style={{ marginBottom: 12 }}>
            <p style={labelSt}>{t("db_technicalMeasures")}</p>
            <textarea
              style={textareaSt}
              value={dpia.measures.technical_measures}
              onChange={e => onDpiaChange(prev => ({
                ...prev,
                measures: { ...prev.measures, technical_measures: e.target.value },
              }))}
              placeholder={t("db_ph_technical")}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <p style={labelSt}>{t("db_organizationalMeasures")}</p>
            <textarea
              style={textareaSt}
              value={dpia.measures.organizational_measures}
              onChange={e => onDpiaChange(prev => ({
                ...prev,
                measures: { ...prev.measures, organizational_measures: e.target.value },
              }))}
              placeholder={t("db_ph_organizational")}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <p style={labelSt}>{t("db_residualLevel")}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <select
                style={{ ...selectSt, width: "auto", minWidth: 160 }}
                value={dpia.measures.overall_risk_after}
                onChange={e => onDpiaChange(prev => ({
                  ...prev,
                  measures: { ...prev.measures, overall_risk_after: e.target.value as DPIAResult["measures"]["overall_risk_after"] },
                }))}
              >
                <option value="">{t("db_notSet")}</option>
                <option value="high">{t("sev_high")}</option>
                <option value="medium">{t("sev_medium")}</option>
                <option value="low">{t("sev_low")}</option>
              </select>
              {dpia.measures.overall_risk_after && (
                <span style={riskColor(dpia.measures.overall_risk_after)}>
                  {dpia.measures.overall_risk_after === "high" ? t("sev_high") :
                   dpia.measures.overall_risk_after === "medium" ? t("sev_medium") : t("sev_low")}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Art. 36 */}
      {tab === "art36" && (
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 12 }}>
            {t("db_priorConsultTitle")}
          </p>

          <div style={{
            fontSize: 11, color: T.muted, background: T.bg,
            border: `1px solid ${T.border}`, borderRadius: 6,
            padding: "10px 12px", marginBottom: 14, lineHeight: 1.6,
          }}>
            {t("db_art36Body")}
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={dpia.measures.prior_consultation_required}
                onChange={e => onDpiaChange(prev => ({
                  ...prev,
                  measures: { ...prev.measures, prior_consultation_required: e.target.checked },
                }))}
              />
              <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>
                {t("db_priorConsultRequired")}
              </span>
            </label>
          </div>

          {dpia.measures.prior_consultation_required && (
            <div style={{ display: "grid", gap: 10 }}>
              <div>
                <p style={labelSt}>{t("db_authority")}</p>
                <input
                  style={inputSt}
                  value={dpia.measures.prior_consultation_authority}
                  onChange={e => onDpiaChange(prev => ({
                    ...prev,
                    measures: { ...prev.measures, prior_consultation_authority: e.target.value },
                  }))}
                  placeholder={t("db_ph_authority")}
                />
              </div>
              <div>
                <p style={labelSt}>{t("db_consultDate")}</p>
                <input
                  type="date"
                  style={inputSt}
                  value={dpia.measures.prior_consultation_date}
                  onChange={e => onDpiaChange(prev => ({
                    ...prev,
                    measures: { ...prev.measures, prior_consultation_date: e.target.value },
                  }))}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
