import { z } from "zod";

export const DatasetRoleEnum = z.enum(["training", "validation", "testing"]);
export type DatasetRole = z.infer<typeof DatasetRoleEnum>;

export const ColumnTypeEnum = z.enum(["numeric", "categorical", "datetime", "boolean", "text", "unknown"]);
export type ColumnType = z.infer<typeof ColumnTypeEnum>;

export const ColumnProfileSchema = z.object({
  name: z.string(),
  inferredType: ColumnTypeEnum,
  missingCount: z.number(),
  missingPercentage: z.number(),
  uniqueValueCount: z.number().optional(),
  numericStats: z.object({
    min: z.number(), max: z.number(), mean: z.number(), median: z.number(), stdDev: z.number(),
    outlierCount: z.number().default(0),   // |z| > 3  (accuracy/consistency — ISO/IEC 5259)
  }).optional(),
  categoricalDistribution: z.array(z.object({
    value: z.string(), count: z.number(), percentage: z.number(),
  })).max(20).optional(),
  typeErrorCount: z.number().default(0),   // valori non conformi al tipo inferito (consistency)
  flaggedAsSensitive: z.boolean().default(false),
  sensitiveCategoryGuess: z.string().optional(),
  sensitiveFlagConfirmed: z.boolean().default(false),
});
export type ColumnProfile = z.infer<typeof ColumnProfileSchema>;

export const DatasetProfileSchema = z.object({
  id: z.string(),
  role: DatasetRoleEnum,
  fileName: z.string(),
  uploadedAt: z.string(),
  rowCount: z.number(),
  columnCount: z.number(),
  overallMissingPercentage: z.number(),
  duplicateRowCount: z.number().default(0),        // completeness/uniqueness (ISO/IEC 5259)
  columns: z.array(ColumnProfileSchema),
  fingerprint: z.string().optional(),              // sha256 di schema+statistiche (§7)
  analyzedAt: z.string().optional(),               // ISO datetime dell'analisi
  sampledFrom: z.number().optional(),              // righe totali se campionato (> MAX_ROWS)
  droppedRowCount: z.number().optional(),          // righe malformate scartate dal parser
  notes: z.string().optional(),
});
export type DatasetProfile = z.infer<typeof DatasetProfileSchema>;

// ── Data Quality Scorecard (ISO/IEC 5259 [verify]) ──────────────────────────
export interface DataQualityScorecard {
  completeness: number;   // 100 − overallMissingPct
  uniqueness: number;     // 100 − %duplicati
  consistency: number;    // 100 − %type-error medio
}

// ── Fairness (Art. 10(2)(f) · ISO/IEC TR 24027 [verify]) ────────────────────
export const FairnessReportSchema = z.object({
  datasetId: z.string(),
  protectedColumn: z.string(),
  outcomeColumn: z.string(),
  positiveOutcomeValue: z.string(),
  groundTruthColumn: z.string().optional(),
  groundTruthAvailable: z.boolean(),
  groups: z.array(z.object({
    group: z.string(), size: z.number(), selectionRate: z.number(),
    tpr: z.number().optional(), fpr: z.number().optional(),
  })),
  referenceGroup: z.string(),
  statisticalParityDiff: z.number(),
  disparateImpactRatio: z.number(),
  fourFifthsPass: z.boolean(),
  equalOpportunityDiff: z.number().optional(),
  equalizedOddsDiff: z.number().optional(),
  riskLevel: z.enum(["low", "medium", "high", "critical"]),
  intersectional: z.array(z.object({
    cell: z.string(), size: z.number(), selectionRate: z.number(), sufficient: z.boolean(),
  })).optional(),
  intersectionalSpd: z.number().optional(),
  intersectionalDi: z.number().optional(),
});
export type FairnessReport = z.infer<typeof FairnessReportSchema>;

// ── Rappresentatività (Art. 10(3) · TVD) ────────────────────────────────────
export const RepresentativenessCheckSchema = z.object({
  datasetId: z.string(),
  column: z.string(),
  reference: z.array(z.object({ group: z.string(), expectedPct: z.number() })),
  observed: z.array(z.object({ group: z.string(), observedPct: z.number() })),
  perGroupGap: z.array(z.object({ group: z.string(), gapPct: z.number() })),
  totalVariationDistance: z.number(),
  verdict: z.enum(["representative", "review", "not_representative", "no_reference"]),
  referenceSource: z.string().optional(),
});
export type RepresentativenessCheck = z.infer<typeof RepresentativenessCheckSchema>;

export const PracticeStatusEnum = z.enum(["not_documented", "in_progress", "documented", "not_applicable"]);
export type PracticeStatus = z.infer<typeof PracticeStatusEnum>;

export const GovernancePracticeRecordSchema = z.object({
  practiceId: z.string(),
  status: PracticeStatusEnum.default("not_documented"),
  documentation: z.string().optional(),
  aiConfirmed: z.boolean().default(false),
});
export type GovernancePracticeRecord = z.infer<typeof GovernancePracticeRecordSchema>;

export const SpecialCategoriesAssessmentSchema = z.object({
  applicable: z.enum(["yes", "no", "unspecified"]).default("unspecified"),
  flaggedColumns: z.array(z.string()).default([]),
  legalBasisDocumentation: z.string().optional(),
  linkedDpiaRecordId: z.string().optional(),
  status: PracticeStatusEnum.default("not_documented"),
});
export type SpecialCategoriesAssessment = z.infer<typeof SpecialCategoriesAssessmentSchema>;

export const DataAuditRecordSchema = z.object({
  systemId: z.string().optional(),
  developmentApproach: z.enum(["trained_model", "other_technique", "unspecified"]).default("unspecified"),
  datasets: z.array(DatasetProfileSchema).default([]),
  governancePractices: z.array(GovernancePracticeRecordSchema).default([]),
  specialCategories: SpecialCategoriesAssessmentSchema.default({ applicable: "unspecified", flaggedColumns: [], status: "not_documented" }),
  fairnessReports: z.array(FairnessReportSchema).default([]),
  representativenessChecks: z.array(RepresentativenessCheckSchema).default([]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type DataAuditRecord = z.infer<typeof DataAuditRecordSchema>;

const STORAGE_KEY = "aicomply_data_audit_v1";

export function loadDataAuditRecord(): DataAuditRecord {
  if (typeof window === "undefined") return { datasets: [], governancePractices: [], specialCategories: { applicable: "unspecified", flaggedColumns: [], status: "not_documented" }, fairnessReports: [], representativenessChecks: [], developmentApproach: "unspecified" };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { datasets: [], governancePractices: [], specialCategories: { applicable: "unspecified", flaggedColumns: [], status: "not_documented" }, fairnessReports: [], representativenessChecks: [], developmentApproach: "unspecified" };
  } catch { return { datasets: [], governancePractices: [], specialCategories: { applicable: "unspecified", flaggedColumns: [], status: "not_documented" }, fairnessReports: [], representativenessChecks: [], developmentApproach: "unspecified" }; }
}

export function saveDataAuditRecord(record: DataAuditRecord): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...record, updatedAt: new Date().toISOString() }));
}

export function countDocumented(record: DataAuditRecord): number {
  return record.governancePractices.filter(p => p.status === "documented" || p.status === "not_applicable").length;
}
