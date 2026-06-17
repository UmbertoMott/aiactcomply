"use server";

// LogVault AI drift analysis — PROMPT BE
// Uses Vertex AI (generateText) — server-side only

import { generateText } from "@/lib/rag/rag-vertex";

export interface DriftSignal {
  pattern: string;
  count: number;
  severity: "info" | "warning" | "critical";
}

export interface DriftAnalysis {
  driftDetected: boolean;
  summary: string;
  signals: DriftSignal[];
  suggestedAction: string;
  draftIncidentReason?: string;
  aiConfirmed: false;
}

export interface LogEventSummary {
  timestamp: string;
  category: string;
  severity: string;
  description: string;
}

export async function analyzeLogDrift(
  events: LogEventSummary[],
  systemName: string
): Promise<DriftAnalysis> {
  const empty: DriftAnalysis = {
    driftDetected: false,
    summary: "Nessun evento da analizzare.",
    signals: [],
    suggestedAction: "Aggiungere eventi operativi per abilitare l'analisi.",
    aiConfirmed: false,
  };
  if (events.length === 0) return empty;

  const eventLines = events
    .slice(-50)
    .map(e => `[${e.timestamp}] ${e.severity.toUpperCase()} — ${e.category}: ${e.description}`)
    .join("\n");

  const prompt = `Sei un compliance analyst AI per l'EU AI Act (Art. 12, Art. 26).
Analizza i seguenti eventi operativi del sistema AI "${systemName}" e identifica segnali di drift comportamentale, anomalie ripetute o pattern di rischio.

EVENTI (ultimi ${events.length}):
${eventLines}

Rispondi SOLO con JSON valido, senza markdown:
{
  "driftDetected": boolean,
  "summary": "stringa breve in italiano (max 120 caratteri)",
  "signals": [{ "pattern": "stringa", "count": number, "severity": "info"|"warning"|"critical" }],
  "suggestedAction": "stringa in italiano (max 200 caratteri)",
  "draftIncidentReason": "stringa o null — compila solo se driftDetected=true"
}`;

  try {
    const raw = await generateText(prompt, { temperature: 0.1, maxOutputTokens: 800 });
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as Omit<DriftAnalysis, "aiConfirmed">;
    return { ...parsed, aiConfirmed: false };
  } catch {
    return {
      driftDetected: false,
      summary: "✦ AI — analisi non disponibile. Verificare configurazione Vertex AI.",
      signals: [],
      suggestedAction: "Riprovare o verificare manualmente gli eventi.",
      aiConfirmed: false,
    };
  }
}
