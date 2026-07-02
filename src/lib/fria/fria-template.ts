/**
 * fria-template.ts
 * Domande guidate per la FRIA — Fase 1 (Analisi del Contesto).
 * Ogni GuidedQ mappa a un campo di FRIAContext (mapsTo = chiave di context).
 * Cluster A: contesto di deployment · Cluster B: caratteristiche AI · Cluster C: governance
 *
 * FONTI: AI Act Art. 27; GDPR Art. 35; WP29/EDPB linee guida DPIA.
 */

import type { GuidedQ } from "@/lib/guided/guided-types";

export const FRIA_GUIDED_QUESTIONS: GuidedQ[] = [
  // ── Cluster A — Contesto di deployment ────────────────────────────────────
  {
    id: "f_intended_purpose_match",
    ref: "AI Act Art. 27(1)(a)",
    question: "L'uso del sistema AI corrisponde alla finalità prevista dal deployer/fornitore?",
    mapsTo: "intended_purpose_match",
    answerType: "yes_no_partial",
    required: true,
    examples: [
      { label: "Sì —", text: "Il sistema viene impiegato esattamente per la finalità dichiarata dal fornitore nella documentazione tecnica." },
      { label: "No —", text: "Il sistema viene usato per scopi che divergono da quelli previsti dal fornitore (es. esteso ad altri contesti organizzativi)." },
      { label: "Parzialmente —", text: "Il sistema è utilizzato per la finalità principale ma con alcune estensioni non previste in modo esplicito." },
    ],
  },
  {
    id: "f_intended_purpose_explanation",
    ref: "AI Act Art. 27(1)(a)",
    question: "Descrivi la corrispondenza o le discrepanze tra uso effettivo e finalità dichiarata.",
    mapsTo: "intended_purpose_explanation",
    answerType: "free_text",
    required: false,
    examples: [
      { label: "Esempio —", text: "Il sistema è impiegato per la selezione iniziale dei CV come previsto; si è tuttavia esteso il suo utilizzo per ranking in fasi successive non originariamente previste." },
    ],
  },
  {
    id: "f_timeframe",
    ref: "AI Act Art. 27(1)(b)",
    question: "Qual è il periodo/timeframe di utilizzo del sistema AI?",
    mapsTo: "timeframe",
    answerType: "free_text",
    required: true,
    examples: [
      { label: "Esempio —", text: "2025–2027 (contratto di licenza triennale, con revisione annuale)." },
      { label: "Esempio —", text: "Da giugno 2025, a tempo indeterminato con revisione ogni 12 mesi." },
    ],
  },
  {
    id: "f_frequency",
    ref: "AI Act Art. 27(1)(b)",
    question: "Con quale frequenza viene utilizzato il sistema AI?",
    mapsTo: "frequency",
    answerType: "choices",
    choices: ["Quotidiana", "Settimanale", "Mensile", "Occasionale"],
    required: true,
    examples: [
      { label: "Quotidiana —", text: "Il sistema è attivo 24/7 e ogni decisione di accesso al servizio passa attraverso di esso." },
      { label: "Mensile —", text: "Il sistema viene interrogato una volta al mese per la generazione di report di performance." },
    ],
  },
  {
    id: "f_legal_basis",
    ref: "GDPR Art. 6 / Art. 9",
    question: "Qual è la base giuridica per il trattamento dei dati personali nell'ambito del sistema AI?",
    mapsTo: "legal_basis",
    answerType: "free_text",
    required: true,
    examples: [
      { label: "Esempio —", text: "Art. 6(1)(e) GDPR — esecuzione di un compito di interesse pubblico; il sistema è integrato nei processi di un'amministrazione pubblica." },
      { label: "Esempio —", text: "Art. 6(1)(b) GDPR — esecuzione di un contratto con l'interessato; il sistema gestisce l'accesso a servizi contrattuali." },
      { label: "Esempio —", text: "Art. 6(1)(a) GDPR — consenso esplicito degli interessati, raccolto tramite informativa dedicata." },
    ],
  },
  {
    id: "f_dpia_done",
    ref: "GDPR Art. 35",
    question: "È stata effettuata una DPIA per questo sistema AI?",
    mapsTo: "dpia_done",
    answerType: "choices",
    choices: ["Sì", "No", "In corso"],
    required: true,
    examples: [
      { label: "Sì —", text: "La DPIA è stata completata in data 15/03/2025 e approvata dal DPO. Documento disponibile nel dossier di compliance." },
      { label: "In corso —", text: "La DPIA è in fase di redazione; si prevede il completamento entro 60 giorni dall'avvio del progetto." },
      { label: "No —", text: "Non è richiesta una DPIA in quanto il sistema non soddisfa i criteri WP248 (meno di 2 criteri attivi)." },
    ],
  },
  {
    id: "f_main_users",
    ref: "AI Act Art. 27(1)(c)",
    question: "Chi sono i principali utilizzatori del sistema AI?",
    mapsTo: "main_users",
    answerType: "free_text",
    required: true,
    examples: [
      { label: "Esempio —", text: "HR Business Partner e responsabili di selezione — circa 45 utenti interni autorizzati." },
      { label: "Esempio —", text: "Operatori del servizio clienti (customer care) di livello 1 e 2." },
      { label: "Esempio —", text: "Medici specialisti e personale infermieristico del reparto oncologico." },
    ],
  },
  {
    id: "f_affected_persons",
    ref: "AI Act Art. 27(1)(c)",
    question: "Chi sono le persone interessate o potenzialmente impattate dalle decisioni del sistema AI?",
    mapsTo: "affected_persons",
    answerType: "free_text",
    required: true,
    examples: [
      { label: "Esempio —", text: "Candidati che si sono candidati a posizioni aperte nell'organizzazione (stima: 5.000 persone/anno)." },
      { label: "Esempio —", text: "Clienti retail che richiedono accesso al credito o prodotti finanziari (stima: 200.000 posizioni)." },
      { label: "Esempio —", text: "Pazienti del SSN che accedono a percorsi diagnostici supportati da AI (stima: 80.000 pazienti)." },
    ],
  },
  {
    id: "f_legal_framework",
    ref: "AI Act Art. 27(1)(a)",
    question: "Quale quadro normativo e regolatorio è applicabile al contesto di deployment?",
    mapsTo: "legal_framework",
    answerType: "free_text",
    required: true,
    examples: [
      { label: "Esempio —", text: "AI Act (Reg. UE 2024/1689), GDPR, D.Lgs. 196/2003 (Codice Privacy), normativa settoriale bancaria (Direttiva CRD IV)." },
      { label: "Esempio —", text: "AI Act, GDPR, normativa sanitaria nazionale (D.Lgs. 502/1992), linee guida AIFA per sistemi AI diagnostici." },
    ],
  },
  {
    id: "f_complaint_mechanisms",
    ref: "AI Act Art. 27(1)(d) / Art. 86",
    question: "Quali meccanismi di reclamo sono disponibili per le persone interessate?",
    mapsTo: "complaint_mechanisms",
    answerType: "free_text",
    required: true,
    examples: [
      { label: "Esempio —", text: "Modulo di reclamo online sul portale aziendale; risposta garantita entro 30 giorni. Recours possibile all'Autorità Garante." },
      { label: "Esempio —", text: "Sportello DPO (dpo@azienda.it); procedura interna di revisione delle decisioni entro 15 giorni; escalation al Garante Privacy." },
    ],
  },

  // ── Cluster B — Caratteristiche del sistema AI ─────────────────────────────
  {
    id: "f_technology_overview",
    ref: "AI Act Art. 27(1)(b)",
    question: "Descrivi la tecnologia del sistema AI: tipo di modello, funzionalità principali e architettura.",
    mapsTo: "technology_overview",
    answerType: "free_text",
    required: true,
    examples: [
      { label: "Esempio —", text: "Sistema basato su modello NLP transformer (BERT fine-tuned) per analisi semantica dei CV. Input: testo strutturato e non strutturato. Output: ranking candidati su scala 0–100." },
      { label: "Esempio —", text: "Modello di classificazione XGBoost addestrato su dati storici di concessione crediti. Input: variabili finanziarie e comportamentali. Output: scoring creditizio binario (approvato/non approvato)." },
    ],
  },
  {
    id: "f_has_generative_component",
    ref: "AI Act Art. 3(34)",
    question: "Il sistema AI include una componente generativa (LLM, modello diffusivo, GPAI)?",
    mapsTo: "has_generative_component",
    answerType: "yes_no",
    required: true,
    examples: [
      { label: "Sì —", text: "Il sistema include un LLM (es. GPT-4) per la generazione di sintesi dei CV e raccomandazioni testuali." },
      { label: "No —", text: "Il sistema non include componenti generative; si tratta di un classificatore discriminativo puro." },
    ],
  },
  {
    id: "f_training_data_types",
    ref: "AI Act Art. 10",
    question: "Quali tipi di dati sono stati usati per addestrare il sistema AI?",
    mapsTo: "training_data_types",
    answerType: "free_text",
    required: false,
    examples: [
      { label: "Esempio —", text: "Testi di CV e lettere di presentazione (500k campioni anonimizzati), dati di assunzione storica (10 anni)." },
      { label: "Esempio —", text: "Dataset pubblici Common Crawl + dataset proprietario di richieste creditizie (5M record, pre-2022)." },
    ],
  },
  {
    id: "f_bias_assessed",
    ref: "AI Act Art. 9(7) / Art. 10(2)(f)",
    question: "Il sistema è stato valutato per possibili bias nei confronti di gruppi protetti?",
    mapsTo: "bias_assessed",
    answerType: "yes_no_partial",
    required: true,
    examples: [
      { label: "Sì —", text: "È stata condotta un'analisi di equità (fairness audit) con test di disparate impact ratio su genere, età, nazionalità. Risultati documentati nel technical report." },
      { label: "Parzialmente —", text: "Il bias è stato valutato solo per genere, non per altre caratteristiche protette." },
      { label: "No —", text: "Non è stata ancora condotta un'analisi formale di bias. È pianificata per il Q3 2025." },
    ],
  },
  {
    id: "f_processes_personal_data",
    ref: "GDPR Art. 4(1) / AI Act Art. 27(1)(a)",
    question: "Il sistema AI tratta dati personali?",
    mapsTo: "processes_personal_data",
    answerType: "yes_no",
    required: true,
    examples: [
      { label: "Sì —", text: "Il sistema elabora dati identificativi, anagrafici e comportamentali degli utenti in modo diretto." },
      { label: "No —", text: "Il sistema opera esclusivamente su dati aggregati e anonimi; nessun dato personale viene elaborato." },
    ],
  },
  {
    id: "f_gdpr_processing_compliant",
    ref: "GDPR Art. 5 / AI Act Art. 27",
    question: "Il trattamento dei dati personali nel sistema AI è conforme al GDPR?",
    mapsTo: "gdpr_processing_compliant",
    answerType: "yes_no_partial",
    required: true,
    examples: [
      { label: "Sì —", text: "Il trattamento è stato verificato dal DPO: base giuridica identificata, informativa agli interessati fornita, misure di sicurezza adeguate implementate." },
      { label: "Parzialmente —", text: "La base giuridica e la minimizzazione dei dati sono conformi, ma i periodi di conservazione devono essere aggiornati." },
      { label: "No —", text: "Sono stati identificati gap di conformità GDPR in corso di risoluzione." },
    ],
  },
  {
    id: "f_accuracy_acceptable",
    ref: "AI Act Art. 9(4) / Art. 15",
    question: "Il livello di accuratezza del sistema AI è accettabile per il contesto di utilizzo?",
    mapsTo: "accuracy_acceptable",
    answerType: "yes_no_partial",
    required: true,
    examples: [
      { label: "Sì —", text: "Il sistema raggiunge il 94% di accuratezza sul dataset di test, con tasso di falsi positivi < 5% — soglia accettata dal team di governance." },
      { label: "Parzialmente —", text: "L'accuratezza è accettabile per la maggior parte dei casi, ma scende al 78% su sottogruppi demografici specifici." },
      { label: "No —", text: "Il sistema mostra un tasso di errore superiore alle soglie accettabili definite dalla policy aziendale." },
    ],
  },

  // ── Cluster C — Governance ─────────────────────────────────────────────────
  {
    id: "f_human_oversight_assigned",
    ref: "AI Act Art. 26(5) / Art. 14",
    question: "È stata assegnata supervisione umana per monitorare le decisioni del sistema AI?",
    mapsTo: "human_oversight_assigned",
    answerType: "yes_no",
    required: true,
    examples: [
      { label: "Sì —", text: "Un responsabile AI è stato nominato con il compito di revisionare un campione settimanale del 10% delle decisioni e di gestire i reclami." },
      { label: "No —", text: "Non è ancora stato formalizzato un ruolo di supervisione. La nomina è pianificata prima del go-live." },
    ],
  },
  {
    id: "f_oversight_persons_trained",
    ref: "AI Act Art. 26(5)",
    question: "Le persone responsabili della supervisione sono state adeguatamente formate?",
    mapsTo: "oversight_persons_trained",
    answerType: "yes_no_partial",
    required: true,
    examples: [
      { label: "Sì —", text: "Il team di supervisione ha completato il percorso di formazione AI (8 ore) certificato dall'HR e ha accesso alla documentazione tecnica del sistema." },
      { label: "Parzialmente —", text: "La formazione base è stata completata, ma il training su casi limite e bias non è ancora stato erogato." },
      { label: "No —", text: "La formazione non è ancora stata erogata; il programma è in fase di sviluppo." },
    ],
  },
  {
    id: "f_workers_informed",
    ref: "AI Act Art. 26(7)",
    question: "I lavoratori/dipendenti che interagiscono con il sistema AI sono stati informati del suo utilizzo?",
    mapsTo: "workers_informed",
    answerType: "yes_no_partial",
    required: true,
    examples: [
      { label: "Sì —", text: "Una comunicazione formale è stata inviata a tutti i dipendenti coinvolti, con dettagli sul funzionamento del sistema, i suoi limiti e i diritti dei lavoratori." },
      { label: "Parzialmente —", text: "I manager sono stati informati, ma non tutti gli operatori di livello base hanno ricevuto comunicazione." },
      { label: "No —", text: "L'informativa ai lavoratori non è ancora stata predisposta." },
    ],
  },
  {
    id: "f_affected_persons_informed",
    ref: "AI Act Art. 26(1) / Art. 50",
    question: "Le persone interessate dalle decisioni del sistema AI sono state informate del suo utilizzo?",
    mapsTo: "affected_persons_informed",
    answerType: "yes_no_partial",
    required: true,
    examples: [
      { label: "Sì —", text: "L'informativa è integrata nel processo di candidatura: gli interessati ricevono spiegazione del ruolo dell'AI e del diritto di chiedere revisione umana." },
      { label: "Parzialmente —", text: "Un'informativa generica è presente, ma non spiega in modo chiaro le implicazioni del sistema AI sul processo." },
      { label: "No —", text: "Non è ancora stata predisposta alcuna comunicazione verso gli interessati." },
    ],
  },
];

export const FRIA_GUIDED_SECTIONS = [
  { key: "A", label: "Contesto di deployment", ids: [
    "f_intended_purpose_match", "f_intended_purpose_explanation",
    "f_timeframe", "f_frequency", "f_legal_basis", "f_dpia_done",
    "f_main_users", "f_affected_persons", "f_legal_framework", "f_complaint_mechanisms",
  ]},
  { key: "B", label: "Caratteristiche del sistema AI", ids: [
    "f_technology_overview", "f_has_generative_component", "f_training_data_types",
    "f_bias_assessed", "f_processes_personal_data", "f_gdpr_processing_compliant", "f_accuracy_acceptable",
  ]},
  { key: "C", label: "Governance", ids: [
    "f_human_oversight_assigned", "f_oversight_persons_trained",
    "f_workers_informed", "f_affected_persons_informed",
  ]},
];
