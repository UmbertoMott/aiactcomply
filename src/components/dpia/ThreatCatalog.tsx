"use client";
import { useState } from "react";
import type { DPIAThreat } from "@/lib/dossier/storage-schema";

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

// ─── Risk level computation ───────────────────────────────────────────────────

function computeRiskLevel(
  likelihood: "low" | "medium" | "high",
  severity:   "low" | "medium" | "high",
): "low" | "medium" | "high" {
  if (likelihood === "high"   && severity === "high")   return "high";
  if (likelihood === "high"   && severity === "medium") return "high";
  if (likelihood === "medium" && severity === "high")   return "high";
  if (likelihood === "medium" && severity === "medium") return "medium";
  if (likelihood === "high"   && severity === "low")    return "medium";
  if (likelihood === "low"    && severity === "high")   return "medium";
  if (likelihood === "medium" && severity === "low")    return "low";
  if (likelihood === "low"    && severity === "medium") return "low";
  return "low";
}

// ─── Threat pattern definition ────────────────────────────────────────────────

interface ThreatPattern {
  id: string;
  category: DPIAThreat["category"];
  description: string;
  source: string;
  likelihood: DPIAThreat["likelihood"];
  severity: DPIAThreat["severity"];
  risk_level: DPIAThreat["risk_level"];
  mitigation: string;
  residual_likelihood: DPIAThreat["residual_likelihood"];
  residual_severity: DPIAThreat["residual_severity"];
  residual_risk: DPIAThreat["residual_risk"];
}

