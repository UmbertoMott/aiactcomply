"use client";
import React, { useState, useMemo } from "react";
import type { CSSProperties } from "react";
import {
  FUNDAMENTAL_RIGHTS,
  computeSeverity,
  computePriority,
  generatePublicSummary,
} from "@/lib/simulation/fria-engine";
import type {
  FRIADocument,
  FRIAScenario,
  FRIARightImpact,
  FRIASeverityAssessment,
  FRIAStakeholder,
} from "@/lib/simulation/fria-engine";
import { T, inputSt, textareaSt, selectSt, labelSt } from "./tokens";
import { useT } from "@/i18n/LocaleProvider";

type FriaTab = "scenarios" | "stakeholders" | "summary";

interface FriaBranchProps {
  fria: FRIADocument;
  onFriaChange: (updater: (prev: FRIADocument) => FRIADocument) => void;
}

function emptyRightImpact(rightId: string): FRIARightImpact {
  return {
    right_id: rightId,
    severity: {
      extent_of_interference: "", scope_of_impact: "", persons_affected: "",
      gravity: "", irreversibility: "", computed_severity: "",
    },
    likelihood: { likelihood: "", computed_priority: "" },
    notes: "",
    mitigations: [],
    residual_risk: "",
  };
}

function priorityStyle(val: string): CSSProperties {
  if (val === "critical") return { color: T.red, fontWeight: 700 };
  if (val === "high") return { color: T.red, fontWeight: 600 };
  if (val === "medium") return { color: T.amber, fontWeight: 600 };
  if (val === "low") return { color: T.green, fontWeight: 600 };
  return { color: T.faint };
}

