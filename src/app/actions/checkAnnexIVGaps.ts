"use server";
import { generateText } from "@/lib/rag/rag-vertex";
import { z } from "zod";

const AnnexIVGapsSchema = z.object({
  coverageScore: z.number().min(0).max(100),
  presentSections: z.array(z.string()),
  missingSections: z.array(z.object({
    section: z.string(),
    annexIVRef: z.string(),
    description: z.string(),
    priority: z.enum(["obbligatorio", "raccomandato"]),
  })),
  summary: z.string(),
});

export type AnnexIVGapsResult = z.infer<typeof AnnexIVGapsSchema>;

export async function checkAnnexIVGaps(
  documentContent: {
    systemName: string;
    provider: string;
    purpose: string;
    capabilities: string;
    limitations: string;
    humanOversight: string;
    performanceMetrics: string;
    trainingData: string;
  }
): Promise<{ result: AnnexIVGapsResult | null; error?: string }> {
  if (!documentContent.systemName.trim()) {
    return { result: null, error: "MISSING_INPUT" };
  }

  const filled = Object.values(documentContent).filter(v => v.trim().length > 20).length;
  if (filled < 3) {
    return { result: null, error: "INSUFFICIENT_CONTENT" };
  }

  const prompt = `Sei un esperto di EU AI Act Allegato IV — contenuto della documentazione tecnica.
Verifica se la documentazione tecnica fornita copre tutti i requisiti dell'Allegato IV.

Allegato IV richiede (elenco non esaustivo):
1. Descrizione generale del sistema AI
2. Descrizione degli elementi del sistema e del processo di sviluppo
3. Informazioni dettagliate sulle performance del sistema
4. Descrizione del processo di monitoraggio, funzionamento e controllo
5. Descrizione delle capacità e dei limiti
6. Descrizione dell'hardware su cui deve operare il sistema
7. Descrizione delle modifiche apportate durante il ciclo di vita

REGOLE:
- annexIVRef deve citare il punto specifico dell'Allegato IV (es. "All. IV §1(a) [verify against current AI Act text]")
- Rispondi SOLO con JSON valido

Documentazione analizzata:
- Sistema: "${documentContent.systemName}"
- Provider: "${documentContent.provider}"
- Scopo: "${documentContent.purpose}"
- Capacità: "${documentContent.capabilities}"
- Limitazioni: "${documentContent.limitations}"
- Supervisione umana: "${documentContent.humanOversight}"
- Metriche performance: "${documentContent.performanceMetrics}"
- Dati training: "${documentContent.trainingData}"

Formato JSON:
{
  "coverageScore": 0-100,
  "presentSections": ["..."],
  "missingSections": [
    {
      "section": "...",
      "annexIVRef": "All. IV §... [verify against current AI Act text]",
      "description": "...",
      "priority": "obbligatorio|raccomandato"
    }
  ],
  "summary": "..."
}`;

  try {
    const text = await generateText(prompt, { temperature: 0.2, maxOutputTokens: 1000 });
    const cleaned = text.trim().replace(/^```json\s*/, "").replace(/```$/, "").trim();
    const parsed = AnnexIVGapsSchema.parse(JSON.parse(cleaned));
    return { result: parsed };
  } catch {
    return { result: null, error: "GENERATION_FAILED" };
  }
}
