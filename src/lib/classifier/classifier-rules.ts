/**
 * classifier-rules.ts
 *
 * Configurazione normativa separata dal codice di classificazione.
 * Aggiornare qui quando cambiano le Guidelines o il testo del Regolamento.
 *
 * Fonte: Regolamento (UE) 2024/1689 [verifica contro il testo vigente]
 *        Draft Guidelines Annex I, Annex III, General Principles [verifica]
 */

// ─── Art. 5 — Pratiche vietate (8 fattispecie, lettere (a)–(h)) ──────────────

export interface Art5Practice {
  /** Lettera ufficiale dell'articolo */
  letter: "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h";
  ref: string;
  label: string;
  description: string;
  /** Eccezioni tassative previste dalla norma (se presenti) */
  exceptions?: string[];
  /** Sanzione massima applicabile */
  maxFine: string;
}

export const ART5_PRACTICES: Art5Practice[] = [
  {
    letter: "a",
    ref: "Art. 5(1)(a) EU AI Act",
    label: "Manipolazione subliminale / inganno intenzionale",
    description:
      "Tecniche sublimali al di sotto della soglia di consapevolezza, o tecniche di manipolazione / inganno intenzionale, con l'obiettivo o l'effetto di distorcere materialmente il comportamento di una persona alterandone la capacità di decisione informata.",
    maxFine: "€35.000.000 o 7% fatturato mondiale (il maggiore)",
  },
  {
    letter: "b",
    ref: "Art. 5(1)(b) EU AI Act",
    label: "Sfruttamento vulnerabilità (età, disabilità, situazione socioeconomica)",
    description:
      "Sistemi che sfruttano vulnerabilità di persone fisiche dovute all'età (es. minori, anziani), disabilità o situazione socio-economica specifica, con l'obiettivo o l'effetto di distorcere materialmente il comportamento causando o rischiando danno significativo.",
    maxFine: "€35.000.000 o 7% fatturato mondiale",
  },
  {
    letter: "c",
    ref: "Art. 5(1)(c) EU AI Act",
    label: "Social scoring da autorità pubbliche",
    description:
      "Valutazione o classificazione di persone fisiche da parte di autorità pubbliche (o per loro conto) in base al comportamento sociale o caratteristiche personali in un periodo di tempo, con effetti sfavorevoli in contesti non correlati o trattamento ingiustificato/sproporzionato.",
    maxFine: "€35.000.000 o 7% fatturato mondiale",
  },
  {
    letter: "d",
    ref: "Art. 5(1)(d) EU AI Act",
    label: "Polizia predittiva individuale (solo profilazione/tratti personali)",
    description:
      "Valutazione del rischio che una persona fisica commetta un reato basandosi esclusivamente sul suo profilo o caratteristiche/tratti personali. Eccezione tassativa: sistemi a supporto della valutazione umana basata su fatti obiettivi direttamente collegati all'attività criminale.",
    exceptions: [
      "Supporto alla valutazione umana basata su fatti obiettivi verificabili direttamente collegati all'attività criminale (non sola profilazione)",
    ],
    maxFine: "€35.000.000 o 7% fatturato mondiale",
  },
  {
    letter: "e",
    ref: "Art. 5(1)(e) EU AI Act",
    label: "Scraping non mirato di immagini facciali da internet o CCTV",
    description:
      "Sistemi AI che creano o espandono database di riconoscimento facciale tramite scraping non mirato di immagini facciali da internet o da riprese di videosorveglianza.",
    maxFine: "€35.000.000 o 7% fatturato mondiale",
  },
  {
    letter: "f",
    ref: "Art. 5(1)(f) EU AI Act",
    label: "Riconoscimento emozioni in ambito lavorativo e scolastico",
    description:
      "Sistemi che inferiscono le emozioni di persone fisiche nei luoghi di lavoro o negli istituti scolastici. Eccezioni tassative: motivi medici documentati o sicurezza sul lavoro (es. rilevazione stati di fatica di operatori di macchinari).",
    exceptions: [
      "Uso per motivi medici documentati",
      "Sicurezza sul lavoro (es. rilevazione fatica operatori macchinari)",
    ],
    maxFine: "€35.000.000 o 7% fatturato mondiale",
  },
  {
    letter: "g",
    ref: "Art. 5(1)(g) EU AI Act",
    label: "Categorizzazione biometrica per attributi sensibili",
    description:
      "Sistemi di categorizzazione biometrica che, su base individuale, inferiscono razza, opinioni politiche, appartenenza sindacale, convinzioni religiose o filosofiche, vita sessuale od orientamento sessuale. Eccezioni: labelling/filtering di dataset biometrici lecitamente acquisiti per law enforcement, o categorizzazione conforme al diritto UE nel contrasto.",
    exceptions: [
      "Labelling/filtering di dataset biometrici lecitamente acquisiti nell'ambito di attività di law enforcement",
      "Categorizzazione biometrica conforme al diritto UE nell'ambito del contrasto",
    ],
    maxFine: "€35.000.000 o 7% fatturato mondiale",
  },
  {
    letter: "h",
    ref: "Art. 5(1)(h) EU AI Act",
    label: "Identificazione biometrica remota in tempo reale in spazi pubblici (law enforcement)",
    description:
      "Uso di sistemi RBI (Remote Biometric Identification) in tempo reale in spazi pubblicamente accessibili a fini di contrasto. Eccezioni tassative (richiedono autorizzazione giudiziaria/amministrativa preventiva): (i) ricerca minori scomparsi o vittime di tratta; (ii) prevenzione minacce specifiche/imminenti alla vita o attacchi terroristici; (iii) identificazione di persone sospettate di reati gravi elencati nell'Allegato II.",
    exceptions: [
      "Ricerca di minori scomparsi o vittime di tratta (con autorizzazione preventiva)",
      "Prevenzione di minaccia specifica, sostanziale e imminente alla vita o attacco terroristico (con autorizzazione preventiva)",
      "Identificazione di persona sospettata di reato grave ex Allegato II (con autorizzazione preventiva)",
    ],
    maxFine: "€35.000.000 o 7% fatturato mondiale",
  },
];

