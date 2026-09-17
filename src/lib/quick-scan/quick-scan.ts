export type QuickScanSeverity = "critical" | "high" | "medium";

export interface QuickScanGap {
  area: string;
  label: string;
  severity: QuickScanSeverity;
  evidence: string;
  recommendation: string;
  documentGap: boolean;
}

export interface QuickScanAnswer {
  id: string;
  text: string;
  helper?: string;
  riskWeight: number;
  gaps?: QuickScanGap[];
}

export interface QuickScanQuestion {
  id: string;
  eyebrow: string;
  text: string;
  answers: QuickScanAnswer[];
}

export type QuickScanAnswers = Record<string, string>;

export interface QuickScanResult {
  score: number;
  answered: number;
  totalQuestions: number;
  potentialGaps: number;
  documentGaps: number;
  criticalAreas: number;
  highPriorityAreas: number;
  mediumPriorityAreas: number;
  topGaps: QuickScanGap[];
}

const severityRank: Record<QuickScanSeverity, number> = {
  critical: 3,
  high: 2,
  medium: 1,
};

export const QUICK_SCAN_QUESTIONS: QuickScanQuestion[] = [
  {
    id: "scope",
    eyebrow: "Perimetro",
    text: "La tua organizzazione fornisce o utilizza un sistema AI in un prodotto, servizio o processo aziendale?",
    answers: [
      { id: "provider", text: "Sì, lo forniamo a clienti o utenti", riskWeight: 6 },
      { id: "deployer", text: "Sì, lo usiamo internamente", riskWeight: 4 },
      { id: "both", text: "Entrambe le cose", riskWeight: 8 },
      {
        id: "not_sure",
        text: "Non sono sicuro",
        riskWeight: 10,
        gaps: [{
          area: "Classificazione ruolo",
          label: "Ruolo AI Act non chiarito",
          severity: "medium",
          evidence: "Non è chiaro se l'organizzazione agisca come provider, deployer o entrambi.",
          recommendation: "Mappare ruolo, catena contrattuale e responsabilità AI Act prima di completare l'assessment.",
          documentGap: true,
        }],
      },
    ],
  },
  {
    id: "synthetic_content",
    eyebrow: "Art. 50",
    text: "Il sistema genera, modifica o sintetizza testi, immagini, audio o video?",
    answers: [
      { id: "no", text: "No", riskWeight: 0 },
      {
        id: "text",
        text: "Sì, soprattutto testo",
        riskWeight: 8,
        gaps: [{
          area: "Trasparenza contenuti",
          label: "Output sintetici da verificare",
          severity: "medium",
          evidence: "Il sistema genera contenuti testuali che possono richiedere disclosure o presidio Art. 50.",
          recommendation: "Verificare quando l'utente deve essere informato e quali output devono essere tracciati.",
          documentGap: false,
        }],
      },
      {
        id: "media",
        text: "Sì, immagini, audio o video",
        riskWeight: 14,
        gaps: [{
          area: "Technical marking",
          label: "Contenuti sintetici media",
          severity: "high",
          evidence: "Il sistema genera o manipola media sintetici potenzialmente soggetti a marcatura.",
          recommendation: "Valutare marcatura machine-readable e disclosure visibile per gli output applicabili.",
          documentGap: true,
        }],
      },
      {
        id: "multiple",
        text: "Sì, più tipologie di contenuto",
        riskWeight: 16,
        gaps: [{
          area: "Technical marking",
          label: "Copertura multi-output da documentare",
          severity: "high",
          evidence: "Sono presenti più formati di contenuto generato o modificato dall'AI.",
          recommendation: "Definire una matrice di copertura per testo, immagini, audio e video.",
          documentGap: true,
        }],
      },
    ],
  },
  {
    id: "user_disclosure",
    eyebrow: "Disclosure",
    text: "Gli utenti vengono informati chiaramente quando interagiscono con un sistema AI?",
    answers: [
      { id: "yes", text: "Sì, sempre e in modo visibile", riskWeight: 0 },
      {
        id: "partial",
        text: "Solo in alcuni punti del percorso",
        riskWeight: 10,
        gaps: [{
          area: "Disclosure utente",
          label: "Informativa AI parziale",
          severity: "high",
          evidence: "La disclosure è presente solo in alcune superfici o momenti del percorso.",
          recommendation: "Rendere l'informativa coerente su interfaccia, termini, privacy notice e flussi conversazionali.",
          documentGap: true,
        }],
      },
      {
        id: "no",
        text: "No",
        riskWeight: 18,
        gaps: [{
          area: "Disclosure utente",
          label: "Disclosure AI assente",
          severity: "critical",
          evidence: "L'utente non viene informato dell'interazione con un sistema AI.",
          recommendation: "Inserire una disclosure chiara prima o durante l'interazione, con linguaggio comprensibile.",
          documentGap: true,
        }],
      },
      {
        id: "not_sure",
        text: "Non lo sappiamo",
        riskWeight: 14,
        gaps: [{
          area: "Disclosure utente",
          label: "Disclosure non verificata",
          severity: "high",
          evidence: "Non esiste evidenza interna sulla presenza della disclosure AI.",
          recommendation: "Eseguire una scansione delle superfici utente e produrre evidenza conservabile.",
          documentGap: true,
        }],
      },
    ],
  },
  {
    id: "machine_marking",
    eyebrow: "Marcatura",
    text: "Gli output applicabili hanno una marcatura machine-readable o un meccanismo tecnico equivalente?",
    answers: [
      { id: "yes", text: "Sì, in modo sistematico", riskWeight: 0 },
      {
        id: "partial",
        text: "Solo per alcuni output",
        riskWeight: 10,
        gaps: [{
          area: "Technical marking",
          label: "Marcatura tecnica parziale",
          severity: "high",
          evidence: "La marcatura non copre tutti gli output applicabili.",
          recommendation: "Documentare copertura, eccezioni e controlli tecnici per ogni formato generato.",
          documentGap: true,
        }],
      },
      {
        id: "no",
        text: "No",
        riskWeight: 18,
        gaps: [{
          area: "Technical marking",
          label: "Marcatura tecnica assente",
          severity: "critical",
          evidence: "Non risulta un meccanismo machine-readable sugli output applicabili.",
          recommendation: "Definire il meccanismo tecnico, testarlo e collegarlo alla documentazione Art. 50.",
          documentGap: true,
        }],
      },
      { id: "not_applicable", text: "Non applicabile", riskWeight: 0 },
      {
        id: "not_sure",
        text: "Non sono sicuro",
        riskWeight: 12,
        gaps: [{
          area: "Technical marking",
          label: "Marcatura non verificata",
          severity: "high",
          evidence: "Non è chiaro se gli output contengano una marcatura tecnica verificabile.",
          recommendation: "Eseguire test su output campione e conservare evidenze di rilevabilità.",
          documentGap: true,
        }],
      },
    ],
  },
  {
    id: "robustness_testing",
    eyebrow: "Test",
    text: "Avete testato se la marcatura o la disclosure restano affidabili dopo trasformazioni comuni?",
    answers: [
      { id: "documented", text: "Sì, con risultati documentati", riskWeight: 0 },
      {
        id: "some",
        text: "Abbiamo fatto test informali",
        riskWeight: 8,
        gaps: [{
          area: "Robustness testing",
          label: "Test non formalizzati",
          severity: "medium",
          evidence: "Sono stati svolti test informali, ma senza risultati documentati.",
          recommendation: "Formalizzare test case, campioni, trasformazioni provate e risultati.",
          documentGap: true,
        }],
      },
      {
        id: "no",
        text: "No",
        riskWeight: 14,
        gaps: [{
          area: "Robustness testing",
          label: "Robustezza non testata",
          severity: "high",
          evidence: "Non risultano test sulla persistenza o rilevabilità della marcatura/disclosure.",
          recommendation: "Testare compressione, crop, trascrizione, resize, copy-paste e trasformazioni operative rilevanti.",
          documentGap: true,
        }],
      },
      { id: "not_applicable", text: "Non applicabile", riskWeight: 0 },
    ],
  },
  {
    id: "sensitive_decisions",
    eyebrow: "Rischio",
    text: "Il sistema influenza decisioni su persone in HR, credito, istruzione, servizi essenziali, biometria o ambiti regolati?",
    answers: [
      { id: "no", text: "No", riskWeight: 0 },
      {
        id: "assistive",
        text: "Sì, ma solo come supporto a decisioni umane",
        riskWeight: 10,
        gaps: [{
          area: "Classificazione rischio",
          label: "Impatto decisionale da qualificare",
          severity: "high",
          evidence: "Il sistema supporta decisioni su persone in ambiti potenzialmente sensibili.",
          recommendation: "Documentare ruolo dell'AI, peso dell'output e controllo umano effettivo.",
          documentGap: true,
        }],
      },
      {
        id: "material",
        text: "Sì, incide materialmente sulla decisione",
        riskWeight: 20,
        gaps: [{
          area: "Classificazione rischio",
          label: "Possibile sistema ad alto rischio",
          severity: "critical",
          evidence: "Il sistema incide su decisioni relative a persone fisiche in ambiti regolati.",
          recommendation: "Eseguire classificazione Annex III, verificare esenzioni Art. 6(3) e preparare risk management.",
          documentGap: true,
        }],
      },
      {
        id: "not_sure",
        text: "Non sono sicuro",
        riskWeight: 12,
        gaps: [{
          area: "Classificazione rischio",
          label: "Impatto non mappato",
          severity: "high",
          evidence: "Non è chiaro se l'output AI influenzi decisioni su persone fisiche.",
          recommendation: "Mappare casi d'uso, utenti impattati e decisioni collegate agli output del sistema.",
          documentGap: true,
        }],
      },
    ],
  },
  {
    id: "documentation",
    eyebrow: "Evidenze",
    text: "Esiste documentazione tecnica aggiornata su funzionamento, limiti, dati, test e controlli del sistema?",
    answers: [
      { id: "complete", text: "Sì, completa e aggiornata", riskWeight: 0 },
      {
        id: "partial",
        text: "Parziale",
        riskWeight: 12,
        gaps: [{
          area: "Documentazione tecnica",
          label: "Documentazione incompleta",
          severity: "high",
          evidence: "La documentazione esiste ma non copre tutti gli elementi tecnici e di controllo.",
          recommendation: "Completare scheda sistema, limiti, dati, test, controlli, ruoli e modifiche rilevanti.",
          documentGap: true,
        }],
      },
      {
        id: "none",
        text: "No",
        riskWeight: 18,
        gaps: [{
          area: "Documentazione tecnica",
          label: "Documentazione assente",
          severity: "critical",
          evidence: "Non risulta documentazione tecnica conservabile sul sistema AI.",
          recommendation: "Avviare un dossier tecnico minimo con architettura, finalità, dati, output e controlli.",
          documentGap: true,
        }],
      },
      {
        id: "not_sure",
        text: "Non lo so",
        riskWeight: 14,
        gaps: [{
          area: "Documentazione tecnica",
          label: "Evidenze non censite",
          severity: "high",
          evidence: "Non è chiaro quali documenti siano disponibili e dove siano conservati.",
          recommendation: "Creare un evidence register collegato ai requisiti applicabili.",
          documentGap: true,
        }],
      },
    ],
  },
  {
    id: "owner_plan",
    eyebrow: "Governance",
    text: "Avete un owner interno e un piano di remediation per gli obblighi AI Act?",
    answers: [
      { id: "formal", text: "Sì, owner e piano formalizzati", riskWeight: 0 },
      {
        id: "informal",
        text: "Sì, ma in modo informale",
        riskWeight: 8,
        gaps: [{
          area: "Governance AI Act",
          label: "Owner e piano non formalizzati",
          severity: "medium",
          evidence: "Esiste una responsabilità informale, ma non un piano tracciabile.",
          recommendation: "Assegnare owner, scadenze, priorità, evidenze richieste e prossimo riesame.",
          documentGap: true,
        }],
      },
      {
        id: "none",
        text: "No",
        riskWeight: 14,
        gaps: [{
          area: "Governance AI Act",
          label: "Remediation non assegnata",
          severity: "high",
          evidence: "Non risultano owner o piano operativo per chiudere i gap AI Act.",
          recommendation: "Aprire un piano di remediation con priorità per trasparenza, documentazione e rischio.",
          documentGap: true,
        }],
      },
      {
        id: "not_sure",
        text: "Non sono sicuro",
        riskWeight: 10,
        gaps: [{
          area: "Governance AI Act",
          label: "Responsabilità non chiara",
          severity: "medium",
          evidence: "Non è chiaro chi sia responsabile della remediation AI Act.",
          recommendation: "Chiarire ownership tra legal, compliance, product, engineering e privacy.",
          documentGap: true,
        }],
      },
    ],
  },
];

