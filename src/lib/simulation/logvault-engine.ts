// LogVault Engine — Art. 12 & 14 AI Act Compliance
// Hash-chained append-only log simulation with C2PA attestation

export type EventLevel = "safe" | "warning" | "critical";

export interface LogEntry {
  id: string;
  sequenceId: number;
  timestamp: Date;
  level: EventLevel;
  eventType: string;
  input: string;
  output: string;
  confidence: number;
  operatorId: string;
  modelVersion: string;
  driftScore: number;       // 0–1, drift from baseline
  prevHash: string;
  entryHash: string;
  c2paAttested: boolean;
}

export interface ChainIntegrity {
  valid: boolean;
  brokenAt: number | null; // sequenceId where chain broke
  verifiedCount: number;
}

// ─── Deterministic fake SHA-256 ──────────────────────────────────────────────
function fakeHash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) - h + input.charCodeAt(i)) | 0;
  }
  const base = Math.abs(h).toString(16).padStart(8, "0");
  return (base + base + base + base + base + base + base + base).slice(0, 64);
}

function canonicalize(obj: Record<string, unknown>): string {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

// ─── Generate mock log chain ──────────────────────────────────────────────────
const EVENT_TYPES = [
  "inference.classification",
  "inference.regression",
  "model.prediction",
  "data.preprocessing",
  "anomaly.detected",
  "human.override",
  "threshold.breach",
  "biometric.match",
];

const OPERATORS = ["op_ferrari_m", "op_rossi_a", "op_bianchi_l", "system_auto"];
const MODEL_VERSIONS = ["v2.1.0", "v2.0.1"];

export function generateLogChain(count = 24, tampered = false): LogEntry[] {
  const entries: LogEntry[] = [];
  let prevHash = "0000000000000000000000000000000000000000000000000000000000000000";

  for (let i = 0; i < count; i++) {
    const seed       = i * 7 + 13;
    const level: EventLevel =
      i === 8 && tampered ? "critical" :
      (seed % 11 === 0) ? "critical" :
      (seed % 5  === 0) ? "warning"  : "safe";

    const confidence  = 0.55 + (seed % 40) / 100;
    const driftScore  = i > 16 ? Math.min(0.85, 0.1 + (i - 16) * 0.08) : (seed % 20) / 100;
    const timestamp   = new Date(Date.now() - (count - i) * 4 * 60 * 1000);
    const eventType   = EVENT_TYPES[seed % EVENT_TYPES.length];
    const operatorId  = OPERATORS[seed % OPERATORS.length];
    const modelVer    = MODEL_VERSIONS[i > 12 ? 0 : 1];

    const payload = {
      confidence,
      driftScore,
      eventType,
      input: `record_${1000 + i}`,
      level,
      modelVersion: modelVer,
      operatorId,
      output: level === "critical" ? "BLOCKED" : level === "warning" ? "REVIEW" : "APPROVED",
      sequenceId: i + 1,
      timestamp: timestamp.toISOString(),
    };

    const canonical   = canonicalize(payload as Record<string, unknown>);
    // Tamper: corrupt hash of entry 8 to simulate integrity breach
    const entryHash   = tampered && i === 9
      ? "TAMPERED_" + fakeHash(canonical + prevHash).slice(9)
      : fakeHash(canonical + prevHash);

    entries.push({
      id: `log_${String(i + 1).padStart(4, "0")}`,
      sequenceId: i + 1,
      timestamp,
      level,
      eventType,
      input: payload.input,
      output: payload.output,
      confidence,
      operatorId,
      modelVersion: modelVer,
      driftScore,
      prevHash,
      entryHash,
      c2paAttested: level === "critical" || i % 6 === 0,
    });

    prevHash = entryHash;
  }

  return entries;
}

export function verifyChain(entries: LogEntry[]): ChainIntegrity {
  let prevHash = "0000000000000000000000000000000000000000000000000000000000000000";
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (e.prevHash !== prevHash) {
      return { valid: false, brokenAt: e.sequenceId, verifiedCount: i };
    }
    prevHash = e.entryHash;
  }
  return { valid: true, brokenAt: null, verifiedCount: entries.length };
}

export const LEVEL_STYLE: Record<EventLevel, { dot: string; bg: string; text: string; border: string }> = {
  safe:     { dot: "#16a34a", bg: "rgba(22,163,74,0.06)",   text: "#15803d", border: "rgba(22,163,74,0.15)"  },
  warning:  { dot: "#ca8a04", bg: "rgba(202,138,4,0.07)",   text: "#a16207", border: "rgba(202,138,4,0.2)"   },
  critical: { dot: "#dc2626", bg: "rgba(220,38,38,0.07)",   text: "#b91c1c", border: "rgba(220,38,38,0.2)"   },
};

