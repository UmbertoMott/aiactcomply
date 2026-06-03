"use client";

import React from "react";
import { AlertTriangle, CheckCircle, Info, ExternalLink } from "lucide-react";

// ─── Local interfaces (no external import needed) ─────────────────────────────

interface ClassifierData {
  systemName?: string;
  riskLevel?: string;
}

interface ProhibitedData {
  verdict?: "violation" | "potential_violation" | "conditional" | "clear";
}

interface SystemContextBannerProps {
  /** Show a blocking prompt when classifier is not yet done. Default false. */
  requireClassifier?: boolean;
  /** Show red blocking banner if prohibited verdict = violation. Default true. */
  checkProhibited?: boolean;
  /** Optional callback for "Modifica" button. Defaults to navigating to classifier. */
  onEditClassifier?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readLS<T>(key: string): T | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

const RISK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  High:         { bg: "#FFF7ED", text: "#9A3412", border: "#FED7AA" },
  Unacceptable: { bg: "#FEF2F2", text: "#7F1D1D", border: "#FECACA" },
  Limited:      { bg: "#FFFBEB", text: "#92400E", border: "#FDE68A" },
  Minimal:      { bg: "#F0FDF4", text: "#14532D", border: "#BBF7D0" },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function SystemContextBanner({
  requireClassifier = false,
  checkProhibited = true,
  onEditClassifier,
}: SystemContextBannerProps) {
  const [classifier, setClassifier] = React.useState<ClassifierData | null>(null);
  const [prohibited, setProhibited] = React.useState<ProhibitedData | null>(null);

  React.useEffect(() => {
    setClassifier(readLS<ClassifierData>("aicomply_classifier_result"));
    setProhibited(readLS<ProhibitedData>("aicomply_prohibited_result"));
  }, []);

  // ── Banner 1: red blocking — prohibited violation ─────────────────────────
  if (checkProhibited && prohibited?.verdict === "violation") {
    return (
      <div style={{
        background: "#FEF2F2",
        border: "1px solid #FECACA",
        borderRadius: 10,
        padding: "14px 18px",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        marginBottom: 20,
      }}>
        <AlertTriangle size={20} color="#DC2626" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontWeight: 700, color: "#7F1D1D", fontSize: 14, marginBottom: 4 }}>
            ⛔ Sistema classificato come pratica vietata (Art. 5)
          </div>
          <div style={{ color: "#991B1B", fontSize: 13, lineHeight: 1.5 }}>
            Il Prohibited Checker ha rilevato una violazione dell&apos;Art. 5 AI Act.
            Completa l&apos;analisi legale prima di procedere con questo tool.{" "}
            <a href="/dashboard/tools/prohibited" style={{ color: "#DC2626", fontWeight: 600, textDecoration: "underline" }}>
              Torna al Prohibited Checker →
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── Banner 2: grey prompt — no classifier data ────────────────────────────
  if (!classifier?.systemName) {
    if (requireClassifier) {
      return (
        <div style={{
          background: "#F8FAFC",
          border: "1px solid #E2E8F0",
          borderRadius: 10,
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
        }}>
          <Info size={18} color="#64748B" style={{ flexShrink: 0 }} />
          <div style={{ color: "#475569", fontSize: 13, flex: 1 }}>
            Completa prima l&apos;<strong>AI Classifier (Art. 6)</strong> per pre-popolare automaticamente
            nome sistema e livello di rischio in questo tool.
          </div>
          <a href="/dashboard/tools/classifier" style={{
            fontSize: 12,
            color: "#3B82F6",
            fontWeight: 600,
            textDecoration: "none",
            whiteSpace: "nowrap",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}>
            Vai al Classifier <ExternalLink size={12} />
          </a>
        </div>
      );
    }
    return null;
  }

  // ── Banner 3: coloured — classifier data present ──────────────────────────
  const riskLevel = classifier.riskLevel ?? "Unknown";
  const colors = RISK_COLORS[riskLevel] ?? { bg: "#F8FAFC", text: "#374151", border: "#E5E7EB" };

  return (
    <div style={{
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      borderRadius: 10,
      padding: "12px 18px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 20,
    }}>
      <CheckCircle size={16} color={colors.text} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, fontSize: 13, color: colors.text }}>
        <strong>Sistema:</strong> {classifier.systemName}
        {" · "}
        <strong>Tier:</strong> {riskLevel}
      </div>
      <button
        onClick={onEditClassifier ?? (() => { window.location.href = "/dashboard/tools/classifier"; })}
        style={{
          fontSize: 11,
          color: colors.text,
          background: "transparent",
          border: `1px solid ${colors.border}`,
          borderRadius: 6,
          padding: "3px 10px",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        Modifica
      </button>
    </div>
  );
}
