"use server";
import { generateText } from "@/lib/rag/rag-vertex";
import { TRACEABILITY_PURPOSES, BIOMETRIC_LOG_REQUIREMENTS } from "@/lib/logvault/traceability-purposes";

// ── parseLogFile ──────────────────────────────────────────────────────────────
// Parses a raw log file (JSON/NDJSON/CSV text) server-side.
// PRIVACY: Only aggregate metadata is returned — never individual log entries.

export interface ParsedLogMeta {
  format: "json" | "ndjson" | "csv";
  entryCount: number;
  detectedFields: string[];
  dateRangeStart?: string;
  dateRangeEnd?: string;
  warnings: string[];
  previewSample: Record<string, string>[];  // max 5 entries, UI-only, never persisted
}

const TIMESTAMP_FIELD_NAMES = ["timestamp", "date", "time", "eventtime", "created_at", "datetime", "ts", "event_time"];

function detectTimestamps(rows: Record<string, string>[]): { start?: string; end?: string } {
  for (const name of TIMESTAMP_FIELD_NAMES) {
    const vals = rows.flatMap(r => {
      const v = r[name] ?? r[name.toLowerCase()] ?? r[name.toUpperCase()];
      if (!v) return [];
      const d = new Date(v);
      return isNaN(d.getTime()) ? [] : [d.getTime()];
    });
    if (vals.length > 0) {
      return {
        start: new Date(Math.min(...vals)).toISOString(),
        end: new Date(Math.max(...vals)).toISOString(),
      };
    }
  }
  return {};
}

function parseCSVText(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };

  function parseLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if ((ch === "," || ch === ";") && !inQuotes) {
        result.push(current); current = "";
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

export async function parseLogFile(text: string, fileName: string): Promise<ParsedLogMeta> {
  const ext = fileName.split(".").pop()?.toLowerCase();
  const warnings: string[] = [];

  // JSON
  if (ext === "json") {
    let parsed: unknown;
    try { parsed = JSON.parse(text); }
    catch { return { format: "json", entryCount: 0, detectedFields: [], warnings: ["JSON non valido: impossibile fare il parsing"] , previewSample: [] }; }

    const arr = Array.isArray(parsed) ? parsed : typeof parsed === "object" && parsed !== null ? Object.values(parsed).flat() : [];
    const rows = arr.filter((r): r is Record<string, unknown> => typeof r === "object" && r !== null);
    const fields = new Set<string>();
    for (const r of rows) { for (const k of Object.keys(r)) fields.add(k); }

    const strRows = rows.map(r => {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(r)) out[k] = String(v ?? "");
      return out;
    });

    const { start, end } = detectTimestamps(strRows);
    if (!start) warnings.push("Nessun campo timestamp riconosciuto — impossibile calcolare l'intervallo temporale");

    return {
      format: "json",
      entryCount: rows.length,
      detectedFields: Array.from(fields),
      dateRangeStart: start,
      dateRangeEnd: end,
      warnings,
      previewSample: strRows.slice(0, 5),
    };
  }

  // NDJSON
  if (ext === "ndjson") {
    const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
    const rows: Record<string, unknown>[] = [];
    for (const line of lines) {
      try { const obj = JSON.parse(line); if (typeof obj === "object" && obj !== null) rows.push(obj as Record<string, unknown>); }
      catch { warnings.push(`Riga NDJSON non valida saltata`); }
    }
    const fields = new Set<string>();
    for (const r of rows) { for (const k of Object.keys(r)) fields.add(k); }
    const strRows = rows.map(r => {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(r)) out[k] = String(v ?? "");
      return out;
    });
    const { start, end } = detectTimestamps(strRows);
    if (!start) warnings.push("Nessun campo timestamp riconosciuto");
    return { format: "ndjson", entryCount: rows.length, detectedFields: Array.from(fields), dateRangeStart: start, dateRangeEnd: end, warnings, previewSample: strRows.slice(0, 5) };
  }

  // CSV
  if (ext === "csv") {
    const { headers, rows } = parseCSVText(text);
    if (headers.length === 0) return { format: "csv", entryCount: 0, detectedFields: [], warnings: ["CSV vuoto o formato non riconosciuto"], previewSample: [] };
    const { start, end } = detectTimestamps(rows);
    if (!start) warnings.push("Nessun campo timestamp riconosciuto nelle colonne CSV");
    return { format: "csv", entryCount: rows.length, detectedFields: headers, dateRangeStart: start, dateRangeEnd: end, warnings, previewSample: rows.slice(0, 5) };
  }

  return { format: "json", entryCount: 0, detectedFields: [], warnings: [`Formato non supportato: .${ext}`], previewSample: [] };
}

