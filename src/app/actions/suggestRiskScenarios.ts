"use server";
import { generateText } from "@/lib/rag/rag-vertex";
import { z } from "zod";
import type { GlobalComplianceContext } from "@/hooks/useComplianceContext";

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

// ── New signature: accepts GlobalComplianceContext ─────────────────────────
export async function suggestRiskScenarios(
  context: GlobalComplianceContext
): Promise<{ scenarios: SuggestedRiskScenario[] } | { error: string }> {

  // Guard: context insufficiente
  if (!context.riskTier || context.riskTier === "unclassified") {
    return { error: "CONTEXT_MISSING" };
  }

  const prompt = `Sei un esperto di risk management per sistemi AI in conformità con l'Art. 9 EU AI Act.

Sistema AI da analizzare:
- Nome: ${context.systemName ?? "Sistema AI"}
- Descrizione: ${context.systemDescription ?? "nessuna descrizione"}
- Livello di rischio: ${context.riskTier}
- Allegato III applicabile: ${context.annexIII ? "sì" : "no"}
- Articoli applicabili: ${context.applicableArticles?.join(", ") ?? "non determinati"}

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
    const text = await generateText(prompt, { temperature: 0.2, maxOutputTokens: 1500 });
    const cleaned = text.trim().replace(/^```json\s*/, "").replace(/```$/, "").trim();
    const json = JSON.parse(cleaned);
    return RiskScenarioSchema.parse(json);
  } catch {
    return { error: "Impossibile generare scenari. Riprova o inserisci manualmente." };
  }
}
