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

export type IncidentSuggestField =
  | "title"
  | "description"
  | "severity"
  | "affectedUsers"
  | "actions"
  | "authority"
  | "date";

export interface IncidentFieldSuggestion {
  field: IncidentSuggestField;
  value: string;
  label: string;
}

export interface IncidentFormChatResult {
  reply: string;
  suggestion?: IncidentFieldSuggestion;
  error?: string;
}

const FIELD_LABELS: Record<IncidentSuggestField, string> = {
  title: "Titolo incidente",
  description: "Descrizione",
  severity: "Gravità",
  affectedUsers: "Utenti impattati",
  actions: "Azioni intraprese",
  authority: "Autorità competente",
  date: "Data rilevamento",
};

const SYSTEM_PROMPT = `Sei un esperto EU AI Act Art. 73 integrato in AIComply. Il tuo compito è raccogliere le informazioni per segnalare correttamente un incidente grave ai sensi dell'Art. 73 Reg. UE 2024/1689.

FLUSSO GUIDA PROATTIVO — segui questo ordine basandoti sui campi già compilati:
1. DESCRIZIONE mancante → chiedi: "Cosa è successo esattamente? Descrivi l'evento in 2-3 frasi: cosa ha fatto il sistema AI, quando, con quale conseguenza."
2. GRAVITÀ non assegnata → analizza la descrizione e chiedi conferma: "In base a quanto descritto, classificherei questo come [LIVELLO] perché [MOTIVO Art. 3(49)/Art.73(3)]. Confermi?"
3. UTENTI IMPATTATI mancanti → chiedi: "Quante persone sono state coinvolte o potrebbero esserlo? Indica una stima anche approssimativa."
4. AZIONI mancanti → chiedi: "Quali azioni hai già intrapreso? (es. sospensione sistema, patch, notifica interna, indagine avviata)"
5. TITOLO mancante → suggerisci un titolo sintetico basato sulla descrizione.
6. AUTORITÀ non confermata → verifica: "L'autorità competente è [AGID/ALTRO] — è corretto per il tuo settore?"

REGOLE OBBLIGATORIE:
- Fai UNA domanda per volta, aspetta la risposta prima di passare alla successiva
- Risposte concise (max 4 frasi) in italiano
- Quando proponi un valore per un campo, chiedi sempre conferma prima di applicarlo
- Se l'utente dice "sì" / "ok" / "confermo" → applica il valore suggerito nel campo tramite <suggest>
- Cita sempre l'articolo normativo rilevante con "[verify against current AI Act text]"
- Gravità: Critical (Art.73(3)) = morte/infrastrutture critiche → 2 gg; High (Art.73(2)) = danno grave salute/diritti → 15 gg; Medium = malfunzionamento senza danno immediato; Low = near-miss

CONTESTO NORMATIVO:
`;

function nextMissingField(ctx: IncidentFormContext): IncidentSuggestField | null {
  if (!ctx.description?.trim()) return "description";
  if (!ctx.severity?.trim() || ctx.severity === "high") return "severity"; // high è default, chiedi conferma
  if (!ctx.affectedUsers?.trim()) return "affectedUsers";
  if (!ctx.actions?.trim()) return "actions";
  if (!ctx.title?.trim()) return "title";
  return null;
}

function parseReply(raw: string): { reply: string; suggestion?: IncidentFieldSuggestion } {
  const match = raw.match(/<suggest>([\s\S]*?)<\/suggest>/);
  if (!match) return { reply: raw.trim() };

  try {
    const json = JSON.parse(match[1].trim()) as {
      field: IncidentSuggestField;
      value: string;
    };
    if (!json.field || !json.value) return { reply: raw.replace(/<suggest>[\s\S]*?<\/suggest>/, "").trim() };
    return {
      reply: raw.replace(/<suggest>[\s\S]*?<\/suggest>/, "").trim(),
      suggestion: {
        field: json.field,
        value: json.value,
        label: FIELD_LABELS[json.field] ?? json.field,
      },
    };
  } catch {
    return { reply: raw.replace(/<suggest>[\s\S]*?<\/suggest>/, "").trim() };
  }
}

export async function incidentFormChat(
  messages: IncidentChatMessage[],
  formContext: IncidentFormContext
): Promise<IncidentFormChatResult> {
  if (!messages.length) return { reply: "", error: "NO_MESSAGES" };

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
      ragContext = chunks.map((c) => `[${c.sectionRef ?? c.documentTitle}] ${c.chunkText}`).join("\n\n");
    }
  } catch { /* RAG non disponibile */ }

  const filled = Object.entries(formContext)
    .filter(([, v]) => v && String(v).trim())
    .map(([k, v]) => `${k}: "${v}"`)
    .join(", ");

  const missing = nextMissingField(formContext);

  const systemPrompt =
    SYSTEM_PROMPT +
    (ragContext || "Usa la conoscenza interna del Reg. UE 2024/1689.") +
    `\n\nSTATO FORM:\n- Compilati: ${filled || "nessuno"}\n- Prossimo campo da raccogliere: ${missing ?? "tutti compilati — fai un riepilogo e chiedi se procedere"}` +
    `\n\nSe suggerisci un valore da applicare nel form DOPO conferma dell'utente, aggiungi alla fine della risposta:\n<suggest>{"field": "FIELD_NAME", "value": "VALORE"}</suggest>\ndove FIELD_NAME è uno di: title, description, severity, affectedUsers, actions, authority, date`;

  const history = messages
    .map((m) => `${m.role === "user" ? "Utente" : "Assistente"}: ${m.content}`)
    .join("\n");

  const prompt = `${systemPrompt}\n\n--- CONVERSAZIONE ---\n${history}\nAssistente:`;

  try {
    const raw = await generateText(prompt, { temperature: 0.25, maxOutputTokens: 700 });
    const { reply, suggestion } = parseReply(raw);
    return { reply, suggestion };
  } catch {
    return { reply: "", error: "GENERATION_FAILED" };
  }
}
