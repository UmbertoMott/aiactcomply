export interface DiscoveryData {
  libraries: string[];
  keywords: string[];
  api_endpoints: string[];
}

export interface RiskPattern {
  id: string;
  legal_reference: string;
  technical_indicators: {
    libraries: string[];
    keywords: string[];
    api_endpoints: string[];
  };
  risk_level: "Unacceptable" | "High" | "Limited" | "Minimal";
  weight: number;
  validation_logic: string;
  description: string;
}

export interface ScoringResult {
  pattern_id: string;
  risk_level: string;
  legal_ref: string;
  confidence: string;
  trigger_matches: string[];
}

export interface AnalysisOutput {
  summary_risk: string;
  detailed_findings: ScoringResult[];
  system_fingerprint: string;
}

const RISK_PRIORITY: Record<string, number> = {
  Unacceptable: 4,
  High: 3,
  Limited: 2,
  Minimal: 1,
};

const RISK_PATTERNS: RiskPattern[] = [
  {
    id: "PATTERN_BIO_001",
    legal_reference: "Article 5(1)(d) - Remote Biometric Identification",
    technical_indicators: { libraries: ["face_recognition", "deepface", "insightface"], keywords: ["face_match", "identify_person", "biometric_search", "watchlist", "facial_recognition"], api_endpoints: ["/identify", "/search-face", "/match-biometric"] },
    risk_level: "Unacceptable", weight: 100, validation_logic: "IMMEDIATE_BLOCK", description: "Identificazione biometrica remota in spazi accessibili al pubblico",
  },
  {
    id: "PATTERN_BIO_002",
    legal_reference: "Article 5(1)(g) - Biometric Categorization",
    technical_indicators: { libraries: ["opencv-python", "dlib", "mediapipe"], keywords: ["emotion_detection", "ethnicity_classifier", "gender_inference", "age_estimation"], api_endpoints: ["/analyze-face", "/detect-mood", "/infer-demographics"] },
    risk_level: "Unacceptable", weight: 95, validation_logic: "IMMEDIATE_BLOCK", description: "Categorizzazione biometrica di persone basata su dati sensibili",
  },
  {
    id: "PATTERN_EMP_001",
    legal_reference: "Annex III, Point 4 - Employment & Worker Management",
    technical_indicators: { libraries: ["scikit-learn", "xgboost", "lightgbm", "catboost", "transformers"], keywords: ["resume_parser", "candidate_score", "hiring_rank", "cv_extraction", "candidate_screening", "applicant_tracking", "employee_monitoring", "performance_predict"], api_endpoints: [] },
    risk_level: "High", weight: 85, validation_logic: "TRIGGER_IF_ALL_MATCH", description: "Sistemi per assunzione, valutazione o monitoraggio lavoratori",
  },
  {
    id: "PATTERN_CREDIT_001",
    legal_reference: "Annex III, Point 5 - Access to Essential Services",
    technical_indicators: { libraries: ["xgboost", "lightgbm", "prophet"], keywords: ["credit_score", "loan_approval", "mortgage_risk", "insurance_premium", "risk_profile", "default_predict"], api_endpoints: ["/credit-score", "/loan-eligibility", "/risk-assess"] },
    risk_level: "High", weight: 85, validation_logic: "TRIGGER_IF_ALL_MATCH", description: "Valutazione solvibilità creditizia o accesso servizi finanziari",
  },
  {
    id: "PATTERN_LAW_001",
    legal_reference: "Annex III, Point 6 - Law Enforcement",
    technical_indicators: { libraries: ["torch", "tensorflow", "ultralytics", "detectron2"], keywords: ["police_patrol", "crime_predict", "suspect_identify", "crowd_monitor", "threat_detect", "violence_detect", "weapon_detect"], api_endpoints: ["/predict-crime", "/identify-suspect", "/monitor-crowd"] },
    risk_level: "High", weight: 90, validation_logic: "TRIGGER_IF_ALL_MATCH", description: "Utilizzo da autorità di contrasto",
  },
  {
    id: "PATTERN_MANIP_001",
    legal_reference: "Article 5(1)(a) - Subliminal Manipulation",
    technical_indicators: { libraries: ["transformers", "torch", "tensorflow"], keywords: ["subliminal", "manipulat", "behavior_change", "exploit_vulnerability", "dark_pattern"], api_endpoints: ["/nudge", "/influence-decision"] },
    risk_level: "Unacceptable", weight: 100, validation_logic: "IMMEDIATE_BLOCK", description: "Tecniche subliminali che alterano il comportamento",
  },
  {
    id: "PATTERN_SOCIAL_001",
    legal_reference: "Article 5(1)(c) - Social Scoring",
    technical_indicators: { libraries: ["scikit-learn", "xgboost", "pandas"], keywords: ["social_score", "behavior_rating", "trust_index", "citizen_rank", "compliance_score"], api_endpoints: ["/social-score", "/rate-behavior"] },
    risk_level: "Unacceptable", weight: 100, validation_logic: "IMMEDIATE_BLOCK", description: "Social scoring basato su comportamento sociale",
  },
  { id: "PATTERN_EDU_001", legal_reference: "Annex III, Point 3 - Education", technical_indicators: { libraries: ["scikit-learn", "transformers", "torch"], keywords: ["student_assess", "exam_grade", "admission_score", "education_rank", "learning_outcome"], api_endpoints: [] }, risk_level: "High", weight: 80, validation_logic: "TRIGGER_IF_ALL_MATCH", description: "Accesso all'istruzione" },
  { id: "PATTERN_MIG_001", legal_reference: "Annex III, Point 7 - Migration", technical_indicators: { libraries: ["torch", "tensorflow", "face_recognition", "opencv-python"], keywords: ["visa_assess", "asylum_risk", "border_check", "immigration_score", "travel_risk"], api_endpoints: [] }, risk_level: "High", weight: 90, validation_logic: "TRIGGER_IF_ALL_MATCH", description: "Controllo migratorio" },
  { id: "PATTERN_GEN_001", legal_reference: "Article 50(2) - Synthetic Content", technical_indicators: { libraries: ["transformers", "diffusers", "langchain"], keywords: ["generate_text", "generate_image", "synthetic", "deepfake", "llm_response", "chat_completion"], api_endpoints: [] }, risk_level: "Limited", weight: 50, validation_logic: "NOTIFY_ONLY", description: "Contenuti sintetici" },
];

