// ============================================================
// FRIA Engine — Fundamental Rights Impact Assessment
// Art. 27 AI Act | EU Charter of Fundamental Rights
// ============================================================

import { hashObject } from "@/lib/crypto/hash";
import { appendEvidence } from "@/lib/evidence/evidence-layer";

// ---- TYPES ----

export type DeployerType =
  | "public_body"
  | "public_service_provider"
  | "critical_sector"
  | "private_company"
  | "sme";

export type AnnexIIICategory =
  | "biometric_remote"
  | "biometric_categorization"
  | "critical_infra"
  | "education"
  | "employment"
  | "essential_services"
  | "law_enforcement"
  | "migration"
  | "justice"
  | "none";

export type RiskLevel = "unacceptable" | "high" | "limited" | "minimal";

export type FundamentalRight = {
  article: number;
  title: string;
  description: string;
  applicability: "direct" | "indirect" | "possible" | "none";
  riskScore: number; // 0-100
};

export type AffectedPerson = {
  id: string;
  category: string;
  description: string;
  vulnerability: "high" | "medium" | "low";
  estimatedCount: number;
};

export type RiskScenario = {
  id: string;
  right: string;
  description: string;
  likelihood: number; // L: 1-5
  severity: number; // S: 1-5
  riskScore: number; // R = L × S
  affectedPeople: string[];
  mitigation: string;
};

export type DPIAField = {
  field: string;
  aiActRelevance: string;
  mapped: boolean;
  value: string;
};

export type AgenticControl = {
  check: string;
  description: string;
  passed: boolean;
  riskFactor: "input" | "data_access" | "autonomous_action";
};

export type OversightRole = {
  name: string;
  qualification: string;
  aiLiteracyLevel: "basic" | "intermediate" | "advanced" | "expert";
  responsabilities: string[];
};

export type CircuitBreaker = {
  id: string;
  trigger: string;
  action: string;
  responseTime: string;
  lastTested: string | null;
};

export type FRIAPhase =
  | "scoping"
  | "dpia"
  | "rights_analysis"
  | "agentic"
  | "oversight"
  | "output";

export type FRIAReport = {
  id: string;
  version: number;
  systemName: string;
  deployer: { name: string; type: DeployerType; vatNumber: string };
  riskClass: RiskLevel;
  annexCategory: AnnexIIICategory;
  createdAt: string;
  updatedAt: string;
  completedPhases: FRIAPhase[];

  // Phase 1: Scoping
  scoping: {
    cobraScore: number; // 0-100
    isApplicable: boolean;
    rationale: string;
    art13Instructions: string;
    art13Capabilities: string[];
    art13Limitations: string[];
  };

  // Phase 2: DPIA
  dpia: {
    hasExistingDPIA: boolean;
    mappedFields: DPIAField[];
    deltaGaps: string[];
  };

  // Phase 3: Rights Analysis
  rightsAnalysis: {
    applicableRights: FundamentalRight[];
    affectedPeople: AffectedPerson[];
    riskScenarios: RiskScenario[];
    overallScore: number; // 0-100
  };

  // Phase 4: Agentic
  agentic: {
    isAgentic: boolean;
    controls: AgenticControl[];
    ruleOf2Violated: boolean;
    memoryManagement: string;
  };

  // Phase 5: Oversight
  oversight: {
    roles: OversightRole[];
    circuitBreakers: CircuitBreaker[];
    complaintChannel: string;
  };

  // Phase 6: Output
  output: {
    reportHash: string;
    msaSubmissionDate: string | null;
    nextReviewDate: string;
    evidenceChain: string[];
  };
};

// ---- DEFAULTS ----

export function createEmptyFRIAReport(
  systemName: string,
  deployerName: string,
  deployerType: DeployerType,
  vatNumber: string
): FRIAReport {
  return {
    id: crypto.randomUUID(),
    version: 1,
    systemName,
    deployer: { name: deployerName, type: deployerType, vatNumber },
    riskClass: "minimal",
    annexCategory: "none",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedPhases: [],
    scoping: {
      cobraScore: 0,
      isApplicable: false,
      rationale: "",
      art13Instructions: "",
      art13Capabilities: [],
      art13Limitations: [],
    },
    dpia: {
      hasExistingDPIA: false,
      mappedFields: [],
      deltaGaps: [],
    },
    rightsAnalysis: {
      applicableRights: [],
      affectedPeople: [],
      riskScenarios: [],
      overallScore: 0,
    },
    agentic: {
      isAgentic: false,
      controls: [],
      ruleOf2Violated: false,
      memoryManagement: "",
    },
    oversight: {
      roles: [],
      circuitBreakers: [],
      complaintChannel: "",
    },
    output: {
      reportHash: "",
      msaSubmissionDate: null,
      nextReviewDate: "",
      evidenceChain: [],
    },
  };
}

