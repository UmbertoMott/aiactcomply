// FRIA Engine — Art. 27 AI Act — Fundamental Rights Impact Assessment

// ─── Fundamental rights catalogue ────────────────────────────────────────────

export interface FundamentalRight {
  id: string;
  code: string;
  charter: string;
  charter_art: string;    // alias for charter, used in UI display
  title: string;
  name: string;           // short display name
  description: string;
  is_absolute: boolean;   // absolute rights cannot be balanced (torture, slavery, etc.)
  sector_risks?: Record<string, string>;  // optional sector-specific risk hints
  triggerQuestions: string[];
  mitigationExamples: string[];
}

export const FUNDAMENTAL_RIGHTS: FundamentalRight[] = [
  {
    id: "dignity",
    code: "CFR-1",
    charter: "Art. 1 Carta UE",
    charter_art: "Art. 1 Carta UE",
    title: "Dignità umana",
    name: "Dignità umana",
    description: "Ogni persona ha diritto al rispetto della propria dignità. Il sistema AI non deve trattare le persone come meri oggetti di classificazione o scoring.",
    is_absolute: true,
    triggerQuestions: [
      "Il sistema classifica o valuta persone in modo che potrebbe risultare degradante?",
      "Il sistema potrebbe portare a decisioni che negano a una persona il suo valore intrinseco?",
    ],
    mitigationExamples: [
      "Spiegazione comprensibile di ogni decisione automatizzata",
      "Garanzia di revisione umana per decisioni ad alto impatto",
      "Divieto esplicito di uso del sistema per ranking deumanizzanti",
    ],
  },
  {
    id: "prohibition_torture",
    code: "CFR-4",
    charter: "Art. 4 Carta UE",
    charter_art: "Art. 4 Carta UE",
    title: "Divieto di tortura e trattamenti inumani",
    name: "Divieto di tortura",
    description: "Nessuno può essere sottoposto a tortura, né a pene o trattamenti inumani o degradanti.",
    is_absolute: true,
    triggerQuestions: [
      "Il sistema potrebbe essere usato per infliger sofferenza fisica o psicologica?",
      "Il sistema monitora persone in modo tale da costituire trattamento degradante?",
    ],
    mitigationExamples: [
      "Revisione giuridica del contesto applicativo",
      "Divieto contrattuale di utilizzo in contesti di detenzione senza supervisione umana",
    ],
  },
  {
    id: "nondiscrimination",
    code: "CFR-21",
    charter: "Art. 20-21 Carta UE",
    charter_art: "Art. 20-21 Carta UE",
    title: "Uguaglianza e non discriminazione",
    name: "Non discriminazione",
    description: "Il sistema non può discriminare per sesso, razza, colore, origini etniche o sociali, caratteristiche genetiche, lingua, religione, opinioni politiche, appartenenza a minoranze, disabilità, età, orientamento sessuale.",
    is_absolute: false,
    triggerQuestions: [
      "Il sistema usa o inferisce attributi protetti (etnia, genere, età, religione)?",
      "I dataset di training sono rappresentativi di tutti i gruppi che il sistema valuterà?",
      "Il sistema è stato testato per bias differenziali tra gruppi demografici?",
    ],
    mitigationExamples: [
      "Bias audit periodico su tutti i gruppi protetti",
      "Rimozione o anonimizzazione degli attributi sensibili dai dati di input",
      "Test di fairness con metriche: equalized odds, demographic parity",
      "Documentazione dei gap di performance per sottogruppi",
    ],
  },
  {
    id: "data_protection",
    code: "CFR-8",
    charter: "Art. 8 Carta UE / GDPR",
    charter_art: "Art. 8 Carta UE / GDPR",
    title: "Protezione dei dati personali",
    name: "Protezione dati personali",
    description: "I dati personali devono essere trattati lealmente, per finalità determinate e sulla base del consenso o di altra base legittima prevista dalla legge.",
    is_absolute: false,
    triggerQuestions: [
      "Il sistema tratta dati personali o sensibili?",
      "Esiste una base giuridica GDPR documentata per ogni trattamento?",
      "I dati vengono conservati oltre il necessario?",
      "Gli interessati possono esercitare i propri diritti (accesso, rettifica, cancellazione)?",
    ],
    mitigationExamples: [
      "Data minimization: usare solo i dati strettamente necessari",
      "Privacy by design nella progettazione del sistema",
      "DPIA (Data Protection Impact Assessment) coordinata con il DPO",
      "Meccanismo di opt-out o diritto all'oblio implementato",
    ],
  },
  {
    id: "privacy",
    code: "CFR-7",
    charter: "Art. 7 Carta UE",
    charter_art: "Art. 7 Carta UE",
    title: "Rispetto della vita privata e familiare",
    name: "Privacy",
    description: "Ogni individuo ha diritto al rispetto della propria vita privata e familiare, del domicilio e delle comunicazioni.",
    is_absolute: false,
    triggerQuestions: [
      "Il sistema raccoglie o inferisce informazioni sulla vita privata delle persone?",
      "Il sistema permette sorveglianza o tracciamento senza consenso?",
    ],
    mitigationExamples: [
      "Anonimizzazione o pseudonimizzazione dei dati",
      "Limitazione della durata di conservazione",
      "Consenso esplicito prima di qualsiasi raccolta di dati comportamentali",
    ],
  },
  {
    id: "effective_remedy",
    code: "CFR-47",
    charter: "Art. 47 Carta UE",
    charter_art: "Art. 47 Carta UE",
    title: "Diritto a un rimedio effettivo",
    name: "Rimedio effettivo",
    description: "Le persone soggette a decisioni del sistema AI devono poter contestarle e ricevere spiegazione e revisione da parte di un umano.",
    is_absolute: false,
    triggerQuestions: [
      "Le persone sanno che una decisione è stata presa da un sistema AI?",
      "Esiste un canale per contestare le decisioni automatizzate?",
      "È garantita la revisione umana su richiesta?",
      "I tempi di risposta ai ricorsi sono definiti e ragionevoli?",
    ],
    mitigationExamples: [
      "Notifica obbligatoria all'interessato di ogni decisione automatizzata significativa",
      "Processo formalizzato di appeal con SLA definiti",
      "Spiegazione in linguaggio semplice del motivo della decisione",
      "Diritto di richiedere revisione umana senza oneri aggiuntivi",
    ],
  },
  {
    id: "work_rights",
    code: "CFR-15",
    charter: "Art. 15, 27-31 Carta UE",
    charter_art: "Art. 15, 27-31 Carta UE",
    title: "Diritti del lavoro",
    name: "Diritti del lavoro",
    description: "I lavoratori hanno diritto a condizioni di lavoro dignitose. Il sistema AI non può essere usato per sorveglianza indebita, discriminazione nelle assunzioni, o per determinare automaticamente condizioni lavorative senza supervisione umana.",
    is_absolute: false,
    triggerQuestions: [
      "Il sistema monitora le performance o il comportamento dei lavoratori?",
      "Il sistema influenza decisioni di assunzione, promozione o licenziamento?",
      "I lavoratori sono stati informati e consultati sull'uso del sistema?",
      "Il sistema raccoglie dati biometrici o comportamentali sui lavoratori?",
    ],
    mitigationExamples: [
      "Informativa completa ai lavoratori sull'uso del sistema",
      "Consultazione con rappresentanze sindacali prima del deploy",
      "Limite esplicito all'uso dei dati (no profilazione oltre lo scopo dichiarato)",
      "Audit annuale dell'impatto sui lavoratori",
    ],
  },
  {
    id: "freedom_expression",
    code: "CFR-11",
    charter: "Art. 11 Carta UE",
    charter_art: "Art. 11 Carta UE",
    title: "Libertà di espressione e di informazione",
    name: "Libertà di espressione",
    description: "Ogni individuo ha diritto alla libertà di espressione. Il sistema AI non deve essere usato per censurare o filtrare contenuti in modo discriminatorio.",
    is_absolute: false,
    triggerQuestions: [
      "Il sistema filtra, classifica o rimuove contenuti di utenti?",
      "Il sistema può influenzare l'accesso alle informazioni in modo non neutrale?",
    ],
    mitigationExamples: [
      "Trasparenza sui criteri di moderazione automatica",
      "Ricorso umano disponibile per ogni decisione di rimozione contenuto",
      "Audit periodico dei falsi positivi per gruppi protetti",
    ],
  },
  {
    id: "child_rights",
    code: "CFR-24",
    charter: "Art. 24 Carta UE / UNCRC",
    charter_art: "Art. 24 Carta UE / UNCRC",
    title: "Diritti dei minori",
    name: "Diritti dei minori",
    description: "I minori godono di protezione speciale. I sistemi AI che li riguardano devono mettere al primo posto il loro superiore interesse.",
    is_absolute: false,
    triggerQuestions: [
      "Il sistema può interagire con o prendere decisioni su minori?",
      "Il sistema processa dati di minori (anche indirettamente)?",
      "Il sistema potrebbe essere accessibile a minori senza adeguate salvaguardie?",
    ],
    mitigationExamples: [
      "Verifica dell'età prima dell'accesso al sistema",
      "Protezioni specifiche per i dati dei minori",
      "Revisione obbligatoria umana per tutte le decisioni che riguardano minori",
      "Test del sistema su scenari che coinvolgono minori",
    ],
  },
  {
    id: "disability",
    code: "CFR-26",
    charter: "Art. 26 Carta UE / CRPD",
    charter_art: "Art. 26 Carta UE / CRPD",
    title: "Integrazione delle persone con disabilità",
    name: "Diritti delle persone con disabilità",
    description: "Il sistema deve essere accessibile e non discriminare persone con disabilità fisiche, sensoriali, cognitive o psichiatriche.",
    is_absolute: false,
    triggerQuestions: [
      "Il sistema è accessibile a persone con disabilità visive, uditive, motorie o cognitive?",
      "Il dataset include dati rappresentativi di persone con disabilità?",
      "Le decisioni del sistema potrebbero svantaggiare sistematicamente persone con disabilità?",
    ],
    mitigationExamples: [
      "Conformità WCAG 2.1 AA per l'interfaccia",
      "Test del sistema con utenti con disabilità",
      "Override manuale per decisioni che impattano persone con disabilità documentate",
      "Audit specifico per performance differenziale su persone con disabilità",
    ],
  },
  {
    id: "consumer_protection",
    code: "CFR-38",
    charter: "Art. 38 Carta UE",
    charter_art: "Art. 38 Carta UE",
    title: "Protezione dei consumatori",
    name: "Protezione dei consumatori",
    description: "I consumatori hanno diritto a un alto livello di protezione. Il sistema non può essere usato per manipolare decisioni di acquisto, applicare prezzi discriminatori o creare dipendenza.",
    is_absolute: false,
    triggerQuestions: [
      "Il sistema influenza decisioni di acquisto o contratto da parte di consumatori?",
      "Il sistema applica prezzi o condizioni diverse a diversi segmenti di utenti?",
      "Il sistema potrebbe creare dipendenza o sfruttare bias cognitivi dei consumatori?",
    ],
    mitigationExamples: [
      "Trasparenza su come il sistema influenza le offerte mostrate",
      "Divieto di dynamic pricing discriminatorio basato su caratteristiche personali",
      "Audit periodico per pattern manipolativi",
    ],
  },
];

