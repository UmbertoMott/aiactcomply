"use server";
import { generateText } from "@/lib/rag/rag-vertex";

interface ChatContext {
  currentTool:    string;
  completedTools: string[];
  riskLevel:      string | null;
  systemName:     string | null;
  role:           string[];
}

export async function complianceChat(
  userMessage: string,
  context: ChatContext
): Promise<{ answer: string } | { error: string }> {
  const systemPrompt = `Sei un esperto di conformità EU AI Act integrato in AIComply.
Rispondi in italiano, in modo conciso e pratico (max 4 frasi).
Cita sempre l'articolo di riferimento quando è rilevante.

Contesto attuale dell'utente:
- Tool aperto: ${context.currentTool}
- Tool completati: ${context.completedTools.join(", ") || "nessuno"}
- Risk level sistema: ${context.riskLevel ?? "non classificato"}
- Nome sistema: ${context.systemName ?? "non inserito"}
- Ruolo: ${context.role.join(", ") || "non specificato"}

Usa questo contesto per dare risposte pertinenti alla situazione dell'utente.
Non inventare obblighi non previsti dalla norma.`;

  const fullPrompt = `${systemPrompt}\n\nDomanda utente: ${userMessage}`;

  try {
    const text = await generateText(fullPrompt, { temperature: 0.3, maxOutputTokens: 400 });
    return { answer: text.trim() };
  } catch {
    return { error: "Assistente non disponibile al momento." };
  }
}
