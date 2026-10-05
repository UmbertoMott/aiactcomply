"use server";
import { generateText } from "@/lib/rag/rag-vertex";
import { z } from "zod";

const TransparencyNoticeSchema = z.object({
  art13Score: z.number().min(0).max(100),
  missingFields: z.array(z.object({
    field: z.string(),
    article: z.string(),
    reason: z.string(),
    priority: z.enum(["obbligatorio", "raccomandato"]),
  })),
  readabilityIssues: z.array(z.string()),
  suggestedImprovements: z.array(z.string()),
  overallAssessment: z.string(),
});

export type TransparencyNoticeResult = z.infer<typeof TransparencyNoticeSchema>;

export async function processTransparencyNotice(
  noticeFields: Record<string, string>,
  systemName: string
): Promise<{ result: TransparencyNoticeResult | null; error?: string }> {
  const filled = Object.values(noticeFields).filter(v => v.trim().length > 5).length;
  if (filled < 2) {
    return { result: null, error: "INSUFFICIENT_CONTENT" };
  }

  const fieldsText = Object.entries(noticeFields)
    .map(([k, v]) => `${k}: ${v || "(vuoto)"}`)
    .join("\n");

  const prompt = `Sei un esperto di EU AI Act Art. 13 — trasparenza e fornitura di informazioni.
Analizza la notice di trasparenza fornita e valuta la conformità con i requisiti Art. 13(1)(2)(3).

Art. 13(1): Sistemi ad alto rischio devono essere progettati e sviluppati in modo da garantire
trasparenza sufficiente a permettere ai deployer di comprendere il funzionamento e usarlo correttamente.

Art. 13(2): Deve essere allegata un'istruzione d'uso in forma comprensibile.

Art. 13(3) richiede almeno: (a) identità e contatti del fornitore e dell'eventuale rappresentante autorizzato;
(b) caratteristiche, capacità e limiti delle prestazioni: (i) finalità prevista, (ii) accuratezza, robustezza
e cibersicurezza (Art. 15) e circostanze che possono incidervi, (iii) circostanze di uso conforme o di uso
improprio prevedibile che possono comportare rischi (Art. 9(2)), (iv) se del caso, capacità di spiegare l'output,
(v) se del caso, prestazioni per specifiche persone o gruppi, (vi) se del caso, specifiche dei dati di input e
informazioni sui set di dati di addestramento, convalida e prova, (vii) se del caso, informazioni per interpretare
e usare l'output; (c) modifiche predeterminate dal fornitore; (d) misure di sorveglianza umana (Art. 14);
(e) risorse computazionali e hardware, durata del ciclo di vita, manutenzione e aggiornamenti;
(f) se del caso, meccanismi per raccogliere, conservare e interpretare i log (Art. 12).

REGOLE:
- article deve citare il sottoparagrafo specifico (es. "Art. 13(3)(a)")
- Rispondi SOLO con JSON valido

Sistema: "${systemName}"

Campi notice:
${fieldsText}

Formato JSON:
{
  "art13Score": 0-100,
  "missingFields": [
    {
      "field": "...",
      "article": "Art. 13(...)",
      "reason": "...",
      "priority": "obbligatorio|raccomandato"
    }
  ],
  "readabilityIssues": ["..."],
  "suggestedImprovements": ["..."],
  "overallAssessment": "..."
}`;

  try {
    const text = await generateText(prompt, { temperature: 0.2, maxOutputTokens: 900 });
    const cleaned = text.trim().replace(/^```json\s*/, "").replace(/```$/, "").trim();
    const parsed = TransparencyNoticeSchema.parse(JSON.parse(cleaned));
    return { result: parsed };
  } catch {
    return { result: null, error: "GENERATION_FAILED" };
  }
}
