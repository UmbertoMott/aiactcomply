"use server";
import { generateText } from "@/lib/rag/rag-vertex";
import { z } from "zod";

const BiasReportSchema = z.object({
  sensitiveColumns:     z.array(z.string()),
  missingValueFlags:    z.array(z.object({ column: z.string(), pct: z.number() })),
  potentialBiasRisks:   z.array(z.string()),
  overallQualityScore:  z.number().min(0).max(100),
  recommendation:       z.string(),
});

export type AiBiasReport = z.infer<typeof BiasReportSchema>;

export async function analyzeCsvBias(
  csvPreview: string,
  systemDescription: string
): Promise<AiBiasReport | { error: string }> {
  const prompt = `Sei un esperto di data governance per sistemi AI in conformità con Art. 10 EU AI Act.

Analizza questo dataset (preview delle prime righe):
\`\`\`csv
${csvPreview.slice(0, 3000)}
\`\`\`

Contesto: viene usato per addestrare/valutare il seguente sistema AI: "${systemDescription}"

Analizza e rispondi con JSON che include:
- sensitiveColumns: array di nomi di colonne che potrebbero contenere dati sensibili (età, genere, etnia, reddito, ecc.)
- missingValueFlags: array di { column, pct } per colonne con valori mancanti stimati > 10%
- potentialBiasRisks: array di rischi di bias identificati (max 4)
- overallQualityScore: punteggio qualità dati 0-100 secondo Art. 10(3)
- recommendation: una raccomandazione principale (1-2 frasi)

Rispondi SOLO con JSON valido, nessun testo fuori dal JSON.`;

  try {
    const text = await generateText(prompt, { temperature: 0.1, maxOutputTokens: 1000 });
    const cleaned = text.trim().replace(/^```json\s*/, "").replace(/```$/, "").trim();
    return BiasReportSchema.parse(JSON.parse(cleaned));
  } catch {
    return { error: "Analisi non disponibile. Inserisci i dati manualmente." };
  }
}
