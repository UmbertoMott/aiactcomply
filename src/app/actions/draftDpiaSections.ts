"use server"
import { generateText } from "@/lib/rag/rag-vertex"
import { z } from "zod"
import type { GlobalComplianceContext } from "@/hooks/useComplianceContext"

const DpiaDraftSchema = z.object({
  assets: z.array(z.object({
    assetName: z.string(),
    dataCategory: z.string(),
    legalBasis: z.string(),
    retentionPeriod: z.string(),
    sensitivityLevel: z.enum(["low", "medium", "high"]),
    gdprArticle: z.string(),
  })),
  threats: z.array(z.object({
    threatName: z.string(),
    description: z.string(),
    likelihood: z.number().min(1).max(5),
    impact: z.number().min(1).max(5),
    affectedRights: z.array(z.string()),
    mitigation: z.string(),
    residualRisk: z.enum(["low", "medium", "high"]),
    gdprReference: z.string(),
  })),
  technicalMeasures: z.array(z.string()),
  organizationalMeasures: z.array(z.string()),
  priorConsultationRequired: z.boolean(),
  priorConsultationRationale: z.string(),
})

export type DpiaDraft = z.infer<typeof DpiaDraftSchema>

export async function draftDpiaSections(
  context: GlobalComplianceContext
): Promise<DpiaDraft | { error: string }> {

  const contextSummary = `
- Sistema: ${context.systemName ?? "non specificato"}
- Descrizione: ${context.systemDescription ?? "non specificata"}
- Risk tier EU AI Act: ${context.riskTier ?? "non classificato"}
- Annex III: ${context.annexIII ?? false}
- Dataset: ${context.datasetNames?.join(", ") ?? "nessuno"}
- Feature sensibili: ${context.sensitiveFeatures?.join(", ") ?? "nessuna"}
- Dati personali: ${context.personalData ?? false}
- Processa larga scala: ${context.processesLargeScale ?? false}
- Bias verificato: ${context.biasChecked ?? false}
- Rischi identificati: ${context.identifiedRisks?.map(r => `${r.scenario} (sev ${r.severity})`).join(", ") ?? "nessuno"}
- Oversight umano: ${context.humanOversightRequired ?? false}
- Autorità pubblica: ${context.isPublicAuthority ?? false}`

  const prompt = `Sei un esperto di DPIA (Data Protection Impact Assessment) ai sensi dell'Art. 35 GDPR, con competenze sull'intersezione GDPR–EU AI Act.

CONTESTO DEL SISTEMA AI (già validato dall'utente):
${contextSummary}

Genera le bozze per le fasi 2 (Assets), 3 (Threats), 4 (Misure) della DPIA.

LOGICA OBBLIGATORIA PER THREATS:
- Se sensitiveFeatures contiene "genere", "etnia", "religione", "orientamento sessuale", "origine", "salute": aggiungi threat "Discriminazione algoritmica su dati sensibili" con likelihood 4, impact 5, gdprReference "Art. 9 GDPR + Art. 10 EU AI Act"
- Se riskTier = "high_risk" o automatedDecisions deducibile: aggiungi threat "Decisione automatizzata senza supervisione adeguata" con gdprReference "Art. 22 GDPR"
- Se processesLargeScale = true: aggiungi threat "Trattamento su larga scala — proporzionalità da verificare" con gdprReference "Art. 35(3)(b) GDPR"
- Se biasChecked = false: aggiungi threat "Bias non verificato nel dataset" con gdprReference "Art. 10 EU AI Act + Art. 5(1)(f) GDPR"
- priorConsultationRequired = true se almeno 2 threats hanno residualRisk = "high"

LOGICA PER ASSETS:
- Genera un asset per ogni datasetName nel contesto
- Se personalData = true: legalBasis = "Art. 6(1)(b) GDPR — esecuzione contratto" (o Art. 6(1)(f) se legittimo interesse, scegli quello più appropriato)
- Se sensitiveFeatures non è vuoto: aggiungi asset "Dati particolari (categorie speciali)" con gdprArticle "Art. 9 GDPR", sensitivityLevel "high"
- Se nessun dataset specificato: genera almeno 2 asset generici basati sul tipo di sistema

FORMATO RISPOSTA — solo JSON valido, nessun testo fuori dal JSON:
{
  "assets": [{ "assetName": "", "dataCategory": "", "legalBasis": "", "retentionPeriod": "", "sensitivityLevel": "low|medium|high", "gdprArticle": "" }],
  "threats": [{ "threatName": "", "description": "", "likelihood": 1-5, "impact": 1-5, "affectedRights": [], "mitigation": "", "residualRisk": "low|medium|high", "gdprReference": "" }],
  "technicalMeasures": ["misura tecnica 1", "misura tecnica 2"],
  "organizationalMeasures": ["misura org 1"],
  "priorConsultationRequired": false,
  "priorConsultationRationale": ""
}`

  try {
    const text = await generateText(prompt, { temperature: 0.1, maxOutputTokens: 2500 })
    const cleaned = text.trim().replace(/^```json\s*/m, "").replace(/```\s*$/m, "").trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) throw new Error("No JSON found in response")
    const raw = JSON.parse(match[0])

    // Coerce numeric fields that might come back as strings
    if (Array.isArray(raw.threats)) {
      raw.threats = raw.threats.map((t: Record<string, unknown>) => ({
        ...t,
        likelihood: Math.min(5, Math.max(1, Number(t.likelihood) || 2)),
        impact: Math.min(5, Math.max(1, Number(t.impact) || 2)),
        affectedRights: Array.isArray(t.affectedRights) ? t.affectedRights : [],
        residualRisk: ["low","medium","high"].includes(t.residualRisk as string)
          ? t.residualRisk : "medium",
        gdprReference: t.gdprReference ?? "",
      }))
    }
    if (Array.isArray(raw.assets)) {
      raw.assets = raw.assets.map((a: Record<string, unknown>) => ({
        ...a,
        sensitivityLevel: ["low","medium","high"].includes(a.sensitivityLevel as string)
          ? a.sensitivityLevel : "medium",
        gdprArticle: a.gdprArticle ?? "",
      }))
    }
    raw.technicalMeasures = Array.isArray(raw.technicalMeasures) ? raw.technicalMeasures : []
    raw.organizationalMeasures = Array.isArray(raw.organizationalMeasures) ? raw.organizationalMeasures : []
    raw.priorConsultationRequired = Boolean(raw.priorConsultationRequired)
    raw.priorConsultationRationale = raw.priorConsultationRationale ?? ""

    return DpiaDraftSchema.parse(raw)
  } catch (err) {
    console.error("[draftDpiaSections] error:", err)
    return { error: "Impossibile generare la bozza DPIA. Compila manualmente le fasi 2-3-4." }
  }
}
