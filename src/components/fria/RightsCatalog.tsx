"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { FUNDAMENTAL_RIGHTS, RIGHTS_GROUPS } from "@/lib/simulation/fria-engine";
import { rightIdToThemeId, getRefsForTheme } from "@/lib/assessment/correlation-map";

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  text: "#0D1016", muted: "rgba(0,0,0,0.42)", faint: "rgba(0,0,0,0.28)",
  border: "rgba(0,0,0,0.08)", card: "#ffffff", bg: "#f8f8f7",
  red: "#dc2626", redBg: "rgba(220,38,38,0.06)", redBdr: "rgba(220,38,38,0.2)",
  amber: "#d97706", amberBg: "rgba(202,138,4,0.06)", amberBdr: "rgba(202,138,4,0.2)",
  green: "#16a34a", greenBg: "rgba(22,163,74,0.06)", greenBdr: "rgba(22,163,74,0.2)",
} as const;

// ─── Props ────────────────────────────────────────────────────────────────────
export interface RightsCatalogProps {
  selectedRightIds: string[];
  onSelectRight: (rightId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function RightsCatalog({ selectedRightIds, onSelectRight }: RightsCatalogProps) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    new Set(["dignity_group", "equality_group"])
  );

  function toggleGroup(groupId: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(groupId) ? next.delete(groupId) : next.add(groupId);
      return next;
    });
  }

  const containerSt: CSSProperties = {
    marginBottom: 16,
    border: `1px solid ${T.border}`,
    borderRadius: 10,
    overflow: "hidden",
    background: T.card,
  };

  const groupHeaderSt: CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "none",
    border: "none",
    cursor: "pointer",
    textAlign: "left" as const,
  };

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Header */}
      <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: 0 }}>
          Catalogo diritti fondamentali — seleziona quelli pertinenti
        </h3>
        <span style={{
          fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 9999,
          background: "rgba(0,0,0,0.06)", border: `1px solid ${T.border}`, color: T.muted,
        }}>
          ✦ Catalog-First
        </span>
      </div>

      {/* Groups */}
      {RIGHTS_GROUPS.map((grp) => {
        const rights = FUNDAMENTAL_RIGHTS.filter((r) => grp.rightIds.includes(r.id));
        const isOpen = openGroups.has(grp.id);
        const selCount = rights.filter((r) => selectedRightIds.includes(r.id)).length;

        return (
          <div key={grp.id} style={containerSt}>
            {/* Group header */}
            <button onClick={() => toggleGroup(grp.id)} style={groupHeaderSt}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{grp.label}</span>
                {selCount > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 500, padding: "2px 7px", borderRadius: 9999,
                    background: T.greenBg, border: `1px solid ${T.greenBdr}`, color: T.green,
                  }}>
                    {selCount} sel.
                  </span>
                )}
              </div>
              <span style={{ fontSize: 12, color: T.muted }}>{isOpen ? "▲" : "▼"}</span>
            </button>

            {/* Rights in group */}
            {isOpen && (
              <div style={{ borderTop: `1px solid ${T.border}`, padding: "8px 12px 12px" }}>
                {rights.map((right) => {
                  const isSelected = selectedRightIds.includes(right.id);

                  // Refs normativi
                  const themeId = rightIdToThemeId(right.id);
                  const refs = getRefsForTheme(themeId).slice(0, 3);

                  const cardSt: CSSProperties = {
                    marginBottom: 8,
                    padding: "12px 14px",
                    borderRadius: 8,
                    border: `1px solid ${isSelected ? T.greenBdr : T.border}`,
                    background: isSelected ? T.greenBg : T.bg,
                    transition: "border-color 0.15s, background 0.15s",
                  };

                  return (
                    <div key={right.id} style={cardSt}>
                      {/* Right header */}
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" as const, marginBottom: 2 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{right.name}</span>
                            <span style={{ fontSize: 10, color: T.faint }}>{right.code}</span>
                            {right.is_absolute && (
                              <span style={{
                                fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 9999,
                                background: T.redBg, border: `1px solid ${T.redBdr}`, color: T.red,
                                textTransform: "uppercase" as const, letterSpacing: "0.4px",
                              }}>
                                ASSOLUTO
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 10, color: T.muted }}>{right.charter_art}</div>
                        </div>

                        {/* Toggle button */}
                        <button
                          onClick={() => onSelectRight(right.id)}
                          style={{
                            flexShrink: 0,
                            fontSize: 11, fontWeight: 500,
                            padding: "4px 12px", borderRadius: 6,
                            border: `1px solid ${isSelected ? T.greenBdr : T.border}`,
                            background: isSelected ? T.green : T.card,
                            color: isSelected ? "#fff" : T.text,
                            cursor: "pointer",
                            transition: "background 0.15s, color 0.15s",
                          }}
                        >
                          {isSelected ? "Selezionato ✓" : "Seleziona"}
                        </button>
                      </div>

                      {/* Trigger questions — first 2 */}
                      {right.triggerQuestions.slice(0, 2).map((q, i) => (
                        <div key={i} style={{
                          display: "flex", alignItems: "flex-start", gap: 5,
                          marginBottom: 3,
                        }}>
                          <span style={{ fontSize: 10, color: T.amber, flexShrink: 0, marginTop: 1 }}>?</span>
                          <span style={{ fontSize: 11, color: T.muted, lineHeight: 1.4 }}>{q}</span>
                        </div>
                      ))}

                      {/* Refs normativi */}
                      {refs.length > 0 && (
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const, marginTop: 6 }}>
                          {refs.map((ref, i) => (
                            <span key={i} style={{
                              fontSize: 9, fontWeight: 500, padding: "1px 6px", borderRadius: 4,
                              background: "rgba(0,0,0,0.05)", border: `1px solid ${T.border}`,
                              color: T.muted,
                            }}>
                              {ref.framework}: {ref.citation}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
