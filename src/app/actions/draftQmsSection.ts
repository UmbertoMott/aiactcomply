"use server"
import { generateText } from "@/lib/rag/rag-vertex"
import { z } from "zod"
import type { GlobalComplianceContext } from "@/hooks/useComplianceContext"
import { QMS_SECTIONS, type QmsSectionId } from "@/lib/qms/qms-sections"


const QmsSectionDraftSchema = z.object({
  sectionId: z.string(),
  content: z.string(),
  checklistItems: z.array(z.object({
    item: z.string(),
    mandatory: z.boolean(),
    completionHint: z.string(),
  })),
  missingData: z.array(z.string()),
  confidence: z.enum(["high", "medium", "low"]),
})

export type QmsSectionDraft = z.infer<typeof QmsSectionDraftSchema>

export async function draftQmsSection(
  sectionId: QmsSectionId,
  context: GlobalComplianceContext
): Promise<QmsSectionDraft | { error: string }> {
  const section = QMS_SECTIONS.find(s => s.id === sectionId)!

  const contextSummary = `
- Sistema: ${context.systemName ?? "[DA COMPLETARE]"}
- Descrizione: ${context.systemDescription ?? "[DA COMPLETARE]"}
- Risk tier: ${context.riskTier ?? "non classificato"}
- Annex III: ${context.annexIII ?? false}
- Articoli applicabili: ${context.applicableArticles?.join(", ") ?? "da determinare"}
- Dataset: ${context.datasetNames?.join(", ") ?? "non specificati"}
- Rischi identificati: ${context.identifiedRisks?.slice(0, 3).map(r => r.scenario).join("; ") ?? "nessuno"}
- Overall risk level: ${context.overallRiskLevel ?? "non valutato"}
- Accuracy metric: ${context.accuracyMetric ?? "non misurata"}
- Provider: ${context.providerName ?? "[DA COMPLETARE]"}`

  const prompt = `Sei un esperto di Quality Management System per sistemi di IA ad alto rischio ai sensi dell'Art. 17 EU AI Act.

SEZIONE DA REDIGERE: ${section.label} (${section.article})

DATI DISPONIBILI SUL SISTEMA (già validati dall'utente):
${contextSummary}

Genera la bozza di questa sezione del QMS.

ISTRUZIONI:
- content: testo formale in italiano, tono legale-tecnico, 3-5 paragrafi concreti.
  Personalizza usando i dati disponibili (systemName, rischi, ecc.).
  Se un dato è mancante usa "[DA COMPLETARE]" nel testo.
  NON inventare dati numerici non presenti nel contesto.
- checklistItems: 4-6 elementi specifici di questa sezione secondo la norma, con completionHint pratico
- missingData: dati che l'utente dovrebbe aggiungere per completare questa sezione (max 4)
- confidence: "high" se il contesto ha dati sufficienti per redigere il 70%+ della sezione, "low" se mancano informazioni critiche

Rispondi SOLO con JSON valido:
{
  "sectionId": "${sectionId}",
  "content": "testo formale...",
  "checklistItems": [{ "item": "", "mandatory": true, "completionHint": "" }],
  "missingData": [],
  "confidence": "high|medium|low"
}`

  try {
    const text = await generateText(prompt, { temperature: 0.15, maxOutputTokens: 1200 })
    const cleaned = text.trim().replace(/^```json\s*/m, "").replace(/```\s*$/m, "").trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) throw new Error("No JSON found")
    return QmsSectionDraftSchema.parse(JSON.parse(match[0]))
  } catch {
    return { error: `Impossibile generare bozza sezione ${sectionId}.` }
  }
}
