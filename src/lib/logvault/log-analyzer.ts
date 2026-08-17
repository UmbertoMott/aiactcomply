// LogVault — analisi dei log del cliente, client-side, funzioni pure.
// Il file di log è elaborato in memoria nel browser; solo metadati aggregati
// (ImportedLogSet) sono persistiti. Le voci grezze non sono mai salvate né inviate.
import Papa from "papaparse";
import type { ImportedLogSet, LogFormat, LogQualityFindings, HashChainResult, RetentionAssessment } from "./logvault-types";

export const MAX_LOG_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_ENTRIES = 500_000;
export const GAP_FACTOR = 20;

export type LogEntry = Record<string, unknown>;

const TIMESTAMP_FIELDS = ["timestamp", "date", "time", "eventtime", "event_time", "created_at", "datetime", "ts"];

function isEmpty(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  const s = String(v).trim().toLowerCase();
  return s === "" || s === "na" || s === "n/a" || s === "null" || s === "none";
}

// ── Parsing multi-formato ───────────────────────────────────────────────────
export function parseLogFile(text: string, fileName: string): { format: LogFormat; entries: LogEntry[]; droppedRowCount: number } {
  const clean = text.replace(/^﻿/, "");
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".ndjson") || (lower.endsWith(".jsonl"))) {
    const lines = clean.split(/\r?\n/).filter(l => l.trim());
    const entries: LogEntry[] = []; let dropped = 0;
    for (const l of lines) { try { const o = JSON.parse(l); if (o && typeof o === "object") entries.push(o); else dropped++; } catch { dropped++; } }
    return { format: "ndjson", entries, droppedRowCount: dropped };
  }

  if (lower.endsWith(".json")) {
    try {
      const parsed = JSON.parse(clean);
      let arr: unknown[];
      if (Array.isArray(parsed)) arr = parsed;
      else if (parsed && typeof parsed === "object") {
        const holder = ["logs", "events", "data", "entries", "records"].map(k => (parsed as Record<string, unknown>)[k]).find(Array.isArray);
        arr = Array.isArray(holder) ? holder : [parsed];
      } else arr = [];
      const entries = arr.filter((o): o is LogEntry => !!o && typeof o === "object");
      return { format: "json", entries, droppedRowCount: arr.length - entries.length };
    } catch { return { format: "json", entries: [], droppedRowCount: 0 }; }
  }

  // CSV / TSV via papaparse
  const res = Papa.parse<LogEntry>(clean, { header: true, skipEmptyLines: "greedy", dynamicTyping: false, delimiter: "", transformHeader: h => h.trim() });
  const errorRows = new Set((res.errors ?? []).map(e => e.row));
  const entries = (res.data ?? []).filter(r => r && Object.keys(r).length > 0);
  return { format: "csv", entries, droppedRowCount: errorRows.size };
}

// ── Campi e timestamp ───────────────────────────────────────────────────────
export function unionFields(entries: LogEntry[]): string[] {
  const s = new Set<string>();
  for (const e of entries) for (const k of Object.keys(e)) s.add(k);
  return [...s];
}

export function findTimestampField(fields: string[]): string | undefined {
  const lower = fields.map(f => f.toLowerCase());
  for (const cand of TIMESTAMP_FIELDS) { const i = lower.indexOf(cand); if (i >= 0) return fields[i]; }
  // fuzzy: contiene "time" o "date"
  const i = lower.findIndex(f => f.includes("time") || f.includes("date"));
  return i >= 0 ? fields[i] : undefined;
}

function parseTs(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  if (!isNaN(n) && s.length >= 10) return n < 1e12 ? n * 1000 : n; // epoch s / ms
  const d = Date.parse(s);
  return isNaN(d) ? null : d;
}

export function fillRate(entries: LogEntry[], field: string): number {
  if (entries.length === 0) return 0;
  const filled = entries.reduce((a, e) => a + (isEmpty(e[field]) ? 0 : 1), 0);
  return +(filled / entries.length).toFixed(4);
}

