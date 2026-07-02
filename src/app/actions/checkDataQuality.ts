"use server";
import { generateText } from "@/lib/rag/rag-vertex";
import { z } from "zod";

const DataQualitySchema = z.object({
  qualityScore: z.number().min(0).max(100),
  art10Gaps: z.array(z.object({
    requirement: z.string(),
    gap: z.string(),
    priority: z.enum(["obbligatorio", "raccomandato"]),
    article: z.string(),
  })),
  geoCoverageIssues: z.array(z.string()),
  labelingIssues: z.array(z.string()),
  summary: z.string(),
});

export type DataQualityResult = z.infer<typeof DataQualitySchema>;

export async function checkDataQuality(
  datasetInfo: {
    name: string;
    size: string;
    source: string;
    labelingProcess?: string;
    geoCoverage?: string;
    personalData: boolean;
  },
  systemPurpose: string
): Promise<{ result: DataQualityResult | null; error?: string }> {
  if (!datasetInfo.name.trim()) {
    return { result: null, error: "MISSING_INPUT" };
  }

  const prompt = `Sei un esperto di EU AI Act Art. 10 — pratiche di governance dei dati.
Valuta la qualità del dataset descritto rispetto ai requisiti Art. 10(2) e Art. 10(3) EU AI Act.

Art. 10(2) richiede: (a) scelte di design appropriate, (b) raccolta dati, (c) operazioni di preparazione,
(d) ipotesi riguardanti le annotazioni, (e) disponibilità, quantità e idoneità, (f) esame di possibili bias,
(g) misure appropriate per i bias individuati.

REGOLE:
- article deve citare il sottoparagrafo specifico (es. "Art. 10(2)(f) [verify against current AI Act text]")
- Rispondi SOLO con JSON valido

Dataset: "${datasetInfo.name}"
Dimensione: "${datasetInfo.size}"
Fonte: "${datasetInfo.source}"
Processo di labeling: "${datasetInfo.labelingProcess || "non specificato"}"
Copertura geografica: "${datasetInfo.geoCoverage || "non specificata"}"
Contiene dati personali: ${datasetInfo.personalData ? "sì" : "no"}
Scopo del sistema AI: "${systemPurpose}"

Formato JSON:
{
  "qualityScore": 0-100,
  "art10Gaps": [
    {
      "requirement": "...",
      "gap": "...",
      "priority": "obbligatorio|raccomandato",
      "article": "Art. 10(...) [verify against current AI Act text]"
    }
  ],
  "geoCoverageIssues": ["..."],
  "labelingIssues": ["..."],
  "summary": "..."
}`;

  try {
    const text = await generateText(prompt, { temperature: 0.2, maxOutputTokens: 1000 });
    const cleaned = text.trim().replace(/^```json\s*/, "").replace(/```$/, "").trim();
    const parsed = DataQualitySchema.parse(JSON.parse(cleaned));
    return { result: parsed };
  } catch {
    return { result: null, error: "GENERATION_FAILED" };
  }
}
