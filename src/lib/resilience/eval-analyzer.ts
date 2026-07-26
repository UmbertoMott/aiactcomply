// Resilience — import e analisi di risultati di test esterni (red-team / eval).
// Client-side, funzioni pure. Nessun artefatto grezzo (dataset/pesi/prompt) persistito:
// solo metriche aggregate. Resilience NON esegue attacchi, li struttura come evidenza.
import Papa from "papaparse";
import type { SubPopulationMetric, ResilienceRecord } from "./resilience-types";
import { MIN_GROUP } from "./resilience-requirements";

export const MAX_EVAL_BYTES = 25 * 1024 * 1024;
export type EvalRow = Record<string, string>;

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().replace("%", "").replace(",", ".");
  if (s === "") return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

export function parseEvalFile(text: string, fileName: string): { rows: EvalRow[]; detectedFields: string[] } {
  const clean = text.replace(/^﻿/, "");
  if (fileName.toLowerCase().endsWith(".json")) {
    try {
      const parsed = JSON.parse(clean);
      const arr = Array.isArray(parsed) ? parsed
        : ["results", "rows", "data", "evals"].map(k => parsed?.[k]).find(Array.isArray) ?? [parsed];
      const rows = (arr as unknown[])
        .filter((o): o is EvalRow => !!o && typeof o === "object")
        .map(o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v == null ? "" : String(v)])));
      const fields = new Set<string>();
      for (const r of rows) for (const k of Object.keys(r)) fields.add(k);
      return { rows, detectedFields: [...fields] };
    } catch { return { rows: [], detectedFields: [] }; }
  }
  const res = Papa.parse<EvalRow>(clean, { header: true, skipEmptyLines: "greedy", dynamicTyping: false, delimiter: "", transformHeader: h => h.trim() });
  const rows = (res.data ?? []).filter(r => r && Object.keys(r).length > 0);
  const fields = (res.meta.fields ?? []).map(h => h.trim()).filter(Boolean);
  return { rows, detectedFields: fields };
}

// Euristica: individua colonne metrica/valore/gruppo/campione
export function guessFields(fields: string[]) {
  const low = fields.map(f => f.toLowerCase());
  const find = (cands: string[]) => { for (const c of cands) { const i = low.findIndex(f => f.includes(c)); if (i >= 0) return fields[i]; } return undefined; };
  return {
    metric: find(["metric", "metrica", "measure"]),
    value:  find(["value", "valore", "score", "result", "accuracy", "acc", "f1", "auroc", "precision", "recall"]),
    group:  find(["group", "gruppo", "subgroup", "segment", "cohort", "sottopop"]),
    sample: find(["sample", "samplesize", "n", "count", "support", "size"]),
    attempts: find(["attempt", "tentativ", "trials", "queries"]),
    successes: find(["success", "successi", "hits", "breach"]),
  };
}

// §4 — metrica disaggregata per sotto-popolazione
export function computeSubPopulation(
  rows: EvalRow[],
  opts: { metric: string; groupCol: string; valueCol: string; sampleCol?: string; metricCol?: string; threshold: number }
): SubPopulationMetric {
  const relevant = opts.metricCol
    ? rows.filter(r => String(r[opts.metricCol!]).trim().toLowerCase() === opts.metric.toLowerCase())
    : rows;

  const agg = new Map<string, { sum: number; n: number; sample: number }>();
  for (const r of relevant) {
    const g = String(r[opts.groupCol] ?? "").trim();
    if (!g) continue;
    const v = num(r[opts.valueCol]);
    if (v === null) continue;
    const s = opts.sampleCol ? (num(r[opts.sampleCol]) ?? 0) : 1;
    const cur = agg.get(g) ?? { sum: 0, n: 0, sample: 0 };
    cur.sum += v; cur.n += 1; cur.sample += opts.sampleCol ? s : 1;
    agg.set(g, cur);
  }

  const byGroup = [...agg.entries()].map(([group, a]) => ({
    group, value: +(a.sum / a.n).toFixed(4), sampleSize: opts.sampleCol ? a.sample : a.n,
  })).sort((x, y) => y.value - x.value);

  const eligible = byGroup.filter(g => (g.sampleSize ?? 0) >= MIN_GROUP);
  const pool = eligible.length >= 2 ? eligible : byGroup;
  const values = pool.map(g => g.value);
  const maxGap = values.length >= 2 ? +(Math.max(...values) - Math.min(...values)).toFixed(4) : 0;
  const overall = byGroup.length
    ? +(byGroup.reduce((s, g) => s + g.value * (g.sampleSize ?? 1), 0) / byGroup.reduce((s, g) => s + (g.sampleSize ?? 1), 0)).toFixed(4)
    : 0;

  const verdict: SubPopulationMetric["verdict"] =
    maxGap > opts.threshold * 2 ? "critical" : maxGap > opts.threshold ? "review" : "ok";

  return { metric: opts.metric, overall, byGroup, maxGap, verdict, dimension: opts.groupCol };
}

// §2.3 — Attack Success Rate dalle righe red-team
export function computeASR(rows: EvalRow[], attemptsCol: string, successesCol: string): number | null {
  let attempts = 0, successes = 0;
  for (const r of rows) {
    attempts += num(r[attemptsCol]) ?? 0;
    successes += num(r[successesCol]) ?? 0;
  }
  return attempts > 0 ? +(successes / attempts).toFixed(4) : null;
}

// §7 — Fingerprint dell'assessment aggregato (non degli artefatti grezzi)
export async function computeResilienceFingerprint(record: ResilienceRecord): Promise<string> {
  const canonical = JSON.stringify({
    accuracy: record.accuracy.map(a => [a.metric, a.value, a.declaredInInstructions]).sort(),
    subPop: record.subPopulation.map(s => [s.metric, s.overall, s.maxGap, s.verdict]).sort(),
    threats: record.threats.map(t => [t.threatId, t.status, t.attackSuccessRate ?? null]).sort(),
    robustness: record.robustness.map(r => [r.itemId, r.status]).sort(),
  });
  if (typeof crypto === "undefined" || !crypto.subtle) {
    let h = 0; for (let i = 0; i < canonical.length; i++) h = (h * 31 + canonical.charCodeAt(i)) | 0;
    return `nohash-${(h >>> 0).toString(16)}`;
  }
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}
