"use server";
import { generateText } from "@/lib/rag/rag-vertex";
import type { AIActDeadline } from "./deadline-types";
import { getDeadlineStatus, daysUntil } from "./deadline-status";

export interface PriorityGroup {
  label: string;
  items: { deadlineId: string; reasoning: string }[];
}

export interface PrioritizeDeadlinesResult {
  priorityGroups: PriorityGroup[];
  aiConfirmed: false;
}

export async function prioritizeDeadlines(
  deadlines: AIActDeadline[],
  context: { systemName?: string; tier?: string }
): Promise<PrioritizeDeadlinesResult> {
  const relevantDeadlines = deadlines
    .filter((d) => getDeadlineStatus(d.date) !== "passed")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 12);

  if (relevantDeadlines.length === 0) {
    return { priorityGroups: [], aiConfirmed: false };
  }

  const deadlineList = relevantDeadlines.map((d) =>
    `- id: ${d.id}, label: "${d.label}", date: ${d.date} (${daysUntil(d.date)} giorni), article: ${d.article}, severity: ${d.severity}`
  ).join("\n");

  const prompt = `Sei un esperto di conformita AI Act UE (Reg. 2024/1689).
Devi prioritizzare queste scadenze normative per un'organizzazione con sistema AI di tipo: ${context.tier ?? "non specificato"}.
Sistema: ${context.systemName ?? "non specificato"}.

SCADENZE:
${deadlineList}

Raggruppa le scadenze in 3 gruppi di priorita:
1. "Azione immediata" (scadenze critiche entro 90 giorni)
2. "Pianificare ora" (scadenze importanti entro 12 mesi)
3. "Monitorare" (scadenze future > 12 mesi o informative)

Per ogni scadenza fornisci un reasoning breve (max 1 frase) sul perche e prioritaria o meno rispetto alle altre dello stesso periodo. Considera sanzioni, impatto operativo, dipendenze tra adempimenti.

Ogni citazione normativa deve terminare con [verify against current AI Act text].

Rispondi SOLO nel formato JSON:
<extract>
{
  "priorityGroups": [
    {
      "label": "Azione immediata",
      "items": [
        { "deadlineId": "id_scadenza", "reasoning": "..." }
      ]
    }
  ]
}
</extract>`;

  const raw = await generateText(prompt);
  const match = raw.match(/<extract>([\s\S]*?)<\/extract>/);
  if (!match) throw new Error("L'AI non ha restituito un blocco <extract> valido.");

  let parsed: { priorityGroups: PriorityGroup[] };
  try { parsed = JSON.parse(match[1].trim()); }
  catch { throw new Error("Errore parsing JSON dalla risposta AI."); }

  return { priorityGroups: parsed.priorityGroups, aiConfirmed: false };
}
