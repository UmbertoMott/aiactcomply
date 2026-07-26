import { z } from "zod";

// ── Import di risultati di test esterni (§2) ────────────────────────────────
export const EvalKindEnum = z.enum(["accuracy", "robustness", "redteam"]);
export type EvalKind = z.infer<typeof EvalKindEnum>;

export const ImportedEvalSetSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  kind: EvalKindEnum,
  rowCount: z.number(),
  detectedFields: z.array(z.string()),
  analyzedAt: z.string(),
  fingerprint: z.string().optional(),
});
export type ImportedEvalSet = z.infer<typeof ImportedEvalSetSchema>;

// ── Accuratezza dichiarata (§3, Art. 15(3)) ─────────────────────────────────
export const AccuracyMetricSchema = z.object({
  metric: z.string(),             // accuracy, precision, recall, F1, AUROC…
  value: z.number(),
  declaredInInstructions: z.enum(["yes", "no", "unspecified"]).default("unspecified"), // Art. 13(3)(b)
  source: z.enum(["manual", "imported"]).default("manual"),
});
export type AccuracyMetric = z.infer<typeof AccuracyMetricSchema>;

// ── Metriche per sotto-popolazione (§4) ─────────────────────────────────────
export const SubPopulationMetricSchema = z.object({
  metric: z.string(),
  overall: z.number(),
  byGroup: z.array(z.object({ group: z.string(), value: z.number(), sampleSize: z.number().optional() })),
  maxGap: z.number(),
  verdict: z.enum(["ok", "review", "critical"]),
  dimension: z.string().optional(), // colonna gruppo usata
});
export type SubPopulationMetric = z.infer<typeof SubPopulationMetricSchema>;

// ── Matrice minacce prEN 18282 (§5) ─────────────────────────────────────────
export const ThreatCoverageSchema = z.object({
  threatId: z.string(),
  status: z.enum(["tested_mitigated", "tested_gap", "not_assessed"]).default("not_assessed"),
  evidenceEvalSetId: z.string().optional(),
  attackSuccessRate: z.number().optional(),
  mitigation: z.string().optional(),
  aiConfirmed: z.boolean().default(false),
});
export type ThreatCoverage = z.infer<typeof ThreatCoverageSchema>;

// ── Robustezza operativa (§6, Art. 15(4)) ───────────────────────────────────
export const RobustnessRecordSchema = z.object({
  itemId: z.string(),
  status: z.enum(["documented", "gap", "unspecified"]).default("unspecified"),
  notes: z.string().optional(),
});
export type RobustnessRecord = z.infer<typeof RobustnessRecordSchema>;

// ── Record complessivo ──────────────────────────────────────────────────────
export const ResilienceRecordSchema = z.object({
  systemId: z.string().optional(),
  isGenerative: z.enum(["yes", "no", "unspecified"]).default("unspecified"),
  evalSets: z.array(ImportedEvalSetSchema).default([]),
  accuracy: z.array(AccuracyMetricSchema).default([]),
  subPopulation: z.array(SubPopulationMetricSchema).default([]),
  threats: z.array(ThreatCoverageSchema).default([]),
  robustness: z.array(RobustnessRecordSchema).default([]),
  gapThreshold: z.number().default(0.05),
  fingerprint: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type ResilienceRecord = z.infer<typeof ResilienceRecordSchema>;

const STORAGE_KEY = "aicomply_resilience_record_v1";

function empty(): ResilienceRecord {
  return { isGenerative: "unspecified", evalSets: [], accuracy: [], subPopulation: [], threats: [], robustness: [], gapThreshold: 0.05 };
}

export function loadResilienceRecord(): ResilienceRecord {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...empty(), ...JSON.parse(raw) } : empty();
  } catch { return empty(); }
}

export function saveResilienceRecord(record: ResilienceRecord): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...record, updatedAt: new Date().toISOString() }));
}

// ── Riuso gruppi protetti confermati in Data Audit (§4 coerenza cross-tool) ──
export function getDataAuditConfirmedGroups(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("aicomply_data_audit_v1");
    if (!raw) return [];
    const rec = JSON.parse(raw);
    const cols = new Set<string>();
    for (const ds of rec.datasets ?? []) {
      for (const c of ds.columns ?? []) {
        if (c.sensitiveFlagConfirmed) cols.add(c.name);
      }
    }
    return [...cols];
  } catch { return []; }
}
