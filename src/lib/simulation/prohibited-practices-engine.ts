// Prohibited Practices Engine — Art. 5 AI Act (in vigore dal 2 feb 2025)

export interface ProhibitedCheck {
  id: string;
  article: string;
  title: string;
  description: string;
  question: string;
  exampleSystems: string[];
  exceptions: string[];
  severity: "absolute" | "conditional";
}

export const PROHIBITED_CHECKS: ProhibitedCheck[] = [
  {
    id: "subliminal",
    article: "Art. 5.1.a",
    title: "Manipolazione subliminale",
    description:
      "Sistemi AI che usano tecniche subliminali, subliminari o ingannevoli per alterare il comportamento di una persona in modo che non ne sia consapevole, causandole o potendole causare danno.",
    question:
      "Il tuo sistema mostra contenuti o messaggi progettati per influenzare le decisioni delle persone senza che ne siano consapevoli (es. messaggi nascosti, nudge manipolativi, dark patterns AI-driven)?",
    exampleSystems: [
      "Sistemi di pricing dinamico che inducono acquisti impulsivi tramite urgenza artificiale",
      "Algoritmi di feed che sfruttano bias cognitivi per massimizzare engagement compulsivo",
      "Chatbot che imitano emozioni per manipolare decisioni d'acquisto vulnerabili",
    ],
    exceptions: [],
    severity: "absolute",
  },
  {
    id: "vulnerability",
    article: "Art. 5.1.b",
    title: "Sfruttamento vulnerabilità",
    description:
      "Sistemi AI che sfruttano le vulnerabilità di specifici gruppi (minori, anziani, persone con disabilità) per alterarne il comportamento in modo dannoso.",
    question:
      "Il tuo sistema è progettato per, o potrebbe essere usato per, sfruttare la vulnerabilità di minori, persone anziane, o persone con disabilità psicologiche per influenzarne le decisioni a loro danno?",
    exampleSystems: [
      "App per bambini con AI che promuove acquisti in-app usando meccanismi di dipendenza",
      "Sistemi di vendita che targettizzano persone in stato di difficoltà finanziaria",
      "Algoritmi che sfruttano disturbi alimentari o comportamentali per aumentare engagement",
    ],
    exceptions: [],
    severity: "absolute",
  },
  {
    id: "social_scoring",
    article: "Art. 5.1.c",
    title: "Social scoring pubblico",
    description:
      "Sistemi di valutazione o classificazione delle persone da parte di autorità pubbliche (o per loro conto) basati su comportamento sociale o caratteristiche personali, che portano a trattamenti pregiudizievoli.",
    question:
      "Il tuo sistema è usato da o per conto di autorità pubbliche per assegnare punteggi ai cittadini in base al loro comportamento sociale, generando accesso differenziato a servizi, opportunità o sanzioni?",
    exampleSystems: [
      "Sistemi di rating cittadino per accesso a servizi pubblici",
      "Piattaforme di scoring comportamentale per PA che limitano diritti",
      "Algoritmi di affidabilità civica per appalti o finanziamenti pubblici",
    ],
    exceptions: [],
    severity: "absolute",
  },
  {
    id: "emotion_recognition",
    article: "Art. 5(1)(f) [verify against current AI Act text]",
    title: "Riconoscimento emozioni lavoro/scuola",
    description:
      "Sistemi che inferiscono le emozioni di una persona fisica nei luoghi di lavoro e negli istituti di istruzione, salvo per motivi medici o di sicurezza. [verify against current AI Act text]",
    question:
      "Il tuo sistema rileva, classifica o inferisce lo stato emotivo di dipendenti (in ufficio, da remoto, in magazzino) o di studenti durante lezioni o esami?",
    exampleSystems: [
      "Software di monitoring remoto che analizza espressioni facciali dei dipendenti in smartworking",
      "Sistemi di sorveglianza in aula che misurano attenzione tramite facial analysis",
      "Tool HR che analizzano emozioni nelle video-interviste per la selezione",
    ],
    exceptions: [
      "Uso per motivi medici o di sicurezza [verify against current AI Act text]",
    ],
    severity: "conditional",
  },
  {
    id: "biometric_categorization",
    article: "Art. 5(1)(g) [verify against current AI Act text]",
    title: "Categorizzazione biometrica — attributi sensibili",
    description:
      "Sistemi di categorizzazione biometrica che classificano individualmente le persone fisiche sulla base di dati biometrici per dedurre o inferire razza, opinioni politiche, appartenenza sindacale, convinzioni religiose o filosofiche, vita sessuale o orientamento sessuale. [verify against current AI Act text]",
    question:
      "Il tuo sistema usa dati biometrici (volto, voce, andatura, iride) per classificare individualmente le persone in base a etnia, religione, orientamento sessuale, opinioni politiche o sindacali?",
    exampleSystems: [
      "Sistemi di analisi del volto per inferire etnia a fini di targeting pubblicitario",
      "Tool di voice analysis per rilevare accento e inferire nazionalità",
      "Algoritmi che categorizzano persone per orientamento sessuale da immagini",
    ],
    exceptions: [
      "Labelling/filtering di dataset biometrici lecitamente acquisiti, senza categorizzazione individuale di persone [verify against current AI Act text]",
      "Categorizzazione biometrica nell'ambito di attività di contrasto (law enforcement) [verify against current AI Act text]",
    ],
    severity: "conditional",
  },
  {
    id: "criminal_prediction",
    article: "Art. 5.1.g",
    title: "Predizione rischio criminale individuale",
    description:
      "Sistemi AI usati da autorità pubbliche per valutare il rischio che una persona commetta reati, basandosi unicamente su profiling o valutazione di tratti della personalità.",
    question:
      "Il tuo sistema è usato da forze dell'ordine o autorità giudiziarie per predire la probabilità che una specifica persona commetta un reato in futuro, basandosi su profiling comportamentale o tratti personali?",
    exampleSystems: [
      "Software predittivo per polizia che assegna score di rischio criminale individuali",
      "Sistemi di parole anticipate basati su profili psicologici AI",
      "Tool di screening aeroportuale che classificano passeggeri per rischio terrorismo tramite comportamento",
    ],
    exceptions: [
      "Sistemi basati esclusivamente su dati oggettivi verificabili (non profiling)",
    ],
    severity: "conditional",
  },
  {
    id: "facial_scraping",
    article: "Art. 5.1.h",
    title: "Database riconoscimento facciale da scraping",
    description:
      "Sistemi che creano o espandono database di riconoscimento facciale tramite scraping non mirato di immagini da internet o CCTV.",
    question:
      "Il tuo sistema raccoglie, aggrega o usa immagini di volti scaricate da internet, social media o telecamere di sorveglianza per costruire o ampliare database di riconoscimento facciale?",
    exampleSystems: [
      "Sistemi che scaricano foto da LinkedIn/Facebook per costruire database facciali",
      "Tool che aggregano frame da CCTV pubbliche per creare profili biometrici",
      "Servizi di reverse image search biometrica basati su scraping massivo",
    ],
    exceptions: [],
    severity: "absolute",
  },
  {
    id: "realtime_biometric",
    article: "Art. 5.1.d",
    title: "Identificazione biometrica real-time in spazi pubblici",
    description:
      "Sistemi di identificazione biometrica in tempo reale in spazi accessibili al pubblico, usati da o per autorità di law enforcement.",
    question:
      "Il tuo sistema identifica persone in tempo reale tramite dati biometrici (es. riconoscimento facciale) in luoghi pubblici, usato da o per forze dell'ordine o sicurezza pubblica?",
    exampleSystems: [
      "Telecamere con facial recognition in stazioni/aeroporti per polizia",
      "Sistemi di sorveglianza biometrica real-time in eventi pubblici",
      "Droni con identificazione facciale usati in operazioni di sicurezza pubblica",
    ],
    exceptions: [
      "Ricerca di vittime di traffico umano, sequestro, scomparsa",
      "Minaccia terroristica specifica e imminente documentata",
      "Localizzazione/identificazione di sospettati per reati gravi (con autorizzazione giudiziaria)",
    ],
    severity: "conditional",
  },
];

