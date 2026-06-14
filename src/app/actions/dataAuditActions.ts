"use server";
import { generateText } from "@/lib/rag/rag-vertex";
import type { DatasetProfile, GovernancePracticeRecord } from "@/lib/data-audit/data-audit-types";
import { DATA_GOVERNANCE_PRACTICES } from "@/lib/data-audit/data-governance-practices";

// ── draftGovernancePracticeDocumentation ──────────────────────────────────
// Genera una bozza di documentazione per una pratica di governance Art. 10.
// Riceve solo statistiche aggregate — mai dati grezzi.

export interface DraftGovernanceResult {
  documentation: string;
  aiWarning: string;
}

export async function draftGovernancePracticeDocumentation(input: {
  practiceId: string;
  systemName: string;
  systemDescription: string;
  riskTier: string;
  intendedPurpose?: string;
  datasetSummaries?: Array<{ role: string; fileName: string; rowCount: number; columnCount: number; overallMissingPercentage: number }>;
}): Promise<DraftGovernanceResult> {
  const practice = DATA_GOVERNANCE_PRACTICES.find(p => p.id === input.practiceId);
  if (!practice) throw new Error(`Pratica non trovata: ${input.practiceId}`);

  const datasetsDesc = input.datasetSummaries && input.datasetSummaries.length > 0
    ? input.datasetSummaries.map(d =>
        `- Dataset "${d.fileName}" (ruolo: ${d.role}): ${d.rowCount.toLocaleString()} righe, ${d.columnCount} colonne, ${d.overallMissingPercentage}% valori mancanti`
      ).join("\n")
    : "Nessun dataset ancora caricato.";

  const prompt = `Sei un esperto di conformità AI Act UE (Reg. 2024/1689), specializzato in qualità e governance dei dati (Art. 10).

Sistema AI in analisi:
- Nome: ${input.systemName}
- Descrizione: ${input.systemDescription}
- Tier di rischio: ${input.riskTier}
- Finalità prevista: ${input.intendedPurpose ?? "n.d."}

Dataset caricati (statistiche aggregate — nessun dato grezzo):
${datasetsDesc}

Pratica di governance richiesta:
- ID: ${practice.id}
- Label: ${practice.label}
- Riferimento normativo: ${practice.reference}

Scrivi una bozza di documentazione per questa pratica di governance (3-6 frasi). La bozza deve essere:
- Concreta e riferita ai dati effettivamente caricati quando le statistiche sono disponibili
- In italiano formale
- Ogni citazione normativa termina con [verificare sul testo AI Act vigente]
- Orientata alla compliance, non generica

Rispondi SOLO con il testo della documentazione, senza intestazioni o spiegazioni aggiuntive.`;

  const text = await generateText(prompt);
  return { documentation: text.trim(), aiWarning: "✦ AI — verifica e conferma" };
}

// ── analyzeBiasIndicators ─────────────────────────────────────────────────
// Analizza la distribuzione delle colonne sensibili per Art. 10(2)(f).
// Riceve solo distribuzioni aggregate — mai dati grezzi.

export interface BiasIndicatorAnalysis {
  columnName: string;
  analysis: string;
}

export interface AnalyzeBiasResult {
  analyses: BiasIndicatorAnalysis[];
  aiWarning: string;
}

export async function analyzeBiasIndicators(input: {
  systemName: string;
  intendedPurpose: string;
  sensitiveColumns: Array<{
    name: string;
    datasetRole: string;
    distribution: Array<{ value: string; count: number; percentage: number }>;
    numericStats?: { min: number; max: number; mean: number; median: number; stdDev: number };
  }>;
}): Promise<AnalyzeBiasResult> {
  if (input.sensitiveColumns.length === 0) {
    return { analyses: [], aiWarning: "✦ AI — verifica e conferma" };
  }

  const columnsDesc = input.sensitiveColumns.map(col => {
    const dist = col.distribution.length > 0
      ? col.distribution.map(d => `  ${d.value}: ${d.count} (${d.percentage}%)`).join("\n")
      : "  distribuzione non disponibile";
    const numStats = col.numericStats
      ? `  media: ${col.numericStats.mean}, mediana: ${col.numericStats.median}, std: ${col.numericStats.stdDev}`
      : "";
    return `Colonna: "${col.name}" (dataset: ${col.datasetRole})\nDistribuzione:\n${dist}${numStats ? "\nStatistiche numeriche:\n" + numStats : ""}`;
  }).join("\n\n");

  const prompt = `Sei un esperto di equità algoritmica e conformità AI Act UE (Art. 10(2)(f) [verify against current AI Act text]).

Sistema AI:
- Nome: ${input.systemName}
- Finalità prevista: ${input.intendedPurpose}

Di seguito le distribuzioni delle colonne identificate come potenzialmente sensibili (dati già aggregati in statistiche — nessun dato grezzo):

${columnsDesc}

Per ciascuna colonna, scrivi un breve paragrafo (3-5 frasi) che:
1. Descrive la distribuzione osservata in termini neutri (usa le percentuali fornite)
2. Segnala — senza affermazioni categoriche — se questa distribuzione potrebbe non rispecchiare la popolazione di riferimento prevista
3. Invita l'utente a verificare se la distribuzione riflette un possibile bias nei dati
4. NON formula conclusioni di conformità/non conformità (richiede giudizio umano)

Termina ogni citazione con [verificare sul testo AI Act vigente].

Rispondi nel formato JSON:
<extract>
{
  "analyses": [
    { "columnName": "nome_colonna", "analysis": "Paragrafo di analisi in italiano..." },
    ...
  ]
}
</extract>`;

  const raw = await generateText(prompt);
  const match = raw.match(/<extract>([\s\S]*?)<\/extract>/);
  if (!match) throw new Error("L'AI non ha restituito un blocco <extract> valido.");

  let parsed: { analyses: BiasIndicatorAnalysis[] };
  try { parsed = JSON.parse(match[1].trim()); }
  catch { throw new Error("Errore parsing JSON dalla risposta AI."); }

  return { analyses: parsed.analyses, aiWarning: "✦ AI — verifica e conferma" };
}
