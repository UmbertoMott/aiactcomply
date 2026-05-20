"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart2,
  AlertTriangle,
  CheckCircle,
  Info,
  ArrowRight,
  Copy,
  Download,
  RefreshCw,
  Shield,
} from "lucide-react";
import {
  computeGlobalFeatureImportance,
  runBiasAnalysis,
  generateCounterfactuals,
  generateXAIReport,
  saveXAISnapshot,
  loadXAISnapshot,
  GlobalFeatureImportance,
  BiasAnalysisResult,
  CounterfactualScenario,
  XAIReport,
} from "@/lib/xai/xai-engine";
import { writeToStorage } from "@/lib/dossier/storage-schema";
import { appendEvidence } from "@/lib/evidence/evidence-layer";
import Link from "next/link";

// ─── SHARED STYLES ────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid rgba(0,0,0,0.07)",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  borderRadius: "12px",
  padding: "20px",
};

const badge = (bg: string, color: string): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "2px 8px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: 600,
  background: bg,
  color,
  letterSpacing: "0.02em",
});

const btn = (primary: boolean, small?: boolean): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: small ? "6px 12px" : "8px 16px",
  borderRadius: "8px",
  fontSize: small ? "12px" : "13px",
  fontWeight: 600,
  cursor: "pointer",
  border: primary ? "none" : "1px solid rgba(0,0,0,0.12)",
  background: primary ? "#0D1016" : "#ffffff",
  color: primary ? "#ffffff" : "#0D1016",
  transition: "opacity 0.15s",
});

// ─── TAB TYPES ────────────────────────────────────────────────────────────────

type Tab = "importance" | "bias" | "counterfactual" | "report";

// ─── SEVERITY HELPERS ─────────────────────────────────────────────────────────

function severityColor(severity: BiasAnalysisResult["severity"]): string {
  if (severity === "critical") return "#dc2626";
  if (severity === "warning") return "#d97706";
  return "#16a34a";
}

function severityBg(severity: BiasAnalysisResult["severity"]): string {
  if (severity === "critical") return "#fef2f2";
  if (severity === "warning") return "#fffbeb";
  return "#f0fdf4";
}

function feasibilityColor(f: "easy" | "medium" | "hard"): string {
  if (f === "easy") return "#16a34a";
  if (f === "medium") return "#d97706";
  return "#dc2626";
}

function feasibilityBg(f: "easy" | "medium" | "hard"): string {
  if (f === "easy") return "#f0fdf4";
  if (f === "medium") return "#fffbeb";
  return "#fef2f2";
}

