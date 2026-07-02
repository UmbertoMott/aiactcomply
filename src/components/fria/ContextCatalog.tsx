"use client";

import type { CSSProperties } from "react";
import type { ClassifierResult, DataAuditResult } from "@/lib/dossier/storage-schema";
import { readFromStorage } from "@/lib/dossier/storage-schema";

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  text: "#0D1016", muted: "rgba(0,0,0,0.42)", faint: "rgba(0,0,0,0.28)",
  border: "rgba(0,0,0,0.08)", card: "#ffffff", bg: "#f8f8f7",
  red: "#dc2626", redBg: "rgba(220,38,38,0.06)", redBdr: "rgba(220,38,38,0.2)",
  amber: "#d97706", amberBg: "rgba(202,138,4,0.06)", amberBdr: "rgba(202,138,4,0.2)",
  green: "#16a34a", greenBg: "rgba(22,163,74,0.06)", greenBdr: "rgba(22,163,74,0.2)",
} as const;

// ─── Props ────────────────────────────────────────────────────────────────────
export interface ContextCatalogProps {
  onApply: (patch: Record<string, string>) => void;
}

// ─── Suggestion type ─────────────────────────────────────────────────────────
interface Suggestion {
  field: string;
  label: string;
  value: string;
  patch?: Record<string, string>;
  isNote?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function ContextCatalog({ onApply }: ContextCatalogProps) {
  const classifier = readFromStorage<ClassifierResult>("classifier");
  const dataAudit = readFromStorage<DataAuditResult>("dataAudit");

  // Build suggestion list
  const suggestions: Suggestion[] = [];

  if (classifier?.riskLevel) {
    suggestions.push({
      field: "Livello rischio AI Act",
      label: "Livello rischio classificato",
      value: classifier.riskLevel,
      isNote: true,
    });
  }

  if (classifier?.systemDescription) {
    suggestions.push({
      field: "Panoramica tecnologica",
      label: "Descrizione sistema (da Classifier)",
      value: classifier.systemDescription,
      patch: { technology_overview: classifier.systemDescription },
    });
  }

  if (dataAudit?.datasets?.some((d) => d.personalData)) {
    suggestions.push({
      field: "Tratta dati personali",
      label: "Dataset con dati personali rilevati",
      value: "Sì — dataset con personal data identificati nel Data Audit",
      patch: { processes_personal_data: "yes" },
    });
  }

  if (
    dataAudit?.overallQuality === "fail" ||
    dataAudit?.overallQuality === "review"
  ) {
    suggestions.push({
      field: "Qualità dei dati sufficiente",
      label: "Qualità complessiva dati (da Data Audit)",
      value: `${dataAudit.overallQuality === "fail" ? "Non sufficiente" : "Da rivedere"} — ${dataAudit.overallQuality}`,
      patch: { data_quality_sufficient: "no" },
    });
  }

  if (classifier?.annexIII === true) {
    suggestions.push({
      field: "Allegato III",
      label: "Sistema Allegato III — supervisione umana",
      value: "Sistema Allegato III — verifica supervisione umana (Art. 14) [verifica contro il testo vigente dell'AI Act]",
      isNote: true,
    });
  }

  if (classifier?.role === "deployer") {
    suggestions.push({
      field: "Supervisione umana assegnata",
      label: "Ruolo deployer rilevato (da Classifier)",
      value: "Sì — in quanto deployer, la supervisione umana è di vostra responsabilità",
      patch: { human_oversight_assigned: "yes" },
    });
  }

  // Nothing to show
  if (suggestions.length === 0) return null;

  const containerSt: CSSProperties = {
    marginBottom: 20,
    padding: "14px 16px",
    borderRadius: 10,
    background: T.amberBg,
    border: `1px solid ${T.amberBdr}`,
  };

  const rowSt: CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "8px 10px",
    marginBottom: 4,
    borderRadius: 7,
    background: T.card,
    border: `1px solid ${T.border}`,
  };

  return (
    <div style={containerSt}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 14 }}>✦</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: T.amber }}>
          Pre-compilazione automatica — dati già rilevati
        </span>
        <span style={{ fontSize: 10, color: T.muted }}>
          ({suggestions.length} suggeriment{suggestions.length === 1 ? "o" : "i"})
        </span>
      </div>

      {/* Suggestions */}
      {suggestions.slice(0, 6).map((sug, i) => (
        <div key={i} style={rowSt}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: T.muted, marginBottom: 2 }}>
              {sug.label}
            </div>
            <div style={{ fontSize: 12, color: T.text, lineHeight: 1.4 }}>
              {sug.value}
            </div>
          </div>
          {!sug.isNote && sug.patch && (
            <button
              onClick={() => onApply(sug.patch!)}
              style={{
                flexShrink: 0,
                fontSize: 11, fontWeight: 500,
                padding: "4px 10px", borderRadius: 6,
                border: `1px solid ${T.amberBdr}`,
                background: T.amber, color: "#fff",
                cursor: "pointer",
              }}
            >
              Applica
            </button>
          )}
          {sug.isNote && (
            <span style={{
              flexShrink: 0,
              fontSize: 10, padding: "2px 8px", borderRadius: 9999,
              background: "rgba(217,119,6,0.12)", border: `1px solid ${T.amberBdr}`,
              color: T.amber, fontWeight: 500,
            }}>
              Nota
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