export type CheckAnswer = "yes" | "no" | "unsure" | null;

export interface CheckResult {
  checkId: string;
  answer: CheckAnswer;
}

export type VerdictType = "violation" | "potential_violation" | "conditional" | "clear";

export interface FinalVerdict {
  verdict: VerdictType;
  violatedChecks: ProhibitedCheck[];
  potentialChecks: ProhibitedCheck[];
  clearChecks: ProhibitedCheck[];
  summaryText: string;
  recommendedAction: string;
  generatedAt: string;
}

export function calculateVerdict(
  checks: ProhibitedCheck[],
  answers: CheckResult[]
): FinalVerdict {
  const answersMap = Object.fromEntries(answers.map((a) => [a.checkId, a.answer]));

  const violated = checks.filter(
    (c) => answersMap[c.id] === "yes" && c.severity === "absolute"
  );
  const potential = checks.filter(
    (c) =>
      (answersMap[c.id] === "yes" && c.severity === "conditional") ||
      answersMap[c.id] === "unsure"
  );
  const clear = checks.filter((c) => answersMap[c.id] === "no");

  let verdict: VerdictType;
  let summaryText: string;
  let recommendedAction: string;

  if (violated.length > 0) {
    verdict = "violation";
    summaryText = `Il tuo sistema presenta ${violated.length} violazione${violated.length > 1 ? "i" : ""} dell'Art. 5 già in vigore dal 2 febbraio 2025. Le pratiche identificate sono vietate in modo assoluto dal Regolamento UE 2024/1689.`;
    recommendedAction =
      "Consulta immediatamente un legale specializzato in AI Act. Le sanzioni per violazione dell'Art. 5 arrivano fino a 35 milioni di euro o il 7% del fatturato globale annuo.";
  } else if (potential.length > 0) {
    verdict = "potential_violation";
    summaryText = `Il tuo sistema presenta ${potential.length} area${potential.length > 1 ? "e" : ""} di rischio potenziale che richiede${potential.length > 1 ? "ono" : ""} analisi approfondita. Alcune pratiche sono consentite solo con eccezioni specifiche.`;
    recommendedAction =
      "Fai un'analisi legale delle eccezioni applicabili. Documenta le misure di mitigazione nel Risk Manager e nel FRIA.";
  } else if (clear.length === checks.length) {
    verdict = "clear";
    summaryText =
      "Il tuo sistema non sembra ricadere nelle pratiche vietate dall'Art. 5. Puoi procedere con la valutazione del livello di rischio (Art. 6).";
    recommendedAction =
      "Procedi con l'AI Classifier per determinare il tuo livello di rischio complessivo.";
  } else {
    verdict = "conditional";
    summaryText =
      "Hai risposto 'non so' ad alcune domande. Completa la valutazione con informazioni più precise sul tuo sistema.";
    recommendedAction =
      "Rivedi le specifiche tecniche del tuo sistema e ripeti la valutazione con risposte certe.";
  }

  return {
    verdict,
    violatedChecks: violated,
    potentialChecks: potential,
    clearChecks: clear,
    summaryText,
    recommendedAction,
    generatedAt: new Date().toISOString(),
  };
}
