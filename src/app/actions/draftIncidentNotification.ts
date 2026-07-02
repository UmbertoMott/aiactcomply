"use server";
import { generateText } from "@/lib/rag/rag-vertex";
import { z } from "zod";
import type { GlobalComplianceContext } from "@/hooks/useComplianceContext";
import type { IncidentClassification } from "@/app/actions/classifyIncident";

const IncidentNotificationSchema = z.object({
  notificationText: z.string(),
  sections: z.object({
    identificationProvider: z.string(),
    systemDescription: z.string(),
    incidentDescription: z.string(),
    impactAssessment: z.string(),
    measuresAdopted: z.string(),
    followUpPlan: z.string(),
  }),
  requiredAttachments: z.array(z.string()),
  art73Reference: z.string(),
  draftNote: z.string(),
});

export type IncidentNotificationDraft = z.infer<typeof IncidentNotificationSchema>;

export async function draftIncidentNotification(
  incidentDescription: string,
  classification: IncidentClassification,
  context: GlobalComplianceContext,
  measuresAdopted: string
): Promise<{ draft: IncidentNotificationDraft | null; error?: string }> {
  if (!incidentDescription.trim()) {
    return { draft: null, error: "MISSING_INPUT" };
  }

  const prompt = `Sei un esperto di EU AI Act Art. 73 — notifica di incidenti gravi.
Redigi la bozza di notifica formale all'autorità di vigilanza del mercato.

La notifica deve includere obbligatoriamente:
1. Identificazione del provider (nome, indirizzo, referente, DPO se disponibile)
2. Descrizione del sistema AI (nome, versione, destinazione d'uso, tier di rischio)
3. Descrizione dell'incidente (quando, come, chi ha rilevato)
4. Valutazione dell'impatto (persone coinvolte, gravità, aree geografiche)
5. Misure immediate adottate (sospensione, backup, notifiche interne)
6. Piano di follow-up e misure correttive (cronoprogramma)

REGOLE OBBLIGATORIE:
- art73Reference deve terminare con "[verify against current AI Act text — Art. 73]"
- draftNote deve chiarire ESPLICITAMENTE che è una BOZZA e richiede revisione legale
- Il tono è formale e fattuale — nessun linguaggio di minimizzazione
- notificationText deve essere in italiano, strutturato con sezioni numerate
- Rispondi SOLO con JSON valido

Incidente: "${incidentDescription}"
Gravità classificata: ${classification.seriousnessLevel}
Autorità destinataria: ${classification.competentAuthority}
Sistema AI: "${context.systemName ?? "non specificato"}"
Tier: ${context.riskTier ?? "non specificato"}
Misure adottate: "${measuresAdopted || "da definire"}"

Formato JSON:
{
  "notificationText": "NOTIFICA AI SENSI DELL'ART. 73 REG. UE 2024/1689\\n\\nA: [Autorità]\\nDa: [Provider]\\n\\n1. IDENTIFICAZIONE DEL PROVIDER\\n...\\n\\n2. SISTEMA AI INTERESSATO\\n...\\n\\n3. DESCRIZIONE DELL'INCIDENTE\\n...\\n\\n4. VALUTAZIONE DELL'IMPATTO\\n...\\n\\n5. MISURE ADOTTATE\\n...\\n\\n6. PIANO DI FOLLOW-UP\\n...",
  "sections": {
    "identificationProvider": "...",
    "systemDescription": "...",
    "incidentDescription": "...",
    "impactAssessment": "...",
    "measuresAdopted": "...",
    "followUpPlan": "..."
  },
  "requiredAttachments": ["...", "..."],
  "art73Reference": "Art. 73 Reg. UE 2024/1689 [verify against current AI Act text — Art. 73]",
  "draftNote": "BOZZA — richiede revisione da consulente legale qualificato prima dell'invio all'autorità."
}`;

  try {
    const text = await generateText(prompt, { temperature: 0.2, maxOutputTokens: 2000 });
    const cleaned = text.trim().replace(/^```json\s*/, "").replace(/```$/, "").trim();
    const parsed = IncidentNotificationSchema.parse(JSON.parse(cleaned));
    return { draft: parsed };
  } catch {
    return { draft: null, error: "GENERATION_FAILED" };
  }
}
