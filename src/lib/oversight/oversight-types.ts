import { z } from "zod";

export const MeasureImplementationTypeEnum = z.enum([
  "provider_built_in",
  "deployer_implemented",
  "both",
  "not_specified",
]);
export type MeasureImplementationType = z.infer<typeof MeasureImplementationTypeEnum>;

export const OversightRequirementStatusEnum = z.enum([
  "not_started",
  "in_progress",
  "implemented",
]);
export type OversightRequirementStatus = z.infer<typeof OversightRequirementStatusEnum>;

export const OversightRequirementRecordSchema = z.object({
  requirementId: z.string(),
  implementationType: MeasureImplementationTypeEnum.default("not_specified"),
  measureDescription: z.string().optional(),
  evidenceLinkedRecordId: z.string().optional(),
  status: OversightRequirementStatusEnum.default("not_started"),
  aiConfirmed: z.boolean().default(false),
  lastUpdated: z.string().optional(),
});
export type OversightRequirementRecord = z.infer<typeof OversightRequirementRecordSchema>;

export const FourEyesRecordSchema = z.object({
  applicable: z.enum(["yes", "no", "unspecified"]).default("unspecified"),
  procedureDescription: z.string().optional(),
  verifierRoles: z.array(z.string()).default([]),
  status: OversightRequirementStatusEnum.default("not_started"),
  aiConfirmed: z.boolean().default(false),
});
export type FourEyesRecord = z.infer<typeof FourEyesRecordSchema>;

export const OversightRecordSchema = z.object({
  systemId: z.string().optional(),
  requirements: z.array(OversightRequirementRecordSchema).default([]),
  fourEyes: FourEyesRecordSchema.default({ applicable: "unspecified", verifierRoles: [], status: "not_started", aiConfirmed: false }),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type OversightRecord = z.infer<typeof OversightRecordSchema>;

// Legacy Friction Gate event (preserved from original tool)
export interface FrictionEvent {
  id: string;
  type: "approved" | "friction_bypassed" | "blocked";
  timestamp: string;
  elapsed: number;
  reason?: string;
}

const STORAGE_KEY = "aicomply_oversight_record_v1";
export const EVENTS_KEY = "oversight_events"; // legacy key, kept for backward compat
export const SUSPEND_KEY = "oversight_suspended"; // legacy key, kept for backward compat

export function loadOversightRecord(): OversightRecord {
  if (typeof window === "undefined") return { requirements: [], fourEyes: { applicable: "unspecified", verifierRoles: [], status: "not_started", aiConfirmed: false } };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { requirements: [], fourEyes: { applicable: "unspecified", verifierRoles: [], status: "not_started", aiConfirmed: false } };
    return JSON.parse(raw) as OversightRecord;
  } catch {
    return { requirements: [], fourEyes: { applicable: "unspecified", verifierRoles: [], status: "not_started", aiConfirmed: false } };
  }
}

export function saveOversightRecord(record: OversightRecord): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...record, updatedAt: new Date().toISOString() }));
}

export function loadFrictionEvents(): FrictionEvent[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(EVENTS_KEY) ?? "[]") as FrictionEvent[]; }
  catch { return []; }
}

export function saveFrictionEvents(events: FrictionEvent[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
}

export function getSystemSuspended(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SUSPEND_KEY) === "1";
}

export function setSystemSuspendedStorage(suspended: boolean): void {
  if (typeof window === "undefined") return;
  if (suspended) localStorage.setItem(SUSPEND_KEY, "1");
  else localStorage.removeItem(SUSPEND_KEY);
}

export function countImplemented(record: OversightRecord): number {
  return record.requirements.filter((r) => r.status === "implemented").length;
}
