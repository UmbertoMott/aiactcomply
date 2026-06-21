/**
 * dpia-template.ts
 * ------------------------------------------------------------------
 * Template DPIA strutturato — base-dati per il tool catalog-first.
 * Stesso ruolo che Registro_Rischi_Template_AI_Act_Art9.docx ha per il Risk Register:
 * alimenta prefill, catalogo e visualizzazione del tool DPIA.
 *
 * FONTI (verificate sul testo, non a memoria):
 *  - GDPR Art. 35(7)(a–d) — contenuti obbligatori della DPIA
 *  - GDPR Art. 36 — consultazione preventiva (rischio residuo elevato)
 *  - WP248 rev.01 (Linee guida EDPB/ex-WP29 sulla DPIA)
 *      • 9 criteri di screening
 *      • regola dei 2 criteri
 *      • 3 eventi temuti: accesso illegittimo, modifica indesiderata, scomparsa dati
 *      • fonti di rischio (considerando 90 GDPR)
 *      • rischio residuo
 *
 * NOTE D'INTEGRAZIONE:
 *  - I livelli usano lo stesso dominio del tool: "low" | "medium" | "high".
 *  - Il rischio (iniziale e residuo) si calcola con la funzione esistente computeRiskLevel():
 *    NON ridefinirla qui. Questo file fornisce solo struttura e cataloghi-seme.
 *  - Ogni campo precompilabile dall'AI va mostrato con badge "✦ AI — verifica e conferma".
 */

export type RiskLevelInput = "low" | "medium" | "high";

/* ──────────────────────────────────────────────────────────────────
 * 1. SCHELETRO Art. 35(7) → mappatura ai 6 step del tool
 * ──────────────────────────────────────────────────────────────── */

export interface DpiaStep {
  step: 0 | 1 | 2 | 3 | 4 | 5;
  key: string;
  label: string;
  legalRef: string;
  purpose: string;
}

export const DPIA_STEPS: DpiaStep[] = [
  {
    step: 0,
    key: "screening",
    label: "Screening",
    legalRef: "GDPR Art. 35(1) + WP248 (criteri)",
    purpose: "Verificare se il trattamento richiede una DPIA (catalogo dei 9 criteri WP248).",
  },
  {
    step: 1,
    key: "description",
    label: "Descrizione",
    legalRef: "GDPR Art. 35(7)(a)",
    purpose: "Descrizione sistematica del trattamento e delle finalità (inclusi eventuali legittimi interessi).",
  },
  {
    step: 2,
    key: "necessity",
    label: "Necessità",
    legalRef: "GDPR Art. 35(7)(b)",
    purpose: "Valutazione di necessità e proporzionalità rispetto alle finalità (bilancia finalità ⇄ invasività).",
  },
  {
    step: 3,
    key: "risks",
    label: "Rischi",
    legalRef: "GDPR Art. 35(7)(c)",
    purpose: "Valutazione dei rischi per i diritti e le libertà degli interessati (catalogo eventi temuti + fonti).",
  },
  {
    step: 4,
    key: "measures",
    label: "Misure",
    legalRef: "GDPR Art. 35(7)(d) + Art. 36",
    purpose: "Misure previste per affrontare i rischi; valutazione del rischio residuo e trigger consultazione preventiva.",
  },
  {
    step: 5,
    key: "conclusion",
    label: "Conclusione",
    legalRef: "GDPR Art. 35 + Art. 36",
    purpose: "Sintesi, decisione, rischi correlati DPIA⇄FRIA, firma e riesame.",
  },
];

/** Elementi obbligatori Art. 35(7) usati dal gap-check */
export const ART_35_7_ELEMENTS = [
  { id: "a", ref: "Art. 35(7)(a)", label: "Descrizione sistematica del trattamento e delle finalità" },
  { id: "b", ref: "Art. 35(7)(b)", label: "Valutazione di necessità e proporzionalità" },
  { id: "c", ref: "Art. 35(7)(c)", label: "Valutazione dei rischi per diritti e libertà degli interessati" },
  { id: "d", ref: "Art. 35(7)(d)", label: "Misure previste per affrontare i rischi (garanzie, sicurezza, conformità)" },
] as const;

/* ──────────────────────────────────────────────────────────────────
 * 2. CATALOGO SCREENING — i 9 criteri WP248 (Step 0)
 *    Regola: ≥ 2 criteri ⇒ DPIA in linea di principio richiesta.
 * ──────────────────────────────────────────────────────────────── */

export interface DpiaCriterion {
  id: string;
  label: string;
  ref: string;
  ghostHint?: string;
}

export const WP248_CRITERIA: DpiaCriterion[] = [
  { id: "c1", label: "Valutazione o assegnazione di un punteggio (profilazione e previsione)", ref: "WP248 §1", ghostHint: "classifier.profiling" },
  { id: "c2", label: "Processo decisionale automatizzato con effetto giuridico o analogo", ref: "WP248 §2", ghostHint: "classifier.automatedDecision" },
  { id: "c3", label: "Monitoraggio sistematico", ref: "WP248 §3", ghostHint: "classifier.systematicMonitoring" },
  { id: "c4", label: "Dati sensibili o dati aventi carattere altamente personale", ref: "WP248 §4 / Art. 9", ghostHint: "dataAudit.specialCategories" },
  { id: "c5", label: "Trattamento di dati su larga scala", ref: "WP248 §5", ghostHint: "dataAudit.largeScale" },
  { id: "c6", label: "Creazione di corrispondenze o combinazione di insiemi di dati", ref: "WP248 §6", ghostHint: "dataAudit.dataMatching" },
  { id: "c7", label: "Dati relativi a interessati vulnerabili (minori, dipendenti, ecc.)", ref: "WP248 §7 / Cons. 75", ghostHint: "dataAudit.vulnerableSubjects" },
  { id: "c8", label: "Uso innovativo o nuove soluzioni tecnologiche/organizzative", ref: "WP248 §8", ghostHint: "classifier.innovativeTech" },
  { id: "c9", label: "Trattamento che impedisce di esercitare un diritto o avvalersi di un servizio/contratto", ref: "WP248 §9", ghostHint: "classifier.preventsRight" },
];

