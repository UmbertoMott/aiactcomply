// CSV profiling — client-side, pure functions, no I/O.
// Il file CSV viene elaborato in memoria; solo le statistiche aggregate
// (DatasetProfile) vengono persistite. Nessuna riga grezza è mai salvata.
import type { ColumnProfile, ColumnType, DatasetProfile } from "./data-audit-types";
import { detectSensitiveHint } from "./data-governance-practices";

const MISSING_VALUES = new Set(["", "na", "n/a", "null", "none", "-", "nan", "undefined"]);

function isMissing(val: string): boolean {
  return MISSING_VALUES.has(val.toLowerCase().trim());
}

function tryParseNumber(val: string): number | null {
  // Support both . and , as decimal separator
  const normalized = val.trim().replace(/,/g, ".");
  const n = parseFloat(normalized);
  return isNaN(n) ? null : n;
}

const BOOL_VALUES = new Set(["true", "false", "0", "1", "si", "sì", "no", "yes"]);
const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}(T.*)?$/,           // ISO 8601 / YYYY-MM-DD
  /^\d{2}\/\d{2}\/\d{4}$/,               // DD/MM/YYYY
  /^\d{2}-\d{2}-\d{4}$/,                  // DD-MM-YYYY
  /^\d{4}\/\d{2}\/\d{2}$/,               // YYYY/MM/DD
];

function inferType(values: string[]): ColumnType {
  const nonMissing = values.filter(v => !isMissing(v));
  if (nonMissing.length === 0) return "unknown";

  const sample = nonMissing.slice(0, Math.min(nonMissing.length, 500));
  const total = sample.length;

  // Boolean
  if (sample.every(v => BOOL_VALUES.has(v.toLowerCase().trim()))) return "boolean";

  // Numeric
  const numericCount = sample.filter(v => tryParseNumber(v) !== null).length;
  if (numericCount / total >= 0.9) return "numeric";

  // Datetime
  const dateCount = sample.filter(v => DATE_PATTERNS.some(p => p.test(v.trim()))).length;
  if (dateCount / total >= 0.9) return "datetime";

  // Categorical (≤50 unique or ≤5% of total)
  const unique = new Set(nonMissing.map(v => v.trim())).size;
  if (unique <= 50 || unique / nonMissing.length <= 0.05) return "categorical";

  return "text";
}

function numericStats(values: number[]): ColumnProfile["numericStats"] {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);
  return { min: +min.toFixed(4), max: +max.toFixed(4), mean: +mean.toFixed(4), median: +median.toFixed(4), stdDev: +stdDev.toFixed(4) };
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

  const sensitiveHint = detectSensitiveHint(name);
  const flaggedAsSensitive = sensitiveHint !== null;

  const col: ColumnProfile = {
    name,
    inferredType,
    missingCount,
    missingPercentage,
    uniqueValueCount,
    flaggedAsSensitive,
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

export function parseCSVText(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };

  // Simple CSV parser: handles quoted fields
  function parseLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }

  const headers = parseLine(lines[0]).map(h => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (vals[i] ?? "").trim().replace(/^"|"$/g, ""); });
    return row;
  });
  return { headers, rows };
}

export function profileDataset(
  id: string,
  role: DatasetProfile["role"],
  fileName: string,
  csvText: string
): DatasetProfile {
  const { headers, rows } = parseCSVText(csvText);
  const columns: ColumnProfile[] = headers.map(name => {
    const vals = rows.map(r => r[name] ?? "");
    return profileColumn(name, vals);
  });

  const overallMissingPercentage = columns.length > 0
    ? +(columns.reduce((s, c) => s + c.missingPercentage, 0) / columns.length).toFixed(2)
    : 0;

  return {
    id,
    role,
    fileName,
    uploadedAt: new Date().toISOString(),
    rowCount: rows.length,
    columnCount: headers.length,
    overallMissingPercentage,
    columns,
  };
}