// ── analyzeLogCoverage ────────────────────────────────────────────────────────
// AI copilot: propone copertura per ogni finalità/requisito basandosi sui campi
// rilevati e sul contesto del sistema. Riceve solo metadati aggregati.

export interface CoverageProposal {
  purposeOrRequirementId: string;
  proposedCovered: "yes" | "partial" | "no";
  evidenceFields: string[];
  rationale: string;
}

export interface AnalyzeLogCoverageResult {
  proposals: CoverageProposal[];
  safeStateSuggestion?: string;
  aiWarning: string;
}

export async function analyzeLogCoverage(input: {
  detectedFields: string[];
  systemName: string;
  intendedPurpose: string;
  riskTier: string;
  includeBiometric: boolean;
  oversightSafeStateDescription?: string;
}): Promise<AnalyzeLogCoverageResult> {
  const purposes = TRACEABILITY_PURPOSES.map(p => `- ${p.id}: ${p.label} (${p.reference})`).join("\n");
  const biometricSection = input.includeBiometric
    ? "\n\nRequisiti biometrici (Art. 12(3) [verify against current AI Act text]):\n" +
      BIOMETRIC_LOG_REQUIREMENTS.map(r => `- ${r.id}: ${r.label} (${r.reference})`).join("\n")
    : "";
  const safeStateSection = input.oversightSafeStateDescription
    ? `\n\nDescrizione "stato sicuro" da Oversight (Art. 14(4)(e) [verify against current AI Act text]): "${input.oversightSafeStateDescription}"`
    : "";

  const prompt = `Sei un esperto di conformità AI Act UE (Reg. 2024/1689), specializzato in requisiti di logging (Art. 12 [verify against current AI Act text]).

Sistema AI:
- Nome: ${input.systemName}
- Finalità prevista: ${input.intendedPurpose}
- Tier di rischio: ${input.riskTier}

Campi rilevati nei log importati: ${input.detectedFields.length > 0 ? input.detectedFields.join(", ") : "(nessun file ancora importato)"}
${safeStateSection}

Finalità di tracciabilità (Art. 12(2)(a)-(c) [verify against current AI Act text]):
${purposes}${biometricSection}

Per ciascuna finalità/requisito, proponi:
1. covered: "yes" (i campi presenti sono chiaramente sufficienti), "partial" (i campi suggeriscono copertura parziale), "no" (nessun campo utile rilevato)
2. evidenceFields: lista di campi rilevati che supportano la copertura (array vuoto se "no")
3. rationale: 1-2 frasi che spiegano il ragionamento, citando il nome del campo specifico quando disponibile

Tieni conto che un campo chiamato "errore" o "fault" potrebbe corrispondere a risk_identification anche se non si chiama "error".

${input.oversightSafeStateDescription ? `Per il requisito di "stato sicuro" e intervention_stop, suggerisci anche (campo safeStateSuggestion) 1-2 frasi su quali campi di log dovrebbero documentare l'attivazione del meccanismo di arresto.` : ""}

Rispondi ESCLUSIVAMENTE nel formato JSON:
<extract>
{
  "proposals": [
    { "purposeOrRequirementId": "risk_identification", "proposedCovered": "partial", "evidenceFields": ["error", "alert"], "rationale": "Il campo 'error' suggerisce..." }
  ]${input.oversightSafeStateDescription ? `,\n  "safeStateSuggestion": "I log dovrebbero contenere..."` : ""}
}
</extract>`;

  const raw = await generateText(prompt);
  const match = raw.match(/<extract>([\s\S]*?)<\/extract>/);
  if (!match) throw new Error("L'AI non ha restituito un blocco <extract> valido.");

  let parsed: { proposals: CoverageProposal[]; safeStateSuggestion?: string };
  try { parsed = JSON.parse(match[1].trim()); }
  catch { throw new Error("Errore parsing JSON dalla risposta AI."); }

  return { ...parsed, aiWarning: "✦ AI — verifica e conferma" };
}
