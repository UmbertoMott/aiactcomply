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
  }).optional(),
  categoricalDistribution: z.array(z.object({
    value: z.string(), count: z.number(), percentage: z.number(),
  })).max(20).optional(),
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
  columns: z.array(ColumnProfileSchema),
  notes: z.string().optional(),
});
export type DatasetProfile = z.infer<typeof DatasetProfileSchema>;

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
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type DataAuditRecord = z.infer<typeof DataAuditRecordSchema>;

const STORAGE_KEY = "aicomply_data_audit_v1";

export function loadDataAuditRecord(): DataAuditRecord {
  if (typeof window === "undefined") return { datasets: [], governancePractices: [], specialCategories: { applicable: "unspecified", flaggedColumns: [], status: "not_documented" }, developmentApproach: "unspecified" };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { datasets: [], governancePractices: [], specialCategories: { applicable: "unspecified", flaggedColumns: [], status: "not_documented" }, developmentApproach: "unspecified" };
  } catch { return { datasets: [], governancePractices: [], specialCategories: { applicable: "unspecified", flaggedColumns: [], status: "not_documented" }, developmentApproach: "unspecified" }; }
}

export function saveDataAuditRecord(record: DataAuditRecord): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...record, updatedAt: new Date().toISOString() }));
}

export function countDocumented(record: DataAuditRecord): number {
  return record.governancePractices.filter(p => p.status === "documented" || p.status === "not_applicable").length;
}