export function getQuickScanAnswer(questionId: string, answerId: string): QuickScanAnswer | undefined {
  return QUICK_SCAN_QUESTIONS.find((question) => question.id === questionId)
    ?.answers.find((answer) => answer.id === answerId);
}

export function evaluateQuickScan(answers: QuickScanAnswers): QuickScanResult {
  const selected = QUICK_SCAN_QUESTIONS
    .map((question) => getQuickScanAnswer(question.id, answers[question.id]))
    .filter((answer): answer is QuickScanAnswer => Boolean(answer));

  const totalWeight = selected.reduce((sum, answer) => sum + answer.riskWeight, 0);
  const gapsByArea = new Map<string, QuickScanGap>();

  selected.forEach((answer) => {
    answer.gaps?.forEach((gap) => {
      const existing = gapsByArea.get(gap.area);
      if (!existing || severityRank[gap.severity] > severityRank[existing.severity]) {
        gapsByArea.set(gap.area, gap);
      }
    });
  });

  const gaps = Array.from(gapsByArea.values()).sort((a, b) => {
    const bySeverity = severityRank[b.severity] - severityRank[a.severity];
    return bySeverity || a.area.localeCompare(b.area);
  });

  return {
    score: Math.max(0, Math.min(100, 100 - totalWeight)),
    answered: selected.length,
    totalQuestions: QUICK_SCAN_QUESTIONS.length,
    potentialGaps: gaps.length,
    documentGaps: gaps.filter((gap) => gap.documentGap).length,
    criticalAreas: gaps.filter((gap) => gap.severity === "critical").length,
    highPriorityAreas: gaps.filter((gap) => gap.severity === "high").length,
    mediumPriorityAreas: gaps.filter((gap) => gap.severity === "medium").length,
    topGaps: gaps.slice(0, 3),
  };
}
