"use client";

import React, { useState, useEffect, useRef, useCallback, CSSProperties } from "react";
import SignOffPanel from "@/components/ui/SignOffPanel";
import {
  Search, Database, Scale, AlertTriangle, Shield, CheckCircle2,
  ChevronLeft, ChevronRight, Plus, Trash2, Download, FileText,
  AlertCircle, Info, Check, X,
} from "lucide-react";
import {
  writeToStorage, readFromStorage,
  DPIAResult, DPIAScreeningCriterion, DPIAAsset, DPIAThreat,
  DPIAProportionalityCheck, DPIARightsCheck,
  ClassifierResult, DataAuditResult,
} from "@/lib/dossier/storage-schema";
import { appendEvidence } from "@/lib/evidence/evidence-layer";
import { SystemContextBanner } from "@/components/compliance/SystemContextBanner";

// ─── Design tokens ────────────────────────────────────────────────────────────

const T = {
  text:     "#0D1016",
  muted:    "rgba(0,0,0,0.42)",
  faint:    "rgba(0,0,0,0.22)",
  border:   "rgba(0,0,0,0.08)",
  card:     "#ffffff",
  bg:       "#f9f9fb",
  red:      "#dc2626",
  redBg:    "rgba(220,38,38,0.06)",
  redBdr:   "rgba(220,38,38,0.18)",
  amber:    "#92400e",
  amberBg:  "rgba(202,138,4,0.07)",
  amberBdr: "rgba(202,138,4,0.22)",
  blue:     "#1d4ed8",
  blueBg:   "rgba(29,78,216,0.06)",
  blueBdr:  "rgba(29,78,216,0.18)",
  green:    "#15803d",
  greenBg:  "rgba(21,128,61,0.06)",
  greenBdr: "rgba(21,128,61,0.18)",
} as const;

const cardSt: CSSProperties = {
  background: T.card,
  border: `1px solid ${T.border}`,
  borderRadius: 12,
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};

const inputSt: CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  borderRadius: 8,
  border: `1px solid ${T.border}`,
  fontSize: 12,
  color: T.text,
  background: T.card,
  outline: "none",
};

const taSt: CSSProperties = { ...inputSt, resize: "vertical" };

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 0 | 1 | 2 | 3 | 4 | 5;
type DPIADoc = DPIAResult;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

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

function computeDPIARequired(criteria: DPIAScreeningCriterion[]): "yes" | "no" | "uncertain" {
  const count = criteria.filter(c => c.applies === "yes" || c.applies === "partial").length;
  if (count >= 2) return "yes";
  if (count === 1) return "uncertain";
  return "no";
}

function computeWorstRisk(threats: DPIAThreat[]): "high" | "medium" | "low" | "" {
  if (threats.length === 0) return "";
  if (threats.some(t => t.risk_level === "high")) return "high";
  if (threats.some(t => t.risk_level === "medium")) return "medium";
  return "low";
}

function computeWorstResidualRisk(threats: DPIAThreat[]): "high" | "medium" | "low" | "" {
  if (threats.length === 0) return "";
  if (threats.some(t => t.residual_risk === "high")) return "high";
  if (threats.some(t => t.residual_risk === "medium")) return "medium";
  return "low";
}

function riskBadge(level: "high" | "medium" | "low" | "") {
  if (!level) return null;
  const cfg = {
    high:   { label: "Alto",   bg: T.redBg,   color: T.red,   border: T.redBdr   },
    medium: { label: "Medio",  bg: T.amberBg, color: T.amber, border: T.amberBdr },
    low:    { label: "Basso",  bg: T.greenBg, color: T.green, border: T.greenBdr },
  }[level];
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
    }}>{cfg.label}</span>
  );
}

// ─── Default data ─────────────────────────────────────────────────────────────

const DEFAULT_CRITERIA: DPIAScreeningCriterion[] = [
  { id: "c1", applies: "", notes: "",
    label: "Valutazione sistematica di aspetti personali (profilazione)",
    description: "Trattamento che comprende una profilazione e sulla base della quale vengono prese decisioni con effetti giuridici o significativi sulle persone fisiche." },
  { id: "c2", applies: "", notes: "",
    label: "Trattamento su larga scala di categorie particolari (Art. 9/10)",
    description: "Trattamento su larga scala di dati sensibili (origine razziale/etnica, salute, dati genetici/biometrici, ecc.) o relativi a condanne penali." },
  { id: "c3", applies: "", notes: "",
    label: "Sorveglianza sistematica di aree pubbliche",
    description: "Sorveglianza sistematica su larga scala di un'area accessibile al pubblico (es. videosorveglianza, tracking Wi-Fi/Bluetooth)." },
  { id: "c4", applies: "", notes: "",
    label: "Decisioni automatizzate con effetti legali o significativi",
    description: "Processo decisionale automatizzato (inclusa la profilazione) che produce effetti giuridici o significativi sull'individuo (Art. 22 GDPR)." },
  { id: "c5", applies: "", notes: "",
    label: "Soggetti o dati vulnerabili",
    description: "Trattamento di dati di minori, dipendenti, pazienti, richiedenti asilo o altre categorie vulnerabili che non possono facilmente opporsi." },
  { id: "c6", applies: "", notes: "",
    label: "Applicazione innovativa o nuove tecnologie",
    description: "Uso di tecnologie nuove o innovative (IA, IoT, riconoscimento facciale, ecc.) che creano nuove forme di raccolta o utilizzo dei dati." },
  { id: "c7", applies: "", notes: "",
    label: "Trattamento che impedisce accesso a servizi o diritti",
    description: "Il trattamento può impedire all'interessato di esercitare un diritto o beneficiare di un servizio o contratto (es. credit scoring, blacklist)." },
  { id: "c8", applies: "", notes: "",
    label: "Confronto o combinazione di dataset",
    description: "Abbinamento o combinazione di dataset (es. da più titolari, da fonti diverse) oltre le ragionevoli aspettative degli interessati." },
  { id: "c9", applies: "", notes: "",
    label: "Trattamento di dati su larga scala",
    description: "Trattamento di dati personali a larga scala (molti soggetti, grandi volumi, vasta area geografica, lungo periodo di conservazione)." },
];

const DEFAULT_PROP_CHECKS: DPIAProportionalityCheck[] = [
  { id: "p1", status: "", notes: "",
    principle: "Liceità, correttezza e trasparenza",
    description: "Il trattamento ha una base giuridica valida (Art. 6), è corretto nei confronti degli interessati ed è trasparente (Art. 5(1)(a))." },
  { id: "p2", status: "", notes: "",
    principle: "Limitazione della finalità",
    description: "I dati sono raccolti per finalità determinate, esplicite e legittime, non trattati in modo incompatibile (Art. 5(1)(b))." },
  { id: "p3", status: "", notes: "",
    principle: "Minimizzazione dei dati",
    description: "I dati trattati sono adeguati, pertinenti e limitati al necessario rispetto alle finalità (Art. 5(1)(c))." },
  { id: "p4", status: "", notes: "",
    principle: "Esattezza",
    description: "I dati sono esatti e, se necessario, aggiornati; adottate misure ragionevoli per cancellare o rettificare dati inesatti (Art. 5(1)(d))." },
  { id: "p5", status: "", notes: "",
    principle: "Limitazione della conservazione",
    description: "I dati sono conservati in una forma che consenta l'identificazione degli interessati per il tempo necessario (Art. 5(1)(e))." },
  { id: "p6", status: "", notes: "",
    principle: "Integrità e riservatezza",
    description: "Trattamento garantisce sicurezza adeguata dei dati, protezione da trattamenti non autorizzati o illeciti e da perdita o distruzione (Art. 5(1)(f))." },
  { id: "p7", status: "", notes: "",
    principle: "Responsabilizzazione (Accountability)",
    description: "Il titolare è responsabile e in grado di dimostrare la conformità a tutti i principi (Art. 5(2))." },
];

