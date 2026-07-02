"use server";
import { generateText } from "@/lib/rag/rag-vertex";
import { z } from "zod";

const PriorConsultationSchema = z.object({
  consultationRequired: z.boolean(),
  consultationBasis: z.string(),
  residualRiskLevel: z.enum(["low", "medium", "high"]),
  gdprArticle36Assessment: z.string(),
  requiredActions: z.array(z.object({
    action: z.string(),
    article: z.string(),
    deadline: z.string(),
    priority: z.enum(["obbligatorio", "raccomandato"]),
  })),
  authorityToConsult: z.string(),
  submissionChecklist: z.array(z.string()),
});

export type PriorConsultationResult = z.infer<typeof PriorConsultationSchema>;

export async function checkPriorConsultation(
  dpiaConclusion: {
    overallRiskAfter: "high" | "medium" | "low" | "";
    technicalMeasures: string;
    organizationalMeasures: string;
    systemName: string;
    processingPurposes: string;
    specialCategories: string;
  }
): Promise<{ result: PriorConsultationResult | null; error?: string }> {
  if (!dpiaConclusion.systemName.trim()) {
    return { result: null, error: "MISSING_INPUT" };
  }

  const prompt = `Sei un esperto di GDPR Art. 36 — consultazione preventiva dell'autorità di controllo.
Valuta se, sulla base della DPIA completata, è necessaria la consultazione preventiva del Garante.

GDPR Art. 36(1): Il responsabile del trattamento deve consultare l'autorità di controllo PRIMA del
trattamento quando la DPIA indica che il trattamento presenta un rischio ELEVATO residuo dopo le misure.

Art. 36(3) richiede la comunicazione di: (a) responsabilità tra titolari e DPO, (b) scopi e mezzi,
(c) misure di protezione adottate, (d) dati di contatto del DPO, (e) la DPIA stessa.

REGOLE:
- article deve terminare con "[verify against current AI Act text]" o "[verify against current GDPR text]"
- Rispondi SOLO con JSON valido

Sistema: "${dpiaConclusion.systemName}"
Rischio residuo post-misure: "${dpiaConclusion.overallRiskAfter}"
Misure tecniche: "${dpiaConclusion.technicalMeasures}"
Misure organizzative: "${dpiaConclusion.organizationalMeasures}"
Scopi del trattamento: "${dpiaConclusion.processingPurposes}"
Categorie speciali: "${dpiaConclusion.specialCategories || "nessuna"}"

Formato JSON:
{
  "consultationRequired": true|false,
  "consultationBasis": "...",
  "residualRiskLevel": "low|medium|high",
  "gdprArticle36Assessment": "...",
  "requiredActions": [
    {
      "action": "...",
      "article": "Art. 36(...) [verify against current GDPR text]",
      "deadline": "...",
      "priority": "obbligatorio|raccomandato"
    }
  ],
  "authorityToConsult": "...",
  "submissionChecklist": ["..."]
}`;

  try {
    const text = await generateText(prompt, { temperature: 0.1, maxOutputTokens: 900 });
    const cleaned = text.trim().replace(/^```json\s*/, "").replace(/```$/, "").trim();
    const parsed = PriorConsultationSchema.parse(JSON.parse(cleaned));
    return { result: parsed };
  } catch {
    return { result: null, error: "GENERATION_FAILED" };
  }
}