// ─── Allegato III — 8 aree ad alto rischio (Art. 6(2)) ───────────────────────

export interface AnnexIIIArea {
  id: number;
  ref: string;
  label: string;
  description: string;
  /** Esempi di sistemi compresi */
  examples: string[];
}

export const ANNEX_III_AREAS: AnnexIIIArea[] = [
  {
    id: 1,
    ref: "Allegato III §1 — Art. 6(2)",
    label: "Biometria",
    description:
      "Sistemi di identificazione biometrica remota diversi da quelli vietati; sistemi di categorizzazione biometrica non vietati; sistemi di riconoscimento delle emozioni.",
    examples: [
      "Sistemi di riconoscimento facciale per accesso a edifici",
      "Sistemi di identificazione dell'umore per applicazioni mediche",
      "Categorizzazione biometrica per finalità non vietate",
    ],
  },
  {
    id: 2,
    ref: "Allegato III §2 — Art. 6(2)",
    label: "Infrastrutture critiche",
    description:
      "Sistemi AI destinati a essere usati come componenti di sicurezza nella gestione e nel funzionamento di infrastrutture critiche (trasporto, acqua, gas, elettricità, reti digitali).",
    examples: [
      "Sistemi di controllo reti elettriche",
      "Gestione traffico aereo automatizzata",
      "Sistemi di controllo reti idriche",
    ],
  },
  {
    id: 3,
    ref: "Allegato III §3 — Art. 6(2)",
    label: "Istruzione e formazione professionale",
    description:
      "Sistemi AI destinati a determinare l'accesso o l'ammissione a istituti di istruzione; valutare l'apprendimento degli studenti; determinare l'idoneità per borse di studio; monitorare e rilevare comportamenti vietati negli studenti durante gli esami.",
    examples: [
      "Sistemi di selezione automatica per università",
      "Software di valutazione dei compiti tramite AI",
      "Sistemi anti-cheating con webcam durante esami",
    ],
  },
  {
    id: 4,
    ref: "Allegato III §4 — Art. 6(2)",
    label: "Occupazione, gestione dei lavoratori e accesso al lavoro autonomo",
    description:
      "Sistemi AI per reclutamento/selezione (es. annunci mirati, screening CV, colloqui), decisioni su promozione/licenziamento, allocazione compiti, monitoraggio prestazioni/comportamento.",
    examples: [
      "Screening automatico di curriculum vitae",
      "Sistemi di ranking dei candidati per selezione",
      "Monitoraggio automatizzato delle prestazioni dei dipendenti",
      "Sistemi di allocazione turni tramite AI",
    ],
  },
  {
    id: 5,
    ref: "Allegato III §5 — Art. 6(2)",
    label: "Accesso a servizi essenziali pubblici e privati; prestazioni pubbliche",
    description:
      "Sistemi AI destinati a valutare l'idoneità, il merito creditizio o la solvibilità di persone fisiche (credit scoring, assicurazione vita/salute); classificare chiamate di emergenza; determinare l'accesso a prestazioni/servizi pubblici essenziali o erogarne il livello.",
    examples: [
      "Credit scoring automatizzato per prestiti bancari",
      "Sistemi di classificazione del rischio assicurativo vita/salute",
      "Triage automatico delle chiamate di emergenza (112)",
      "Sistemi per erogazione automatica sussidi di disoccupazione",
    ],
  },
  {
    id: 6,
    ref: "Allegato III §6 — Art. 6(2)",
    label: "Attività di contrasto",
    description:
      "Sistemi AI destinati a essere usati dalle autorità di polizia o per loro conto: valutazione del rischio individuale di recidiva; profilazione durante indagini; analisi di prove digitali; rilevamento deepfake; previsione di eventi criminali.",
    examples: [
      "Analisi di rischio di recidiva per decisioni di detenzione",
      "Sistemi di analisi video per ricerca prove",
      "Sistemi di predictive policing basati su dati storici",
    ],
  },
  {
    id: 7,
    ref: "Allegato III §7 — Art. 6(2)",
    label: "Migrazione, asilo e gestione del controllo delle frontiere",
    description:
      "Sistemi AI per valutazione del rischio di immigrazione irregolare; esame di domande di asilo; rilevamento di persone; previsione comportamento alle frontiere.",
    examples: [
      "Sistemi di risk assessment per richieste di visto",
      "Analisi automatizzata di domande d'asilo",
      "Sistemi di rilevamento alle frontiere",
    ],
  },
  {
    id: 8,
    ref: "Allegato III §8 — Art. 6(2)",
    label: "Amministrazione della giustizia e processi democratici",
    description:
      "Sistemi AI destinati a assistere autorità giudiziarie nella ricerca e interpretazione di fatti e leggi; nella valutazione dell'affidabilità delle prove; o nell'influenzare i processi elettorali.",
    examples: [
      "Sistemi di supporto alle decisioni giudiziarie",
      "Analisi automatizzata delle prove in procedimenti penali",
      "Sistemi di targeting elettorale tramite AI",
    ],
  },
];