// ─── Rights groups (for accordion UI) ────────────────────────────────────────

export interface FRIARightsGroup {
  id: string;
  label: string;
  rightIds: string[];
}

export const RIGHTS_GROUPS: FRIARightsGroup[] = [
  {
    id: "dignity_group",
    label: "Dignità e integrità personale",
    rightIds: ["dignity", "prohibition_torture"],
  },
  {
    id: "freedom_group",
    label: "Libertà fondamentali",
    rightIds: ["privacy", "freedom_expression"],
  },
  {
    id: "equality_group",
    label: "Uguaglianza e non discriminazione",
    rightIds: ["nondiscrimination", "disability", "child_rights"],
  },
  {
    id: "justice_group",
    label: "Giustizia e rimedi",
    rightIds: ["effective_remedy", "data_protection"],
  },
  {
    id: "social_group",
    label: "Diritti sociali ed economici",
    rightIds: ["work_rights", "consumer_protection"],
  },
];

// ─── Scenario-based document types ───────────────────────────────────────────

export interface FRIASeverityAssessment {
  extent_of_interference: string;  // "none"|"minor"|"moderate"|"serious"|"very_serious"
  scope_of_impact: string;         // "individual"|"group"|"large_group"|"systemic"
  persons_affected: string;        // "few"|"many"|"very_many"
  gravity: string;                 // "low"|"medium"|"high"|"critical"
  irreversibility: string;         // "reversible"|"partially"|"irreversible"
  computed_severity: string;       // computed: "low"|"medium"|"high"|"critical"
}