const THREAT_PATTERNS: ThreatPattern[] = [
  // ── illegitimate_access ──────────────────────────────────────────────────
  {
    id: "tp_ia_1",
    category: "illegitimate_access",
    description: "Accesso non autorizzato da dipendenti interni",
    source: "Dipendenti e collaboratori",
    likelihood: "medium", severity: "high",
    risk_level: computeRiskLevel("medium", "high"),
    mitigation: "Implementare controllo accessi RBAC, logging degli accessi, revisione periodica dei permessi e formazione del personale.",
    residual_likelihood: "low", residual_severity: "low",
    residual_risk: "low",
  },
  {
    id: "tp_ia_2",
    category: "illegitimate_access",
    description: "Attacco informatico esterno (breach)",
    source: "Attaccanti esterni",
    likelihood: "medium", severity: "high",
    risk_level: computeRiskLevel("medium", "high"),
    mitigation: "Adottare cifratura end-to-end, WAF, MFA, penetration testing periodico e piano di incident response.",
    residual_likelihood: "low", residual_severity: "low",
    residual_risk: "low",
  },
  {
    id: "tp_ia_3",
    category: "illegitimate_access",
    description: "Accesso non autorizzato da fornitori/sub-responsabili",
    source: "Fornitori e sub-responsabili",
    likelihood: "low", severity: "medium",
    risk_level: computeRiskLevel("low", "medium"),
    mitigation: "Stipulare accordi ex Art. 28 GDPR, audit periodici dei fornitori e limitare i dati condivisi al minimo necessario.",
    residual_likelihood: "low", residual_severity: "low",
    residual_risk: "low",
  },
  {
    id: "tp_ia_4",
    category: "illegitimate_access",
    description: "Furto di credenziali (phishing, social engineering)",
    source: "Attaccanti esterni",
    likelihood: "medium", severity: "high",
    risk_level: computeRiskLevel("medium", "high"),
    mitigation: "Abilitare MFA su tutti gli accessi, campagne anti-phishing, monitoraggio anomalie di login.",
    residual_likelihood: "low", residual_severity: "low",
    residual_risk: "low",
  },

  // ── unwanted_modification ────────────────────────────────────────────────
  {
    id: "tp_um_1",
    category: "unwanted_modification",
    description: "Modifica accidentale dei dati da parte degli operatori",
    source: "Dipendenti e collaboratori",
    likelihood: "medium", severity: "medium",
    risk_level: computeRiskLevel("medium", "medium"),
    mitigation: "Implementare log di audit immutabili, workflow di approvazione modifiche e backup frequenti con verifica di integrità.",
    residual_likelihood: "low", residual_severity: "low",
    residual_risk: "low",
  },
  {
    id: "tp_um_2",
    category: "unwanted_modification",
    description: "Manipolazione dei dati da attori malevoli",
    source: "Attaccanti esterni",
    likelihood: "low", severity: "high",
    risk_level: computeRiskLevel("low", "high"),
    mitigation: "Adottare firma digitale dei record, controlli di integrità (checksum/hash), segregazione delle reti.",
    residual_likelihood: "low", residual_severity: "low",
    residual_risk: "low",
  },
  {
    id: "tp_um_3",
    category: "unwanted_modification",
    description: "Corruzione dei dati da errori di sistema/software",
    source: "Errori di sistema",
    likelihood: "medium", severity: "medium",
    risk_level: computeRiskLevel("medium", "medium"),
    mitigation: "Implementare validazione input, test di regressione continui, procedure di rollback e monitoraggio dell'integrità dei dati.",
    residual_likelihood: "low", residual_severity: "low",
    residual_risk: "low",
  },
  {
    id: "tp_um_4",
    category: "unwanted_modification",
    description: "Alterazione dati da fornitori terzi",
    source: "Fornitori e sub-responsabili",
    likelihood: "low", severity: "medium",
    risk_level: computeRiskLevel("low", "medium"),
    mitigation: "Definire SLA con clausole di integrità, audit tecnici periodici e log separati per le operazioni dei fornitori.",
    residual_likelihood: "low", residual_severity: "low",
    residual_risk: "low",
  },

  // ── data_disappearance ───────────────────────────────────────────────────
  {
    id: "tp_dd_1",
    category: "data_disappearance",
    description: "Perdita dati per guasto hardware/infrastrutturale",
    source: "Errori di sistema",
    likelihood: "low", severity: "high",
    risk_level: computeRiskLevel("low", "high"),
    mitigation: "Adottare backup automatizzati giornalieri su storage geograficamente ridondante, test di recovery periodici.",
    residual_likelihood: "low", residual_severity: "low",
    residual_risk: "low",
  },
  {
    id: "tp_dd_2",
    category: "data_disappearance",
    description: "Cancellazione accidentale da parte degli operatori",
    source: "Dipendenti e collaboratori",
    likelihood: "medium", severity: "medium",
    risk_level: computeRiskLevel("medium", "medium"),
    mitigation: "Implementare cestino/soft-delete con periodo di ripristino, doppia conferma per operazioni distruttive, backup incrementali.",
    residual_likelihood: "low", residual_severity: "low",
    residual_risk: "low",
  },
  {
    id: "tp_dd_3",
    category: "data_disappearance",
    description: "Ransomware / attacco distruttivo",
    source: "Attaccanti esterni",
    likelihood: "low", severity: "high",
    risk_level: computeRiskLevel("low", "high"),
    mitigation: "Backup offline immutabili, EDR/XDR, segmentazione di rete, piano di disaster recovery testato regolarmente.",
    residual_likelihood: "low", residual_severity: "low",
    residual_risk: "low",
  },
  {
    id: "tp_dd_4",
    category: "data_disappearance",
    description: "Perdita dati per scadenza contratto fornitore cloud",
    source: "Fornitori e sub-responsabili",
    likelihood: "low", severity: "medium",
    risk_level: computeRiskLevel("low", "medium"),
    mitigation: "Includere clausole di data portability nei contratti, eseguire export periodici dei dati, definire procedure di exit management.",
    residual_likelihood: "low", residual_severity: "low",
    residual_risk: "low",
  },
];

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORIES: { id: DPIAThreat["category"]; label: string }[] = [
  { id: "illegitimate_access",  label: "Accesso illegittimo" },
  { id: "unwanted_modification", label: "Modifica non desiderata" },
  { id: "data_disappearance",   label: "Scomparsa dati" },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface ThreatCatalogProps {
  existingThreatIds: string[];
  onAddThreat: (threat: Omit<DPIAThreat, "id">) => void;
}

// ─── Risk badge ───────────────────────────────────────────────────────────────

function RiskBadge({ level }: { level: "low" | "medium" | "high" }) {
  const cfg = {
    high:   { label: "Alto",  bg: T.redBg,   color: T.red,   border: T.redBdr   },
    medium: { label: "Medio", bg: T.amberBg, color: T.amber, border: T.amberBdr },
    low:    { label: "Basso", bg: T.greenBg, color: T.green, border: T.greenBdr },
  }[level];
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
    }}>
      {cfg.label}
    </span>
  );
}

