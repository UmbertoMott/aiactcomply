"use server";
import { generateText } from "@/lib/rag/rag-vertex";
import { z } from "zod";
import type { GlobalComplianceContext } from "@/hooks/useComplianceContext";

const Art9CoverageSchema = z.object({
  coverageScore: z.number().min(0).max(100),
  assessment: z.string(),
  coveredAreas: z.array(z.string()),
  missingAreas: z.array(z.object({
    area: z.string(),
    art9Requirement: z.string(),
    suggestedRiskTitle: z.string(),
    priority: z.enum(["obbligatorio", "raccomandato"]),
  })),
});

export type Art9Coverage = z.infer<typeof Art9CoverageSchema>;

export async function checkArt9Coverage(
  existingRisks: Array<{ title: string; category: string; description: string }>,
  context: GlobalComplianceContext
): Promise<{ coverage: Art9Coverage | null; error?: string }> {

  if (existingRisks.length < 3) {
    return { coverage: null, error: "INSUFFICIENT_RISKS" };
  }

  const prompt = `Sei un esperto di EU AI Act Art. 9 — sistema di gestione dei rischi.
Valuti se i rischi identificati coprono adeguatamente i requisiti dell'Art. 9 per il tier dichiarato.

Art. 9(2) richiede che il sistema di gestione dei rischi identifichi e analizzi i rischi noti e
ragionevolmente prevedibili. Per i sistemi ad alto rischio, deve essere continuo per tutta la
durata del ciclo di vita.

REGOLE OBBLIGATORIE:
- art9Requirement deve terminare con "[verify against current AI Act text]"
- Sii specifico sugli articoli dell'Art. 9 non coperti
- Non inventare requisiti inesistenti
- coverageScore 0-100: 100 = copertura completa per quel tier
- Rispondi SOLO con JSON valido, nessun testo fuori dal JSON

Sistema: "${context.systemName ?? "Sistema AI"}"
Tier: ${context.riskTier ?? "non determinato"}

Rischi già identificati (${existingRisks.length}):
${existingRisks.map((r, i) => `${i + 1}. [${r.category}] ${r.title}: ${r.description.slice(0, 100)}`).join("\n")}

Formato JSON atteso:
{
  "coverageScore": 0-100,
  "assessment": "...",
  "coveredAreas": ["...", "..."],
  "missingAreas": [
    {
      "area": "...",
      "art9Requirement": "... [verify against current AI Act text]",
      "suggestedRiskTitle": "...",
      "priority": "obbligatorio|raccomandato"
    }
  ]
}`;

  try {
    const text = await generateText(prompt, { temperature: 0.2, maxOutputTokens: 1200 });
    const cleaned = text.trim().replace(/^```json\s*/, "").replace(/```$/, "").trim();
    const parsed = Art9CoverageSchema.parse(JSON.parse(cleaned));
    return { coverage: parsed };
  } catch {
    return { coverage: null, error: "GENERATION_FAILED" };
  }
}
