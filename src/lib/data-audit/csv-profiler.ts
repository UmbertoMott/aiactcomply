// CSV/TSV profiling — client-side, pure functions, no I/O.
// Il file viene elaborato in memoria nel browser; solo le statistiche aggregate
// (DatasetProfile) vengono persistite. Nessuna riga grezza è mai salvata né inviata.
import Papa from "papaparse";
import type { ColumnProfile, ColumnType, DatasetProfile, DataQualityScorecard } from "./data-audit-types";
import { detectSensitiveHint } from "./data-governance-practices";

export const MAX_ROWS = 200_000;
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

const MISSING_VALUES = new Set(["", "na", "n/a", "null", "none", "-", "nan", "undefined"]);
function isMissing(val: string): boolean {
  return MISSING_VALUES.has((val ?? "").toLowerCase().trim());
}

function tryParseNumber(val: string): number | null {
  const normalized = val.trim().replace(/\s/g, "").replace(/,/g, ".");
  if (normalized === "" || /[^0-9.\-+eE]/.test(normalized)) return null;
  const n = parseFloat(normalized);
  return isNaN(n) ? null : n;
}

const BOOL_VALUES = new Set(["true", "false", "0", "1", "si", "sì", "no", "yes"]);
const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}(T.*)?$/,
  /^\d{2}\/\d{2}\/\d{4}$/,
  /^\d{2}-\d{2}-\d{4}$/,
  /^\d{4}\/\d{2}\/\d{2}$/,
];
const isDate = (v: string) => DATE_PATTERNS.some(p => p.test(v.trim()));

function inferType(values: string[]): ColumnType {
  const nonMissing = values.filter(v => !isMissing(v));
  if (nonMissing.length === 0) return "unknown";
  const sample = nonMissing.slice(0, Math.min(nonMissing.length, 500));
  const total = sample.length;
  if (sample.every(v => BOOL_VALUES.has(v.toLowerCase().trim()))) return "boolean";
  if (sample.filter(v => tryParseNumber(v) !== null).length / total >= 0.9) return "numeric";
  if (sample.filter(v => isDate(v)).length / total >= 0.9) return "datetime";
  const unique = new Set(nonMissing.map(v => v.trim())).size;
  if (unique <= 50 || unique / nonMissing.length <= 0.05) return "categorical";
  return "text";
}

// Conta i valori non conformi al tipo dominante inferito (ISO/IEC 5259 consistency).
function countTypeErrors(type: ColumnType, nonMissing: string[]): number {
  switch (type) {
    case "numeric":  return nonMissing.filter(v => tryParseNumber(v) === null).length;
    case "boolean":  return nonMissing.filter(v => !BOOL_VALUES.has(v.toLowerCase().trim())).length;
    case "datetime": return nonMissing.filter(v => !isDate(v)).length;
    default:         return 0; // categorical/text: qualunque stringa è ammessa
  }
}

function numericStats(values: number[]): NonNullable<ColumnProfile["numericStats"]> | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const outlierCount = stdDev > 0 ? values.filter(v => Math.abs((v - mean) / stdDev) > 3).length : 0;
  return {
    min: +min.toFixed(4), max: +max.toFixed(4), mean: +mean.toFixed(4),
    median: +median.toFixed(4), stdDev: +stdDev.toFixed(4), outlierCount,
  };
}

function categoricalDistribution(values: string[]): NonNullable<ColumnProfile["categoricalDistribution"]> {
  const counts: Record<string, number> = {};
  for (const v of values) { const k = v.trim(); counts[k] = (counts[k] ?? 0) + 1; }
  const total = values.length;
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([value, count]) => ({ value, count, percentage: +(count / total * 100).toFixed(2) }));
}

function profileColumn(name: string, rawValues: string[]): ColumnProfile {
  const missingCount = rawValues.filter(isMissing).length;
  const missingPercentage = rawValues.length > 0 ? +(missingCount / rawValues.length * 100).toFixed(2) : 0;
  const nonMissing = rawValues.filter(v => !isMissing(v));
  const inferredType = inferType(rawValues);
  const uniqueValueCount = new Set(nonMissing.map(v => v.trim())).size;
  const typeErrorCount = countTypeErrors(inferredType, nonMissing);
  const sensitiveHint = detectSensitiveHint(name);

  const col: ColumnProfile = {
    name, inferredType, missingCount, missingPercentage, uniqueValueCount,
    typeErrorCount,
    flaggedAsSensitive: sensitiveHint !== null,
    sensitiveCategoryGuess: sensitiveHint ?? undefined,
    sensitiveFlagConfirmed: false,
  };

  if (inferredType === "numeric") {
    const nums = nonMissing.map(tryParseNumber).filter((n): n is number => n !== null);
    col.numericStats = numericStats(nums);
  }
  if (inferredType === "categorical" || inferredType === "boolean") {
    col.categoricalDistribution = categoricalDistribution(nonMissing);
  }
  return col;
}

// ── Parsing robusto via papaparse (gestisce quote, newline nei campi, BOM, delim auto) ──

