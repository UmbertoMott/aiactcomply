"use client"
import { readFromStorage } from "@/lib/dossier/storage-schema"
import type {
  ClassifierResult, RiskManagerResult, DataAuditResult,
  OversightResult, ResilienceResult, ConformityResult,
  FRIAResult, OrgProfile,
} from "@/lib/dossier/storage-schema"

export interface IdentifiedRisk {
  scenario: string
  severity: number   // 1-5 (mapped from low/medium/high)
  likelihood: number // 1-5
  mitigation: string
}

export interface GlobalComplianceContext {
  // Da Classifier
  systemName?: string
  systemDescription?: string
  riskTier?: string
  annexIII?: boolean
  applicableArticles?: string[]
  role?: string
  isPublicAuthority?: boolean
  isFinancialInstitution?: boolean
  operatesWithItalianPA?: boolean

  // Da Risk Manager
  identifiedRisks?: IdentifiedRisk[]
  overallRiskLevel?: string
  riskNextReview?: string

  // Da Data Audit
  datasetNames?: string[]
  sensitiveFeatures?: string[]
  dataQualityScore?: number
  biasChecked?: boolean
  personalData?: boolean
  processesLargeScale?: boolean

  // Da Oversight
  humanOversightRequired?: boolean
  oversightMechanism?: string
  killSwitchEnabled?: boolean

  // Da Resilience
  accuracyMetric?: number
  defenseRate?: number
  redTeamPassed?: boolean

  // Da Conformity
  declarationNumber?: string
  conformityCompletedAt?: string

  // Da FRIA
  friaOverallRisk?: string
  friaCompletedAt?: string

  // Da OrgProfile
  providerName?: string
  providerCountry?: string
  providerAddress?: string
  isNonEuProvider?: boolean

  // Meta
  completedTools: string[]
  lastUpdated: string
}

const EU_COUNTRY_CODES = [
  "IT","DE","FR","ES","NL","BE","PL","SE","AT","DK",
  "FI","PT","IE","GR","CZ","HU","RO","BG","SK","HR",
  "SI","LT","LV","EE","CY","LU","MT",
]

const LIKELIHOOD_MAP: Record<string, number> = { low: 1, medium: 3, high: 5, critical: 5 }
const IMPACT_MAP:     Record<string, number> = { low: 1, medium: 3, high: 5, critical: 5 }