export const WP248_TRIGGER_RULE = {
  threshold: 2,
  note: "WP248: un trattamento che soddisfa almeno due criteri richiede, in linea di principio, una DPIA. Un solo criterio può bastare in casi specifici; valutare caso per caso. [verifica contro il testo vigente del GDPR/WP248]",
} as const;

/* ──────────────────────────────────────────────────────────────────
 * 3. CATALOGO EVENTI TEMUTI (Step 3) — 3 categorie WP248
 * ──────────────────────────────────────────────────────────────── */

export interface ThreatCategory {
  id: "illegitimate_access" | "unwanted_modification" | "data_disappearance";
  label: string;
  ref: string;
  description: string;
}

export const THREAT_CATEGORIES: ThreatCategory[] = [
  {
    id: "illegitimate_access",
    label: "Accesso illegittimo ai dati",
    ref: "WP248 (eventi temuti) / Cons. 90",
    description: "Divulgazione o consultazione non autorizzata di dati personali.",
  },
  {
    id: "unwanted_modification",
    label: "Modifica indesiderata dei dati",
    ref: "WP248 (eventi temuti) / Cons. 90",
    description: "Alterazione non autorizzata o accidentale dei dati personali.",
  },
  {
    id: "data_disappearance",
    label: "Scomparsa dei dati",
    ref: "WP248 (eventi temuti) / Cons. 90",
    description: "Perdita di disponibilità o distruzione dei dati personali.",
  },
];

/* ──────────────────────────────────────────────────────────────────
 * 4. CATALOGO FONTI DI RISCHIO (Step 3) — considerando 90 GDPR
 * ──────────────────────────────────────────────────────────────── */

export interface RiskSource {
  id: string;
  label: string;
  type: "human_internal" | "human_external" | "non_human";
}

export const RISK_SOURCES: RiskSource[] = [
  { id: "rs_employees", label: "Dipendenti / personale interno", type: "human_internal" },
  { id: "rs_admins", label: "Amministratori di sistema", type: "human_internal" },
  { id: "rs_processors", label: "Responsabili / fornitori (data processor)", type: "human_external" },
  { id: "rs_attackers", label: "Attaccanti esterni / accessi non autorizzati", type: "human_external" },
  { id: "rs_recipients", label: "Destinatari terzi dei dati", type: "human_external" },
  { id: "rs_malware", label: "Software malevolo (malware, ransomware)", type: "non_human" },
  { id: "rs_system_failure", label: "Errori o guasti di sistema", type: "non_human" },
  { id: "rs_natural", label: "Eventi naturali / ambientali", type: "non_human" },
];

/* ──────────────────────────────────────────────────────────────────
 * 5. PRINCIPI DI PROPORZIONALITÀ (Step 2)
 * ──────────────────────────────────────────────────────────────── */

export const NECESSITY_PROPORTIONALITY_FIELDS = [
  { id: "purpose_specified", label: "Finalità determinate, esplicite e legittime", ref: "Art. 5(1)(b)" },
  { id: "lawful_basis", label: "Base giuridica del trattamento", ref: "Art. 6 / Art. 9" },
  { id: "data_minimisation", label: "Minimizzazione dei dati", ref: "Art. 5(1)(c)" },
  { id: "storage_limitation", label: "Limitazione della conservazione", ref: "Art. 5(1)(e)" },
  { id: "data_subject_rights", label: "Misure per l'esercizio dei diritti degli interessati", ref: "Artt. 12–22" },
  { id: "proportionality_note", label: "Valutazione di proporzionalità (finalità ⇄ invasività)", ref: "Art. 35(7)(b)" },
] as const;

/* ──────────────────────────────────────────────────────────────────
 * 6. CONSULTAZIONE PREVENTIVA (Step 4-5) — Art. 36
 * ──────────────────────────────────────────────────────────────── */

export const PRIOR_CONSULTATION = {
  ref: "GDPR Art. 36",
  trigger:
    "Se la DPIA indica un rischio residuo elevato in assenza di misure di attenuazione adottate dal titolare, è necessaria la consultazione preventiva dell'autorità di controllo. [verifica contro il testo vigente del GDPR/WP248]",
} as const;

/* ──────────────────────────────────────────────────────────────────
 * 7. META-DOCUMENTO
 * ──────────────────────────────────────────────────────────────── */

export const DPIA_TEMPLATE_META = {
  title: "Valutazione d'impatto sulla protezione dei dati (DPIA)",
  legalBasis: "GDPR Art. 35",
  methodology: "WP248 rev.01 (EDPB/ex-WP29)",
  version: "1.0",
  disclaimer:
    "Template basato su Art. 35(7) GDPR e metodologia WP248. Bozza per revisione del DPO/titolare, non documento definitivo. [verifica contro il testo vigente del GDPR/WP248]",
} as const;

/* ──────────────────────────────────────────────────────────────────
 * 8. SEZIONI GUIDATE — Allegato 2 WP248 (con pesi, somma = 100)
 *    Usate da DpiaProgressRail + computeGuidedDpiaProgress.
 * ──────────────────────────────────────────────────────────────── */

export type DpiaSectionKey = "screening" | "descr" | "necessity" | "risks" | "parties" | "signoff";

export interface DpiaGuidedSection {
  key: DpiaSectionKey;
  label: string;
  legalRef: string;
  weight: number;
  anchor: string;
}