// ---- PHASE 1: SCOPING & TRIAGE (COBRA) ----

export const ANNEX_III_MAP: Record<string, AnnexIIICategory> = {
  biometria: "biometric_categorization",
  "riconoscimento facciale": "biometric_remote",
  "controllo accessi": "biometric_categorization",
  istruzione: "education",
  "valutazione studenti": "education",
  "selezione personale": "employment",
  "screening cv": "employment",
  "monitoraggio lavoratori": "employment",
  "credit scoring": "essential_services",
  "scoring assicurativo": "essential_services",
  "servizi pubblici": "essential_services",
  "forze dell'ordine": "law_enforcement",
  migrazione: "migration",
  giustizia: "justice",
  infrastrutture: "critical_infra",
};

export function computeCOBRAScore(args: {
  deployerType: DeployerType;
  useCase: string;
  usesBiometrics: boolean;
  processesPersonalData: boolean;
  makesAutomatedDecisions: boolean;
  affectsVulnerableGroups: boolean;
}): { score: number; rationale: string; isApplicable: boolean; annexCat: AnnexIIICategory } {
  let score = 0;
  const reasons: string[] = [];

  // Deployer risk weight
  if (args.deployerType === "public_body") {
    score += 25;
    reasons.push("Ente pubblico (obbligo rinforzato Art. 27)");
  } else if (args.deployerType === "public_service_provider") {
    score += 20;
    reasons.push("Fornitore di servizi pubblici");
  } else if (args.deployerType === "critical_sector") {
    score += 20;
    reasons.push("Settore critico (bancario/assicurativo)");
  } else if (args.deployerType === "sme") {
    score += 5;
    reasons.push("PMI — obblighi proporzionati");
  }

  // Use case → Annex III mapping
  let annexCat: AnnexIIICategory = "none";
  const ucLower = args.useCase.toLowerCase();
  for (const [keyword, cat] of Object.entries(ANNEX_III_MAP)) {
    if (ucLower.includes(keyword)) {
      annexCat = cat;
      reasons.push(`Caso d'uso mappato: ${keyword} → Allegato III`);
      score += 20;
      break;
    }
  }

  // Risk factors
  if (args.usesBiometrics) {
    score += 25;
    annexCat = annexCat === "none" ? "biometric_categorization" : annexCat;
    reasons.push("Trattamento dati biometrici");
  }
  if (args.processesPersonalData) {
    score += 10;
    reasons.push("Trattamento dati personali");
  }
  if (args.makesAutomatedDecisions) {
    score += 20;
    reasons.push("Decisioni automatizzate su persone fisiche");
  }
  if (args.affectsVulnerableGroups) {
    score += 15;
    reasons.push("Impatto su gruppi vulnerabili");
  }

  const isApplicable = score >= 25;
  const rationale = reasons.join("; ") + `. Punteggio COBRA: ${score}/100`;

  return { score, rationale, isApplicable, annexCat };
}

export function parseArt13Instructions(rawText: string): {
  capabilities: string[];
  limitations: string[];
  summary: string;
} {
  const capabilities: string[] = [];
  const limitations: string[] = [];

  const lines = rawText.split("\n").filter((l) => l.trim());
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed.toLowerCase().includes("può") ||
      trimmed.toLowerCase().includes("capacit") ||
      trimmed.toLowerCase().includes("funzionalit")
    ) {
      capabilities.push(trimmed);
    }
    if (
      trimmed.toLowerCase().includes("non") ||
      trimmed.toLowerCase().includes("limitazion") ||
      trimmed.toLowerCase().includes("restrizion")
    ) {
      limitations.push(trimmed);
    }
  }

  if (capabilities.length === 0) capabilities.push("Nessuna capacità dichiarata esplicitamente");
  if (limitations.length === 0) limitations.push("Nessuna limitazione dichiarata esplicitamente");

  return {
    capabilities,
    limitations,
    summary: rawText.slice(0, 500),
  };
}