export function FriaBranch({ fria, onFriaChange }: FriaBranchProps) {
  const t = useT("assessmentShared");
  const [tab, setTab] = useState<FriaTab>("scenarios");

  // New scenario form state
  const [newScenarioTitle, setNewScenarioTitle] = useState("");
  const [newScenarioDesc, setNewScenarioDesc] = useState("");
  const [newScenarioRights, setNewScenarioRights] = useState<string[]>([]);

  // New stakeholder form state
  const [newStakeholder, setNewStakeholder] = useState({
    name: "", organization: "", category: "" as FRIAStakeholder["category"],
  });

  const autoSummary = useMemo(() => generatePublicSummary(fria), [fria]);

  function tabBtn(key: FriaTab, label: string) {
    const active = tab === key;
    const st: CSSProperties = {
      padding: "6px 12px", fontSize: 11, fontWeight: 600,
      borderRadius: 6, border: `1px solid ${active ? T.text : T.border}`,
      background: active ? T.text : "transparent",
      color: active ? "#fff" : T.muted, cursor: "pointer",
    };
    return <button key={key} style={st} onClick={() => setTab(key)}>{label}</button>;
  }

  function updateSeverityField(
    scenarioId: string,
    rightId: string,
    field: keyof FRIASeverityAssessment,
    value: string
  ) {
    onFriaChange(prev => ({
      ...prev,
      scenarios: prev.scenarios.map(s =>
        s.id !== scenarioId ? s : {
          ...s,
          right_impacts: s.right_impacts.map(ri => {
            if (ri.right_id !== rightId) return ri;
            const updatedSev: FRIASeverityAssessment = { ...ri.severity, [field]: value };
            const computed_severity = computeSeverity(updatedSev);
            updatedSev.computed_severity = computed_severity;
            const computed_priority = computePriority(computed_severity, ri.likelihood.likelihood);
            return {
              ...ri,
              severity: updatedSev,
              likelihood: { ...ri.likelihood, computed_priority },
            };
          }),
        }
      ),
    }));
  }

  function updateLikelihood(scenarioId: string, rightId: string, value: string) {
    onFriaChange(prev => ({
      ...prev,
      scenarios: prev.scenarios.map(s =>
        s.id !== scenarioId ? s : {
          ...s,
          right_impacts: s.right_impacts.map(ri => {
            if (ri.right_id !== rightId) return ri;
            const computed_priority = computePriority(ri.severity.computed_severity, value);
            return {
              ...ri,
              likelihood: { likelihood: value, computed_priority },
            };
          }),
        }
      ),
    }));
  }

  function updateRightImpactField(
    scenarioId: string,
    rightId: string,
    field: keyof Pick<FRIARightImpact, "residual_risk" | "notes">,
    value: string
  ) {
    onFriaChange(prev => ({
      ...prev,
      scenarios: prev.scenarios.map(s =>
        s.id !== scenarioId ? s : {
          ...s,
          right_impacts: s.right_impacts.map(ri =>
            ri.right_id !== rightId ? ri : { ...ri, [field]: value }
          ),
        }
      ),
    }));
  }

  function updateScenarioField(
    scenarioId: string,
    field: keyof Pick<FRIAScenario, "title" | "description">,
    value: string
  ) {
    onFriaChange(prev => ({
      ...prev,
      scenarios: prev.scenarios.map(s =>
        s.id !== scenarioId ? s : { ...s, [field]: value }
      ),
    }));
  }

  function addScenario() {
    if (!newScenarioTitle.trim()) return;
    const newScenario: FRIAScenario = {
      id: crypto.randomUUID(),
      title: newScenarioTitle.trim(),
      description: newScenarioDesc.trim(),
      type: "",
      right_impacts: newScenarioRights.map(rightId => emptyRightImpact(rightId)),
    };
    onFriaChange(prev => ({
      ...prev,
      scenarios: [...prev.scenarios, newScenario],
    }));
    setNewScenarioTitle("");
    setNewScenarioDesc("");
    setNewScenarioRights([]);
  }

  function toggleNewScenarioRight(rightId: string) {
    setNewScenarioRights(prev =>
      prev.includes(rightId) ? prev.filter(r => r !== rightId) : [...prev, rightId]
    );
  }

  function addStakeholder() {
    if (!newStakeholder.name.trim()) return;
    const sh: FRIAStakeholder = {
      id: crypto.randomUUID(),
      name: newStakeholder.name.trim(),
      organization: newStakeholder.organization.trim(),
      category: newStakeholder.category,
      engagement_method: "",
      phases: [],
      status: "",
    };
    onFriaChange(prev => ({
      ...prev,
      stakeholders: [...prev.stakeholders, sh],
    }));
    setNewStakeholder({ name: "", organization: "", category: "" });
  }

  function removeStakeholder(id: string) {
    onFriaChange(prev => ({
      ...prev,
      stakeholders: prev.stakeholders.filter(s => s.id !== id),
    }));
  }

  function updateStakeholderField(id: string, field: keyof FRIAStakeholder, value: string) {
    onFriaChange(prev => ({
      ...prev,
      stakeholders: prev.stakeholders.map(s =>
        s.id !== id ? s : { ...s, [field]: value }
      ),
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
        {tabBtn("scenarios", t("fb_tabScenarios"))}
        {tabBtn("stakeholders", t("fb_tabStakeholders"))}
        {tabBtn("summary", t("fb_tabSummary"))}
      </div>

      {/* Tab: Scenari */}
      {tab === "scenarios" && (
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 12 }}>
            {t("fb_impactScenarios")}
          </p>

          {fria.scenarios.length === 0 && (
            <p style={{ fontSize: 12, color: T.muted, marginBottom: 12 }}>
              {t("fb_noScenario")}
            </p>
          )}

          {fria.scenarios.map(scenario => (
            <div key={scenario.id} style={{
              border: `1px solid ${T.border}`, borderRadius: 8,
              padding: 12, marginBottom: 12, background: T.bg,
            }}>
              <div style={{ marginBottom: 10 }}>
                <p style={labelSt}>{t("fb_scenarioTitle")}</p>
                <input
                  style={inputSt}
                  value={scenario.title}
                  onChange={e => updateScenarioField(scenario.id, "title", e.target.value)}
                  placeholder={t("fb_ph_scenarioTitle")}
                />
              </div>
              <div style={{ marginBottom: 10 }}>
                <p style={labelSt}>{t("descriptionWord")}</p>
                <textarea
                  style={textareaSt}
                  value={scenario.description}
                  onChange={e => updateScenarioField(scenario.id, "description", e.target.value)}
                  placeholder={t("fb_ph_scenarioDesc")}
                />
              </div>

              {scenario.right_impacts.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: T.text, marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
                    {t("fb_rightsImpacts")}
                  </p>
                  {scenario.right_impacts.map(ri => {
                    const rightName = FUNDAMENTAL_RIGHTS.find(r => r.id === ri.right_id)?.name ?? ri.right_id;
                    return (
                      <div key={ri.right_id} style={{
                        background: T.card, border: `1px solid ${T.border}`,
                        borderRadius: 6, padding: 10, marginBottom: 8,
                      }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 8 }}>
                          {rightName}
                        </p>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                          <div>
                            <p style={labelSt}>{t("fb_extent")}</p>
                            <select style={selectSt} value={ri.severity.extent_of_interference}
                              onChange={e => updateSeverityField(scenario.id, ri.right_id, "extent_of_interference", e.target.value)}>
                              <option value="">—</option>
                              <option value="none">{t("fb_ext_none")}</option>
                              <option value="minor">{t("fb_ext_minor")}</option>
                              <option value="moderate">{t("fb_ext_moderate")}</option>
                              <option value="serious">{t("fb_ext_serious")}</option>
                              <option value="very_serious">{t("fb_ext_verySerious")}</option>
                            </select>
                          </div>
                          <div>
                            <p style={labelSt}>{t("fb_scope")}</p>
                            <select style={selectSt} value={ri.severity.scope_of_impact}
                              onChange={e => updateSeverityField(scenario.id, ri.right_id, "scope_of_impact", e.target.value)}>
                              <option value="">—</option>
                              <option value="individual">{t("fb_scope_individual")}</option>
                              <option value="group">{t("fb_scope_group")}</option>
                              <option value="large_group">{t("fb_scope_large")}</option>
                              <option value="systemic">{t("fb_scope_systemic")}</option>
                            </select>
                          </div>
                          <div>
                            <p style={labelSt}>{t("fb_persons")}</p>
                            <select style={selectSt} value={ri.severity.persons_affected}
                              onChange={e => updateSeverityField(scenario.id, ri.right_id, "persons_affected", e.target.value)}>
                              <option value="">—</option>
                              <option value="few">{t("fb_pers_few")}</option>
                              <option value="many">{t("fb_pers_many")}</option>
                              <option value="very_many">{t("fb_pers_veryMany")}</option>
                            </select>
                          </div>
                          <div>
                            <p style={labelSt}>{t("fb_gravity")}</p>
                            <select style={selectSt} value={ri.severity.gravity}
                              onChange={e => updateSeverityField(scenario.id, ri.right_id, "gravity", e.target.value)}>
                              <option value="">—</option>
                              <option value="low">{t("sev_lowFull")}</option>
                              <option value="medium">{t("sev_mediumFull")}</option>
                              <option value="high">{t("sev_highFull")}</option>
                              <option value="critical">{t("fb_critical")}</option>
                            </select>
                          </div>
                          <div>
                            <p style={labelSt}>{t("fb_reversibility")}</p>
                            <select style={selectSt} value={ri.severity.irreversibility}
                              onChange={e => updateSeverityField(scenario.id, ri.right_id, "irreversibility", e.target.value)}>
                              <option value="">—</option>
                              <option value="reversible">{t("fb_rev_reversible")}</option>
                              <option value="partially">{t("fb_rev_partial")}</option>
                              <option value="irreversible">{t("fb_rev_irreversible")}</option>
                            </select>
                          </div>
                          <div>
                            <p style={labelSt}>{t("fb_likelihood")}</p>
                            <select style={selectSt} value={ri.likelihood.likelihood}
                              onChange={e => updateLikelihood(scenario.id, ri.right_id, e.target.value)}>
                              <option value="">—</option>
                              <option value="negligible">{t("fb_lik_negligible")}</option>
                              <option value="possible">{t("fb_lik_possible")}</option>
                              <option value="likely">{t("fb_lik_likely")}</option>
                              <option value="almost_certain">{t("fb_lik_almostCertain")}</option>
                            </select>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
                          {ri.severity.computed_severity && (
                            <span style={{ fontSize: 11 }}>
                              {t("fb_severityWord")}: <span style={priorityStyle(ri.severity.computed_severity)}>{ri.severity.computed_severity}</span>
                            </span>
                          )}
                          {ri.likelihood.computed_priority && (
                            <span style={{ fontSize: 11 }}>
                              {t("fb_priorityWord")}: <span style={priorityStyle(ri.likelihood.computed_priority)}>{ri.likelihood.computed_priority}</span>
                            </span>
                          )}
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <div>
                            <p style={labelSt}>{t("fb_residualRisk")}</p>
                            <select style={selectSt} value={ri.residual_risk}
                              onChange={e => updateRightImpactField(scenario.id, ri.right_id, "residual_risk", e.target.value)}>
                              <option value="">—</option>
                              <option value="acceptable">{t("fb_res_acceptable")}</option>
                              <option value="review">{t("fb_res_review")}</option>
                              <option value="unacceptable">{t("fb_res_unacceptable")}</option>
                            </select>
                          </div>
                          <div>
                            <p style={labelSt}>{t("db_notes")}</p>
                            <textarea
                              style={{ ...textareaSt, minHeight: 40 }}
                              value={ri.notes}
                              onChange={e => updateRightImpactField(scenario.id, ri.right_id, "notes", e.target.value)}
                              placeholder={t("db_ph_notes")}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {/* Add scenario form */}
          <div style={{
            border: `1px dashed ${T.border}`, borderRadius: 8, padding: 12, background: T.bg,
          }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 10 }}>
              {t("fb_addNewScenario")}
            </p>
            <div style={{ marginBottom: 8 }}>
              <p style={labelSt}>{t("fb_titleWord")}</p>
              <input
                style={inputSt}
                value={newScenarioTitle}
                onChange={e => setNewScenarioTitle(e.target.value)}
                placeholder={t("fb_ph_scenarioTitleShort")}
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <p style={labelSt}>{t("descriptionWord")}</p>
              <textarea
                style={{ ...textareaSt, minHeight: 56 }}
                value={newScenarioDesc}
                onChange={e => setNewScenarioDesc(e.target.value)}
                placeholder={t("fb_ph_scenarioDescShort")}
              />
            </div>
            <div style={{ marginBottom: 10 }}>
              <p style={labelSt}>{t("fb_fundamentalRights")}</p>
              <div style={{
                maxHeight: 140, overflowY: "auto", border: `1px solid ${T.border}`,
                borderRadius: 6, padding: 8, background: T.card,
              }}>
                {FUNDAMENTAL_RIGHTS.map(r => (
                  <label key={r.id} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "3px 0", cursor: "pointer", fontSize: 12, color: T.text,
                  }}>
                    <input
                      type="checkbox"
                      checked={newScenarioRights.includes(r.id)}
                      onChange={() => toggleNewScenarioRight(r.id)}
                    />
                    {r.name}
                  </label>
                ))}
              </div>
            </div>
            <button
              style={{
                padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                border: "none", cursor: newScenarioTitle.trim() ? "pointer" : "default",
                background: newScenarioTitle.trim() ? T.text : "rgba(0,0,0,0.06)",
                color: newScenarioTitle.trim() ? "#fff" : T.muted,
              }}
              onClick={addScenario}
              disabled={!newScenarioTitle.trim()}
            >
              {t("fb_addScenario")}
            </button>
          </div>
        </div>
      )}

      {/* Tab: Stakeholder */}
      {tab === "stakeholders" && (
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 12 }}>
            {t("fb_stakeholdersConsulted")}
          </p>

          {fria.stakeholders.length === 0 && (
            <p style={{ fontSize: 12, color: T.muted, marginBottom: 12 }}>
              {t("fb_noStakeholder")}
            </p>
          )}

          {fria.stakeholders.map(sh => (
            <div key={sh.id} style={{
              border: `1px solid ${T.border}`, borderRadius: 8,
              padding: 12, marginBottom: 10, background: T.bg,
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div>
                  <p style={labelSt}>{t("nameWord")}</p>
                  <input
                    style={inputSt}
                    value={sh.name}
                    onChange={e => updateStakeholderField(sh.id, "name", e.target.value)}
                    placeholder={t("fb_ph_name")}
                  />
                </div>
                <div>
                  <p style={labelSt}>{t("organizationField")}</p>
                  <input
                    style={inputSt}
                    value={sh.organization}
                    onChange={e => updateStakeholderField(sh.id, "organization", e.target.value)}
                    placeholder={t("fb_ph_org")}
                  />
                </div>
                <div>
                  <p style={labelSt}>{t("categoryWord")}</p>
                  <select style={selectSt} value={sh.category}
                    onChange={e => updateStakeholderField(sh.id, "category", e.target.value)}>
                    <option value="">{t("fb_notSetF")}</option>
                    <option value="rights_holder">{t("fb_cat_rightsHolder")}</option>
                    <option value="civil_society">{t("fb_cat_civilSociety")}</option>
                    <option value="regulator">{t("fb_cat_regulator")}</option>
                    <option value="internal">{t("fb_cat_internal")}</option>
                    <option value="expert">{t("fb_cat_expert")}</option>
                  </select>
                </div>
                <div>
                  <p style={labelSt}>{t("fb_engagementMethod")}</p>
                  <input
                    style={inputSt}
                    value={sh.engagement_method}
                    onChange={e => updateStakeholderField(sh.id, "engagement_method", e.target.value)}
                    placeholder={t("fb_ph_engagement")}
                  />
                </div>
                <div>
                  <p style={labelSt}>{t("db_status")}</p>
                  <select style={selectSt} value={sh.status}
                    onChange={e => updateStakeholderField(sh.id, "status", e.target.value)}>
                    <option value="">{t("db_notSet")}</option>
                    <option value="planned">{t("fb_st_planned")}</option>
                    <option value="contacted">{t("fb_st_contacted")}</option>
                    <option value="engaged">{t("fb_st_engaged")}</option>
                    <option value="completed">{t("fb_st_completed")}</option>
                  </select>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <button
                    style={{
                      padding: "7px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                      border: `1px solid ${T.redBdr}`, cursor: "pointer",
                      background: T.redBg, color: T.red,
                    }}
                    onClick={() => removeStakeholder(sh.id)}
                  >
                    {t("fb_remove")}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Add stakeholder form */}
          <div style={{
            border: `1px dashed ${T.border}`, borderRadius: 8, padding: 12, background: T.bg,
          }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 10 }}>
              {t("fb_addStakeholder")}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              <div>
                <p style={labelSt}>{t("nameWord")}</p>
                <input
                  style={inputSt}
                  value={newStakeholder.name}
                  onChange={e => setNewStakeholder(p => ({ ...p, name: e.target.value }))}
                  placeholder={t("fb_ph_stakeholderName")}
                />
              </div>
              <div>
                <p style={labelSt}>{t("organizationField")}</p>
                <input
                  style={inputSt}
                  value={newStakeholder.organization}
                  onChange={e => setNewStakeholder(p => ({ ...p, organization: e.target.value }))}
                  placeholder={t("fb_ph_org")}
                />
              </div>
              <div>
                <p style={labelSt}>{t("categoryWord")}</p>
                <select
                  style={selectSt}
                  value={newStakeholder.category}
                  onChange={e => setNewStakeholder(p => ({ ...p, category: e.target.value as FRIAStakeholder["category"] }))}
                >
                  <option value="">{t("fb_notSetF")}</option>
                  <option value="rights_holder">{t("fb_cat_rightsHolder")}</option>
                  <option value="civil_society">{t("fb_cat_civilSociety")}</option>
                  <option value="regulator">{t("fb_cat_regulator")}</option>
                  <option value="internal">{t("fb_cat_internal")}</option>
                  <option value="expert">{t("fb_cat_expert")}</option>
                </select>
              </div>
            </div>
            <button
              style={{
                padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                border: "none", cursor: newStakeholder.name.trim() ? "pointer" : "default",
                background: newStakeholder.name.trim() ? T.text : "rgba(0,0,0,0.06)",
                color: newStakeholder.name.trim() ? "#fff" : T.muted,
              }}
              onClick={addStakeholder}
              disabled={!newStakeholder.name.trim()}
            >
              {t("addWord")}
            </button>
          </div>
        </div>
      )}

      {/* Tab: Summary */}
      {tab === "summary" && (
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 8 }}>
            {t("fb_publicSummary")}
          </p>

          <div style={{
            fontSize: 11, color: T.muted, background: T.amberBg,
            border: `1px solid ${T.amberBdr}`, borderRadius: 6,
            padding: "8px 12px", marginBottom: 12, lineHeight: 1.6,
          }}>
            {t("fb_art27Body")}
          </div>

          <div style={{ marginBottom: 12 }}>
            <p style={labelSt}>{t("fb_autoGenerated")}</p>
            <textarea
              readOnly
              style={{
                ...textareaSt, minHeight: 140,
                background: T.bg, color: T.muted, cursor: "default",
              }}
              value={autoSummary}
            />
            <button
              style={{
                marginTop: 6, padding: "7px 14px", borderRadius: 6,
                fontSize: 12, fontWeight: 600, border: `1px solid ${T.border}`,
                cursor: "pointer", background: T.card, color: T.text,
              }}
              onClick={() => onFriaChange(prev => ({
                ...prev,
                deployment: { ...prev.deployment, public_summary: autoSummary },
              }))}
            >
              {t("fb_useGenerated")}
            </button>
          </div>

          <div>
            <p style={labelSt}>{t("fb_customSummary")}</p>
            <textarea
              style={{ ...textareaSt, minHeight: 140 }}
              value={fria.deployment.public_summary}
              onChange={e => onFriaChange(prev => ({
                ...prev,
                deployment: { ...prev.deployment, public_summary: e.target.value },
              }))}
              placeholder={t("fb_ph_publicSummary")}
            />
          </div>
        </div>
      )}
    </div>
  );
}