// ─── Art. 6(3) — 4 eccezioni (declassamento da candidato alto rischio) ────────

export interface Art63Exception {
  id: "narrow_procedural" | "human_improvement" | "pattern_detection" | "preparatory_task";
  ref: string;
  label: string;
  description: string;
  condition: string;
  /** L'eccezione è sempre bloccata dalla presenza di profilazione */
  blockedByProfiling: true;
}

export const ART63_EXCEPTIONS: Art63Exception[] = [
  {
    id: "narrow_procedural",
    ref: "Art. 6(3)(a) EU AI Act",
    label: "Compito procedurale ristretto",
    description:
      "Il sistema AI è destinato a svolgere un compito procedurale strettamente definito con margine di manovra limitato.",
    condition:
      "Il sistema NON effettua valutazioni, classificazioni o giudizi autonomi su persone fisiche.",
    blockedByProfiling: true,
  },
  {
    id: "human_improvement",
    ref: "Art. 6(3)(b) EU AI Act",
    label: "Miglioramento del risultato di un'attività umana già completata",
    description:
      "Il sistema AI è destinato a migliorare il risultato di un'attività umana già completata, senza influenzare la valutazione umana alla base di tale attività.",
    condition:
      "Il sistema opera DOPO che una decisione umana sostanziale è stata presa e non la sostituisce né la condiziona.",
    blockedByProfiling: true,
  },
  {
    id: "pattern_detection",
    ref: "Art. 6(3)(c) EU AI Act",
    label: "Rilevamento di schemi decisionali o deviazioni",
    description:
      "Il sistema AI è destinato a rilevare schemi decisionali o deviazioni da schemi decisionali precedenti senza sostituire o influenzare la valutazione umana precedentemente effettuata.",
    condition:
      "Il sistema NON produce output che sostituiscono o influenzano il giudizio umano.",
    blockedByProfiling: true,
  },
  {
    id: "preparatory_task",
    ref: "Art. 6(3)(d) EU AI Act",
    label: "Compito preparatorio per valutazione umana successiva",
    description:
      "Il sistema AI è destinato a svolgere un compito preparatorio per la valutazione rilevante ai fini dell'utilizzo indicato nell'Allegato III.",
    condition:
      "La valutazione rilevante (e la decisione finale) è effettuata ESCLUSIVAMENTE da un essere umano senza che il sistema AI abbia influenza determinante.",
    blockedByProfiling: true,
  },
];

