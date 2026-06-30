// Tipi del Registro dei Rischi — trasposizione 1:1 del Template Risk Register
// Guidato Art. 9 (§0-§9 + trasversale Comunicazione), metodo ISO/IEC 23894.
import { z } from "zod";

export const VERIFY_NOTE_IT = "[verificare sul testo AI Act vigente]";
export const VERIFY_NOTE_EN = "[verify against current AI Act text]";

// --- §0: Scoping e criteri di rischio (Art. 9(1) + Art. 6/Annex III) ---
export const SystemIdentificationSchema = z.object({
  systemName: z.string().optional(),
  providerDeployerRole: z.string().optional(),
  descriptionAndPurpose: z.string().optional(),
  riskTier: z.enum(["minimal", "limited", "high_risk", "gpai", "unclassified"]).default("unclassified"),
  annexIIIArea: z.string().optional(),
  applicableArticles: z.array(z.string()).default([]),
  personalDataProcessed: z.enum(["yes", "no", "unspecified"]).default("unspecified"),
  legalBasis: z.string().optional(),
  humanOversightRequired: z.boolean().optional(),
  registerOwner: z.string().optional(),
  firstCompiledAt: z.string().optional(),
  documentVersion: z.string().optional(),
  // Triage GPAI — Art. 51-55: determina se il modulo condizionale deve apparire
  incorporatesGpaiModel: z.enum(["yes", "no", "unspecified"]).default("unspecified"),
  // Art. 9(9) — valutazione impatto su minori (<18) e altri gruppi vulnerabili
  vulnerableGroupsImpactAssessment: z.string().optional(),
  // §0 — criteri di accettabilità del rischio (risk appetite)
  riskAppetite: z.string().optional(),
  // §0 — ambito e contesto d'uso (deployment, utenti, ambiente operativo)
  usageContext: z.string().optional(),
  // §1 — fase del ciclo di vita coperta dal registro (design/sviluppo/deployment/monitoraggio/dismissione)
  lifeCyclePhase: z.string().optional(),
});
export type SystemIdentification = z.infer<typeof SystemIdentificationSchema>;

// --- §1/§5: voce del registro rischi ---
export const RiskRegisterEntrySchema = z.object({
  id: z.string(),
  category: z.string(),
  description: z.string(),
  art9Reference: z.string(),
  likelihood: z.enum(["low", "medium", "high"]).optional(),
  impact: z.enum(["low", "medium", "high"]).optional(),
  mitigations: z.string().optional(),
  owner: z.string().optional(),
  status: z.enum(["open", "assessing", "mitigating", "mitigated", "accepted", "transferred"]).default("open"),
  nextReviewDate: z.string().optional(),
  source: z.enum(["manual", "ai_catalog", "ai_gap"]).default("manual"),
  aiConfirmed: z.boolean().default(true),
});
export type RiskRegisterEntry = z.infer<typeof RiskRegisterEntrySchema>;

// --- §2: Stima e valutazione (Art. 9(2)(b)) ---
export const EstimationSchema = z.object({
  intendedUseCases: z.array(z.string()).default([]),
  foreseenMisuse: z.array(z.string()).default([]),
  impactAssessment: z.string().optional(),
  affectedPersonsCount: z.string().optional(),
  // valutazione vs criteri §0 e priorità
  evaluationAgainstCriteria: z.string().optional(),
});
export type Estimation = z.infer<typeof EstimationSchema>;

// --- §3: Test e validazione (Art. 9(6)-(8) + Art. 60) ---
export const TestValidationSchema = z.object({
  testMetrics: z.array(z.string()).default([]),
  thresholds: z.string().optional(),
  validationOutcome: z.string().optional(),
  worstCase: z.string().optional(),
  confidenceLevel: z.string().optional(),
});
export type TestValidation = z.infer<typeof TestValidationSchema>;

// --- §4: Trattamento del rischio e rischio residuo (Art. 9(2)(d), 9(4)-(5) + Art. 13) ---
export const TreatmentSchema = z.object({
  treatmentOption: z.string().optional(), // Modifica/Evitamento/Condivisione/Ritenzione
  measures: z.array(z.string()).default([]),
  residualRisk: z.string().optional(),
  responsiblePerson: z.string().optional(),
  reviewCycle: z.string().optional(),
});
export type Treatment = z.infer<typeof TreatmentSchema>;

