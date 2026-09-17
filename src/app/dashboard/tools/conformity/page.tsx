"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle, XCircle, AlertTriangle, ChevronRight, ChevronDown,
  FileText, Download, Copy, ExternalLink, Shield, BadgeCheck,
  Info, ArrowRight, Loader2,
} from "lucide-react";
import {
  determineAssessmentPath, loadAllEvidence, loadConformitySnapshot,
  saveConformitySnapshot, CONFORMITY_REQUIREMENTS, calculateConformityScore,
  generateDeclarationOfConformity,
  type PathDetermination, type ConformityEvidence, type AssessmentResult,
  type ConformitySnapshot,
} from "@/lib/conformity/conformity-engine";
import { submitToAuthority } from "@/lib/compliance/gateway";
import { writeToStorage } from "@/lib/dossier/storage-schema";
import { appendEvidence } from "@/lib/evidence/evidence-layer";
import { useT } from "@/i18n/LocaleProvider";

type TFn = (key: string) => string;

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#FAFAF9",
  card: "#ffffff",
  text: "#0D1016",
  textSecondary: "rgba(0,0,0,0.42)",
  textTertiary: "rgba(0,0,0,0.3)",
  border: "1px solid rgba(0,0,0,0.07)",
  shadow: "0 1px 3px rgba(0,0,0,0.04)",
  green: "#15803d",
  greenBg: "rgba(22,163,74,0.04)",
  greenBorder: "rgba(22,163,74,0.15)",
  red: "#dc2626",
  redBg: "rgba(220,38,38,0.03)",
  redBorder: "rgba(220,38,38,0.12)",
  amber: "#d97706",
  amberBg: "rgba(217,119,6,0.04)",
  amberBorder: "rgba(217,119,6,0.2)",
} as const;

const cardStyle: React.CSSProperties = {
  background: C.card,
  border: C.border,
  boxShadow: C.shadow,
  borderRadius: 12,
  padding: 20,
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase" as const,
  letterSpacing: "0.8px",
  color: C.textTertiary,
  marginBottom: 4,
};

