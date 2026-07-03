// Dossier Storage Schema — shared localStorage schema for all tools

export interface ClassifierResult {
  systemName: string;
  systemDescription: string;
  riskLevel: "unacceptable" | "high" | "limited" | "minimal";
  annexIII: boolean;
  annexI?: boolean;
  applicableArticles: string[];
  completedAt: string;
  /** Ruolo dell'organizzazione rispetto al sistema: provider/deployer */
  role?: "provider" | "deployer" | "fornitore" | "dispiegatore" | "deployer/utilizzatore" | string;
  /** Il sistema è o integra un modello di uso generale (GPAI) */
  isGPAI?: boolean;
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
  nextReviewDate?: string;
  reviewCycle?: "monthly" | "quarterly" | "biannual" | "annual";
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
  labelingProcess?: string;
  labelingInstructions?: string;
  geoCoverage?: string;
  geoGapNote?: string;
  usesSpecialCategoriesForBias?: boolean;
  specialCategoryGuarantees?: string;
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
  accuracyThreshold?: number;
  fallbackChecks?: Record<string, boolean>;
}

export interface QMSResult {
  qmsDocumentRef: string;
  postMarketPlanExists: boolean;
  internalReviewCycle: string;
  responsibleManager: string;
  certifications: string[];
  completedAt: string;
}

export interface GPAIResult {
  role: "gpai_provider_systemic" | "gpai_provider_standard" | "downstream_high_risk" | "downstream_standard" | "not_applicable" | "incomplete";
  gpai_providers_used: number;
  art53_score: number;
  art55_score: number;
  code_of_practice_status: string;
  obligationsCompleted: number;
  completedAt: string;
}

export interface ConformityResult {
  path: string;
  score: number;
  passed: number;
  total: number;
  declarationGenerated: boolean;
  registrationRef?: string;
  completedAt: string;
}

export interface FRIAResult {
  systemName: string;
  organizationName?: string;
  overallRisk: string;
  completeness?: number;
  status?: string;
  approvedBy?: string;
  completedAt: string;
}

/** @deprecated kept for backward compat with older dossier snapshots */
export interface DPIARisk {
  id: string;
  title: string;
  description: string;
  likelihood: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  mitigation: string;
  residualRisk: "acceptable" | "review" | "unacceptable";
}

// ── DPIA WP248 rev.01 interfaces ────────────────────────────────────────────

export interface DPIAScreeningCriterion {
  id: string;
  label: string;
  description: string;
  applies: "yes" | "no" | "partial" | "";
  notes: string;
}

export interface DPIAAsset {
  id: string;
  name: string;
  type: "hardware" | "software" | "network" | "database" | "document" | "person" | "other";
  description: string;
  personal_data: boolean;
}

export interface DPIAThreat {
  id: string;
  category: "illegitimate_access" | "unwanted_modification" | "data_disappearance";
  source: string;
  description: string;
  likelihood: "low" | "medium" | "high";
  severity: "low" | "medium" | "high";
  risk_level: "low" | "medium" | "high";
  mitigation: string;
  residual_likelihood: "low" | "medium" | "high";
  residual_severity: "low" | "medium" | "high";
  residual_risk: "low" | "medium" | "high";
}

export interface DPIAProportionalityCheck {
  id: string;
  principle: string;
  description: string;
  status: "compliant" | "partial" | "non_compliant" | "na" | "";
  notes: string;
}

export interface DPIARightsCheck {
  id: string;
  right: string;
  article: string;
  applicable: "yes" | "no" | "partial" | "";
  how_ensured: string;
}

