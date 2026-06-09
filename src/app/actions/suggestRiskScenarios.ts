"use server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const RiskScenarioSchema = z.object({
  scenarios: z.array(z.object({
    name:            z.string(),
    description:     z.string(),
    likelihood:      z.number().min(1).max(5),
    severity:        z.number().min(1).max(5),
    affectedGroups:  z.array(z.string()),
    mitigationHint:  z.string(),
  })).min(3).max(6),
});

export type SuggestedRiskScenario = z.infer<typeof RiskScenarioSchema>["scenarios"][0];

export async function suggestRiskScenarios(
  systemName: string,
  systemDescription: string,
  riskLevel: string,
  annexIII: boolean
): Promise<{ scenarios: SuggestedRiskScenario[] } | { error: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "ANTHROPIC_API_KEY non configurata." };

  const client = new Anthropic({ apiKey });

  const prompt = `Sei un esperto di risk management per sistemi AI in conformità con l'Art. 9 EU AI Act.

Sistema AI da analizzare:
- Nome: ${systemName}
- Descrizione: ${systemDescription}
- Livello di rischio: ${riskLevel}
- Allegato III applicabile: ${annexIII ? "sì" : "no"}

Genera 4-5 scenari di rischio specifici per questo sistema AI, conformi all'Art. 9(4) EU AI Act
che richiede di considerare i gruppi vulnerabili.

Per ogni scenario indica:
- name: nome breve del rischio (max 8 parole)
- description: descrizione del rischio specifico per questo sistema (2-3 frasi)
- likelihood: probabilità 1-5 (1=improbabile, 5=quasi certo)
- severity: gravità dell'impatto 1-5 (1=trascurabile, 5=grave/irreversibile)
- affectedGroups: array di categorie di persone potenzialmente a rischio
- mitigationHint: una misura di mitigazione concreta (1 frase)

Rispondi SOLO con JSON valido, nessun testo fuori dal JSON.
Formato esatto: { "scenarios": [ {...}, {...} ] }`;

  try {
    const response = await client.messages.create({
      model:      "claude-haiku-4-5",
      max_tokens: 1500,
      messages:   [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const cleaned = text.trim().replace(/^```json\s*/, "").replace(/```$/, "").trim();
    const json = JSON.parse(cleaned);
    return RiskScenarioSchema.parse(json);
  } catch {
    return { error: "Impossibile generare scenari. Riprova o inserisci manualmente." };
  }
}
