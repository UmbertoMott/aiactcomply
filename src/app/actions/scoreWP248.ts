"use server";
import { generateText } from "@/lib/rag/rag-vertex";
import { z } from "zod";

const WP248_CRITERIA = [
  "C1_valutazione_punteggio",
  "C2_decisione_automatizzata",
  "C3_monitoraggio_sistematico",
  "C4_dati_sensibili",
  "C5_scala_larga",
  "C6_corrispondenza_combinazione",
  "C7_dati_soggetti_vulnerabili",
  "C8_uso_innovativo",
  "C9_trasferimento_extraue",
] as const;

const WP248ScoreSchema = z.object({
  criteria: z.array(z.object({
    criterion: z.enum(WP248_CRITERIA),
    label: z.string(),
    matched: z.boolean(),
    confidence: z.enum(["low", "medium", "high"]),
    reasoning: z.string(),
    wpReference: z.string(),
  })),
  matchedCount: z.number(),
  dpiaRequired: z.boolean(),
  dpiaJustification: z.string(),
  priorConsultationRisk: z.boolean(),
});

export type WP248Score = z.infer<typeof WP248ScoreSchema>;

export async function scoreWP248Criteria(
  processingDescription: string,
  dataCategories: string,
  affectedSubjects: string,
  systemPurpose: string
): Promise<{ score: WP248Score | null; error?: string }> {
  if (!processingDescription.trim()) {
    return { score: null, error: "MISSING_INPUT" };
  }

  const prompt = `Sei un esperto di GDPR Art. 35 e WP248 rev.01 (Linee guida sulla DPIA).
Valuta se un trattamento dati soddisfa i 9 criteri WP248 che indicano necessità di DPIA.

Regola WP248: se il trattamento soddisfa ≥2 criteri, la DPIA è obbligatoria.

I 9 criteri:
C1_valutazione_punteggio: Valutazione/scoring (incluse profilazioni)
C2_decisione_automatizzata: Decisioni automatizzate con effetti giuridici o analoghi
C3_monitoraggio_sistematico: Monitoraggio sistematico degli interessati
C4_dati_sensibili: Trattamento di dati sensibili (art. 9 GDPR) o dati di natura molto personale
C5_scala_larga: Trattamento su larga scala
C6_corrispondenza_combinazione: Corrispondenza o combinazione di dataset
C7_dati_soggetti_vulnerabili: Dati relativi a soggetti vulnerabili (minori, pazienti, ecc.)
C8_uso_innovativo: Uso innovativo o applicazione di nuove soluzioni tecnologiche
C9_trasferimento_extraue: Trasferimento di dati extraUE o accesso da paesi terzi

REGOLE OBBLIGATORIE:
- wpReference deve terminare con "[verify against WP248 rev.01 and GDPR Art. 35]"
- matchedCount deve corrispondere esattamente al numero di criteri con matched=true
- dpiaRequired = true se matchedCount >= 2
- priorConsultationRisk = true se ci sono ≥2 criteri matched con high-residual-risk
- Rispondi SOLO con JSON valido

Trattamento: "${processingDescription}"
Categorie di dati: "${dataCategories}"
Soggetti interessati: "${affectedSubjects}"
Scopo sistema: "${systemPurpose}"

Formato JSON:
{
  "criteria": [
    {
      "criterion": "C1_valutazione_punteggio",
      "label": "Valutazione o scoring",
      "matched": true|false,
      "confidence": "low|medium|high",
      "reasoning": "...",
      "wpReference": "WP248 rev.01 criterio 1 [verify against WP248 rev.01 and GDPR Art. 35]"
    }
    // ... tutti 9 criteri
  ],
  "matchedCount": N,
  "dpiaRequired": true|false,
  "dpiaJustification": "...",
  "priorConsultationRisk": true|false
}`;

  try {
    const text = await generateText(prompt, { temperature: 0.1, maxOutputTokens: 1800 });
    const cleaned = text.trim().replace(/^```json\s*/, "").replace(/```$/, "").trim();
    const parsed = WP248ScoreSchema.parse(JSON.parse(cleaned));
    return { score: parsed };
  } catch {
    return { score: null, error: "GENERATION_FAILED" };
  }
}