export const DPIA_GUIDED_SECTIONS: DpiaGuidedSection[] = [
  { key: "screening",  label: "Screening",                       legalRef: "GDPR Art. 35(1) + WP248",    weight: 10, anchor: "sec-screening" },
  { key: "descr",      label: "A — Descrizione sistematica",     legalRef: "GDPR Art. 35(7)(a)",          weight: 20, anchor: "sec-descr"     },
  { key: "necessity",  label: "B — Necessità e proporzionalità", legalRef: "GDPR Art. 35(7)(b)",          weight: 25, anchor: "sec-necessity"  },
  { key: "risks",      label: "C — Valutazione dei rischi",      legalRef: "GDPR Art. 35(7)(c)",          weight: 30, anchor: "sec-risks"      },
  { key: "parties",    label: "D — Parti interessate",           legalRef: "WP248 Allegato 2 §D",         weight: 10, anchor: "sec-parties"    },
  { key: "signoff",    label: "Firma e conclusione",             legalRef: "GDPR Art. 35 + Art. 36",      weight:  5, anchor: "sec-signoff"    },
] as const;

/* ──────────────────────────────────────────────────────────────────
 * 9. SOTTO-PUNTI — fonte di verità per chat guidata e viewer.
 *    Ogni sotto-punto mappa a un campo di DPIAResult (fieldPath).
 *    examples[] provengono dal Template_DPIA_Guidato_WP248_Annex2.
 * ──────────────────────────────────────────────────────────────── */

export type DpiaFieldType = "text" | "select_yn" | "select_ynp" | "select_compliance" | "multiline" | "info";

export interface DpiaSubPoint {
  id: string;
  sectionKey: DpiaSectionKey;
  label: string;
  question: string;
  ref: string;
  fieldPath: string;
  fieldType: DpiaFieldType;
  examples: string[];
  ghostHint?: string;
  required: boolean;
}

