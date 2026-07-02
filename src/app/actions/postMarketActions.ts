"use server";
import { generateText } from "@/lib/rag/rag-vertex";
import type { PostMarketMonitoringPlan, LogVaultMetricsSnapshot, FlaggedAnomaly } from "@/lib/post-market/post-market-types";

export interface DraftReportResult {
  narrative: string;
  flaggedAnomalies: FlaggedAnomaly[];
  aiConfirmed: false;
}

export async function draftPostMarketReport(
  plan: PostMarketMonitoringPlan,
  metrics: LogVaultMetricsSnapshot
): Promise<DraftReportResult> {
  const prompt = `Sei un esperto di conformità AI Act UE (Reg. 2024/1689), specializzato in Post-Market Monitoring (Art. 72).

Stai redigendo un report di monitoraggio post-market per un sistema AI ad alto rischio.

PIANO DI MONITORAGGIO ATTIVO:
- Descrizione sistema: ${plan.pmmSystemDescription || "non specificato"}
- Metodologia: ${plan.monitoringMethodology || "non specificata"}
- Frequenza raccolta dati: ${plan.dataCollectionFrequency}
- Data messa in servizio: ${plan.inServiceDate ?? "non specificata"}

METRICHE DEL PERIODO (${metrics.periodStart} → ${metrics.periodEnd}):
- Totale eventi registrati: ${metrics.totalEvents}
- Error rate: ${metrics.errorRate !== undefined ? (metrics.errorRate * 100).toFixed(2) + "%" : "non disponibile"}
- Anomalie rilevate: ${metrics.anomalyCount ?? "n/a"}
- Dati reali: ${metrics.hasRealData ? "sì" : "no (dati simulati/seed)"}

ISTRUZIONI:
1. Scrivi un paragrafo narrativo (max 250 parole) del periodo di monitoraggio, includendo: stato generale del sistema, trend principali, eventuali criticità emerse.
2. Identifica le anomalie da segnalare (max 3), con riferimento al Risk Register dove pertinente.
3. Ogni citazione normativa deve terminare con [verify against current AI Act text].
4. Output SOLO nel formato:
<extract>
{
  "narrative": "...",
  "flaggedAnomalies": [
    { "metric": "error_rate", "description": "...", "riskRegisterRef": "RISK-001 [verify against current AI Act text]", "severity": "high" }
  ]
}
</extract>

IMPORTANTE: questo è un draft per revisione umana. Il campo aiConfirmed sarà false finché il compliance officer non approva esplicitamente.`;

  const raw = await generateText(prompt);
  const match = raw.match(/<extract>([\s\S]*?)<\/extract>/);
  if (!match) throw new Error("L'AI non ha restituito un blocco <extract> valido.");

  let parsed: { narrative: string; flaggedAnomalies: FlaggedAnomaly[] };
  try { parsed = JSON.parse(match[1].trim()); }
  catch { throw new Error("Errore parsing JSON dalla risposta AI."); }

  return {
    narrative: parsed.narrative ?? "",
    flaggedAnomalies: parsed.flaggedAnomalies ?? [],
    aiConfirmed: false,
  };
}

export interface ProposePMMPlanResult {
  pmmSystemDescription: string;
  monitoringMethodology: string;
  dataCollectionFrequency: "continuous" | "monthly" | "quarterly" | "annual";
  rationale: string;
  aiConfirmed: false;
}

export async function proposePMMPlan(input: {
  systemName: string;
  systemRole: string;
  tier: string;
  riskLevel?: string;
}): Promise<ProposePMMPlanResult> {
  const prompt = `Sei un esperto di conformità AI Act UE. Proponi un Piano di Monitoraggio Post-Market (PMM) per un sistema AI ad alto rischio ai sensi dell'Art. 72 [verify against current AI Act text].

Sistema: "${input.systemName}"
Ruolo: ${input.systemRole}
Tier: ${input.tier}
Livello di rischio Risk Register: ${input.riskLevel ?? "non specificato"}

Proponi:
- Una descrizione sintetica del sistema dal punto di vista PMM (max 2 frasi)
- La metodologia di monitoraggio più adatta (es. log analysis, user feedback, human oversight review, statistical sampling)
- La frequenza di raccolta dati consigliata
- Un breve razionale

Ogni citazione normativa deve terminare con [verify against current AI Act text].

Rispondi SOLO nel formato JSON:
<extract>
{
  "pmmSystemDescription": "...",
  "monitoringMethodology": "...",
  "dataCollectionFrequency": "quarterly",
  "rationale": "..."
}
</extract>`;

  const raw = await generateText(prompt);
  const match = raw.match(/<extract>([\s\S]*?)<\/extract>/);
  if (!match) throw new Error("L'AI non ha restituito un blocco <extract> valido.");

  let parsed: Omit<ProposePMMPlanResult, "aiConfirmed">;
  try { parsed = JSON.parse(match[1].trim()); }
  catch { throw new Error("Errore parsing JSON dalla risposta AI."); }

  return { ...parsed, aiConfirmed: false };
}