export interface FRIAMitigationMeasure {
  id: string;
  description: string;
  category: "technical" | "organisational" | "legal" | "procedural" | "";
  responsible: string;
  deadline: string;
  status: "planned" | "in_progress" | "implemented" | "verified" | "";
}

export interface FRIARightImpact {
  right_id: string;
  severity: FRIASeverityAssessment;
  likelihood: {
    likelihood: string;         // "negligible"|"possible"|"likely"|"almost_certain"|""
    computed_priority: string;  // "low"|"medium"|"high"|"critical"
  };
  notes: string;
  mitigations: FRIAMitigationMeasure[];
  residual_risk: "acceptable" | "review" | "unacceptable" | "";
}

export interface FRIAScenario {
  id: string;
  title: string;
  description: string;
  type: string;   // e.g. "automated_decision", "profiling", "real_time_monitoring", etc.
  right_impacts: FRIARightImpact[];
}

export interface FRIAMonitoringItem {
  id: string;
  what: string;
  frequency: string;
  responsible: string;
}

export interface FRIAStakeholder {
  id: string;
  name: string;
  organization: string;
  category: "rights_holder" | "civil_society" | "regulator" | "internal" | "expert" | "";
  engagement_method: string;
  phases: string[];
  status: "planned" | "contacted" | "engaged" | "completed" | "";
}