export const DPIA_SUBPOINTS: DpiaSubPoint[] = [
  // ── SCREENING ─────────────────────────────────────────────────────────────
  {
    id: "sc_c1", sectionKey: "screening",
    label: "Valutazione/scoring (profilazione)",
    question: "Il sistema esegue valutazioni o assegna punteggi alle persone (profilazione, scoring, previsioni)?",
    ref: "WP248 §1 / Cons. 71 GDPR",
    fieldPath: "screening.criteria[c1]",
    fieldType: "select_ynp",
    required: true,
    examples: [
      "Sì — il sistema assegna uno score di rischio creditizio a ciascun cliente su scala 0–1000.",
      "Sì — il sistema profila i candidati HR e prevede la probabilità di successo nel ruolo.",
      "No — il sistema effettua solo elaborazioni non personali (es. analisi di immagini mediche anonimizzate).",
      "Parzialmente — vengono generati tag comportamentali ma non un punteggio numerico esplicito.",
    ],
  },
  {
    id: "sc_c2", sectionKey: "screening",
    label: "Decisioni automatizzate con effetti giuridici",
    question: "Il sistema prende decisioni automatizzate che producono effetti giuridici o analoghi sulle persone?",
    ref: "WP248 §2 / Art. 22 GDPR",
    fieldPath: "screening.criteria[c2]",
    fieldType: "select_ynp",
    required: true,
    examples: [
      "Sì — il sistema approva/rigetta automaticamente le richieste di prestito senza revisione umana.",
      "Sì — lo strumento AI determina l'ammissibilità a un servizio pubblico (es. sussidio).",
      "No — le decisioni AI sono solo di supporto; un operatore umano ratifica sempre l'esito finale.",
      "Parzialmente — il sistema filtra automaticamente, ma le decisioni finali richiedono approvazione umana.",
    ],
  },
  {
    id: "sc_c3", sectionKey: "screening",
    label: "Monitoraggio sistematico",
    question: "Il sistema effettua un monitoraggio sistematico di persone (nello spazio fisico o digitale)?",
    ref: "WP248 §3 / Cons. 75 GDPR",
    fieldPath: "screening.criteria[c3]",
    fieldType: "select_ynp",
    required: true,
    examples: [
      "Sì — videosorveglianza con riconoscimento facciale in luoghi pubblici.",
      "Sì — tracciamento continuo del comportamento online degli utenti per campagne di marketing.",
      "No — il trattamento avviene in modo puntuale su richiesta esplicita dell'interessato.",
    ],
  },
  {
    id: "sc_c4", sectionKey: "screening",
    label: "Dati sensibili o altamente personali",
    question: "Il sistema tratta categorie particolari di dati (Art. 9) o dati aventi carattere altamente personale?",
    ref: "WP248 §4 / Art. 9 GDPR",
    fieldPath: "screening.criteria[c4]",
    fieldType: "select_ynp",
    required: true,
    ghostHint: "dataAudit.specialCategories",
    examples: [
      "Sì — vengono trattati dati sulla salute (referti medici, cartelle cliniche).",
      "Sì — il sistema elabora dati biometrici per il riconoscimento delle persone.",
      "Sì — vengono trattati dati genetici o relativi all'origine etnica.",
      "No — vengono trattati solo dati anagrafici di base (nome, e-mail, indirizzo).",
    ],
  },
  {
    id: "sc_c5", sectionKey: "screening",
    label: "Trattamento su larga scala",
    question: "Il sistema tratta dati personali su larga scala (numero elevato di interessati, volume, varietà o durata)?",
    ref: "WP248 §5 / Cons. 91 GDPR",
    fieldPath: "screening.criteria[c5]",
    fieldType: "select_ynp",
    required: true,
    ghostHint: "dataAudit.largeScale",
    examples: [
      "Sì — il sistema tratta dati di oltre 500.000 clienti in modo continuativo.",
      "Sì — elaborazione di dati di una regione/nazione intera (es. sistema sanitario regionale).",
      "No — il sistema è limitato a un ufficio con meno di 200 dipendenti.",
    ],
  },
  {
    id: "sc_c6", sectionKey: "screening",
    label: "Combinazione/incrocio di insiemi di dati",
    question: "Il sistema crea corrispondenze o combina insiemi di dati provenienti da fonti diverse?",
    ref: "WP248 §6",
    fieldPath: "screening.criteria[c6]",
    fieldType: "select_ynp",
    required: true,
    ghostHint: "dataAudit.dataMatching",
    examples: [
      "Sì — il sistema incrocia dati CRM, social media e storico acquisti per costruire profili utente.",
      "Sì — vengono fusi archivi interni HR con fonti esterne (LinkedIn, registri pubblici).",
      "No — il sistema elabora una sola fonte di dati senza incroci.",
    ],
  },
  {
    id: "sc_c7", sectionKey: "screening",
    label: "Interessati vulnerabili",
    question: "Il sistema tratta dati relativi a soggetti vulnerabili (minori, dipendenti, pazienti, anziani, richiedenti asilo)?",
    ref: "WP248 §7 / Cons. 75 GDPR",
    fieldPath: "screening.criteria[c7]",
    fieldType: "select_ynp",
    required: true,
    ghostHint: "dataAudit.vulnerableSubjects",
    examples: [
      "Sì — il sistema è destinato a bambini (<16 anni) in contesto educativo.",
      "Sì — vengono trattati dati di dipendenti nell'ambito del rapporto di lavoro.",
      "Sì — il sistema è utilizzato in ambito ospedaliero su pazienti.",
      "No — il sistema è rivolto esclusivamente ad adulti che interagiscono volontariamente.",
    ],
  },
  {
    id: "sc_c8", sectionKey: "screening",
    label: "Uso innovativo o nuove tecnologie",
    question: "Il sistema utilizza tecnologie innovative o nuove soluzioni tecnologiche/organizzative?",
    ref: "WP248 §8",
    fieldPath: "screening.criteria[c8]",
    fieldType: "select_ynp",
    required: true,
    ghostHint: "classifier.innovativeTech",
    examples: [
      "Sì — il sistema utilizza intelligenza artificiale e machine learning per classificare i dati.",
      "Sì — vengono impiegati dispositivi IoT per raccogliere dati in tempo reale.",
      "Sì — il sistema utilizza il riconoscimento facciale o vocale.",
      "No — il sistema si basa su tecnologie consolidate (database relazionale, form web tradizionale).",
    ],
  },
  {
    id: "sc_c9", sectionKey: "screening",
    label: "Impedisce l'esercizio di un diritto o l'accesso a un servizio",
    question: "Il trattamento può impedire agli interessati di esercitare un diritto o di avvalersi di un servizio/contratto?",
    ref: "WP248 §9",
    fieldPath: "screening.criteria[c9]",
    fieldType: "select_ynp",
    required: true,
    ghostHint: "classifier.preventsRight",
    examples: [
      "Sì — un profilo AI negativo può escludere automaticamente una persona dall'accesso al credito.",
      "Sì — il sistema può bloccare l'accesso a un'assicurazione in base al comportamento rilevato.",
      "No — l'esito del sistema non limita alcun diritto; ha solo finalità informative interne.",
    ],
  },

  // ── SEZIONE A — DESCRIZIONE SISTEMATICA ───────────────────────────────────
  {
    id: "a_system_name", sectionKey: "descr",
    label: "Nome del sistema e titolare",
    question: "Qual è il nome del sistema AI/trattamento e chi è il titolare del trattamento?",
    ref: "GDPR Art. 35(7)(a)",
    fieldPath: "description.system_name",
    fieldType: "text",
    required: true,
    ghostHint: "classifier.systemName",
    examples: [
      "Sistema: «RecruitAI» — titolare: Acme S.p.A., Via Roma 1, 20121 Milano",
      "Sistema: «CreditScore Engine v2» — titolare: Banca XYZ S.p.A., Corso Europa 5, Roma",
      "Sistema: «MedDiag AI» — titolare: ASL Nord-Ovest, Via Salute 12, Torino",
    ],
  },
  {
    id: "a_organization", sectionKey: "descr",
    label: "Organizzazione e contatti",
    question: "Qual è la denominazione completa dell'organizzazione e i riferimenti del responsabile del trattamento?",
    ref: "GDPR Art. 35(7)(a)",
    fieldPath: "description.organization_name",
    fieldType: "text",
    required: false,
    examples: [
      "Acme S.p.A. — P.IVA 01234567890 — compliance@acme.it",
      "Comune di Milano — Servizio Digitalizzazione — cio@comune.milano.it",
    ],
  },
  {
    id: "a_dpo", sectionKey: "descr",
    label: "Responsabile Protezione Dati (DPO)",
    question: "Chi è il Responsabile della Protezione dei Dati (DPO) e quando è stato consultato?",
    ref: "GDPR Art. 37-39 / WP248 Allegato 2 §D",
    fieldPath: "description.dpo_name",
    fieldType: "text",
    required: false,
    examples: [
      "Mario Rossi — dpo@acme.it — consultato il 15/03/2024; parere favorevole con raccomandazione di rafforzare i log di accesso.",
      "Studio Legale Privacy Srl (DPO esterno) — dpo@studioprivacy.it — parere favorevole condizionato, vedi Sez. D.",
      "DPO non designato (obbligatorio ex Art. 37? verificare la sussistenza dell'obbligo).",
    ],
  },
  {
    id: "a_processing_purposes", sectionKey: "descr",
    label: "Finalità del trattamento",
    question: "Quali sono le finalità del trattamento dei dati personali e gli eventuali legittimi interessi perseguiti?",
    ref: "GDPR Art. 35(7)(a) / Art. 5(1)(b)",
    fieldPath: "description.processing_purposes",
    fieldType: "multiline",
    required: true,
    ghostHint: "classifier.systemDescription",
    examples: [
      "Selezione automatica dei candidati per ridurre i tempi di reclutamento e garantire una valutazione uniforme e non discriminatoria dei CV.",
      "Scoring creditizio in tempo reale per valutare il merito creditizio dei richiedenti finanziamento e calibrare il tasso di interesse.",
      "Rilevamento precoce di anomalie nelle cartelle cliniche per supportare il medico nella diagnosi differenziale.",
    ],
  },
  {
    id: "a_personal_data_categories", sectionKey: "descr",
    label: "Categorie di dati personali trattati",
    question: "Quali categorie di dati personali vengono trattati dal sistema?",
    ref: "GDPR Art. 35(7)(a) / Art. 4(1)",
    fieldPath: "description.personal_data_categories",
    fieldType: "multiline",
    required: true,
    ghostHint: "dataAudit.datasets",
    examples: [
      "Nome e cognome, indirizzo e-mail, curriculum vitae, esperienze lavorative, titolo di studio.",
      "Dati anagrafici (nome, CF, data di nascita), dati finanziari (IBAN, storico pagamenti, reddito dichiarato).",
      "Dati sanitari (anamnesi, referti, terapie in corso), dati demografici (età, sesso).",
    ],
  },
  {
    id: "a_special_categories", sectionKey: "descr",
    label: "Categorie particolari di dati (Art. 9)",
    question: "Il sistema tratta categorie particolari di dati ai sensi dell'Art. 9 GDPR? Se sì, quali e su quale base?",
    ref: "GDPR Art. 9 / Art. 35(7)(a)",
    fieldPath: "description.special_categories",
    fieldType: "multiline",
    required: false,
    ghostHint: "dataAudit.specialCategories",
    examples: [
      "No — nessuna categoria particolare; i dati trattati sono esclusivamente comuni.",
      "Sì — dati sulla salute (Art. 9(2)(h)): elaborazione di referti medici per finalità di cura.",
      "Sì — dati biometrici (Art. 9(2)(a)): riconoscimento facciale per controllo accessi; consenso esplicito.",
    ],
  },
  {
    id: "a_data_subjects_categories", sectionKey: "descr",
    label: "Categorie di interessati",
    question: "A quali categorie di interessati si riferiscono i dati trattati?",
    ref: "GDPR Art. 35(7)(a)",
    fieldPath: "description.data_subjects_categories",
    fieldType: "text",
    required: true,
    examples: [
      "Candidati a posizioni lavorative (persone fisiche che inviano la propria candidatura).",
      "Clienti persone fisiche richiedenti prodotti di credito al consumo.",
      "Pazienti ricoverati o in regime ambulatoriale presso strutture sanitarie convenzionate.",
    ],
  },
  {
    id: "a_recipients", sectionKey: "descr",
    label: "Destinatari dei dati",
    question: "Chi sono i destinatari dei dati personali (interni ed esterni)?",
    ref: "GDPR Art. 35(7)(a) / Art. 4(9)",
    fieldPath: "description.recipients",
    fieldType: "multiline",
    required: false,
    examples: [
      "Interni: HR manager, responsabile selezione, CISO. Esterni: nessuno.",
      "Interni: ufficio crediti. Esterni: Cerved Group (credit bureau) ex Art. 28; partner finanziari per operazioni di co-finanziamento.",
      "Interni: medico curante, infermieri responsabili. Esterni: laboratori di analisi convenzionati.",
    ],
  },
  {
    id: "a_retention_period", sectionKey: "descr",
    label: "Periodo di conservazione",
    question: "Per quanto tempo vengono conservati i dati personali?",
    ref: "GDPR Art. 5(1)(e)",
    fieldPath: "description.retention_period",
    fieldType: "text",
    required: false,
    examples: [
      "12 mesi dalla data di candidatura (salvo consenso al ricontatto per posizioni future).",
      "5 anni dalla chiusura del rapporto creditizio, come previsto dalla normativa antiriciclaggio.",
      "10 anni dalla data dell'ultima prestazione medica (obbligo di conservazione cartella clinica ex DPR 128/1969).",
    ],
  },
  {
    id: "a_assets", sectionKey: "descr",
    label: "Archivi e sistemi di trattamento",
    question: "Quali sono i principali archivi, sistemi e infrastrutture che trattano i dati personali?",
    ref: "GDPR Art. 35(7)(a)",
    fieldPath: "description.assets",
    fieldType: "multiline",
    required: false,
    examples: [
      "Database candidati (PostgreSQL su AWS RDS eu-west-1); modello ML (Python, deploy su AWS SageMaker); ATS Workday (SaaS).",
      "Core banking system (Oracle Flexcube on-premise); API credit bureau (REST HTTPS); data warehouse BigQuery.",
      "HIS (Hospital Information System) on-premise; PACS (sistema archiviazione immagini radiologiche); EHR cloud (Salesforce Health Cloud EU).",
    ],
  },
  {
    id: "a_processor", sectionKey: "descr",
    label: "Responsabili del trattamento (Art. 28)",
    question: "Sono coinvolti responsabili del trattamento esterni? Se sì, chi e con quali garanzie contrattuali?",
    ref: "GDPR Art. 28",
    fieldPath: "description.processor_name",
    fieldType: "multiline",
    required: false,
    examples: [
      "Sì — AWS EMEA SARL (hosting, Art. 28 DPA allegato al contratto MSA, SCC Standard Contractual Clauses).",
      "Sì — Cerved Group S.p.A. (credit bureau), DPA firmato; tratta solo dati aggregati pseudonimizzati.",
      "No — il trattamento avviene interamente con risorse interne su server on-premise.",
    ],
  },

  // ── SEZIONE B — NECESSITÀ E PROPORZIONALITÀ ───────────────────────────────
  {
    id: "b_necessity", sectionKey: "necessity",
    label: "Giustificazione di necessità",
    question: "Perché il trattamento è necessario per raggiungere la finalità? Esistono soluzioni alternative meno invasive?",
    ref: "GDPR Art. 35(7)(b) / Art. 5(1)(c)",
    fieldPath: "proportionality.necessity_justification",
    fieldType: "multiline",
    required: true,
    examples: [
      "Il trattamento è necessario: l'analisi manuale di migliaia di CV richiederebbe risorse sproporzionate e produrrebbe esiti meno uniformi. L'alternativa — selezione solo manuale — non consente la stessa capacità di elaborazione.",
      "Il sistema di scoring è necessario per valutare oggettivamente il merito creditizio senza bias soggettivi. L'alternativa, la valutazione solo manuale, sarebbe più lenta e meno consistente.",
    ],
  },
  {
    id: "b_lawful_basis", sectionKey: "necessity",
    label: "Base giuridica del trattamento",
    question: "Quale base giuridica legittima il trattamento dei dati personali (Art. 6 GDPR)?",
    ref: "GDPR Art. 6 / Art. 9(2)",
    fieldPath: "proportionality.proportionality_checks[lawful_basis]",
    fieldType: "text",
    required: true,
    examples: [
      "Art. 6(1)(b) — esecuzione di un contratto o misure precontrattuali su richiesta dell'interessato.",
      "Art. 6(1)(c) — adempimento di un obbligo legale (es. normativa AML/KYC per istituti finanziari).",
      "Art. 6(1)(f) — legittimo interesse del titolare (valutazione del rischio di credito), bilanciato con i diritti degli interessati.",
      "Art. 6(1)(a) — consenso esplicito dell'interessato (preferire basi più solide se disponibili).",
    ],
  },
  {
    id: "b_data_minimisation", sectionKey: "necessity",
    label: "Minimizzazione dei dati",
    question: "Come si garantisce che vengano trattati solo i dati strettamente necessari (minimizzazione)?",
    ref: "GDPR Art. 5(1)(c)",
    fieldPath: "proportionality.proportionality_checks[data_minimisation]",
    fieldType: "multiline",
    required: true,
    examples: [
      "Il modello ML utilizza solo i campi del CV rilevanti per la posizione (competenze, esperienze); non estrae dati demografici. I campi non pertinenti (es. foto, età) vengono rimossi in fase di pre-processing.",
      "Vengono raccolti solo i dati finanziari strettamente necessari per il calcolo del merito creditizio, come da policy interna approvata dal DPO.",
    ],
  },
  {
    id: "b_storage_limitation", sectionKey: "necessity",
    label: "Limitazione della conservazione",
    question: "Come viene limitata la durata della conservazione dei dati? Quali procedure garantiscono la cancellazione?",
    ref: "GDPR Art. 5(1)(e)",
    fieldPath: "proportionality.proportionality_checks[storage_limitation]",
    fieldType: "multiline",
    required: true,
    examples: [
      "I dati dei candidati non selezionati vengono eliminati automaticamente dopo 12 mesi tramite job schedulato; i candidati possono richiedere la cancellazione anticipata tramite form dedicato.",
      "Retention policy documentata in procedura PR-001: dati finanziari conservati 5 anni, poi anonimizzati e migrati in archivio storico per analisi aggregate.",
    ],
  },
  {
    id: "b_data_subject_rights", sectionKey: "necessity",
    label: "Diritti degli interessati (Artt. 12–22)",
    question: "Come vengono garantiti i diritti degli interessati (accesso, rettifica, cancellazione, opposizione, portabilità, non essere sottoposto a decisione automatizzata)?",
    ref: "GDPR Artt. 12–22",
    fieldPath: "proportionality.rights_checks",
    fieldType: "multiline",
    required: true,
    examples: [
      "Diritto di accesso (Art. 15): form su portale HR, risposta entro 30 giorni. Rettifica (Art. 16): aggiornamento manuale dei dati su richiesta. Art. 22 (decisione automatizzata): procedura di revisione umana garantita per ogni candidato che ne faccia richiesta.",
      "Tutti i diritti (Artt. 15–22) esercitabili tramite privacy@acme.it. Riscontro entro 30 giorni. Designato un referente interno per le richieste degli interessati.",
    ],
  },
  {
    id: "b_proportionality", sectionKey: "necessity",
    label: "Proporzionalità (finalità ↔ invasività)",
    question: "La finalità perseguita è proporzionata all'invasività del trattamento sui diritti degli interessati?",
    ref: "GDPR Art. 35(7)(b)",
    fieldPath: "proportionality.proportionality_checks[proportionality]",
    fieldType: "multiline",
    required: true,
    examples: [
      "La finalità (efficienza nella selezione) è proporzionata: il livello di intrusione è limitato ai dati professionali già volontariamente condivisi dal candidato. L'alternativa manuale avrebbe accesso agli stessi dati con risultati meno uniformi.",
      "Il trattamento è proporzionato: il beneficio (accesso rapido al credito per i clienti meritevoli) supera il rischio di privacy per l'interessato, che resta informato e può opporsi.",
    ],
  },
  {
    id: "b_processor_clauses", sectionKey: "necessity",
    label: "Clausole responsabili del trattamento (Art. 28)",
    question: "Sono stati stipulati accordi contrattuali ex Art. 28 GDPR con tutti i responsabili del trattamento?",
    ref: "GDPR Art. 28",
    fieldPath: "proportionality.processor_clauses_art28",
    fieldType: "select_yn",
    required: false,
    examples: [
      "Sì — DPA firmato con AWS (allegato A al MSA), Workday (DPA standard), Cerved (DPA personalizzato).",
      "No — DPA in corso di negoziazione con il fornitore cloud; da completare prima del go-live.",
      "N/A — nessun responsabile esterno del trattamento.",
    ],
  },
  {
    id: "b_international_transfers", sectionKey: "necessity",
    label: "Trasferimenti internazionali (extra-UE)",
    question: "Vengono effettuati trasferimenti di dati personali verso paesi extra-UE? Se sì, con quali garanzie?",
    ref: "GDPR Artt. 44–49",
    fieldPath: "proportionality.international_transfers",
    fieldType: "select_yn",
    required: false,
    examples: [
      "No — tutti i dati vengono elaborati su server situati nell'UE (AWS eu-west-1, Irlanda).",
      "Sì — trasferimento verso USA tramite Standard Contractual Clauses (SCC) adottate dalla Commissione UE nel 2021; TIA (Transfer Impact Assessment) allegato.",
      "Sì — fornitore cloud in India; utilizzo di Binding Corporate Rules (BCR) del gruppo.",
    ],
  },

  // ── SEZIONE C — RISCHI ────────────────────────────────────────────────────
  {
    id: "c_threat_access", sectionKey: "risks",
    label: "Minaccia: accesso illegittimo ai dati",
    question: "Qual è il rischio di accesso illegittimo ai dati personali? (probabilità, impatto e descrizione dello scenario)",
    ref: "WP248 (eventi temuti) / Cons. 90 GDPR",
    fieldPath: "risks.threats[illegitimate_access]",
    fieldType: "multiline",
    required: true,
    examples: [
      "Scenario: attacco SQL injection al database candidati da parte di attore esterno. Probabilità: media (il sistema è esposto su internet). Impatto: alto (divulgazione di CV con dati personali sensibili). Rischio iniziale: alto.",
      "Scenario: dipendente non autorizzato accede ai profili di credito tramite credenziali rubate di un collega. Probabilità: bassa (MFA attivo). Impatto: alto (accesso a dati finanziari sensibili). Rischio: medio.",
    ],
  },
  {
    id: "c_threat_modification", sectionKey: "risks",
    label: "Minaccia: modifica indesiderata dei dati",
    question: "Qual è il rischio di modifica non autorizzata o accidentale dei dati personali?",
    ref: "WP248 (eventi temuti) / Cons. 90 GDPR",
    fieldPath: "risks.threats[unwanted_modification]",
    fieldType: "multiline",
    required: true,
    examples: [
      "Scenario: bug nel modello ML che modifica retroattivamente gli score assegnati. Probabilità: bassa (test automatizzati presenti). Impatto: alto (decisioni errate su candidati). Rischio: medio.",
      "Scenario: operatore con accesso in scrittura modifica deliberatamente il rating creditizio di un cliente. Probabilità: bassa (log e audit trail attivi). Impatto: alto. Rischio: medio.",
    ],
  },
  {
    id: "c_threat_disappearance", sectionKey: "risks",
    label: "Minaccia: scomparsa/indisponibilità dei dati",
    question: "Qual è il rischio di perdita, cancellazione o indisponibilità dei dati personali?",
    ref: "WP248 (eventi temuti) / Cons. 90 GDPR",
    fieldPath: "risks.threats[data_disappearance]",
    fieldType: "multiline",
    required: true,
    examples: [
      "Scenario: attacco ransomware che cifra il database candidati e rende i dati inaccessibili. Probabilità: media. Impatto: alto (perdita di dati, impossibilità di portare a termine i processi di selezione). Rischio: alto.",
      "Scenario: failure del backup notturno per 30 giorni non rilevata; perdita di dati recenti. Probabilità: bassa. Impatto: medio. Rischio: basso.",
    ],
  },
  {
    id: "c_technical_measures", sectionKey: "risks",
    label: "Misure tecniche di mitigazione",
    question: "Quali misure tecniche vengono adottate per ridurre i rischi identificati?",
    ref: "GDPR Art. 32 / Art. 35(7)(d)",
    fieldPath: "measures.technical_measures",
    fieldType: "multiline",
    required: true,
    examples: [
      "Cifratura AES-256 dei dati at rest e TLS 1.3 in transit; autenticazione MFA per tutti gli accessi; log centralizzato con SIEM; penetration test annuale; pseudonimizzazione degli ID candidati.",
      "Tokenizzazione dei dati finanziari; WAF (Web Application Firewall); test di sicurezza automatizzati nel pipeline CI/CD; backup giornaliero con replica in altra regione UE.",
    ],
  },
  {
    id: "c_organizational_measures", sectionKey: "risks",
    label: "Misure organizzative di mitigazione",
    question: "Quali misure organizzative vengono adottate per ridurre i rischi identificati?",
    ref: "GDPR Art. 32 / Art. 35(7)(d)",
    fieldPath: "measures.organizational_measures",
    fieldType: "multiline",
    required: true,
    examples: [
      "Formazione annuale obbligatoria del personale sulla sicurezza dei dati; procedura di incident response (PR-SEC-001) con notifica entro 72h; accesso ai dati su base need-to-know; RBAC (controllo accessi basato su ruoli).",
      "Privacy by design integrata nel SDLC; revisione trimestrale dei log di accesso; designazione di un Data Protection Champion per ogni team; clausole di riservatezza nei contratti con i fornitori.",
    ],
  },
  {
    id: "c_overall_risk_before", sectionKey: "risks",
    label: "Livello di rischio complessivo ante-misure",
    question: "Qual è la valutazione complessiva del rischio per i diritti degli interessati PRIMA dell'applicazione delle misure?",
    ref: "WP248 rev.01 / GDPR Art. 35(7)(c)",
    fieldPath: "risks.overall_risk_before",
    fieldType: "select_compliance",
    required: true,
    examples: [
      "Alto — le minacce identificate hanno impatto potenzialmente grave sui diritti fondamentali degli interessati senza le misure previste.",
      "Medio — rischio significativo ma non tale da rendere il trattamento intrinsecamente sproporzionato.",
      "Basso — le vulnerabilità residue sono minori e il contesto di trattamento ne limita l'esposizione.",
    ],
  },

  // ── SEZIONE D — PARTI INTERESSATE ─────────────────────────────────────────
  {
    id: "d_dpo_opinion", sectionKey: "parties",
    label: "Parere del DPO",
    question: "Il DPO ha rilasciato un parere sulla DPIA? Qual è la sua valutazione e raccomandazione?",
    ref: "GDPR Art. 35(2) / WP248 Allegato 2 §D",
    fieldPath: "description.dpo_opinion",
    fieldType: "multiline",
    required: false,
    examples: [
      "Il DPO ha esaminato la DPIA il 20/03/2024 e concorda con la valutazione del rischio residuo (medio). Raccomanda: aggiungere controlli sul tempo di risposta alle richieste degli interessati.",
      "Il DPO esprime parere favorevole condizionato: richiede l'implementazione della pseudonimizzazione prima del go-live e una revisione della DPIA entro 6 mesi dall'avvio.",
      "DPO non designato — valutare obbligatorietà ex Art. 37 GDPR. [verifica contro il testo vigente del GDPR/WP248]",
    ],
  },
  {
    id: "d_data_subjects_opinions", sectionKey: "parties",
    label: "Opinioni degli interessati",
    question: "Sono state raccolte le opinioni degli interessati? Se no, come si giustifica l'omissione?",
    ref: "GDPR Art. 35(9) / WP248 Allegato 2 §D",
    fieldPath: "description.data_subjects_opinions",
    fieldType: "multiline",
    required: false,
    examples: [
      "Non consultati — il trattamento è in fase di sviluppo pre-lancio; nella fase pilota sarà consultato un campione rappresentativo di 30 candidati.",
      "Consultati tramite focus group (n=15 rappresentanti della categoria) in data 10/02/2024; le indicazioni ricevute hanno portato a modificare il modulo di consenso.",
      "Non applicabile — il trattamento ha finalità di sicurezza pubblica; la consultazione pregiudicherebbe le finalità del trattamento ex Art. 35(9) in fine.",
    ],
  },
  {
    id: "d_overall_risk_after", sectionKey: "parties",
    label: "Rischio residuo dopo le misure",
    question: "Qual è il livello di rischio residuo DOPO l'applicazione di tutte le misure previste?",
    ref: "WP248 rev.01 / GDPR Art. 35(7)(d)",
    fieldPath: "measures.overall_risk_after",
    fieldType: "select_compliance",
    required: true,
    examples: [
      "Basso — le misure adottate (cifratura, MFA, RBAC, formazione) riducono la probabilità e l'impatto delle minacce a un livello accettabile.",
      "Medio — il rischio è stato ridotto ma non eliminato; il titolare decide di procedere sotto propria responsabilità documentata.",
      "Alto — nonostante le misure, il rischio residuo rimane elevato: è richiesta la consultazione preventiva dell'autorità di controllo ex Art. 36. [verifica contro il testo vigente del GDPR/WP248]",
    ],
  },
  {
    id: "d_prior_consultation", sectionKey: "parties",
    label: "Consultazione preventiva (Art. 36)",
    question: "È necessaria la consultazione preventiva dell'autorità di controllo (Garante)?",
    ref: "GDPR Art. 36 / WP248 Allegato 2",
    fieldPath: "measures.prior_consultation_required",
    fieldType: "select_yn",
    required: false,
    examples: [
      "No — il rischio residuo è stato ridotto a livello medio/basso; la consultazione non è necessaria.",
      "Sì — il rischio residuo rimane alto nonostante le misure; il Garante verrà consultato prima dell'avvio del trattamento. [verifica contro il testo vigente del GDPR/WP248]",
    ],
  },
  {
    id: "d_review_schedule", sectionKey: "parties",
    label: "Pianificazione del riesame",
    question: "Con quale cadenza e in quali circostanze verrà riesaminata la DPIA?",
    ref: "GDPR Art. 35(11) / WP248",
    fieldPath: "measures.review_schedule",
    fieldType: "text",
    required: false,
    examples: [
      "Revisione annuale o al verificarsi di modifiche sostanziali al sistema (nuove categorie di dati, nuove finalità, cambiamenti tecnologici).",
      "Revisione ogni 2 anni o in caso di: data breach, cambiamento normativo rilevante, reclamo degli interessati.",
    ],
  },

  // ── FIRMA E CONCLUSIONE ───────────────────────────────────────────────────
  {
    id: "e_compliant", sectionKey: "signoff",
    label: "Decisione di conformità",
    question: "Il titolare dichiara che il trattamento è conforme al GDPR alla luce della presente DPIA?",
    ref: "GDPR Art. 35 / WP248",
    fieldPath: "conclusion.compliant",
    fieldType: "select_compliance",
    required: true,
    examples: [
      "Conforme — le misure adottate garantiscono un livello di protezione adeguato; il trattamento può procedere.",
      "Condizionalmente conforme — il trattamento può procedere subordinatamente all'implementazione delle misure indicate in Sez. D entro [data].",
      "Non conforme — il rischio residuo è inaccettabile; il trattamento non può avere luogo nella forma attuale.",
    ],
  },
  {
    id: "e_conditions", sectionKey: "signoff",
    label: "Condizioni e misure aggiuntive",
    question: "Se la conformità è condizionata, quali sono le misure aggiuntive da implementare e in che tempi?",
    ref: "GDPR Art. 35(7)(d)",
    fieldPath: "conclusion.conditions",
    fieldType: "multiline",
    required: false,
    examples: [
      "1. Implementare la pseudonimizzazione degli ID candidati entro il 30/06/2024. 2. Aggiornare il modulo di consenso per includere il diritto di opposizione alla profilazione automatica.",
      "Nessuna condizione aggiuntiva — le misure indicate in Sez. C e D sono già implementate.",
    ],
  },
  {
    id: "e_summary", sectionKey: "signoff",
    label: "Sintesi esecutiva",
    question: "Fornire una sintesi esecutiva dei risultati della DPIA e delle misure adottate.",
    ref: "GDPR Art. 35 / WP248",
    fieldPath: "conclusion.summary",
    fieldType: "multiline",
    required: true,
    examples: [
      "La DPIA identifica rischi di livello medio per la privacy degli interessati (candidati) derivanti dall'uso del sistema RecruitAI. Le principali misure adottate (cifratura, MFA, procedure di cancellazione) riducono il rischio residuo a un livello accettabile. Il trattamento è dichiarato conforme al GDPR.",
      "L'analisi evidenzia un rischio inizialmente alto ridotto a medio dalle misure tecniche e organizzative previste. Si raccomanda una revisione annuale e il completamento della pseudonimizzazione entro Q2 2024.",
    ],
  },
  {
    id: "e_next_review_date", sectionKey: "signoff",
    label: "Data prossimo riesame",
    question: "Quando è pianificato il prossimo riesame obbligatorio di questa DPIA?",
    ref: "GDPR Art. 35(11)",
    fieldPath: "conclusion.next_review_date",
    fieldType: "text",
    required: false,
    examples: [
      "2025-06-01",
      "2026-01-15 (revisione triennale programmata)",
      "Al verificarsi di una delle condizioni: lancio di nuove funzionalità AI, data breach, richiesta del Garante.",
    ],
  },
];
