// Tipi del Registro dei Rischi — trasposizione 1:1 delle sezioni 3, 5, 6, 7, 8
// del template Registro_Rischi_Template_AI_Act_Art9.docx (Art. 9 EU AI Act).
import { z } from "zod";

export const VERIFY_NOTE_IT = "[verificare sul testo AI Act vigente]";
export const VERIFY_NOTE_EN = "[verify against current AI Act text]";

// --- Sezione 3 del template: Identificazione sistema ---
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
});
export type SystemIdentification = z.infer<typeof SystemIdentificationSchema>;

// --- Sezione 5 del template: voce del registro rischi ---
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

// --- Sezione 6 del template: gap check Art. 9 ---
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

// --- Sezione 7 del template: log di revisione ---
export const ReviewLogEntrySchema = z.object({
  date: z.string(),
  trigger: z.string(),
  outcome: z.string().optional(),
  reviewer: z.string().optional(),
  nextReviewDate: z.string().optional(),
});
export type ReviewLogEntry = z.infer<typeof ReviewLogEntrySchema>;

// --- Sezione 8 del template: sign-off ---
const SignOffRoleSchema = z.object({
  name: z.string().optional(),
  date: z.string().optional(),
  signed: z.boolean().default(false),
});
export const SignOffSchema = z.object({
  riskOwner: SignOffRoleSchema,
  complianceLegal: SignOffRoleSchema,
  legalRepresentative: SignOffRoleSchema,
});
export type SignOff = z.infer<typeof SignOffSchema>;

// --- Documento completo ---
export const RiskRegisterDocumentSchema = z.object({
  identification: SystemIdentificationSchema,
  risks: z.array(RiskRegisterEntrySchema).default([]),
  gapCheck: GapCheckSchema.optional(),
  reviewLog: z.array(ReviewLogEntrySchema).default([]),
  signOff: SignOffSchema.optional(),
});
export type RiskRegisterDocument = z.infer<typeof RiskRegisterDocumentSchema>;
