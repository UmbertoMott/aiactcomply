"use server";
import { generateText } from "@/lib/rag/rag-vertex";
import { z } from "zod";

const IncidentClassificationSchema = z.object({
  isSerious: z.boolean(),
  seriousnessLevel: z.enum(["non_grave", "grave", "grave_urgente"]),
  matchedCriteria: z.array(z.string()),
  notificationDeadline: z.object({
    hours: z.number().nullable(),
    days: z.number().nullable(),
    basis: z.string(),
  }),
  competentAuthority: z.string(),
  immediateActions: z.array(z.string()),
  art73Reference: z.string(),
  recommendation: z.string(),
});

export type IncidentClassification = z.infer<typeof IncidentClassificationSchema>;

export async function classifyIncident(
  incidentDescription: string,
  systemTier: string | null,
  affectedPersons: string,
  incidentDate: string
): Promise<{ classification: IncidentClassification | null; error?: string }> {
  if (!incidentDescription.trim()) {
    return { classification: null, error: "MISSING_INPUT" };
  }

  const prompt = `Sei un esperto di EU AI Act Art. 73 — notifica di incidenti gravi.
Classifica l'incidente descritto e determina gli obblighi di notifica.

Art. 3(49) — Incidente grave: malfunzionamento o performance al di sotto del livello atteso
di un sistema AI ad alto rischio che causa o può causare:
- morte o danno grave alla salute di persone fisiche
- perturbazione grave e irreversibile di infrastrutture critiche
- violazione di obblighi a protezione dei diritti fondamentali UE
- danno grave alla proprietà o all'ambiente

Art. 73(1): I provider di sistemi ad alto rischio notificano senza indebito ritardo.
Art. 73(3): Se vi è rischio per la vita, notifica entro 24 ore.
Regola generale: notifica entro 15 giorni (days: 15) dall'incidente o dalla sua conoscenza.

REGOLE OBBLIGATORIE:
- art73Reference deve terminare con "[verify against current AI Act text — Art. 73]"
- seriousnessLevel "grave_urgente" = rischio per la vita → hours: 24, days: null
- seriousnessLevel "grave" = grave non urgente → hours: null, days: 15
- seriousnessLevel "non_grave" → hours: null, days: null
- Se systemTier non è high_risk o è null, nota che Art. 73 potrebbe non applicarsi direttamente
- Rispondi SOLO con JSON valido

Descrizione incidente: "${incidentDescription}"
Tier sistema: ${systemTier ?? "non specificato"}
Persone coinvolte: "${affectedPersons}"
Data/ora incidente: "${incidentDate}"

Formato JSON:
{
  "isSerious": true|false,
  "seriousnessLevel": "non_grave|grave|grave_urgente",
  "matchedCriteria": ["...", "..."],
  "notificationDeadline": {
    "hours": 24|null,
    "days": 15|null,
    "basis": "Art. 73(...) [verify against current AI Act text — Art. 73]"
  },
  "competentAuthority": "...",
  "immediateActions": ["...", "..."],
  "art73Reference": "Art. 73 Reg. UE 2024/1689 [verify against current AI Act text — Art. 73]",
  "recommendation": "..."
}`;

  try {
    const text = await generateText(prompt, { temperature: 0.1, maxOutputTokens: 900 });
    const cleaned = text.trim().replace(/^```json\s*/, "").replace(/```$/, "").trim();
    const parsed = IncidentClassificationSchema.parse(JSON.parse(cleaned));
    return { classification: parsed };
  } catch {
    return { classification: null, error: "GENERATION_FAILED" };
  }
}