export interface DPIAResult {
  screening: {
    criteria: DPIAScreeningCriterion[];
    criteria_met_count: number;
    dpia_required: "yes" | "no" | "uncertain";
    justification_if_no_dpia: string;
  };
  description: {
    system_name: string;
    organization_name: string;
    controller_name: string;
    dpo_name: string;
    dpo_consulted: "yes" | "no" | "";
    dpo_opinion: string;
    processor_involved: "yes" | "no" | "";
    processor_name: string;
    processing_purposes: string;
    legitimate_interest?: string;
    personal_data_categories: string;
    special_categories: string;
    data_subjects_categories: string;
    recipients: string;
    retention_period: string;
    assets: DPIAAsset[];
    codes_of_conduct: string;
    certifications: string;
    data_subjects_opinions: "collected" | "not_applicable" | "not_collected" | "";
    data_subjects_opinions_justification: string;
    data_subjects_opinions_details: string;
  };
  proportionality: {
    necessity_justification: string;
    proportionality_checks: DPIAProportionalityCheck[];
    rights_checks: DPIARightsCheck[];
    processor_clauses_art28: "yes" | "no" | "na" | "";
    international_transfers: "yes" | "no" | "";
    international_transfers_safeguards: string;
  };
  risks: {
    threats: DPIAThreat[];
    overall_risk_before: "high" | "medium" | "low" | "";
  };
  measures: {
    technical_measures: string;
    organizational_measures: string;
    overall_risk_after: "high" | "medium" | "low" | "";
    prior_consultation_required: boolean;
    prior_consultation_authority: string;
    prior_consultation_date: string;
    review_schedule: string;
    review_trigger: string;
  };
  conclusion: {
    compliant: "yes" | "no" | "conditional" | "";
    conditions: string;
    summary: string;
    next_review_date: string;
    completedAt: string;
  };
}

export interface DeployerCheckResult {
  system_name: string;
  provider_name: string;
  compliant_count: number;
  partial_count: number;
  non_compliant_count: number;
  completedAt: string;
}

export interface XAIResult {
  overallXAIScore: number;
  modelVersion: string;
  complianceFlagsCount: number;
  hasCriticalFlags: boolean;
  completedAt: string;
}

export interface ProhibitedCheckResult {
  answers: Record<string, "yes" | "no" | "unsure">;
  verdict: "violation" | "potential_violation" | "conditional" | "clear";
  violatedChecks: string[];
  completedAt: string;
}

export interface L132CheckArea {
  areaId: "hr_transparency" | "content_labeling" | "deepfake_risk" | "accessibility";
  label: string;
  compliant: boolean | null;
  notes: string;
  requirements: string[];
  checks: (boolean | null)[];
}

export interface L132Result {
  completedAt: string;
  systemName: string;
  systemType: string;
  areas: L132CheckArea[];
  overallStatus: "conforme" | "parzialmente_conforme" | "non_conforme" | "non_applicabile";
  remediation: string;
  isDeepfakeRisk: boolean;
  requiresHRNotice: boolean;
  deployedInItaly?: boolean;
}

export interface ProviderTransitionResult {
  verdict: "provider" | "risk" | "deployer" | "incomplete";
  triggered_checks: string[];
  modification_count: number;
  substantial_modifications: number;
  completedAt: string;
}

export interface AuthRepResult {
  provider_name: string;
  provider_country: string;
  ar_name: string;
  ar_country: string;
  system_name: string;
  mandate_signed: boolean;
  eudb_registered_by_ar: boolean;
  completedAt: string;
}

export interface EUDBResult {
  system_name: string;
  provider_name: string;
  registration_number: string;
  member_states_count: number;
  risk_classification: string;
  registrationRequired: boolean;
  completedAt: string;
}

export interface IncidentResult {
  systemName: string;
  providerName: string;
  incidentDate: string;
  description: string;
  affectedPersons: number | null;
  severity: "minor" | "serious" | "critical";
  isSeriousIncident: boolean;
  art73Obligation: boolean;
  notificationDeadlineHours: number;
  notified: boolean;
  notifiedAt?: string;
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
  gpai?: GPAIResult;
  conformity?: ConformityResult;
  fria?: FRIAResult;
  dpia?: DPIAResult;
  l132?: L132Result;
  xai?: XAIResult;
  deployer?: DeployerCheckResult;
  eudb?: EUDBResult;
  authorizedRep?: AuthRepResult;
  providerTransition?: ProviderTransitionResult;
  art50?: { systemsCount: number; completedAt: string };
  incident?: IncidentResult;
}

// ── Org Profile — flag organizzativi per sidebar condizionale ───────────────