function scoreColor(score: number): string {
  if (score >= 75) return "#16a34a";
  if (score >= 50) return "#d97706";
  return "#dc2626";
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function FeatureImportanceTab({
  features,
  loading,
  onCalculate,
}: {
  features: GlobalFeatureImportance[] | null;
  loading: boolean;
  onCalculate: () => void;
}) {
  const maxShap = features ? Math.max(...features.map((f) => f.meanAbsShap)) : 1;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <div>
          <p style={{ fontSize: "13px", color: "rgba(0,0,0,0.42)", margin: 0 }}>
            Valori SHAP medi assoluti — più alto = più influente sulla decisione del modello
          </p>
        </div>
        <button
          style={btn(true)}
          onClick={onCalculate}
          disabled={loading}
        >
          <RefreshCw size={13} style={{ opacity: loading ? 0.5 : 1 }} />
          {loading ? "Calcolo…" : "Calcola (n=200 campioni)"}
        </button>
      </div>

      {!features ? (
        <div style={{ ...card, textAlign: "center", padding: "48px 20px" }}>
          <BarChart2 size={32} style={{ color: "#6366f1", marginBottom: "12px" }} />
          <p style={{ color: "rgba(0,0,0,0.42)", fontSize: "14px", margin: 0 }}>
            Clicca "Calcola" per avviare l'analisi SHAP
          </p>
        </div>
      ) : (
        <div style={card}>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {features.map((f) => (
              <div key={f.column}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 500, color: "#0D1016", width: "200px", flexShrink: 0 }}>
                    #{f.globalRank} {f.feature}
                  </span>
                  {f.isProxy && (
                    <span style={badge("#fef3c7", "#92400e")}>
                      <AlertTriangle size={9} />
                      PROXY → {f.proxyFor}
                    </span>
                  )}
                  {f.artRelevant && (
                    <span style={badge("#ede9fe", "#5b21b6")}>
                      {f.artRelevant}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      flex: 1,
                      height: "8px",
                      background: "rgba(0,0,0,0.06)",
                      borderRadius: "4px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        borderRadius: "4px",
                        background: f.isProxy ? "#d97706" : "#6366f1",
                        width: `${(f.meanAbsShap / maxShap) * 100}%`,
                        transition: "width 0.6s ease",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: f.isProxy ? "#d97706" : "#6366f1",
                      width: "40px",
                      textAlign: "right",
                      flexShrink: 0,
                    }}
                  >
                    {f.meanAbsShap.toFixed(3)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: "20px",
              padding: "12px",
              background: "#f0f0ff",
              borderRadius: "8px",
              display: "flex",
              gap: "8px",
              alignItems: "flex-start",
            }}
          >
            <Info size={14} style={{ color: "#6366f1", flexShrink: 0, marginTop: "1px" }} />
            <p style={{ fontSize: "12px", color: "#4338ca", margin: 0, lineHeight: "1.5" }}>
              Le feature con badge <strong>PROXY</strong> indicano un potenziale rischio di discriminazione indiretta.
              Richiedono revisione ai sensi dell'Art. 10 e Art. 9 dell'AI Act.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function BiasTab({
  biasResults,
  loading,
  onAnalyze,
}: {
  biasResults: BiasAnalysisResult[] | null;
  loading: boolean;
  onAnalyze: () => void;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <p style={{ fontSize: "13px", color: "rgba(0,0,0,0.42)", margin: 0 }}>
          Regola 4/5 (80%): se l'Impact Ratio {"<"} 0.80, il gruppo è svantaggiato
        </p>
        <button style={btn(true)} onClick={onAnalyze} disabled={loading}>
          <RefreshCw size={13} style={{ opacity: loading ? 0.5 : 1 }} />
          {loading ? "Analisi…" : "Analizza (n=500 profili)"}
        </button>
      </div>

      {!biasResults ? (
        <div style={{ ...card, textAlign: "center", padding: "48px 20px" }}>
          <Shield size={32} style={{ color: "#6366f1", marginBottom: "12px" }} />
          <p style={{ color: "rgba(0,0,0,0.42)", fontSize: "14px", margin: 0 }}>
            Clicca "Analizza" per avviare il test di bias per gruppo protetto
          </p>
        </div>
      ) : (
        <>
          <div style={{ ...card, padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#fafaf9", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
                  {["Gruppo", "Test", "Tasso positivo", "Impact Ratio", "Disparità %", "Stato"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 16px",
                        textAlign: "left",
                        fontWeight: 600,
                        fontSize: "11px",
                        color: "rgba(0,0,0,0.42)",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {biasResults.map((r, i) => (
                  <tr
                    key={r.group}
                    style={{
                      borderBottom: i < biasResults.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none",
                      background: r.flagged ? (r.severity === "critical" ? "#fff8f8" : "#fffdf5") : "#ffffff",
                    }}
                  >
                    <td style={{ padding: "12px 16px", fontWeight: 500, color: "#0D1016" }}>{r.group}</td>
                    <td style={{ padding: "12px 16px", color: "rgba(0,0,0,0.6)" }}>{r.totalTests}</td>
                    <td style={{ padding: "12px 16px", color: "rgba(0,0,0,0.6)" }}>
                      {(r.positiveRate * 100).toFixed(1)}%
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          fontWeight: 700,
                          color: severityColor(r.severity),
                          background: severityBg(r.severity),
                          padding: "2px 8px",
                          borderRadius: "6px",
                          fontSize: "12px",
                        }}
                      >
                        {r.impactRatio.toFixed(3)}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", color: r.flagged ? severityColor(r.severity) : "rgba(0,0,0,0.6)", fontWeight: r.flagged ? 600 : 400 }}>
                      {r.disparity.toFixed(1)}%
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {r.severity === "critical" ? (
                        <span style={badge("#fef2f2", "#dc2626")}>
                          <AlertTriangle size={9} /> CRITICO
                        </span>
                      ) : r.severity === "warning" ? (
                        <span style={badge("#fffbeb", "#d97706")}>
                          <AlertTriangle size={9} /> ATTENZIONE
                        </span>
                      ) : (
                        <span style={badge("#f0fdf4", "#16a34a")}>
                          <CheckCircle size={9} /> OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 4/5 rule explanation */}
          <div
            style={{
              ...card,
              marginTop: "16px",
              background: "#f0f0ff",
              border: "1px solid #c7d2fe",
              display: "flex",
              gap: "12px",
              alignItems: "flex-start",
            }}
          >
            <Info size={16} style={{ color: "#6366f1", flexShrink: 0, marginTop: "2px" }} />
            <div>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#3730a3", margin: "0 0 4px" }}>
                Regola delle 4/5 (80% Rule) — EEOC / AI Act Art. 9
              </p>
              <p style={{ fontSize: "12px", color: "#4338ca", margin: 0, lineHeight: "1.6" }}>
                Un gruppo protetto è considerato svantaggiato se il suo tasso di esiti positivi è inferiore all'80%
                del tasso del gruppo di riferimento (Impact Ratio {"<"} 0.80). Valori sotto 0.70 indicano una
                disparità critica che richiede intervento immediato e documentazione nel sistema di gestione del rischio.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CounterfactualTab({ counterfactuals }: { counterfactuals: CounterfactualScenario[] }) {
  return (
    <div>
      <p style={{ fontSize: "13px", color: "rgba(0,0,0,0.42)", margin: "0 0 16px" }}>
        Scenari controfattuali: modifiche minime per invertire la decisione del modello (GDPR Art. 22, Art. 86)
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {counterfactuals.map((cf) => (
          <div key={cf.id} style={card}>
            {/* Outcome header */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <span
                style={badge(
                  cf.originalOutcome === "REJECTED" ? "#fef2f2" : "#f0fdf4",
                  cf.originalOutcome === "REJECTED" ? "#dc2626" : "#16a34a"
                )}
              >
                {cf.originalOutcome}
              </span>
              <ArrowRight size={14} style={{ color: "rgba(0,0,0,0.3)" }} />
              <span
                style={badge(
                  cf.counterfactualOutcome === "APPROVED" ? "#f0fdf4" : "#fef2f2",
                  cf.counterfactualOutcome === "APPROVED" ? "#16a34a" : "#dc2626"
                )}
              >
                {cf.counterfactualOutcome}
              </span>
              <span style={{ marginLeft: "auto", fontSize: "12px", color: "rgba(0,0,0,0.42)" }}>
                {cf.minChanges} modifica{cf.minChanges !== 1 ? "he" : ""} minima{cf.minChanges !== 1 ? "e" : ""}
              </span>
              {cf.gdprArt86Compliant ? (
                <span style={badge("#f0fdf4", "#16a34a")}>
                  <Shield size={9} /> GDPR Art.86
                </span>
              ) : (
                <span style={badge("#fef2f2", "#dc2626")}>
                  <AlertTriangle size={9} /> Non conforme
                </span>
              )}
            </div>

            {/* Changed features */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {cf.changedFeatures.map((ch, i) => (
                <div
                  key={i}
                  style={{
                    padding: "10px 14px",
                    background: "#fafaf9",
                    borderRadius: "8px",
                    border: "1px solid rgba(0,0,0,0.05)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#0D1016" }}>{ch.feature}</span>
                    <span
                      style={{
                        padding: "1px 7px",
                        borderRadius: "999px",
                        fontSize: "10px",
                        fontWeight: 600,
                        background: feasibilityBg(ch.feasibility),
                        color: feasibilityColor(ch.feasibility),
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {ch.feasibility === "easy" ? "Facile" : ch.feasibility === "medium" ? "Medio" : "Difficile"}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "4px",
                        background: "#fef2f2",
                        color: "#dc2626",
                        fontWeight: 500,
                      }}
                    >
                      {ch.from}
                    </span>
                    <ArrowRight size={11} style={{ color: "rgba(0,0,0,0.3)" }} />
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "4px",
                        background: "#f0fdf4",
                        color: "#16a34a",
                        fontWeight: 500,
                      }}
                    >
                      {ch.to}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportTab({
  report,
  onGenerate,
  onSave,
  onCopy,
  loading,
}: {
  report: XAIReport | null;
  onGenerate: () => void;
  onSave: () => void;
  onCopy: () => void;
  loading: boolean;
}) {
  function copyJSON() {
    if (!report) return;
    navigator.clipboard.writeText(JSON.stringify(report, null, 2))
      .then(() => onCopy())
      .catch(() => undefined);
  }

  if (!report) {
    return (
      <div style={{ ...card, textAlign: "center", padding: "60px 20px" }}>
        <Download size={36} style={{ color: "#6366f1", marginBottom: "16px" }} />
        <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#0D1016", margin: "0 0 8px" }}>
          Nessun report XAI disponibile
        </h3>
        <p style={{ fontSize: "13px", color: "rgba(0,0,0,0.42)", margin: "0 0 24px" }}>
          Genera il report completo per vedere il punteggio XAI, i flag di conformità e le raccomandazioni
        </p>
        <button style={btn(true)} onClick={onGenerate} disabled={loading}>
          <RefreshCw size={14} style={{ opacity: loading ? 0.5 : 1 }} />
          {loading ? "Generazione…" : "Genera Report"}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Score + actions */}
      <div style={{ ...card, display: "flex", alignItems: "center", gap: "24px" }}>
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div
            style={{
              fontSize: "52px",
              fontWeight: 800,
              letterSpacing: "-2px",
              color: scoreColor(report.overallXAIScore),
              lineHeight: 1,
            }}
          >
            {report.overallXAIScore}
          </div>
          <div style={{ fontSize: "11px", color: "rgba(0,0,0,0.42)", marginTop: "4px", fontWeight: 600 }}>
            PUNTEGGIO XAI
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#0D1016", margin: "0 0 4px" }}>
            Modello: {report.modelVersion}
          </p>
          <p style={{ fontSize: "12px", color: "rgba(0,0,0,0.42)", margin: "0 0 12px" }}>
            Generato: {new Date(report.generatedAt).toLocaleString("it-IT")}
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <button style={btn(true, true)} onClick={onSave}>
              <Download size={12} /> Salva Snapshot
            </button>
            <button style={btn(false, true)} onClick={copyJSON}>
              <Copy size={12} /> Copia JSON
            </button>
            <button style={btn(false, true)} onClick={onGenerate} disabled={loading}>
              <RefreshCw size={12} /> Rigenera
            </button>
          </div>
        </div>
      </div>

      {/* Compliance flags */}
      {report.complianceFlags.length > 0 && (
        <div style={card}>
          <h3
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "#0D1016",
              margin: "0 0 12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <AlertTriangle size={14} style={{ color: "#dc2626" }} />
            Flag di conformità ({report.complianceFlags.length})
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {report.complianceFlags.map((flag, i) => (
              <div
                key={i}
                style={{
                  padding: "10px 12px",
                  borderRadius: "8px",
                  background: flag.startsWith("[CRITICO]") ? "#fef2f2" : flag.startsWith("[PROXY]") ? "#fffbeb" : "#fef9f0",
                  border: `1px solid ${flag.startsWith("[CRITICO]") ? "#fecaca" : flag.startsWith("[PROXY]") ? "#fde68a" : "#fed7aa"}`,
                  display: "flex",
                  gap: "8px",
                  alignItems: "flex-start",
                }}
              >
                <AlertTriangle
                  size={13}
                  style={{
                    color: flag.startsWith("[CRITICO]") ? "#dc2626" : "#d97706",
                    flexShrink: 0,
                    marginTop: "1px",
                  }}
                />
                <span style={{ fontSize: "12px", color: "#0D1016", lineHeight: "1.5" }}>{flag}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div style={card}>
        <h3
          style={{
            fontSize: "13px",
            fontWeight: 700,
            color: "#0D1016",
            margin: "0 0 12px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <CheckCircle size={14} style={{ color: "#16a34a" }} />
          Raccomandazioni ({report.recommendations.length})
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {report.recommendations.map((rec, i) => (
            <div
              key={i}
              style={{
                padding: "10px 12px",
                borderRadius: "8px",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                display: "flex",
                gap: "8px",
                alignItems: "flex-start",
              }}
            >
              <CheckCircle size={13} style={{ color: "#16a34a", flexShrink: 0, marginTop: "1px" }} />
              <span style={{ fontSize: "12px", color: "#0D1016", lineHeight: "1.5" }}>{rec}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function XAIPage() {
  const [tab, setTab] = useState<Tab>("importance");
  const [features, setFeatures] = useState<GlobalFeatureImportance[] | null>(null);
  const [biasResults, setBiasResults] = useState<BiasAnalysisResult[] | null>(null);
  const [counterfactuals, setCounterfactuals] = useState<CounterfactualScenario[]>(() => generateCounterfactuals());
  const [report, setReport] = useState<XAIReport | null>(null);
  const [loading, setLoading] = useState<"features" | "bias" | "report" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  // Load snapshot on mount
  useEffect(() => {
    const snap = loadXAISnapshot();
    if (snap) {
      setReport(snap.report);
      setFeatures(snap.report.featureImportance);
      setBiasResults(snap.report.biasResults);
      if (snap.report.counterfactuals && snap.report.counterfactuals.length > 0) {
        setCounterfactuals(snap.report.counterfactuals);
      }
      if (snap.savedAt) {
        setSavedAt(snap.savedAt);
      }
    }
    const storedSavedAt = typeof window !== "undefined" ? localStorage.getItem("xai_saved_at") : null;
    if (storedSavedAt) setSavedAt(storedSavedAt);
  }, []);

  function handleCalculateFeatures() {
    setLoading("features");
    setTimeout(() => {
      const result = computeGlobalFeatureImportance(200);
      setFeatures(result);
      setLoading(null);
    }, 50);
  }

  function handleRunBias() {
    setLoading("bias");
    setTimeout(() => {
      const result = runBiasAnalysis(500);
      setBiasResults(result);
      setLoading(null);
    }, 50);
  }

  function handleGenerateReport() {
    setLoading("report");
    setTimeout(() => {
      const fi = features ?? computeGlobalFeatureImportance(200);
      const br = biasResults ?? runBiasAnalysis(500);
      const cf = counterfactuals;
      const r = generateXAIReport(fi, br, cf);
      setFeatures(fi);
      setBiasResults(br);
      setReport(r);
      saveXAISnapshot(r);
      appendEvidence(
        "adr",
        {
          type: "XAI Report — Spiegabilità Art. 13 AI Act",
          overallXAIScore: r.overallXAIScore,
          modelVersion: r.modelVersion,
          complianceFlagsCount: r.complianceFlags.length,
          criticalFlags: r.complianceFlags.filter((f: string) => f.startsWith("[CRITICO]")),
          recommendationsCount: r.recommendations.length,
          biasGroupsFlagged: br.filter((b) => b.flagged).length,
          featuresAnalyzed: fi.length,
          proxyFeaturesDetected: fi.filter((f) => f.isProxy).length,
          generatedAt: r.generatedAt,
        },
        "xai"
      );
      setLoading(null);
      showToast(`✓ XAI Report generato — Score: ${r.overallXAIScore}`);
    }, 50);
  }

  function handleSaveSnapshot() {
    if (!report) return;
    saveXAISnapshot(report);
    const completedAt = new Date().toISOString();
    writeToStorage("xai", {
      overallXAIScore: report.overallXAIScore,
      modelVersion: report.modelVersion,
      complianceFlagsCount: report.complianceFlags.length,
      hasCriticalFlags: report.complianceFlags.some((f: string) => f.startsWith("[CRITICO]")),
      completedAt,
    });
    appendEvidence(
      "adr",
      {
        type: "XAI Snapshot — Spiegabilità & Bias · Art. 13 AI Act",
        overallXAIScore: report.overallXAIScore,
        modelVersion: report.modelVersion,
        complianceFlags: report.complianceFlags,
        recommendations: report.recommendations,
        savedAt: completedAt,
      },
      "xai"
    );
    setSavedAt(completedAt);
    if (typeof window !== "undefined") localStorage.setItem("xai_saved_at", completedAt);
    showToast("XAI Snapshot salvato nel Dossier di compliance");
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "importance", label: "Feature Importance" },
    { key: "bias", label: "Bias & Fairness" },
    { key: "counterfactual", label: "Counterfactual" },
    { key: "report", label: "XAI Report" },
  ];

  return (
    <div className="w-full">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-[12px] font-medium shadow-lg"
          style={{ background: "#0D1016", color: "#ffffff" }}>
          {toast}
        </div>
      )}

      {/* Dossier banner */}
      {savedAt ? (
        <div className="flex items-center gap-2 rounded-lg px-4 py-2.5 mb-5 text-[12px]"
          style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)" }}>
          <CheckCircle size={13} strokeWidth={1.5} style={{ color: "#15803d" }} />
          <span style={{ color: "#15803d" }}>✓ XAI Snapshot salvato nel dossier · Aggiornato il {new Date(savedAt).toLocaleDateString("it-IT")}</span>
          <Link href="/dashboard/dossier" className="ml-auto text-[11px] font-medium hover:opacity-70 transition-opacity" style={{ color: "#15803d" }}>Vedi dossier →</Link>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg px-4 py-2.5 mb-5 text-[12px]"
          style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)" }}>
          <span style={{ color: "rgba(0,0,0,0.45)" }}>Genera il report XAI e salva nel dossier di compliance (Art. 13)</span>
          {report && (
            <button onClick={handleSaveSnapshot} className="text-[11px] font-medium rounded-full px-3 py-1 hover:opacity-80"
              style={{ background: "#0D1016", color: "#ffffff", border: "none", cursor: "pointer" }}>
              Salva nel dossier
            </button>
          )}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <BarChart2 className="h-5 w-5" style={{ color: "#6366f1" }} />
          <h1
            style={{
              fontSize: "22px",
              fontWeight: 600,
              letterSpacing: "-0.5px",
              color: "#0D1016",
              margin: 0,
            }}
          >
            XAI — Explainability & Bias Center
          </h1>
        </div>
        <p style={{ fontSize: "13px", color: "rgba(0,0,0,0.42)", margin: 0 }}>
          Spiegabilità globale del modello (SHAP) · Analisi disparate impact · Scenari controfattuali · Art. 13 AI Act
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid rgba(0,0,0,0.07)",
          marginBottom: "24px",
          gap: "0",
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "10px 18px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              background: "none",
              border: "none",
              borderBottom: `2px solid ${tab === t.key ? "#0D1016" : "transparent"}`,
              color: tab === t.key ? "#0D1016" : "rgba(0,0,0,0.42)",
              transition: "color 0.15s, border-color 0.15s",
              marginBottom: "-1px",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "importance" && (
        <FeatureImportanceTab
          features={features}
          loading={loading === "features"}
          onCalculate={handleCalculateFeatures}
        />
      )}
      {tab === "bias" && (
        <BiasTab
          biasResults={biasResults}
          loading={loading === "bias"}
          onAnalyze={handleRunBias}
        />
      )}
      {tab === "counterfactual" && (
        <CounterfactualTab counterfactuals={counterfactuals} />
      )}
      {tab === "report" && (
        <ReportTab
          report={report}
          onGenerate={handleGenerateReport}
          onSave={handleSaveSnapshot}
          onCopy={() => showToast("JSON copiato negli appunti")}
          loading={loading === "report"}
        />
      )}
    </div>
  );
}