function LevelBadge({ level, label }: { level: "low" | "medium" | "high"; label: string }) {
  const cfg = {
    high:   { color: T.red,   bg: T.redBg,   border: T.redBdr   },
    medium: { color: T.amber, bg: T.amberBg, border: T.amberBdr },
    low:    { color: T.green, bg: T.greenBg, border: T.greenBdr },
  }[level];
  const levelLabel = { high: "Alta", medium: "Media", low: "Bassa" }[level];
  return (
    <span style={{
      fontSize: 10, padding: "1px 6px", borderRadius: 4,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
    }}>
      {label}: {levelLabel}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ThreatCatalog({ existingThreatIds, onAddThreat }: ThreatCatalogProps) {
  const [openCategories, setOpenCategories] = useState<Set<DPIAThreat["category"]>>(
    new Set(["illegitimate_access"])
  );

  function toggleCategory(cat: DPIAThreat["category"]) {
    setOpenCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  function handleAdd(pattern: ThreatPattern) {
    onAddThreat({
      category:            pattern.category,
      source:              pattern.source,
      description:         pattern.description,
      likelihood:          pattern.likelihood,
      severity:            pattern.severity,
      risk_level:          pattern.risk_level,
      mitigation:          pattern.mitigation,
      residual_likelihood: pattern.residual_likelihood,
      residual_severity:   pattern.residual_severity,
      residual_risk:       pattern.residual_risk,
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Header */}
      <div style={{
        padding: "10px 14px", borderRadius: 10,
        background: T.bg, border: `1px solid ${T.border}`,
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Catalogo minacce WP248</span>
        <span style={{ fontSize: 11, color: T.muted, marginLeft: 8 }}>
          Seleziona pattern predefiniti e aggiungili alla tua analisi
        </span>
      </div>

      {/* Accordions per categoria */}
      {CATEGORIES.map(cat => {
        const patterns = THREAT_PATTERNS.filter(p => p.category === cat.id);
        const isOpen = openCategories.has(cat.id);
        const addedCount = patterns.filter(p =>
          // We track by description since existingThreatIds are UUIDs from catalog adds
          existingThreatIds.includes(p.id)
        ).length;

        return (
          <div key={cat.id} style={{
            background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden",
          }}>
            {/* Accordion header */}
            <button
              onClick={() => toggleCategory(cat.id)}
              style={{
                width: "100%", padding: "10px 14px", display: "flex",
                alignItems: "center", justifyContent: "space-between",
                background: "none", border: "none", cursor: "pointer",
                borderBottom: isOpen ? `1px solid ${T.border}` : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{cat.label}</span>
                <span style={{
                  fontSize: 10, padding: "1px 7px", borderRadius: 9999,
                  background: "rgba(0,0,0,0.05)", color: T.muted,
                  border: `1px solid ${T.border}`,
                }}>
                  {patterns.length} minacce
                </span>
                {addedCount > 0 && (
                  <span style={{
                    fontSize: 10, padding: "1px 7px", borderRadius: 9999,
                    background: T.greenBg, color: T.green, border: `1px solid ${T.greenBdr}`,
                  }}>
                    {addedCount} aggiunte
                  </span>
                )}
              </div>
              <span style={{ fontSize: 12, color: T.faint, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
                ▾
              </span>
            </button>

            {/* Pattern list */}
            {isOpen && (
              <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                {patterns.map(pattern => {
                  const isAlreadyAdded = existingThreatIds.includes(pattern.id);
                  return (
                    <div key={pattern.id} style={{
                      padding: "10px 12px", borderRadius: 8,
                      background: isAlreadyAdded ? "rgba(0,0,0,0.02)" : T.card,
                      border: `1px solid ${T.border}`,
                      display: "flex", alignItems: "flex-start", gap: 10,
                    }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, fontWeight: 500, color: T.text, marginBottom: 4 }}>
                          {pattern.description}
                        </p>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                          <span style={{
                            fontSize: 10, padding: "1px 6px", borderRadius: 4,
                            background: "rgba(0,0,0,0.05)", color: T.muted, border: `1px solid ${T.border}`,
                          }}>
                            {pattern.source}
                          </span>
                          <LevelBadge level={pattern.likelihood} label="P" />
                          <LevelBadge level={pattern.severity} label="G" />
                          <RiskBadge level={pattern.risk_level} />
                        </div>
                      </div>
                      <div style={{ flexShrink: 0 }}>
                        {isAlreadyAdded ? (
                          <span style={{
                            fontSize: 10, fontWeight: 500, padding: "4px 10px", borderRadius: 6,
                            background: T.greenBg, color: T.green, border: `1px solid ${T.greenBdr}`,
                          }}>
                            Gia presente
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAdd(pattern)}
                            style={{
                              padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500,
                              cursor: "pointer", border: `1px solid ${T.border}`,
                              background: T.card, color: T.text,
                              transition: "all 0.12s",
                            }}
                          >
                            Aggiungi
                          </button>
                        )}
                      </div>
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
