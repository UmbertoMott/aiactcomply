/**
 * risk-register-guided-types.ts
 * Tipo dati e 36 sotto-punti per la modalità guidata del Risk Register (Art. 9 EU AI Act).
 */

import type { RiskRegisterDocument } from "./risk-register-types";

// ─── Sezioni ──────────────────────────────────────────────────────────────────

export type RiskRegisterSectionKey =
  | "sec0" | "sec1" | "sec2" | "sec3" | "sec4"
  | "sec5" | "sec7" | "sec8" | "sec9" | "comm";

export type RiskRegisterFieldType =
  | "text" | "multiline" | "select_yn" | "select_ynp" | "select_tier" | "select_role";

export interface RiskRegisterGuidedSection {
  key: RiskRegisterSectionKey;
  label: string;
  legalRef: string;
  anchor: string;
}

export interface RiskRegisterSubPoint {
  id: string;
  sectionKey: RiskRegisterSectionKey;
  label: string;
  question: string;
  ref: string;
  fieldType: RiskRegisterFieldType;
  examples: string[];
  required: boolean;
}

export interface RiskRegisterAnswer {
  value: string;
  source: "manual" | "ai_suggested";
  aiConfirmed: boolean;
  status: "pending" | "done" | "skipped";
  updatedAt: string;
}

export interface RiskRegisterGuidedDoc {
  answers: Record<string, RiskRegisterAnswer>;
  currentSubPointId: string | null;
  inputHash: string | null;
}

// ─── Sezioni ──────────────────────────────────────────────────────────────────

export const RISK_REGISTER_SECTIONS: RiskRegisterGuidedSection[] = [
  { key: "sec0", label: "§0 — Scoping",                  legalRef: "Art. 9(1)",        anchor: "rr-sec0"  },
  { key: "sec1", label: "§1 — Identificazione Rischi",   legalRef: "Art. 9(2)(a)",     anchor: "rr-sec1"  },
  { key: "sec2", label: "§2 — Stima e Valutazione",      legalRef: "Art. 9(2)(b)",     anchor: "rr-sec2"  },
  { key: "sec3", label: "§3 — Test e Validazione",       legalRef: "Art. 9(6)-(8)",    anchor: "rr-sec3"  },
  { key: "sec4", label: "§4 — Trattamento Rischio",      legalRef: "Art. 9(4)-(5)",    anchor: "rr-sec4"  },
  { key: "sec5", label: "§5 — Monitoraggio Post-Market", legalRef: "Art. 9(2)(c)",     anchor: "rr-sec5"  },
  { key: "sec7", label: "§7 — Tracciabilità",            legalRef: "Art. 12, 17",      anchor: "rr-sec7"  },
  { key: "sec8", label: "§8 — Dismissione",              legalRef: "ISO 23894 Ann. C", anchor: "rr-sec8"  },
  { key: "sec9", label: "§9 — Sign-off",                 legalRef: "Art. 9(10)",       anchor: "rr-sec9"  },
  { key: "comm", label: "Comunicazione",                 legalRef: "ISO 23894 §6.2",   anchor: "rr-comm"  },
] as const;

// ─── Sotto-punti (36 domande) ─────────────────────────────────────────────────