// ---- PHASE 2: DPIA BRIDGE ----

export const DPIA_TO_FRIA_MAP: DPIAField[] = [
  { field: "Descrizione del trattamento", aiActRelevance: "Flussi dati del sistema AI", mapped: false, value: "" },
  { field: "Base giuridica (Art. 6 GDPR)", aiActRelevance: "Base di liceità per l'uso dell'AI", mapped: false, value: "" },
  { field: "Categorie dati personali", aiActRelevance: "Dati di input/output del modello", mapped: false, value: "" },
  { field: "Misure di sicurezza tecniche", aiActRelevance: "Cybersicurezza (Art. 15 AI Act)", mapped: false, value: "" },
  { field: "Misure organizzative", aiActRelevance: "Sorveglianza umana (Art. 14 AI Act)", mapped: false, value: "" },
  { field: "Valutazione necessità/proporzionalità", aiActRelevance: "Analisi rischio residuale FRIA", mapped: false, value: "" },
  { field: "Consultazione interessati", aiActRelevance: "Coinvolgimento persone affette", mapped: false, value: "" },
];

export function computeDeltaGaps(
  dpiaFields: Pick<DPIAField, "field" | "mapped" | "value">[]
): string[] {
  const gaps: string[] = [];
  const extraPrivacyRights = [
    "Non-discriminazione (Art. 21 Carta UE)",
    "Libertà di espressione (Art. 11 Carta UE)",
    "Dignità umana (Art. 1 Carta UE)",
    "Diritto a un ricorso effettivo (Art. 47 Carta UE)",
    "Presunzione di innocenza (Art. 48 Carta UE)",
    "Diritto alla buona amministrazione (Art. 41 Carta UE)",
  ];

  for (const field of dpiaFields) {
    if (!field.mapped || !field.value.trim()) {
      gaps.push(`Campo DPIA non mappato: "${field.field}" — compilare per la FRIA`);
    }
  }

  gaps.push("⚠ La DPIA copre solo la privacy. La FRIA deve ora affrontare:");
  for (const right of extraPrivacyRights) {
    gaps.push(`   → ${right}`);
  }

  return gaps;
}

// ---- PHASE 3: FUNDAMENTAL RIGHTS ANALYSIS ----

export const EU_CHARTER_RIGHTS: { article: number; title: string; description: string }[] = [
  { article: 1, title: "Dignità umana", description: "L'IA potrebbe degradare o strumentalizzare la persona?" },
  { article: 3, title: "Integrità della persona", description: "L'IA potrebbe causare danni fisici o psicologici?" },
  { article: 7, title: "Vita privata e famiglia", description: "L'IA invade la sfera privata oltre lo stretto necessario?" },
  { article: 8, title: "Protezione dati personali", description: "I dati sono trattati in modo lecito, corretto e trasparente?" },
  { article: 11, title: "Libertà di espressione", description: "L'IA limita o distorce l'espressione individuale?" },
  { article: 12, title: "Libertà di riunione", description: "L'IA ostacola l'associazione o la partecipazione civica?" },
  { article: 15, title: "Libertà professionale", description: "L'IA preclude ingiustamente opportunità di lavoro?" },
  { article: 16, title: "Libertà d'impresa", description: "L'IA impone barriere sproporzionate all'attività economica?" },
  { article: 17, title: "Diritto di proprietà", description: "L'IA può causare perdite patrimoniali non eque?" },
  { article: 20, title: "Uguaglianza davanti alla legge", description: "L'IA tratta casi uguali in modo diverso senza giustificazione?" },
  { article: 21, title: "Non discriminazione", description: "L'IA produce effetti discriminatori su gruppi protetti?" },
  { article: 22, title: "Diversità culturale e religiosa", description: "L'IA ignora o penalizza differenze culturali?" },
  { article: 23, title: "Parità di genere", description: "L'IA perpetua o amplifica stereotipi di genere?" },
  { article: 24, title: "Diritti dei minori", description: "L'IA impatta specificamente bambini o adolescenti?" },
  { article: 25, title: "Diritti degli anziani", description: "L'IA esclude o penalizza le persone anziane?" },
  { article: 26, title: "Inserimento dei disabili", description: "L'IA è accessibile e non discrimina persone con disabilità?" },
  { article: 31, title: "Condizioni di lavoro giuste", description: "L'IA peggiora le condizioni lavorative o il monitoraggio?" },
  { article: 34, title: "Sicurezza sociale", description: "L'IA nega o riduce l'accesso a prestazioni sociali?" },
  { article: 35, title: "Protezione della salute", description: "L'IA può causare danni alla salute fisica o mentale?" },
  { article: 38, title: "Protezione dei consumatori", description: "L'IA inganna o manipola i consumatori?" },
  { article: 41, title: "Buona amministrazione", description: "Le decisioni automatizzate sono motivate e ricorribili?" },
  { article: 47, title: "Ricorso effettivo", description: "Esiste un canale per contestare le decisioni dell'IA?" },
];