export interface OrgProfile {
  /** True se l'organizzazione opera con la PA italiana → mostra L.132 + AGID/ACN */
  paItaly: boolean;
  /** True se il sistema classificato in Triage è un modello GPAI → mostra GPAI Assessment */
  gpaiDetected: boolean;
  /** True se l'utente ha abilitato il mapping NIST AI RMF (Enterprise opt-in) */
  nistEnabled: boolean;
  /** Nome organizzazione (opzionale) */
  orgName?: string;
}

export const DEFAULT_ORG_PROFILE: OrgProfile = {
  paItaly: false,
  gpaiDetected: false,
  nistEnabled: false,
};

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
  fria:        "aicomply_fria_result",
  dpia:        "aicomply_dpia_result",
  l132:        "aicomply_l132_result",
  gpai:        "aicomply_gpai_result",
  conformity:  "aicomply_conformity_assessment",
  onboarding:  "aicomply_onboarding_data",
  xai:         "aicomply_xai_result",
  deployer:    "aicomply_deployer_result",
  eudb:        "aicomply_eudb_result",
  authorizedRep: "aicomply_authorized_rep_result",
  providerTransition: "aicomply_provider_transition_result",
  art50: "aicomply_art50_result",
  orgProfile: "aicomply_org_profile",
  incident: "aicomply_incident_result",
  assessment: "aicomply_assessment",
  spineRisks: "aicomply_spine_risks",
  dpiaSignoff: "aicomply_dpia_signoff",
  friaSignoff: "aicomply_fria_signoff",
  friaStaleness: "aicomply_fria_staleness",
  dpiaStaleness: "aicomply_dpia_staleness",
  dpiaGuided:    "aicomply_dpia_guided",
  friaGuided:          "aicomply_fria_guided",
  riskRegisterGuided:  "aicomply_risk_register_guided",
} as const;

// ── Project-scoped storage key ───────────────────────────────────────────────

function getActiveProjectId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("aicomply_active_project_id") ?? null;
}

/**
 * Restituisce la chiave localStorage per un tool:
 * - Con progetto attivo → `aicomply_p_{projectId}_{toolId}`
 * - Senza progetto → usa il legacy STORAGE_KEYS[key] per retrocompatibilità
 */
function scopedKey(key: keyof typeof STORAGE_KEYS): string {
  const pid = getActiveProjectId();
  return pid ? `aicomply_p_${pid}_${key}` : STORAGE_KEYS[key];
}

export function readFromStorage<T>(key: keyof typeof STORAGE_KEYS): T | null {
  try {
    if (typeof window === "undefined") return null;
    // Prima prova la chiave scoped al progetto attivo
    const primary = scopedKey(key);
    const raw = localStorage.getItem(primary);
    if (raw) return JSON.parse(raw) as T;
    // Fallback alla chiave legacy (dati pre-multiproject)
    if (primary !== STORAGE_KEYS[key]) {
      const legacy = localStorage.getItem(STORAGE_KEYS[key]);
      if (legacy) return JSON.parse(legacy) as T;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeToStorage<T>(key: keyof typeof STORAGE_KEYS, data: T): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(scopedKey(key), JSON.stringify(data));
    // Version snapshot — import lazy per evitare circular
    import("@/lib/projects/version-history").then(({ appendVersion }) => {
      appendVersion(key, data);
    }).catch(() => {});
    // Supabase sync — fire-and-forget, non blocca la UI
    // Usa un debounce globale per non saturare su keystroke
    _scheduleDbSync(key, data);
  } catch {
    // ignore quota errors in SSR
  }
}

// ─── Debounced Supabase sync (globale) ────────────────────────────────────────
const _dbSyncTimers: Record<string, ReturnType<typeof setTimeout>> = {};

function _scheduleDbSync<T>(key: string, data: T): void {
  if (_dbSyncTimers[key]) clearTimeout(_dbSyncTimers[key]);
  _dbSyncTimers[key] = setTimeout(() => {
    import("@/app/actions/toolState").then(({ saveToolState }) => {
      saveToolState(key, data).catch(() => {});
    }).catch(() => {});
  }, 2500);
}
