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