export function computeRightsApplicability(
  useCase: string,
  deployerType: DeployerType,
  annexCat: AnnexIIICategory
): FundamentalRight[] {
  const ucLower = useCase.toLowerCase();
  const keywordMap: Record<string, number[]> = {
    lavoro: [15, 20, 21, 23, 31],
    impiego: [15, 20, 21, 23, 31],
    cv: [15, 20, 21],
    scoring: [20, 21, 34, 38],
    credito: [20, 21, 34, 38],
    assicur: [20, 21, 34, 38],
    salute: [3, 7, 8, 35],
    medico: [3, 7, 8, 35],
    sanitar: [3, 7, 8, 35],
    istruz: [14, 20, 21, 24],
    student: [14, 20, 21, 24],
    biometr: [1, 3, 7, 8],
    facciale: [1, 3, 7, 8],
    pubblico: [20, 21, 41, 47],
    polizia: [1, 3, 6, 47],
    giustizia: [20, 21, 47, 48],
    migranti: [1, 4, 18, 19],
  };

  const matchedArticles = new Set<number>();

  // Keyword matching
  for (const [keyword, articles] of Object.entries(keywordMap)) {
    if (ucLower.includes(keyword)) {
      articles.forEach((a) => matchedArticles.add(a));
    }
  }

  // Always applicable rights
  matchedArticles.add(1); // Dignità umana
  matchedArticles.add(21); // Non discriminazione
  matchedArticles.add(8); // Protezione dati

  // Deployer-specific
  if (deployerType === "public_body" || deployerType === "public_service_provider") {
    matchedArticles.add(41); // Buona amministrazione
  }

  // Annex-specific
  if (annexCat === "employment") {
    [15, 20, 23, 31].forEach((a) => matchedArticles.add(a));
  }
  if (annexCat === "education") {
    [14, 20, 24].forEach((a) => matchedArticles.add(a));
  }
  if (annexCat === "biometric_categorization" || annexCat === "biometric_remote") {
    [1, 3, 7].forEach((a) => matchedArticles.add(a));
  }

  return EU_CHARTER_RIGHTS
    .filter((r) => matchedArticles.has(r.article))
    .map((r) => ({
      ...r,
      applicability: "direct" as const,
      riskScore: 0, // to be scored by user
    }));
}

export const AFFECTED_PERSON_CATEGORIES: { category: string; vulnerability: AffectedPerson["vulnerability"] }[] = [
  { category: "Candidati a posizioni lavorative", vulnerability: "high" },
  { category: "Lavoratori sottoposti a monitoraggio", vulnerability: "high" },
  { category: "Studenti e discenti", vulnerability: "high" },
  { category: "Pazienti e utenti sanitari", vulnerability: "high" },
  { category: "Richiedenti credito o mutuo", vulnerability: "high" },
  { category: "Minori (0-18 anni)", vulnerability: "high" },
  { category: "Anziani (>65 anni)", vulnerability: "medium" },
  { category: "Persone con disabilità", vulnerability: "high" },
  { category: "Minoranze etniche o linguistiche", vulnerability: "high" },
  { category: "Migranti e richiedenti asilo", vulnerability: "high" },
  { category: "Persone a basso reddito", vulnerability: "medium" },
  { category: "Cittadini in relazione con la PA", vulnerability: "medium" },
  { category: "Consumatori generici", vulnerability: "low" },
  { category: "Utenti professionali del sistema", vulnerability: "low" },
];