export interface FRIAEngagementLog {
  id: string;
  date: string;
  stakeholder_id: string;
  method: string;
  findings: string;
  how_incorporated: string;
}

// ─── Context (Phase 1) ────────────────────────────────────────────────────────

export interface FRIAContext {
  // Cluster A — deployment context
  intended_purpose_match: string;
  intended_purpose_explanation: string;
  timeframe: string;
  frequency: string;
  legal_basis: string;
  dpia_done: string;
  dpia_explanation: string;
  main_users: string;
  affected_persons: string;
  legal_framework: string;
  complaint_mechanisms: string;
  // Cluster B — AI system characteristics
  technology_overview: string;
  has_generative_component: string;
  training_data_types: string;
  gdpr_provider_compliance_confidence: string;
  training_data_representative: string;
  bias_assessed: string;
  data_quality_sufficient: string;
  processes_personal_data: string;
  personal_data_types: string;
  gdpr_processing_compliant: string;
  controls_input_data: string;
  input_data_representative: string;
  accuracy_acceptable: string;
  // Cluster C — governance
  substantial_modifications_planned: string;
  human_oversight_assigned: string;
  oversight_persons_trained: string;
  workers_informed: string;
  affected_persons_informed: string;
}

// ─── Deployment decision (Phase 3) ───────────────────────────────────────────

export interface FRIADeployment {
  remaining_impacts_after_mitigation: string;
  qualified_rights_necessity_proportionality: string;
  recommendation: "deploy" | "deploy_with_conditions" | "do_not_deploy" | "";
  conditions: string;
  decision_justification: string;
  approver_name: string;
  approver_role: string;
  approver_date: string;
  approved_at: string;
  public_summary: string;
}

// ─── Monitoring (Phase 4) ─────────────────────────────────────────────────────

export interface FRIAMonitoring {
  items: FRIAMonitoringItem[];
  update_triggers: string[];
  review_frequency: string;
  update_history: Array<{
    id: string;
    date: string;
    reason: string;
    updater: string;
    summary: string;
  }>;
}

// ─── Root document ────────────────────────────────────────────────────────────

