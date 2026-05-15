import type { DetectedLibrary, APIEndpoint } from "../simulation/discovery-engine";

interface RiskPattern {
  id: string;
  legal_reference: string;
  technical_indicators: {
    libraries: string[];
    keywords: string[];
    api_endpoints?: string[];
    data_schema_hints?: string[];
  };
  risk_level: string;
  weight: number;
  validation_logic: string;
  description: string;
}

const RISK_PATTERNS: RiskPattern[] = [
  {
    id: "PATTERN_BIO_001",
    legal_reference: "Article 5(1)(d) - Remote Biometric Identification",
    technical_indicators: {
      libraries: ["face_recognition", "deepface", "insightface"],
      keywords: ["face_match", "identify_person", "biometric_search", "watchlist", "facial_recognition"],
      api_endpoints: ["/identify", "/search-face", "/match-biometric"],
    },
    risk_level: "Unacceptable",
    weight: 100,
    validation_logic: "IMMEDIATE_BLOCK",
    description: "Identificazione biometrica remota in spazi accessibili al pubblico",
  },
  {
    id: "PATTERN_BIO_002",
    legal_reference: "Article 5(1)(g) - Biometric Categorization",
    technical_indicators: {
      libraries: ["opencv-python", "dlib", "mediapipe"],
      keywords: ["emotion_detection", "ethnicity_classifier", "gender_inference", "age_estimation"],
      api_endpoints: ["/analyze-face", "/detect-mood", "/infer-demographics"],
    },
    risk_level: "Unacceptable",
    weight: 95,
    validation_logic: "IMMEDIATE_BLOCK",
    description: "Categorizzazione biometrica di persone basata su dati sensibili",
  },
  {
    id: "PATTERN_EMP_001",
    legal_reference: "Annex III, Point 4 - Employment & Worker Management",
    technical_indicators: {
      libraries: ["scikit-learn", "xgboost", "lightgbm", "catboost", "transformers"],
      keywords: ["resume_parser", "candidate_score", "hiring_rank", "cv_extraction", "candidate_screening", "applicant_tracking", "employee_monitoring", "performance_predict"],
      data_schema_hints: ["gender", "age", "years_experience", "education_level", "marital_status", "previous_salary"],
    },
    risk_level: "High",
    weight: 85,
    validation_logic: "TRIGGER_IF_ALL_MATCH",
    description: "Sistemi per assunzione, valutazione o monitoraggio lavoratori",
  },
  {
    id: "PATTERN_CREDIT_001",
    legal_reference: "Annex III, Point 5 - Access to Essential Services",
    technical_indicators: {
      libraries: ["xgboost", "lightgbm", "prophet"],
      keywords: ["credit_score", "loan_approval", "mortgage_risk", "insurance_premium", "risk_profile", "default_predict"],
      api_endpoints: ["/credit-score", "/loan-eligibility", "/risk-assess"],
    },
    risk_level: "High",
    weight: 85,
    validation_logic: "TRIGGER_IF_ALL_MATCH",
    description: "Valutazione solvibilità creditizia o accesso servizi finanziari",
  },
  {
    id: "PATTERN_LAW_001",
    legal_reference: "Annex III, Point 6 - Law Enforcement",
    technical_indicators: {
      libraries: ["torch", "tensorflow", "ultralytics", "detectron2"],
      keywords: ["police_patrol", "crime_predict", "suspect_identify", "crowd_monitor", "threat_detect", "violence_detect", "weapon_detect"],
      api_endpoints: ["/predict-crime", "/identify-suspect", "/monitor-crowd"],
    },
    risk_level: "High",
    weight: 90,
    validation_logic: "TRIGGER_IF_ALL_MATCH",
    description: "Utilizzo da autorità di contrasto per valutazione del rischio",
  },
  {
    id: "PATTERN_MANIP_001",
    legal_reference: "Article 5(1)(a) - Subliminal Manipulation",
    technical_indicators: {
      libraries: ["transformers", "torch", "tensorflow"],
      keywords: ["subliminal", "manipulat", "behavior_change", "exploit_vulnerability", "dark_pattern"],
      api_endpoints: ["/nudge", "/influence-decision"],
    },
    risk_level: "Unacceptable",
    weight: 100,
    validation_logic: "IMMEDIATE_BLOCK",
    description: "Tecniche subliminali che alterano il comportamento in modo dannoso",
  },
  {
    id: "PATTERN_SOCIAL_001",
    legal_reference: "Article 5(1)(c) - Social Scoring",
    technical_indicators: {
      libraries: ["scikit-learn", "xgboost", "pandas"],
      keywords: ["social_score", "behavior_rating", "trust_index", "citizen_rank", "compliance_score"],
      api_endpoints: ["/social-score", "/rate-behavior"],
    },
    risk_level: "Unacceptable",
    weight: 100,
    validation_logic: "IMMEDIATE_BLOCK",
    description: "Social scoring basato su comportamento sociale",
  },
  {
    id: "PATTERN_EDU_001",
    legal_reference: "Annex III, Point 3 - Education & Vocational Training",
    technical_indicators: {
      libraries: ["scikit-learn", "transformers", "torch"],
      keywords: ["student_assess", "exam_grade", "admission_score", "education_rank", "learning_outcome"],
    },
    risk_level: "High",
    weight: 80,
    validation_logic: "TRIGGER_IF_ALL_MATCH",
    description: "Accesso all'istruzione o valutazione risultati apprendimento",
  },
  {
    id: "PATTERN_MIG_001",
    legal_reference: "Annex III, Point 7 - Migration, Asylum & Border Control",
    technical_indicators: {
      libraries: ["torch", "tensorflow", "face_recognition", "opencv-python"],
      keywords: ["visa_assess", "asylum_risk", "border_check", "immigration_score", "travel_risk"],
    },
    risk_level: "High",
    weight: 90,
    validation_logic: "TRIGGER_IF_ALL_MATCH",
    description: "Controllo migratorio e valutazione del rischio per visti",
  },
  {
    id: "PATTERN_GEN_001",
    legal_reference: "Article 50(2) - Synthetic Content Marking",
    technical_indicators: {
      libraries: ["transformers", "diffusers", "langchain"],
      keywords: ["generate_text", "generate_image", "synthetic", "deepfake", "llm_response", "chat_completion"],
    },
    risk_level: "Limited",
    weight: 50,
    validation_logic: "NOTIFY_ONLY",
    description: "Generazione contenuti sintetici — obblighi marcatura",
  },
];

