import { z } from "zod";

export const DeployerApplicabilityFlagsSchema = z.object({
  usesHighRiskSystem: z.boolean().default(false),
  usesInternalProcedures: z.boolean().default(false),
  employeeImpact: z.boolean().default(false),
  biometricCategorization: z.boolean().default(false),
  eudbRequired: z.boolean().default(false),
  rbiApplicable: z.boolean().default(false),
});
export type DeployerApplicabilityFlags = z.infer<typeof DeployerApplicabilityFlagsSchema>;

export const ObligationStatusSchema = z.enum(["not_started", "in_progress", "done", "na"]);
export type ObligationStatus = z.infer<typeof ObligationStatusSchema>;

export const ObligationRecordSchema = z.object({
  obligationId: z.string(),
  status: ObligationStatusSchema.default("not_started"),
  evidenceSummary: z.string().optional(),
  assignee: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  lastUpdated: z.string().optional(),
});
export type ObligationRecord = z.infer<typeof ObligationRecordSchema>;

export const RbiRegistrationSchema = z.object({
  registered: z.boolean().default(false),
  registrationId: z.string().optional(),
  registrationDate: z.string().optional(),
  deadline: z.string().optional(), // ISO date — 48h from deployment start
});
export type RbiRegistration = z.infer<typeof RbiRegistrationSchema>;

export const WorkerNoticeSchema = z.object({
  generated: z.boolean().default(false),
  noticeText: z.string().optional(),
  deliveryMethod: z.string().optional(),
  deliveryDate: z.string().optional(),
  aiDraft: z.boolean().default(false),
});
export type WorkerNotice = z.infer<typeof WorkerNoticeSchema>;

export const DeployerDashboardRecordSchema = z.object({
  systemId: z.string(),
  systemName: z.string(),
  systemTier: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  flags: DeployerApplicabilityFlagsSchema,
  flagsAiAssessed: z.boolean().default(false),
  obligations: z.array(ObligationRecordSchema).default([]),
  workerNotice: WorkerNoticeSchema.optional(),
  rbiRegistration: RbiRegistrationSchema.optional(),
  eudbNote: z.string().optional(),
  overallStatus: z.enum(["pending", "in_progress", "compliant", "attention"]).default("pending"),
});
export type DeployerDashboardRecord = z.infer<typeof DeployerDashboardRecordSchema>;

const STORAGE_KEY = "aicomply_deployer_dashboard_v1";

export function loadDeployerDashboard(): Record<string, DeployerDashboardRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveDeployerDashboard(data: Record<string, DeployerDashboardRecord>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadSystemRecord(systemId: string): DeployerDashboardRecord | null {
  const all = loadDeployerDashboard();
  return all[systemId] ?? null;
}

export function saveSystemRecord(record: DeployerDashboardRecord): void {
  const all = loadDeployerDashboard();
  all[record.systemId] = { ...record, updatedAt: new Date().toISOString() };
  saveDeployerDashboard(all);
}

export function ensureSystemRecord(
  systemId: string,
  systemName: string,
  systemTier?: string
): DeployerDashboardRecord {
  const existing = loadSystemRecord(systemId);
  if (existing) return existing;
  const now = new Date().toISOString();
  const fresh: DeployerDashboardRecord = {
    systemId,
    systemName,
    systemTier,
    createdAt: now,
    updatedAt: now,
    flags: {
      usesHighRiskSystem: false,
      usesInternalProcedures: false,
      employeeImpact: false,
      biometricCategorization: false,
      eudbRequired: false,
      rbiApplicable: false,
    },
    flagsAiAssessed: false,
    obligations: [],
    overallStatus: "pending",
  };
  saveSystemRecord(fresh);
  return fresh;
}

export function computeOverallStatus(
  record: DeployerDashboardRecord
): DeployerDashboardRecord["overallStatus"] {
  const { obligations } = record;
  if (!obligations.length) return "pending";
  const done = obligations.filter((o) => o.status === "done" || o.status === "na").length;
  const attention = obligations.some((o) => o.status === "not_started");
  if (done === obligations.length) return "compliant";
  if (attention) return "attention";
  return "in_progress";
}
