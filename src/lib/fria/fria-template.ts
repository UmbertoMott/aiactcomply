/**
 * fria-template.ts
 * ------------------------------------------------------------------
 * Template FRIA strutturato — Valutazione d'Impatto sui Diritti Fondamentali.
 * Fedele al questionario ufficiale DIHR/ECNL (dic. 2025).
 *
 * FONTE: Art. 27 Regolamento (UE) 2024/1689 (AI Act)
 *        Questionario FRIA — Danish Institute for Human Rights & ECNL
 */

// ─── Tipi ─────────────────────────────────────────────────────────────────────

export type FriaSectionKey =
  | "fase1a"
  | "fase1b"
  | "fase1c"
  | "fase2"
  | "fase3"
  | "fase4"
  | "fase5";

export type FriaFieldType =
  | "text"
  | "multiline"
  | "select_yn"
  | "select_ynp"
  | "info";

export interface FriaGuidedSection {
  key: FriaSectionKey;
  label: string;
  legalRef: string;
  weight: number;
  anchor: string;
}

export interface FriaSubPoint {
  id: string;
  sectionKey: FriaSectionKey;
  label: string;
  question: string;
  ref: string;
  fieldType: FriaFieldType;
  examples: string[];
  required: boolean;
}

// ─── Sezioni ──────────────────────────────────────────────────────────────────

export const FRIA_GUIDED_SECTIONS: FriaGuidedSection[] = [
  { key: "fase1a", label: "1A — Contesto deployment",        legalRef: "Art. 27(1)(a)(b)(c)",  weight: 15, anchor: "sec-fase1a" },
  { key: "fase1b", label: "1B — Caratteristiche sistema",    legalRef: "Art. 13 · Art. 26",     weight: 13, anchor: "sec-fase1b" },
  { key: "fase1c", label: "1C — Governance del sistema",     legalRef: "Art. 26 · Art. 4",      weight: 14, anchor: "sec-fase1c" },
  { key: "fase2",  label: "2 — Valutazione degli impatti",   legalRef: "Art. 27(1)(d)",         weight: 25, anchor: "sec-fase2"  },
  { key: "fase3",  label: "3 — Decisione di deployment",     legalRef: "Art. 27(2)",            weight: 15, anchor: "sec-fase3"  },
  { key: "fase4",  label: "4 — Monitoraggio e riesame",      legalRef: "Art. 27(1)(f)",         weight: 10, anchor: "sec-fase4"  },
  { key: "fase5",  label: "5 — Stakeholder e coinvolgimento",legalRef: "ECNL Framework",        weight:  8, anchor: "sec-fase5"  },
] as const;

// ─── Sotto-punti ──────────────────────────────────────────────────────────────

