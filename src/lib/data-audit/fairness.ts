// Fairness metrics (Art. 10(2)(f) · ISO/IEC TR 24027) e rappresentatività
// (Art. 10(3)). Funzioni pure che operano sulle righe in memoria nel browser —
// nessuna riga grezza viene mai persistita o inviata al server.
import type { FairnessReport, RepresentativenessCheck } from "./data-audit-types";

export type Row = Record<string, string>;

export const MIN_CELL = 30; // campione minimo per cella intersezionale

// Soglie di rischio — verificabili dal legale, centralizzate qui.
export const FAIRNESS_THRESHOLDS = {
  critical: { di: 0.6,  spd: 0.25 },
  high:     { di: 0.8,  spd: 0.15 },
  medium:   { di: 0.9,  spd: 0.10 },
} as const;

const norm = (v: string | undefined) => (v ?? "").trim();
const MISSING = new Set(["", "na", "n/a", "null", "none", "-", "nan", "undefined"]);
const present = (v: string | undefined) => !MISSING.has(norm(v).toLowerCase());

function riskLevel(di: number, spd: number): FairnessReport["riskLevel"] {
  if (di < FAIRNESS_THRESHOLDS.critical.di || spd > FAIRNESS_THRESHOLDS.critical.spd) return "critical";
  if (di < FAIRNESS_THRESHOLDS.high.di     || spd > FAIRNESS_THRESHOLDS.high.spd)     return "high";
  if (di < FAIRNESS_THRESHOLDS.medium.di   || spd > FAIRNESS_THRESHOLDS.medium.spd)   return "medium";
  return "low";
}

export interface FairnessParams {
  datasetId: string;
  protectedColumn: string;
  outcomeColumn: string;
  positiveOutcomeValue: string;
  groundTruthColumn?: string;
  protectedColumn2?: string; // analisi intersezionale
}

export function computeFairness(rows: Row[], p: FairnessParams): FairnessReport {
  const pos = norm(p.positiveOutcomeValue).toLowerCase();
  const isPos = (r: Row) => norm(r[p.outcomeColumn]).toLowerCase() === pos;
  const groundTruthAvailable = !!p.groundTruthColumn;
  const isActualPos = (r: Row) => groundTruthAvailable && norm(r[p.groundTruthColumn!]).toLowerCase() === pos;

  // Raggruppa per colonna protetta (righe con valore presente)
  const byGroup = new Map<string, Row[]>();
  for (const r of rows) {
    if (!present(r[p.protectedColumn])) continue;
    const g = norm(r[p.protectedColumn]);
    (byGroup.get(g) ?? byGroup.set(g, []).get(g)!).push(r);
  }

  const groups = [...byGroup.entries()].map(([group, gr]) => {
    const size = gr.length;
    const selectionRate = size > 0 ? gr.filter(isPos).length / size : 0;
    let tpr: number | undefined;
    let fpr: number | undefined;
    if (groundTruthAvailable) {
      const actualPos = gr.filter(isActualPos);
      const actualNeg = gr.filter(r => !isActualPos(r));
      tpr = actualPos.length > 0 ? actualPos.filter(isPos).length / actualPos.length : undefined;
      fpr = actualNeg.length > 0 ? actualNeg.filter(isPos).length / actualNeg.length : undefined;
    }
    return { group, size, selectionRate: +selectionRate.toFixed(4), tpr: round(tpr), fpr: round(fpr) };
  }).sort((a, b) => b.selectionRate - a.selectionRate);

  const rates = groups.map(g => g.selectionRate);
  const maxRate = Math.max(...rates, 0);
  const minRate = Math.min(...rates, maxRate);
  const spd = +(maxRate - minRate).toFixed(4);
  const di = maxRate > 0 ? +(minRate / maxRate).toFixed(4) : 1;

  // Equal opportunity / equalized odds (solo con ground truth)
  let equalOpportunityDiff: number | undefined;
  let equalizedOddsDiff: number | undefined;
  if (groundTruthAvailable) {
    const tprs = groups.map(g => g.tpr).filter((x): x is number => x !== undefined);
    const fprs = groups.map(g => g.fpr).filter((x): x is number => x !== undefined);
    if (tprs.length >= 2) {
      const dTpr = Math.max(...tprs) - Math.min(...tprs);
      equalOpportunityDiff = +dTpr.toFixed(4);
      const dFpr = fprs.length >= 2 ? Math.max(...fprs) - Math.min(...fprs) : 0;
      equalizedOddsDiff = +Math.max(dTpr, dFpr).toFixed(4);
    }
  }

  // Intersezionale (2 vie)
  let intersectional: FairnessReport["intersectional"];
  let intersectionalSpd: number | undefined;
  let intersectionalDi: number | undefined;
  if (p.protectedColumn2) {
    const byCell = new Map<string, Row[]>();
    for (const r of rows) {
      if (!present(r[p.protectedColumn]) || !present(r[p.protectedColumn2])) continue;
      const key = `${norm(r[p.protectedColumn])} × ${norm(r[p.protectedColumn2])}`;
      (byCell.get(key) ?? byCell.set(key, []).get(key)!).push(r);
    }
    intersectional = [...byCell.entries()].map(([cell, gr]) => ({
      cell, size: gr.length,
      selectionRate: gr.length > 0 ? +(gr.filter(isPos).length / gr.length).toFixed(4) : 0,
      sufficient: gr.length >= MIN_CELL,
    })).sort((a, b) => b.selectionRate - a.selectionRate);
    const suff = intersectional.filter(c => c.sufficient).map(c => c.selectionRate);
    if (suff.length >= 2) {
      const mx = Math.max(...suff), mn = Math.min(...suff);
      intersectionalSpd = +(mx - mn).toFixed(4);
      intersectionalDi = mx > 0 ? +(mn / mx).toFixed(4) : 1;
    }
  }

  return {
    datasetId: p.datasetId,
    protectedColumn: p.protectedColumn,
    outcomeColumn: p.outcomeColumn,
    positiveOutcomeValue: p.positiveOutcomeValue,
    groundTruthColumn: p.groundTruthColumn,
    groundTruthAvailable,
    groups,
    referenceGroup: groups[0]?.group ?? "—",
    statisticalParityDiff: spd,
    disparateImpactRatio: di,
    fourFifthsPass: di >= 0.8,
    equalOpportunityDiff,
    equalizedOddsDiff,
    riskLevel: riskLevel(di, spd),
    intersectional,
    intersectionalSpd,
    intersectionalDi,
  };
}

