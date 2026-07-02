import { z } from "zod";

export const LogFormatEnum = z.enum(["json", "ndjson", "csv"]);
export type LogFormat = z.infer<typeof LogFormatEnum>;

export const CoverageStatusEnum = z.enum(["yes", "partial", "no", "unspecified"]);
export type CoverageStatus = z.infer<typeof CoverageStatusEnum>;

export const TraceabilityCoverageRecordSchema = z.object({
  purposeId: z.string(),
  covered: CoverageStatusEnum.default("unspecified"),
  evidenceFields: z.array(z.string()).default([]),
  notes: z.string().optional(),
  aiConfirmed: z.boolean().default(false),
});
export type TraceabilityCoverageRecord = z.infer<typeof TraceabilityCoverageRecordSchema>;

export const ImportedLogSetSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  format: LogFormatEnum,
  uploadedAt: z.string(),
  entryCount: z.number(),
  dateRangeStart: z.string().optional(),
  dateRangeEnd: z.string().optional(),
  detectedFields: z.array(z.string()),
  notes: z.string().optional(),
});
export type ImportedLogSet = z.infer<typeof ImportedLogSetSchema>;

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
  retentionNotes: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type LogVaultRecord = z.infer<typeof LogVaultRecordSchema>;

const STORAGE_KEY = "aicomply_logvault_record_v1";

export function loadLogVaultRecord(): LogVaultRecord {
  if (typeof window === "undefined") {
    return { loggingCapabilityConfirmed: "unspecified", importedLogSets: [], traceabilityCoverage: [], biometricLogging: { applicable: "unspecified", requirementCoverage: [] } };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { loggingCapabilityConfirmed: "unspecified", importedLogSets: [], traceabilityCoverage: [], biometricLogging: { applicable: "unspecified", requirementCoverage: [] } };
    return JSON.parse(raw);
  } catch {
    return { loggingCapabilityConfirmed: "unspecified", importedLogSets: [], traceabilityCoverage: [], biometricLogging: { applicable: "unspecified", requirementCoverage: [] } };
  }
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
