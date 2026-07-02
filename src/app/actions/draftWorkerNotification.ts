"use server";
import { generateText } from "@/lib/rag/rag-vertex";
import { z } from "zod";

const WorkerNotificationSchema = z.object({
  notificationText: z.string(),
  art26Requirements: z.array(z.object({
    requirement: z.string(),
    article: z.string(),
    addressedInDraft: z.boolean(),
  })),
  legalBasisSuggestion: z.string(),
  readabilityScore: z.enum(["semplice", "medio", "complesso"]),
  warnings: z.array(z.string()),
});

export type WorkerNotificationResult = z.infer<typeof WorkerNotificationSchema>;

export async function draftWorkerNotification(
  systemName: string,
  systemPurpose: string,
  deploymentContext: string,
  affectedRoles: string
): Promise<{ result: WorkerNotificationResult | null; error?: string }> {
  if (!systemName.trim() || !deploymentContext.trim()) {
    return { result: null, error: "MISSING_INPUT" };
  }

  const prompt = `Sei un esperto di EU AI Act Art. 26(7) — informazione ai lavoratori.
Redigi una bozza di notifica ai lavoratori per l'introduzione di un sistema AI ad alto rischio.

Art. 26(7): Il deployer deve informare i rappresentanti dei lavoratori e i lavoratori interessati
prima dell'introduzione di sistemi AI ad alto rischio sul posto di lavoro, nel rispetto del
diritto dell'Unione e nazionale in materia di informazione e consultazione.

La notifica deve essere chiara, comprensibile e includere: scopo del sistema, impatto sul lavoro,
misure di supervisione umana, diritti dei lavoratori.

REGOLE OBBLIGATORIE:
- article deve terminare con "[verify against current AI Act text]"
- notificationText deve essere in italiano, professionale ma comprensibile
- Rispondi SOLO con JSON valido

Sistema AI: "${systemName}"
Scopo: "${systemPurpose}"
Contesto deployment: "${deploymentContext}"
Ruoli coinvolti: "${affectedRoles || "lavoratori interessati"}"

Formato JSON:
{
  "notificationText": "Gentili colleghe e colleghi,\n\n...",
  "art26Requirements": [
    {
      "requirement": "...",
      "article": "Art. 26(...) [verify against current AI Act text]",
      "addressedInDraft": true|false
    }
  ],
  "legalBasisSuggestion": "...",
  "readabilityScore": "semplice|medio|complesso",
  "warnings": ["..."]
}`;

  try {
    const text = await generateText(prompt, { temperature: 0.3, maxOutputTokens: 1200 });
    const cleaned = text.trim().replace(/^```json\s*/, "").replace(/```$/, "").trim();
    const parsed = WorkerNotificationSchema.parse(JSON.parse(cleaned));
    return { result: parsed };
  } catch {
    return { result: null, error: "GENERATION_FAILED" };
  }
}
