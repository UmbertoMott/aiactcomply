"use client";

import React, { useState, CSSProperties } from "react";
import { parseIntakeContext, type IntakeContext } from "@/app/actions/parseIntakeContext";
import { patchShared } from "@/lib/assessment/assessment-helpers";
import { useT } from "@/i18n/LocaleProvider";

const T = {
  text: "#0D1016", muted: "rgba(0,0,0,0.42)", faint: "rgba(0,0,0,0.28)",
  border: "rgba(0,0,0,0.08)", card: "#ffffff", bg: "#f8f8f7",
  red: "#dc2626", redBg: "rgba(220,38,38,0.06)", redBdr: "rgba(220,38,38,0.2)",
  amber: "#d97706", amberBg: "rgba(202,138,4,0.06)", amberBdr: "rgba(202,138,4,0.2)",
  green: "#16a34a", greenBg: "rgba(22,163,74,0.06)", greenBdr: "rgba(22,163,74,0.2)",
} as const;

const inputSt: CSSProperties = {
  width: "100%", padding: "7px 10px", borderRadius: 8,
  border: `1px solid ${T.border}`, fontSize: 12, color: T.text,
  background: T.card, outline: "none",
};

const cardSt: CSSProperties = {
  background: T.card, border: `1px solid ${T.border}`,
  borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};

function Lbl({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: T.muted, marginBottom: 4 }}>
      {children}{required && <span style={{ color: T.red }}> *</span>}
    </label>
  );
}

interface UnifiedIntakeProps {
  intake: IntakeContext;
  setIntake: React.Dispatch<React.SetStateAction<IntakeContext>>;
  onParsed?: (ctx: IntakeContext) => void;
  defaultOpen?: boolean;
}