// ─── Allegato I — Normative di armonizzazione UE (Art. 6(1)) ─────────────────

export interface AnnexIProduct {
  id: string;
  ref: string;
  label: string;
  examples: string[];
}

export const ANNEX_I_PRODUCTS: AnnexIProduct[] = [
  {
    id: "machinery",
    ref: "Reg. (UE) 2023/1230 — Macchinari",
    label: "Macchinari industriali e di consumo",
    examples: ["Robot industriali", "Macchine utensili", "Ascensori"],
  },
  {
    id: "medical_devices",
    ref: "Reg. (UE) 2017/745 — Dispositivi medici",
    label: "Dispositivi medici (MDR)",
    examples: ["Software diagnostico CE", "Dispositivi impiantabili con AI"],
  },
  {
    id: "ivd",
    ref: "Reg. (UE) 2017/746 — Dispositivi medico-diagnostici in vitro",
    label: "Dispositivi medico-diagnostici in vitro (IVDR)",
    examples: ["Analizzatori automatici con AI", "Test diagnostici molecolari"],
  },
  {
    id: "aviation",
    ref: "Reg. (UE) 2018/1139 — Aviazione civile",
    label: "Prodotti aeronautici",
    examples: ["Sistemi avionici con AI", "Software di controllo volo"],
  },
  {
    id: "automotive",
    ref: "Reg. (UE) 2019/2144 — Veicoli a motore",
    label: "Veicoli a motore e loro rimorchi",
    examples: ["ADAS (Advanced Driver Assistance)", "Sistemi di guida autonoma"],
  },
  {
    id: "marine",
    ref: "Dir. 2014/90/UE — Attrezzature marine",
    label: "Attrezzature marine",
    examples: ["Sistemi di navigazione autonoma navale"],
  },
  {
    id: "railway",
    ref: "Dir. (UE) 2016/797 — Ferroviario",
    label: "Sistema ferroviario (interoperabilità)",
    examples: ["Sistemi di controllo treno automatizzati (ETCS)"],
  },
  {
    id: "explosives",
    ref: "Dir. 2014/28/UE — Esplosivi civili",
    label: "Esplosivi per uso civile",
    examples: ["Sistemi di rilevamento automatico esplosivi"],
  },
  {
    id: "toys",
    ref: "Dir. 2009/48/CE — Sicurezza dei giocattoli",
    label: "Giocattoli",
    examples: ["Giocattoli connessi con AI e interazione vocale"],
  },
  {
    id: "lifts",
    ref: "Dir. 2014/33/UE — Ascensori",
    label: "Ascensori e componenti di sicurezza",
    examples: ["Sistemi di supervisione ascensori tramite AI"],
  },
];

// ─── Mappa articoli → obblighi per ruolo ─────────────────────────────────────

export interface ArticleObligation {
  article: string;
  ref: string;
  description: string;
  obligation: string;
  applies: Array<"provider" | "deployer" | "importer" | "distributor" | "authorized_rep" | "product_manufacturer">;
  deadline?: string;
  toolHref?: string;
}

