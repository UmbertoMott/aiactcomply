import { z } from "zod";

export const LogFormatEnum = z.enum(["json", "ndjson", "csv"]);
export type LogFormat = z.infer<typeof LogFormatEnum>;

export const CoverageStatusEnum = z.enum(["yes", "partial", "no", "unspecified"]);
export type CoverageStatus = z.infer<typeof CoverageStatusEnum>;

export const TraceabilityCoverageRecordSchema = z.object({
  purposeId: z.string(),
  covered: CoverageStatusEnum.default("unspecified"),
  evidenceFields: z.array(z.string()).default([]),
  coveragePct: z.number().optional(),   // §3 miglior fill-rate tra i campi mappati
  notes: z.string().optional(),
  aiConfirmed: z.boolean().default(false),
});
export type TraceabilityCoverageRecord = z.infer<typeof TraceabilityCoverageRecordSchema>;

// ── §4 Qualità & continuità (ISO/IEC 42001 A.9 / 27001 A.8.15) ──────
export const LogQualityFindingsSchema = z.object({
  timestampValidPct: z.number(),
  outOfOrderCount: z.number(),
  chronologicalGaps: z.array(z.object({ start: z.string(), end: z.string(), durationHours: z.number() })).default([]),
  duplicateCount: z.number(),
  overallFieldFillRate: z.number(),
});
export type LogQualityFindings = z.infer<typeof LogQualityFindingsSchema>;

// ── §6 Verifica hash-chain (ISO/IEC 27037) ─────────────────────────
export const HashChainResultSchema = z.object({
  status: z.enum(["verified", "broken", "no_integrity_fields"]),
  brokenAtEntry: z.number().optional(),
  checkedCount: z.number().default(0),
  detectedFields: z.object({ hash: z.string().optional(), prevHash: z.string().optional(), sequence: z.string().optional() }).optional(),
});
export type HashChainResult = z.infer<typeof HashChainResultSchema>;

export const ImportedLogSetSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  format: LogFormatEnum,
  uploadedAt: z.string(),
  entryCount: z.number(),
  dateRangeStart: z.string().optional(),
  dateRangeEnd: z.string().optional(),
  detectedFields: z.array(z.string()),
  fieldFillRates: z.array(z.object({ field: z.string(), fillRate: z.number() })).default([]),
  qualityFindings: LogQualityFindingsSchema.optional(),
  integrity: HashChainResultSchema.optional(),
  fingerprint: z.string().optional(),
  analyzedAt: z.string().optional(),
  sampledFrom: z.number().optional(),
  notes: z.string().optional(),
});
export type ImportedLogSet = z.infer<typeof ImportedLogSetSchema>;

// ── §5 Ritenzione calcolata (Art. 26(6) / Art. 12) ─────────────────
export const RetentionAssessmentSchema = z.object({
  role: z.enum(["provider", "deployer", "unspecified"]).default("unspecified"),
  retentionPolicyMonths: z.number().optional(),
  retentionSpanMonths: z.number().optional(),
  verdict: z.enum(["pass", "below_minimum", "policy_below_span", "unknown"]).default("unknown"),
  notes: z.string().optional(),
});
export type RetentionAssessment = z.infer<typeof RetentionAssessmentSchema>;

export const BiometricLogRequirementCoverageSchema = z.object({
  requirementId: z.string(),
  covered: CoverageStatusEnum.default("unspecified"),
  evidenceField: z.string().optional(),
  aiConfirmed: z.boolean().default(false),
});
export type BiometricLogRequirementCoverage = z.infer<typeof BiometricLogRequirementCoverageSchema>;

export const BiometricLoggingAssessmentSchema = z.object({
  applicable: z.enum(["yes", "no", "unspecified"]).default("unspecified"),
  requirementCoverage: z.array(BiometricLogRequirementCoverageSchema).default([]),
});
export type BiometricLoggingAssessment = z.infer<typeof BiometricLoggingAssessmentSchema>;

export const LogVaultRecordSchema = z.object({
  systemId: z.string().optional(),
  loggingCapabilityConfirmed: z.enum(["yes", "no", "unspecified"]).default("unspecified"),
  importedLogSets: z.array(ImportedLogSetSchema).default([]),
  traceabilityCoverage: z.array(TraceabilityCoverageRecordSchema).default([]),
  biometricLogging: BiometricLoggingAssessmentSchema.default({ applicable: "unspecified", requirementCoverage: [] }),
  retention: RetentionAssessmentSchema.default({ role: "unspecified", verdict: "unknown" }),
  retentionNotes: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type LogVaultRecord = z.infer<typeof LogVaultRecordSchema>;

const STORAGE_KEY = "aicomply_logvault_record_v1";

const DEFAULT_LOGVAULT: LogVaultRecord = {
  loggingCapabilityConfirmed: "unspecified",
  importedLogSets: [],
  traceabilityCoverage: [],
  biometricLogging: { applicable: "unspecified", requirementCoverage: [] },
  retention: { role: "unspecified", verdict: "unknown" },
};

export function loadLogVaultRecord(): LogVaultRecord {
  if (typeof window === "undefined") return DEFAULT_LOGVAULT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LOGVAULT;
    // Fonde i default: retrocompatibile con record salvati prima dell'aggiunta di `retention`.
    return { ...DEFAULT_LOGVAULT, ...JSON.parse(raw) };
  } catch { return DEFAULT_LOGVAULT; }
}

export function saveLogVaultRecord(record: LogVaultRecord): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...record, updatedAt: new Date().toISOString() }));
}

// Parse aggregated fields from all imported log sets
export function getAllDetectedFields(record: LogVaultRecord): string[] {
  const fields = new Set<string>();
  for (const ls of record.importedLogSets) {
    for (const f of ls.detectedFields) fields.add(f);
  }
  return Array.from(fields);
}

export function countCovered(record: LogVaultRecord): number {
  return record.traceabilityCoverage.filter(c => c.covered === "yes" || c.covered === "partial").length;
}
