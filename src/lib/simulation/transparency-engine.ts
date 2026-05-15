// Transparency Engine — Art. 13 AI Act (XAI Layer)
// Simulates SHAP values, uncertainty gauges and AI Nutrition Label data

export interface FeatureContribution {
  feature: string;
  column: string;
  shapValue: number;    // signed: positive = pushes toward approval
  absInfluence: number; // 0–1
  direction: "positive" | "negative" | "neutral";
  humanLabel: string;   // plain-language explanation
  isProxy: boolean;
  proxyFor?: string;
}

export interface DecisionExplanation {
  inferenceId: string;
  timestamp: Date;
  inputSummary: string;
  output: "APPROVED" | "REJECTED" | "REVIEW";
  confidence: number;
  uncertaintyZone: boolean; // confidence in [0.45, 0.65]
  features: FeatureContribution[];
  shortExplanation: string;
  technicalSummary: string;
  modelVersion: string;
  operatorId: string;
}

export interface NutritionLabel {
  systemName: string;
  intendedPurpose: string;
  riskClass: string;
  declaredAccuracy: number;
  measuredAccuracy: number;
  trainingDataSources: string[];
  trainingDataLimits: string[];
  inputRequirements: string[];
  performanceLimits: string[];
  forbiddenUseCases: string[];
  modelVersion: string;
  lastAudit: string;
  annexIVRef: string;
}

export interface InstructionSet {
  version: string;
  commitSha: string;
  mustDo: string[];
  mustNotDo: string[];
  humanOversightRequired: string[];
  uncertaintyThreshold: number;
}

// ─── Nutrition Label ─────────────────────────────────────────────────────────
export const NUTRITION_LABEL: NutritionLabel = {
  systemName: "HR Screening AI v2.1.0",
  intendedPurpose: "Supporto alla selezione del personale — classificazione candidature",
  riskClass: "Alto Rischio — Allegato III punto 4",
  declaredAccuracy: 0.90,
  measuredAccuracy: 0.873,
  trainingDataSources: ["HR_DATA Snowflake.prod (84.320 record)", "DB_storico 2020–2024"],
  trainingDataLimits: [
    "Sottorappresentazione donne in ruoli tech (DI=0.61 pre-CTGAN)",
    "Dati geografici limitati a Italia settentrionale",
    "Nessun dato su candidati con disabilità documentata",
  ],
  inputRequirements: [
    "CV in formato PDF o DOCX, max 5MB",
    "Testo estratto in UTF-8",
    "Lingua: italiano o inglese",
    "Campi obbligatori: esperienza lavorativa, istruzione",
  ],
  performanceLimits: [
    "Accuracy scende a 79% su candidati con carriere non lineari",
    "Non affidabile su profili con gap lavorativi > 24 mesi",
    "Confidenza < 65% → revisione umana obbligatoria",
    "Non supporta formati CV grafici o portfolio creativi",
  ],
  forbiddenUseCases: [
    "Decisione autonoma vincolante senza supervisione umana",
    "Selezione per ruoli con accesso a dati sensibili classificati",
    "Applicazione a minori o candidati protetti ex Art. 22 GDPR",
    "Uso in contesti diversi dall'assunzione dichiarata",
  ],
  modelVersion: "v2.1.0",
  lastAudit: "2025-04-10",
  annexIVRef: "Fascicolo Tecnico v2.1.0 — commit a3f9c2d",
};

// ─── Instructions ─────────────────────────────────────────────────────────────
export const INSTRUCTIONS: InstructionSet = {
  version: "v2.1.0",
  commitSha: "a3f9c2d",
  mustDo: [
    "Verificare manualmente ogni candidato con score < 40 o > 90",
    "Documentare la motivazione umana per ogni override della decisione AI",
    "Aggiornare il fascicolo tecnico dopo ogni modifica sostanziale (Art. 3 §23)",
    "Eseguire bias audit trimestrale con Data Audit (Art. 10)",
  ],
  mustNotDo: [
    "Usare il punteggio AI come unico criterio di selezione",
    "Ignorare l'alert di confidenza < 65%",
    "Modificare i log in LogVault — Append-Only policy",
    "Applicare il sistema a categorie protette senza FRIA approvata",
  ],
  humanOversightRequired: [
    "Tutti i casi con confidence < 65% (zona di incertezza)",
    "Candidati over 50 o under 25 (Art. 5 §1d)",
    "Qualsiasi output BLOCKED su analisi biometrica",
    "Ricorsi e contestazioni ex Art. 85 GDPR",
  ],
  uncertaintyThreshold: 0.65,
};

