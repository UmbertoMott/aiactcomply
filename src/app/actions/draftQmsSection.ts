"use server"
import { generateText } from "@/lib/rag/rag-vertex"
import { z } from "zod"
import type { GlobalComplianceContext } from "@/hooks/useComplianceContext"

export const QMS_SECTIONS = [
  { id: "a", label: "Strategia di conformità normativa",                  article: "Art. 17(1)(a)" },
  { id: "b", label: "Tecniche, procedure e azioni sistematiche",          article: "Art. 17(1)(b)" },
  { id: "c", label: "Tecniche di progettazione e sviluppo",               article: "Art. 17(1)(c)" },
  { id: "d", label: "Procedure di validazione e test pre-deployment",     article: "Art. 17(1)(d)" },
  { id: "e", label: "Capacità tecniche e standard applicati",             article: "Art. 17(1)(e)" },
  { id: "f", label: "Gestione dei dati (Art. 10)",                        article: "Art. 17(1)(f)" },
  { id: "g", label: "Piano di gestione del rischio (Art. 9)",             article: "Art. 17(1)(g)" },
  { id: "h", label: "Post-market monitoring (Art. 72)",                   article: "Art. 17(1)(h)" },
  { id: "i", label: "Procedure incidenti gravi (Art. 73)",                article: "Art. 17(1)(i)" },
  { id: "j", label: "Comunicazione con autorità e notified body",         article: "Art. 17(1)(j)" },
  { id: "k", label: "Accessibilità e istruzioni per gli utenti",          article: "Art. 17(1)(k)" },
  { id: "l", label: "Responsabilità e autorizzazioni interne",            article: "Art. 17(1)(l)" },
  { id: "m", label: "Politiche di sorveglianza e revisione QMS",          article: "Art. 17(1)(m)" },
] as const

export type QmsSectionId = typeof QMS_SECTIONS[number]["id"]

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

  const prompt = `Sei un esperto di Quality Management System per sistemi AI ad alto rischio ai sensi dell'Art. 17 EU AI Act.

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
