"use server";
import { generateText } from "@/lib/rag/rag-vertex";
import { z } from "zod";

const DualRoleSchema = z.object({
  isDualRole: z.boolean(),
  roleVerdict: z.enum(["provider", "deployer", "both_provider_and_deployer", "unclear"]),
  art25Applies: z.boolean(),
  art25Obligations: z.array(z.string()),
  substantialModification: z.boolean(),
  substantialModificationReason: z.string(),
  riskLevel: z.enum(["low", "medium", "high"]),
  summary: z.string(),
});

export type DualRoleResult = z.infer<typeof DualRoleSchema>;

export async function detectDualRole(
  systemName: string,
  vendorName: string,
  modificationsDescription: string
): Promise<{ result: DualRoleResult | null; error?: string }> {
  if (!systemName.trim() || !vendorName.trim()) {
    return { result: null, error: "MISSING_INPUT" };
  }

  const prompt = `Sei un esperto di EU AI Act Art. 25 — Obblighi dei deployer di sistemi AI ad alto rischio.
Analizza se un'organizzazione che usa e modifica un sistema AI di terze parti assume il ruolo di provider
ai sensi dell'Art. 25(1) e (3).

Art. 25(1): Un deployer diventa provider se:
(a) usa il sistema con proprio marchio o nome
(b) apporta modifiche sostanziali che cambiano scopo/destinazione
(c) modifica un sistema non-alto-rischio in modo da renderlo alto rischio

Art. 25(3): La "modifica sostanziale" include cambi al fine previsto, all'output, alle caratteristiche tecniche
significative. NON include personalizzazioni minori (UI, parametri, traduzioni).

REGOLE:
- art25Obligations deve terminare con "[verify against current AI Act text]" per ogni voce
- summary deve essere specifico al caso
- Rispondi SOLO con JSON valido, nessun testo fuori dal JSON

Sistema di base (vendor): "${vendorName}"
Sistema dell'organizzazione: "${systemName}"
Modifiche apportate: "${modificationsDescription || "nessuna modifica descritta"}"

Formato JSON atteso:
{
  "isDualRole": true|false,
  "roleVerdict": "provider|deployer|both_provider_and_deployer|unclear",
  "art25Applies": true|false,
  "art25Obligations": ["...[verify against current AI Act text]", "..."],
  "substantialModification": true|false,
  "substantialModificationReason": "...",
  "riskLevel": "low|medium|high",
  "summary": "..."
}`;

  try {
    const text = await generateText(prompt, { temperature: 0.1, maxOutputTokens: 900 });
    const cleaned = text.trim().replace(/^```json\s*/, "").replace(/```$/, "").trim();
    const parsed = DualRoleSchema.parse(JSON.parse(cleaned));
    return { result: parsed };
  } catch {
    return { result: null, error: "GENERATION_FAILED" };
  }
}