// ─── Decision explanations ────────────────────────────────────────────────────
const BASE_FEATURES: Omit<FeatureContribution, "shapValue" | "absInfluence" | "direction">[] = [
  {
    feature: "Esperienza lavorativa", column: "anni_esperienza",
    humanLabel: 'Il numero di anni di esperienza ha contribuito positivamente: il candidato supera la soglia minima richiesta per il ruolo.',
    isProxy: false,
  },
  {
    feature: "Codice postale", column: "cap_residenza",
    humanLabel: 'Il codice postale ha influenzato la decisione. ⚠ Possibile proxy geografico per etnia — verificare manualmente.',
    isProxy: true, proxyFor: "etnia",
  },
  {
    feature: "Titolo di studio", column: "titolo_studio",
    humanLabel: 'Il titolo di studio è allineato ai requisiti del profilo. Contributo positivo al punteggio.',
    isProxy: false,
  },
  {
    feature: "Settore precedente", column: "cod_settore",
    humanLabel: 'Il settore di provenienza presenta correlazione con il profilo target. ⚠ Possibile proxy di genere — validare.',
    isProxy: true, proxyFor: "genere",
  },
  {
    feature: "Esito precedente", column: "esito_prec",
    humanLabel: "La storia lavorativa passata ha pesato nella valutazione. Nessuna anomalia rilevata.",
    isProxy: false,
  },
  {
    feature: "Fascia d'età", column: "eta",
    humanLabel: "L'età rientra nel range statisticamente prevalente nel training set. Impatto moderato.",
    isProxy: false,
  },
];

export function generateExplanation(seed: number): DecisionExplanation {
  const outputs: DecisionExplanation["output"][] = ["APPROVED", "REJECTED", "REVIEW"];
  const output     = outputs[seed % 3];
  const confidence = 0.51 + (seed % 42) / 100;
  const uncertaintyZone = confidence >= 0.45 && confidence <= 0.65;

  const features: FeatureContribution[] = BASE_FEATURES.map((f, i) => {
    const raw  = ((seed * (i + 3)) % 100 - 50) / 100;
    const shap = output === "APPROVED" ? Math.abs(raw) * (i % 2 === 0 ? 1 : -0.3)
               : output === "REJECTED" ? -Math.abs(raw) * (i % 2 === 0 ? 1 : 0.4)
               : raw * 0.5;
    return {
      ...f,
      shapValue:    +shap.toFixed(3),
      absInfluence: +Math.abs(shap).toFixed(3),
      direction:    (shap > 0.02 ? "positive" : shap < -0.02 ? "negative" : "neutral") as FeatureContribution["direction"],
    };
  }).sort((a, b) => b.absInfluence - a.absInfluence);

  const topFeature = features[0];
  const topPct     = (topFeature.absInfluence * 100 / features.reduce((s, f) => s + f.absInfluence, 0)).toFixed(0);

  return {
    inferenceId:   `INF-${String(1000 + seed).padStart(5, "0")}`,
    timestamp:     new Date(Date.now() - seed * 8 * 60 * 1000),
    inputSummary:  `Candidato record_${1000 + seed} — posizione: Senior Developer`,
    output,
    confidence,
    uncertaintyZone,
    features,
    shortExplanation:
      output === "APPROVED"
        ? `Candidato approvato con ${(confidence * 100).toFixed(0)}% di confidenza. Il fattore principale è "${topFeature.feature}" (${topPct}% dell'influenza totale).`
        : output === "REJECTED"
        ? `Candidato non superato soglia. Il fattore principale è "${topFeature.feature}" con impatto negativo del ${topPct}%. ${uncertaintyZone ? "⚠ Confidenza nella zona di incertezza — revisione umana raccomandata." : ""}`
        : `Punteggio in zona grigia. Il sistema non è in grado di decidere con sufficiente confidenza (${(confidence * 100).toFixed(0)}%). Revisione umana obbligatoria.`,
    technicalSummary: `SHAP base value: 0.412 | Model: BERT-large v2.1.0 | Threshold: 0.72 | Features: ${features.length} | Monotonicity: enforced`,
    modelVersion: "v2.1.0",
    operatorId:   ["op_ferrari_m", "op_rossi_a", "op_bianchi_l"][seed % 3],
  };
}

export const SAMPLE_DECISIONS = [0, 1, 2, 3, 4].map(generateExplanation);
