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
      "Il sistema è impiegato per il monitoraggio delle frodi nei pagamenti online: rileva pattern anomali in tempo reale e blocca transazioni sospette. Alternative considerate: revisione manuale (troppo lenta) e regole statiche (troppo rigide).",
      "Il sistema pre-seleziona i curricula nella fase di selezione del personale, riducendo i tempi di screening. Alternative: outsourcing a società di selezione, screening manuale (non scalabile).",
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
      "Sì — il sistema è usato esattamente come descritto nelle istruzioni d'uso e nei materiali commerciali del provider; nessuna deviazione rilevata.",
      "No — il nostro caso d'uso differisce in modo significativo: applichiamo il sistema a una popolazione non prevista dal provider.",
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
      "Sì — abbiamo integrato un modulo di preprocessing proprietario che modifica significativamente i dati di input; ai sensi dell'Art. 25(1) potremmo essere considerati provider.",
      "No — il sistema viene usato as-is senza alcuna modifica al codice o ai parametri; siamo configurati come deployer.",
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
      "Uso continuativo: il sistema è attivo 24/7 per il monitoraggio in tempo reale. Durata prevista del deployment: 3 anni con revisione annuale.",
      "Uso batch mensile: il sistema elabora i dati una volta al mese; durata prevista 12 mesi.",
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
      "Sì — il deployment si basa sull'art. 6(1)(b) GDPR (esecuzione del contratto) e sulla procedura interna di autorizzazione n. 2024-IA-07.",
      "No — al momento non è stata formalizzata una base giuridica specifica: la situazione è in fase di regolarizzazione.",
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
      "Utenti diretti: dipendenti del deployer (100 persone) che usano il sistema quotidianamente. Impattati indiretti: clienti finali le cui richieste vengono valutate automaticamente (circa 50.000/mese).",
      "Gruppi impattati: richiedenti asilo la cui domanda viene pre-classificata dal sistema; studenti universitari il cui profilo accademico viene valutato.",
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
      "Sì — il sistema valuta richieste di sussidio: gli utenti includono persone in difficoltà economica, anziani e persone con disabilità con minori risorse di rimedio.",
      "No — il sistema opera esclusivamente su operatori interni qualificati (analisti finanziari); nessun soggetto vulnerabile è direttamente impattato.",
      "Parzialmente — la maggior parte degli utenti non è vulnerabile, ma potrebbero esserci minori tra i soggetti di cui si trattano i dati.",
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
      "Rimedi disponibili: Garante Privacy (DPA), Difensore civico per i servizi pubblici, ricorso amministrativo interno, mediazione.",
      "Rimedi disponibili: ufficio di reclamo interno (Art. 77 GDPR), ricorso al tribunale competente, organismo di vigilanza di settore.",
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
      "Sistema di ML supervisionato (Random Forest) addestrato su 5 anni di dati storici; non include componenti di IA generativa; nessun rischio sistemico.",
      "LLM fine-tuned su dati aziendali per suggerimento automatico: componente generativa presente; valutare rischio sistemico Art. 51 AI Act.",
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
      "Sì — la documentazione tecnica include use case previsti, limiti di accuratezza, istruzioni per la sorveglianza umana e procedure di aggiornamento.",
      "No — le istruzioni sono incomplete: mancano le specifiche sui limiti del modello e le indicazioni per la gestione degli errori.",
      "Parzialmente — la documentazione è chiara sulle funzionalità principali ma incompleta riguardo ai bias noti e alle limitazioni edge-case.",
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
      "Training su dati personali anonimizzati di clienti (2019-2023) e dati sintetici per i casi rari. Nessuna categoria particolare Art. 9.",
      "Training su dati di pazienti pseudonimizzati (categoria particolare: dati sanitari Art. 9 GDPR); test su dataset sintetico.",
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
      "Sì — tratteremo dati anagrafici e comportamentali di utenti registrati (dati comuni). Nessun dato particolare Art. 9.",
      "No — il sistema elabora solo dati aggregati e anonimizzati; nessun dato personale identificabile.",
      "Parzialmente — trattiamo dati pseudonimizzati, ma il rischio di re-identificazione è presente; DPIA è in corso.",
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
      "Sì — analisi di fairness condotta con Fairlearn: bias rilevato su genere (FPR +8% per donne); misura di mitigazione applicata.",
      "No — il provider non ha documentato l'analisi dei bias; richiederemo la documentazione o condurremo un'analisi autonoma.",
      "Parzialmente — analisi condotta solo per le variabili demografiche principali; le correlazioni indirette non sono state esaminate.",
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
      "Sì — implementiamo un quality gate prima dell'input: validazione schema, test di rappresentatività e monitoraggio drift mensile.",
      "No — i dati di input vengono inseriti direttamente dagli utenti senza preprocessing; nessun controllo di qualità formalizzato.",
      "Parzialmente — abbiamo controlli formali solo per i dati strutturati; i dati non strutturati non sono pre-validati.",
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
      "Sì — il contratto include clausole su information sharing, gestione incidenti e responsabilità su violazioni dei diritti; recepisce le clausole tipo UE.",
      "No — il contratto è generico e non include obblighi specifici su diritti fondamentali o AI Act; in rinegoziazione.",
      "Parzialmente — il contratto copre la GDPR compliance ma non include obblighi espliciti legati all'AI Act Art. 27.",
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
      "Sì — incaricato: Dott. Marco Rossi (AI Compliance Officer), con delega formale firmata dal CTO; supporto del team IT per i controlli tecnici.",
      "No — la sorveglianza non è ancora formalizzata; siamo in fase di definizione del ruolo.",
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
      "Sì — i supervisori hanno completato il corso AI Act Compliance (24h) e una sessione specifica sul sistema (8h) a marzo 2024.",
      "No — la formazione non è ancora stata erogata; in programma per Q3 2024.",
      "Parzialmente — formazione tecnica completata, ma non quella sui diritti fondamentali e l'AI Act.",
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
      "Sì — piano di AI literacy aziendale: modulo obbligatorio da 4h per tutti i dipendenti che interagiscono col sistema; completato 85% nel 2024.",
      "No — non esiste ancora un programma strutturato di AI literacy; le conoscenze dipendono dall'iniziativa individuale.",
      "Parzialmente — il personale tecnico ha ricevuto formazione, ma non il personale operativo che usa i risultati del sistema.",
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
      "Sì — comunicazione preventiva inviata alle RSU il 15/01/2024, 30 giorni prima del go-live; consultazione registrata nel verbale n. 02/2024.",
      "No — non applicabile: il sistema non è rivolto ai dipendenti; non è stata ritenuta necessaria la comunicazione ai rappresentanti.",
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
      "Sì — informativa privacy aggiornata con sezione specifica sull'AI; banner informativo nell'app; disponibile in 3 lingue.",
      "No — l'informativa non menziona l'utilizzo di sistemi AI; aggiornamento in corso.",
      "Parzialmente — i clienti sono informati dell'uso di AI ma non ricevono dettagli sul sistema specifico e sulle sue implicazioni.",
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
      "Sì — abbiamo implementato un sistema di spiegazione automatica (SHAP values) che genera motivazioni in linguaggio naturale per ogni decisione.",
      "No — il modello è una black box; non abbiamo strumenti di explainability implementati.",
      "Parzialmente — possiamo fornire spiegazioni a livello aggregato ma non personalizzate per singola decisione.",
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
      "Scenario: il sistema di scoring del credito con bias storico assegna punteggi bassi a gruppi minoritari → rifiuto ingiustificato di prestiti. Worst-case: esclusione sistematica da servizi finanziari essenziali.",
      "Scenario: il sistema di pre-selezione CV esclude candidati con lacune nel curriculum (spesso donne in maternità) → impatto discriminatorio sull'occupazione.",
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
      "Diritto principale: non discriminazione (Art. 21 CDFUE) — il bias impatta sproporzionatamente gruppi etnici minoritari. Diritti secondari: dignità umana (Art. 1), protezione dati (Art. 8).",
      "Diritto principale: lavoro e accesso all'occupazione (Art. 15 CDFUE). Diritti secondari: uguaglianza di genere (Art. 23), non discriminazione (Art. 21).",
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
      "Sì (alta) — il sistema è già in produzione in contesti simili e ha generato errori documentati: FPR 15% su donne over 45; impatto già rilevato.",
      "No (bassa) — il sistema è in fase pilota controllata con supervisione umana al 100%; probabilità di danno senza supervisione: molto bassa.",
      "Parzialmente (media) — il sistema ha limiti noti ma le misure di mitigazione attuali (human-in-loop al 60%) riducono parzialmente il rischio.",
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
      "Sì (alta) — l'impatto è significativo: perdita di accesso a servizi essenziali (welfare, alloggio), con difficoltà di rimedio e potenziali effetti irreversibili.",
      "No (bassa) — l'impatto è limitato: ritardo nell'erogazione di un servizio non essenziale, facilmente rimediabile su richiesta.",
      "Parzialmente (media) — danno materiale moderato (perdita economica limitata) o psicologico (frustrazione, stigmatizzazione), parzialmente reversibile.",
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
      "Misure in essere: human-in-the-loop obbligatorio per tutte le decisioni con score < 0.3; audit trimestrale sul bias; meccanismo di contestazione attivo; il provider ha condiviso il bias report.",
      "Misure in essere: informativa trasparente, possibilità di ricorso manuale, log di tutte le decisioni per audit post-hoc.",
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
      "Azioni pianificate: implementazione explainability tool (Q2 2025); re-training su dataset più rappresentativo; istituzione comitato etico AI; processo di appello automatico entro 30gg.",
      "Azioni pianificate: engagement con comunità impattate (panel consultivo), dashboard di monitoraggio pubblico, report annuale di impatto sui diritti.",
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
      "Sì — rimane un rischio residuo di falsi negativi (casi gravi non rilevati) nonostante le misure: stimato 5% degli scenari ad alto rischio potrebbe non essere intercettato.",
      "No — le misure in essere sono sufficienti a ridurre il rischio a un livello accettabile; non si prevedono impatti residui significativi.",
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
      "Sì — il sistema potrebbe interferire con un diritto assoluto in modo inaccettabile: STOP, non procedere senza riesame radicale e consultazione legale.",
      "No — gli impatti residui non riguardano diritti assoluti ma diritti qualificabili (privacy, non discriminazione); interferenza potenzialmente giustificabile.",
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
      "Sì — l'interferenza residua è limitata, necessaria e proporzionata rispetto al beneficio pubblico; le misure riducono il rischio a un livello tollerabile.",
      "No — il livello di rischio residuo è inaccettabile: l'impatto su diritti fondamentali non può essere giustificato; raccomandiamo di non procedere.",
      "Parzialmente — accettabile solo con condizioni aggiuntive: monitoraggio rafforzato, revisione semestrale, coinvolgimento continuo degli stakeholder.",
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
      "Sì — pubblicheremo una sintesi della FRIA in linguaggio accessibile sul sito web entro 30 giorni dal go-live, con aggiornamento annuale.",
      "No — la FRIA è un documento interno riservato; la pubblicazione pubblica non è prevista al momento.",
      "Parzialmente — sarà resa disponibile una sintesi al DPA su richiesta ma non pubblicata proattivamente.",
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
      "Sì — notifica presentata al Garante il 15/03/2024 con esito positivo; numero protocollo: 2024-FRIA-0042.",
      "No — non applicabile nel nostro caso (esenzione art. 27(2) — uso esclusivamente interno con supervisione umana al 100%).",
      "Parzialmente — la procedura di notifica è in corso; attesa risposta entro 45 giorni.",
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
      "Piano: dashboard KPI mensile (FPR per gruppo demografico, numero reclami); comitato di revisione trimestrale; canale di reclamo dedicato con SLA 10gg lavorativi.",
      "Monitoraggio: audit semestrale da parte di ente esterno indipendente; report annuale pubblico; meccanismo di segnalazione interno.",
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
      "Indicatori: Equalized Odds (gap < 5% tra gruppi), numero reclami mensili, tempo medio risoluzione contestazioni. Frequenza: monitoraggio automatico continuo + revisione umana mensile.",
      "KPI: accuracy per sottogruppo demografico, % decisioni riviste in appello, NPS degli utenti. Revisione trimestrale con report al board.",
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
      "Trigger: cambio significativo della finalità d'uso, nuova versione del modello AI, incidente o reclamo significativo, cambio normativo rilevante, nuova popolazione di utenti.",
      "Trigger: detection di bias superiore alla soglia critica, modifica contrattuale con il provider, audit negativo, variazione del contesto di deployment.",
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
      "Rilevazione: alerting automatico su data drift (PSI > 0.2) e performance degradation (accuracy drop > 3%); roll-back entro 4h. Emergenza: patch procedure con approvazione CTO entro 24h.",
      "Monitoraggio: log analysis quotidiana, threshold alert su metriche chiave. Emergenza: procedura di sospensione del sistema con escalation al responsabile entro 2h.",
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
      "Temi: non discriminazione, diritto alla spiegazione, accesso ai rimedi. Stakeholder chiave: comunità impattate, organizzazioni della società civile, DPA.",
      "Temi: trasparenza algoritmica, fairness del sistema, meccanismi di rimedio efficaci. Priorità: rappresentanti degli utenti finali e degli interessati.",
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
      "Consultazione: workshop con 3 organizzazioni della società civile; 2 sessioni con utenti finali rappresentativi. Metodo: focus group + questionario. Feedback integrati: spiegazioni semplificate, appello più rapido.",
      "In pianificazione: panel consultivo con esperti NHRI, consultazione con rappresentanti delle comunità impattate entro Q1 2025.",
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
      "Champion: CFO (board level). Team: Legal (AI Act/diritti), DPO (GDPR), Head of Product, AI Engineer, HR Ethics Officer. Comitato etico AI convocato mensilmente.",
      "Champion: CTO. Team: compliance, risk, engineering. Nota: manca expertise in diritti umani; in fase di assunzione di un AI Ethics specialist.",
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
      "Input integrato: (1) Organizzazione Y segnalato gap nell'informativa → integrato con nuova sezione AI. (2) Utenti richiesto appello → implementato entro 30gg. Non recepito: sospensione totale del sistema (sproporzionata).",
      "Documentazione: registro pubblico delle consultazioni con data, partecipanti, osservazioni e disposizioni.",
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