export function UnifiedIntake({ intake, setIntake, onParsed, defaultOpen = true }: UnifiedIntakeProps) {
  const t = useT("assessmentShared");
  const [open, setOpen] = useState(defaultOpen);
  const [freeText, setFreeText] = useState("");
  const [parseLoading, setParseLoading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsed, setParsed] = useState(false);

  return (
    <div style={{ ...cardSt, marginBottom: 20, overflow: "hidden" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center",
          justifyContent: "space-between", padding: "12px 16px",
          background: "none", border: "none", cursor: "pointer",
          borderBottom: open ? `1px solid ${T.border}` : "none",
        }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: T.text }}>✦ {t("systemContext")}</span>
          <span style={{ fontSize: 10, color: T.muted }}>{t("systemContextSub")}</span>
          {parsed && (
            <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: T.greenBg, color: T.green, border: `1px solid ${T.greenBdr}` }}>
              ✓ {t("aiExtracted")}
            </span>
          )}
          {(intake.systemName || intake.processingPurpose) && !parsed && (
            <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "rgba(0,0,0,0.04)", color: T.text, border: `1px solid ${T.border}` }}>
              ✦ {t("fromStorage")}
            </span>
          )}
        </div>
        <span style={{ fontSize: 14, color: T.muted }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ padding: 12, borderRadius: 8, background: "rgba(0,0,0,0.04)", border: `1px solid ${T.border}` }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: T.text, marginBottom: 6 }}>
              ✦ {t("describeNatural")}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <textarea
                rows={2}
                value={freeText}
                onChange={e => setFreeText(e.target.value)}
                placeholder={t("ph_freeText")}
                style={{ flex: 1, padding: "7px 10px", borderRadius: 6, border: `1px solid ${T.border}`, fontSize: 11, resize: "vertical", fontFamily: "inherit", background: "#fff" }}
              />
              <button
                disabled={parseLoading || !freeText.trim()}
                onClick={async () => {
                  setParseLoading(true);
                  setParseError(null);
                  const res = await parseIntakeContext(freeText);
                  setParseLoading(false);
                  if (res.intake) {
                    setIntake(res.intake);
                    setParsed(true);
                    patchShared({
                      systemName: res.intake.systemName,
                      purpose: res.intake.processingPurpose,
                      personalDataCategories: res.intake.dataCategories,
                    });
                    onParsed?.(res.intake);
                  } else {
                    setParseError(t("parseError"));
                  }
                }}
                style={{
                  padding: "0 14px", borderRadius: 7,
                  background: parseLoading || !freeText.trim() ? "rgba(0,0,0,0.06)" : T.text,
                  color: parseLoading || !freeText.trim() ? T.muted : "#fff",
                  border: "none", fontSize: 11, fontWeight: 600,
                  cursor: parseLoading || !freeText.trim() ? "default" : "pointer",
                  whiteSpace: "nowrap",
                }}>
                {parseLoading ? t("parsing") : t("extract")}
              </button>
            </div>
            {parseError && <p style={{ fontSize: 10, color: T.red, marginTop: 4 }}>{parseError}</p>}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <Lbl required>{t("systemNameLabel")}</Lbl>
              <input
                value={intake.systemName}
                onChange={e => setIntake(p => ({ ...p, systemName: e.target.value }))}
                placeholder={t("ph_systemNameAi")}
                style={inputSt}
              />
            </div>
            <div>
              <Lbl required>{t("scopeLabel")}</Lbl>
              <select
                value={intake.systemScope}
                onChange={e => setIntake(p => ({ ...p, systemScope: e.target.value as IntakeContext["systemScope"] }))}
                style={inputSt}>
                <option value="other">{t("selectPlaceholder")}</option>
                <option value="hr_recruitment">{t("scope_hr_recruitment")}</option>
                <option value="hr_performance">{t("scope_hr_performance")}</option>
                <option value="credit_scoring">{t("scope_credit_scoring")}</option>
                <option value="fraud_detection">{t("scope_fraud_detection")}</option>
                <option value="health_diagnosis">{t("scope_health_diagnosis")}</option>
                <option value="health_monitoring">{t("scope_health_monitoring")}</option>
                <option value="education_assessment">{t("scope_education_assessment")}</option>
                <option value="public_services">{t("scope_public_services")}</option>
                <option value="biometric_identification">{t("scope_biometric_identification")}</option>
                <option value="marketing_profiling">{t("scope_marketing_profiling")}</option>
                <option value="safety_critical">{t("scope_safety_critical")}</option>
              </select>
            </div>
          </div>

          <div>
            <Lbl required>{t("purposeLabel")}</Lbl>
            <textarea
              rows={2}
              value={intake.processingPurpose}
              onChange={e => setIntake(p => ({ ...p, processingPurpose: e.target.value }))}
              placeholder={t("ph_purpose")}
              style={{ ...inputSt, resize: "vertical" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <Lbl>{t("subjectScale")}</Lbl>
              <select
                value={intake.subjectScale}
                onChange={e => setIntake(p => ({ ...p, subjectScale: e.target.value as IntakeContext["subjectScale"] }))}
                style={inputSt}>
                <option value="large_scale_unknown">{t("scale_unknown")}</option>
                <option value="under_100">&lt; 100</option>
                <option value="100_to_10k">100 – 10.000</option>
                <option value="10k_to_1m">10.000 – 1M</option>
                <option value="over_1m">&gt; 1.000.000</option>
              </select>
            </div>
            <div>
              <Lbl>{t("automatedDecisions")}</Lbl>
              <select
                value={intake.automatedDecisions}
                onChange={e => setIntake(p => ({ ...p, automatedDecisions: e.target.value as IntakeContext["automatedDecisions"] }))}
                style={inputSt}>
                <option value="no">{t("no")}</option>
                <option value="partial">{t("partial")}</option>
                <option value="yes">{t("ad_yes")}</option>
              </select>
            </div>
            <div>
              <Lbl>{t("highRiskLabel")}</Lbl>
              <select
                value={intake.highRiskAIAct}
                onChange={e => setIntake(p => ({ ...p, highRiskAIAct: e.target.value as IntakeContext["highRiskAIAct"] }))}
                style={inputSt}>
                <option value="unknown">{t("hr_unknown")}</option>
                <option value="yes">{t("hr_yes")}</option>
                <option value="no">{t("no")}</option>
              </select>
            </div>
          </div>

          <div>
            <Lbl>{t("dataCategoriesLabel")}</Lbl>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {([
                { v: "comuni", l: t("dc_comuni") },
                { v: "art9_salute", l: t("dc_art9_salute") },
                { v: "art9_origine_etnica", l: t("dc_art9_origine_etnica") },
                { v: "art9_biometrici", l: t("dc_art9_biometrici") },
                { v: "art9_genetici", l: t("dc_art9_genetici") },
                { v: "art9_orientamento_sessuale", l: t("dc_art9_orientamento_sessuale") },
                { v: "art9_religione", l: t("dc_art9_religione") },
                { v: "giudiziari", l: t("dc_giudiziari") },
                { v: "localizzazione", l: t("dc_localizzazione") },
                { v: "comportamentali", l: t("dc_comportamentali") },
              ] as const).map(({ v, l }) => {
                const active = intake.dataCategories.includes(v);
                return (
                  <button key={v} onClick={() => setIntake(p => ({
                    ...p,
                    dataCategories: active
                      ? p.dataCategories.filter(x => x !== v)
                      : [...p.dataCategories, v],
                  }))} style={{
                    fontSize: 10, padding: "3px 8px", borderRadius: 4,
                    cursor: "pointer", fontWeight: 500, border: "1px solid",
                    background: active ? (v.startsWith("art9") ? T.redBg : "rgba(0,0,0,0.04)") : "rgba(0,0,0,0.03)",
                    color: active ? (v.startsWith("art9") ? T.red : T.text) : T.muted,
                    borderColor: active ? (v.startsWith("art9") ? T.redBdr : T.border) : T.border,
                  }}>
                    {active ? "✓ " : ""}{l}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            {([
              { key: "crossBorderTransfer" as const, label: t("crossBorder"), warn: "Art. 44 GDPR" },
              { key: "vulnerableSubjects" as const, label: t("vulnerableSubjects"), warn: t("vulnerableWarn") },
            ]).map(({ key, label, warn }) => (
              <button key={key} onClick={() => setIntake(p => ({ ...p, [key]: !p[key] }))}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "5px 10px",
                  borderRadius: 6, cursor: "pointer", fontSize: 11, border: "1px solid",
                  background: intake[key] ? T.amberBg : "rgba(0,0,0,0.03)",
                  color: intake[key] ? T.amber : T.muted,
                  borderColor: intake[key] ? T.amberBdr : T.border,
                }}>
                <span style={{ width: 14, height: 14, borderRadius: 3, border: "1.5px solid currentColor", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9 }}>
                  {intake[key] ? "✓" : ""}
                </span>
                {label} <span style={{ fontSize: 10, opacity: 0.7 }}>({warn})</span>
              </button>
            ))}
          </div>

          {(!intake.systemName.trim() || !intake.processingPurpose.trim()) && (
            <p style={{ fontSize: 10, color: T.amber, padding: "5px 8px", borderRadius: 5, background: T.amberBg, border: `1px solid ${T.amberBdr}` }}>
              ⚠ {t("fillAtLeast1")} <strong>{t("systemNameShort")}</strong> {t("and")} <strong>{t("purposeShort")}</strong> {t("fillAtLeast2")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
