// Art. 5 AI Act — pratiche vietate: emozioni e categorizzazione biometrica
// ✦ AI — verifica e conferma: la lettera esatta dei paragrafi Art. 5(1)(f)/(g) e
// le eccezioni qui elencate vanno verificate sul testo consolidato AI Act in vigore.
// Centralizzando le stringhe di citazione qui, ogni correzione normativa tocca solo questo file.

export interface ExemptionDefinition {
  id: string;
  label: string;
  reference: string;
}

export interface ProhibitedPracticeDefinition {
  id: string;
  label: string;
  reference: string;
  exemptions: readonly ExemptionDefinition[];
}

export const ART5_EMOTION_BIOMETRIC_PRACTICES = [
  {
    id: "emotion_recognition_workplace_education",
    label: "Riconoscimento delle emozioni — luogo di lavoro e istruzione",
    reference: "Art. 5(1)(f) [verify against current AI Act text]",
    exemptions: [
      {
        id: "medical_safety",
        label: "Uso per motivi medici o di sicurezza",
        reference: "Art. 5(1)(f) [verify against current AI Act text]",
      },
    ],
  },
  {
    id: "biometric_categorization_sensitive_attributes",
    label: "Categorizzazione biometrica — attributi sensibili",
    reference: "Art. 5(1)(g) [verify against current AI Act text]",
    exemptions: [
      {
        id: "lawful_dataset_labelling",
        label: "Labelling/filtering di dataset biometrici lecitamente acquisiti, senza categorizzazione individuale di persone",
        reference: "Art. 5(1)(g) [verify against current AI Act text]",
      },
      {
        id: "law_enforcement",
        label: "Categorizzazione biometrica nell'ambito di attività di contrasto (law enforcement)",
        reference: "Art. 5(1)(g) [verify against current AI Act text]",
      },
    ],
  },
] as const satisfies readonly ProhibitedPracticeDefinition[];

// Categorie di attributi sensibili rilevanti per Art. 5(1)(g)
// ✦ AI — verifica e conferma: elenco ricavato dal testo della proposta, verificare sul consolidato.
export const SENSITIVE_INFERENCE_CATEGORIES = [
  "razza o origine etnica",
  "opinioni politiche",
  "appartenenza sindacale",
  "convinzioni religiose o filosofiche",
  "vita sessuale",
  "orientamento sessuale",
] as const;

// Euristiche keyword per triage automatico (✦ AI — proposte, non deterministiche)
export const EMOTION_RECOGNITION_HINTS = [
  "emozion", "sentiment", "affect", "mood", "espression facciale",
  "tono di voce", "facial expression", "emotion detection", "affect recognition",
] as const;

export const BIOMETRIC_CATEGORIZATION_HINTS = [
  "categorizzazione biometrica", "biometric categor", "riconoscimento facciale",
  "analisi del volto", "voice analysis", "andatura", "gait", "facial analysis",
  "face recognition", "iris", "iride",
] as const;

export const WORKPLACE_EDUCATION_HINTS = [
  "dipendent", "lavoratori", "ufficio", "azienda", "scuola", "studenti",
  "istituto", "università", "ambiente scolastico", "employee", "workplace",
  "classroom", "education", "school", "university",
] as const;
