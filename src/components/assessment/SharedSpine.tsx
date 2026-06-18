"use client";

import React, { useState, CSSProperties } from "react";
import { readFromStorage, writeToStorage } from "@/lib/dossier/storage-schema";
import type { DPIAResult } from "@/lib/dossier/storage-schema";
import type { AssessmentShared } from "@/lib/assessment/assessment-schema";
import type { Assessment } from "@/lib/assessment/assessment-schema";

export interface SpineRisk {
  id: string;
  description: string;
  lens: "gdpr" | "fundamental_rights" | "both";
  severity: "low" | "medium" | "high";
}

const T = {
  text: "#0D1016", muted: "rgba(0,0,0,0.42)", faint: "rgba(0,0,0,0.28)",
  border: "rgba(0,0,0,0.08)", card: "#ffffff", bg: "#f8f8f7",
  red: "#dc2626", redBg: "rgba(220,38,38,0.06)", redBdr: "rgba(220,38,38,0.2)",
  amber: "#d97706", amberBg: "rgba(202,138,4,0.06)", amberBdr: "rgba(202,138,4,0.2)",
  green: "#16a34a", greenBg: "rgba(22,163,74,0.06)", greenBdr: "rgba(22,163,74,0.2)",
} as const;

const cardSt: CSSProperties = {
  background: T.card, border: `1px solid ${T.border}`,
  borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  padding: 20, marginBottom: 16,
};

const inputSt: CSSProperties = {
  width: "100%", padding: "7px 10px", borderRadius: 8,
  border: `1px solid ${T.border}`, fontSize: 12, color: T.text,
  background: T.card, outline: "none",
};

function SectionHeader({ title }: { title: string }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 700, color: T.text, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em" }}>
      {title}
    </p>
  );
}

function Lbl({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: T.muted, marginBottom: 4 }}>
      {children}
    </label>
  );
}

function severityBadge(severity: SpineRisk["severity"]) {
  const cfg = {
    high:   { label: "Alto",  bg: T.redBg,   color: T.red,   border: T.redBdr   },
    medium: { label: "Medio", bg: T.amberBg, color: T.amber, border: T.amberBdr },
    low:    { label: "Basso", bg: T.greenBg, color: T.green, border: T.greenBdr },
  }[severity];
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
}

function lensBadge(lens: SpineRisk["lens"]) {
  const cfg = {
    gdpr:               { label: "GDPR",              bg: "rgba(0,0,0,0.04)", color: T.text  },
    fundamental_rights: { label: "Diritti Fondamentali", bg: T.amberBg,       color: T.amber },
    both:               { label: "Entrambi",          bg: T.redBg,            color: T.red   },
  }[lens];
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: cfg.bg, color: cfg.color, border: `1px solid ${T.border}` }}>
      {cfg.label}
    </span>
  );
}

interface SharedSpineProps {
  shared: AssessmentShared;
  onSharedChange: (patch: Partial<AssessmentShared>) => void;
}