export const RISK_REGISTER_SUBPOINTS: RiskRegisterSubPoint[] = [

  // §0 — Scoping (8 domande)
  {
    id: "rr_system_name",
    sectionKey: "sec0",
    label: "Nome sistema AI",
    question: "Qual è il nome del sistema AI per cui si redige questo registro dei rischi?",
    ref: "Art. 9(1) · §0",
    fieldType: "text",
    examples: ["Sistema di screening CV per selezione HR", "Chatbot per assistenza clienti bancaria", "Modello predittivo di scoring creditizio"],
    required: true,
  },
  {
    id: "rr_role",
    sectionKey: "sec0",
    label: "Ruolo (provider/deployer)",
    question: "Qual è il tuo ruolo rispetto al sistema AI? Sei il provider (sviluppatore) o il deployer (chi lo mette in uso)?",
    ref: "Art. 9(1) · Art. 3",
    fieldType: "text",
    examples: ["Provider — l'azienda ha sviluppato il sistema internamente", "Deployer — utilizziamo un sistema AI sviluppato da terzi", "Entrambi — sviluppiamo e usiamo direttamente il sistema"],
    required: true,
  },
  {
    id: "rr_description",
    sectionKey: "sec0",
    label: "Descrizione e scopo",
    question: "Descrivi il sistema AI e il suo scopo principale. Cosa fa e in quale contesto viene usato?",
    ref: "Art. 9(1) · §0",
    fieldType: "multiline",
    examples: [
      "Il sistema analizza CV e assegna un punteggio di idoneità per posizioni HR su scala 0-1000, riducendo i tempi di screening del 60%.",
      "Modello NLP per classificazione automatica dei ticket di assistenza clienti, instradando le richieste ai team competenti.",
    ],
    required: true,
  },
  {
    id: "rr_risk_tier",
    sectionKey: "sec0",
    label: "Livello di rischio AI Act",
    question: "Quale livello di rischio AI Act è stato assegnato al sistema dalla classificazione preliminare (Classifier)?",
    ref: "Art. 6 · Allegato III",
    fieldType: "text",
    examples: [
      "Alto rischio — il sistema rientra nell'Allegato III, punto 4 (occupazione e gestione dei lavoratori)",
      "Rischio limitato — sistema conversazionale con obbligo di trasparenza (Art. 50)",
      "Rischio minimo — sistema di filtraggio spam senza impatto su persone",
    ],
    required: true,
  },
  {
    id: "rr_personal_data",
    sectionKey: "sec0",
    label: "Trattamento dati personali",
    question: "Il sistema AI tratta dati personali (nome, CV, dati biometrici, comportamentali, ecc.)?",
    ref: "GDPR Art. 4 · Art. 10 AI Act",
    fieldType: "select_yn",
    examples: [
      "Sì — il sistema elabora CV contenenti dati anagrafici, esperienze lavorative e dati di contatto",
      "No — il sistema elabora solo dati aggregati e anonimizzati senza riferimento a persone fisiche",
    ],
    required: true,
  },
  {
    id: "rr_legal_basis",
    sectionKey: "sec0",
    label: "Base giuridica del trattamento",
    question: "Su quale base giuridica GDPR viene effettuato il trattamento dei dati personali?",
    ref: "GDPR Art. 6",
    fieldType: "text",
    examples: [
      "Art. 6(1)(b) GDPR — esecuzione di un contratto (rapporto di lavoro o candidatura)",
      "Art. 6(1)(c) GDPR — obbligo legale (es. obblighi precontrattuali)",
      "Art. 6(1)(f) GDPR — legittimo interesse con bilanciamento documentato",
    ],
    required: false,
  },
  {
    id: "rr_human_oversight",
    sectionKey: "sec0",
    label: "Supervisione umana (Art. 14)",
    question: "È prevista supervisione umana sulle decisioni o output del sistema AI (Art. 14 AI Act)?",
    ref: "Art. 14 AI Act",
    fieldType: "select_ynp",
    examples: [
      "Sì — un operatore umano rivede ogni decisione prima che produca effetti giuridici",
      "No — il sistema prende decisioni autonome senza revisione umana sistematica",
      "Parzialmente — revisione umana solo per i casi borderline (score vicino alla soglia di esclusione)",
    ],
    required: true,
  },
  {
    id: "rr_register_owner",
    sectionKey: "sec0",
    label: "Responsabile del registro",
    question: "Chi è il responsabile della compilazione e del mantenimento di questo registro dei rischi (Art. 9)?",
    ref: "Art. 9(1)",
    fieldType: "text",
    examples: [
      "Mario Rossi — Responsabile Compliance AI, Direzione Legal & Compliance",
      "Team Risk Management — ufficio dedicato con referente Anna Bianchi (DPO/AI Compliance Officer)",
    ],
    required: true,
  },

  // §1 — Identificazione Rischi (5 domande)
  {
    id: "rr_main_risks",
    sectionKey: "sec1",
    label: "Rischi principali identificati",
    question: "Elenca i principali rischi identificati per questo sistema AI (almeno 3). Descrivi brevemente ciascuno.",
    ref: "Art. 9(2)(a)",
    fieldType: "multiline",
    examples: [
      "R-01: Bias algoritmico — il modello penalizza candidati con gap occupazionali (maternità, disabilità). Probabilità: alta. Impatto: alto.\nR-02: Opacità — gli utenti non ricevono spiegazione dello score. Probabilità: media. Impatto: medio.\nR-03: Data drift — i dati di training diventano obsoleti. Probabilità: bassa. Impatto: alto.",
    ],
    required: true,
  },
  {
    id: "rr_vulnerable_groups",
    sectionKey: "sec1",
    label: "Impatto su gruppi vulnerabili",
    question: "Il sistema AI impatta in modo sproporzionato minori (< 18 anni) o altri gruppi vulnerabili (disabili, anziani, minoranze)?",
    ref: "Art. 9(9) AI Act",
    fieldType: "select_ynp",
    examples: [
      "Sì — il sistema valuta candidati che possono includere giovani neolaureati; valutazione impatto su minori richiesta",
      "No — il sistema è rivolto esclusivamente a professionisti con esperienza lavorativa documentata (>2 anni)",
      "Parzialmente — il sistema opera in contesti sanitari che possono coinvolgere pazienti minori; valutazione parziale effettuata",
    ],
    required: true,
  },
  {
    id: "rr_bias_risk",
    sectionKey: "sec1",
    label: "Rischio di bias algoritmico",
    question: "Sono stati identificati rischi di bias algoritmico (di genere, etnico, di età, ecc.) nel sistema o nei dati di training?",
    ref: "Art. 9(2)(a) · Art. 10",
    fieldType: "select_ynp",
    examples: [
      "Sì — analisi preliminare ha rilevato underrepresentation di candidati con nomi di origine straniera nel dataset di training",
      "No — dataset bilanciato per genere e nazionalità; test fairness superati con DI score ≥ 0.85",
      "Parzialmente — bias potenziale sulla variabile 'gap occupazionale' non ancora completamente mitigato",
    ],
    required: true,
  },
  {
    id: "rr_risk_appetite",
    sectionKey: "sec1",
    label: "Criteri di accettabilità del rischio",
    question: "Quali sono i criteri di accettabilità del rischio adottati dall'organizzazione per questo sistema (risk appetite)?",
    ref: "Art. 9(1) · ISO 23894 §6.4",
    fieldType: "multiline",
    examples: [
      "Rischio alto: non accettabile — richiede mitigazione obbligatoria prima del deployment.\nRischio medio: accettabile con monitoraggio trimestrale e responsabile designato.\nRischio basso: accettabile — monitoraggio annuale sufficiente.",
    ],
    required: false,
  },
  {
    id: "rr_lifecycle_phase",
    sectionKey: "sec1",
    label: "Fase del ciclo di vita",
    question: "In quale fase del ciclo di vita del sistema AI si trova attualmente il registro? (sviluppo, deployment, monitoraggio, dismissione)",
    ref: "Art. 9(1)",
    fieldType: "text",
    examples: [
      "Deployment — il sistema è in produzione dal marzo 2025; aggiornamento annuale del registro",
      "Sviluppo — fase di pre-deployment; registro redatto prima del rilascio in produzione",
      "Monitoraggio — sistema in produzione da 18 mesi; revisione semestrale in corso",
    ],
    required: false,
  },

  // §2 — Stima e Valutazione (3 domande)
  {
    id: "rr_intended_use",
    sectionKey: "sec2",
    label: "Casi d'uso previsti",
    question: "Descrivi i principali casi d'uso previsti del sistema AI. Chi lo usa e per fare cosa?",
    ref: "Art. 9(2)(b)",
    fieldType: "multiline",
    examples: [
      "HR Recruiter utilizzano il sistema per pre-screeniare ~500 candidature/mese. Il sistema produce uno score 0-1000; la decisione finale è sempre umana.\nIl sistema è usato per posizioni junior e middle management, non per dirigenti.",
    ],
    required: true,
  },
  {
    id: "rr_foreseeable_misuse",
    sectionKey: "sec2",
    label: "Usi impropri prevedibili",
    question: "Quali usi impropri prevedibili potrebbero verificarsi? (uso oltre la finalità, da parte di soggetti non autorizzati, ecc.)",
    ref: "Art. 9(2)(b)",
    fieldType: "multiline",
    examples: [
      "Rischio di utilizzo del sistema per profilazione estesa dei candidati oltre la selezione iniziale.\nRischio di delega completa della decisione all'AI senza revisione umana.\nRischio di utilizzo in paesi con normative diverse dall'UE senza adeguamento.",
    ],
    required: true,
  },
  {
    id: "rr_affected_persons",
    sectionKey: "sec2",
    label: "Persone impattate",
    question: "Quante persone sono impattate dal sistema? Quali categorie?",
    ref: "Art. 9(2)(b) · Art. 9(9)",
    fieldType: "text",
    examples: [
      "~500 candidati/mese; ~12 recruiter HR come utenti diretti. Categorie: candidati interni ed esterni per posizioni EU.",
      "Circa 10.000 clienti/anno interessati da decisioni di scoring creditizio. Categorie: privati consumatori con contratto di finanziamento.",
    ],
    required: true,
  },

  // §3 — Test e Validazione (3 domande)
  {
    id: "rr_test_metrics",
    sectionKey: "sec3",
    label: "Metriche di test definite",
    question: "Quali metriche di accuratezza, fairness o performance sono state definite per il sistema AI?",
    ref: "Art. 9(6)-(8)",
    fieldType: "multiline",
    examples: [
      "Accuratezza: ≥ 85% su validation set hold-out (20% del dataset).\nFairness: Disparate Impact ≥ 0.8 per genere e nazionalità.\nPrecisione: ≥ 80%, Recall: ≥ 75% per il task di classificazione.",
    ],
    required: true,
  },
  {
    id: "rr_thresholds_met",
    sectionKey: "sec3",
    label: "Soglie rispettate",
    question: "Il sistema AI ha superato le soglie di accettabilità definite nei test di validazione?",
    ref: "Art. 9(6)-(8)",
    fieldType: "select_ynp",
    examples: [
      "Sì — tutte le metriche definite sono state superate nel test su dataset hold-out. Deployment autorizzato.",
      "No — il Disparate Impact score è 0.72, sotto la soglia di 0.8. Deployment bloccato pending debiasing.",
      "Parzialmente — accuratezza OK (88%), ma fairness per nazionalità ancora in corso di valutazione.",
    ],
    required: true,
  },
  {
    id: "rr_worst_case",
    sectionKey: "sec3",
    label: "Scenario worst-case testato",
    question: "È stato testato uno scenario worst-case (uso estremo, dataset avverso, attacchi adversariali)?",
    ref: "Art. 9(8)",
    fieldType: "select_ynp",
    examples: [
      "Sì — test con dataset sintetico avverso (solo minoranze): DI score = 0.65; pianificate misure di mitigazione aggiuntive.",
      "No — test worst-case non ancora eseguito; da pianificare entro 90 giorni dal deployment.",
      "Parzialmente — test su dataset sbilanciato eseguito; test adversariale non ancora completato.",
    ],
    required: false,
  },

  // §4 — Trattamento Rischio (3 domande)
  {
    id: "rr_treatment_option",
    sectionKey: "sec4",
    label: "Opzione di trattamento",
    question: "Quale opzione di trattamento del rischio è stata selezionata (Modifica del sistema / Evitamento / Condivisione / Ritenzione)?",
    ref: "Art. 9(2)(d) · Art. 9(4)-(5)",
    fieldType: "text",
    examples: [
      "Modifica: retraining del modello con CTGAN debiasing + eliminazione feature proxy (variabile 'cap_residenza').",
      "Condivisione: trasferimento parziale del rischio tramite clausola contrattuale con il provider del modello AI.",
      "Ritenzione: rischio residuo basso accettato con monitoraggio mensile e revisione trimestrale.",
    ],
    required: true,
  },
  {
    id: "rr_measures",
    sectionKey: "sec4",
    label: "Misure concrete adottate",
    question: "Descrivi le misure concrete di mitigazione adottate per i rischi principali.",
    ref: "Art. 9(4)-(5)",
    fieldType: "multiline",
    examples: [
      "1. Revisione umana obbligatoria per i 50 candidati con score ± 50 punti dalla soglia di esclusione.\n2. Eliminazione feature proxy (gap occupazionale > 12 mesi) dal modello.\n3. Audit fairness trimestrale con report al DPO.\n4. Formazione obbligatoria per i recruiter sull'uso e i limiti del sistema.",
    ],
    required: true,
  },
  {
    id: "rr_residual_risk",
    sectionKey: "sec4",
    label: "Rischio residuo",
    question: "Qual è il livello di rischio residuo dopo l'applicazione delle misure di mitigazione?",
    ref: "Art. 9(2)(d)",
    fieldType: "text",
    examples: [
      "Rischio residuo: MEDIO. Bias su 'gap occupazionale' parzialmente mitigato; monitoraggio trimestrale attivo.",
      "Rischio residuo: BASSO. Tutte le misure implementate; test fairness superati post-retraining.",
      "Rischio residuo: ALTO. Misure di mitigazione pianificate ma non ancora implementate — deployment in sospeso.",
    ],
    required: true,
  },

  // §5 — Monitoraggio Post-Market (3 domande)
  {
    id: "rr_monitoring_frequency",
    sectionKey: "sec5",
    label: "Frequenza di monitoraggio",
    question: "Con quale frequenza viene effettuato il monitoraggio del sistema AI in produzione?",
    ref: "Art. 9(2)(c) · Art. 72",
    fieldType: "text",
    examples: [
      "Monitoraggio automatico mensile via pipeline Airflow (PSI + drift detection). Report trimestrale al risk owner.",
      "Monitoraggio continuo su metriche di accuratezza + revisione semestrale completa da parte del team AI.",
    ],
    required: true,
  },
  {
    id: "rr_drift_detection",
    sectionKey: "sec5",
    label: "Drift detection (PSI)",
    question: "È stato definito un threshold PSI (Population Stability Index) per la rilevazione del data drift?",
    ref: "Art. 9(2)(c) · ISO 23894",
    fieldType: "select_yn",
    examples: [
      "Sì — PSI < 0.1: modello stabile. PSI 0.1-0.2: monitoraggio aumentato. PSI > 0.2: revisione urgente e sospensione del modello.",
      "No — threshold PSI non ancora definito; da formalizzare entro 60 giorni dal deployment.",
    ],
    required: true,
  },
  {
    id: "rr_postmarket_plan",
    sectionKey: "sec5",
    label: "Piano post-market documentato",
    question: "È stato redatto e documentato un piano di monitoraggio post-market conforme all'Art. 72 AI Act?",
    ref: "Art. 72 AI Act",
    fieldType: "select_ynp",
    examples: [
      "Sì — piano approvato dal CTO con responsabile designato e frequenze definite; integrato nel QMS aziendale.",
      "No — piano post-market non ancora redatto; in corso di sviluppo prima del deployment.",
      "Parzialmente — piano esiste ma non ancora formalmente approvato o integrato nel QMS.",
    ],
    required: true,
  },

  // §7 — Tracciabilità (3 domande)
  {
    id: "rr_versioning",
    sectionKey: "sec7",
    label: "Versionamento del registro",
    question: "Il registro dei rischi è soggetto a controllo di versione (Git, sistema documentale, ecc.)?",
    ref: "Art. 9(1) · Art. 12",
    fieldType: "select_yn",
    examples: [
      "Sì — versioning via Git con tag semantico (v1.0, v1.1…). Ogni modifica tracciata con autore e data.",
      "No — il registro è gestito in un foglio di calcolo senza versionamento formale; in corso di migrazione.",
    ],
    required: true,
  },
  {
    id: "rr_retention",
    sectionKey: "sec7",
    label: "Policy di retention dei log",
    question: "È stata definita una policy di retention per i log del sistema AI e per il registro dei rischi?",
    ref: "Art. 12 AI Act",
    fieldType: "select_ynp",
    examples: [
      "Sì — retention 5 anni per log del sistema AI; 10 anni per il registro dei rischi. Certificazione GDPR conforme.",
      "No — policy di retention non ancora definita; da allineare alla policy aziendale GDPR.",
      "Parzialmente — retention definita per i log del sistema (3 anni) ma non ancora per il registro dei rischi.",
    ],
    required: true,
  },
  {
    id: "rr_qms",
    sectionKey: "sec7",
    label: "Integrazione nel QMS",
    question: "Il sistema di gestione del rischio AI è integrato nel Quality Management System (QMS) aziendale (Art. 17)?",
    ref: "Art. 17 AI Act",
    fieldType: "select_ynp",
    examples: [
      "Sì — integrato nel QMS ISO 9001 con audit annuale; processi AI Risk Management documentati e approvati.",
      "No — gestione del rischio AI standalone; QMS non ancora adottato dall'organizzazione.",
      "Parzialmente — processi documentati ma non ancora formalmente inclusi nel sistema QMS certificato.",
    ],
    required: false,
  },

  // §8 — Dismissione (3 domande)
  {
    id: "rr_dismissal_risks",
    sectionKey: "sec8",
    label: "Rischi di fine vita identificati",
    question: "Sono stati identificati rischi specifici della fase di fine vita del sistema (dismissione/ritiro)?",
    ref: "ISO 23894 Annex C",
    fieldType: "select_ynp",
    examples: [
      "Sì — rischi identificati: dipendenze downstream di 3 sistemi, dataset da anonimizzare, comunicazione ai deployer.",
      "No — il sistema non ha ancora un piano di dismissione formale; da sviluppare prima del deployment.",
      "Parzialmente — rischi identificati ad alto livello; piano dettagliato di dismissione in corso di sviluppo.",
    ],
    required: false,
  },
  {
    id: "rr_data_deletion",
    sectionKey: "sec8",
    label: "Piano di cancellazione dati",
    question: "È stato definito un piano di cancellazione o anonimizzazione dei dati al momento del ritiro del sistema?",
    ref: "GDPR Art. 17 · ISO 23894",
    fieldType: "select_yn",
    examples: [
      "Sì — dataset di training da anonimizzare entro 30 giorni dal ritiro, con certificato di cancellazione.",
      "No — piano di data deletion non ancora definito; da allineare alla policy GDPR aziendale.",
    ],
    required: false,
  },
  {
    id: "rr_downstream",
    sectionKey: "sec8",
    label: "Dipendenze downstream",
    question: "Sono stati mappati i sistemi o processi downstream che dipendono dagli output del sistema AI?",
    ref: "ISO 23894 Annex C",
    fieldType: "select_ynp",
    examples: [
      "Sì — 3 sistemi downstream identificati (CRM, HR portal, reportistica); piano di migrazione definito.",
      "No — nessun sistema downstream identificato; il sistema opera in modo autonomo.",
      "Parzialmente — dipendenze conosciute ma non ancora formalmente documentate con piano di migrazione.",
    ],
    required: false,
  },

  // §9 — Sign-off (3 domande)
  {
    id: "rr_risk_owner",
    sectionKey: "sec9",
    label: "Risk Owner",
    question: "Chi è il Risk Owner del sistema AI (persona fisica responsabile del registro e delle decisioni di rischio)?",
    ref: "Art. 9(1) · Art. 9(10)",
    fieldType: "text",
    examples: [
      "Mario Rossi — CTO / Chief Technology Officer — designato Risk Owner in data 01/03/2025",
      "Anna Bianchi — AI Compliance Manager — responsabile del registro e delle revisioni periodiche",
    ],
    required: true,
  },
  {
    id: "rr_compliance_legal",
    sectionKey: "sec9",
    label: "Compliance / Legale",
    question: "Chi è il responsabile Compliance o Legale che ha validato il registro dei rischi?",
    ref: "Art. 9(10)",
    fieldType: "text",
    examples: [
      "Avv. Laura Verdi — Responsabile Legal & Compliance — revisione e validazione in data 15/03/2025",
      "DPO esterno — Studio Legale AI — parere favorevole con raccomandazioni in nota allegata",
    ],
    required: true,
  },
  {
    id: "rr_overall_risk",
    sectionKey: "sec9",
    label: "Valutazione complessiva del rischio",
    question: "Qual è la valutazione complessiva del rischio del sistema AI dopo l'applicazione delle misure?",
    ref: "Art. 9(1)-(2)",
    fieldType: "text",
    examples: [
      "MEDIO — rischio residuo accettabile con misure di mitigazione in vigore e monitoraggio trimestrale attivo.",
      "BASSO — tutte le misure implementate, test superati, deployment autorizzato senza condizioni.",
      "ALTO — misure di mitigazione non ancora completate; deployment condizionato al completamento del debiasing.",
    ],
    required: true,
  },

  // Comunicazione (3 domande)
  {
    id: "rr_stakeholders_internal",
    sectionKey: "comm",
    label: "Stakeholder interni coinvolti",
    question: "Quali stakeholder interni sono stati coinvolti nel processo di risk management per questo sistema AI?",
    ref: "ISO 23894 §6.2",
    fieldType: "multiline",
    examples: [
      "DPO (parere GDPR e AI Act), Legal (conformità normativa), Engineering (technical risk), HR (impatto sui lavoratori), CTO (approvazione deployment).",
    ],
    required: true,
  },
  {
    id: "rr_fria_linked",
    sectionKey: "comm",
    label: "FRIA collegata",
    question: "È stata completata una FRIA (Fundamental Rights Impact Assessment, Art. 27) e i suoi risultati sono stati integrati in questo registro?",
    ref: "Art. 27 AI Act",
    fieldType: "select_ynp",
    examples: [
      "Sì — FRIA completata il 10/02/2025; impatti sui diritti fondamentali integrati nella sezione §1 del registro.",
      "No — FRIA non ancora completata; da eseguire prima del deployment definitivo.",
      "Parzialmente — FRIA in corso; risultati preliminari integrati; aggiornamento previsto entro 30 giorni.",
    ],
    required: true,
  },
  {
    id: "rr_external_consulted",
    sectionKey: "comm",
    label: "Consultazioni esterne",
    question: "Sono state effettuate consultazioni con stakeholder esterni (deployer, autorità di vigilanza, associazioni di categoria)?",
    ref: "ISO 23894 §6.2",
    fieldType: "select_ynp",
    examples: [
      "Sì — consultazione con deployer (aziende clienti) e parere dell'AGID ricevuto in data 20/01/2025.",
      "No — nessuna consultazione esterna ritenuta necessaria per questo tier di rischio.",
      "Parzialmente — comunicazione informale con i principali deployer; consultazione formale con l'autorità non ancora avviata.",
    ],
    required: false,
  },
];