// ── §4 Qualità & continuità ─────────────────────────────────────────────────
export function computeQuality(entries: LogEntry[], tsField: string | undefined, fields: string[]): LogQualityFindings {
  const n = entries.length;
  let validTs = 0, outOfOrder = 0;
  const times: number[] = [];
  if (tsField) {
    let prev: number | null = null;
    for (const e of entries) {
      const t = parseTs(e[tsField]);
      if (t !== null) { validTs++; times.push(t); if (prev !== null && t < prev) outOfOrder++; prev = t; }
    }
  }
  const sorted = [...times].sort((a, b) => a - b);
  const gaps: LogQualityFindings["chronologicalGaps"] = [];
  if (sorted.length >= 3) {
    const deltas: number[] = [];
    for (let i = 1; i < sorted.length; i++) deltas.push(sorted[i] - sorted[i - 1]);
    const med = [...deltas].sort((a, b) => a - b)[Math.floor(deltas.length / 2)] || 0;
    if (med > 0) {
      for (let i = 1; i < sorted.length; i++) {
        const d = sorted[i] - sorted[i - 1];
        if (d > GAP_FACTOR * med) gaps.push({ start: new Date(sorted[i - 1]).toISOString(), end: new Date(sorted[i]).toISOString(), durationHours: +(d / 3_600_000).toFixed(2) });
      }
    }
  }

  // Duplicati: per id/hash se presente, altrimenti JSON identico
  const idField = fields.find(f => ["id", "event_id", "eventid", "hash", "uuid"].includes(f.toLowerCase()));
  const seen = new Set<string>(); let dup = 0;
  for (const e of entries) { const key = idField ? String(e[idField] ?? "") : JSON.stringify(e); if (key && seen.has(key)) dup++; else seen.add(key); }

  const avgFill = fields.length ? +(fields.reduce((a, f) => a + fillRate(entries, f), 0) / fields.length).toFixed(4) : 0;

  return {
    timestampValidPct: n > 0 && tsField ? +(validTs / n * 100).toFixed(1) : 0,
    outOfOrderCount: outOfOrder,
    chronologicalGaps: gaps.slice(0, 50),
    duplicateCount: dup,
    overallFieldFillRate: avgFill,
  };
}

// ── §6 Verifica hash-chain del cliente (linkage prev_hash → hash) ───────────
export function verifyHashChain(entries: LogEntry[], fields: string[]): HashChainResult {
  const lower = fields.map(f => f.toLowerCase());
  const pick = (cands: string[]) => { for (const c of cands) { const i = lower.indexOf(c); if (i >= 0) return fields[i]; } return undefined; };
  const hashF = pick(["hash", "integrityhash", "integrity_hash", "event_hash"]);
  const prevF = pick(["prev_hash", "previous_hash", "prevhash", "parent_hash"]);
  const seqF  = pick(["sequence", "seq", "index", "sequence_number"]);
  if (!hashF || !prevF) return { status: "no_integrity_fields", checkedCount: 0 };

  let ordered = entries;
  if (seqF) ordered = [...entries].sort((a, b) => Number(a[seqF]) - Number(b[seqF]));

  let checked = 0;
  for (let i = 1; i < ordered.length; i++) {
    const prevDecl = String(ordered[i][prevF] ?? "");
    const prevHash = String(ordered[i - 1][hashF] ?? "");
    checked++;
    if (prevDecl && prevHash && prevDecl !== prevHash) {
      return { status: "broken", brokenAtEntry: i, checkedCount: checked, detectedFields: { hash: hashF, prevHash: prevF, sequence: seqF } };
    }
  }
  return { status: "verified", checkedCount: checked, detectedFields: { hash: hashF, prevHash: prevF, sequence: seqF } };
}

