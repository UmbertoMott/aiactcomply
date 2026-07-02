"use server";
import { generateText } from "@/lib/rag/rag-vertex";
import { z } from "zod";

const SeveritySchema = z.object({
  severity:       z.enum(["low", "medium", "high", "critical"]),
  rationale:      z.string(),
  regulatoryFlag: z.string().nullable().optional(),
});

export type EventSeveritySuggestion = z.infer<typeof SeveritySchema>;

export async function suggestEventSeverity(
  eventDescription: string,
  systemRiskLevel: string
): Promise<EventSeveritySuggestion | { error: string }> {
  const prompt = `Sei un esperto di incident management per sistemi AI (Art. 12 e Art. 73 EU AI Act).

Evento da classificare: "${eventDescription}"
Risk level del sistema: ${systemRiskLevel}

Classifica la severity dell'evento e indica:
- severity: uno di questi 4 valori esatti: "low", "medium", "high", "critical"
- rationale: motivazione in 1 frase
- regulatoryFlag: se l'evento potrebbe richiedere notifica (es. "Art. 73 — notifica entro 15gg se danno grave"), oppure null se non applicabile

Rispondi SOLO con JSON valido, nessun testo fuori dal JSON.`;

  try {
    const text = await generateText(prompt, { temperature: 0.1, maxOutputTokens: 300 });
    const cleaned = text.trim().replace(/^```json\s*/, "").replace(/```$/, "").trim();
    return SeveritySchema.parse(JSON.parse(cleaned));
  } catch {
    return { error: "Auto-classificazione non disponibile." };
  }
}