export function SharedSpine({ shared, onSharedChange }: SharedSpineProps) {
  const [spineRisks, setSpineRisks] = useState<SpineRisk[]>(
    () => readFromStorage<SpineRisk[]>("spineRisks") ?? []
  );

  const [newRisk, setNewRisk] = useState<{ description: string; lens: SpineRisk["lens"]; severity: SpineRisk["severity"] }>({
    description: "", lens: "gdpr", severity: "medium",
  });

  function saveSpineRisks(risks: SpineRisk[]) {
    setSpineRisks(risks);
    writeToStorage("spineRisks", risks);
  }

  function addRisk() {
    if (!newRisk.description.trim()) return;
    const risk: SpineRisk = {
      id: `SR-${Date.now()}`,
      description: newRisk.description.trim(),
      lens: newRisk.lens,
      severity: newRisk.severity,
    };
    saveSpineRisks([...spineRisks, risk]);
    setNewRisk({ description: "", lens: "gdpr", severity: "medium" });
  }

  function removeRisk(id: string) {
    saveSpineRisks(spineRisks.filter(r => r.id !== id));
  }

  const dpia = readFromStorage<DPIAResult>("dpia");
  const assessment = readFromStorage<Assessment>("assessment");
  const dpiaThreats = dpia?.risks?.threats ?? [];
  const friaScenarios = assessment?.fria?.scenarios ?? [];

  return (
    <div>
      {/* Sezione 1: Descrizione sistema */}
      <div style={cardSt}>
        <SectionHeader title="Descrizione sistema" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div>
            <Lbl>Nome sistema</Lbl>
            <input
              value={shared.systemName}
              onChange={e => onSharedChange({ systemName: e.target.value })}
              placeholder="Es. RecruitAI v2"
              style={inputSt}
            />
          </div>
          <div>
            <Lbl>Organizzazione</Lbl>
            <input
              value={shared.organization}
              onChange={e => onSharedChange({ organization: e.target.value })}
              placeholder="Es. Acme S.p.A."
              style={inputSt}
            />
          </div>
          <div>
            <Lbl>Titolare del trattamento</Lbl>
            <input
              value={shared.purpose}
              onChange={e => onSharedChange({ purpose: e.target.value })}
              placeholder="Es. DPO / Responsabile Privacy"
              style={inputSt}
            />
          </div>
        </div>
      </div>

      {/* Sezione 2: Dati & basi giuridiche */}
      <div style={cardSt}>
        <SectionHeader title="Dati & Basi Giuridiche" />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <Lbl>Categorie dati personali</Lbl>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {shared.personalDataCategories.length === 0 ? (
                <span style={{ fontSize: 11, color: T.muted }}>Nessuna categoria configurata</span>
              ) : (
                shared.personalDataCategories.map(cat => (
                  <span key={cat} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "rgba(0,0,0,0.04)", color: T.text, border: `1px solid ${T.border}` }}>
                    {cat}
                  </span>
                ))
              )}
            </div>
          </div>
          <div>
            <Lbl>Categorie speciali (Art. 9)</Lbl>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {shared.specialCategories.length === 0 ? (
                <span style={{ fontSize: 11, color: T.muted }}>Nessuna categoria speciale</span>
              ) : (
                shared.specialCategories.map(cat => (
                  <span key={cat} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: T.redBg, color: T.red, border: `1px solid ${T.redBdr}` }}>
                    {cat}
                  </span>
                ))
              )}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <Lbl>Base giuridica</Lbl>
              <input
                value={shared.legalBasis}
                onChange={e => onSharedChange({ legalBasis: e.target.value })}
                placeholder="Es. Consenso (Art. 6(1)(a) GDPR)"
                style={inputSt}
              />
            </div>
            <div>
              <Lbl>Finalità</Lbl>
              <input
                value={shared.purpose}
                onChange={e => onSharedChange({ purpose: e.target.value })}
                placeholder="Es. Selezione automatizzata candidati HR"
                style={inputSt}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sezione 3: Identificazione rischi a doppia lente */}
      <div style={cardSt}>
        <SectionHeader title="Identificazione rischi — doppia lente GDPR / Diritti Fondamentali" />

        {/* Form aggiunta rischi */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <Lbl>Descrizione rischio</Lbl>
            <input
              value={newRisk.description}
              onChange={e => setNewRisk(p => ({ ...p, description: e.target.value }))}
              onKeyDown={e => { if (e.key === "Enter") addRisk(); }}
              placeholder="Es. Profilazione discriminatoria basata su dati biometrici"
              style={inputSt}
            />
          </div>
          <div style={{ width: 160 }}>
            <Lbl>Lente</Lbl>
            <select value={newRisk.lens} onChange={e => setNewRisk(p => ({ ...p, lens: e.target.value as SpineRisk["lens"] }))} style={inputSt}>
              <option value="gdpr">GDPR</option>
              <option value="fundamental_rights">Diritti Fondamentali</option>
              <option value="both">Entrambi</option>
            </select>
          </div>
          <div style={{ width: 110 }}>
            <Lbl>Gravità</Lbl>
            <select value={newRisk.severity} onChange={e => setNewRisk(p => ({ ...p, severity: e.target.value as SpineRisk["severity"] }))} style={inputSt}>
              <option value="low">Bassa</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </div>
          <button
            onClick={addRisk}
            disabled={!newRisk.description.trim()}
            style={{
              padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "none", cursor: newRisk.description.trim() ? "pointer" : "default",
              background: newRisk.description.trim() ? T.text : "rgba(0,0,0,0.06)",
              color: newRisk.description.trim() ? "#fff" : T.muted,
            }}>
            +
          </button>
        </div>

        {/* Lista rischi spine */}
        {spineRisks.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {spineRisks.map(r => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.bg }}>
                <span style={{ flex: 1, fontSize: 12, color: T.text }}>{r.description}</span>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  {lensBadge(r.lens)}
                  {severityBadge(r.severity)}
                </div>
                <button
                  onClick={() => removeRisk(r.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 16, lineHeight: 1, padding: "0 4px" }}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Rischi da DPIA (read-only) */}
        {dpiaThreats.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Da DPIA (read-only)
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {dpiaThreats.map(t => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6, background: "rgba(0,0,0,0.03)", border: `1px solid ${T.border}` }}>
                  <span style={{ flex: 1, fontSize: 11, color: T.muted }}>{t.description || t.source || t.category}</span>
                  <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "rgba(0,0,0,0.04)", color: T.muted, border: `1px solid ${T.border}` }}>
                    {t.risk_level}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scenari da FRIA (read-only) */}
        {friaScenarios.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Da FRIA (read-only)
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {friaScenarios.map(s => {
                const worstPriority = s.right_impacts.reduce<string>((acc, ri) => {
                  const order = ["low", "medium", "high", "critical"];
                  return order.indexOf(ri.likelihood.computed_priority) > order.indexOf(acc) ? ri.likelihood.computed_priority : acc;
                }, "low");
                return (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6, background: "rgba(0,0,0,0.03)", border: `1px solid ${T.border}` }}>
                    <span style={{ flex: 1, fontSize: 11, color: T.muted }}>{s.title}</span>
                    <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "rgba(0,0,0,0.04)", color: T.muted, border: `1px solid ${T.border}` }}>
                      {worstPriority}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {spineRisks.length === 0 && dpiaThreats.length === 0 && friaScenarios.length === 0 && (
          <p style={{ fontSize: 11, color: T.faint, textAlign: "center", padding: "16px 0" }}>
            Nessun rischio identificato — aggiungi il primo rischio usando il form sopra
          </p>
        )}
      </div>
    </div>
  );
}
