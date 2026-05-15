// Dossier Storage Schema — shared localStorage schema for all tools

export interface ClassifierResult {
  systemName: string;
  systemDescription: string;
  riskLevel: "unacceptable" | "high" | "limited" | "minimal";
  annexIII: boolean;
  applicableArticles: string[];
  completedAt: string;
}

export interface RiskManagerResult {
  risks: Array<{
    id: string;
    title: string;
    likelihood: "low" | "medium" | "high";
    impact: "low" | "medium" | "high";
    mitigation: string;
    residualRisk: "acceptable" | "review" | "unacceptable";
  }>;
  overallRiskLevel: "low" | "medium" | "high" | "critical";
  completedAt: string;
}

export interface DataAuditResult {
  datasets: Array<{
    name: string;
    source: string;
    size: string;
    biasChecked: boolean;
    qualityScore: number;
    personalData: boolean;
    issues: string[];
  }>;
  overallQuality: "pass" | "review" | "fail";
  completedAt: string;
}

export interface DocugenResult {
  systemName: string;
  provider: string;
  purpose: string;
  capabilities: string;
  limitations: string;
  humanOversight: string;
  performanceMetrics: string;
  trainingData: string;
  completedAt: string;
}

export interface LogvaultResult {
  loggingEnabled: boolean;
  retentionDays: number;
  loggedEvents: string[];
  storageLocation: string;
  accessControl: string;
  completedAt: string;
}

export interface TransparencyResult {
  userInformedOfAI: boolean;
  informationProvided: string[];
  contactPoint: string;
  languagesAvailable: string[];
  completedAt: string;
}

export interface OversightResult {
  oversightMechanism: string;
  humanInterventionPoints: string[];
  stopCapability: boolean;
  responsiblePersons: string[];
  completedAt: string;
}

export interface ResilienceResult {
  accuracyMetric: number;
  robustnessTested: boolean;
  cybersecurityMeasures: string[];
  fallbackProcedure: string;
  lastTestedAt: string;
  completedAt: string;
}

export interface QMSResult {
  qmsDocumentRef: string;
  postMarketPlanExists: boolean;
  internalReviewCycle: string;
  responsibleManager: string;
  certifications: string[];
  completedAt: string;
}

export interface ProhibitedCheckResult {
  answers: Record<string, "yes" | "no" | "unsure">;
  verdict: "violation" | "potential_violation" | "conditional" | "clear";
  violatedChecks: string[];
  completedAt: string;
}

export interface DossierData {
  meta: {
    companyName: string;
    systemName: string;
    generatedAt: string;
    generatedBy: string;
    version: string;
  };
  prohibited?: ProhibitedCheckResult;
  classifier?: ClassifierResult;
  riskManager?: RiskManagerResult;
  dataAudit?: DataAuditResult;
  docugen?: DocugenResult;
  logvault?: LogvaultResult;
  transparency?: TransparencyResult;
  oversight?: OversightResult;
  resilience?: ResilienceResult;
  qms?: QMSResult;
}

export const STORAGE_KEYS = {
  prohibited:  "aicomply_prohibited_result",
  classifier:  "aicomply_classifier_result",
  riskManager: "aicomply_risk_manager_result",
  dataAudit:   "aicomply_data_audit_result",
  docugen:     "aicomply_docugen_result",
  logvault:    "aicomply_logvault_result",
  transparency:"aicomply_transparency_result",
  oversight:   "aicomply_oversight_result",
  resilience:  "aicomply_resilience_result",
  qms:         "aicomply_qms_result",
  onboarding:  "aicomply_onboarding_data",
} as const;

export function readFromStorage<T>(key: keyof typeof STORAGE_KEYS): T | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(STORAGE_KEYS[key]);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeToStorage<T>(key: keyof typeof STORAGE_KEYS, data: T): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(data));
  } catch {
    // ignore quota errors in SSR
  }
}
