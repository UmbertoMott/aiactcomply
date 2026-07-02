// Art. 10 AI Act — pratiche di governance dei dati
// La numerazione dei paragrafi richiede verifica sul testo consolidato AI Act.
// [verify against current AI Act text] è obbligatorio su ogni citazione.

export type PracticeSource = "manual" | "computed" | "both";

export interface DataGovernancePracticeDefinition {
  id: string;
  label: string;
  reference: string;
  source: PracticeSource;
  linkedTool?: string;
  linkedToolPath?: string;
  linkedToolLabel?: string;
  computedHint?: string;
}

export const DATA_GOVERNANCE_PRACTICES: readonly DataGovernancePracticeDefinition[] = [
  {
    id: "design_choices",
    label: "Scelte progettuali rilevanti per raccolta e gestione dei dati",
    reference: "Art. 10(2)(a) [verify against current AI Act text]",
    source: "manual",
  },
  {
    id: "collection_origin_purpose",
    label: "Origine e finalità della raccolta dati",
    reference: "Art. 10(2)(b) [verify against current AI Act text]",
    source: "manual",
  },
  {
    id: "data_preparation",
    label: "Operazioni di preparazione (annotazione, pulizia, aggregazione, ecc.)",
    reference: "Art. 10(2)(c) [verify against current AI Act text]",
    source: "manual",
  },
  {
    id: "assumptions",
    label: "Ipotesi su cosa i dati misurano e rappresentano",
    reference: "Art. 10(2)(d) [verify against current AI Act text]",
    source: "manual",
  },
  {
    id: "availability_assessment",
    label: "Disponibilità, quantità e idoneità dei dataset",
    reference: "Art. 10(2)(e) [verify against current AI Act text]",
    source: "computed",
    computedHint: "Popolato automaticamente dalle statistiche dei dataset caricati.",
  },
  {
    id: "bias_examination",
    label: "Esame di possibili bias e feedback loop",
    reference: "Art. 10(2)(f) [verify against current AI Act text]",
    source: "both",
    computedHint: "Le distribuzioni delle colonne sensibili sono calcolate automaticamente.",
  },
  {
    id: "bias_mitigation",
    label: "Misure di rilevamento, prevenzione e mitigazione dei bias",
    reference: "Art. 10(2)(g) [verify against current AI Act text]",
    source: "manual",
    linkedTool: "risk-manager",
    linkedToolPath: "/dashboard/tools/risk-manager",
    linkedToolLabel: "Risk Manager (step mitigation) — Art. 9",
  },
  {
    id: "data_gaps",
    label: "Lacune o carenze nei dati e relative azioni",
    reference: "Art. 10(2)(h) [verify against current AI Act text]",
    source: "computed",
    computedHint: "Valori mancanti per colonna calcolati automaticamente.",
  },
  {
    id: "quality_criteria",
    label: "Rilevanza, rappresentatività, assenza di errori, completezza dei dataset",
    reference: "Art. 10(3) [verify against current AI Act text]",
    source: "computed",
    computedHint: "Metriche di qualità calcolate automaticamente dal profiling CSV.",
  },
  {
    id: "contextual_characteristics",
    label: "Caratteristiche del contesto d'uso (geografico, comportamentale, funzionale)",
    reference: "Art. 10(4) [verify against current AI Act text]",
    source: "manual",
  },
] as const;

export const SPECIAL_CATEGORIES_MODULE = {
  id: "special_categories",
  label: "Trattamento di categorie particolari di dati personali per bias detection",
  primaryReference: "Art. 10(5) [verify against current AI Act text]",
  supportReference: "Art. 9 GDPR [verify against current AI Act text]",
  description:
    "Il trattamento di categorie particolari di dati personali ai fini del rilevamento e della correzione di bias è ammesso, nel rispetto dell'Art. 10(5) [verify against current AI Act text], con misure tecniche appropriate quali la pseudonimizzazione. Documentare la base giuridica e le garanzie adottate.",
} as const;

// Euristica colonne sensibili — solo suggerimento, mai classificazione definitiva.
// L'utente deve sempre confermare prima che il modulo Art. 10(5) venga attivato.
export const SENSITIVE_COLUMN_HINTS = [
  "genere", "gender", "sesso", "sex",
  "età", "eta", "age", "data di nascita", "birth",
  "etnia", "etnicità", "razza", "ethnicity", "race",
  "nazionalità", "nationality", "cittadinanza", "citizenship",
  "religione", "religion", "fede", "credo",
  "orientamento sessuale", "sexual orientation",
  "disabilità", "disabilita", "disability",
  "stato di salute", "salute", "health", "diagnosi", "diagnosis",
  "sindacato", "union", "appartenenza politica", "political",
] as const;

export function detectSensitiveHint(columnName: string): string | null {
  const norm = columnName.toLowerCase().replace(/_/g, " ").replace(/-/g, " ");
  for (const hint of SENSITIVE_COLUMN_HINTS) {
    if (norm.includes(hint)) return hint;
  }
  return null;
}

export const MAX_CSV_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
