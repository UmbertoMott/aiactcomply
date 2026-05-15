// Data Audit Engine — Art. 10 AI Act Compliance
// Simulates bitemporal bias metrics: OFI, SPD, DI, EOD

export interface AuditDataset {
  id: string;
  name: string;
  source: string;
  rows: number;
  sensitiveFeatures: string[];
  validFrom: Date;
  validTo: Date | null;
}

export interface GroupMetrics {
  group: string;
  size: number;
  selectionRate: number;
  tpr: number; // True Positive Rate
  fpr: number; // False Positive Rate
}

export interface BiasReport {
  ofi: number;   // Objective Fairness Index: B - E
  spd: number;   // Statistical Parity Difference
  di: number;    // Disparate Impact (4/5 rule: alert if < 0.8)
  eod: number;   // Equalized Odds Difference
  groups: GroupMetrics[];
  riskLevel: "low" | "medium" | "high" | "critical";
  ctganRequired: boolean;
  underrepresented: string[]; // groups with selection < 15%
  timestamp: Date;
}

export interface TemporalSnapshot {
  asOf: Date;
  label: string;
  report: BiasReport;
}

export interface ColumnLineage {
  source: string;
  column: string;
  feature: string;
  isProxy: boolean;
  proxyFor?: string;
  influence: number; // 0–1
}

// ─── Datasets ────────────────────────────────────────────────────────────────

export const MOCK_DATASETS: AuditDataset[] = [
  {
    id: "ds_hiring_2024",
    name: "HR Screening Dataset",
    source: "Snowflake.prod / HR_DATA",
    rows: 84320,
    sensitiveFeatures: ["gender", "age_group", "ethnicity", "district"],
    validFrom: new Date("2024-01-15"),
    validTo: null,
  },
  {
    id: "ds_credit_2024",
    name: "Credit Scoring Dataset",
    source: "DB_utenti / financial_history",
    rows: 125000,
    sensitiveFeatures: ["income_bracket", "district", "age_group"],
    validFrom: new Date("2024-03-01"),
    validTo: null,
  },
  {
    id: "ds_medical_2024",
    name: "Medical Triage Dataset",
    source: "DB_clinico / triage_log",
    rows: 43100,
    sensitiveFeatures: ["gender", "age_group", "insurance_tier"],
    validFrom: new Date("2024-06-01"),
    validTo: null,
  },
];

// ─── Bias Calculation ────────────────────────────────────────────────────────

export function calculateBiasReport(
  datasetId: string,
  asOf: Date,
  ctganEnabled: boolean
): BiasReport {
  // Deterministic simulation — varies by dataset + time + CTGAN state
  const isHiring  = datasetId === "ds_hiring_2024";
  const isCredit  = datasetId === "ds_credit_2024";
  const monthIdx  = asOf.getMonth() + (asOf.getFullYear() - 2024) * 12;
  const improvement = Math.min(monthIdx * 0.008, 0.12); // organic improvement over time
  const ctganBoost  = ctganEnabled ? 0.19 : 0;

  const baseSpd = isHiring ? 0.32 : isCredit ? 0.19 : 0.24;
  const baseDi  = isHiring ? 0.61 : isCredit ? 0.78 : 0.71;

  const spd = Math.max(0.01, baseSpd - improvement - ctganBoost * 0.7);
  const di  = Math.min(0.99, baseDi  + improvement + ctganBoost);
  const eod = Math.max(0.01, spd * 0.68 - ctganBoost * 0.5);

  // OFI = B - E  (simplified: benefit gap minus expected benefit gap)
  const benefitGap      = spd * 1.4;
  const expectedGap     = eod * 0.9;
  const ofi             = Math.max(0, benefitGap - expectedGap);

  // Group metrics
  const womenBoost = ctganEnabled ? 0.16 : 0;
  const over50Boost = ctganEnabled ? 0.09 : 0;

  const groups: GroupMetrics[] = [
    {
      group: "Donne",
      size: ctganEnabled ? Math.round(84320 * 0.37) : Math.round(84320 * 0.22),
      selectionRate: +(0.22 + womenBoost).toFixed(2),
      tpr: +(0.61 + womenBoost * 1.1).toFixed(2),
      fpr: 0.12,
    },
    {
      group: "Uomini",
      size: Math.round(84320 * 0.50),
      selectionRate: 0.41,
      tpr: 0.85,
      fpr: 0.11,
    },
    {
      group: "Over 50",
      size: Math.round(84320 * 0.14),
      selectionRate: +(0.27 + over50Boost).toFixed(2),
      tpr: +(0.58 + over50Boost).toFixed(2),
      fpr: 0.14,
    },
    {
      group: "Under 30",
      size: Math.round(84320 * 0.14),
      selectionRate: 0.39,
      tpr: 0.82,
      fpr: 0.10,
    },
  ];

  const underrepresented = groups
    .filter((g) => g.selectionRate < 0.15)
    .map((g) => g.group);

  const riskLevel: BiasReport["riskLevel"] =
    di < 0.7  ? "critical" :
    di < 0.8  ? "high"     :
    di < 0.9  ? "medium"   : "low";

  return { ofi, spd, di, eod, groups, riskLevel, ctganRequired: di < 0.8, underrepresented, timestamp: asOf };
}

// ─── Temporal Snapshots ───────────────────────────────────────────────────────

export function getTemporalSnapshots(datasetId: string): TemporalSnapshot[] {
  return [
    { asOf: new Date("2024-01-15"), label: "Gen 2024" },
    { asOf: new Date("2024-04-01"), label: "Apr 2024" },
    { asOf: new Date("2024-07-01"), label: "Lug 2024" },
    { asOf: new Date("2024-10-01"), label: "Ott 2024" },
    { asOf: new Date("2025-01-01"), label: "Gen 2025" },
    { asOf: new Date("2025-05-01"), label: "Mag 2025" },
  ].map(({ asOf, label }) => ({
    asOf,
    label,
    report: calculateBiasReport(datasetId, asOf, false),
  }));
}

// ─── Column Lineage ───────────────────────────────────────────────────────────

export const COLUMN_LINEAGE: ColumnLineage[] = [
  { source: "DB_utenti",     column: "cap_residenza", feature: "district",       isProxy: true,  proxyFor: "etnia",   influence: 0.67 },
  { source: "Snowflake.prod",column: "cod_settore",   feature: "sector",         isProxy: true,  proxyFor: "genere",  influence: 0.52 },
  { source: "DB_utenti",     column: "reddito",       feature: "income_bracket", isProxy: false,                       influence: 0.45 },
  { source: "DB_storico",    column: "esito_prec",    feature: "prev_outcome",   isProxy: false,                       influence: 0.38 },
  { source: "DB_utenti",     column: "eta",           feature: "age_group",      isProxy: false,                       influence: 0.23 },
];

// ─── Risk helpers ─────────────────────────────────────────────────────────────

export const RISK_COLORS: Record<BiasReport["riskLevel"], { bg: string; text: string; border: string }> = {
  critical: { bg: "rgba(220,38,38,0.15)",  text: "#fca5a5", border: "rgba(220,38,38,0.4)" },
  high:     { bg: "rgba(234,88,12,0.15)",  text: "#fdba74", border: "rgba(234,88,12,0.4)" },
  medium:   { bg: "rgba(202,138,4,0.15)",  text: "#fde047", border: "rgba(202,138,4,0.4)"  },
  low:      { bg: "rgba(22,163,74,0.15)",  text: "#86efac", border: "rgba(22,163,74,0.4)"  },
};
