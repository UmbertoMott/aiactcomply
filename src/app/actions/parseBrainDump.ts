"use server"
import { generateText } from "@/lib/rag/rag-vertex"
import { z } from "zod"

const BrainDumpResultSchema = z.object({
  organizationType: z.enum(["private", "public", "financial", "healthcare", "education", "other"]),
  sector: z.string(),
  employeeCount: z.enum(["<50", "50-250", "250-1000", ">1000", "unknown"]),
  operatesInEU: z.boolean(),
  operatesWithItalianPA: z.boolean(),

  systemName: z.string(),
  systemDescription: z.string(),
  systemPurpose: z.string(),
  isCustomDeveloped: z.boolean(),
  baseVendor: z.string().nullable(),

  affectsNaturalPersons: z.boolean(),
  userGroups: z.array(z.string()),
  vulnerableGroups: z.boolean(),

  automatesDecisions: z.boolean(),
  humanInLoop: z.boolean(),
  deploymentScope: z.string(),

  likelyRole: z.enum(["provider", "deployer", "importer", "distributor", "unknown"]),
  likelyTier: z.enum(["prohibited", "high_risk", "limited", "minimal", "gpai", "unclassified"]),
  likelyTierArticle: z.string(),
  dualRoleRisk: z.boolean(),
  art5Risk: z.boolean(),

  confidenceLevel: z.enum(["high", "medium", "low"]),
  flaggedWarnings: z.array(z.string()),
})

export type BrainDumpResult = z.infer<typeof BrainDumpResultSchema>

export async function parseBrainDump(
  freeText: string
): Promise<BrainDumpResult | { error: string }> {
  const today = new Date().toISOString().slice(0, 10)

  const prompt = `Sei un esperto EU AI Act (Reg. UE 2024/1689). Analizza questa descrizione di un sistema AI e pre-compila i 4 step del processo di classificazione.

TESTO LIBERO: "${freeText}"
DATA ODIERNA: ${today}

REGOLE TASSATIVE:
1. likelyTier: controlla nell'ordine Art. 5 → Annex III → GPAI → Art. 50 → minimal
2. Se il testo menziona screening CV, selezione candidati, valutazione performance lavorativa: likelyTier = "high_risk", likelyTierArticle = "Annex III(4)(a) — employment, recruitment/selection [verify against current AI Act text]"
3. Se menziona scoring crediti, assicurazioni vita/salute, accesso servizi finanziari: likelyTier = "high_risk", likelyTierArticle = "Annex III(5) — access to financial services [verify against current AI Act text]"
4. Se menziona riconoscimento emozioni in contesto lavorativo o educativo: art5Risk = true (Art. 5(1)(f))
5. Se menziona GPT, Claude, Gemini, LLM, modello linguistico, chatbot AI: likelyTier = "gpai", likelyTierArticle = "Art. 51 — General Purpose AI Model [verify against current AI Act text]"
6. Se menziona identificazione biometrica real-time in spazi pubblici: likelyTier = "prohibited", art5Risk = true
7. dualRoleRisk = true se l'utente menziona fine-tuning, modifica, adattamento del modello base
8. flaggedWarnings: massimo 3 warning, solo se normativamente fondati
9. likelyRole = "deployer" se l'utente usa un sistema di terzi; "provider" se lo sviluppa internamente

Rispondi SOLO con JSON valido, nessun testo fuori dal JSON:
{
  "organizationType": "private|public|financial|healthcare|education|other",
  "sector": "settore breve",
  "employeeCount": "<50|50-250|250-1000|>1000|unknown",
  "operatesInEU": true,
  "operatesWithItalianPA": false,
  "systemName": "nome breve del sistema",
  "systemDescription": "descrizione formale 2 frasi",
  "systemPurpose": "scopo principale in 1 frase",
  "isCustomDeveloped": false,
  "baseVendor": "nome vendor o null",
  "affectsNaturalPersons": true,
  "userGroups": ["gruppi utenti"],
  "vulnerableGroups": false,
  "automatesDecisions": true,
  "humanInLoop": false,
  "deploymentScope": "ambito geografico/funzionale",
  "likelyRole": "provider|deployer|importer|distributor|unknown",
  "likelyTier": "prohibited|high_risk|limited|minimal|gpai|unclassified",
  "likelyTierArticle": "riferimento normativo [verify against current AI Act text]",
  "dualRoleRisk": false,
  "art5Risk": false,
  "confidenceLevel": "high|medium|low",
  "flaggedWarnings": []
}`

  try {
    const text = await generateText(prompt, { temperature: 0.1, maxOutputTokens: 1500 })
    const cleaned = text.trim().replace(/^```json\s*/m, "").replace(/```\s*$/m, "").trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) throw new Error("No JSON found")
    return BrainDumpResultSchema.parse(JSON.parse(match[0]))
  } catch {
    return { error: "Analisi non disponibile. Completa il Triage manualmente." }
  }
}