export const ARTICLE_OBLIGATIONS: ArticleObligation[] = [
  // Alto rischio — provider (Capo III, Sezione 2)
  {
    article: "Art. 9",
    ref: "Art. 9 EU AI Act",
    description: "Sistema di gestione del rischio",
    obligation: "Obbligatorio, continuo e documentato per tutta la durata del ciclo di vita",
    applies: ["provider"],
    toolHref: "/dashboard/tools/risk-manager",
  },
  {
    article: "Art. 10",
    ref: "Art. 10 EU AI Act",
    description: "Governance dei dati di addestramento",
    obligation: "Qualità, provenienza, bias mitigation, copertura geografica",
    applies: ["provider"],
    toolHref: "/dashboard/tools/data-audit",
  },
  {
    article: "Art. 11",
    ref: "Art. 11 EU AI Act",
    description: "Documentazione tecnica (Annex IV)",
    obligation: "Obbligatoria prima dell'immissione sul mercato",
    applies: ["provider"],
    toolHref: "/dashboard/tools/docugen",
  },
  {
    article: "Art. 12",
    ref: "Art. 12 EU AI Act",
    description: "Registrazione automatica (logging)",
    obligation: "Log automatici per tutta la durata del funzionamento",
    applies: ["provider"],
    toolHref: "/dashboard/tools/logvault",
  },
  {
    article: "Art. 13",
    ref: "Art. 13 EU AI Act",
    description: "Trasparenza e fornitura di informazioni",
    obligation: "Istruzioni per l'uso con metriche di performance e limitazioni",
    applies: ["provider"],
  },
  {
    article: "Art. 14",
    ref: "Art. 14 EU AI Act",
    description: "Supervisione umana",
    obligation: "Meccanismi di override e supervisione da parte di persone fisiche",
    applies: ["provider", "deployer"],
    toolHref: "/dashboard/tools/oversight",
  },
  {
    article: "Art. 15",
    ref: "Art. 15 EU AI Act",
    description: "Accuratezza, robustezza e cybersicurezza",
    obligation: "Testing obbligatorio, resilienza ad attacchi avversariali",
    applies: ["provider"],
  },
  {
    article: "Art. 17",
    ref: "Art. 17 EU AI Act",
    description: "Sistema di gestione della qualità (QMS)",
    obligation: "Policy, procedure e risorse per conformità continua",
    applies: ["provider"],
  },
  {
    article: "Art. 22",
    ref: "Art. 22 EU AI Act",
    description: "Rappresentante autorizzato",
    obligation: "Provider stabiliti fuori UE devono nominare un rappresentante autorizzato nell'UE",
    applies: ["authorized_rep"],
  },
  {
    article: "Art. 25",
    ref: "Art. 25 EU AI Act",
    description: "Provider di fatto (product manufacturer / integrator)",
    obligation: "Chi immette sul mercato un sistema come proprio o lo modifica sostanzialmente assume gli obblighi del provider",
    applies: ["product_manufacturer"],
  },
  {
    article: "Art. 26",
    ref: "Art. 26 EU AI Act",
    description: "Obblighi dei deployer",
    obligation: "9 obblighi specifici: verifica conformità, supervisione umana, monitoraggio, log retention, FRIA se applicabile",
    applies: ["deployer"],
    toolHref: "/dashboard/tools/deployer",
  },
  {
    article: "Art. 27",
    ref: "Art. 27 EU AI Act",
    description: "FRIA (Fundamental Rights Impact Assessment)",
    obligation: "Obbligatoria per i deployer che siano enti pubblici o operatori di servizi essenziali prima dell'uso",
    applies: ["deployer"],
    toolHref: "/dashboard/tools/fria",
  },
  {
    article: "Art. 43",
    ref: "Art. 43 EU AI Act",
    description: "Conformity Assessment",
    obligation: "Self-assessment (Annex III salvo biometria/infrastrutture critiche/Allegato I) o Notified Body",
    applies: ["provider"],
  },
  {
    article: "Art. 47",
    ref: "Art. 47 EU AI Act",
    description: "Dichiarazione di conformità EU",
    obligation: "Obbligatoria prima dell'immissione sul mercato",
    applies: ["provider"],
  },
  {
    article: "Art. 49",
    ref: "Art. 49 EU AI Act",
    description: "Registrazione nel database EU (EUDB)",
    obligation: "Obbligatoria per provider alto rischio prima dell'immissione sul mercato",
    applies: ["provider", "deployer"],
  },
  // GPAI
  {
    article: "Art. 53",
    ref: "Art. 53 EU AI Act",
    description: "Obblighi provider GPAI",
    obligation: "Documentazione tecnica, copyright policy, sommario dati addestramento",
    applies: ["provider"],
  },
  {
    article: "Art. 55",
    ref: "Art. 55 EU AI Act",
    description: "Obblighi aggiuntivi rischio sistemico GPAI",
    obligation: "Model evaluation, adversarial testing, incident reporting, cybersecurity",
    applies: ["provider"],
  },
  // Trasparenza
  {
    article: "Art. 50",
    ref: "Art. 50 EU AI Act",
    description: "Obblighi di trasparenza",
    obligation: "Disclosure chatbot; marcatura contenuti sintetici; informativa riconoscimento emozioni; marcatura testi AI di interesse pubblico",
    applies: ["provider", "deployer"],
    deadline: "2 agosto 2026",
  },
  // Sanzioni
  {
    article: "Art. 99",
    ref: "Art. 99 EU AI Act",
    description: "Sanzioni",
    obligation: "Art.5: fino a €35M/7%; alto rischio: fino a €15M/3%; informazioni inesatte: fino a €7,5M/1%",
    applies: ["provider", "deployer", "importer", "distributor"],
  },
];

