"use server";
import { generateText } from "@/lib/rag/rag-vertex";
import { z } from "zod";
import type { GlobalComplianceContext } from "@/hooks/useComplianceContext";

const AdaptedRiskSchema = z.object({
  adaptedTitle: z.string(),
  adaptedDescription: z.string(),
  relevanceReason: z.string(),
  suggestedLikelihood: z.enum(["low", "medium", "high"]),
  suggestedImpact: z.enum(["low", "medium", "high"]),
  likelihoodBasis: z.string(),
  impactBasis: z.string(),
  art9Reference: z.string(),
});

export type AdaptedRisk = z.infer<typeof AdaptedRiskSchema>;

export async function adaptRiskToSystem(
  catalogItem: { title: string; description: string; category: string },
  context: GlobalComplianceContext
): Promise<{ risk: AdaptedRisk | null; error?: string }> {
  if (!context.systemName && !context.systemDescription) {
    return { risk: null, error: "CONTEXT_MISSING" };
  }

  const prompt = `Esperto EU AI Act Art. 9. Adatta il rischio al sistema specifico. Rispondi SOLO con JSON.

Rischio: "${catalogItem.title}" — ${catalogItem.description} (categoria: ${catalogItem.category})
Sistema: "${context.systemName ?? "Sistema AI"}", ${context.systemDescription ?? ""}, tier: ${context.riskTier ?? "?"}

JSON (tutti i campi obbligatori):
{"adaptedTitle":"...","adaptedDescription":"...specifica al sistema...","relevanceReason":"...","suggestedLikelihood":"low|medium|high","suggestedImpact":"low|medium|high","likelihoodBasis":"... [verify against current AI Act text]","impactBasis":"... [verify against current AI Act text]","art9Reference":"Art. 9(?) [verify against current AI Act text]"}`;

  try {
    const text = await generateText(prompt, { temperature: 0.2, maxOutputTokens: 350 });
    const cleaned = text.trim().replace(/^```json\s*/, "").replace(/```$/, "").trim();
    const parsed = AdaptedRiskSchema.parse(JSON.parse(cleaned));
    return { risk: parsed };
  } catch {
    return { risk: null, error: "GENERATION_FAILED" };
  }
}
