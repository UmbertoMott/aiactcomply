"use server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const FriaDraftSchema = z.object({
  phase1_description: z.string(),
  phase2_rights: z.array(z.object({
    right:        z.string(),
    impactLevel:  z.enum(["none", "low", "medium", "high"]),
    rationale:    z.string(),
  })),
  phase3_scenarios: z.array(z.object({
    scenario:          z.string(),
    affectedPersons:   z.string(),
    likelihood:        z.number().min(1).max(5),
  })),
});

export type FriaDraft = z.infer<typeof FriaDraftSchema>;

export async function draftFria(
  systemName: string,
  systemDescription: string,
  riskLevel: string,
  risks: Array<{ name?: string; title?: string; severity?: string | number }>,
  personalData: boolean
): Promise<FriaDraft | { error: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "ANTHROPIC_API_KEY non configurata." };

  const client = new Anthropic({ apiKey });

  const riskList = risks
    .map((r) => `${r.name ?? r.title ?? "rischio"} (severity ${r.severity ?? "?"}`)
    .join(", ") || "nessuno";

  const prompt = `Sei un esperto di valutazione impatto sui diritti fondamentali (Art. 27 EU AI Act).

Dati disponibili sul sistema AI:
- Nome: ${systemName}
- Descrizione: ${systemDescription}
- Livello di rischio: ${riskLevel}
- Rischi già identificati nel Risk Manager: ${riskList}
- Tratta dati personali: ${personalData ? "sì" : "no"}

Genera una bozza delle prime 3 fasi della FRIA:

1. phase1_description: descrizione sintetica del sistema e del contesto di deployment per la FRIA (3-4 frasi, tono formale)

2. phase2_rights: valutazione preliminare impatto su questi 6 diritti fondamentali
   (analizzali tutti e 6, in questo ordine):
   - Dignità umana e autonomia
   - Non discriminazione e uguaglianza
   - Privacy e protezione dei dati personali
   - Tutela dei consumatori
   - Accesso ai servizi pubblici
   - Diritto a un ricorso effettivo
   Per ogni diritto: right (nome), impactLevel (none/low/medium/high), rationale (1 frase)

3. phase3_scenarios: 3 scenari di impatto concreti per questa tipologia di sistema
   Per ogni scenario: scenario (titolo), affectedPersons (chi è colpito), likelihood (1-5)

Rispondi SOLO con JSON valido, nessun testo fuori dal JSON.
Formato: { "phase1_description": "...", "phase2_rights": [...], "phase3_scenarios": [...] }`;

  try {
    const response = await client.messages.create({
      model:      "claude-haiku-4-5",
      max_tokens: 2000,
      messages:   [{ role: "user", content: prompt }],
    });
    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const cleaned = text.trim().replace(/^```json\s*/, "").replace(/```$/, "").trim();
    return FriaDraftSchema.parse(JSON.parse(cleaned));
  } catch {
    return { error: "Impossibile generare la bozza. Procedi con l'inserimento manuale." };
  }
}