function round(x: number | undefined): number | undefined {
  return x === undefined ? undefined : +x.toFixed(4);
}

// ── Rappresentatività vs popolazione di riferimento (Art. 10(3)) ────────────

export function computeRepresentativeness(
  rows: Row[],
  column: string,
  reference: { group: string; expectedPct: number }[],
  referenceSource?: string,
): RepresentativenessCheck {
  // Distribuzione osservata (righe con valore presente)
  const counts = new Map<string, number>();
  let total = 0;
  for (const r of rows) {
    if (!present(r[column])) continue;
    const g = norm(r[column]);
    counts.set(g, (counts.get(g) ?? 0) + 1);
    total++;
  }
  const observed = [...counts.entries()].map(([group, c]) => ({
    group, observedPct: total > 0 ? +(c / total * 100).toFixed(2) : 0,
  })).sort((a, b) => b.observedPct - a.observedPct);

  if (reference.length === 0) {
    return {
      datasetId: "", column, reference: [], observed,
      perGroupGap: [], totalVariationDistance: 0, verdict: "no_reference", referenceSource,
    };
  }

  const obsMap = new Map(observed.map(o => [o.group.toLowerCase(), o.observedPct]));
  const refMap = new Map(reference.map(r => [r.group.toLowerCase(), r.expectedPct]));
  const allGroups = new Set([...obsMap.keys(), ...refMap.keys()]);

  let tvdSum = 0;
  const perGroupGap: { group: string; gapPct: number }[] = [];
  for (const g of allGroups) {
    const o = obsMap.get(g) ?? 0;
    const e = refMap.get(g) ?? 0;
    tvdSum += Math.abs(o - e);
    const label = reference.find(r => r.group.toLowerCase() === g)?.group
      ?? observed.find(x => x.group.toLowerCase() === g)?.group ?? g;
    perGroupGap.push({ group: label, gapPct: +Math.abs(o - e).toFixed(2) });
  }
  const totalVariationDistance = +((0.5 * tvdSum) / 100).toFixed(4); // in [0,1]

  const verdict: RepresentativenessCheck["verdict"] =
    totalVariationDistance < 0.05 ? "representative"
    : totalVariationDistance <= 0.15 ? "review"
    : "not_representative";

  return {
    datasetId: "", column, reference, observed,
    perGroupGap: perGroupGap.sort((a, b) => b.gapPct - a.gapPct),
    totalVariationDistance, verdict, referenceSource,
  };
}
