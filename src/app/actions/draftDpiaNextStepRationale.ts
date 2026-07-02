"use server";
import { generateText } from "@/lib/rag/rag-vertex";

export interface DpiaNextStepRationale {
  rationale: string;
}

export async function draftDpiaNextStepRationale(params: {
  stepKey: string;
  stepTitle: string;
  systemName: string;
  dpiaSummary: string;
}): Promise<DpiaNextStepRationale | { error: string }> {
  const prompt = `Sei un esperto di DPIA (Art. 35 GDPR) e metodologia WP248 rev.01. L'utente sta compilando una DPIA per il sistema "${params.systemName}".

Stato attuale della DPIA (JSON):
${params.dpiaSummary}

Il prossimo passo consigliato è: "${params.stepTitle}" (key: ${params.stepKey})

Spiega in 2-3 frasi PERCHÉ questo è il passo prioritario ora, riferendoti concretamente ai dati presenti nella DPIA. Usa un linguaggio diretto e operativo. Non ripetere il titolo del passo.

Rispondi con JSON:
{"rationale": "..."}

[verifica contro il testo vigente del GDPR/WP248]`;

  try {
    const text = await generateText(prompt, { temperature: 0.3, maxOutputTokens: 200 });
    const cleaned = text.trim().replace(/^```json\s*/m, "").replace(/```\s*$/m, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON");
    const parsed = JSON.parse(match[0]) as { rationale?: string };
    if (typeof parsed.rationale !== "string") throw new Error("Invalid schema");
    return { rationale: parsed.rationale };
  } catch {
    return { error: "Impossibile generare il razionale. Riprova." };
  }
}