export interface InferenceMatch {
  patternId: string;
  legalReference: string;
  riskLevel: string;
  confidence: number;
  matchedLibraries: string[];
  matchedKeywords: string[];
  matchedEndpoints: string[];
  weight: number;
  description: string;
}

export interface PolicyCard {
  id: string;
  systemName: string;
  versionHash: string;
  timestamp: string;
  matches: InferenceMatch[];
  aggregatedRisk: string;
  maxConfidence: number;
  requiresComplianceOfficer: boolean;
  evidenceHash: string;
}

export interface SchemaColumn {
  name: string;
  type: string;
  sensitive: boolean;
  gdprCategory: "biometric" | "health" | "political" | "religious" | "genetic" | "none";
}

const SENSITIVE_COLUMNS: Array<{ pattern: RegExp; category: SchemaColumn["gdprCategory"] }> = [
  { pattern: /gender|sex|genere|sesso|maschio|femmina/i, category: "none" },
  { pattern: /ethnic|race|razza|etnia|nazionalità|origine/i, category: "political" },
  { pattern: /health|salute|malattia|diagnosi|patologia|disabil/i, category: "health" },
  { pattern: /religion|religione|faith|fede|cred/i, category: "religious" },
  { pattern: /biometric|dna|genetic|fingerprint|impronta/i, category: "biometric" },
  { pattern: /political|voto|partito|sindacato|union/i, category: "political" },
  { pattern: /salary|stipendio|reddito|income|wage|compenso/i, category: "none" },
  { pattern: /face|facial|volto|viso|foto|photo|image/i, category: "biometric" },
];

export function analyzeSchema(schemaFields: string[]): SchemaColumn[] {
  return schemaFields.map((name) => {
    for (const { pattern, category } of SENSITIVE_COLUMNS) {
      if (pattern.test(name)) {
        return { name, type: "string", sensitive: category !== "none", gdprCategory: category };
      }
    }
    return { name, type: "string", sensitive: false, gdprCategory: "none" };
  });
}