export const FRIA_SUBPOINTS: FriaSubPoint[] = [

  // ── FASE 1A — Contesto deployment ─────────────────────────────────────────

  {
    id: "f1a_finalita", sectionKey: "fase1a",
    label: "Finalità del deployment",
    question: "Qual è la finalità e l'obiettivo del deployment del sistema IA? Quale problema risolve e quali alternative sono state considerate?",
    ref: "Art. 27(1)(a) AI Act",
    fieldType: "multiline",
    required: true,
    examples: [
      "Il sistema è impiegato per il monitoraggio delle frodi sui pagamenti online: analizza in tempo reale oltre 50.000 transazioni/giorno e blocca automaticamente quelle anomale prima dell'autorizzazione. L'obiettivo è ridurre le perdite da frode del 70% rispetto al 2022. Alternative valutate: (1) team di analisti manuali — scartato per latenza media 4h e costo operativo di €1,2M/anno; (2) regole statiche su liste nere — scartato perché non adattivo alle tecniche di frode emergenti; (3) il sistema attuale, scelto dopo gara con 5 vendor, con tasso di intercettazione del 93% e FPR < 0,8%.",
      "Il sistema pre-seleziona automaticamente i curricula per le posizioni aperte, assegnando un punteggio su esperienza rilevante, corrispondenza competenze e stabilità lavorativa. Riduce il tempo di screening da 4 settimane a 48 ore per volumi superiori a 300 candidature/mese. Alternative valutate: (1) outsourcing a società di head-hunting — scartato per costo unitario di €900/candidato e perdita di coerenza valutativa; (2) screening manuale dal team HR — non scalabile; (3) il sistema attuale, selezionato con supervisione umana obbligatoria sulle shortlist finali come misura di mitigazione bias.",
    ],
  },
  {
    id: "f1a_uso_previsto", sectionKey: "fase1a",
    label: "Corrispondenza con l'uso previsto",
    question: "Il deployment corrisponde all'uso previsto dal provider (materiali commerciali, istruzioni per l'uso)?",
    ref: "Art. 27(1)(a) AI Act",
    fieldType: "select_yn",
    required: true,
    examples: [
      "Sì — il sistema è utilizzato esclusivamente entro i limiti documentati nelle istruzioni d'uso del provider (v3.2, gennaio 2025): fascia d'età 18-65 anni, transazioni domestiche, soglia di confidenza ≥ 0,75. Abbiamo verificato che il nostro deployment non supera i parametri di utilizzo previsti e che la popolazione target corrisponde a quella su cui il provider ha effettuato la validazione.",
      "No — il nostro caso d'uso si discosta significativamente dalle specifiche del provider: applichiamo il sistema a richiedenti asilo senza storia creditizia, una popolazione non prevista nella documentazione tecnica. Questo rende necessaria una validazione autonoma delle performance e un'analisi di bias specifica per questo sottogruppo, come previsto dall'Art. 26(5) AI Act.",
    ],
  },
  {
    id: "f1a_modifiche", sectionKey: "fase1a",
    label: "Modifiche sostanziali",
    question: "Sono previste modifiche sostanziali al sistema (Art. 25(1) AI Act)? Chi modifica sostanzialmente un sistema ad alto rischio diventa provider.",
    ref: "Art. 25(1) AI Act",
    fieldType: "select_yn",
    required: true,
    examples: [
      "Sì — abbiamo integrato un modulo di preprocessing proprietario che sostituisce le variabili demografiche raw con feature engineered, modificando in modo sostanziale i dati di input. Secondo l'Art. 25(1) AI Act, questa operazione può configurarci come provider; abbiamo avviato una consulenza legale per verificare la necessità di registrarci come tali nell'EU AI Database (Art. 49 AI Act) e di predisporre la documentazione tecnica completa Art. 11.",
      "No — il sistema è deploiato as-is, senza alcuna modifica al codice, ai pesi del modello o ai parametri di configurazione. Utilizziamo l'interfaccia API standard del provider con le impostazioni predefinite; il nostro ruolo è esclusivamente quello di deployer ai sensi dell'Art. 3(4) AI Act. La documentazione tecnica rimane di responsabilità del provider.",
    ],
  },
  {
    id: "f1a_periodo", sectionKey: "fase1a",
    label: "Periodo e frequenza d'uso",
    question: "Qual è il periodo e la frequenza d'uso previsti per il sistema (Art. 27(1)(b) AI Act)?",
    ref: "Art. 27(1)(b) AI Act",
    fieldType: "multiline",
    required: true,
    examples: [
      "Uso continuativo 24/7: il sistema analizza le transazioni in tempo reale per 365 giorni/anno. Durata prevista del deployment: 3 anni (2025–2028), con revisione annuale della FRIA e dell'efficacia delle misure di mitigazione. La frequenza aumenta nei periodi festivi (Black Friday, Natale) con picchi di 200.000 transazioni/giorno.",
      "Utilizzo batch mensile: il sistema elabora i dati dei dipendenti nella prima settimana di ogni mese per generare le valutazioni di performance. Durata prevista: 12 mesi con opzione di rinnovo biennale. L'elaborazione è programmata fuori dall'orario lavorativo (sabato 02:00–06:00) per minimizzare l'impatto sui sistemi HR.",
    ],
  },
  {
    id: "f1a_base_giuridica", sectionKey: "fase1a",
    label: "Base giuridica",
    question: "Esiste una base giuridica per il deployment e per le decisioni adottate tramite il sistema?",
    ref: "Art. 27(1)(a) AI Act",
    fieldType: "select_yn",
    required: true,
    examples: [
      "Sì — il deployment si fonda su tre basi giuridiche: (1) Art. 6(1)(e) GDPR — compito di interesse pubblico per il sistema di scoring del rischio creditizio nelle concessioni di mutui pubblici; (2) delibera del CdA n. 2024-IA-07 del 15/01/2024 che autorizza formalmente il sistema; (3) contratto DPA con il provider AI ai sensi dell'Art. 28 GDPR, firmato il 20/01/2024. Parere legale interno registrato come doc. n. LEGAL-2024-041.",
      "No — al momento non è stata formalizzata una base giuridica specifica per l'utilizzo del sistema AI: stiamo verificando se applicare l'Art. 6(1)(f) GDPR (legittimo interesse) o l'Art. 6(1)(a) (consenso esplicito). Il deployment è sospeso fino alla formalizzazione; attesa la revisione del DPO entro 30 giorni.",
    ],
  },
  {
    id: "f1a_gruppi_impattati", sectionKey: "fase1a",
    label: "Gruppi/individui impattati",
    question: "Quali gruppi o individui sono più probabilmente impattati dal sistema (Art. 27(1)(c) AI Act)? Includi utenti diretti e indiretti.",
    ref: "Art. 27(1)(c) AI Act",
    fieldType: "multiline",
    required: true,
    examples: [
      "Utenti operativi diretti: 45 analisti del team Fraud & Risk che consultano quotidianamente le raccomandazioni del sistema. Soggetti impattati indirettamente (terzi): circa 85.000 clienti retail/mese le cui transazioni vengono valutate automaticamente — di questi, circa 320/mese ricevono un blocco preventivo che richiede verifica. Impattati secondari: esercenti che subiscono ritardi negli accrediti durante le fasi di verifica (stima 150/mese).",
      "Gruppi impattati primari: (1) candidati che presentano domanda di lavoro — ca. 1.200/anno, inclusi neo-laureati e profili senior; (2) HR manager (12 persone) che ricevono le shortlist filtrate. Impattati indiretti: (3) dipendenti interni che si candidano a posizioni interne e il cui file storico è accessibile al sistema; (4) referenti indicati nei CV. Rischio specifico: il sistema potrebbe sistematicamente sottovalutare candidature non-lineari (rientri da maternità, percorsi atipici).",
    ],
  },
  {
    id: "f1a_vulnerabili", sectionKey: "fase1a",
    label: "Soggetti vulnerabili",
    question: "Tra i gruppi impattati, vi sono individui in situazione di vulnerabilità (minori, anziani, disabili, minoranze)?",
    ref: "Art. 27(1)(c) AI Act",
    fieldType: "select_ynp",
    required: true,
    examples: [
      "Sì — il sistema valuta domande di sussidio di disoccupazione: il 34% degli utenti ha più di 55 anni (scarsa alfabetizzazione digitale), il 12% ha disabilità certificate e l'8% è in condizione di indigenza documentata. Questi gruppi hanno minori risorse per contestare una decisione errata e maggiore dipendenza dall'esito. Misura adottata: procedura di rimedio semplificata e gratuita per i soggetti vulnerabili, con supporto telefonico dedicato.",
      "No — il sistema opera esclusivamente su operatori interni qualificati: analisti finanziari con contratto a tempo indeterminato, grado di seniority medio-alto. Nessun soggetto appartenente a categorie vulnerabili è direttamente esposto alle decisioni del sistema. Il rischio discriminatorio è limitato alla selezione del personale per future assunzioni interne, che è stata esclusa dall'ambito di questo deployment.",
      "Parzialmente — la maggior parte degli studenti universitari valutati dal sistema non presenta condizioni di vulnerabilità, ma una quota stimata del 6% ha dichiarato disabilità nei moduli di iscrizione (DSA, disabilità motorie, disturbi psichiatrici). Il sistema non è stato validato su questo sottogruppo; è in corso un'analisi di fairness specifica con supporto del servizio disabilità dell'ateneo.",
    ],
  },
  {
    id: "f1a_rimedio", sectionKey: "fase1a",
    label: "Meccanismi di rimedio",
    question: "Quali meccanismi di rimedio giudiziali e non-giudiziali sono disponibili per le persone impattate?",
    ref: "Art. 27 AI Act",
    fieldType: "multiline",
    required: false,
    examples: [
      "Rimedi non giudiziali: (1) procedura di reclamo interna — modulo disponibile su app e sportello fisico, SLA 10 giorni lavorativi, responsabile Dott.ssa Bianchi; (2) Garante Privacy (Autorità di controllo Art. 77 GDPR / Art. 79 AI Act); (3) difensore civico regionale per i servizi della PA. Rimedi giudiziali: tribunale amministrativo regionale (TAR) per le decisioni di ente pubblico. Tutte le informazioni sono disponibili in linguaggio semplificato al link [url-reclami] e in 5 lingue.",
      "Rimedi interni: ufficio di reclamo dedicato (reclami@organizzazione.it), risposta garantita entro 15 giorni; possibilità di richiedere la revisione umana della decisione entro 30 giorni. Rimedi esterni: Autorità Garante della Concorrenza e del Mercato (AGCM) per profili antitrust, Arbitro Bancario Finanziario (ABF) per contestazioni su servizi bancari, Garante Privacy per violazioni GDPR. L'esistenza di questi rimedi è comunicata nell'informativa privacy e nel foglio informativo del prodotto.",
    ],
  },

  // ── FASE 1B — Caratteristiche sistema ─────────────────────────────────────

  {
    id: "f1b_caratteristiche", sectionKey: "fase1b",
    label: "Caratteristiche tecniche",
    question: "Quali sono le caratteristiche tecniche principali del sistema? Include componenti di IA generativa o rischi sistemici?",
    ref: "Art. 27 AI Act",
    fieldType: "multiline",
    required: true,
    examples: [
      "Sistema di ML supervisionato (ensemble XGBoost + Random Forest) addestrato su 5 anni di dati storici transazionali (48M record). Non include componenti di IA generativa. Il provider dichiara accuratezza complessiva del 94,2% e FPR < 1% sul test set. Non sono stati identificati rischi sistemici ai sensi dell'Art. 51 AI Act: il sistema non ha FLOP > 10^25 e non è classificato come GPAI con rischio sistemico.",
      "LLM proprietario fine-tuned su 2 anni di email aziendali per suggerimento automatico di risposta ai clienti. Include componente generativa; il modello base (GPT-4-turbo) supera la soglia computazionale per la valutazione del rischio sistemico Art. 51 AI Act. È in corso una valutazione specifica del rischio GPAI; nel frattempo il sistema opera con supervisione umana al 100% per tutte le risposte generate.",
    ],
  },
  {
    id: "f1b_istruzioni_chiare", sectionKey: "fase1b",
    label: "Istruzioni del provider",
    question: "Le istruzioni per l'uso del provider sono chiare, complete e comprensibili (Art. 13 AI Act)?",
    ref: "Art. 13 AI Act",
    fieldType: "select_ynp",
    required: true,
    examples: [
      "Sì — il provider ha fornito documentazione tecnica completa (v4.1, 140 pagine): include use case previsti e non previsti, limiti di accuratezza per 12 sottogruppi demografici, bias report con analisi fairness, istruzioni per la sorveglianza umana, procedure di aggiornamento e gestione degli incidenti, canale di notifica prioritario per deployer. La documentazione è redatta ai sensi dell'Allegato IV AI Act e abbiamo verificato la sua aderenza con il nostro AI Compliance Officer.",
      "No — la documentazione fornita dal provider è incompleta: mancano le specifiche sui limiti del modello in condizioni out-of-distribution, le indicazioni per la gestione degli errori gravi e il bias report dettagliato per gruppi protetti. Abbiamo inviato una richiesta formale al provider (PEC del 15/03/2025) con 30 giorni di tempo per fornire la documentazione mancante, come richiesto dall'Art. 13 AI Act; in attesa di risposta.",
      "Parzialmente — la documentazione principale (use case, performance globali, istruzioni operative) è chiara e completa. Tuttavia mancano: (1) analisi dei bias per sottogruppi etnici e per età; (2) indicazioni specifiche per i casi edge in cui il modello è meno affidabile; (3) procedura documentata per la segnalazione di incidenti al provider. Abbiamo integrato i gap con una procedura operativa interna (SOP-AI-2024-03) fino all'aggiornamento della documentazione del provider.",
    ],
  },
  {
    id: "f1b_tipo_dati", sectionKey: "fase1b",
    label: "Tipo di dati",
    question: "Quale tipo di dati è stato usato per lo sviluppo e il test del sistema? Sono dati personali, particolari, anonimi o sintetici?",
    ref: "Art. 27 AI Act",
    fieldType: "multiline",
    required: true,
    examples: [
      "Training: dati transazionali anonimizzati di 3,2M clienti (2019–2024), con rimozione di identificatori diretti e k-anonimizzazione k≥5. Integrazione con dati sintetici (30% del training set) per i casi rari di frode. Nessuna categoria particolare Art. 9 GDPR. Test: dataset held-out del 20% con distribuzione temporale separata per evitare data leakage. Documentazione sulla provenienza dei dati disponibile nel Data Sheet (doc. DS-2024-07).",
      "Training su cartelle cliniche pseudonimizzate di 180.000 pazienti (categoria particolare: dati sanitari Art. 9(1) GDPR); i dati sono stati pseudonimizzati con chiave separata custodita dal DPO. Il trattamento per finalità di ricerca/sviluppo si fonda sull'Art. 9(2)(j) GDPR e sul provvedimento del Garante n. 412/2023. Test su dataset sintetico generato con GAN medica, validato clinicamente da un pannello di 5 medici specialisti.",
    ],
  },
  {
    id: "f1b_dati_personali", sectionKey: "fase1b",
    label: "Trattamento dati personali",
    question: "Nel deployment tratterai dati personali (incluse categorie particolari Art. 9 GDPR)?",
    ref: "Art. 27(4) AI Act · Art. 9 GDPR",
    fieldType: "select_ynp",
    required: true,
    examples: [
      "Sì — nel deployment trattiamo: (1) dati anagrafici (nome, CF, indirizzo) per matching con le pratiche esistenti; (2) dati comportamentali e transazionali (storico acquisti 24 mesi); (3) dati inferiti dal modello (score di rischio, cluster comportamentale). Nessun dato di categoria particolare Art. 9. Base giuridica: Art. 6(1)(b) GDPR (esecuzione del contratto). DPIA completata il 10/02/2025; DPO ha espresso parere favorevole con 3 raccomandazioni implementate.",
      "No — il sistema opera esclusivamente su dati aggregati e anonimizzati a livello di zona geografica (NUTS-3) e fascia d'età quinquennale; k-anonimizzazione k≥10 verificata con test di re-identificazione negativo. Nessun dato personale identificabile è elaborato dal sistema AI; il processo di anonimizzazione avviene a monte in un sistema separato. Non è richiesta DPIA per questo specifico trattamento AI.",
      "Parzialmente — utilizziamo dati pseudonimizzati con chiave separata: il sistema AI vede solo codici interni, non nomi o CF. Tuttavia, il rischio di re-identificazione è presente in caso di data breach della chiave di pseudonimizzazione (combinazione di età, professione e residenza riduce l'anonimato a k≈3). È in corso una DPIA approfondita (referente: DPO dpo@org.it); nel frattempo abbiamo rafforzato i controlli di accesso alla chiave.",
    ],
  },
  {
    id: "f1b_bias_valutati", sectionKey: "fase1b",
    label: "Valutazione bias",
    question: "I dati di input e di training sono stati valutati per possibili bias (demografici, storici, di campionamento)?",
    ref: "Art. 27 AI Act",
    fieldType: "select_ynp",
    required: true,
    examples: [
      "Sì — analisi di fairness completa condotta con Fairlearn e AI Fairness 360 sui dati di training e di test: bias rilevato su genere (FPR +8,2% per le donne rispetto agli uomini) e su età (score sistematicamente più bassi per over-55). Misure di mitigazione applicate: reweighting del dataset e threshold differenziato. Analisi di correlazione indiretta (proxy per etnia e disabilità) completata con risultato negativo. Documentazione nel Bias Report v2.1 (doc. BR-2024-09).",
      "No — il provider non ha fornito un'analisi formale dei bias nei materiali commerciali; ha dichiarato oralmente un'accuratezza del 95% ma senza breakdown per sottogruppi demografici. Abbiamo inviato una richiesta scritta di bias report (PEC 20/03/2025); in attesa di risposta. Nel frattempo, abbiamo avviato un'analisi autonoma sui nostri dati di produzione (primo report atteso Q2 2025).",
      "Parzialmente — analisi condotta sulle variabili demografiche principali (genere, età, nazionalità) con risultati accettabili (gap < 3% su tutte le metriche di fairness). Tuttavia, non sono state esaminate le correlazioni indirette (es. codice postale come proxy per etnia) né i bias intersezionali (es. donne over-50 con background migratorio). Completamento dell'analisi integrale previsto per Q3 2025.",
    ],
  },
  {
    id: "f1b_controllo_input", sectionKey: "fase1b",
    label: "Controllo dati di input",
    question: "Eserciti controllo sui dati di input? Sono rilevanti e sufficientemente rappresentativi rispetto alla finalità (Art. 26(4) AI Act)?",
    ref: "Art. 26(4) AI Act",
    fieldType: "select_ynp",
    required: true,
    examples: [
      "Sì — implementiamo un quality gate in tre livelli prima dell'invio al modello: (1) validazione strutturale (schema JSON, range dei valori, assenza di null critici); (2) test di rappresentatività demografica mensile (distribuzione per età e genere non deve deviare > 5% dal baseline); (3) monitoraggio drift con PSI mensile — alert automatico se PSI > 0,2 per qualsiasi feature chiave. I dati di input sono sotto il controllo diretto del nostro team Data Engineering; il provider non ha accesso diretto alla nostra infrastruttura.",
      "No — i dati di input vengono inseriti manualmente dagli operatori sportello attraverso un form web senza preprocessign automatico; la qualità dipende dalla diligenza individuale degli operatori. Non esiste un controllo di rappresentatività formalizzato. Questa lacuna è stata identificata come rischio critico nella valutazione Art. 9 AI Act: è in corso la progettazione di un quality gate automatizzato (delivery Q3 2025).",
      "Parzialmente — implementiamo controlli formali per i dati strutturati (validazione schema + range check) ma non per i dati non strutturati (testi liberi inseriti dagli utenti) che rappresentano circa il 20% dell'input totale. I testi non validati aumentano il rischio di input avvelenamento e di bias da linguaggio. È pianificata l'integrazione di un filtro NLP per i testi liberi (Q4 2025).",
    ],
  },

  // ── FASE 1C — Governance sistema ──────────────────────────────────────────

  {
    id: "f1c_contratti", sectionKey: "fase1c",
    label: "Accordi contrattuali",
    question: "Gli accordi contrattuali con il provider definiscono ruoli e responsabilità in tema di diritti fondamentali e risk management?",
    ref: "Art. 27 AI Act · Clausole tipo UE",
    fieldType: "select_ynp",
    required: true,
    examples: [
      "Sì — il contratto con il provider (firmato 01/02/2025) include: (1) Art. 14: clausola di information sharing obbligatorio entro 72h per incidenti che impattano i diritti fondamentali; (2) Art. 18: obbligo del provider di notificare modifiche sostanziali al modello con 60 giorni di preavviso; (3) Art. 22: responsabilità contrattuale del provider per violazioni dell'AI Act imputabili alla sua documentazione; (4) recepimento delle clausole tipo EU per trattamento dati AI (draft EDPB 2024). Il DPO ha approvato il contratto il 28/01/2025.",
      "No — il contratto in essere è un accordo standard SaaS che non include obblighi specifici relativi ai diritti fondamentali o all'AI Act. Le clausole sulla responsabilità sono generiche e limitano la liability del provider a 3 mesi di canone. La rinegoziazione è in corso con il supporto del team legale; nel frattempo abbiamo adottato una procedura interna di escalation per i rischi AI che bypassa le lacune contrattuali.",
      "Parzialmente — il contratto copre la conformità GDPR (DPA Art. 28, nomina DPO, clausole standard) ma non include obblighi espliciti legati all'Art. 27 AI Act (FRIA, notifica incidenti, documentazione tecnica aggiornata). È stata pianificata un'integrazione contrattuale (addendum) per Q2 2025; il provider ha accettato in principio di discuterne.",
    ],
  },
  {
    id: "f1c_sorveglianza_assegnata", sectionKey: "fase1c",
    label: "Sorveglianza umana assegnata",
    question: "Hai assegnato la sorveglianza umana del sistema a persone specifiche con competenza, formazione e autorità necessarie (Art. 26(2) AI Act)?",
    ref: "Art. 26(2) AI Act",
    fieldType: "select_yn",
    required: true,
    examples: [
      "Sì — la sorveglianza umana è assegnata formalmente con delega firmata dall'AD (delibera n. 2025-IA-03): Referente primario: Dott.ssa Federica Conti (AI Compliance Officer, 8 anni di esperienza in risk management); backup: Ing. Paolo Serra (Data Engineer senior). Il referente ha autorità esplicita di sospendere il sistema in caso di anomalie senza necessità di approvazione gerarchica. Formazione completata: certificazione AI Act Compliance (40h) + corso specifico sul sistema (16h) a febbraio 2025.",
      "No — la sorveglianza umana non è ancora stata formalizzata con una delega esplicita: al momento le attività di controllo sono distribuite informalmente tra il team IT e il responsabile di business unit, senza un punto di responsabilità chiaro. Questa lacuna è stata identificata come non conformità critica rispetto all'Art. 26(2) AI Act; piano di remediation: nomina formale entro 15 giorni, formazione entro 45 giorni.",
    ],
  },
  {
    id: "f1c_formazione", sectionKey: "fase1c",
    label: "Formazione dei supervisori",
    question: "Le persone designate alla sorveglianza umana sono adeguatamente formate?",
    ref: "Art. 26(2) AI Act",
    fieldType: "select_ynp",
    required: true,
    examples: [
      "Sì — tutti i supervisori designati hanno completato: (1) corso AI Act Compliance base (24h, provider: RegulaeOS, completato 10/03/2025, attestato n. CERT-2025-0124); (2) sessione pratica specifica sul sistema (8h, con simulazione di scenari di anomalia e procedure di escalation); (3) modulo su diritti fondamentali e FRIA (4h). Il programma di formazione è aggiornato annualmente; prossima sessione di aggiornamento: marzo 2026.",
      "No — la formazione non è ancora stata erogata ai supervisori designati. Il ritardo è dovuto alla rinegoziazione interna del piano di formazione aziendale. Piano di remediation approvato: formazione base AI Act Compliance entro 30 giorni dal go-live (erogazione prevista 15/05/2025, provider esterno selezionato con gara); nel frattempo il sistema opera in modalità pilota con supervisione rafforzata al 100%.",
      "Parzialmente — la formazione tecnica sul sistema (funzionamento, interfaccia, procedure operative) è stata completata da tutti i supervisori (8h, febbraio 2025). Tuttavia, il modulo su diritti fondamentali, bias e AI Act non è ancora stato erogato: è in programma per Q2 2025 con un provider specializzato. I supervisori non formati sulla parte diritti non hanno ancora l'autorizzazione a operare in autonomia.",
    ],
  },
  {
    id: "f1c_ai_literacy", sectionKey: "fase1c",
    label: "AI literacy",
    question: "Sono state adottate misure per garantire un livello sufficiente di alfabetizzazione AI per staff e operatori (Art. 4 AI Act)?",
    ref: "Art. 4 AI Act",
    fieldType: "select_ynp",
    required: true,
    examples: [
      "Sì — piano di AI literacy aziendale 2025 approvato dal board: (1) modulo base obbligatorio 4h su AI, bias e diritti fondamentali per tutti i 280 dipendenti che interagiscono col sistema (completato 87% a maggio 2025, target 100% entro luglio 2025); (2) modulo avanzato 8h per i 45 analisti che operano le decisioni (completato 100%); (3) aggiornamento annuale obbligatorio previsto da procedura HR n. PRO-HR-2025-12. Conformità con Art. 4 AI Act documentata nel registro della formazione.",
      "No — non esiste ancora un programma strutturato di AI literacy: la comprensione del sistema e dei suoi limiti dipende dall'iniziativa individuale dei dipendenti e dalla buona volontà dei team manager. Questo gap aumenta il rischio di over-reliance sulle decisioni automatiche e di sottoutilizzo della sorveglianza umana. Piano di remediation: definizione e approvazione del programma di AI literacy entro Q2 2025.",
      "Parzialmente — il personale tecnico (Data Engineering, IT) ha ricevuto formazione approfondita sul sistema (tecnica e funzionale). Tuttavia, il personale operativo che legge e usa quotidianamente i risultati del sistema (45 analisti del back office) non ha ricevuto formazione specifica sui limiti del modello, sui casi di falso positivo/negativo e sulle sue implicazioni per i diritti dei clienti. Formazione operativa in programma per giugno 2025.",
    ],
  },
  {
    id: "f1c_comunicazione_lavoratori", sectionKey: "fase1c",
    label: "Comunicazione ai lavoratori",
    question: "Hai informato i lavoratori e/o i loro rappresentanti dell'utilizzo del sistema prima della messa in uso (Art. 26(7) AI Act)?",
    ref: "Art. 26(7) AI Act",
    fieldType: "select_yn",
    required: false,
    examples: [
      "Sì — comunicazione preventiva inviata alle RSU e al Responsabile delle Relazioni Sindacali il 15/01/2025, 45 giorni prima del go-live previsto (01/03/2025). La comunicazione ha incluso: descrizione del sistema, finalità, dati trattati, impatto sui processi lavorativi, misure di tutela dei lavoratori. La consultazione sindacale si è conclusa il 05/02/2025 con il verbale di accordo n. 02/2025; i rappresentanti hanno richiesto un audit indipendente semestrale, accolto e inserito nel piano di monitoraggio.",
      "No — il sistema non elabora dati relativi ai dipendenti né incide sul loro rapporto di lavoro o sulle condizioni lavorative: opera esclusivamente su dati di clienti esterni. L'Art. 26(7) AI Act non è applicabile a questo specifico deployment. Questa valutazione è stata condivisa con il DPO e con il team HR che hanno confermato l'esenzione (nota interna del 20/01/2025).",
    ],
  },
  {
    id: "f1c_informazione_persone", sectionKey: "fase1c",
    label: "Informazione alle persone impattate",
    question: "Le persone soggette a decisioni del sistema sono informate del suo utilizzo (Art. 26(11) AI Act)?",
    ref: "Art. 26(11) AI Act",
    fieldType: "select_ynp",
    required: true,
    examples: [
      "Sì — le persone interessate sono informate attraverso: (1) informativa privacy aggiornata (v5.0 del 01/03/2025) con sezione dedicata all'utilizzo di sistemi AI, natura delle decisioni automatizzate, logica generale del sistema e diritti degli interessati (Art. 22 GDPR + Art. 86 AI Act); (2) banner contestuale nell'app (visualizzato al primo accesso post-aggiornamento); (3) FAQ pubblica sul sito in linguaggio semplificato; (4) disponibilità in italiano, inglese, francese e arabo. Test di comprensibilità condotto con focus group di 15 utenti.",
      "No — l'informativa privacy corrente non menziona l'utilizzo di sistemi di IA nella valutazione delle richieste. Gli utenti non sanno che le loro domande vengono valutate automaticamente da un modello. L'aggiornamento dell'informativa è stato approvato internamente ma non ancora pubblicato; go-live previsto entro 20 giorni. Nel frattempo il sistema opera in modalità non conforme all'Art. 26(11) AI Act: rischio di reclami formali da parte degli interessati.",
      "Parzialmente — i clienti sono informati nella pagina FAQ del sito che utilizziamo 'sistemi tecnologici avanzati' per l'elaborazione delle richieste, ma non ricevono: (1) informazioni sulla natura automatizzata delle decisioni; (2) dettagli sulla logica del sistema e sui fattori che influenzano la valutazione; (3) indicazioni sui diritti specifici previsti dall'Art. 86 AI Act. Aggiornamento dell'informativa in corso; completamento previsto entro 30 giorni.",
    ],
  },
  {
    id: "f1c_spiegabilita", sectionKey: "fase1c",
    label: "Spiegabilità delle decisioni",
    question: "Sei in grado di spiegare in modo comprensibile e significativo il funzionamento del sistema alle persone impattate (Art. 86 AI Act)?",
    ref: "Art. 86 AI Act",
    fieldType: "select_ynp",
    required: true,
    examples: [
      "Sì — abbiamo implementato un layer di spiegabilità basato su SHAP values che genera, per ogni decisione, una motivazione in linguaggio naturale accessibile (es. 'La sua richiesta è stata valutata positivamente principalmente in base alla stabilità lavorativa negli ultimi 3 anni e all'assenza di insoluti'). Le spiegazioni sono: (1) disponibili all'interessato su richiesta entro 5 giorni lavorativi (Art. 86 AI Act); (2) visualizzabili dall'analista umano in tempo reale; (3) archiviate per 5 anni ai fini di audit. Test di comprensibilità: 78% degli utenti ha dichiarato di capire la motivazione senza supporto aggiuntivo.",
      "No — il modello è di tipo black box (deep neural network a 12 layer) e non consente spiegazioni individuali significative con le tecniche standard. SHAP e LIME producono spiegazioni instabili e potenzialmente fuorvianti su questo tipo di architettura. Questa limitazione è stata segnalata al provider come gap critico; stiamo valutando l'adozione di un modello alternativo più interpretabile (Gradient Boosting) con prestazioni simili ma maggiore trasparenza.",
      "Parzialmente — siamo in grado di fornire spiegazioni a livello aggregato (es. 'il principale fattore è lo storico dei pagamenti per il 65% dei casi') ma non personalizzate per singola decisione individuale. Su richiesta esplicita, possiamo produrre manualmente una spiegazione approssimativa entro 10 giorni lavorativi, ma non in modo sistematico. Stiamo valutando l'integrazione di un modello surrogato interpretabile (decision tree) per le spiegazioni individuali (piano Q3 2025).",
    ],
  },

  // ── FASE 2 — Valutazione degli impatti ────────────────────────────────────

  {
    id: "f2_scenario", sectionKey: "fase2",
    label: "Scenario di impatto negativo",
    question: "Descrivi lo scenario (tipico e worst-case) in cui il deployment potrebbe impattare negativamente le persone sui loro diritti fondamentali.",
    ref: "Art. 27(1)(d) AI Act",
    fieldType: "multiline",
    required: true,
    examples: [
      "Scenario tipico: il modello di scoring assegna punteggi sistematicamente più bassi a richiedenti con cognome straniero (correlazione indiretta con etnia), determinando un tasso di rifiuto del 34% vs 18% per la popolazione generale → accesso ineguale al credito. Worst-case: in una crisi economica, l'esclusione sistematica di intere comunità dai servizi finanziari essenziali (mutuo, prestito personale) con effetti a lungo termine sull'inclusione finanziaria e sulla mobilità sociale.",
      "Scenario tipico: il sistema esclude automaticamente candidature con lacune nel curriculum superiori a 6 mesi, penalizzando sproporzionatamente le donne che hanno avuto periodi di maternità o caregiving familiare → impatto discriminatorio su genere (Art. 21 CDFUE). Worst-case: un'intera categoria di lavoratrici qualificate non viene mai convocata, replicando e amplificando bias storici nell'occupazione senza possibilità di correzione per l'assenza di supervisione sulle shortlist automatiche.",
    ],
  },
  {
    id: "f2_diritto_impattato", sectionKey: "fase2",
    label: "Diritto fondamentale impattato",
    question: "Quale diritto fondamentale è principalmente impattato nello scenario? (Carta dei Diritti Fondamentali UE — CDFUE)",
    ref: "Art. 27(1)(d) AI Act · CDFUE",
    fieldType: "multiline",
    required: true,
    examples: [
      "Diritto principale: non discriminazione (Art. 21 CDFUE) — il bias etnico nel modello di scoring crea disparità di trattamento non giustificata su caratteristica protetta (origine nazionale/etnica). Diritti secondari: dignità umana (Art. 1 CDFUE) — trattamento deumanizzante come numero; libertà di impresa (Art. 16) — limitazione indiretta alla creazione d'impresa; protezione dei dati (Art. 8 CDFUE) — trattamento automatizzato con effetti giuridici significativi senza meccanismo di contestazione adeguato.",
      "Diritto principale: libertà professionale e diritto al lavoro (Art. 15 CDFUE) — l'esclusione sistematica limita l'accesso all'occupazione in modo indirettamente discriminatorio. Diritti secondari: uguaglianza di genere (Art. 23 CDFUE) — impatto sproporzionato sulle donne; non discriminazione (Art. 21 CDFUE) — discriminazione indiretta su sesso; dignità umana (Art. 1) — riduzione della persona a pattern algoritmico. Nota: la discriminazione indiretta non richiede intenzionalità — è sufficiente l'effetto sproporzionato su gruppo protetto.",
    ],
  },
  {
    id: "f2_probabilita", sectionKey: "fase2",
    label: "Probabilità dell'impatto",
    question: "Quanto è probabile che lo scenario di impatto si materializzi, tenendo conto delle misure di governance, qualità dati e sorveglianza umana esistenti?",
    ref: "Art. 27(1)(d) AI Act",
    fieldType: "select_ynp",
    required: true,
    examples: [
      "Sì (alta) — il sistema è già in produzione in contesti analoghi e ha generato errori documentati: FPR del 15,3% su donne over 45 nel pilot (marzo 2025, n=2.400), con 87 rifiuti che in revisione manuale sarebbero stati approvati. Il Bias Report v2.1 evidenzia una correlazione significativa tra codice postale e tasso di rifiuto (proxy per area geografica/etnia). Probabilità di materializzazione dello scenario: alta senza interventi aggiuntivi.",
      "No (bassa) — il sistema è in fase pilota controllata (primo mese di produzione, n=450 decisioni) con supervisione umana al 100%: ogni raccomandazione del sistema viene verificata manualmente da un analista senior prima di produrre effetti. In queste condizioni, la probabilità di danno non mediato è molto bassa. La probabilità aumenterà all'allentamento della supervisione (programmato a M+3); la riValutazione della probabilità è in agenda per quella data.",
      "Parzialmente (media) — il sistema ha limiti noti (performance inferiore del 8% sulla fascia 18-25 anni) ma le misure di mitigazione attuali riducono parzialmente il rischio: human-in-loop su tutte le decisioni con score < 0,6 (circa 40% del volume), revisione trimestrale delle metriche di fairness. La probabilità residua dipende dall'efficacia della supervisione umana, che mostra un tasso di concordanza con il modello del 92% (rischio di automation bias).",
    ],
  },
  {
    id: "f2_gravita", sectionKey: "fase2",
    label: "Gravità del danno",
    question: "Quanto è grave il potenziale danno per le persone impattate? (Considera: entità, irreversibilità, numero di persone, vulnerabilità)",
    ref: "Art. 27(1)(d) AI Act",
    fieldType: "select_ynp",
    required: true,
    examples: [
      "Sì (alta) — l'impatto è significativo lungo tre dimensioni: (1) Entità: perdita di accesso a servizi essenziali (mutuo, prestito per sussistenza, finanziamento PMI) con effetti diretti sulla qualità di vita; (2) Irreversibilità: un rifiuto errato può danneggiare il credit score per anni, rendendo più difficile un secondo accesso al credito; (3) Vulnerabilità: i soggetti impattati appartengono spesso a gruppi con minori risorse legali e minore capacità di contestazione — difficoltà di rimedio reale anche quando formalmente disponibile. Stima persone impattate: 3.000–5.000/anno.",
      "No (bassa) — l'impatto potenziale è limitato: in caso di raccomandazione errata del sistema, l'effetto è un ritardo nell'approvazione di una pratica non essenziale (accesso a un servizio premium non urgente). L'errore è prontamente rimediabile: il cliente può richiedere revisione manuale entro 7 giorni con risposta garantita in 48h. Non vi sono conseguenze irreversibili, nessun soggetto vulnerabile è direttamente impattato, e il volume di decisioni errate stimate è inferiore a 20/mese.",
      "Parzialmente (media) — il danno potenziale è moderato: (1) Materiale: perdita economica limitata (accesso ritardato o ridotto a un benefit aziendale, stimato €200-€800 per persona colpita); (2) Psicologico: frustrazione, senso di ingiustizia, potenziale stigmatizzazione nell'ambiente di lavoro; (3) Reversibilità: parziale — la decisione è contestabile ma il processo di ricorso interno richiede 3-4 settimane, durante le quali il danno (anche psicologico) è già avvenuto.",
    ],
  },
  {
    id: "f2_misure_esistenti", sectionKey: "fase2",
    label: "Misure già in essere",
    question: "Quali azioni sono già in essere per prevenire o mitigare l'impatto sui diritti fondamentali?",
    ref: "Art. 27(1)(d) AI Act",
    fieldType: "multiline",
    required: true,
    examples: [
      "Misure in essere al momento dell'analisi: (1) Human-in-the-loop obbligatorio per tutte le decisioni con score < 0,35 (circa 40% del volume) — ogni caso viene rivisto da un analista senior entro 24h; (2) Audit trimestrale sul bias con report interno condiviso con il DPO e il Compliance Officer; (3) Meccanismo di contestazione attivo (form digitale + canale telefonico) con SLA di 10 giorni lavorativi; (4) Accordo con il provider per la condivisione del bias report aggiornato ogni 6 mesi; (5) Log completo di tutte le decisioni con retention di 5 anni.",
      "Misure già in essere: (1) Informativa trasparente sull'uso dell'AI (aggiornata marzo 2025) con spiegazione della logica del sistema in linguaggio accessibile; (2) Procedura di revisione manuale disponibile su richiesta entro 5 giorni lavorativi, senza costi per il richiedente; (3) Log auditabile di tutte le decisioni automatiche con marcatura temporale e codice operatore; (4) Revisione mensile dell'operato del sistema da parte del Responsabile della Qualità. Il tasso di contestazioni accolte in revisione manuale è 12% (indicatore di potenziale under-performance del modello su casi edge).",
    ],
  },
  {
    id: "f2_misure_aggiuntive", sectionKey: "fase2",
    label: "Misure aggiuntive pianificate",
    question: "Quali azioni aggiuntive pianifichi per ridurre ulteriormente probabilità e gravità dell'impatto? (Rifare la valutazione per verificare la riduzione)",
    ref: "Art. 27(1)(d) AI Act",
    fieldType: "multiline",
    required: true,
    examples: [
      "Azioni aggiuntive pianificate con scadenza e responsabile: (1) Implementazione explainability tool (SHAP personalizzato) — responsabile: Data Engineering, delivery Q2 2025; (2) Re-training su dataset rappresentativo ampliato con oversampling dei gruppi sottorappresentati — responsabile: ML Team + provider, delivery Q3 2025; (3) Istituzione comitato etico AI con riunioni trimestrali — responsabile: Compliance Officer, avvio Q2 2025; (4) Automatizzazione del processo di appello (risposta garantita 15gg) — responsabile: Customer Service + IT, delivery Q4 2025. Budget allocato: €85.000.",
      "Azioni aggiuntive pianificate per rafforzare la tutela dei diritti: (1) Creazione di un panel consultivo con rappresentanti delle comunità impattate (3 sessioni/anno) per il monitoraggio partecipato — responsabile: AI Ethics Lead, avvio Q3 2025; (2) Pubblicazione di una dashboard pubblica di monitoraggio con metriche di fairness aggiornate trimestralmente; (3) Report annuale di impatto sui diritti condiviso con il Garante Privacy e le autorità di settore; (4) Integrazione con il sistema di post-market surveillance (Art. 72 AI Act) per il monitoraggio continuo.",
    ],
  },

  // ── FASE 3 — Decisione di deployment ──────────────────────────────────────

  {
    id: "f3_impatti_residui", sectionKey: "fase3",
    label: "Impatti residui",
    question: "Vi sono impatti che potrebbero materializzarsi nonostante le misure di mitigazione adottate?",
    ref: "Art. 27 AI Act",
    fieldType: "select_yn",
    required: true,
    examples: [
      "Sì — permangono due impatti residui dopo l'applicazione di tutte le misure di mitigazione: (1) Rischio residuo A (basso): falsi negativi stimati al 3,2% — casi ad alto rischio non intercettati che potrebbero determinare un danno economico ai soggetti; stima volume: 15-20/mese; (2) Rischio residuo B (medio): possibile automation bias degli analisti umani che tendono a confermare la raccomandazione del sistema senza revisione critica nei casi borderline — tasso di concordanza 94% nei casi high-confidence. Entrambi i rischi residui sono stati valutati come accettabili con le misure di monitoring pianificate.",
      "No — a seguito dell'applicazione di tutte le misure di mitigazione identificate nella Fase 2, non si prevedono impatti residui significativi: il rischio è stato ridotto a un livello accettabile sia per probabilità (< 1% di decisioni errate con effetti gravi) che per gravità (danno reversibile entro 30 giorni). Questa valutazione sarà rivista entro 6 mesi o al verificarsi di un trigger di aggiornamento FRIA.",
    ],
  },
  {
    id: "f3_diritti_assoluti", sectionKey: "fase3",
    label: "Diritti assoluti coinvolti",
    question: "Gli impatti residui coinvolgono diritti fondamentali assoluti (es. divieto di tortura, divieto di lavoro forzato, libertà di pensiero)? In tal caso NON procedere.",
    ref: "CDFUE — diritti inderogabili",
    fieldType: "select_yn",
    required: true,
    examples: [
      "Sì — l'analisi degli impatti residui indica che il sistema potrebbe interferire con il diritto alla protezione contro la tortura e i trattamenti inumani (Art. 4 CDFUE) nel contesto di valutazione di richiedenti asilo in situazione di detenzione amministrativa: una decisione errata del sistema può prolungare la detenzione. Questo configura un'interferenza con un diritto assoluto non derogabile. STOP: il deployment non può procedere senza riesame radicale del design, consultazione legale e parere dell'Autorità nazionale sui diritti umani.",
      "No — gli impatti residui identificati (rischio di discriminazione indiretta nella valutazione creditizia, possibili errori nella pre-selezione CV) riguardano diritti fondamentali qualificabili, non assoluti: il diritto alla non discriminazione (Art. 21 CDFUE) e la libertà professionale (Art. 15) ammettono limitazioni giustificate da finalità legittime e proporzionate. L'interferenza residua è potenzialmente giustificabile come necessaria e proporzionata rispetto al beneficio del sistema.",
    ],
  },
  {
    id: "f3_accettabilita", sectionKey: "fase3",
    label: "Accettabilità degli impatti residui",
    question: "Gli impatti residui sono accettabili dal punto di vista dei diritti fondamentali? (Necessari e proporzionati rispetto al beneficio?)",
    ref: "Art. 27 AI Act · Principio di proporzionalità",
    fieldType: "select_ynp",
    required: true,
    examples: [
      "Sì — l'interferenza residua è accettabile sulla base di tre criteri: (1) Necessità: non esiste un mezzo alternativo ugualmente efficace che produca un impatto minore sui diritti (valutazione alternativas condotta il 10/02/2025); (2) Proporzionalità: il beneficio atteso (riduzione delle frodi del 70%, valore €2,4M/anno) è proporzionato all'interferenza residua (3,2% di FP su decisioni reversibili entro 10gg); (3) Tutele adeguate: meccanismi di rimedio, supervisione umana e monitoraggio attivi. Questa valutazione è stata condivisa con il DPO e con un parere legale esterno.",
      "No — il livello di rischio residuo è inaccettabile: nonostante le misure di mitigazione, il sistema produce un tasso di esclusione del 22% su una categoria protetta (età > 65) che non può essere giustificato dalla finalità del sistema. L'interferenza con il diritto alla non discriminazione (Art. 21 CDFUE) è sproporzionata rispetto al beneficio operativo. Raccomandazione: non procedere al deployment in queste condizioni; riesame del design del modello richiesto entro 60 giorni.",
      "Parzialmente — gli impatti residui sono accettabili a condizione che vengano implementate entro 30 giorni le seguenti misure aggiuntive: (1) riduzione della soglia di supervisione umana automatica da score < 0,35 a score < 0,50; (2) revisione semestrale obbligatoria delle metriche di fairness con report al Garante Privacy; (3) coinvolgimento trimestrale degli stakeholder rappresentativi delle comunità impattate. In assenza di queste condizioni, il deployment non può essere autorizzato.",
    ],
  },
  {
    id: "f3_rendicontazione", sectionKey: "fase3",
    label: "Rendicontazione pubblica",
    question: "È prevista una rendicontazione pubblica dei risultati della FRIA in linguaggio accessibile?",
    ref: "Art. 27 AI Act",
    fieldType: "select_ynp",
    required: false,
    examples: [
      "Sì — è prevista una sintesi pubblica della FRIA in linguaggio accessibile (massimo 4 pagine, livello di leggibilità Flesch-Kincaid 60+): pubblicazione sul sito istituzionale entro 30 giorni dal go-live, con aggiornamento annuale. La sintesi includerà: finalità del sistema, diritti valutati, misure di mitigazione adottate, meccanismi di rimedio disponibili. Per i cittadini stranieri: disponibile in 3 lingue. Il documento completo è disponibile su richiesta motivata al DPO.",
      "No — la FRIA è classificata come documento interno riservato in quanto contiene informazioni commerciali sensibili e dettagli tecnici del sistema. Non è prevista pubblicazione proattiva al momento. Su richiesta formale dell'Autorità di Vigilanza del Mercato o del Garante Privacy, il documento completo verrà trasmesso entro i termini di legge.",
      "Parzialmente — sarà predisposta e trasmessa una sintesi della FRIA al Garante Privacy e all'Autorità di Vigilanza del Mercato entro 30 giorni dal go-live, senza pubblicazione proattiva sul sito pubblico. La pubblicazione pubblica sarà valutata in sede di prima revisione annuale tenendo conto delle indicazioni dell'Ufficio europeo per l'IA sulle linee guida di trasparenza (attese per Q4 2025).",
    ],
  },
  {
    id: "f3_notifica_autorita", sectionKey: "fase3",
    label: "Notifica all'autorità",
    question: "È stata effettuata o pianificata la notifica all'autorità di vigilanza del mercato dell'esito della FRIA (Art. 27(2) AI Act)?",
    ref: "Art. 27(2) AI Act",
    fieldType: "select_ynp",
    required: false,
    examples: [
      "Sì — notifica formale della FRIA presentata all'Autorità di Vigilanza del Mercato (UIRM) e al Garante Privacy il 15/03/2025 tramite il sistema di notifica EU AI Database (Art. 71 AI Act); numero di protocollo: 2025-FRIA-IT-0089. L'Autorità ha confermato la ricevuta il 20/03/2025 e non ha sollevato obiezioni entro il termine di 30 giorni; il deployment è stato autorizzato a procedere. La FRIA sarà ri-notificata ad ogni aggiornamento sostanziale.",
      "No — la notifica formale non è applicabile al nostro caso specifico per due ragioni: (1) il sistema opera in modalità esclusivamente interna senza produrre decisioni che hanno effetti giuridici o significativamente incidenti su terzi; (2) la supervisione umana al 100% esclude l'automaticità delle decisioni richiesta per l'obbligo di notifica Art. 27(2). Questa valutazione è stata validata dal nostro team legale (parere n. LEGAL-2025-012 del 01/02/2025).",
      "Parzialmente — la procedura di notifica è stata avviata: istanza presentata tramite EU AI Database il 10/04/2025; attesa conferma formale dell'Autorità entro 45 giorni (scadenza stimata 25/05/2025). Nel frattempo il deployment procede in modalità pilota limitata (max 500 decisioni/mese) con supervisione umana rafforzata, come concordato con il Compliance Officer in attesa della notifica definitiva.",
    ],
  },

  // ── FASE 4 — Monitoraggio e riesame ───────────────────────────────────────

  {
    id: "f4_monitoraggio_impatti", sectionKey: "fase4",
    label: "Piano di monitoraggio",
    question: "Come monitorerai gli impatti sui diritti fondamentali e risponderai agli impatti negativi emergenti (Art. 27(1)(f) AI Act)?",
    ref: "Art. 27(1)(f) AI Act",
    fieldType: "multiline",
    required: true,
    examples: [
      "Piano di monitoraggio strutturato: (1) Dashboard KPI mensile automatica: FPR per gruppo demografico (genere, età, nazionalità), tasso di contestazioni accolte, volume di decisioni supervisionate manualmente — alert automatico se qualsiasi KPI supera la soglia critica; (2) Comitato di revisione trimestrale con partecipazione del DPO, AI Compliance Officer e rappresentante del business; (3) Canale di reclamo dedicato (email + form digitale) con SLA di 10 giorni lavorativi e obbligo di risposta motivata; (4) Integrazione con il Post-Market Surveillance Plan (Art. 72 AI Act) per il monitoraggio sistemico.",
      "Monitoraggio su tre livelli: (1) Interno continuo: log auditabile di tutte le decisioni con analisi settimanale automatica delle anomalie statistiche; (2) Audit semestrale da parte di ente terzo indipendente accreditato (EN ISO/IEC 17020), con relazione scritta condivisa con il Garante Privacy; (3) Report annuale pubblico sull'impatto sui diritti fondamentali, disponibile sul sito istituzionale. Meccanismo di risposta agli impatti negativi emergenti: procedura di escalation con attivazione entro 24h e possibilità di sospensione del sistema entro 4h in caso di incidente grave.",
    ],
  },
  {
    id: "f4_efficacia_misure", sectionKey: "fase4",
    label: "Efficacia delle misure",
    question: "Con quali indicatori e con quale frequenza monitorerai l'efficacia delle misure di mitigazione adottate?",
    ref: "Art. 27(1)(f) AI Act",
    fieldType: "multiline",
    required: true,
    examples: [
      "Indicatori di efficacia con soglie critiche: (1) Equalized Odds — gap tollerato < 5% tra gruppi demografici; alert se superato per 2 mesi consecutivi; (2) Tasso contestazioni accolte < 15% (oltre indica potenziale under-performance sistematica); (3) Tempo medio risoluzione contestazioni < 10 giorni lavorativi; (4) PSI (Population Stability Index) < 0,2 per le feature principali. Frequenza: monitoraggio automatico h24 per le metriche tecniche, revisione umana mensile dei KPI di fairness, report trimestrale al comitato direttivo.",
      "KPI di efficacia su due livelli: Tecnico — accuracy per sottogruppo demografico (target: gap < 3% rispetto all'accuracy globale), tasso di falsi positivi/negativi per categoria protetta, PSI mensile. Operativo — % decisioni riviste con esito diverso in appello (target < 10%), NPS degli utenti che hanno contestato una decisione, tempo medio di rimedio. Revisione trimestrale con report al board e condivisione con il DPO; revisione straordinaria entro 5 giorni in caso di incidente segnalato.",
    ],
  },
  {
    id: "f4_trigger_aggiornamento", sectionKey: "fase4",
    label: "Trigger di aggiornamento FRIA",
    question: "Quali eventi o condizioni richiedono l'aggiornamento e la ripetizione della FRIA?",
    ref: "Art. 27(1)(f) AI Act",
    fieldType: "multiline",
    required: true,
    examples: [
      "Trigger obbligatori per l'aggiornamento/ripetizione della FRIA: (1) Cambio significativo della finalità d'uso o estensione a nuova popolazione (threshold: > 15% di nuovi segmenti); (2) Nuova versione del modello con modifiche al comportamento predittivo segnalata dal provider (entro 30gg dalla notifica); (3) Incidente significativo (danno a un gruppo di persone, violazione segnalata al Garante); (4) Reclamo fondato accolto che evidenzia un pattern sistematico; (5) Cambio normativo rilevante (nuove linee guida EU AI Office, aggiornamenti Art. 27); (6) Revisione annuale programmata (prima scadenza: maggio 2026).",
      "Trigger di aggiornamento FRIA definiti formalmente nella procedura interna AI-PROC-2025-04: (1) Detection di bias superiore alle soglie critiche per due mesi consecutivi; (2) Modifica contrattuale con il provider che altera le clausole su diritti fondamentali; (3) Audit interno o esterno con esito negativo (raccomandazione di revisione); (4) Variazione significativa del contesto di deployment (nuova normativa settoriale, cambio organizzativo, variazione della popolazione di utenti > 20%); (5) Richiesta motivata dell'Autorità di Vigilanza del Mercato. La FRIA aggiornata viene completata entro 30 giorni dal trigger e il DPO deve esprimere parere entro 15 giorni successivi.",
    ],
  },
  {
    id: "f4_comportamenti_anomali", sectionKey: "fase4",
    label: "Comportamenti anomali e aggiornamenti d'emergenza",
    question: "Quali tecniche utilizzi per rilevare comportamenti anomali del sistema e come gestisci gli aggiornamenti d'emergenza?",
    ref: "Art. 27 AI Act",
    fieldType: "multiline",
    required: false,
    examples: [
      "Rilevazione comportamenti anomali: sistema di alerting automatico multi-livello — (L1) alert soft: PSI > 0,15 su qualsiasi feature chiave, notifica via email al team Data; (L2) alert critico: PSI > 0,25 o accuracy drop > 3% → sospensione automatica delle decisioni ad alto impatto e notifica immediata al Compliance Officer; (L3) incidente grave → attivazione procedura di emergenza. Gestione aggiornamenti d'emergenza: patch autorizzata dal CTO entro 24h con test di regressione obbligatorio (suite di test > 200 casi) prima del ripristino. Roll-back automatico disponibile entro 4h.",
      "Monitoraggio comportamenti anomali: log analysis quotidiana automatica con alerting su metriche chiave (anomalie statistiche > 3 sigma rispetto alla baseline). Rilevazione umana: sessione di revisione settimanale del team Data Engineering con focus su pattern anomali nelle decisioni ad alta confidenza. Procedura di emergenza: il supervisore umano designato può sospendere il sistema in autonomia entro 30 minuti dal rilevamento di un'anomalia critica; escalation al Responsabile di Business entro 2h; piano di comunicazione alle parti interessate entro 24h. Tutte le sospensioni vengono documentate nel registro degli incidenti AI.",
    ],
  },

  // ── FASE 5 — Stakeholder e coinvolgimento ─────────────────────────────────

  {
    id: "f5_temi_engagement", sectionKey: "fase5",
    label: "Temi dell'engagement",
    question: "Quali sono i temi centrali del coinvolgimento degli stakeholder per questa FRIA? Quali diritti e comunità sono prioritarie?",
    ref: "ECNL Framework for Meaningful Engagement",
    fieldType: "multiline",
    required: false,
    examples: [
      "Temi centrali dell'engagement: (1) Non discriminazione e bias algoritmico — con focus sulle comunità più esposte al rischio di impatto sproporzionato; (2) Diritto alla spiegazione e contestazione — accessibilità e comprensibilità delle motivazioni in linguaggio non tecnico; (3) Accesso ai rimedi — efficacia reale dei meccanismi di ricorso, non solo formale. Stakeholder chiave identificati: comunità dei richiedenti di credito non bancable, organizzazioni della società civile (Adiconsum, Codacons), Garante Privacy, associazioni per la tutela delle minoranze.",
      "Temi prioritari per il coinvolgimento degli stakeholder nel contesto del deployment (sistema di scoring occupazionale): (1) Trasparenza algoritmica — come vengono prese le decisioni, quali fattori contano davvero; (2) Fairness e parità di trattamento — con focus su genere, età e origine; (3) Meccanismi di rimedio efficaci — velocità, accessibilità e reale reversibilità. Priorità di engagement: rappresentanti dei candidati (sindacati categoria), esperti di diritti del lavoro (CISL, CGIL AI desk), organizzazioni di tutela delle donne nel lavoro.",
    ],
  },
  {
    id: "f5_scopo_codesign", sectionKey: "fase5",
    label: "Co-design con stakeholder",
    question: "Descrivi il processo di consultazione e co-design condotto con stakeholder esterni (CSO, esperti di diritti, rappresentanti delle comunità).",
    ref: "ECNL Framework",
    fieldType: "multiline",
    required: false,
    examples: [
      "Processo di co-design condotto in 3 fasi: (1) Fase esplorativa (febbraio 2025): workshop di 3 ore con Adiconsum, Codacons e rappresentanti di comunità immigrate (28 partecipanti); emerse priorità: spiegazioni più semplici, processo di appello sotto i 15 giorni; (2) Fase di validazione (marzo 2025): questionario online somministrato a 150 ex-richiedenti su comprensibilità delle comunicazioni del sistema; (3) Fase di integrazione: 4 delle 6 raccomandazioni emerse sono state integrate nel design del sistema. Le modifiche non accettate (sospensione totale del sistema in caso di ricorso) sono state motivate per iscritto e condivise con i partecipanti. Registro consultazioni disponibile su richiesta.",
      "Processo di co-design in fase di pianificazione: (1) Luglio 2025: panel consultivo con il Danish Institute for Human Rights (DIHR) per validazione metodologica della FRIA; (2) Settembre 2025: focus group con rappresentanti delle categorie lavorative più esposte (contratti atipici, rientri da maternità); (3) Ottobre 2025: consultazione con il desk AI della CGIL e della CISL per la valutazione dell'impatto sui lavoratori. Budget stanziato: €15.000. Responsabile coordinamento: AI Ethics Lead (nome: dott.ssa M. Conti).",
    ],
  },
  {
    id: "f5_commitment_interno", sectionKey: "fase5",
    label: "Commitment interno",
    question: "Chi è il champion interno (senior) e qual è il team di riferimento per la FRIA?",
    ref: "ECNL Framework",
    fieldType: "multiline",
    required: false,
    examples: [
      "Champion senior (board level): CFO Dott. Andrea Ferraris, sponsor esecutivo con autorità di allocazione budget e blocco del deployment. Team di riferimento per la FRIA: (1) AI Compliance Officer Dott.ssa Federica Conti (responsabile FRIA); (2) DPO Avv. Marco Sala (GDPR e Art. 27 AI Act); (3) Head of Product Ing. Simone Bari (use case design); (4) Lead ML Engineer Ing. Anna Ricci (sistema tecnico); (5) HR Ethics Officer Dott.ssa Laura Greco (impatto sui lavoratori). Comitato etico AI convocato mensilmente; quorum: 4/5 membri. Il team si coordina con un consulente esterno specializzato in diritti umani e AI (NHRI network).",
      "Champion: CTO (board level). Team operativo: Compliance Manager, Risk Officer, Lead Data Engineer. Gap identificato: nessun membro del team ha formazione specifica in diritti umani o impact assessment; questo è un rischio operativo per la qualità della FRIA. Piano di remediation: (1) assunzione di un AI Ethics Specialist (processo di selezione avviato, delivery Q3 2025); (2) interim: consulenza esterna con il Danish Institute for Human Rights per la supervisione metodologica della presente FRIA.",
    ],
  },
  {
    id: "f5_integrazione_input", sectionKey: "fase5",
    label: "Integrazione dell'input",
    question: "Come è stato integrato l'input degli stakeholder? Chi ha contribuito, cosa è stato recepito e cosa non è stato integrato (con motivazione)?",
    ref: "ECNL Framework",
    fieldType: "multiline",
    required: false,
    examples: [
      "Tracciamento dell'integrazione dell'input degli stakeholder (Registro consultazioni v2.1, aggiornato 15/04/2025): (1) Adiconsum (workshop 10/02/2025): segnalato gap nell'informativa privacy → INTEGRATO: nuova sezione 'Uso dell'IA' aggiunta all'informativa (pubblicata 01/03/2025); (2) Rappresentanti comunità migranti: richiesto processo di appello più veloce → INTEGRATO: SLA ridotto da 20 a 10 giorni lavorativi; (3) CGIL desk AI: richiesta sospensione totale del sistema per 90 giorni per ulteriori valutazioni → NON INTEGRATO (motivazione scritta inviata il 25/02/2025): misura sproporzionata rispetto ai rischi residui identificati; alternativa proposta e accettata: monitoraggio rafforzato nei primi 3 mesi.",
      "Documentazione delle consultazioni: registro pubblico disponibile sul sito istituzionale con: data sessione, organizzazioni partecipanti (con anonimizzazione delle persone fisiche), principali osservazioni emerse, disposizioni adottate e motivazione per le osservazioni non recepite. Prossimo aggiornamento del registro: dopo la sessione di luglio 2025 con il DIHR. Il registro è consultabile da qualsiasi interessato su richiesta scritta al DPO.",
    ],
  },
];

// ─── Meta ─────────────────────────────────────────────────────────────────────

export const FRIA_TEMPLATE_META = {
  title: "Valutazione d'Impatto sui Diritti Fondamentali (FRIA)",
  legalBasis: "Art. 27 Reg. (UE) 2024/1689 (AI Act)",
  methodology: "Questionario DIHR/ECNL (dic. 2025)",
  version: "1.0",
  disclaimer:
    "Template basato su Art. 27 AI Act e questionario ufficiale DIHR/ECNL. Bozza per revisione del referente diritti fondamentali, non documento definitivo. Allineare al template ufficiale dell'Ufficio europeo per l'IA quando disponibile.",
} as const;
