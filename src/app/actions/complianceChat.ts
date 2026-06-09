"use server";
import Anthropic from "@anthropic-ai/sdk";

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
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "ANTHROPIC_API_KEY non configurata." };

  const client = new Anthropic({ apiKey });

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

  try {
    const response = await client.messages.create({
      model:      "claude-haiku-4-5",
      max_tokens: 400,
      system:     systemPrompt,
      messages:   [{ role: "user", content: userMessage }],
    });
    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return { answer: text };
  } catch {
    return { error: "Assistente non disponibile al momento." };
  }
}
