"use server"
import { generateText } from "@/lib/rag/rag-vertex"
import { z } from "zod"

const AiSystemDraftSchema = z.object({
  name: z.string(),
  owner: z.string(),
  description: z.string(),
  status: z.enum(["planned", "in_development", "in_production", "deprecated"]),
  euNexus: z.boolean(),
  role: z.enum(["provider", "deployer", "importer", "distributor", "authorized_rep", "product_manufacturer"]).nullable(),
  roleBasis: z.string(),
  tier: z.enum(["prohibited", "high_risk", "limited", "minimal", "gpai", "gpai_systemic", "unclassified"]),
  tierBasis: z.string(),
  dualRoleFlag: z.boolean(),
  obligationsNote: z.string(),
  nextReview: z.string(),
  reviewTrigger: z.string(),
  knownVendor: z.string().nullable(),
  confidenceLevel: z.enum(["high", "medium", "low"]),
  confidenceNote: z.string(),
})

export type AiSystemDraft = z.infer<typeof AiSystemDraftSchema>

export async function draftAiSystem(
  freeTextDescription: string,
  existingSystems: Array<{ id: string; name: string; description: string }>
): Promise<AiSystemDraft | { error: string }> {
  const today = new Date().toISOString().slice(0, 10)
  const nextYear = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10)

  const systemsContext = existingSystems.length > 0
    ? `\n\nSistemi già in inventario (per rilevare duplicati o similarità):\n${existingSystems.map(s => `- ${s.id}: ${s.name} — ${s.description}`).join("\n")}`
    : ""

  const prompt = `Sei un esperto di EU AI Act (Reg. UE 2024/1689). Analizza questa descrizione di sistema AI e genera un record di inventario pre-compilato.

Data di oggi: ${today}

DESCRIZIONE: "${freeTextDescription}"${systemsContext}

REGOLE FONDAMENTALI:
1. Il campo roleBasis DEVE terminare con " [verify against current AI Act text]"
2. Il campo tierBasis DEVE terminare con " [verify against current AI Act text]"
3. Se non puoi determinare un campo con ragionevole certezza, usa null per i campi nullable o "unclassified" per il tier
4. confidenceLevel = "high" solo se la descrizione è inequivocabile. "low" se ambigua
5. Per il tier, controlla nell'ordine: Art. 5 (prohibited) → Annex III (high_risk) → GPAI → Art. 50 (limited) → minimal
6. dualRoleFlag = true se il sistema viene modificato sostanzialmente rispetto al vendor originale (Art. 25)
7. nextReview deve essere la data ISO ${nextYear} (12 mesi da oggi)

Rispondi SOLO con JSON valido che rispetti esattamente questo schema. Nessun testo fuori dal JSON.

{
  "name": "nome breve del sistema",
  "owner": "team o persona responsabile se deducibile, altrimenti 'Da definire'",
  "description": "descrizione formale in 2-3 frasi, tono compliance",
  "status": "in_production | planned | in_development | deprecated",
  "euNexus": true,
  "role": "provider | deployer | importer | distributor | authorized_rep | product_manufacturer | null",
  "roleBasis": "motivazione in 1 frase [verify against current AI Act text]",
  "tier": "prohibited | high_risk | limited | minimal | gpai | gpai_systemic | unclassified",
  "tierBasis": "articolo o Annex entry in 1 frase [verify against current AI Act text]",
  "dualRoleFlag": false,
  "obligationsNote": "obblighi principali applicabili in 1-2 frasi [verify against current AI Act text]",
  "nextReview": "${nextYear}",
  "reviewTrigger": "on substantial modification or annually",
  "knownVendor": "nome vendor se riconosciuto (Workday, Salesforce, GitHub Copilot, ecc.) oppure null",
  "confidenceLevel": "high | medium | low",
  "confidenceNote": "perché il livello di confidenza è questo"
}`

  try {
    const text = await generateText(prompt, { temperature: 0.1, maxOutputTokens: 1500 })
    const cleaned = text.trim().replace(/^```json\s*/, "").replace(/```$/, "").trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error("No JSON found")
    return AiSystemDraftSchema.parse(JSON.parse(jsonMatch[0]))
  } catch {
    return { error: "Impossibile generare la bozza. Inserisci i dati manualmente." }
  }
}
