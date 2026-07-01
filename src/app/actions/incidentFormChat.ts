"use server";
import { generateText } from "@/lib/rag/rag-vertex";
import { retrieveContext } from "@/lib/rag/rag-retrieve";

export interface IncidentChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface IncidentFormContext {
  title?: string;
  system?: string;
  date?: string;
  severity?: string;
  authority?: string;
  affectedUsers?: string;
  description?: string;
  actions?: string;
}

const SYSTEM_PROMPT = `Sei un esperto EU AI Act Art. 73 integrato in AIComply.

Il tuo compito è aiutare l'utente a segnalare correttamente un incidente grave ai sensi dell'Art. 73 Reg. UE 2024/1689.

OBIETTIVO PRINCIPALE: guidare l'utente a raccogliere tutte le informazioni necessarie per la segnalazione, valutare se l'incidente è "grave" ai sensi dell'Art. 3(49), e determinare la scadenza di notifica corretta.

FLUSSO GUIDA:
1. Se l'utente descrive un evento → aiutalo a formulare il titolo e classificare la gravità
2. Se chiede "è grave?" → applica i criteri Art. 3(49): morte/danno grave alla salute/diritti fondamentali/infrastrutture critiche/danno a proprietà o ambiente
3. Se è grave → Art. 73(3): notifica IMMEDIATA se morte/infrastruttura critica (max 2 gg lavorativi); Art. 73(2): max 15 gg lavorativi per gli altri gravi
4. Se non è grave (malfunzionamento) → nessuna notifica obbligatoria, solo monitoraggio interno
5. Suggerisci l'autorità competente in base al settore (AGID = default IT, Garante Privacy se GDPR, Banca d'Italia se finanziario, ecc.)

REGOLE OBBLIGATORIE:
- Rispondi sempre in italiano
- Risposte concise (max 3-4 frasi) e orientate all'azione
- Alla fine di ogni risposta che cita un articolo, aggiungi "[verify against current AI Act text]"
- Non inventare fatti — se non sai, chiedi
- Se l'utente fornisce info utili per il form, riassumi cosa ha confermato e suggerisci il passo successivo
- Tono professionale ma diretto

CONTESTO NORMATIVO DISPONIBILE:
`;

export async function incidentFormChat(
  messages: IncidentChatMessage[],
  formContext: IncidentFormContext
): Promise<{ reply: string; error?: string }> {
  if (!messages.length) return { reply: "", error: "NO_MESSAGES" };

  // RAG: recupera chunk Art. 73 + Art. 3(49) rilevanti
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const ragQuery = `Art. 73 incidente grave notifica AI Act ${lastUserMsg.slice(0, 120)}`;

  let ragContext = "";
  try {
    const { chunks } = await retrieveContext({
      query: ragQuery,
      topK: 4,
      articleHint: "Art. 73",
      minSimilarity: 0.3,
    });
    if (chunks.length > 0) {
      ragContext = chunks
        .map((c) => `[${c.sectionRef ?? c.documentTitle}] ${c.chunkText}`)
        .join("\n\n");
    }
  } catch {
    // RAG non disponibile — continua senza contesto
  }

  // Costruisci il form context summary
  const formSummary = Object.entries(formContext)
    .filter(([, v]) => v && String(v).trim())
    .map(([k, v]) => `${k}: ${v}`)
    .join(" | ");

  const systemPrompt =
    SYSTEM_PROMPT +
    (ragContext || "Nessun chunk normativo recuperato — usa la conoscenza interna del Reg. UE 2024/1689.") +
    (formSummary ? `\n\nCAMPI FORM GIÀ COMPILATI: ${formSummary}` : "\n\nFORM VUOTO — guida l'utente dall'inizio.");

  const history = messages
    .map((m) => `${m.role === "user" ? "Utente" : "Assistente"}: ${m.content}`)
    .join("\n");

  const prompt = `${systemPrompt}\n\n--- CONVERSAZIONE ---\n${history}\nAssistente:`;

  try {
    const reply = await generateText(prompt, { temperature: 0.3, maxOutputTokens: 600 });
    return { reply: reply.trim() };
  } catch {
    return { reply: "", error: "GENERATION_FAILED" };
  }
}
