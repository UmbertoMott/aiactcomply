// Onboarding Risk Calculator — AI Act Risk Classification
// Based on Annex III + Art. 6 criteria

export type Sector =
  | "hr"
  | "credit"
  | "education"
  | "critical_infra"
  | "law_enforcement"
  | "migration"
  | "justice"
  | "health"
  | "other";

export type SystemType =
  | "classification"
  | "generation"
  | "recommendation"
  | "biometric"
  | "monitoring"
  | "decision_support"
  | "other";

export type DevPhase =
  | "concept"
  | "development"
  | "testing"
  | "production"
  | "deployed";

export type DecisionContext =
  | "binding"       // Autonomous binding decision
  | "assisted"      // Human decision with AI support
  | "informative"   // Informative only, human decides independently
  | "internal";     // Internal tools / no external impact

export type CompanySize =
  | "micro"   // < 10 employees
  | "small"   // 10–49
  | "medium"  // 50–249
  | "large";  // 250+

export type RiskLevel = "unacceptable" | "high" | "limited" | "minimal";

export interface OnboardingData {
  sector: Sector;
  systemType: SystemType;
  devPhase: DevPhase;
  decisionContext: DecisionContext;
  companySize: CompanySize;
}

export interface RiskResult {
  level: RiskLevel;
  score: number;           // 0–100 composite score
  annexIII: boolean;       // Falls under Annex III high-risk list
  articleRef: string;      // Main article reference
  riskLabel: string;       // Human-readable label in Italian
  riskColor: string;       // Hex colour for badge
  riskBg: string;          // Light bg colour
  summary: string;         // One-paragraph Italian explanation
  obligations: string[];   // Key compliance obligations
  toolPath: ToolPathItem[]; // Recommended tool sequence
  urgency: "immediate" | "within_6_months" | "within_1_year" | "monitor";
  deadline: string;        // ISO date string for compliance deadline
}

export interface ToolPathItem {
  tool: string;
  href: string;
  art: string;
  priority: "required" | "recommended" | "optional";
  reason: string;
}

// ─── Sector weights ───────────────────────────────────────────────────────────
const SECTOR_SCORE: Record<Sector, number> = {
  law_enforcement: 40,
  migration:       38,
  justice:         36,
  critical_infra:  34,
  hr:              30,
  credit:          28,
  health:          28,
  education:       22,
  other:           10,
};

const SECTOR_ANNEX_III: Record<Sector, boolean> = {
  law_enforcement: true,
  migration:       true,
  justice:         true,
  critical_infra:  true,
  hr:              true,
  credit:          true,
  health:          false,
  education:       true,
  other:           false,
};

// ─── System type weights ──────────────────────────────────────────────────────
const SYSTEM_SCORE: Record<SystemType, number> = {
  biometric:         30,
  monitoring:        20,
  decision_support:  16,
  classification:    14,
  recommendation:    10,
  generation:         8,
  other:              5,
};

// ─── Decision context weights ─────────────────────────────────────────────────
const DECISION_SCORE: Record<DecisionContext, number> = {
  binding:     25,
  assisted:    12,
  informative:  5,
  internal:     2,
};

// ─── Dev phase multipliers ────────────────────────────────────────────────────
const PHASE_MULT: Record<DevPhase, number> = {
  deployed:    1.0,
  production:  0.95,
  testing:     0.75,
  development: 0.55,
  concept:     0.35,
};

// ─── Unacceptable practice patterns (Art. 5) ─────────────────────────────────
function isUnacceptable(data: OnboardingData): boolean {
  // Biometric categorisation in public spaces by law enforcement
  if (data.systemType === "biometric" && data.sector === "law_enforcement") return true;
  // Social scoring by public authorities
  if (data.systemType === "monitoring" && data.sector === "justice" && data.decisionContext === "binding") return true;
  return false;
}