// --- §5: Monitoraggio post-market e drift (Art. 9(2)(c) + Art. 72) ---
export const MonitoringDetailsSchema = z.object({
  monitoringFrequency: z.string().optional(),
  alertThreshold: z.string().optional(),
  postMarketPlan: z.string().optional(),
  psiScore: z.number().optional(),
  driftDetected: z.boolean().optional(),
});
export type MonitoringDetails = z.infer<typeof MonitoringDetailsSchema>;

// --- §6: gap check Art. 9 ---
export const GapCheckSchema = z.object({
  coverageScore: z.number().min(0).max(100).optional(),
  assessment: z.string().optional(),
  missingAreas: z.array(z.object({
    area: z.string(),
    art9Requirement: z.string(),
    suggestedRiskTitle: z.string().optional(),
    priority: z.enum(["obbligatorio", "raccomandato"]),
  })).default([]),
});
export type GapCheck = z.infer<typeof GapCheckSchema>;

// --- §7: Tracciabilità e mantenimento continuo (Art. 9(1)-(2) + Art. 12, 17) ---
export const TraceabilitySchema = z.object({
  versionsTracked: z.number().optional(),
  lastAuditDate: z.string().optional(),
  changes: z.array(z.string()).default([]),
  retentionPolicy: z.string().optional(),
  // integrazione nel sistema di gestione qualità — Art. 17
  qmsIntegration: z.string().optional(),
});
export type Traceability = z.infer<typeof TraceabilitySchema>;

// --- log di revisione (sotto §5/§7) ---
export const ReviewLogEntrySchema = z.object({
  date: z.string(),
  trigger: z.string(),
  outcome: z.string().optional(),
  reviewer: z.string().optional(),
  nextReviewDate: z.string().optional(),
});
export type ReviewLogEntry = z.infer<typeof ReviewLogEntrySchema>;

// --- §8: Dismissione / ritiro (ISO 23894 Annex C) ---
export const DismissalSchema = z.object({
  dismissalRisks: z.string().optional(),
  dataDeletion: z.string().optional(),
  downstreamDependencies: z.string().optional(),
  communicationToDeployers: z.string().optional(),
});
export type Dismissal = z.infer<typeof DismissalSchema>;

// --- §9: sign-off ---
const SignOffRoleSchema = z.object({
  name: z.string().optional(),
  date: z.string().optional(),
  signed: z.boolean().default(false),
});
export const SignOffSchema = z.object({
  riskOwner: SignOffRoleSchema,
  complianceLegal: SignOffRoleSchema,
  legalRepresentative: SignOffRoleSchema,
  // Art. 9(10) — integrazione con altri regimi di risk management
  otherRegimesIntegration: z.string().optional(),
  // hash di versione del documento (fingerprint, livello base SES + audit trail)
  documentHash: z.string().optional(),
});
export type SignOff = z.infer<typeof SignOffSchema>;

// --- Trasversale: Comunicazione e consultazione (ISO 23894 §6.2) ---
export const CommunicationSchema = z.object({
  stakeholdersInvolved: z.string().optional(),
  friaLink: z.string().optional(),
  externalConsultees: z.string().optional(),
  consultationDocumented: z.boolean().optional(),
});
export type Communication = z.infer<typeof CommunicationSchema>;

// --- Documento completo ---
export const RiskRegisterDocumentSchema = z.object({
  identification: SystemIdentificationSchema,
  risks: z.array(RiskRegisterEntrySchema).default([]),
  estimation: EstimationSchema.optional(),
  testValidation: TestValidationSchema.optional(),
  treatment: TreatmentSchema.optional(),
  monitoringDetails: MonitoringDetailsSchema.optional(),
  gapCheck: GapCheckSchema.optional(),
  reviewLog: z.array(ReviewLogEntrySchema).default([]),
  traceability: TraceabilitySchema.optional(),
  dismissal: DismissalSchema.optional(),
  signOff: SignOffSchema.optional(),
  communication: CommunicationSchema.optional(),
});
export type RiskRegisterDocument = z.infer<typeof RiskRegisterDocumentSchema>;