// ─── Utility ──────────────────────────────────────────────────────────────────

export function createEmptyRiskRegisterGuidedDoc(): RiskRegisterGuidedDoc {
  return {
    answers: {},
    currentSubPointId: RISK_REGISTER_SUBPOINTS[0].id,
    inputHash: null,
  };
}

// ─── Mapper: risposta guidata → RiskRegisterDocument (patch parziale) ─────────

export function mapGuidedToRiskRegister(doc: RiskRegisterGuidedDoc): Partial<RiskRegisterDocument> {
  const a = (id: string) => doc.answers[id]?.status === "done" ? doc.answers[id].value : undefined;

  const identification: RiskRegisterDocument["identification"] = {
    systemName:              a("rr_system_name"),
    providerDeployerRole:    a("rr_role"),
    descriptionAndPurpose:   a("rr_description"),
    riskTier:               "unclassified",
    annexIIIArea:            a("rr_risk_tier"),
    applicableArticles:      [],
    personalDataProcessed:   a("rr_personal_data") === "Sì" ? "yes" : a("rr_personal_data") === "No" ? "no" : "unspecified",
    legalBasis:              a("rr_legal_basis"),
    humanOversightRequired:  a("rr_human_oversight") === "Sì" ? true : a("rr_human_oversight") === "No" ? false : undefined,
    registerOwner:           a("rr_register_owner"),
    riskAppetite:            a("rr_risk_appetite"),
    lifeCyclePhase:          a("rr_lifecycle_phase"),
    incorporatesGpaiModel:   "unspecified",
    vulnerableGroupsImpactAssessment: a("rr_vulnerable_groups"),
    usageContext:            a("rr_intended_use"),
  };

  const estimation: RiskRegisterDocument["estimation"] = {
    intendedUseCases:         a("rr_intended_use") ? [a("rr_intended_use")!] : [],
    foreseenMisuse:           a("rr_foreseeable_misuse") ? [a("rr_foreseeable_misuse")!] : [],
    impactAssessment:         a("rr_main_risks"),
    affectedPersonsCount:     a("rr_affected_persons"),
  };

  const testValidation: RiskRegisterDocument["testValidation"] = {
    testMetrics:              a("rr_test_metrics") ? [a("rr_test_metrics")!] : [],
    thresholds:               undefined,
    validationOutcome:        a("rr_thresholds_met"),
    worstCase:                a("rr_worst_case"),
  };

  const treatment: RiskRegisterDocument["treatment"] = {
    treatmentOption:          a("rr_treatment_option"),
    measures:                 a("rr_measures") ? [a("rr_measures")!] : [],
    residualRisk:             a("rr_residual_risk"),
  };

  const monitoringDetails: RiskRegisterDocument["monitoringDetails"] = {
    monitoringFrequency:      a("rr_monitoring_frequency"),
    alertThreshold:           a("rr_drift_detection") === "Sì" ? "PSI > 0.2" : undefined,
    postMarketPlan:           a("rr_postmarket_plan"),
  };

  const traceability: RiskRegisterDocument["traceability"] = {
    versionsTracked:          a("rr_versioning") === "Sì" ? 1 : undefined,
    retentionPolicy:          a("rr_retention"),
    qmsIntegration:           a("rr_qms"),
    changes:                  [],
  };

  const dismissal: RiskRegisterDocument["dismissal"] = {
    dismissalRisks:           a("rr_dismissal_risks"),
    dataDeletion:             a("rr_data_deletion"),
    downstreamDependencies:   a("rr_downstream"),
  };

  const signOff: RiskRegisterDocument["signOff"] = {
    riskOwner:        { name: a("rr_risk_owner"),       signed: false },
    complianceLegal:  { name: a("rr_compliance_legal"), signed: false },
    legalRepresentative: { signed: false },
    otherRegimesIntegration: a("rr_overall_risk"),
  };

  const communication: RiskRegisterDocument["communication"] = {
    stakeholdersInvolved:     a("rr_stakeholders_internal"),
    friaLink:                 a("rr_fria_linked"),
    externalConsultees:       a("rr_external_consulted"),
    consultationDocumented:   a("rr_stakeholders_internal") !== undefined,
  };

  return { identification, estimation, testValidation, treatment, monitoringDetails, traceability, dismissal, signOff, communication };
}