// ─── Import utilities ─────────────────────────────────────────────────────────

export interface ImportResult {
  entries: LogEntry[];
  importedCount: number;
  originalCount: number;
  errors: string[];
  warnings: string[];
  sourceFormat: string;
}

/** Parse a JSON file exported from LogVault (array of LogEntry). */
export function parseImportedJSON(text: string): ImportResult {
  const errors: string[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { entries: [], importedCount: 0, originalCount: 0, sourceFormat: "json", warnings: [], errors: ["JSON non valido"] };
  }

  const raw = Array.isArray(parsed) ? parsed : (parsed as { entries?: unknown[] }).entries ?? [];
  const originalCount = raw.length;
  const entries: LogEntry[] = [];

  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (item && typeof item === "object") {
      const r = item as Record<string, unknown>;
      const level = (["safe", "warning", "critical"].includes(r.level as string)
        ? r.level : "safe") as EventLevel;
      const tsRaw = typeof r.timestamp === "string" ? r.timestamp : typeof r.ts === "string" ? r.ts : null;
      entries.push({
        id:           typeof r.id === "string"           ? r.id            : crypto.randomUUID(),
        sequenceId:   typeof r.sequenceId === "number"   ? r.sequenceId    : i + 1,
        timestamp:    tsRaw ? new Date(tsRaw) : new Date(),
        level,
        eventType:    typeof r.eventType === "string"    ? r.eventType     : "imported.event",
        input:        typeof r.input === "string"        ? r.input         : "",
        output:       typeof r.output === "string"       ? r.output        : "",
        confidence:   typeof r.confidence === "number"   ? r.confidence    : 0,
        operatorId:   typeof r.operatorId === "string"   ? r.operatorId    : "",
        modelVersion: typeof r.modelVersion === "string" ? r.modelVersion  : "",
        driftScore:   typeof r.driftScore === "number"   ? r.driftScore    : 0,
        prevHash:     typeof r.prevHash === "string"     ? r.prevHash      : "",
        entryHash:    typeof r.entryHash === "string"    ? r.entryHash     : "",
        c2paAttested: typeof r.c2paAttested === "boolean" ? r.c2paAttested : false,
      });
    }
  }

  return { entries, importedCount: entries.length, originalCount, sourceFormat: "json", warnings: [], errors };
}

/** Parse a CSV file with columns: id, sequenceId, timestamp, level, eventType, input, output, confidence, operatorId, modelVersion, driftScore, prevHash, entryHash, c2paAttested */
export function parseImportedCSV(text: string): ImportResult {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) {
    return { entries: [], importedCount: 0, originalCount: 0, sourceFormat: "csv", warnings: [], errors: ["File CSV vuoto o intestazione mancante"] };
  }

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
  const originalCount = lines.length - 1;
  const entries: LogEntry[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = cols[idx] ?? ""; });

    const levelRaw = row.level ?? row.livello ?? "";
    const level = (["safe", "warning", "critical"].includes(levelRaw) ? levelRaw : "safe") as EventLevel;
    const tsRaw = row.timestamp || row.ts || row.data || null;

    entries.push({
      id:           row.id             || crypto.randomUUID(),
      sequenceId:   row.sequenceid     ? parseInt(row.sequenceid, 10) : i,
      timestamp:    tsRaw ? new Date(tsRaw) : new Date(),
      level,
      eventType:    row.eventtype      || row.event      || row.evento || "imported.event",
      input:        row.input          || "",
      output:       row.output         || "",
      confidence:   row.confidence     ? parseFloat(row.confidence) : 0,
      operatorId:   row.operatorid     || row.actor      || row.attore || "",
      modelVersion: row.modelversion   || "",
      driftScore:   row.driftscore     ? parseFloat(row.driftscore) : 0,
      prevHash:     row.prevhash       || row.prev_hash  || "",
      entryHash:    row.entryhash      || row.hash       || "",
      c2paAttested: row.c2paattested   === "true",
    });
  }

  if (errors.length > 0 && entries.length === 0) {
    return { entries: [], importedCount: 0, originalCount, sourceFormat: "csv", warnings: [], errors };
  }

  return { entries, importedCount: entries.length, originalCount, sourceFormat: "csv", warnings: [], errors };
}
