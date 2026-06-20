"use client";
import { useState, useEffect } from "react";
import type { DPIAScreeningCriterion } from "@/lib/dossier/storage-schema";
import { readFromStorage } from "@/lib/dossier/storage-schema";
import type { ClassifierResult, DataAuditResult } from "@/lib/dossier/storage-schema";

// ─── Design tokens (aligned with FRIA) ───────────────────────────────────────

const T = {
  text:     "#0D1016",
  muted:    "rgba(0,0,0,0.42)",
  faint:    "rgba(0,0,0,0.28)",
  border:   "rgba(0,0,0,0.08)",
  card:     "#ffffff",
  bg:       "#f8f8f7",
  red:      "#dc2626",
  redBg:    "rgba(220,38,38,0.06)",
  redBdr:   "rgba(220,38,38,0.18)",
  amber:    "#d97706",
  amberBg:  "rgba(202,138,4,0.06)",
  amberBdr: "rgba(202,138,4,0.2)",
  green:    "#16a34a",
  greenBg:  "rgba(22,163,74,0.06)",
  greenBdr: "rgba(22,163,74,0.2)",
} as const;

// ─── Pre-fill logic ───────────────────────────────────────────────────────────

interface PreFillSuggestion {
  id: string;
  applies: DPIAScreeningCriterion["applies"];
}

function computePreFill(): Set<string> {
  const suggested = new Set<string>();
  const classifier = readFromStorage<ClassifierResult>("classifier");
  const dataAudit = readFromStorage<DataAuditResult>("dataAudit");

  if (classifier?.riskLevel === "high") {
    suggested.add("c1");
    suggested.add("c4");
    suggested.add("c6");
  }

  if (dataAudit?.datasets?.some((d: DataAuditResult["datasets"][number]) => d.personalData === true)) {
    suggested.add("c2");
    const hasSensitive = dataAudit.datasets.some((d: DataAuditResult["datasets"][number]) => {
      const sf = (d as Record<string, unknown>).sensitiveFeatures;
      return Array.isArray(sf) && sf.some((f: unknown) =>
        typeof f === "string" && ["salute", "biometrici", "genetici"].some(k => f.toLowerCase().includes(k))
      );
    });
    if (hasSensitive) {
      suggested.add("c9");
    }
  }

  return suggested;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ScreeningCatalogProps {
  criteria: DPIAScreeningCriterion[];
  onToggle: (id: string, applies: DPIAScreeningCriterion["applies"]) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ScreeningCatalog({ criteria, onToggle }: ScreeningCatalogProps) {
  const [suggested, setSuggested] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSuggested(computePreFill());
  }, []);

  const applicableCount = criteria.filter(c => c.applies === "yes" || c.applies === "partial").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px", borderRadius: 10,
        background: T.bg, border: `1px solid ${T.border}`,
      }}>
        <div>
          <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Catalogo criteri WP248</span>
          <span style={{ fontSize: 11, color: T.muted, marginLeft: 8 }}>
            Seleziona i criteri applicabili al tuo trattamento
          </span>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 9999,
          background: applicableCount >= 2 ? T.redBg : applicableCount === 1 ? T.amberBg : T.greenBg,
          color: applicableCount >= 2 ? T.red : applicableCount === 1 ? T.amber : T.green,
          border: `1px solid ${applicableCount >= 2 ? T.redBdr : applicableCount === 1 ? T.amberBdr : T.greenBdr}`,
        }}>
          {applicableCount} criteri applicabili
        </span>
      </div>

      {/* Criterion cards */}
      {criteria.map((c, idx) => {
        const isSuggested = suggested.has(c.id);
        const isYes = c.applies === "yes";
        const isPartial = c.applies === "partial";
        const isNo = c.applies === "no";

        return (
          <div key={c.id} style={{
            background: T.card,
            border: `1px solid ${isYes ? T.redBdr : isPartial ? T.amberBdr : T.border}`,
            borderRadius: 10,
            padding: "12px 14px",
            transition: "border-color 0.15s",
          }}>
            {/* Title row */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
              <span style={{
                width: 22, height: 22, borderRadius: 11, flexShrink: 0,
                background: isYes ? T.redBg : isPartial ? T.amberBg : "rgba(0,0,0,0.05)",
                border: `1px solid ${isYes ? T.redBdr : isPartial ? T.amberBdr : T.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700,
                color: isYes ? T.red : isPartial ? T.amber : T.faint,
              }}>
                {idx + 1}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{c.label}</span>
                  {isSuggested && c.applies === "" && (
                    <span style={{
                      fontSize: 10, fontWeight: 500, padding: "1px 7px", borderRadius: 9999,
                      background: T.amberBg, color: T.amber, border: `1px solid ${T.amberBdr}`,
                    }}>
                      Suggerito — conferma tu
                    </span>
                  )}
                  {isSuggested && c.applies !== "" && (
                    <span style={{
                      fontSize: 10, fontWeight: 500, padding: "1px 7px", borderRadius: 9999,
                      background: T.greenBg, color: T.green, border: `1px solid ${T.greenBdr}`,
                    }}>
                      Suggerito da Classifier
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 11, color: T.muted, lineHeight: 1.5, marginTop: 2 }}>
                  {c.description}
                </p>
              </div>
            </div>

            {/* Buttons row */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: c.applies !== "" ? 8 : 0 }}>
              {(["yes", "partial", "no", ""] as const).map((val) => {
                const labels: Record<string, string> = {
                  yes: "Sì",
                  partial: "Parziale",
                  no: "No",
                  "": "Deseleziona",
                };
                const colors: Record<string, { bg: string; color: string; border: string }> = {
                  yes:     { bg: T.redBg,   color: T.red,   border: T.redBdr   },
                  partial: { bg: T.amberBg, color: T.amber, border: T.amberBdr },
                  no:      { bg: T.greenBg, color: T.green, border: T.greenBdr },
                  "":      { bg: "rgba(0,0,0,0.04)", color: T.muted, border: T.border },
                };
                const isActive = c.applies === val;
                const cfg = colors[val];
                // Hide deselect if nothing selected
                if (val === "" && c.applies === "") return null;
                return (
                  <button
                    key={val}
                    onClick={() => onToggle(c.id, val)}
                    style={{
                      padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500,
                      cursor: "pointer", border: `1px solid ${isActive ? cfg.border : T.border}`,
                      background: isActive ? cfg.bg : T.card,
                      color: isActive ? cfg.color : T.muted,
                      transition: "all 0.12s",
                    }}
                  >
                    {labels[val]}
                  </button>
                );
              })}
            </div>

            {/* Notes textarea (shown when applies is set) */}
            {c.applies !== "" && (
              <textarea
                defaultValue={c.notes}
                placeholder="Note opzionali…"
                rows={2}
                style={{
                  width: "100%", padding: "6px 10px", borderRadius: 7,
                  border: `1px solid ${T.border}`, fontSize: 11, color: T.text,
                  background: T.bg, outline: "none", resize: "vertical",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