const DEFAULT_RIGHTS_CHECKS: DPIARightsCheck[] = [
  { id: "r1", applicable: "", how_ensured: "",
    right: "Informazione e accesso", article: "Artt. 13-15 GDPR" },
  { id: "r2", applicable: "", how_ensured: "",
    right: "Rettifica", article: "Art. 16 GDPR" },
  { id: "r3", applicable: "", how_ensured: "",
    right: "Cancellazione (diritto all'oblio)", article: "Art. 17 GDPR" },
  { id: "r4", applicable: "", how_ensured: "",
    right: "Limitazione del trattamento", article: "Art. 18 GDPR" },
  { id: "r5", applicable: "", how_ensured: "",
    right: "Portabilità dei dati", article: "Art. 20 GDPR" },
  { id: "r6", applicable: "", how_ensured: "",
    right: "Opposizione al trattamento", article: "Art. 21 GDPR" },
  { id: "r7", applicable: "", how_ensured: "",
    right: "Decisioni automatizzate e profilazione", article: "Art. 22 GDPR" },
  { id: "r8", applicable: "", how_ensured: "",
    right: "Comunicazione in caso di violazione", article: "Art. 34 GDPR" },
];

function createEmptyDPIA(): DPIADoc {
  return {
    screening: {
      criteria: DEFAULT_CRITERIA.map(c => ({ ...c })),
      criteria_met_count: 0,
      dpia_required: "uncertain",
      justification_if_no_dpia: "",
    },
    description: {
      system_name: "", organization_name: "", controller_name: "",
      dpo_name: "", dpo_consulted: "", dpo_opinion: "",
      processor_involved: "", processor_name: "",
      processing_purposes: "", legitimate_interest: "",
      personal_data_categories: "", special_categories: "",
      data_subjects_categories: "", recipients: "", retention_period: "",
      assets: [],
      codes_of_conduct: "", certifications: "",
      data_subjects_opinions: "", data_subjects_opinions_justification: "",
      data_subjects_opinions_details: "",
    },
    proportionality: {
      necessity_justification: "",
      proportionality_checks: DEFAULT_PROP_CHECKS.map(c => ({ ...c })),
      rights_checks: DEFAULT_RIGHTS_CHECKS.map(c => ({ ...c })),
      processor_clauses_art28: "",
      international_transfers: "",
      international_transfers_safeguards: "",
    },
    risks: {
      threats: [],
      overall_risk_before: "",
    },
    measures: {
      technical_measures: "", organizational_measures: "",
      overall_risk_after: "",
      prior_consultation_required: false,
      prior_consultation_authority: "", prior_consultation_date: "",
      review_schedule: "", review_trigger: "",
    },
    conclusion: {
      compliant: "", conditions: "", summary: "",
      next_review_date: "", completedAt: "",
    },
  };
}

// ─── Storage key ──────────────────────────────────────────────────────────────

const STORAGE_KEY = "aicomply_dpia_result";

// ─── Step config ──────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Screening",    sub: "WP248",          Icon: Search        },
  { label: "Descrizione",  sub: "Sistematica",    Icon: Database      },
  { label: "Necessità",    sub: "Proporzionalità",Icon: Scale         },
  { label: "Rischi",       sub: "WP248 §3",       Icon: AlertTriangle },
  { label: "Misure",       sub: "Residuo",        Icon: Shield        },
  { label: "Conclusione",  sub: "Rapporto",       Icon: CheckCircle2  },
] as const;

// ─── Small helpers ────────────────────────────────────────────────────────────

function Lbl({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: T.muted, marginBottom: 4 }}>
      {children}{required && <span style={{ color: T.red }}> *</span>}
    </label>
  );
}