export function useComplianceContext(): GlobalComplianceContext {
  const classifier  = readFromStorage<ClassifierResult>("classifier")
  const riskMgr     = readFromStorage<RiskManagerResult>("riskManager")
  const dataAudit   = readFromStorage<DataAuditResult>("dataAudit")
  const oversight   = readFromStorage<OversightResult>("oversight")
  const resilience  = readFromStorage<ResilienceResult>("resilience")
  const conformity  = readFromStorage<ConformityResult>("conformity")
  const fria        = readFromStorage<FRIAResult>("fria")
  const orgProfile  = readFromStorage<OrgProfile>("orgProfile")

  const toolIds = [
    "classifier","riskManager","dataAudit","docugen","logvault",
    "transparency","oversight","resilience","qms","fria","dpia",
    "deployer","conformity","eudb","gpai","l132","orgProfile",
  ]
  const completedTools = toolIds.filter(id => readFromStorage(id) !== null)

  // Map risk-manager risks to normalized format
  const identifiedRisks: IdentifiedRisk[] | undefined = riskMgr?.risks?.map(r => ({
    scenario: r.title,
    severity: IMPACT_MAP[r.impact] ?? 3,
    likelihood: LIKELIHOOD_MAP[r.likelihood] ?? 3,
    mitigation: r.mitigation,
  }))

  // Extract sensitive features from data audit
  const sensitiveFeatures = dataAudit?.datasets
    ?.filter(d => d.biasChecked)
    .flatMap(d => d.issues ?? [])

  const biasChecked = dataAudit?.datasets?.some(d => d.biasChecked) ?? false
  const personalData = dataAudit?.datasets?.some(d => d.personal_data !== undefined
    ? (d as any).personal_data : d.personalData) ?? false

  return {
    systemName:             classifier?.systemName,
    systemDescription:      classifier?.systemDescription,
    riskTier:               classifier?.riskLevel,
    annexIII:               classifier?.annexIII,
    applicableArticles:     classifier?.applicableArticles,
    role:                   (orgProfile as any)?.role?.[0] ?? undefined,
    isPublicAuthority:      (orgProfile as any)?.isPublicAuthority,
    isFinancialInstitution: (orgProfile as any)?.isFinancialInstitution,
    operatesWithItalianPA:  orgProfile?.paItaly,

    identifiedRisks,
    overallRiskLevel: riskMgr?.overallRiskLevel,
    riskNextReview:   riskMgr?.nextReviewDate,

    datasetNames:     dataAudit?.datasets?.map(d => d.name),
    sensitiveFeatures,
    dataQualityScore: typeof dataAudit?.overallQuality === "string"
      ? ({ pass: 80, review: 50, fail: 20 }[dataAudit.overallQuality] ?? 0)
      : undefined,
    biasChecked,
    personalData,
    processesLargeScale: (dataAudit as any)?.processesLargeScale,

    humanOversightRequired: oversight?.stopCapability !== undefined
      ? true : undefined,
    oversightMechanism: oversight?.oversightMechanism,
    killSwitchEnabled:  oversight?.stopCapability,

    accuracyMetric: resilience?.accuracyMetric,
    defenseRate:    (resilience as any)?.defenseRate,
    redTeamPassed:  resilience?.robustnessTested,

    declarationNumber:    conformity?.registrationRef,
    conformityCompletedAt: conformity?.completedAt,

    friaOverallRisk:  fria?.overallRisk,
    friaCompletedAt:  fria?.completedAt,

    providerName:    (orgProfile as any)?.providerName ?? orgProfile?.orgName,
    providerCountry: (orgProfile as any)?.providerCountry,
    providerAddress: (orgProfile as any)?.providerAddress,
    isNonEuProvider: (orgProfile as any)?.providerCountry
      ? !EU_COUNTRY_CODES.includes((orgProfile as any).providerCountry)
      : undefined,

    completedTools,
    lastUpdated: new Date().toISOString(),
  }
}

/** Serializza il contesto per le Server Actions */
export function serializeContext(ctx: GlobalComplianceContext): string {
  return JSON.stringify(ctx, null, 2)
}

/** Versione standalone per usarla fuori da React (nei modal, nelle server actions) */
export function buildComplianceContextFromStorage(): GlobalComplianceContext {
  if (typeof window === "undefined") {
    return { completedTools: [], lastUpdated: new Date().toISOString() }
  }
  // Riusa la stessa logica — richiamabile senza hook
  const classifier  = readFromStorage<ClassifierResult>("classifier")
  const riskMgr     = readFromStorage<RiskManagerResult>("riskManager")
  const dataAudit   = readFromStorage<DataAuditResult>("dataAudit")
  const orgProfile  = readFromStorage<OrgProfile>("orgProfile")

  const toolIds = [
    "classifier","riskManager","dataAudit","docugen","logvault",
    "transparency","oversight","resilience","qms","fria","dpia",
    "deployer","conformity","eudb","gpai","l132","orgProfile",
  ]
  const completedTools = toolIds.filter(id => readFromStorage(id) !== null)

  return {
    systemName:         classifier?.systemName,
    systemDescription:  classifier?.systemDescription,
    riskTier:           classifier?.riskLevel,
    annexIII:           classifier?.annexIII,
    applicableArticles: classifier?.applicableArticles,
    overallRiskLevel:   riskMgr?.overallRiskLevel,
    datasetNames:       dataAudit?.datasets?.map(d => d.name),
    biasChecked:        dataAudit?.datasets?.some(d => d.biasChecked),
    personalData:       dataAudit?.datasets?.some(d => (d as any).personalData),
    providerName:       (orgProfile as any)?.providerName ?? orgProfile?.orgName,
    operatesWithItalianPA: orgProfile?.paItaly,
    completedTools,
    lastUpdated: new Date().toISOString(),
  }
}