// ─── Definizione AI System (Art. 3(1)) — tratti discriminanti ────────────────

export interface AISystemTrait {
  id: string;
  label: string;
  description: string;
  required: boolean;
}

export const AI_SYSTEM_TRAITS: AISystemTrait[] = [
  {
    id: "machine_learning",
    label: "Apprendimento automatico / inferenza statistica",
    description: "Il sistema utilizza ML, deep learning, modelli statistici o reti neurali per produrre output.",
    required: false,
  },
  {
    id: "autonomous_output",
    label: "Output che influenza ambienti fisici o virtuali",
    description: "Il sistema produce previsioni, raccomandazioni, decisioni o contenuti che influenzano contesti reali.",
    required: true,
  },
  {
    id: "not_purely_deterministic",
    label: "Non puramente deterministico / basato su regole fisse",
    description: "Il sistema non si limita a eseguire regole programmate esplicitamente senza nessuna inferenza.",
    required: false,
  },
];

// ─── Ambito Art. 2 — casi di esclusione ──────────────────────────────────────

export interface ScopeExclusion {
  id: string;
  ref: string;
  label: string;
  description: string;
}

export const SCOPE_EXCLUSIONS: ScopeExclusion[] = [
  {
    id: "military",
    ref: "Art. 2(3) EU AI Act",
    label: "Finalità militari, difesa e sicurezza nazionale",
    description: "Sistemi sviluppati o usati esclusivamente per finalità militari, di difesa o di sicurezza nazionale da parte degli Stati Membri.",
  },
  {
    id: "research_premarket",
    ref: "Art. 2(6) EU AI Act",
    label: "Ricerca e sviluppo pre-immissione sul mercato",
    description: "Sistemi AI esclusivamente in fase di ricerca e sviluppo scientifico, non ancora messi a disposizione del mercato o in servizio.",
  },
  {
    id: "personal_nonprofessional",
    ref: "Art. 2(10) EU AI Act",
    label: "Uso personale non professionale",
    description: "Persone fisiche che utilizzano sistemi AI per finalità puramente personali, non professionali.",
  },
  {
    id: "foss_no_high_risk",
    ref: "Art. 2(12) EU AI Act",
    label: "Software open source (con condizioni)",
    description: "Componenti software open source non distribuiti come sistemi ad alto rischio né come GPAI, e non usati dal provider stesso in sistemi ad alto rischio.",
  },
];
