"use server";
import { generateText } from "@/lib/rag/rag-vertex";
import { z } from "zod";
import type { FRIADocument } from "@/lib/simulation/fria-engine";

const GapItemSchema = z.object({
  articleRef: z.string(),          // es. "Art. 27(1)(a)"
  label: z.string(),               // es. "Descrizione processi di deployment"
  status: z.enum(["ok", "incomplete", "missing"]),
  finding: z.string(),             // cosa manca o cosa è presente
  cta_phase: z.string(),           // "1" | "2" | "3" | "4" | "5" | "none"
  cta_label: z.string(),           // es. "Vai a Fase 1 — Contesto"
});

export const FriaGapCheckSchema = z.object({
  items: z.array(GapItemSchema),
  overall_coverage: z.enum(["complete", "partial", "insufficient"]),
  critical_gaps: z.array(z.string()),
  recommendation: z.string(),
});

export type FriaGapItem = z.infer<typeof GapItemSchema>;
export type FriaGapCheck = z.infer<typeof FriaGapCheckSchema>;

function summarizeFria(doc: FRIADocument): string {
  const scenarioCount = doc.scenarios.length;
  const rightImpacts = doc.scenarios.flatMap(s => s.right_impacts);
  const mitigatedCount = rightImpacts.filter(ri => ri.mitigations.length > 0).length;
  const ctx = doc.context;

  return JSON.stringify({
    systemName: doc.system_name,
    organization: doc.organization,
    // 27(1)(a) — descrizione processi
    technology_overview: ctx.technology_overview?.slice(0, 200),
    intended_purpose: ctx.intended_purpose_explanation?.slice(0, 200),
    timeframe: ctx.timeframe,
    frequency: ctx.frequency,
    // 27(1)(b) — periodo / frequenza
    // 27(1)(c) — categorie di persone
    affected_persons: ctx.affected_persons,
    main_users: ctx.main_users,
    // 27(1)(d) — rischi specifici
    scenarioCount,
    rightImpactsCount: rightImpacts.length,
    // 27(1)(e) — sorveglianza umana
    human_oversight_assigned: ctx.human_oversight_assigned,
    oversight_persons_trained: ctx.oversight_persons_trained,
    // 27(1)(f) — misure se rischio si materializza
    mitigatedRightsCount: mitigatedCount,
    complaint_mechanisms: ctx.complaint_mechanisms,
    // 27(2) — notifica autorità
    recommendation: doc.deployment.recommendation,
    conditions: doc.deployment.conditions,
    // 27(4) — coerenza con DPIA
    dpia_done: ctx.dpia_done,
    dpia_explanation: ctx.dpia_explanation,
    // Extra
    stakeholdersCount: doc.stakeholders.length,
    monitoringItemsCount: doc.monitoring.items.length,
    public_summary: doc.deployment.public_summary?.slice(0, 100),
  });
}

export async function checkFriaGaps(doc: FRIADocument): Promise<FriaGapCheck | { error: string }> {
  const summary = summarizeFria(doc);

  const prompt = `Sei un esperto legale in AI Act EU (Reg. 2024/1689). Analizza la FRIA fornita e verifica la copertura degli elementi obbligatori dell'Art. 27.

FRIA SUMMARY (dati strutturati):
${summary}

Verifica TUTTI gli elementi obbligatori:

1. Art. 27(1)(a) — Descrizione dei processi di deployment e delle finalità (incluso periodo e frequenza)
2. Art. 27(1)(b) — Periodo/frequenza di utilizzo del sistema
3. Art. 27(1)(c) — Categorie di persone fisiche e gruppi interessati nel contesto specifico di deployment
4. Art. 27(1)(d) — Rischi specifici di danno per i diritti e le libertà fondamentali, considerando anche i minori e le persone vulnerabili
5. Art. 27(1)(e) — Misure di supervisione umana pianificate per l'implementazione
6. Art. 27(1)(f) — Misure da adottare se i rischi si materializzano, inclusi meccanismi di reclamo e rimedi
7. Art. 27(2) — Notifica all'autorità di vigilanza del mercato (obbligo se raccomandazione non è "deploy" incondizionato)
8. Art. 27(4) — Coordinamento con DPIA GDPR (la DPIA non sostituisce la FRIA ma deve essere coerente)

Per ogni elemento, valuta status: "ok" (presente e sufficiente), "incomplete" (presente ma lacunoso), "missing" (assente).

Rispondi SOLO con JSON valido:
{
  "items": [
    {
      "articleRef": "Art. 27(1)(a)",
      "label": "Descrizione processi e finalità",
      "status": "ok|incomplete|missing",
      "finding": "cosa è presente o cosa manca (max 60 parole) [verifica contro il testo vigente dell'AI Act]",
      "cta_phase": "1",
      "cta_label": "Vai a Fase 1 — Contesto"
    }
  ],
  "overall_coverage": "complete|partial|insufficient",
  "critical_gaps": ["lista gap critici"],
  "recommendation": "Raccomandazione sintetica (1-2 frasi) [verifica contro il testo vigente dell'AI Act]"
}`;

  try {
    const text = await generateText(prompt, { temperature: 0.1, maxOutputTokens: 1500 });
    const cleaned = text.trim().replace(/^```json\s*/m, "").replace(/```\s*$/m, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON");
    return FriaGapCheckSchema.parse(JSON.parse(match[0]));
  } catch {
    return { error: "Impossibile eseguire il gap-check. Riprova." };
  }
}
