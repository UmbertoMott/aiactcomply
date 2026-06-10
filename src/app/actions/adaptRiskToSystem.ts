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

  const prompt = `Sei un esperto di EU AI Act Art. 9 (gestione dei rischi).
Adatti un rischio generico di catalogo al sistema AI specifico dell'utente.

REGOLE OBBLIGATORIE:
- likelihoodBasis e impactBasis devono terminare con "[verify against current AI Act text]"
- art9Reference deve citare il sottoparagrafo specifico dell'Art. 9 più pertinente (es. "Art. 9(2)(a) [verify against current AI Act text]")
- adaptedDescription deve essere specifica al sistema, non generica
- Non inventare obblighi inesistenti
- Rispondi SOLO con JSON valido, nessun testo fuori dal JSON

Rischio di catalogo da adattare:
- Titolo: "${catalogItem.title}"
- Descrizione: "${catalogItem.description}"
- Categoria: "${catalogItem.category}"

Sistema AI dell'utente:
- Nome: "${context.systemName ?? "Sistema AI"}"
- Descrizione: "${context.systemDescription ?? "non specificata"}"
- Tier: ${context.riskTier ?? "non determinato"}
- Processa dati personali: ${context.personalData ? "sì" : "non confermato"}
- Supervisione umana richiesta: ${context.humanOversightRequired ? "sì" : "non confermato"}

Formato JSON atteso:
{
  "adaptedTitle": "...",
  "adaptedDescription": "...",
  "relevanceReason": "...",
  "suggestedLikelihood": "low|medium|high",
  "suggestedImpact": "low|medium|high",
  "likelihoodBasis": "... [verify against current AI Act text]",
  "impactBasis": "... [verify against current AI Act text]",
  "art9Reference": "Art. 9(...) [verify against current AI Act text]"
}`;

  try {
    const text = await generateText(prompt, { temperature: 0.2, maxOutputTokens: 800 });
    const cleaned = text.trim().replace(/^```json\s*/, "").replace(/```$/, "").trim();
    const parsed = AdaptedRiskSchema.parse(JSON.parse(cleaned));
    return { risk: parsed };
  } catch {
    return { risk: null, error: "GENERATION_FAILED" };
  }
}