export interface ParseResult {
  headers: string[];
  rows: Record<string, string>[];
  droppedRowCount: number;
  duplicateColumns: string[];
  delimiter: string;
}

export function parseTabular(text: string): ParseResult {
  const clean = text.replace(/^﻿/, ""); // strip BOM
  const res = Papa.parse<Record<string, string>>(clean, {
    header: true,
    skipEmptyLines: "greedy",
    dynamicTyping: false,
    delimiter: "", // auto-detect , ; \t |
    transformHeader: (h) => h.trim(),
  });
  const headers = (res.meta.fields ?? []).map(h => h.trim()).filter(Boolean);
  const seen = new Set<string>();
  const duplicateColumns: string[] = [];
  for (const h of headers) { if (seen.has(h)) duplicateColumns.push(h); else seen.add(h); }
  const errorRows = new Set((res.errors ?? []).map(e => e.row));
  const rows = (res.data ?? []).filter(r => r && Object.keys(r).length > 0);
  return {
    headers, rows,
    droppedRowCount: errorRows.size,
    duplicateColumns,
    delimiter: res.meta.delimiter ?? ",",
  };
}

function countDuplicateRows(rows: Record<string, string>[], headers: string[]): number {
  const seen = new Set<string>();
  let dup = 0;
  for (const r of rows) {
    const key = headers.map(h => (r[h] ?? "").trim()).join("");
    if (seen.has(key)) dup++; else seen.add(key);
  }
  return dup;
}

export interface ProfileResult {
  profile: DatasetProfile;
  parseWarnings: { droppedRowCount: number; duplicateColumns: string[]; sampled: boolean; delimiter: string };
}

export function profileDataset(
  id: string,
  role: DatasetProfile["role"],
  fileName: string,
  csvText: string
): DatasetProfile {
  return profileDatasetDetailed(id, role, fileName, csvText).profile;
}

export function profileDatasetDetailed(
  id: string,
  role: DatasetProfile["role"],
  fileName: string,
  csvText: string
): ProfileResult {
  const { headers, rows: allRows, droppedRowCount, duplicateColumns, delimiter } = parseTabular(csvText);

  const totalRows = allRows.length;
  const sampled = totalRows > MAX_ROWS;
  const rows = sampled ? allRows.slice(0, MAX_ROWS) : allRows;

  const columns: ColumnProfile[] = headers.map(name => profileColumn(name, rows.map(r => r[name] ?? "")));
  const overallMissingPercentage = columns.length > 0
    ? +(columns.reduce((s, c) => s + c.missingPercentage, 0) / columns.length).toFixed(2)
    : 0;
  const duplicateRowCount = countDuplicateRows(rows, headers);

  const profile: DatasetProfile = {
    id, role, fileName,
    uploadedAt: new Date().toISOString(),
    analyzedAt: new Date().toISOString(),
    rowCount: rows.length,
    columnCount: headers.length,
    overallMissingPercentage,
    duplicateRowCount,
    columns,
    ...(sampled ? { sampledFrom: totalRows } : {}),
    ...(droppedRowCount > 0 ? { droppedRowCount } : {}),
  };

  return { profile, parseWarnings: { droppedRowCount, duplicateColumns, sampled, delimiter } };
}

// ── Data Quality Scorecard (ISO/IEC 5259 [verify]) ──────────────────────────

export function qualityScorecard(profile: DatasetProfile): DataQualityScorecard {
  const completeness = +(100 - profile.overallMissingPercentage).toFixed(1);
  const uniqueness = profile.rowCount > 0
    ? +(100 - (profile.duplicateRowCount / profile.rowCount) * 100).toFixed(1)
    : 100;
  const totalCells = profile.rowCount * Math.max(profile.columnCount, 1);
  const typeErrors = profile.columns.reduce((s, c) => s + (c.typeErrorCount ?? 0), 0);
  const consistency = totalCells > 0 ? +(100 - (typeErrors / totalCells) * 100).toFixed(1) : 100;
  return { completeness, uniqueness, consistency };
}

// ── Fingerprint del dataset (SHA-256 di schema + statistiche, non dei dati grezzi) §7 ──

export async function computeDatasetFingerprint(profile: DatasetProfile): Promise<string> {
  const canonical = JSON.stringify({
    headers: profile.columns.map(c => c.name),
    rowCount: profile.rowCount,
    columnCount: profile.columnCount,
    columns: profile.columns.map(c => ({
      name: c.name,
      inferredType: c.inferredType,
      missingPct: Math.round(c.missingPercentage),
      uniqueCount: c.uniqueValueCount ?? 0,
    })),
  });
  if (typeof crypto === "undefined" || !crypto.subtle) {
    // Fallback deterministico se subtle non disponibile (ambiente non-browser)
    let h = 0;
    for (let i = 0; i < canonical.length; i++) { h = (h * 31 + canonical.charCodeAt(i)) | 0; }
    return `nohash-${(h >>> 0).toString(16)}`;
  }
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}
