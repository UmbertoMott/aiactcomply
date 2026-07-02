"use server";
import { generateText } from "@/lib/rag/rag-vertex";

export interface DpiaThreatDraft {
  suggested_mitigation: string;
  suggested_residual_likelihood: "low" | "medium" | "high";
  suggested_residual_severity: "low" | "medium" | "high";
  rationale: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  illegitimate_access: "Accesso illegittimo ai dati",
  unwanted_modification: "Modifica indesiderata dei dati",
  data_disappearance: "Scomparsa dei dati",
};

const LEVEL_LABELS: Record<string, string> = {
  low: "Bassa",
  medium: "Media",
  high: "Alta",
};

export async function draftDpiaThreat(params: {
  systemName: string;
  systemDescription: string;
  threatCategory: string;
  threatDescription: string;
  threatSource: string;
  likelihood: string;
  severity: string;
  personalDataCategories: string;
}): Promise<DpiaThreatDraft | { error: string }> {
  const categoryLabel = CATEGORY_LABELS[params.threatCategory] ?? params.threatCategory;
  const likelihoodLabel = LEVEL_LABELS[params.likelihood] ?? params.likelihood;
  const severityLabel = LEVEL_LABELS[params.severity] ?? params.severity;

  const prompt = `Sei un esperto di DPIA (Data Protection Impact Assessment) ai sensi dell'Art. 35 GDPR e della metodologia WP248 rev.01.

Sistema AI:
- Nome: ${params.systemName}
- Descrizione / finalità del trattamento: ${params.systemDescription}
- Categorie di dati personali trattati: ${params.personalDataCategories}

Minaccia WP248 in analisi:
- Categoria: ${categoryLabel}
- Fonte di rischio / agente di minaccia: ${params.threatSource || "non specificata"}
- Descrizione della minaccia: ${params.threatDescription || "non specificata"}
- Probabilità (iniziale): ${likelihoodLabel}
- Gravità (iniziale): ${severityLabel}

Sulla base del contesto sopra, genera:
1. Una misura di mitigazione concreta e specifica per questa minaccia (max 100 parole, tecnica e/o organizzativa)
2. Il livello di rischio residuo stimato DOPO l'applicazione della misura suggerita:
   - Probabilità residua: low | medium | high
   - Gravità residua: low | medium | high
3. Una rationale di 1-2 frasi che spiega il ragionamento

Rispondi SOLO con JSON valido, nessun testo fuori dal JSON:
{
  "suggested_mitigation": "...",
  "suggested_residual_likelihood": "low|medium|high",
  "suggested_residual_severity": "low|medium|high",
  "rationale": "... [verifica contro il testo vigente del GDPR/WP248]"
}

[verifica contro il testo vigente del GDPR/WP248]`;

  try {
    const text = await generateText(prompt, { temperature: 0.2, maxOutputTokens: 400 });
    const cleaned = text.trim().replace(/^```json\s*/, "").replace(/```$/, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON in response");

    const parsed = JSON.parse(match[0]) as Record<string, unknown>;

    const validLevels = ["low", "medium", "high"] as const;
    const isValidLevel = (v: unknown): v is "low" | "medium" | "high" =>
      typeof v === "string" && (validLevels as readonly string[]).includes(v);

    if (
      typeof parsed.suggested_mitigation !== "string" ||
      !isValidLevel(parsed.suggested_residual_likelihood) ||
      !isValidLevel(parsed.suggested_residual_severity) ||
      typeof parsed.rationale !== "string"
    ) {
      throw new Error("Invalid schema in response");
    }

    return {
      suggested_mitigation: parsed.suggested_mitigation,
      suggested_residual_likelihood: parsed.suggested_residual_likelihood,
      suggested_residual_severity: parsed.suggested_residual_severity,
      rationale: parsed.rationale,
    };
  } catch {
    return { error: "Impossibile generare il suggerimento AI. Compila manualmente." };
  }
}
