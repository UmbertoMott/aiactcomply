"use server";
import { generateText } from "@/lib/rag/rag-vertex";
import { z } from "zod";

const ProxyFeaturesSchema = z.object({
  proxyFeatures: z.array(z.object({
    featureName: z.string(),
    proxiedAttribute: z.string(),
    art10Risk: z.string(),
    severity: z.enum(["low", "medium", "high", "critical"]),
    mitigation: z.string(),
  })),
  overallProxyRisk: z.enum(["none", "low", "medium", "high"]),
  art10Assessment: z.string(),
});

export type ProxyFeaturesResult = z.infer<typeof ProxyFeaturesSchema>;

export async function detectProxyFeatures(
  datasetDescription: string,
  featuresList: string,
  systemPurpose: string
): Promise<{ result: ProxyFeaturesResult | null; error?: string }> {
  if (!datasetDescription.trim() && !featuresList.trim()) {
    return { result: null, error: "MISSING_INPUT" };
  }

  const prompt = `Sei un esperto di EU AI Act Art. 10 — governance dei dati di addestramento.
Analizza il dataset descritto per identificare "proxy features": variabili che non misurano direttamente
un attributo protetto ma lo correlano indirettamente (zip code → etnia, nome → genere, ecc.).

Art. 10(2)(f) richiede di esaminare eventuali bias nei dati che potrebbero portare a discriminazioni.
Art. 10(5) consente l'uso di categorie speciali SOLO per individuare e correggere bias nei dati.

REGOLE:
- art10Risk deve terminare con "[verify against current AI Act text]"
- Rispondi SOLO con JSON valido, nessun testo fuori dal JSON

Scopo del sistema: "${systemPurpose || "non specificato"}"
Descrizione dataset: "${datasetDescription}"
Lista feature: "${featuresList}"

Formato JSON atteso:
{
  "proxyFeatures": [
    {
      "featureName": "...",
      "proxiedAttribute": "...",
      "art10Risk": "... [verify against current AI Act text]",
      "severity": "low|medium|high|critical",
      "mitigation": "..."
    }
  ],
  "overallProxyRisk": "none|low|medium|high",
  "art10Assessment": "..."
}`;

  try {
    const text = await generateText(prompt, { temperature: 0.2, maxOutputTokens: 900 });
    const cleaned = text.trim().replace(/^```json\s*/, "").replace(/```$/, "").trim();
    const parsed = ProxyFeaturesSchema.parse(JSON.parse(cleaned));
    return { result: parsed };
  } catch {
    return { result: null, error: "GENERATION_FAILED" };
  }
}