function Sel<T extends string>({
  value, onChange, options, style,
}: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; style?: CSSProperties }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value as T)}
      style={{ ...inputSt, ...style }}>
      <option value="">— seleziona —</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function statusBadge(status: string) {
  const cfg: Record<string, { label: string; bg: string; color: string; border: string }> = {
    compliant:     { label: "Conforme",      bg: T.greenBg,  color: T.green,  border: T.greenBdr  },
    partial:       { label: "Parziale",      bg: T.amberBg,  color: T.amber,  border: T.amberBdr  },
    non_compliant: { label: "Non conforme",  bg: T.redBg,    color: T.red,    border: T.redBdr    },
    na:            { label: "N/A",           bg: "rgba(0,0,0,0.04)", color: T.muted, border: T.border },
  };
  const c = cfg[status];
  if (!c) return null;
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4,
      background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      {c.label}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DPIAPage() {
  const [doc, setDoc] = useState<DPIADoc>(createEmptyDPIA);
  const [step, setStep] = useState<Step>(0);
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from storage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<DPIADoc>;
        setDoc(d => ({
          ...createEmptyDPIA(),
          ...parsed,
          screening: { ...createEmptyDPIA().screening, ...parsed.screening },
          description: { ...createEmptyDPIA().description, ...parsed.description },
          proportionality: { ...createEmptyDPIA().proportionality, ...parsed.proportionality },
          risks: { ...createEmptyDPIA().risks, ...parsed.risks },
          measures: { ...createEmptyDPIA().measures, ...parsed.measures },
          conclusion: { ...createEmptyDPIA().conclusion, ...parsed.conclusion },
        }));
        setSaved(true);
      }
    } catch { /* ignore */ }
  }, []);

  // Debounced autosave
  const autosave = useCallback((nextDoc: DPIADoc) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDoc));
        setSaved(true);
      } catch { /* ignore */ }
    }, 500);
  }, []);

  function upDoc(updater: (d: DPIADoc) => DPIADoc) {
    setDoc(prev => {
      const next = updater(prev);
      autosave(next);
      return next;
    });
  }

  // ── Screening helpers ──────────────────────────────────────────────────────

  function upCriterion(id: string, patch: Partial<DPIAScreeningCriterion>) {
    upDoc(d => {
      const criteria = d.screening.criteria.map(c => c.id === id ? { ...c, ...patch } : c);
      const criteria_met_count = criteria.filter(c => c.applies === "yes" || c.applies === "partial").length;
      const dpia_required = computeDPIARequired(criteria);
      return { ...d, screening: { ...d.screening, criteria, criteria_met_count, dpia_required } };
    });
  }

  // ── Description helpers ────────────────────────────────────────────────────

  function upDesc(patch: Partial<DPIADoc["description"]>) {
    upDoc(d => ({ ...d, description: { ...d.description, ...patch } }));
  }

  // Pre-populate from Classifier, DataAudit on mount
  useEffect(() => {
    const classifier = readFromStorage<ClassifierResult>("classifier");
    const dataAudit = readFromStorage<DataAuditResult>("dataAudit");

    setDoc(prev => {
      let next = prev;

      // Pre-populate system_name from classifier
      if (classifier?.systemName && !next.description.system_name) {
        next = { ...next, description: { ...next.description, system_name: classifier.systemName } };
      }

      // Pre-populate screening criteria from classifier + dataAudit
      let criteria = next.screening.criteria;
      let changed = false;

      if (classifier?.riskLevel === "high") {
        // c6: Applicazione innovativa o nuove tecnologie
        criteria = criteria.map(c =>
          c.id === "c6" && !c.applies ? { ...c, applies: "yes" as const } : c
        );
        // c4: Decisioni automatizzate con effetti legali o significativi
        criteria = criteria.map(c =>
          c.id === "c4" && !c.applies ? { ...c, applies: "yes" as const } : c
        );
        changed = true;
      }

      // c2: if any dataset has personalData === true
      if (dataAudit?.datasets?.some((d: DataAuditResult["datasets"][number]) => d.personalData === true)) {
        criteria = criteria.map(c =>
          c.id === "c2" && !c.applies ? { ...c, applies: "yes" as const } : c
        );
        changed = true;
      }

      if (changed) {
        const criteria_met_count = criteria.filter(c => c.applies === "yes" || c.applies === "partial").length;
        const dpia_required = computeDPIARequired(criteria);
        next = { ...next, screening: { ...next.screening, criteria, criteria_met_count, dpia_required } };
      }

      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addAsset() {
    const asset: DPIAAsset = {
      id: `a${Date.now()}`, name: "", type: "database",
      description: "", personal_data: true,
    };
    upDoc(d => ({ ...d, description: { ...d.description, assets: [...d.description.assets, asset] } }));
  }

  function upAsset(id: string, patch: Partial<DPIAAsset>) {
    upDoc(d => ({
      ...d, description: {
        ...d.description,
        assets: d.description.assets.map(a => a.id === id ? { ...a, ...patch } : a),
      },
    }));
  }

  function delAsset(id: string) {
    upDoc(d => ({ ...d, description: { ...d.description, assets: d.description.assets.filter(a => a.id !== id) } }));
  }

  // ── Proportionality helpers ────────────────────────────────────────────────

  function upProp(patch: Partial<DPIADoc["proportionality"]>) {
    upDoc(d => ({ ...d, proportionality: { ...d.proportionality, ...patch } }));
  }

  function upPropCheck(id: string, patch: Partial<DPIAProportionalityCheck>) {
    upDoc(d => ({
      ...d, proportionality: {
        ...d.proportionality,
        proportionality_checks: d.proportionality.proportionality_checks.map(
          c => c.id === id ? { ...c, ...patch } : c
        ),
      },
    }));
  }

  function upRightsCheck(id: string, patch: Partial<DPIARightsCheck>) {
    upDoc(d => ({
      ...d, proportionality: {
        ...d.proportionality,
        rights_checks: d.proportionality.rights_checks.map(
          c => c.id === id ? { ...c, ...patch } : c
        ),
      },
    }));
  }

  // ── Risks helpers ──────────────────────────────────────────────────────────

  function addThreat(category: DPIAThreat["category"]) {
    const t: DPIAThreat = {
      id: `t${Date.now()}`, category,
      source: "",
      description: "", likelihood: "medium", severity: "medium",
      risk_level: "medium", mitigation: "",
      residual_likelihood: "low", residual_severity: "low",
      residual_risk: "low",
    };
    upDoc(d => {
      const threats = [...d.risks.threats, t];
      return { ...d, risks: { threats, overall_risk_before: computeWorstRisk(threats) } };
    });
  }

  function upThreat(id: string, patch: Partial<DPIAThreat>) {
    upDoc(d => {
      const threats = d.risks.threats.map(t => {
        if (t.id !== id) return t;
        const merged = { ...t, ...patch };
        // Auto-recompute risk levels
        merged.risk_level = computeRiskLevel(merged.likelihood, merged.severity);
        merged.residual_risk = computeRiskLevel(merged.residual_likelihood, merged.residual_severity);
        return merged;
      });
      return { ...d, risks: { threats, overall_risk_before: computeWorstRisk(threats) } };
    });
  }

  function delThreat(id: string) {
    upDoc(d => {
      const threats = d.risks.threats.filter(t => t.id !== id);
      return { ...d, risks: { threats, overall_risk_before: computeWorstRisk(threats) } };
    });
  }

  // ── Measures helpers ───────────────────────────────────────────────────────

  function upMeasures(patch: Partial<DPIADoc["measures"]>) {
    upDoc(d => {
      const next = { ...d.measures, ...patch };
      // Auto-compute residual risk from threats residual levels
      const worstResidual = computeWorstResidualRisk(d.risks.threats);
      next.overall_risk_after = worstResidual;
      next.prior_consultation_required = worstResidual === "high";
      return { ...d, measures: next };
    });
  }

  // ── Conclusion helpers ─────────────────────────────────────────────────────

  function upConclusion(patch: Partial<DPIADoc["conclusion"]>) {
    upDoc(d => ({ ...d, conclusion: { ...d.conclusion, ...patch } }));
  }

  // ── Save to dossier ────────────────────────────────────────────────────────

  function saveToDossier() {
    const now = new Date().toISOString();
    const withDate = { ...doc, conclusion: { ...doc.conclusion, completedAt: now } };
    setDoc(withDate);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(withDate));
    writeToStorage("dpia", withDate);
    appendEvidence("adr", {
      tool: "dpia",
      systemName: doc.description.system_name,
      dpiaRequired: doc.screening.dpia_required,
      overallRiskBefore: doc.risks.overall_risk_before,
      overallRiskAfter: doc.measures.overall_risk_after,
      conclusion: doc.conclusion.compliant,
    }, "dpia");
    setSaved(true);
  }

  // ── Download report ────────────────────────────────────────────────────────

  function downloadReport() {
    const lines: string[] = [];
    const d = doc;
    lines.push("VALUTAZIONE D'IMPATTO SULLA PROTEZIONE DEI DATI (DPIA)");
    lines.push("Metodologia: WP248 rev.01 — Gruppo di Lavoro Art. 29 (ottobre 2017)");
    lines.push("=".repeat(70));
    lines.push(`Sistema: ${d.description.system_name}`);
    lines.push(`Organizzazione: ${d.description.organization_name}`);
    lines.push(`Titolare: ${d.description.controller_name}`);
    lines.push(`Data: ${new Date().toLocaleDateString("it-IT")}`);
    lines.push("");
    lines.push("STEP 0 — SCREENING WP248");
    lines.push("-".repeat(40));
    lines.push(`DPIA Richiesta: ${d.screening.dpia_required.toUpperCase()}`);
    lines.push(`Criteri soddisfatti: ${d.screening.criteria_met_count}/9`);
    d.screening.criteria.forEach(c => {
      lines.push(`  [${c.applies || "?"}] ${c.label}`);
      if (c.notes) lines.push(`       Note: ${c.notes}`);
    });
    lines.push("");
    lines.push("STEP 1 — DESCRIZIONE SISTEMATICA");
    lines.push("-".repeat(40));
    lines.push(`Finalità: ${d.description.processing_purposes}`);
    lines.push(`Categorie dati: ${d.description.personal_data_categories}`);
    lines.push(`Cat. particolari: ${d.description.special_categories}`);
    lines.push(`Interessati: ${d.description.data_subjects_categories}`);
    lines.push(`Destinatari: ${d.description.recipients}`);
    lines.push(`Conservazione: ${d.description.retention_period}`);
    lines.push(`DPO: ${d.description.dpo_name} (consultato: ${d.description.dpo_consulted})`);
    if (d.description.dpo_opinion) lines.push(`Parere DPO: ${d.description.dpo_opinion}`);
    lines.push("");
    lines.push("STEP 2 — NECESSITÀ E PROPORZIONALITÀ");
    lines.push("-".repeat(40));
    lines.push(`Giustificazione necessità: ${d.proportionality.necessity_justification}`);
    lines.push("Verifica principi GDPR:");
    d.proportionality.proportionality_checks.forEach(c => {
      lines.push(`  [${c.status || "?"}] ${c.principle}: ${c.notes}`);
    });
    lines.push("Diritti degli interessati:");
    d.proportionality.rights_checks.forEach(r => {
      lines.push(`  [${r.applicable || "?"}] ${r.right} (${r.article}): ${r.how_ensured}`);
    });
    lines.push(`Trasferimenti internazionali: ${d.proportionality.international_transfers}`);
    if (d.proportionality.international_transfers_safeguards)
      lines.push(`Garanzie: ${d.proportionality.international_transfers_safeguards}`);
    lines.push("");
    lines.push("STEP 3 — RISCHI (WP248)");
    lines.push("-".repeat(40));
    lines.push(`Rischio complessivo PRIMA delle misure: ${d.risks.overall_risk_before.toUpperCase()}`);
    const catLabels: Record<DPIAThreat["category"], string> = {
      illegitimate_access: "Accesso illegittimo",
      unwanted_modification: "Modifica indesiderata",
      data_disappearance: "Scomparsa dei dati",
    };
    d.risks.threats.forEach(t => {
      lines.push(`\n  [${catLabels[t.category]}] ${t.description}`);
      lines.push(`    Probabilità: ${t.likelihood} | Gravità: ${t.severity} | Rischio: ${t.risk_level}`);
      lines.push(`    Misura: ${t.mitigation}`);
      lines.push(`    Rischio residuo: ${t.residual_risk}`);
    });
    lines.push("");
    lines.push("STEP 4 — MISURE DI SICUREZZA");
    lines.push("-".repeat(40));
    lines.push(`Misure tecniche:\n${d.measures.technical_measures}`);
    lines.push(`\nMisure organizzative:\n${d.measures.organizational_measures}`);
    lines.push(`\nRischio residuo complessivo: ${d.measures.overall_risk_after.toUpperCase()}`);
    if (d.measures.prior_consultation_required) {
      lines.push(`\n⚠️  CONSULTAZIONE PREVENTIVA (Art. 36) RICHIESTA`);
      lines.push(`Autorità: ${d.measures.prior_consultation_authority}`);
      lines.push(`Data prevista: ${d.measures.prior_consultation_date}`);
    }
    lines.push("");
    lines.push("STEP 5 — CONCLUSIONE");
    lines.push("-".repeat(40));
    lines.push(`Conforme: ${d.conclusion.compliant}`);
    if (d.conclusion.conditions) lines.push(`Condizioni: ${d.conclusion.conditions}`);
    lines.push(`\nSintesi:\n${d.conclusion.summary}`);
    lines.push(`\nProssima revisione: ${d.conclusion.next_review_date}`);
    lines.push(`\nCompletato il: ${d.conclusion.completedAt || "—"}`);

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DPIA_${d.description.system_name || "report"}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const worstResidual = computeWorstResidualRisk(doc.risks.threats);
  const priorConsultation = worstResidual === "high";

  // ── Render helpers ─────────────────────────────────────────────────────────

  const navBtnSt = (active: boolean): CSSProperties => ({
    padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500,
    cursor: "pointer", border: "1px solid",
    background: active ? T.text : T.card,
    color: active ? "#fff" : T.text,
    borderColor: active ? T.text : T.border,
    transition: "all 0.15s",
  });

  // ─── Step 0: Screening ─────────────────────────────────────────────────────

  function renderStep0() {
    const { criteria, dpia_required, justification_if_no_dpia } = doc.screening;
    const dpiaColor = dpia_required === "yes" ? T.red : dpia_required === "uncertain" ? T.amber : T.green;
    const dpiaBg = dpia_required === "yes" ? T.redBg : dpia_required === "uncertain" ? T.amberBg : T.greenBg;
    const dpiaBdr = dpia_required === "yes" ? T.redBdr : dpia_required === "uncertain" ? T.amberBdr : T.greenBdr;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Info box */}
        <div style={{ ...cardSt, padding: 14, background: T.blueBg, border: `1px solid ${T.blueBdr}` }}>
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: T.blue }} />
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: T.blue, marginBottom: 4 }}>
                Screening WP248 rev.01 — 9 criteri
              </p>
              <p style={{ fontSize: 11, color: T.text, lineHeight: 1.6 }}>
                Verificare se si applica almeno uno dei criteri WP248. La DPIA è obbligatoria quando
                sono soddisfatti almeno 2 criteri. Con 1 criterio è incerto; raccomandato procedere
                comunque. Con 0 criteri la DPIA non è richiesta ma va giustificata.
              </p>
            </div>
          </div>
        </div>

        {/* Result banner */}
        <div style={{ ...cardSt, padding: "12px 16px", background: dpiaBg, border: `1px solid ${dpiaBdr}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 500, color: T.muted }}>Esito screening</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: dpiaColor, marginTop: 2 }}>
              DPIA {dpia_required === "yes" ? "RICHIESTA" : dpia_required === "uncertain" ? "INCERTA" : "NON RICHIESTA"}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 24, fontWeight: 700, color: dpiaColor }}>
              {doc.screening.criteria_met_count}/9
            </p>
            <p style={{ fontSize: 11, color: T.muted }}>criteri soddisfatti</p>
          </div>
        </div>

        {/* Criteria list */}
        {criteria.map((c, idx) => (
          <div key={c.id} style={{ ...cardSt, padding: 14 }}>
            <div className="flex items-start gap-3">
              <span style={{
                width: 22, height: 22, borderRadius: 11, flexShrink: 0,
                background: c.applies === "yes" ? T.redBg : c.applies === "partial" ? T.amberBg : "rgba(0,0,0,0.05)",
                border: `1px solid ${c.applies === "yes" ? T.redBdr : c.applies === "partial" ? T.amberBdr : T.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700,
                color: c.applies === "yes" ? T.red : c.applies === "partial" ? T.amber : T.faint,
              }}>
                {idx + 1}
              </span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 2 }}>{c.label}</p>
                <p style={{ fontSize: 11, color: T.muted, lineHeight: 1.5, marginBottom: 10 }}>{c.description}</p>
                <div className="flex items-center gap-3">
                  <Sel
                    value={c.applies as "yes" | "no" | "partial" | ""}
                    onChange={v => upCriterion(c.id, { applies: v })}
                    options={[
                      { value: "yes", label: "Sì — applicabile" },
                      { value: "partial", label: "Parzialmente applicabile" },
                      { value: "no", label: "No — non applicabile" },
                    ]}
                    style={{ width: 200 }}
                  />
                  <input
                    value={c.notes}
                    onChange={e => upCriterion(c.id, { notes: e.target.value })}
                    placeholder="Note opzionali…"
                    style={{ ...inputSt, flex: 1 }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Justification if no DPIA */}
        {dpia_required === "no" && (
          <div style={{ ...cardSt, padding: 14 }}>
            <Lbl>Giustificazione per la non effettuazione della DPIA</Lbl>
            <textarea
              value={justification_if_no_dpia}
              onChange={e => upDoc(d => ({ ...d, screening: { ...d.screening, justification_if_no_dpia: e.target.value } }))}
              rows={3}
              placeholder="Motivare perché nonostante il trattamento non è richiesta la DPIA…"
              style={taSt}
            />
          </div>
        )}
      </div>
    );
  }

  // ─── Step 1: Description ───────────────────────────────────────────────────

  function renderStep1() {
    const d = doc.description;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Identity */}
        <div style={{ ...cardSt, padding: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 12 }}>Identificazione</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div><Lbl required>Nome sistema</Lbl>
              <input value={d.system_name} onChange={e => upDesc({ system_name: e.target.value })} style={inputSt} placeholder="es. HR AI Scoring" /></div>
            <div><Lbl required>Organizzazione</Lbl>
              <input value={d.organization_name} onChange={e => upDesc({ organization_name: e.target.value })} style={inputSt} placeholder="Ragione sociale" /></div>
            <div><Lbl required>Titolare del trattamento</Lbl>
              <input value={d.controller_name} onChange={e => upDesc({ controller_name: e.target.value })} style={inputSt} placeholder="Nome / P.IVA" /></div>
          </div>
        </div>

        {/* DPO */}
        <div style={{ ...cardSt, padding: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 12 }}>Responsabile della protezione dati (DPO)</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
            <div><Lbl>Nome DPO</Lbl>
              <input value={d.dpo_name} onChange={e => upDesc({ dpo_name: e.target.value })} style={inputSt} placeholder="Nome e cognome o struttura" /></div>
            <div><Lbl>DPO consultato?</Lbl>
              <Sel value={d.dpo_consulted as "yes"|"no"|""} onChange={v => upDesc({ dpo_consulted: v })}
                options={[{ value: "yes", label: "Sì" }, { value: "no", label: "No" }]} /></div>
          </div>
          {d.dpo_consulted === "no" && (
            <div style={{ marginTop: 8, padding: "10px 14px", borderRadius: 8,
              background: "rgba(202,138,4,0.07)", border: "1px solid rgba(202,138,4,0.22)" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#92400e", marginBottom: 3 }}>
                ⚠ DPO non consultato — verifica obbligatoria
              </div>
              <div style={{ fontSize: 11, color: "#78350f", lineHeight: 1.5 }}>
                L&apos;Art. 35(2) GDPR e il WP248 richiedono che il DPO, se nominato,
                sia obbligatoriamente consultato nella redazione della DPIA.
                La mancata consultazione è una non conformità formale.
              </div>
            </div>
          )}
          {d.dpo_consulted === "yes" && (
            <div><Lbl>Parere del DPO</Lbl>
              <textarea value={d.dpo_opinion} onChange={e => upDesc({ dpo_opinion: e.target.value })}
                rows={2} placeholder="Sintesi del parere DPO…" style={taSt} /></div>
          )}
        </div>

        {/* Processor */}
        <div style={{ ...cardSt, padding: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 12 }}>Responsabile del trattamento (Art. 28)</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><Lbl>Coinvolto un responsabile esterno?</Lbl>
              <Sel value={d.processor_involved as "yes"|"no"|""} onChange={v => upDesc({ processor_involved: v })}
                options={[{ value: "yes", label: "Sì" }, { value: "no", label: "No" }]} /></div>
            {d.processor_involved === "yes" && (
              <div><Lbl>Nome responsabile (Art. 28)</Lbl>
                <input value={d.processor_name} onChange={e => upDesc({ processor_name: e.target.value })} style={inputSt} placeholder="Denominazione responsabile" /></div>
            )}
          </div>
        </div>

        {/* Data processing */}
        <div style={{ ...cardSt, padding: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 12 }}>Descrizione del trattamento</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div><Lbl required>Finalità del trattamento</Lbl>
              <textarea value={d.processing_purposes} onChange={e => upDesc({ processing_purposes: e.target.value })}
                rows={2} placeholder="Descrivere in modo preciso le finalità…" style={taSt} /></div>
            <div><Lbl>Interesse legittimo (se base giuridica Art. 6(1)(f))</Lbl>
              <textarea value={d.legitimate_interest ?? ""} onChange={e => upDesc({ legitimate_interest: e.target.value })}
                rows={2} placeholder="Descrizione dell'interesse legittimo e bilanciamento…" style={taSt} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><Lbl required>Categorie di dati personali</Lbl>
                <textarea value={d.personal_data_categories} onChange={e => upDesc({ personal_data_categories: e.target.value })}
                  rows={2} placeholder="es. dati anagrafici, comportamentali…" style={taSt} /></div>
              <div><Lbl>Categorie particolari (Art. 9)</Lbl>
                <textarea value={d.special_categories} onChange={e => upDesc({ special_categories: e.target.value })}
                  rows={2} placeholder="es. dati sanitari, biometrici, origine etnica…" style={taSt} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div><Lbl required>Categorie di interessati</Lbl>
                <textarea value={d.data_subjects_categories} onChange={e => upDesc({ data_subjects_categories: e.target.value })}
                  rows={2} placeholder="es. dipendenti, clienti, minori…" style={taSt} /></div>
              <div><Lbl>Destinatari / Riceventi</Lbl>
                <textarea value={d.recipients} onChange={e => upDesc({ recipients: e.target.value })}
                  rows={2} placeholder="es. partner, autorità pubbliche…" style={taSt} /></div>
              <div><Lbl>Periodo di conservazione</Lbl>
                <input value={d.retention_period} onChange={e => upDesc({ retention_period: e.target.value })}
                  style={inputSt} placeholder="es. 5 anni dalla cessazione" /></div>
            </div>
          </div>
        </div>

        {/* Assets */}
        <div style={{ ...cardSt, padding: 16 }}>
          <div className="flex items-center justify-between mb-3">
            <p style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Asset che trattano i dati</p>
            <button onClick={addAsset} style={{ ...navBtnSt(false), display: "flex", alignItems: "center", gap: 4 }}>
              <Plus className="h-3 w-3" /> Aggiungi
            </button>
          </div>
          {d.assets.length === 0 && (
            <p style={{ fontSize: 12, color: T.faint, textAlign: "center", padding: "12px 0" }}>
              Nessun asset. Aggiungere database, applicazioni, infrastrutture.
            </p>
          )}
          {d.assets.map(a => (
            <div key={a.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 2fr auto", gap: 8, marginBottom: 8, alignItems: "end" }}>
              <div><Lbl>Nome asset</Lbl>
                <input value={a.name} onChange={e => upAsset(a.id, { name: e.target.value })} style={inputSt} placeholder="es. Database HR" /></div>
              <div><Lbl>Tipo</Lbl>
                <Sel value={a.type} onChange={v => upAsset(a.id, { type: v as DPIAAsset["type"] })}
                  options={[
                    { value: "hardware",  label: "Hardware / server" },
                    { value: "software",  label: "Software / applicazione" },
                    { value: "network",   label: "Rete / infrastruttura" },
                    { value: "database",  label: "Database / storage" },
                    { value: "document",  label: "Documento cartaceo" },
                    { value: "person",    label: "Persona (accesso fisico)" },
                    { value: "other",     label: "Altro" },
                  ]} /></div>
              <div><Lbl>Descrizione</Lbl>
                <input value={a.description} onChange={e => upAsset(a.id, { description: e.target.value })} style={inputSt} placeholder="Ruolo nel trattamento…" /></div>
              <button onClick={() => delAsset(a.id)} style={{ padding: "7px 9px", borderRadius: 8, border: `1px solid ${T.redBdr}`, background: T.redBg, color: T.red, cursor: "pointer" }}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Codes & opinions */}
        <div style={{ ...cardSt, padding: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 12 }}>Codici di condotta, certificazioni e opinioni degli interessati</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
            <div><Lbl>Codici di condotta applicabili (Art. 40)</Lbl>
              <input value={d.codes_of_conduct} onChange={e => upDesc({ codes_of_conduct: e.target.value })} style={inputSt} placeholder="es. Codice EDPB settore sanitario" /></div>
            <div><Lbl>Certificazioni (Art. 42)</Lbl>
              <input value={d.certifications} onChange={e => upDesc({ certifications: e.target.value })} style={inputSt} placeholder="es. ISO 27001, ISDP 10003" /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><Lbl>Opinioni degli interessati raccolte?</Lbl>
              <Sel value={d.data_subjects_opinions as "collected"|"not_applicable"|"not_collected"|""} onChange={v => upDesc({ data_subjects_opinions: v as typeof d.data_subjects_opinions })}
                options={[
                  { value: "collected", label: "Sì, raccolte" },
                  { value: "not_collected", label: "Non raccolte" },
                  { value: "not_applicable", label: "Non applicabile" },
                ]} /></div>
            <div><Lbl>Giustificazione (se non raccolte)</Lbl>
              <input value={d.data_subjects_opinions_justification} onChange={e => upDesc({ data_subjects_opinions_justification: e.target.value })} style={inputSt} placeholder="Motivazione…" /></div>
          </div>
          {d.data_subjects_opinions === "collected" && (
            <div style={{ marginTop: 10 }}><Lbl>Dettaglio delle opinioni raccolte</Lbl>
              <textarea value={d.data_subjects_opinions_details} onChange={e => upDesc({ data_subjects_opinions_details: e.target.value })}
                rows={2} placeholder="Sintetizzare le principali opinioni/osservazioni ricevute…" style={taSt} /></div>
          )}
        </div>
      </div>
    );
  }

  // ─── Step 2: Proportionality ───────────────────────────────────────────────

  function renderStep2() {
    const p = doc.proportionality;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Necessity */}
        <div style={{ ...cardSt, padding: 16 }}>
          <Lbl required>Giustificazione della necessità del trattamento</Lbl>
          <textarea value={p.necessity_justification} onChange={e => upProp({ necessity_justification: e.target.value })}
            rows={4} placeholder="Dimostrare che il trattamento è necessario e proporzionato rispetto alle finalità. Non esiste alternativa meno invasiva?" style={taSt} />
        </div>

        {/* Proportionality checks table */}
        <div style={{ ...cardSt, padding: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 12 }}>Verifica principi GDPR (Art. 5)</p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  {["Principio", "Stato", "Note"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600, color: T.muted, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {p.proportionality_checks.map(c => (
                  <tr key={c.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: "8px 8px", verticalAlign: "top" }}>
                      <p style={{ fontWeight: 500, color: T.text, marginBottom: 2 }}>{c.principle}</p>
                      <p style={{ fontSize: 11, color: T.muted }}>{c.description}</p>
                    </td>
                    <td style={{ padding: "8px 8px", verticalAlign: "top", width: 160 }}>
                      <Sel value={c.status as "compliant"|"partial"|"non_compliant"|"na"|""} onChange={v => upPropCheck(c.id, { status: v as typeof c.status })}
                        options={[
                          { value: "compliant", label: "Conforme" },
                          { value: "partial", label: "Parziale" },
                          { value: "non_compliant", label: "Non conforme" },
                          { value: "na", label: "N/A" },
                        ]} />
                    </td>
                    <td style={{ padding: "8px 8px", verticalAlign: "top" }}>
                      <input value={c.notes} onChange={e => upPropCheck(c.id, { notes: e.target.value })}
                        placeholder="Osservazioni…" style={inputSt} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rights checks */}
        <div style={{ ...cardSt, padding: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 12 }}>Verifica diritti degli interessati</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {p.rights_checks.map(r => (
              <div key={r.id} style={{ display: "grid", gridTemplateColumns: "2fr 120px 2fr", gap: 8, alignItems: "end", padding: "8px 0", borderBottom: `1px solid ${T.border}` }}>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 500, color: T.text }}>{r.right}</p>
                  <p style={{ fontSize: 11, color: T.muted }}>{r.article}</p>
                </div>
                <Sel value={r.applicable as "yes"|"no"|"partial"|""} onChange={v => upRightsCheck(r.id, { applicable: v as typeof r.applicable })}
                  options={[
                    { value: "yes", label: "Applicabile" },
                    { value: "partial", label: "Parziale" },
                    { value: "no", label: "N/A" },
                  ]} />
                <input value={r.how_ensured} onChange={e => upRightsCheck(r.id, { how_ensured: e.target.value })}
                  placeholder="Come viene garantito…" style={inputSt} />
              </div>
            ))}
          </div>
        </div>

        {/* Transfers */}
        <div style={{ ...cardSt, padding: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 12 }}>Trasferimenti internazionali e clausole Art. 28</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><Lbl>Clausole contrattuali Art. 28 con responsabile?</Lbl>
              <Sel value={p.processor_clauses_art28 as "yes"|"no"|"na"|""} onChange={v => upProp({ processor_clauses_art28: v as typeof p.processor_clauses_art28 })}
                options={[{ value: "yes", label: "Sì" }, { value: "no", label: "No" }, { value: "na", label: "N/A" }]} /></div>
            <div><Lbl>Trasferimenti fuori SEE (Artt. 44-49)?</Lbl>
              <Sel value={p.international_transfers as "yes"|"no"|""} onChange={v => upProp({ international_transfers: v as typeof p.international_transfers })}
                options={[{ value: "yes", label: "Sì" }, { value: "no", label: "No" }]} /></div>
          </div>
          {p.international_transfers === "yes" && (
            <div style={{ marginTop: 10 }}><Lbl>Garanzie per i trasferimenti (SCC, BCR, adequacy decision…)</Lbl>
              <textarea value={p.international_transfers_safeguards} onChange={e => upProp({ international_transfers_safeguards: e.target.value })}
                rows={2} placeholder="Descrivere le garanzie appropriate adottate…" style={taSt} /></div>
          )}
        </div>
      </div>
    );
  }

  // ─── Step 3: Risks ─────────────────────────────────────────────────────────

  function renderStep3() {
    const { threats, overall_risk_before } = doc.risks;

    const categories: { id: DPIAThreat["category"]; label: string; description: string }[] = [
      { id: "illegitimate_access", label: "Accesso illegittimo ai dati",
        description: "Divulgazione non autorizzata, accesso non autorizzato, violazione della riservatezza." },
      { id: "unwanted_modification", label: "Modifica indesiderata dei dati",
        description: "Alterazione, corruzione, manipolazione dei dati personali — violazione dell'integrità." },
      { id: "data_disappearance", label: "Scomparsa dei dati",
        description: "Perdita, distruzione, cancellazione accidentale o impossibilità di accesso — violazione della disponibilità." },
    ];

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Overall risk */}
        {overall_risk_before && (
          <div style={{ ...cardSt, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: T.muted }}>Rischio complessivo PRIMA delle misure:</span>
            {riskBadge(overall_risk_before)}
          </div>
        )}

        {/* Info */}
        <div style={{ ...cardSt, padding: 14, background: T.blueBg, border: `1px solid ${T.blueBdr}` }}>
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: T.blue }} />
            <p style={{ fontSize: 11, color: T.text, lineHeight: 1.6 }}>
              <strong>WP248 §3:</strong> Identificare e valutare le fonti di rischio, gli impatti potenziali e le misure
              esistenti per le tre categorie standard WP248: accesso illegittimo, modifica indesiderata, scomparsa dei dati.
              Il livello di rischio è calcolato automaticamente: probabilità × gravità.
            </p>
          </div>
        </div>

        {/* Threats by category */}
        {categories.map(cat => {
          const catThreats = threats.filter(t => t.category === cat.id);
          return (
            <div key={cat.id} style={{ ...cardSt, padding: 16 }}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{cat.label}</p>
                  <p style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{cat.description}</p>
                </div>
                <button onClick={() => addThreat(cat.id)} style={{ ...navBtnSt(false), display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <Plus className="h-3 w-3" /> Aggiungi minaccia
                </button>
              </div>
              {catThreats.length === 0 && (
                <p style={{ fontSize: 12, color: T.faint, textAlign: "center", padding: "10px 0" }}>
                  Nessuna minaccia. Aggiungere almeno una minaccia per questa categoria.
                </p>
              )}
              {catThreats.map(t => (
                <div key={t.id} style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, marginTop: 10 }}>
                  {/* Fonte + descrizione */}
                  <div className="flex items-start gap-2 mb-3">
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                      <div>
                        <Lbl>Fonte di rischio / agente di minaccia</Lbl>
                        <input value={t.source} onChange={e => upThreat(t.id, { source: e.target.value })}
                          placeholder="es. hacker esterno, dipendente, errore di sistema, fornitore…"
                          style={inputSt} />
                      </div>
                      <div>
                        <Lbl required>Descrizione della minaccia e scenario</Lbl>
                        <textarea value={t.description} onChange={e => upThreat(t.id, { description: e.target.value })}
                          rows={2} placeholder="Descrivere la minaccia, il suo scenario, i soggetti coinvolti…" style={taSt} />
                      </div>
                    </div>
                    <button onClick={() => delThreat(t.id)} style={{ padding: "6px 8px", borderRadius: 8, border: `1px solid ${T.redBdr}`, background: T.redBg, color: T.red, cursor: "pointer", marginTop: 16, flexShrink: 0 }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Valutazione iniziale */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                    <div>
                      <Lbl>Probabilità (iniziale)</Lbl>
                      <Sel value={t.likelihood} onChange={v => upThreat(t.id, { likelihood: v as DPIAThreat["likelihood"] })}
                        options={[{ value: "low", label: "Bassa" }, { value: "medium", label: "Media" }, { value: "high", label: "Alta" }]} />
                    </div>
                    <div>
                      <Lbl>Gravità (iniziale)</Lbl>
                      <Sel value={t.severity} onChange={v => upThreat(t.id, { severity: v as DPIAThreat["severity"] })}
                        options={[{ value: "low", label: "Bassa" }, { value: "medium", label: "Media" }, { value: "high", label: "Alta" }]} />
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, paddingBottom: 2 }}>
                      <span style={{ fontSize: 11, color: T.muted }}>Rischio:</span>
                      {riskBadge(t.risk_level)}
                    </div>
                  </div>

                  {/* Misura */}
                  <div style={{ marginBottom: 10 }}>
                    <Lbl>Misura di sicurezza pianificata</Lbl>
                    <textarea value={t.mitigation} onChange={e => upThreat(t.id, { mitigation: e.target.value })}
                      rows={2} placeholder="Descrivere la misura tecnica o organizzativa per mitigare la minaccia…" style={taSt} />
                  </div>

                  {/* Valutazione rischio residuo */}
                  <div style={{
                    background: "rgba(0,0,0,0.025)",
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    padding: "10px 12px",
                  }}>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: T.muted, marginBottom: 8 }}>
                      Dopo le misure — rischio residuo
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                      <div>
                        <Lbl>Probabilità residua</Lbl>
                        <Sel value={t.residual_likelihood} onChange={v => upThreat(t.id, { residual_likelihood: v as DPIAThreat["residual_likelihood"] })}
                          options={[{ value: "low", label: "Bassa" }, { value: "medium", label: "Media" }, { value: "high", label: "Alta" }]} />
                      </div>
                      <div>
                        <Lbl>Gravità residua</Lbl>
                        <Sel value={t.residual_severity} onChange={v => upThreat(t.id, { residual_severity: v as DPIAThreat["residual_severity"] })}
                          options={[{ value: "low", label: "Bassa" }, { value: "medium", label: "Media" }, { value: "high", label: "Alta" }]} />
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, paddingBottom: 2 }}>
                        <span style={{ fontSize: 11, color: T.muted }}>Rischio residuo:</span>
                        {riskBadge(t.residual_risk)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  }

  // ─── Step 4: Measures ──────────────────────────────────────────────────────

  function renderStep4() {
    const m = doc.measures;
    const threats = doc.risks.threats;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Prior consultation alert */}
        {priorConsultation && (
          <div style={{ ...cardSt, padding: 14, background: T.redBg, border: `1px solid ${T.redBdr}` }}>
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: T.red }} />
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: T.red, marginBottom: 4 }}>
                  ⚠️ Consultazione preventiva (Art. 36 GDPR) richiesta
                </p>
                <p style={{ fontSize: 11, color: T.text, lineHeight: 1.5 }}>
                  Il rischio residuo è <strong>ALTO</strong>. Il titolare deve consultare l'Autorità di controllo
                  prima di procedere con il trattamento (Art. 36(1) GDPR). Compilare i campi di
                  consultazione qui sotto.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Technical/org measures */}
        <div style={{ ...cardSt, padding: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 12 }}>Misure di sicurezza adottate</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <Lbl required>Misure tecniche</Lbl>
              <textarea value={m.technical_measures} onChange={e => upMeasures({ technical_measures: e.target.value })}
                rows={4} placeholder="es. cifratura end-to-end, pseudonimizzazione, controllo accessi RBAC, monitoraggio delle anomalie, backup crittografato…" style={taSt} />
            </div>
            <div>
              <Lbl required>Misure organizzative</Lbl>
              <textarea value={m.organizational_measures} onChange={e => upMeasures({ organizational_measures: e.target.value })}
                rows={4} placeholder="es. formazione del personale, policy di accesso, accordi di riservatezza, audit interni, procedure di incident response…" style={taSt} />
            </div>
          </div>
        </div>

        {/* Residual threats table */}
        {threats.length > 0 && (
          <div style={{ ...cardSt, padding: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 12 }}>Rischio residuo per minaccia</p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                    {["Minaccia", "P. residua", "G. residua", "Rischio residuo"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600, color: T.muted, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {threats.map(t => (
                    <tr key={t.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td style={{ padding: "8px 8px", maxWidth: 280 }}>
                        <p style={{ color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {t.description || <span style={{ color: T.faint }}>— minaccia senza descrizione —</span>}
                        </p>
                      </td>
                      <td style={{ padding: "8px 8px", width: 130 }}>
                        <Sel value={t.residual_likelihood} onChange={v => upThreat(t.id, { residual_likelihood: v as DPIAThreat["residual_likelihood"] })}
                          options={[{ value: "low", label: "Bassa" }, { value: "medium", label: "Media" }, { value: "high", label: "Alta" }]} />
                      </td>
                      <td style={{ padding: "8px 8px", width: 130 }}>
                        <Sel value={t.residual_severity} onChange={v => upThreat(t.id, { residual_severity: v as DPIAThreat["residual_severity"] })}
                          options={[{ value: "low", label: "Bassa" }, { value: "medium", label: "Media" }, { value: "high", label: "Alta" }]} />
                      </td>
                      <td style={{ padding: "8px 8px" }}>{riskBadge(t.residual_risk)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: T.muted }}>Rischio residuo complessivo:</span>
              {worstResidual ? riskBadge(worstResidual) : <span style={{ fontSize: 12, color: T.faint }}>—</span>}
            </div>
          </div>
        )}

        {/* Prior consultation */}
        {priorConsultation && (
          <div style={{ ...cardSt, padding: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 12 }}>
              Consultazione preventiva — Art. 36 GDPR
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><Lbl required>Autorità di controllo competente</Lbl>
                <input value={m.prior_consultation_authority} onChange={e => upMeasures({ prior_consultation_authority: e.target.value })}
                  style={inputSt} placeholder="es. Garante Privacy (IT), CNIL (FR), ICO (UK)…" /></div>
              <div><Lbl>Data prevista di consultazione</Lbl>
                <input type="date" value={m.prior_consultation_date} onChange={e => upMeasures({ prior_consultation_date: e.target.value })}
                  style={inputSt} /></div>
            </div>
          </div>
        )}

        {/* Review schedule */}
        <div style={{ ...cardSt, padding: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 12 }}>Pianificazione delle revisioni</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><Lbl>Frequenza di revisione</Lbl>
              <Sel value={m.review_schedule as "annual"|"biannual"|"quarterly"|"event_driven"|""} onChange={v => upMeasures({ review_schedule: v })}
                options={[
                  { value: "annual", label: "Annuale" },
                  { value: "biannual", label: "Semestrale" },
                  { value: "quarterly", label: "Trimestrale" },
                  { value: "event_driven", label: "A seguito di eventi significativi" },
                ]} /></div>
            <div><Lbl>Trigger per revisione straordinaria</Lbl>
              <input value={m.review_trigger} onChange={e => upMeasures({ review_trigger: e.target.value })}
                style={inputSt} placeholder="es. violazione dati, cambio finalità, nuova tecnologia…" /></div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Step 5: Conclusion ────────────────────────────────────────────────────

  function renderStep5() {
    const c = doc.conclusion;
    const compliantOptions: { value: "yes"|"no"|"conditional"; label: string; color: string; bg: string; border: string }[] = [
      { value: "yes", label: "Conforme — si può procedere", color: T.green, bg: T.greenBg, border: T.greenBdr },
      { value: "conditional", label: "Condizionalmente conforme", color: T.amber, bg: T.amberBg, border: T.amberBdr },
      { value: "no", label: "Non conforme — non procedere", color: T.red, bg: T.redBg, border: T.redBdr },
    ];

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Compliant */}
        <div style={{ ...cardSt, padding: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 12 }}>Conclusione DPIA</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {compliantOptions.map(o => (
              <button key={o.value} onClick={() => upConclusion({ compliant: o.value })}
                style={{
                  padding: "12px 16px", borderRadius: 10, cursor: "pointer",
                  border: `1px solid ${c.compliant === o.value ? o.border : T.border}`,
                  background: c.compliant === o.value ? o.bg : T.card,
                  display: "flex", alignItems: "center", gap: 8, textAlign: "left",
                  transition: "all 0.15s",
                }}>
                <div style={{
                  width: 16, height: 16, borderRadius: 8, border: `2px solid ${c.compliant === o.value ? o.color : T.border}`,
                  background: c.compliant === o.value ? o.color : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  {c.compliant === o.value && <Check className="h-2.5 w-2.5" style={{ color: "#fff" }} />}
                </div>
                <span style={{ fontSize: 12, fontWeight: 500, color: c.compliant === o.value ? o.color : T.text }}>
                  {o.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Conditions */}
        {c.compliant === "conditional" && (
          <div style={{ ...cardSt, padding: 16 }}>
            <Lbl required>Condizioni da soddisfare prima di procedere</Lbl>
            <textarea value={c.conditions} onChange={e => upConclusion({ conditions: e.target.value })}
              rows={3} placeholder="Descrivere le condizioni o le misure correttive necessarie prima di avviare il trattamento…" style={taSt} />
          </div>
        )}

        {/* Summary */}
        <div style={{ ...cardSt, padding: 16 }}>
          <Lbl>Sintesi esecutiva</Lbl>
          <textarea value={c.summary} onChange={e => upConclusion({ summary: e.target.value })}
            rows={5} placeholder="Sintetizzare i risultati principali della DPIA: trattamento analizzato, rischi identificati, misure adottate, conclusione…" style={taSt} />
        </div>

        {/* Review date */}
        <div style={{ ...cardSt, padding: 16 }}>
          <Lbl>Data della prossima revisione</Lbl>
          <input type="date" value={c.next_review_date} onChange={e => upConclusion({ next_review_date: e.target.value })}
            style={{ ...inputSt, width: 200 }} />
        </div>

        {/* Actions */}
        <div style={{ ...cardSt, padding: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 12 }}>Azioni</p>
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={saveToDossier}
              style={{ ...navBtnSt(true), display: "flex", alignItems: "center", gap: 6 }}>
              <FileText className="h-3.5 w-3.5" />
              Salva nel dossier
            </button>
            <button onClick={downloadReport}
              style={{ ...navBtnSt(false), display: "flex", alignItems: "center", gap: 6 }}>
              <Download className="h-3.5 w-3.5" />
              Scarica report (.txt)
            </button>
          </div>
        </div>

        {/* Sign-off */}
        <SignOffPanel toolKey="dpia" toolLabel="DPIA Art. 35 GDPR" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const steps = [renderStep0, renderStep1, renderStep2, renderStep3, renderStep4, renderStep5];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, padding: "24px 32px" }}>
      <SystemContextBanner checkProhibited={true} />
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 4 }}>
            Valutazione d&apos;Impatto sulla Protezione dei Dati
          </h1>
          <p style={{ fontSize: 12, color: T.muted }}>
            Art. 35 GDPR · Metodologia WP248 rev.01 (Gruppo di Lavoro Art. 29, ottobre 2017)
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span style={{ fontSize: 11, color: T.green, display: "flex", alignItems: "center", gap: 4 }}>
              <Check className="h-3.5 w-3.5" /> Salvato
            </span>
          )}
          <span style={{
            fontSize: 11, padding: "3px 8px", borderRadius: 5,
            background: priorConsultation ? T.redBg : doc.screening.dpia_required === "yes" ? T.amberBg : T.greenBg,
            color: priorConsultation ? T.red : doc.screening.dpia_required === "yes" ? T.amber : T.green,
            border: `1px solid ${priorConsultation ? T.redBdr : doc.screening.dpia_required === "yes" ? T.amberBdr : T.greenBdr}`,
            fontWeight: 600,
          }}>
            {priorConsultation ? "Consultazione preventiva" : doc.screening.dpia_required === "yes" ? "DPIA richiesta" : doc.screening.dpia_required === "uncertain" ? "Incerto" : "Screening in corso"}
          </span>
        </div>
      </div>

      {/* Step nav */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, overflowX: "auto" }}>
        {STEPS.map((s, i) => {
          const isActive = step === i;
          const isDone = step > i;
          return (
            <button key={i} onClick={() => setStep(i as Step)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 8, cursor: "pointer",
                border: `1px solid ${isActive ? T.text : T.border}`,
                background: isActive ? T.text : isDone ? T.greenBg : T.card,
                color: isActive ? "#fff" : isDone ? T.green : T.muted,
                fontSize: 12, fontWeight: isActive ? 600 : 400,
                whiteSpace: "nowrap", transition: "all 0.15s",
              }}>
              <s.Icon className="h-3.5 w-3.5" />
              <span>{s.label}</span>
              {isDone && <Check className="h-3 w-3" />}
            </button>
          );
        })}
      </div>

      {/* Step content */}
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        {/* Step header */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Step {step} / 5
          </p>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: T.text }}>
            {STEPS[step].label}
            <span style={{ fontSize: 12, fontWeight: 400, color: T.muted, marginLeft: 8 }}>
              {STEPS[step].sub}
            </span>
          </h2>
        </div>

        {steps[step]()}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setStep(s => Math.max(0, s - 1) as Step)}
            disabled={step === 0}
            style={{ ...navBtnSt(false), display: "flex", alignItems: "center", gap: 4, opacity: step === 0 ? 0.35 : 1 }}>
            <ChevronLeft className="h-4 w-4" /> Precedente
          </button>
          <span style={{ fontSize: 11, color: T.faint }}>{step + 1} / {STEPS.length}</span>
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1) as Step)}
              style={{ ...navBtnSt(true), display: "flex", alignItems: "center", gap: 4 }}>
              Avanti <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={saveToDossier}
              style={{ ...navBtnSt(true), display: "flex", alignItems: "center", gap: 4 }}>
              <CheckCircle2 className="h-4 w-4" /> Completa DPIA
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
