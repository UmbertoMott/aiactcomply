"use server";
import { generateText } from "@/lib/rag/rag-vertex";
import { z } from "zod";
import type { GlobalComplianceContext } from "@/hooks/useComplianceContext";

const CoherenceReportSchema = z.object({
  inconsistencies: z.array(z.object({
    field: z.string(),
    docuGenValue: z.string(),
    contextValue: z.string(),
    sourceContext: z.string(),
    severity: z.enum(["info", "warning", "critical"]),
    explanation: z.string(),
    art11Reference: z.string(),
  })),
  coherenceScore: z.number().min(0).max(100),
  overallStatus: z.enum(["coerente", "attenzione_richiesta", "incoerenze_critiche"]),
});

export type CoherenceReport = z.infer<typeof CoherenceReportSchema>;

export async function validateDocuGenCoherence(
  docuGenData: Record<string, unknown>,
  context: GlobalComplianceContext
): Promise<{ report: CoherenceReport | null; error?: string }> {
  const filledFields = Object.values(docuGenData).filter(v => typeof v === "string" && (v as string).trim().length > 5).length;
  if (filledFields < 3) {
    return { report: null, error: "INSUFFICIENT_CONTENT" };
  }

  const contextSummary = {
    riskTier: context.riskTier,
    annexIII: context.annexIII,
    identifiedRisksCount: context.identifiedRisks?.length ?? 0,
    overallRiskLevel: context.overallRiskLevel,
    humanOversightRequired: context.humanOversightRequired,
    personalData: context.personalData,
  };

  const prompt = `Sei un esperto di EU AI Act Art. 11 — documentazione tecnica coerente.
Confronta la documentazione tecnica compilata con i dati degli altri tool (GlobalComplianceContext)
per individuare incongruenze che potrebbero invalidare la conformità.

Art. 11(1): La documentazione tecnica deve essere accurata e riflettere lo stato reale del sistema.

Tipi di incoerenza da cercare:
- Tier di rischio dichiarato in DocuGen ≠ tier dal Classificatore
- Dati personali in DocuGen ≠ risultati Data Audit
- Supervisione umana in DocuGen ≠ configurazione Oversight
- Sistema descritto come GPAI ma contesto non lo indica

REGOLE:
- art11Reference deve terminare con "[verify against current AI Act text — Art. 11]"
- "critical" = incoerenza che potrebbe invalidare la conformità
- Se non ci sono incongruenze, restituisci array vuoto e coherenceScore: 100
- Rispondi SOLO con JSON valido

DocuGen data:
${JSON.stringify(docuGenData, null, 2)}

GlobalComplianceContext (da altri tool):
${JSON.stringify(contextSummary, null, 2)}

Formato JSON:
{
  "inconsistencies": [
    {
      "field": "...",
      "docuGenValue": "...",
      "contextValue": "...",
      "sourceContext": "Classificatore|Risk Manager|Data Audit|Oversight",
      "severity": "info|warning|critical",
      "explanation": "...",
      "art11Reference": "Art. 11(...) [verify against current AI Act text — Art. 11]"
    }
  ],
  "coherenceScore": 0-100,
  "overallStatus": "coerente|attenzione_richiesta|incoerenze_critiche"
}`;

  try {
    const text = await generateText(prompt, { temperature: 0.1, maxOutputTokens: 1200 });
    const cleaned = text.trim().replace(/^```json\s*/, "").replace(/```$/, "").trim();
    const parsed = CoherenceReportSchema.parse(JSON.parse(cleaned));
    return { report: parsed };
  } catch {
    return { report: null, error: "GENERATION_FAILED" };
  }
}
