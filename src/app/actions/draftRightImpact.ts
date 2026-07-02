"use server";
import { generateText } from "@/lib/rag/rag-vertex";
import { z } from "zod";

const RightImpactDraftSchema = z.object({
  scenario_brief: z.string(),
  severity_rationale: z.string(),
  suggested_extent: z.enum(["very_serious","serious","moderate","minor","none"]),
  suggested_scope: z.enum(["systemic","large_group","group","individual"]),
  suggested_gravity: z.enum(["critical","high","medium","low"]),
  suggested_irreversibility: z.enum(["irreversible","partially","reversible"]),
  suggested_likelihood: z.enum(["almost_certain","likely","possible","negligible"]),
  mitigation_hints: z.array(z.string()),
});

export type RightImpactDraft = z.infer<typeof RightImpactDraftSchema>;

export async function draftRightImpact(params: {
  systemName: string;
  systemDescription: string;
  riskLevel: string;
  scenarioTitle: string;
  scenarioDescription: string;
  rightId: string;
  rightName: string;
  rightDescription: string;
  triggerQuestions: string[];
}): Promise<RightImpactDraft | { error: string }> {
  const prompt = `Sei un esperto di FRIA (Fundamental Rights Impact Assessment, Art. 27 EU AI Act).

Sistema AI:
- Nome: ${params.systemName}
- Descrizione: ${params.systemDescription}
- Risk level: ${params.riskLevel}

Scenario di analisi: "${params.scenarioTitle}"
Descrizione scenario: ${params.scenarioDescription}

Diritto fondamentale da valutare: ${params.rightName}
Descrizione: ${params.rightDescription}

Domande trigger per questo diritto:
${params.triggerQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

Genera una valutazione preliminare di impatto per QUESTO specifico diritto in QUESTO scenario.

IMPORTANTE: Usa i valori esatti indicati per ogni campo.

Rispondi con JSON valido:
{
  "scenario_brief": "2-3 frasi su come questo sistema può impattare il diritto indicato in questo scenario",
  "severity_rationale": "Spiegazione del perché hai scelto questi livelli di severità (2-3 frasi)",
  "suggested_extent": "very_serious|serious|moderate|minor|none",
  "suggested_scope": "systemic|large_group|group|individual",
  "suggested_gravity": "critical|high|medium|low",
  "suggested_irreversibility": "irreversible|partially|reversible",
  "suggested_likelihood": "almost_certain|likely|possible|negligible",
  "mitigation_hints": ["misura 1", "misura 2", "misura 3"]
}

Nota: scenario_brief e severity_rationale devono terminare con '[verifica contro il testo vigente dell'AI Act]'.
Solo JSON valido, nessun testo fuori.`;

  try {
    const text = await generateText(prompt, { temperature: 0.15, maxOutputTokens: 1000 });
    const cleaned = text.trim().replace(/^```json\s*/, "").replace(/```$/, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON");
    return RightImpactDraftSchema.parse(JSON.parse(match[0]));
  } catch {
    return { error: "Impossibile generare la bozza. Compila manualmente." };
  }
}