// ── §6 Fingerprint dell'assessment (non dei log grezzi) ─────────────────────
export async function computeAssessmentFingerprint(ls: Pick<ImportedLogSet, "detectedFields" | "entryCount" | "dateRangeStart" | "dateRangeEnd" | "fieldFillRates" | "qualityFindings">): Promise<string> {
  const canonical = JSON.stringify({
    fields: [...ls.detectedFields].sort(),
    entryCount: ls.entryCount,
    range: [ls.dateRangeStart ?? "", ls.dateRangeEnd ?? ""],
    fillRates: [...ls.fieldFillRates].sort((a, b) => a.field.localeCompare(b.field)).map(f => [f.field, Math.round(f.fillRate * 100)]),
    quality: ls.qualityFindings ? { ts: ls.qualityFindings.timestampValidPct, gaps: ls.qualityFindings.chronologicalGaps.length, dup: ls.qualityFindings.duplicateCount } : null,
  });
  if (typeof crypto === "undefined" || !crypto.subtle) {
    let h = 0; for (let i = 0; i < canonical.length; i++) h = (h * 31 + canonical.charCodeAt(i)) | 0;
    return `nohash-${(h >>> 0).toString(16)}`;
  }
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ── Orchestrazione: analizza un file → ImportedLogSet + voci in memoria ─────
export interface AnalyzeResult { logSet: ImportedLogSet; entries: LogEntry[]; }

export async function analyzeLogSet(id: string, fileName: string, text: string): Promise<AnalyzeResult> {
  const { format, entries: allEntries, droppedRowCount } = parseLogFile(text, fileName);
  const sampled = allEntries.length > MAX_ENTRIES;
  const entries = sampled ? allEntries.slice(0, MAX_ENTRIES) : allEntries;

  const detectedFields = unionFields(entries);
  const tsField = findTimestampField(detectedFields);
  const times = tsField ? entries.map(e => parseTs(e[tsField])).filter((t): t is number => t !== null) : [];
  const dateRangeStart = times.length ? new Date(Math.min(...times)).toISOString() : undefined;
  const dateRangeEnd = times.length ? new Date(Math.max(...times)).toISOString() : undefined;
  const fieldFillRates = detectedFields.map(f => ({ field: f, fillRate: fillRate(entries, f) }));
  const qualityFindings = computeQuality(entries, tsField, detectedFields);
  const integrity = verifyHashChain(entries, detectedFields);

  const base = {
    id, fileName, format, uploadedAt: new Date().toISOString(), analyzedAt: new Date().toISOString(),
    entryCount: entries.length, detectedFields, dateRangeStart, dateRangeEnd,
    fieldFillRates, qualityFindings, integrity,
    ...(sampled ? { sampledFrom: allEntries.length } : {}),
    ...(droppedRowCount > 0 ? { notes: `${droppedRowCount} voci malformate scartate` } : {}),
  };
  const fingerprint = await computeAssessmentFingerprint(base);
  return { logSet: { ...base, fingerprint }, entries };
}

// ── §5 Ritenzione calcolata ─────────────────────────────────────────────────
export function computeRetention(logSets: ImportedLogSet[], role: RetentionAssessment["role"], policyMonths?: number): RetentionAssessment {
  const starts = logSets.map(l => l.dateRangeStart).filter(Boolean).map(s => Date.parse(s!));
  const ends = logSets.map(l => l.dateRangeEnd).filter(Boolean).map(s => Date.parse(s!));
  const spanMonths = starts.length && ends.length
    ? +(((Math.max(...ends) - Math.min(...starts)) / (1000 * 60 * 60 * 24 * 30.44))).toFixed(1)
    : undefined;

  let verdict: RetentionAssessment["verdict"] = "unknown";
  const minMonths = role === "deployer" ? 6 : undefined; // Art. 26(6)
  if (policyMonths !== undefined && minMonths !== undefined) {
    verdict = policyMonths < minMonths ? "below_minimum"
      : spanMonths !== undefined && spanMonths > policyMonths ? "policy_below_span"
      : "pass";
  } else if (policyMonths !== undefined && spanMonths !== undefined) {
    verdict = spanMonths > policyMonths ? "policy_below_span" : "pass";
  }
  return { role, retentionPolicyMonths: policyMonths, retentionSpanMonths: spanMonths, verdict };
}
