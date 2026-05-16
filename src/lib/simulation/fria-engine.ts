// FRIA Engine — Art. 27 AI Act — Fundamental Rights Impact Assessment

export interface FundamentalRight {
  id: string;
  code: string;
  charter: string;
  title: string;
  description: string;
  triggerQuestions: string[];
  mitigationExamples: string[];
}

export const FUNDAMENTAL_RIGHTS: FundamentalRight[] = [
  {
    id: "dignity",
    code: "CFR-1",
    charter: "Art. 1 Carta UE",
    title: "Dignità umana",
    description: "Ogni persona ha diritto al rispetto della propria dignità. Il sistema AI non deve trattare le persone come meri oggetti di classificazione o scoring.",
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
    id: "nondiscrimination",
    code: "CFR-21",
    charter: "Art. 20-21 Carta UE",
    title: "Uguaglianza e non discriminazione",
    description: "Il sistema non può discriminare per sesso, razza, colore, origini etniche o sociali, caratteristiche genetiche, lingua, religione, opinioni politiche, appartenenza a minoranze, disabilità, età, orientamento sessuale.",
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
    title: "Protezione dei dati personali",
    description: "I dati personali devono essere trattati lealmente, per finalità determinate e sulla base del consenso o di altra base legittima prevista dalla legge.",
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
    id: "effective_remedy",
    code: "CFR-47",
    charter: "Art. 47 Carta UE",
    title: "Diritto a un rimedio effettivo",
    description: "Le persone soggette a decisioni del sistema AI devono poter contestarle e ricevere spiegazione e revisione da parte di un umano.",
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
    title: "Diritti del lavoro",
    description: "I lavoratori hanno diritto a condizioni di lavoro dignitose. Il sistema AI non può essere usato per sorveglianza indebita, discriminazione nelle assunzioni, o per determinare automaticamente condizioni lavorative senza supervisione umana.",
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
    id: "child_rights",
    code: "CFR-24",
    charter: "Art. 24 Carta UE / UNCRC",
    title: "Diritti dei minori",
    description: "I minori godono di protezione speciale. I sistemi AI che li riguardano devono mettere al primo posto il loro superiore interesse.",
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
    title: "Integrazione delle persone con disabilità",
    description: "Il sistema deve essere accessibile e non discriminare persone con disabilità fisiche, sensoriali, cognitive o psichiatriche.",
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
    title: "Protezione dei consumatori",
    description: "I consumatori hanno diritto a un alto livello di protezione. Il sistema non può essere usato per manipolare decisioni di acquisto, applicare prezzi discriminatori o creare dipendenza.",
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

// ─── Section interfaces ───────────────────────────────────────────────────────

export interface FRIASection1 {
  organizationName: string;
  organizationRole: "deployer" | "provider" | "both";
  systemName: string;
  systemVersion: string;
  systemProvider: string;
  deploymentPurpose: string;
  deploymentContext: string;
}

export interface FRIASection2 {
  deploymentStartDate: string;
  reviewFrequency: "monthly" | "quarterly" | "biannual" | "annual";
  geographicScope: string;
  integrationWithHumanProcess: string;
  autonomyLevel: "full_auto" | "human_in_loop" | "human_on_loop" | "advisory";
}

export interface AffectedCategory {
  category: string;
  estimatedNumber: string;
  vulnerability: "standard" | "elevated";
  consentMechanism: string;
}

export interface FRIASection3 {
  affectedCategories: AffectedCategory[];
  totalEstimatedAffected: string;
}

export interface RightAssessment {
  rightId: string;
  relevance: "not_relevant" | "low" | "medium" | "high" | "critical";
  relevanceJustification: string;
  identifiedRisks: string;
  mitigationMeasures: string[];
  residualRisk: "acceptable" | "review" | "unacceptable";
  customMitigations: string;
}

export interface FRIASection4 {
  assessments: RightAssessment[];
}

export interface FRIASection5 {
  dataTypes: string[];
  personalDataProcessed: boolean;
  sensitiveDataProcessed: boolean;
  dataRetentionPolicy: string;
  dpoConsulted: boolean;
  dpiaLink: string;
}

export interface FRIASection6 {
  oversightMechanism: string;
  humanReviewOnRequest: boolean;
  appealProcess: string;
  appealDeadlineDays: number;
  notificationToAffected: boolean;
  notificationMethod: string;
  responsiblePerson: string;
  responsibleContact: string;
}

export interface FRIADocument {
  id: string;
  version: string;
  status: "draft" | "review" | "approved";
  section1: Partial<FRIASection1>;
  section2: Partial<FRIASection2>;
  section3: Partial<FRIASection3>;
  section4: Partial<FRIASection4>;
  section5: Partial<FRIASection5>;
  section6: Partial<FRIASection6>;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

export function createEmptyFRIA(): FRIADocument {
  return {
    id: `FRIA-${Date.now()}`,
    version: "1.0",
    status: "draft",
    section1: {},
    section2: {},
    section3: { affectedCategories: [] },
    section4: {
      assessments: FUNDAMENTAL_RIGHTS.map((r) => ({
        rightId: r.id,
        relevance: "not_relevant" as const,
        relevanceJustification: "",
        identifiedRisks: "",
        mitigationMeasures: [],
        residualRisk: "acceptable" as const,
        customMitigations: "",
      })),
    },
    section5: { dataTypes: [] },
    section6: { appealDeadlineDays: 30 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function calculateFRIACompleteness(doc: FRIADocument): number {
  let score = 0;
  const total = 20;

  if (doc.section1.organizationName)   score++;
  if (doc.section1.systemName)         score++;
  if (doc.section1.deploymentPurpose)  score++;
  if (doc.section1.deploymentContext)  score++;

  if (doc.section2.deploymentStartDate)          score++;
  if (doc.section2.autonomyLevel)                score++;
  if (doc.section2.integrationWithHumanProcess)  score++;

  if ((doc.section3.affectedCategories?.length ?? 0) > 0) score++;
  if (doc.section3.totalEstimatedAffected)                score++;

  const assessed = doc.section4.assessments?.filter(
    (a) => a.relevance !== "not_relevant" && a.relevanceJustification
  ).length ?? 0;
  score += Math.min(assessed, 5);

  if ((doc.section5.dataTypes?.length ?? 0) > 0) score++;
  if (doc.section5.dataRetentionPolicy)          score++;
  if (doc.section5.dpoConsulted !== undefined)   score++;

  if (doc.section6.oversightMechanism)  score++;
  if (doc.section6.appealProcess)       score++;
  if (doc.section6.responsiblePerson)   score++;

  return Math.round((score / total) * 100);
}

export function getOverallFRIARisk(doc: FRIADocument): "low" | "medium" | "high" | "critical" {
  const assessments = doc.section4.assessments ?? [];
  const critical  = assessments.filter((a) => a.residualRisk === "unacceptable").length;
  const review    = assessments.filter((a) => a.residualRisk === "review").length;
  const highRelev = assessments.filter((a) => a.relevance === "critical" || a.relevance === "high").length;

  if (critical > 0)                    return "critical";
  if (review > 1 || highRelev > 3)     return "high";
  if (review === 1 || highRelev > 1)   return "medium";
  return "low";
}
