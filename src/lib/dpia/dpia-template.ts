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