export interface FRIADocument {
  id: string;
  version: string;
  status: "draft" | "review" | "approved";
  system_name: string;
  organization: string;
  responsible_team: string;
  fria_start_date: string;
  context: FRIAContext;
  scenarios: FRIAScenario[];
  deployment: FRIADeployment;
  monitoring: FRIAMonitoring;
  stakeholders: FRIAStakeholder[];
  engagement_log: FRIAEngagementLog[];
  createdAt: string;
  updatedAt: string;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createEmptyFRIA(): FRIADocument {
  return {
    id: `FRIA-${Date.now()}`,
    version: "1.0",
    status: "draft",
    system_name: "",
    organization: "",
    responsible_team: "",
    fria_start_date: "",
    context: {
      intended_purpose_match: "", intended_purpose_explanation: "",
      timeframe: "", frequency: "", legal_basis: "", dpia_done: "",
      dpia_explanation: "", main_users: "", affected_persons: "",
      legal_framework: "", complaint_mechanisms: "",
      technology_overview: "", has_generative_component: "",
      training_data_types: "", gdpr_provider_compliance_confidence: "",
      training_data_representative: "", bias_assessed: "",
      data_quality_sufficient: "", processes_personal_data: "",
      personal_data_types: "", gdpr_processing_compliant: "",
      controls_input_data: "", input_data_representative: "",
      accuracy_acceptable: "", substantial_modifications_planned: "",
      human_oversight_assigned: "", oversight_persons_trained: "",
      workers_informed: "", affected_persons_informed: "",
    },
    scenarios: [],
    deployment: {
      remaining_impacts_after_mitigation: "",
      qualified_rights_necessity_proportionality: "",
      recommendation: "",
      conditions: "",
      decision_justification: "",
      approver_name: "",
      approver_role: "",
      approver_date: "",
      approved_at: "",
      public_summary: "",
    },
    monitoring: {
      items: [],
      update_triggers: [],
      review_frequency: "",
      update_history: [],
    },
    stakeholders: [],
    engagement_log: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ─── Computed functions ───────────────────────────────────────────────────────

/**
 * Compute severity from assessment criteria.
 * Returns "critical" | "high" | "medium" | "low" | ""
 */
export function computeSeverity(sev: FRIASeverityAssessment): string {
  const scoreMap: Record<string, number> = {
    // extent_of_interference
    very_serious: 4, serious: 3, moderate: 2, minor: 1, none: 0,
    // scope_of_impact
    systemic: 4, large_group: 3, group: 2, individual: 1,
    // persons_affected
    very_many: 3, many: 2, few: 1,
    // gravity
    critical: 4, high: 3, medium: 2, low: 1,
    // irreversibility
    irreversible: 3, partially: 2, reversible: 1,
  };

  const scores = [
    scoreMap[sev.extent_of_interference] ?? 0,
    scoreMap[sev.scope_of_impact] ?? 0,
    scoreMap[sev.persons_affected] ?? 0,
    scoreMap[sev.gravity] ?? 0,
    scoreMap[sev.irreversibility] ?? 0,
  ];

  const filled = scores.filter((s) => s > 0).length;
  if (filled === 0) return "";

  const total = scores.reduce((a, b) => a + b, 0);
  const max = 4 + 4 + 3 + 4 + 3; // 18
  const ratio = total / max;

  if (ratio >= 0.75) return "critical";
  if (ratio >= 0.5)  return "high";
  if (ratio >= 0.25) return "medium";
  return "low";
}

/**
 * Compute priority (risk level) from severity + likelihood.
 */
export function computePriority(severity: string, likelihood: string): string {
  const sevRank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  const likRank: Record<string, number> = {
    almost_certain: 4, likely: 3, possible: 2, negligible: 1,
  };

  const s = sevRank[severity] ?? 0;
  const l = likRank[likelihood] ?? 0;

  if (s === 0 || l === 0) return "";

  const product = s * l;
  if (product >= 9)  return "critical";
  if (product >= 6)  return "high";
  if (product >= 3)  return "medium";
  return "low";
}

/**
 * Generate a plain-language public summary from the document.
 */
export function generatePublicSummary(doc: FRIADocument): string {
  const systemName = doc.system_name || "il sistema AI";
  const org = doc.organization || "l'organizzazione";
  const scenarioCount = doc.scenarios.length;
  const impactedRights = [
    ...new Set(
      doc.scenarios.flatMap((s) => s.right_impacts.map((ri) => {
        const r = FUNDAMENTAL_RIGHTS.find((f) => f.id === ri.right_id);
        return r?.name ?? ri.right_id;
      }))
    ),
  ];

  const rec = doc.deployment.recommendation;
  const recLabel =
    rec === "deploy"                 ? "è stato autorizzato al deployment" :
    rec === "deploy_with_conditions" ? "è stato autorizzato al deployment con condizioni" :
    rec === "do_not_deploy"          ? "non è stato autorizzato al deployment" :
    "è in fase di valutazione";

  const lines: string[] = [
    `${org} ha condotto una Valutazione d'Impatto sui Diritti Fondamentali (FRIA) per ${systemName} ai sensi dell'Art. 27 del Regolamento UE sull'Intelligenza Artificiale (2024/1689).`,
    "",
    `La valutazione ha analizzato ${scenarioCount} scenario${scenarioCount !== 1 ? "i" : ""} di rischio.`,
  ];

  if (impactedRights.length > 0) {
    lines.push(`I diritti fondamentali considerati includono: ${impactedRights.join(", ")}.`);
  }

  if (doc.deployment.remaining_impacts_after_mitigation) {
    lines.push(`Impatti residui dopo mitigazione: ${doc.deployment.remaining_impacts_after_mitigation}`);
  }

  lines.push(`\nDecisione: il sistema ${recLabel}.`);

  if (rec === "deploy_with_conditions" && doc.deployment.conditions) {
    lines.push(`Condizioni: ${doc.deployment.conditions}`);
  }

  lines.push(`\nData della valutazione: ${new Date().toLocaleDateString("it-IT")}.`);
  if (doc.deployment.approver_name) {
    lines.push(`Approvato da: ${doc.deployment.approver_name}${doc.deployment.approver_role ? ` (${doc.deployment.approver_role})` : ""}.`);
  }

  return lines.join("\n");
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export function calculateFRIACompleteness(doc: FRIADocument): number {
  let score = 0;
  const total = 20;

  // Basic info (4)
  if (doc.system_name)        score++;
  if (doc.organization)       score++;
  if (doc.responsible_team)   score++;
  if (doc.fria_start_date)    score++;

  // Context — at least 5 cluster A/B/C fields filled (5)
  const ctxFields = Object.values(doc.context).filter(Boolean).length;
  score += Math.min(ctxFields, 5);

  // Scenarios — at least one (2)
  if (doc.scenarios.length > 0) score++;
  if (doc.scenarios.some((s) => s.right_impacts.length > 0)) score++;

  // Deployment (4)
  if (doc.deployment.recommendation)   score++;
  if (doc.deployment.decision_justification) score++;
  if (doc.deployment.approver_name)    score++;
  if (doc.deployment.remaining_impacts_after_mitigation) score++;

  // Monitoring (2)
  if (doc.monitoring.items.length > 0)            score++;
  if (doc.monitoring.update_triggers.length > 0)  score++;

  // Stakeholders (2)
  if (doc.stakeholders.length > 0)   score++;
  if (doc.engagement_log.length > 0) score++;

  return Math.round((score / total) * 100);
}

export function getOverallFRIARisk(doc: FRIADocument): "low" | "medium" | "high" | "critical" {
  const allImpacts = doc.scenarios.flatMap((s) => s.right_impacts);

  const critical = allImpacts.filter((ri) => ri.residual_risk === "unacceptable").length;
  const review   = allImpacts.filter((ri) => ri.residual_risk === "review").length;
  const highSev  = allImpacts.filter((ri) =>
    ri.severity.computed_severity === "critical" || ri.severity.computed_severity === "high"
  ).length;

  if (critical > 0)              return "critical";
  if (review > 1 || highSev > 3) return "high";
  if (review === 1 || highSev > 1) return "medium";
  return "low";
}