const btnPrimary: React.CSSProperties = {
  background: C.text,
  color: "#ffffff",
  borderRadius: 9999,
  padding: "8px 16px",
  fontSize: 12,
  fontWeight: 500,
  border: "none",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

const btnGhost: React.CSSProperties = {
  background: "transparent",
  color: "rgba(0,0,0,0.5)",
  borderRadius: 9999,
  padding: "8px 16px",
  fontSize: 12,
  fontWeight: 500,
  border: "1px solid rgba(0,0,0,0.12)",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

// ─── Stepper ─────────────────────────────────────────────────────────────────
const STEPS = [
  { n: 1, key: "step_path" },
  { n: 2, key: "step_req" },
  { n: 3, key: "step_decl" },
  { n: 4, key: "step_ce" },
  { n: 5, key: "step_done" },
] as const;

function Stepper({ step, t }: { step: number; t: TFn }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 32 }}>
      {STEPS.map((s, i) => {
        const completed = step > s.n;
        const active = step === s.n;
        const future = step < s.n;
        return (
          <React.Fragment key={s.n}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: completed ? C.green : active ? C.text : "transparent",
                border: future ? "1.5px solid rgba(0,0,0,0.15)" : "none",
                color: completed || active ? "#fff" : C.textTertiary,
                fontSize: 12, fontWeight: 600,
              }}>
                {completed ? <CheckCircle size={14} color="#fff" /> : s.n}
              </div>
              <span style={{
                fontSize: 10, fontWeight: 500,
                color: completed ? C.green : active ? C.text : C.textTertiary,
                whiteSpace: "nowrap",
              }}>
                {t(s.key)}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                flex: 1, height: 1, background: step > s.n ? C.green : "rgba(0,0,0,0.08)",
                marginBottom: 16, minWidth: 24,
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ConformityPage() {
  const t = useT("toolConformity");
  const [evidence, setEvidence] = useState<ConformityEvidence>({});
  const [path, setPath] = useState<PathDetermination | null>(null);
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(() => {
    if (typeof window === "undefined") return 1;
    const saved = localStorage.getItem("aicomply_conformity_step");
    const n = saved ? parseInt(saved) : 1;
    return ([1, 2, 3, 4, 5].includes(n) ? n : 1) as 1 | 2 | 3 | 4 | 5;
  });
  const [declaration, setDeclaration] = useState<string>("");
  const [signatoryForm, setSignatoryForm] = useState({
    companyName: "", companyAddress: "", signatoryName: "", signatoryRole: "",
  });
  const [snapshot, setSnapshot] = useState<ConformitySnapshot | null>(null);
  const [expandedReq, setExpandedReq] = useState<string | null>(null);
  const [manualForms, setManualForms] = useState<Record<string, { note: string; confirming: boolean }>>({});
  const [declarationGenerated, setDeclarationGenerated] = useState(false);
  const [ceChecklist, setCeChecklist] = useState<Record<string, boolean>>({});
  const [registering, setRegistering] = useState(false);
  const [registrationRef, setRegistrationRef] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try {
      const saved = localStorage.getItem("aicomply_registration_result");
      return saved ? (JSON.parse(saved) as { referenceNumber: string }).referenceNumber ?? "" : "";
    } catch { return ""; }
  });
  const [manualRisk, setManualRisk] = useState("high");
  const [manualAnnex, setManualAnnex] = useState("");
  const [toast, setToast] = useState<string>("");
  const [registrationError, setRegistrationError] = useState<string>("");

  // Persisti lo step corrente
  useEffect(() => {
    localStorage.setItem("aicomply_conformity_step", String(step));
  }, [step]);

  // ─── init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const ev = loadAllEvidence();
    setEvidence(ev);
    const snap = loadConformitySnapshot();
    setSnapshot(snap);

    if (ev.classifier) {
      const p = determineAssessmentPath(
        ev.classifier.annexIII ? (ev.classifier.applicableArticles?.[0] ?? null) : null,
        ev.classifier.riskLevel
      );
      setPath(p);
    }

    const initial: AssessmentResult[] = CONFORMITY_REQUIREMENTS.map((req) => ({
      requirementId: req.id,
      evidenceStatus: req.evidenceExtractor(ev),
      manualOverride: false,
      manualNote: "",
    }));
    setResults(initial);

    try {
      const saved = localStorage.getItem("aicomply_ce_checklist");
      if (saved) setCeChecklist(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  };

  const { score, passed, failed, total } = calculateConformityScore(results);

  // ─── Step 1 ────────────────────────────────────────────────────────────────
  function Step1() {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 500, color: C.text, margin: 0 }}>
          {t("step1_title")}
        </h2>

        {/* Auto or manual path */}
        {evidence.classifier ? (
          path ? (
            <div style={{
              ...cardStyle,
              background: path.path === "self" ? C.greenBg : C.amberBg,
              border: `1px solid ${path.path === "self" ? C.greenBorder : C.amberBorder}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                {path.path === "self"
                  ? <CheckCircle size={16} color={C.green} />
                  : <AlertTriangle size={16} color={C.amber} />}
                <span style={{ fontSize: 13, fontWeight: 600, color: path.path === "self" ? C.green : C.amber }}>
                  {path.path === "self"
                    ? t("pathFromClassifier")
                    : t("notifiedBodyRequired")}
                </span>
              </div>
              <div style={{
                display: "inline-block",
                background: path.path === "self" ? C.green : C.amber,
                color: "#fff",
                borderRadius: 4,
                padding: "2px 8px",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.5px",
                marginBottom: 10,
              }}>
                {path.path === "self" ? t("selfAssessment") : `${t("notifiedBody")} — ${path.applicableArticle}`}
              </div>
              <p style={{ fontSize: 13, color: path.path === "self" ? C.green : C.amber, margin: 0 }}>
                {path.reason}
              </p>

              {path.path === "notified_body" && (
                <>
                  <p style={{ fontSize: 12, color: C.textSecondary, marginTop: 10 }}>
                    {t("nbPrepNote")}
                  </p>
                  <div style={{ marginTop: 12 }}>
                    <p style={{ ...labelStyle, marginBottom: 8 }}>{t("accreditedNb")}</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[
                        { name: "TÜV SÜD", country: t("country_germany"), spec: "Safety, AI Systems, Machinery", url: "https://www.tuvsud.com" },
                        { name: "Bureau Veritas", country: t("country_france"), spec: "Product Safety, Digital Systems", url: "https://www.bureauveritas.com" },
                        { name: "BSI Group", country: "UK/EU", spec: "IT Security, AI Governance", url: "https://www.bsigroup.com" },
                        { name: "DNV", country: t("country_norway"), spec: "Risk Management, Digital Trust", url: "https://www.dnv.com" },
                      ].map((nb) => (
                        <div key={nb.name} style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          background: "#fff", borderRadius: 8, padding: "8px 12px",
                          border: "1px solid rgba(0,0,0,0.07)",
                        }}>
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{nb.name}</span>
                            <span style={{ fontSize: 11, color: C.textTertiary, marginLeft: 8 }}>{nb.country}</span>
                            <div style={{ fontSize: 11, color: C.textSecondary }}>{nb.spec}</div>
                          </div>
                          <a href={nb.url} target="_blank" rel="noopener noreferrer"
                            style={{ color: C.textSecondary, display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                            <ExternalLink size={12} /> {t("site")}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div style={{ ...cardStyle, color: C.textSecondary, fontSize: 13 }}>
              {t("computingPath")}
            </div>
          )
        ) : (
          /* Manual determination */
          <div style={cardStyle}>
            <p style={{ fontSize: 13, color: C.textSecondary, marginBottom: 16 }}>
              {t("classifierNotDone")}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>{t("riskLevel")}</label>
                <select
                  value={manualRisk}
                  onChange={(e) => setManualRisk(e.target.value)}
                  style={{
                    width: "100%", padding: "8px 10px", fontSize: 13, border: C.border,
                    borderRadius: 8, background: "#fff", color: C.text,
                  }}
                >
                  <option value="high">High</option>
                  <option value="limited">Limited</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>{t("annexIIICat")}</label>
                <input
                  type="text"
                  placeholder={t("annexIIIPh")}
                  value={manualAnnex}
                  onChange={(e) => setManualAnnex(e.target.value)}
                  style={{
                    width: "100%", padding: "8px 10px", fontSize: 13, border: C.border,
                    borderRadius: 8, background: "#fff", color: C.text, boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
            <button
              style={btnPrimary}
              onClick={() => {
                const p = determineAssessmentPath(manualAnnex || null, manualRisk);
                setPath(p);
              }}
            >
              {t("determinePath")} <ArrowRight size={13} />
            </button>

            {path && (
              <div style={{
                marginTop: 16,
                padding: 12,
                borderRadius: 8,
                background: path.path === "self" ? C.greenBg : C.amberBg,
                border: `1px solid ${path.path === "self" ? C.greenBorder : C.amberBorder}`,
              }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: path.path === "self" ? C.green : C.amber }}>
                  {path.path === "self" ? t("selfAssessment") : t("notifiedBodyRequiredShort")}
                </span>
                <p style={{ fontSize: 12, color: C.textSecondary, margin: "4px 0 0" }}>{path.reason}</p>
              </div>
            )}
          </div>
        )}

        {/* Info box */}
        <div style={{
          ...cardStyle,
          background: "rgba(13,16,22,0.02)",
          border: "1px solid rgba(13,16,22,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <Info size={14} color={C.textSecondary} />
            <span style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary }}>
              {t("whatIsSelfAssess")}
            </span>
          </div>
          <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              t("selfStep1"),
              t("selfStep2"),
              t("selfStep3"),
              t("selfStep4"),
            ].map((item, i) => (
              <li key={i} style={{ fontSize: 12, color: C.textSecondary }}>{item}</li>
            ))}
          </ol>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            style={{ ...btnPrimary, opacity: path ? 1 : 0.4, cursor: path ? "pointer" : "not-allowed" }}
            disabled={!path}
            onClick={() => setStep(2)}
          >
            {t("nextReqs")} <ChevronRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  // ─── Step 2 ────────────────────────────────────────────────────────────────
  function Step2() {
    const verified = results.filter((r) => r.evidenceStatus.found || r.manualOverride).length;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 18, fontWeight: 500, color: C.text, margin: 0 }}>
            {t("step2_title")}
          </h2>
          <span style={{ fontSize: 12, color: C.textSecondary }}>
            {verified} {t("ofWord")} {total} {t("reqsVerified")}
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ height: 4, background: "rgba(0,0,0,0.06)", borderRadius: 9999, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${(verified / total) * 100}%`,
            background: C.green, borderRadius: 9999, transition: "width 0.4s",
          }} />
        </div>

        {/* Requirements */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {CONFORMITY_REQUIREMENTS.map((req) => {
            const result = results.find((r) => r.requirementId === req.id);
            if (!result) return null;
            const found = result.evidenceStatus.found || result.manualOverride;
            const isWarning = found && result.evidenceStatus.summary.includes("⚠️");
            const expanded = expandedReq === req.id;
            const mf = manualForms[req.id] ?? { note: "", confirming: false };

            const cardBg = isWarning
              ? { background: C.amberBg, border: `1px solid ${C.amberBorder}` }
              : found
                ? { background: C.greenBg, border: `1px solid ${C.greenBorder}` }
                : { background: C.redBg, border: `1px solid ${C.redBorder}` };

            return (
              <div key={req.id} style={{ ...cardStyle, ...cardBg, padding: 0, overflow: "hidden" }}>
                {/* Header */}
                <button
                  onClick={() => setExpandedReq(expanded ? null : req.id)}
                  style={{
                    width: "100%", background: "none", border: "none", cursor: "pointer",
                    padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, textAlign: "left",
                  }}
                >
                  {isWarning
                    ? <AlertTriangle size={15} color={C.amber} />
                    : found
                      ? <CheckCircle size={15} color={C.green} />
                      : <XCircle size={15} color={C.red} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        fontSize: 13, fontWeight: 600,
                        color: isWarning ? C.amber : found ? C.green : C.red,
                      }}>
                        {found ? "✓" : "✗"} {req.article} — {req.title}
                      </span>
                      <span style={{
                        fontSize: 10, padding: "1px 6px", borderRadius: 4,
                        background: "rgba(0,0,0,0.06)", color: C.textSecondary,
                      }}>
                        {req.article}
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: C.textSecondary, margin: "2px 0 0" }}>
                      {result.evidenceStatus.summary}
                    </p>
                  </div>
                  {expanded ? <ChevronDown size={14} color={C.textTertiary} /> : <ChevronRight size={14} color={C.textTertiary} />}
                </button>

                {/* Expanded */}
                {expanded && (
                  <div style={{ padding: "0 16px 16px", borderTop: "1px solid rgba(0,0,0,0.05)" }}>
                    <p style={{ fontSize: 13, color: C.textSecondary, marginTop: 12 }}>{req.description}</p>
                    <div style={{
                      fontStyle: "italic", fontSize: 12, color: C.textSecondary,
                      background: "rgba(0,0,0,0.02)", borderRadius: 6, padding: "8px 12px", margin: "8px 0",
                    }}>
                      {req.verificationQuestion}
                    </div>

                    {!found && !result.manualOverride && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {req.linkedToolHref && (
                          <Link
                            href={req.linkedToolHref}
                            style={{
                              fontSize: 12, color: C.text, fontWeight: 500,
                              display: "inline-flex", alignItems: "center", gap: 4,
                            }}
                          >
                            {t("complete")} {req.linkedToolKey} <ArrowRight size={12} />
                          </Link>
                        )}
                        <div>
                          <button
                            style={{ ...btnGhost, fontSize: 11 }}
                            onClick={() => setManualForms((prev) => ({
                              ...prev,
                              [req.id]: { ...mf, confirming: !mf.confirming },
                            }))}
                          >
                            {t("verifyManually")}
                          </button>
                          {mf.confirming && (
                            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                              <textarea
                                placeholder={t("describeReqPh")}
                                value={mf.note}
                                onChange={(e) => setManualForms((prev) => ({
                                  ...prev,
                                  [req.id]: { ...mf, note: e.target.value },
                                }))}
                                style={{
                                  width: "100%", minHeight: 80, padding: "8px 10px",
                                  fontSize: 12, border: C.border, borderRadius: 8,
                                  resize: "vertical", fontFamily: "inherit", color: C.text,
                                  boxSizing: "border-box",
                                }}
                              />
                              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.textSecondary }}>
                                <input
                                  type="checkbox"
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setResults((prev) => prev.map((r) =>
                                        r.requirementId === req.id
                                          ? { ...r, manualOverride: true, manualNote: mf.note }
                                          : r
                                      ));
                                      setExpandedReq(null);
                                    }
                                  }}
                                />
                                {t("confirmReqMet")}
                              </label>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Score */}
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>
              {passed}/{total} {t("reqsVerified")} ({score}%)
            </span>
            <span style={{ fontSize: 12, color: C.textSecondary }}>{failed} {t("missingWord")}</span>
          </div>
          <div style={{ height: 6, background: "rgba(0,0,0,0.06)", borderRadius: 9999, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${score}%`,
              background: score === 100 ? C.green : score >= 70 ? C.amber : C.red,
              borderRadius: 9999, transition: "width 0.4s",
            }} />
          </div>
          {score < 100 && (
            <p style={{ fontSize: 11, color: C.amber, marginTop: 8 }}>
              ⚠️ {failed} {t("reqsMissingNote")}
            </p>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button style={btnPrimary} onClick={() => setStep(3)}>
            {t("nextDeclaration")} <ChevronRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  // ─── Step 3 ────────────────────────────────────────────────────────────────
  function Step3() {
    const handleGenerate = () => {
      const decl = generateDeclarationOfConformity(
        evidence, results,
        signatoryForm.companyName, signatoryForm.companyAddress,
        signatoryForm.signatoryName, signatoryForm.signatoryRole
      );
      setDeclaration(decl);
      setDeclarationGenerated(true);
    };

    const handleCopy = () => {
      navigator.clipboard.writeText(declaration).then(() => showToast(t("toast_copied")));
    };

    const handleDownload = () => {
      const blob = new Blob([declaration], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "dichiarazione-conformita-UE.txt";
      a.click();
      URL.revokeObjectURL(url);
      showToast(t("toast_downloaded"));
    };

    const handleSaveDossier = () => {
      const completedAt = new Date().toISOString();
      writeToStorage("conformity", {
        path: path?.path ?? "self",
        score,
        passed,
        total,
        declarationGenerated: true,
        completedAt,
      });
      appendEvidence(
        "adr",
        {
          type: "Conformity Assessment — Dichiarazione di Conformità UE Art. 43 + Art. 47",
          assessmentPath: path?.path ?? "self",
          pathReason: path?.reason ?? "—",
          score,
          passed,
          total,
          declarationGenerated: true,
          signatoryName: signatoryForm.signatoryName,
          signatoryRole: signatoryForm.signatoryRole,
          companyName: signatoryForm.companyName,
          savedAt: completedAt,
        },
        "conformity"
      );
      showToast(t("toast_savedDossier"));
    };

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 500, color: C.text, margin: 0 }}>
          {t("step3_title")}
        </h2>

        {/* Signatory form */}
        <div style={cardStyle}>
          <p style={{ ...labelStyle, marginBottom: 12 }}>{t("signatoryData")}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {([
              { key: "companyName", label: t("companyName"), placeholder: "Acme S.r.l." },
              { key: "companyAddress", label: t("companyAddress"), placeholder: "Milano, Italia" },
              { key: "signatoryName", label: t("signatoryName"), placeholder: "Mario Rossi" },
              { key: "signatoryRole", label: t("signatoryRole"), placeholder: "CEO / Responsabile Conformità" },
            ] as const).map(({ key, label, placeholder }) => (
              <div key={key}>
                <label style={labelStyle}>{label}</label>
                <input
                  type="text"
                  placeholder={placeholder}
                  value={signatoryForm[key]}
                  onChange={(e) => setSignatoryForm((prev) => ({ ...prev, [key]: e.target.value }))}
                  style={{
                    width: "100%", padding: "8px 10px", fontSize: 13, border: C.border,
                    borderRadius: 8, background: "#fff", color: C.text, boxSizing: "border-box",
                  }}
                />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            <button style={btnPrimary} onClick={handleGenerate}>
              <FileText size={13} /> {t("generateDeclaration")}
            </button>
          </div>
        </div>

        {/* Declaration output */}
        {declarationGenerated && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <textarea
              value={declaration}
              onChange={(e) => setDeclaration(e.target.value)}
              style={{
                width: "100%", height: 500, padding: "12px 14px",
                fontFamily: "'Courier New', monospace", whiteSpace: "pre",
                fontSize: "11px", border: C.border, borderRadius: 8,
                resize: "vertical", color: C.text, background: "#fafaf9",
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button style={btnGhost} onClick={handleCopy}>
                <Copy size={13} /> {t("copyText")}
              </button>
              <button style={btnGhost} onClick={handleDownload}>
                <Download size={13} /> {t("downloadTxt")}
              </button>
              <button style={btnGhost} onClick={handleSaveDossier}>
                <BadgeCheck size={13} /> {t("saveToDossier")}
              </button>
            </div>
          </div>
        )}

        {/* Info box */}
        <div style={{
          ...cardStyle,
          background: "rgba(13,16,22,0.02)",
          border: "1px solid rgba(13,16,22,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Info size={14} color={C.textSecondary} />
            <span style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary }}>
              {t("afterPrinting")}
            </span>
          </div>
          <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
            {[
              t("printStep1"),
              t("printStep2"),
              t("printStep3"),
              t("printStep4"),
            ].map((item, i) => (
              <li key={i} style={{ fontSize: 12, color: C.textSecondary }}>{item}</li>
            ))}
          </ol>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button style={btnPrimary} onClick={() => setStep(4)}>
            {t("nextCe")} <ChevronRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  // ─── Step 4 ────────────────────────────────────────────────────────────────
  function Step4() {
    const systemName = evidence.classifier?.systemName || evidence.docugen?.systemName || "—";
    const riskClass = evidence.classifier?.riskLevel || "high";

    const ceItems: Array<{ key: string; label: string }> = [
      { key: "dichiarazione_firmata", label: t("ce_signedDecl") },
      { key: "documentazione_completa", label: t("ce_techDoc") },
      { key: "identificazione", label: t("ce_identifiable") },
      { key: "marcatura_apposta", label: t("ce_marked") },
      ...(path?.mandatoryNotifiedBody
        ? [{ key: "certificato_notificato", label: t("ce_nbCert") }]
        : []),
    ];

    const toggleCe = (key: string) => {
      const updated = { ...ceChecklist, [key]: !ceChecklist[key] };
      setCeChecklist(updated);
      localStorage.setItem("aicomply_ce_checklist", JSON.stringify(updated));
    };

    const handleRegister = async () => {
      setRegistering(true);
      setRegistrationError("");
      try {
        const docs = [
          "Documentazione tecnica (Allegato IV)",
          "Dichiarazione di Conformità UE",
        ];
        const result = await submitToAuthority(systemName, riskClass, docs);
        setRegistrationRef(result.referenceNumber);
        localStorage.setItem("aicomply_registration_result", JSON.stringify(result));
      } catch (err) {
        setRegistrationError(err instanceof Error ? err.message : t("submitError"));
      } finally {
        setRegistering(false);
      }
    };

    const handleComplete = () => {
      const completedAt = new Date().toISOString();
      const ceMarkingApplied = Object.values(ceChecklist).filter(Boolean).length >= 3;
      const registeredInDatabase = !!registrationRef;
      const currentSystemName = evidence.classifier?.systemName || evidence.docugen?.systemName || "—";
      const currentRiskClass = evidence.classifier?.riskLevel || "high";

      saveConformitySnapshot({
        path: path?.path ?? "self",
        score,
        results,
        declarationGenerated,
        ceMarkingApplied,
        registeredInDatabase,
        completedAt,
      });

      appendEvidence(
        "adr",
        {
          type: "Conformity Assessment completato — Art. 43 + Art. 48 + Art. 49",
          assessmentPath: path?.path ?? "self",
          score,
          passed,
          total,
          declarationGenerated,
          ceMarkingApplied,
          registeredInDatabase,
          registrationRef: registrationRef || null,
          ceChecklistItems: Object.entries(ceChecklist)
            .filter(([, v]) => v)
            .map(([k]) => k),
          systemName: currentSystemName,
          riskClass: currentRiskClass,
          completedAt,
        },
        "conformity"
      );

      localStorage.setItem("aicomply_conformity_step", "5");
      setStep(5);
    };

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 500, color: C.text, margin: 0 }}>
          {t("step4_title")}
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Left: CE Marking */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={cardStyle}>
              <p style={{ ...labelStyle, marginBottom: 12 }}>{t("ceMarkingTitle")}</p>

              {/* Visual CE mark */}
              <div style={{
                textAlign: "center", padding: "24px 16px",
                border: "2px solid rgba(0,0,0,0.12)", borderRadius: 8, marginBottom: 16,
              }}>
                <div style={{
                  fontSize: 48, fontWeight: 200, letterSpacing: 8, color: C.text,
                  lineHeight: 1, fontFamily: "serif",
                }}>
                  CE
                </div>
                <div style={{ fontSize: 11, color: C.textTertiary, marginTop: 6, letterSpacing: "0.5px" }}>
                  {t("ceMarkAiAct")}
                </div>
              </div>

              {/* Checklist */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {ceItems.map(({ key, label }) => (
                  <label
                    key={key}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 8,
                      fontSize: 12, cursor: "pointer",
                      color: ceChecklist[key] ? C.green : C.textSecondary,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!ceChecklist[key]}
                      onChange={() => toggleCe(key)}
                      style={{ marginTop: 1, cursor: "pointer" }}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* Warning */}
            <div style={{
              ...cardStyle,
              background: C.amberBg,
              border: `1px solid ${C.amberBorder}`,
            }}>
              <p style={{ fontSize: 12, color: C.amber, margin: 0, fontWeight: 600 }}>
                ⚠️ {t("ceCannotWithout")}
              </p>
              <ol style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                <li style={{ fontSize: 12, color: C.amber }}>{t("ceReq1")}</li>
                <li style={{ fontSize: 12, color: C.amber }}>{t("ceReq2")}</li>
              </ol>
            </div>
          </div>

          {/* Right: Registration */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={cardStyle}>
              <p style={{ ...labelStyle, marginBottom: 12 }}>{t("euDbTitle")}</p>

              {/* Pre-filled info */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                <div>
                  <p style={labelStyle}>{t("aiSystemLabel")}</p>
                  <p style={{ fontSize: 13, color: C.text, margin: 0, fontWeight: 500 }}>{systemName}</p>
                </div>
                <div>
                  <p style={labelStyle}>{t("riskLevelShort")}</p>
                  <p style={{ fontSize: 13, color: C.text, margin: 0, textTransform: "capitalize" }}>{riskClass}</p>
                </div>
              </div>

              {/* Documents */}
              <p style={{ ...labelStyle, marginBottom: 8 }}>{t("requiredDocs")}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                {[
                  { label: t("doc_techDocuGen"), done: !!evidence.docugen },
                  { label: t("doc_declThis"), done: declarationGenerated },
                  { label: t("doc_testResults"), done: false },
                ].map(({ label, done }) => (
                  <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    {done
                      ? <CheckCircle size={14} color={C.green} style={{ marginTop: 1, flexShrink: 0 }} />
                      : <div style={{ width: 14, height: 14, borderRadius: "50%", border: "1.5px solid rgba(0,0,0,0.15)", flexShrink: 0, marginTop: 1 }} />}
                    <span style={{ fontSize: 12, color: done ? C.green : C.textSecondary }}>{label}</span>
                  </div>
                ))}
              </div>

              {/* Register button */}
              {registrationRef ? (
                <div style={{
                  padding: "10px 12px", borderRadius: 8,
                  background: C.greenBg, border: `1px solid ${C.greenBorder}`,
                }}>
                  <p style={{ fontSize: 12, color: C.green, margin: 0, fontWeight: 600 }}>
                    ✓ {t("notifSent")} {registrationRef}
                  </p>
                </div>
              ) : (
                <button
                  style={{ ...btnPrimary, opacity: registering ? 0.7 : 1 }}
                  onClick={handleRegister}
                  disabled={registering}
                >
                  {registering ? (
                    <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> {t("submitting")}</>
                  ) : (
                    <><Shield size={13} /> {t("submitNotif")}</>
                  )}
                </button>
              )}

              {registrationError && (
                <p style={{ fontSize: 12, color: C.red, marginTop: 8 }}>{registrationError}</p>
              )}
            </div>

            {/* NANDO note */}
            <div style={{
              ...cardStyle,
              background: "rgba(13,16,22,0.02)",
              border: "1px solid rgba(13,16,22,0.06)",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <Info size={13} color={C.textTertiary} style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 11, color: C.textSecondary, margin: 0 }}>
                  {t("nandoNote")}{" "}
                  <a
                    href="https://ec.europa.eu/growth/tools-databases/nando"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: C.textSecondary }}
                  >
                    NANDO (ec.europa.eu/growth/tools-databases/nando)
                  </a>.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button style={btnPrimary} onClick={handleComplete}>
            {t("completeAssessment")} <ChevronRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  // ─── Step 5 ────────────────────────────────────────────────────────────────
  function Step5() {
    const currentSnap = loadConformitySnapshot();
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Banner */}
        <div style={{
          ...cardStyle,
          background: C.greenBg,
          border: `1px solid ${C.greenBorder}`,
          textAlign: "center",
          padding: "32px 20px",
        }}>
          <CheckCircle size={40} color={C.green} style={{ marginBottom: 12 }} />
          <h2 style={{ fontSize: 22, fontWeight: 500, color: C.green, margin: "0 0 8px" }}>
            {t("step5_title")}
          </h2>
          <p style={{ fontSize: 13, color: C.green, margin: 0 }}>
            {passed}/{total} {t("reqsArt917Verified")}
          </p>
        </div>

        {/* Score bar */}
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{t("conformityScore")}</span>
            <span style={{ fontSize: 12, color: C.textSecondary }}>{score}%</span>
          </div>
          <div style={{ height: 8, background: "rgba(0,0,0,0.06)", borderRadius: 9999, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${score}%`,
              background: C.text, borderRadius: 9999,
            }} />
          </div>
        </div>

        {/* Summary checklist */}
        <div style={cardStyle}>
          <p style={{ ...labelStyle, marginBottom: 12 }}>{t("assessmentSummary")}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              {
                label: t("sum_path"),
                value: path ? (path.path === "self" ? t("sum_selfAssess") : t("sum_nbRequired")) : t("sum_notDetermined"),
                ok: !!path,
              },
              {
                label: t("sum_reqs"),
                value: `${passed}/${total} ${t("verifiedWord")}`,
                ok: passed > 0,
              },
              {
                label: t("sum_declaration"),
                value: declarationGenerated ? t("sum_generated") : t("sum_toGenerate"),
                ok: declarationGenerated,
              },
              {
                label: t("sum_euDb"),
                value: registrationRef ? `Ref: ${registrationRef}` : t("sum_toComplete"),
                ok: !!registrationRef,
              },
            ].map(({ label, value, ok }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {ok
                  ? <CheckCircle size={15} color={C.green} />
                  : <XCircle size={15} color={C.red} />}
                <div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: ok ? C.green : C.red }}>{label}: </span>
                  <span style={{ fontSize: 13, color: C.textSecondary }}>{value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/dashboard/dossier">
            <button style={btnPrimary}>
              <FileText size={13} /> {t("generateFullDossier")}
            </button>
          </Link>
          <button style={btnGhost} onClick={() => setStep(1)}>
            {t("reviewAssessment")}
          </button>
          <button style={btnGhost} onClick={() => {
            localStorage.removeItem("aicomply_conformity_step");
            setStep(1);
          }}>
            {t("startOver")}
          </button>
        </div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: C.bg, minHeight: "100vh", padding: "32px 24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <p style={labelStyle}>{t("kicker")}</p>
          <h1 style={{ fontSize: 24, fontWeight: 400, letterSpacing: "-0.8px", color: C.text, margin: "4px 0 8px" }}>
            Conformity Assessment
          </h1>
          <p style={{ fontSize: 13, color: C.textSecondary, margin: 0 }}>
            {t("subtitle")}
          </p>
        </div>

        {/* Stepper */}
        <Stepper step={step} t={t} />

        {/* Step content */}
        {step === 1 && <Step1 />}
        {step === 2 && <Step2 />}
        {step === 3 && <Step3 />}
        {step === 4 && <Step4 />}
        {step === 5 && <Step5 />}

        {/* Toast */}
        {toast && (
          <div style={{
            position: "fixed", bottom: 24, right: 24,
            background: C.text, color: "#fff",
            borderRadius: 8, padding: "10px 16px",
            fontSize: 13, fontWeight: 500,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 9999,
          }}>
            {toast}
          </div>
        )}

        {/* Spinner keyframes */}
        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </div>
  );
}
