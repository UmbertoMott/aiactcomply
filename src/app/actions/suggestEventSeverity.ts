"use server";
import Anthropic from "@anthropic-ai/sdk";
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
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "ANTHROPIC_API_KEY non configurata." };

  const client = new Anthropic({ apiKey });

  const prompt = `Sei un esperto di incident management per sistemi AI (Art. 12 e Art. 73 EU AI Act).

Evento da classificare: "${eventDescription}"
Risk level del sistema: ${systemRiskLevel}

Classifica la severity dell'evento e indica:
- severity: uno di questi 4 valori esatti: "low", "medium", "high", "critical"
- rationale: motivazione in 1 frase
- regulatoryFlag: se l'evento potrebbe richiedere notifica (es. "Art. 73 — notifica entro 15gg se danno grave"), oppure null se non applicabile

Rispondi SOLO con JSON valido, nessun testo fuori dal JSON.`;

  try {
    const response = await client.messages.create({
      model:      "claude-haiku-4-5",
      max_tokens: 300,
      messages:   [{ role: "user", content: prompt }],
    });
    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const cleaned = text.trim().replace(/^```json\s*/, "").replace(/```$/, "").trim();
    return SeveritySchema.parse(JSON.parse(cleaned));
  } catch {
    return { error: "Auto-classificazione non disponibile." };
  }
}