export function generateRiskScenarios(
  rights: FundamentalRight[],
  affectedPeople: AffectedPerson[]
): RiskScenario[] {
  const scenarios: RiskScenario[] = [];
  let id = 0;

  for (const right of rights) {
    for (const person of affectedPeople.slice(0, 3)) {
      id++;
      scenarios.push({
        id: `RS-${id.toString().padStart(3, "0")}`,
        right: `Art. ${right.article} - ${right.title}`,
        description: `Impatto dell'IA su "${right.title}" per il gruppo "${person.category}"`,
        likelihood: 1,
        severity: 1,
        riskScore: 1,
        affectedPeople: [person.id],
        mitigation: "",
      });
    }
  }

  return scenarios;
}

// ---- PHASE 4: AGENTIC AI CONTROLS (Rule of 2 — AEPD) ----

export const RULE_OF_2_CHECKS: AgenticControl[] = [
  {
    check: "Input non fidati",
    description: "Il sistema riceve input da fonti non fidate (web scraping, contenuti generati da utenti anonimi, API esterne non autenticate)?",
    passed: true,
    riskFactor: "input",
  },
  {
    check: "Accesso a dati sensibili",
    description: "Il sistema ha accesso a dati sensibili, privilegiati o a sistemi critici?",
    passed: true,
    riskFactor: "data_access",
  },
  {
    check: "Azione autonoma esterna",
    description: "Il sistema può compiere azioni autonome nell'ambiente esterno (inviare email, modificare database, eseguire transazioni)?",
    passed: true,
    riskFactor: "autonomous_action",
  },
];

export function evaluateRuleOf2(controls: AgenticControl[]): boolean {
  const input = controls.find((c) => c.riskFactor === "input");
  const dataAccess = controls.find((c) => c.riskFactor === "data_access");
  const action = controls.find((c) => c.riskFactor === "autonomous_action");

  // Rule of 2: se 2+ su 3 fattori sono NON passati (cioè presenti), il sistema viola la regola
  const riskCount = [input, dataAccess, action].filter((c) => c && !c.passed).length;
  return riskCount >= 2;
}

// ---- PHASE 6: OUTPUT ----

export async function finalizeFRIAReport(report: FRIAReport): Promise<FRIAReport> {
  const contentForHash = {
    id: report.id,
    version: report.version,
    systemName: report.systemName,
    riskClass: report.riskClass,
    completedPhases: report.completedPhases,
    scoping: report.scoping,
    dpia: report.dpia,
    rightsAnalysis: report.rightsAnalysis,
    agentic: report.agentic,
    oversight: report.oversight,
  };

  const reportHash = await hashObject(contentForHash as Record<string, unknown>);
  const nextReview = new Date();
  nextReview.setMonth(nextReview.getMonth() + 12);

  const evidence = await appendEvidence(
    "decision",
    {
      frIaId: report.id,
      systemName: report.systemName,
      riskClass: report.riskClass,
      reportHash,
      phasesCompleted: report.completedPhases,
    },
    report.deployer.name
  );

  return {
    ...report,
    version: report.version + 1,
    updatedAt: new Date().toISOString(),
    output: {
      reportHash,
      msaSubmissionDate: report.output.msaSubmissionDate || new Date().toISOString(),
      nextReviewDate: nextReview.toISOString().split("T")[0],
      evidenceChain: [...report.output.evidenceChain, evidence.hash],
    },
  };
}

export function generateMSASubmissionData(report: FRIAReport) {
  return {
    authority: "Autorità di Sorveglianza del Mercato competente",
    submissionDate: new Date().toISOString(),
    referenceNumber: `FRIA-${report.id.slice(0, 8).toUpperCase()}`,
    deployer: report.deployer,
    systemName: report.systemName,
    riskClass: report.riskClass,
    annexCategory: report.annexCategory,
    rightsImpacted: report.rightsAnalysis.applicableRights.length,
    riskScenariosCount: report.rightsAnalysis.riskScenarios.length,
    highRiskScenarios: report.rightsAnalysis.riskScenarios.filter((r) => r.riskScore >= 12).length,
    oversightRoles: report.oversight.roles.length,
    circuitBreakers: report.oversight.circuitBreakers.length,
    reportHash: report.output.reportHash,
  };
}