export function inferRisk(
  libraries: DetectedLibrary[],
  endpoints: APIEndpoint[],
  schemaColumns: SchemaColumn[]
): InferenceMatch[] {
  const matches: InferenceMatch[] = [];
  const libNames = libraries.map((l) => l.name);
  const endpointPaths = endpoints.map((e) => e.path);
  const allKeywords = [...libNames, ...endpointPaths.join(" ").split(/[/\-_]/)];

  for (const pattern of RISK_PATTERNS) {
    const matchedLibraries: string[] = [];
    const matchedKeywords: string[] = [];
    const matchedEndpoints: string[] = [];

    for (const lib of pattern.technical_indicators.libraries) {
      if (libNames.some((l) => l.includes(lib) || lib.includes(l))) {
        matchedLibraries.push(lib);
      }
    }

    for (const kw of pattern.technical_indicators.keywords) {
      if (allKeywords.some((k) => k.toLowerCase().includes(kw.toLowerCase()))) {
        matchedKeywords.push(kw);
      }
    }

    const apis = pattern.technical_indicators.api_endpoints || [];
    for (const ep of apis) {
      if (endpointPaths.some((p) => p.includes(ep))) {
        matchedEndpoints.push(ep);
      }
    }

    const hasSchemaHints = pattern.technical_indicators.data_schema_hints
      ? pattern.technical_indicators.data_schema_hints.some(
          (hint) => schemaColumns.some((c) => c.name.toLowerCase().includes(hint.toLowerCase()))
        )
      : false;

    if (matchedLibraries.length > 0 || matchedKeywords.length > 0 || hasSchemaHints) {
      let confidence = 0;
      confidence += matchedLibraries.length * 25;
      confidence += matchedKeywords.length * 15;
      confidence += matchedEndpoints.length * 10;
      if (hasSchemaHints) confidence += 20;

      if (pattern.validation_logic === "IMMEDIATE_BLOCK" && matchedLibraries.length > 0) {
        confidence = Math.max(confidence, 90);
      }
      if (pattern.validation_logic === "TRIGGER_IF_ALL_MATCH" && matchedLibraries.length > 0 && matchedKeywords.length > 0) {
        confidence += 20;
      }

      confidence = Math.min(confidence, 100);

      matches.push({
        patternId: pattern.id,
        legalReference: pattern.legal_reference,
        riskLevel: pattern.risk_level,
        confidence,
        matchedLibraries,
        matchedKeywords,
        matchedEndpoints,
        weight: pattern.weight,
        description: pattern.description,
      });
    }
  }

  return matches.sort((a, b) => b.confidence - a.confidence);
}

export function generatePolicyCard(
  systemName: string,
  matches: InferenceMatch[],
  schemaColumns: SchemaColumn[]
): PolicyCard {
  const maxConfidence = matches.length > 0 ? Math.max(...matches.map((m) => m.confidence)) : 0;
  const hasUnacceptable = matches.some((m) => m.riskLevel === "Unacceptable");
  const hasHigh = matches.some((m) => m.riskLevel === "High");
  const sensitiveColumns = schemaColumns.filter((c) => c.sensitive);

  return {
    id: `POLICY-${Date.now().toString(36).toUpperCase()}`,
    systemName,
    versionHash: `sha256:${Date.now().toString(36)}`,
    timestamp: new Date().toISOString(),
    matches,
    aggregatedRisk: hasUnacceptable ? "Unacceptable" : hasHigh ? "High" : matches.length > 0 ? "Limited" : "Minimal",
    maxConfidence,
    requiresComplianceOfficer: hasUnacceptable || hasHigh || sensitiveColumns.length > 0,
    evidenceHash: `sha256:${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
  };
}

export function translateToHumanText(match: InferenceMatch): string {
  const templates: Record<string, string> = {
    PATTERN_BIO_001: `ATTENZIONE: Il sistema utilizza librerie di riconoscimento biometrico (${match.matchedLibraries.join(", ")}). VIOLAZIONE Art. 5(1)(d) se in spazi pubblici.`,
    PATTERN_BIO_002: `ALLERTA: Categorizzazione biometrica rilevata (${match.matchedLibraries.join(", ")}). PRATICA VIETATA Art. 5(1)(g).`,
    PATTERN_EMP_001: `RILEVATO: Screening/valutazione candidati (${match.matchedKeywords.slice(0,2).join(", ")}). Allegato III, Punto 4. Obblighi: Art. 11, 14, 27.`,
    PATTERN_CREDIT_001: `RILEVATO: Scoring finanziario (${match.matchedKeywords.slice(0,2).join(", ")}). Allegato III, Punto 5. Obblighi: Art. 10, 15.`,
    PATTERN_LAW_001: `ALLERTA: Componenti riconducibili a contrasto. Allegato III, Punto 6. Richiesta autorizzazione.`,
    PATTERN_MANIP_001: `VIOLAZIONE: Tecnica manipolativa rilevata. Art. 5(1)(a) VIETA tecniche subliminali.`,
    PATTERN_SOCIAL_001: `VIOLAZIONE: Social scoring rilevato. PRATICA VIETATA Art. 5(1)(c).`,
    PATTERN_EDU_001: `RILEVATO: Valutazione educativa. Allegato III, Punto 3.`,
    PATTERN_MIG_001: `RILEVATO: Controllo migratorio. Allegato III, Punto 7.`,
    PATTERN_GEN_001: `INFO: Contenuti sintetici rilevati. Obblighi di marcatura Art. 50(2).`,
  };

  return templates[match.patternId] || `${match.description} (Confidenza: ${match.confidence}%)`;
}