export class AIRiskScorer {
  constructor() {}

  private calculateConfidence(matches: number, totalIndicators: number): number {
    if (totalIndicators === 0) return 0;
    return parseFloat(((matches / totalIndicators) * 100).toFixed(2));
  }

  analyzeProject(discoveryData: DiscoveryData): AnalysisOutput {
    const detailedFindings: ScoringResult[] = [];
    const detectedLibs = discoveryData.libraries || [];
    const detectedKeywords = discoveryData.keywords || [];
    const detectedEndpoints = discoveryData.api_endpoints || [];

    for (const pattern of RISK_PATTERNS) {
      const indicators = pattern.technical_indicators;

      const matchLibs = indicators.libraries.filter((lib) =>
        detectedLibs.some((dl) => dl.includes(lib) || lib.includes(dl))
      );
      const matchKeys = indicators.keywords.filter((key) =>
        detectedKeywords.some((dk) => dk.toLowerCase().includes(key.toLowerCase()))
      );
      const matchApi = indicators.api_endpoints.filter((api) =>
        detectedEndpoints.some((de) => de.includes(api))
      );

      const totalMatches = matchLibs.length + matchKeys.length + matchApi.length;
      const totalPossible = indicators.libraries.length + indicators.keywords.length + indicators.api_endpoints.length;
      const confidence = this.calculateConfidence(totalMatches, totalPossible);

      if (confidence > 0) {
        detailedFindings.push({
          pattern_id: pattern.id,
          risk_level: pattern.risk_level,
          legal_ref: pattern.legal_reference,
          confidence: `${confidence}%`,
          trigger_matches: [...matchLibs, ...matchKeys, ...matchApi],
        });
      }
    }

    let maxRisk = "Minimal";
    for (const res of detailedFindings) {
      if ((RISK_PRIORITY[res.risk_level] || 0) > (RISK_PRIORITY[maxRisk] || 0)) {
        maxRisk = res.risk_level;
      }
    }

    const fingerprint = this.simpleHash(JSON.stringify(discoveryData));

    return {
      summary_risk: maxRisk,
      detailed_findings: detailedFindings,
      system_fingerprint: fingerprint,
    };
  }

  private simpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `sha256:mock:${Math.abs(hash).toString(16).padStart(8, "0")}`;
  }
}
