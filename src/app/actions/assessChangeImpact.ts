"use server";
import { generateText } from "@/lib/rag/rag-vertex";
import { z } from "zod";

const ChangeImpactSchema = z.object({
  isSubstantialModification: z.boolean(),
  substModificationBasis: z.string(),
  affectedAnnexIVSections: z.array(z.object({
    sectionId: z.string(),
    sectionLabel: z.string(),
    updateRequired: z.enum(["obbligatorio", "consigliato", "non_necessario"]),
    reason: z.string(),
  })),
  requiresNewConformityAssessment: z.boolean(),
  requiresEUDBUpdate: z.boolean(),
  summary: z.string(),
});

export type ChangeImpactReport = z.infer<typeof ChangeImpactSchema>;

export async function assessChangeImpact(
  changeDescription: string,
  currentTier: string | null,
  currentAnnexIII: string | null | boolean
): Promise<{ report: ChangeImpactReport | null; error?: string }> {
  if (!changeDescription.trim()) {
    return { report: null, error: "MISSING_INPUT" };
  }

  const prompt = `Sei un esperto di EU AI Act — modifiche ai sistemi AI ad alto rischio.
Valuta quale impatto ha una modifica descritta sulla documentazione Annex IV e sulla conformità.

Art. 6(3): Se il sistema subisce una modifica sostanziale, deve essere considerato un nuovo sistema
ai fini della conformità.
Art. 11: La documentazione tecnica deve essere aggiornata per riflettere ogni modifica.

Indicatori di modifica sostanziale [verify against current AI Act text — Art. 6(3), Art. 25]:
- Cambio dell'intended purpose
- Retraining o fine-tuning sostanziale del modello
- Cambio delle performance oltre le soglie documentate
- Modifica dei meccanismi di supervisione umana
- Cambio dei dati di training che altera il comportamento

Le 12 sezioni Annex IV da verificare:
A4_1_descrizione_generale, A4_2_destinazione_uso, A4_3_versioni_modifiche,
A4_4_elementi_architettura, A4_5_metriche_performance, A4_6_requisiti_hardware,
A4_7_misure_supervisione, A4_8_requisiti_input, A4_9_gestione_rischi,
A4_10_ciclo_sviluppo, A4_11_post_market_monitoring, A4_12_dichiarazione_conformita

REGOLE:
- substModificationBasis deve terminare con "[verify against current AI Act text — Art. 6(3), Art. 25]"
- Se isSubstantialModification=true, requiresNewConformityAssessment è quasi sempre true
- Rispondi SOLO con JSON valido

Modifica descritta: "${changeDescription}"
Tier sistema: ${currentTier ?? "non specificato"}
Annex III applicabile: ${currentAnnexIII ?? "non specificato"}

Formato JSON:
{
  "isSubstantialModification": true|false,
  "substModificationBasis": "... [verify against current AI Act text — Art. 6(3), Art. 25]",
  "affectedAnnexIVSections": [
    {
      "sectionId": "A4_5_metriche_performance",
      "sectionLabel": "Metriche di performance",
      "updateRequired": "obbligatorio|consigliato|non_necessario",
      "reason": "..."
    }
  ],
  "requiresNewConformityAssessment": true|false,
  "requiresEUDBUpdate": true|false,
  "summary": "..."
}`;

  try {
    const text = await generateText(prompt, { temperature: 0.1, maxOutputTokens: 1200 });
    const cleaned = text.trim().replace(/^```json\s*/, "").replace(/```$/, "").trim();
    const parsed = ChangeImpactSchema.parse(JSON.parse(cleaned));
    return { report: parsed };
  } catch {
    return { report: null, error: "GENERATION_FAILED" };
  }
}