// ─── Main calculator ──────────────────────────────────────────────────────────
export function calculateRisk(data: OnboardingData): RiskResult {
  if (isUnacceptable(data)) {
    return buildResult("unacceptable", 100, data);
  }

  const raw =
    SECTOR_SCORE[data.sector] +
    SYSTEM_SCORE[data.systemType] +
    DECISION_SCORE[data.decisionContext];

  const score = Math.min(99, Math.round(raw * PHASE_MULT[data.devPhase]));
  const annexIII = SECTOR_ANNEX_III[data.sector] && data.decisionContext !== "internal";

  let level: RiskLevel;
  if (score >= 70 || annexIII) level = "high";
  else if (score >= 40)        level = "limited";
  else                         level = "minimal";

  return buildResult(level, score, data);
}

function buildResult(level: RiskLevel, score: number, data: OnboardingData): RiskResult {
  const annexIII = SECTOR_ANNEX_III[data.sector] && data.decisionContext !== "internal";

  const meta: Record<RiskLevel, { label: string; color: string; bg: string; art: string }> = {
    unacceptable: { label: "Pratica Vietata", color: "#b91c1c", bg: "#fef2f2", art: "Art. 5" },
    high:         { label: "Alto Rischio",    color: "#d97706", bg: "#fffbeb", art: "Art. 6 + Allegato III" },
    limited:      { label: "Rischio Limitato", color: "#0369a1", bg: "#eff6ff", art: "Art. 52" },
    minimal:      { label: "Rischio Minimo",  color: "#15803d", bg: "#f0fdf4", art: "Art. 69" },
  };

  const m = meta[level];

  const summaries: Record<RiskLevel, string> = {
    unacceptable:
      "Il sistema descritto ricade nelle pratiche vietate dall'Art. 5 del Regolamento AI. Non può essere sviluppato, messo in servizio o utilizzato nell'UE. Consultare immediatamente un legale specializzato in diritto dell'IA.",
    high:
      "Il sistema rientra nella categoria ad alto rischio (Allegato III). Prima della messa in servizio è obbligatorio completare una valutazione della conformità, registrarsi nella banca dati EU, nominare un responsabile AI e implementare un sistema di gestione della qualità conforme all'Art. 9.",
    limited:
      "Il sistema presenta obblighi di trasparenza limitati (Art. 52). Gli utenti devono sapere di interagire con un sistema AI. Non sono richieste valutazioni di conformità formali, ma è buona prassi documentare il sistema.",
    minimal:
      "Il sistema rientra nella categoria a rischio minimo. Non sono previsti obblighi specifici dal Regolamento AI. Si consiglia comunque di adottare le linee guida volontarie (Art. 69) e di monitorare futuri aggiornamenti normativi.",
  };

  const obligationsMap: Record<RiskLevel, string[]> = {
    unacceptable: [
      "Interrompere immediatamente lo sviluppo e il deployment",
      "Consultare un legale — potenziali sanzioni fino al 7% del fatturato globale",
      "Non è possibile ottenere conformità: la pratica è vietata",
    ],
    high: [
      "Valutazione della conformità obbligatoria prima del deployment (Art. 43)",
      "Sistema di gestione della qualità (Art. 9)",
      "Documentazione tecnica — Fascicolo Tecnico (Art. 11 + Allegato IV)",
      "Log automatici di tutte le operazioni (Art. 12)",
      "Trasparenza verso gli utenti (Art. 13)",
      "Supervisione umana attiva (Art. 14)",
      "Accuratezza, robustezza e cybersecurity (Art. 15)",
      "Registrazione nella banca dati EU (Art. 51)",
      "Bias audit sul training set (Art. 10)",
    ],
    limited: [
      "Informativa all'utente: il sistema è un AI (Art. 52)",
      "Se genera contenuti sintetici: etichettatura obbligatoria (Art. 50)",
      "Documentazione consigliata ma non obbligatoria",
    ],
    minimal: [
      "Nessun obbligo specifico previsto dal Regolamento AI",
      "Adozione volontaria del Codice di Buona Pratica (Art. 69)",
      "Monitoraggio degli aggiornamenti al Regolamento",
    ],
  };

  // Build recommended tool path based on risk level
  const toolPaths: Record<RiskLevel, ToolPathItem[]> = {
    unacceptable: [
      { tool: "AI Classifier", href: "/dashboard/tools/classifier", art: "Art. 6", priority: "required", reason: "Verifica ufficiale della classificazione" },
    ],
    high: [
      { tool: "AI Classifier",  href: "/dashboard/tools/classifier",  art: "Art. 6",  priority: "required",    reason: "Classificazione formale del sistema" },
      { tool: "Data Audit",     href: "/dashboard/tools/data-audit",   art: "Art. 10", priority: "required",    reason: "Bias audit sul training set obbligatorio" },
      { tool: "DocuGen AI",     href: "/dashboard/tools/docugen",      art: "Art. 11", priority: "required",    reason: "Fascicolo Tecnico (Allegato IV)" },
      { tool: "LogVault",       href: "/dashboard/tools/logvault",     art: "Art. 12", priority: "required",    reason: "Log append-only obbligatori" },
      { tool: "Transparency",   href: "/dashboard/tools/transparency", art: "Art. 13", priority: "required",    reason: "Informativa e istruzioni per l'utente" },
      { tool: "Oversight",      href: "/dashboard/tools/oversight",    art: "Art. 14", priority: "required",    reason: "Supervisione umana documentata" },
      { tool: "Resilience",     href: "/dashboard/tools/resilience",   art: "Art. 15", priority: "required",    reason: "Accuratezza e cybersecurity" },
      { tool: "Risk Manager",   href: "/dashboard/tools/risk-manager", art: "Art. 9",  priority: "required",    reason: "Sistema gestione rischi iterativo" },
      { tool: "QMS Builder",    href: "/dashboard/tools/qms",          art: "Art. 17", priority: "recommended", reason: "Sistema gestione qualità" },
    ],
    limited: [
      { tool: "Transparency",   href: "/dashboard/tools/transparency", art: "Art. 13", priority: "required",    reason: "Trasparenza obbligatoria (Art. 52)" },
      { tool: "DocuGen AI",     href: "/dashboard/tools/docugen",      art: "Art. 11", priority: "recommended", reason: "Documentazione tecnica consigliata" },
      { tool: "AI Classifier",  href: "/dashboard/tools/classifier",   art: "Art. 6",  priority: "recommended", reason: "Verifica della classificazione" },
    ],
    minimal: [
      { tool: "AI Classifier",  href: "/dashboard/tools/classifier",   art: "Art. 6",  priority: "recommended", reason: "Conferma del livello di rischio" },
      { tool: "DocuGen AI",     href: "/dashboard/tools/docugen",       art: "Art. 11", priority: "optional",    reason: "Documentazione volontaria (Art. 69)" },
    ],
  };

  const urgencyMap: Record<RiskLevel, RiskResult["urgency"]> = {
    unacceptable: "immediate",
    high:         data.devPhase === "deployed" || data.devPhase === "production" ? "immediate" : "within_6_months",
    limited:      "within_1_year",
    minimal:      "monitor",
  };

  // Deadline: high-risk systems must comply by 2 Aug 2026 per Art. 111(2)
  const deadlineMap: Record<RiskLevel, string> = {
    unacceptable: new Date().toISOString().split("T")[0],
    high:         "2026-08-02",
    limited:      "2026-08-02",
    minimal:      "2027-08-02",
  };

  return {
    level,
    score,
    annexIII,
    articleRef:   m.art,
    riskLabel:    m.label,
    riskColor:    m.color,
    riskBg:       m.bg,
    summary:      summaries[level],
    obligations:  obligationsMap[level],
    toolPath:     toolPaths[level],
    urgency:      urgencyMap[level],
    deadline:     deadlineMap[level],
  };
}
