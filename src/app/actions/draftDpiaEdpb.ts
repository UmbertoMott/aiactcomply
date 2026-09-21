"use server";

import { generateText } from "@/lib/rag/rag-vertex";
import { z } from "zod";

// Input minimo per la pre-compilazione AI del template EDPB.
export interface DpiaEdpbIntake {
  systemName: string;
  description: string;      // finalità / descrizione del trattamento
  dataCategories?: string;  // categorie di dati (facoltativo)
  locale?: "it" | "en";
}

const Level = z.enum(["low", "medium", "high"]);

const DraftSchema = z.object({
  personalData: z.string().default(""),
  specialCategories: z.string().default(""),
  purposes: z.array(z.object({ purpose: z.string(), legalBasis: z.string() })).default([]),
  secondaryUses: z.string().default(""),
  nature: z.string().default(""),
  scopeDesc: z.string().default(""),
  context: z.string().default(""),
  functionalDescription: z.string().default(""),
  lifecycle: z.object({
    collection: z.string().default(""),
    use: z.string().default(""),
    storage: z.string().default(""),
    sharing: z.string().default(""),
    deletion: z.string().default(""),
  }).default({ collection: "", use: "", storage: "", sharing: "", deletion: "" }),
  legalBasisAnalysis: z.string().default(""),
  minimisationRetention: z.string().default(""),
  dataQuality: z.string().default(""),
  measuresArt5: z.array(z.string()).default([]),
  measuresRights: z.array(z.string()).default([]),
  measuresSecurity: z.array(z.string()).default([]),
  measuresDpbdd: z.array(z.string()).default([]),
  impactsRightsFreedoms: z.string().default(""),
  necessity: z.string().default(""),
  proportionality: z.string().default(""),
  eventImpacts: z.string().default(""),
  riskMethod: z.string().default(""),
  risks: z.array(z.object({
    scenario: z.string(),
    threat: z.string().default(""),
    riskSource: z.string().default(""),
    impact: z.string().default(""),
    likelihood: Level.default("medium"),
    severity: Level.default("medium"),
  })).default([]),
});

export type DpiaEdpbDraft = z.infer<typeof DraftSchema>;

export async function draftDpiaEdpb(
  intake: DpiaEdpbIntake
): Promise<DpiaEdpbDraft | { error: string }> {
  const name = (intake.systemName || "").trim() || "non specificato";
  const desc = (intake.description || "").trim() || "non specificata";
  const cats = (intake.dataCategories || "").trim();
  const en = intake.locale === "en";
  const lang = en ? "English" : "Italian";

  const prompt = `You are a Data Protection Impact Assessment (DPIA) expert following the EDPB DPIA Template 2026 (aligned with Art. 35 GDPR). Draft concise, professional starting-point content that the controller will review and refine.

PROCESSING CONTEXT (provided by the user):
- System / processing name: ${name}
- Purpose / description: ${desc}
- Data categories: ${cats || "not specified — infer plausible ones"}

Write ALL free-text values in ${lang}. Keep each field concise (1-4 sentences). Be specific to the described system; do not invent a different system. For legal bases use GDPR articles (e.g. Art. 6(1)(a/b/c/f), Art. 9(2)). Likelihood/severity must be one of: low, medium, high.

Return ONLY valid JSON, no text outside the JSON, with exactly this shape:
{
  "personalData": "",
  "specialCategories": "",
  "purposes": [{ "purpose": "", "legalBasis": "" }],
  "secondaryUses": "",
  "nature": "",
  "scopeDesc": "",
  "context": "",
  "functionalDescription": "",
  "lifecycle": { "collection": "", "use": "", "storage": "", "sharing": "", "deletion": "" },
  "legalBasisAnalysis": "",
  "minimisationRetention": "",
  "dataQuality": "",
  "measuresArt5": ["", ""],
  "measuresRights": ["", ""],
  "measuresSecurity": ["", ""],
  "measuresDpbdd": ["", ""],
  "impactsRightsFreedoms": "",
  "necessity": "",
  "proportionality": "",
  "eventImpacts": "",
  "riskMethod": "",
  "risks": [{ "scenario": "", "threat": "", "riskSource": "", "impact": "", "likelihood": "medium", "severity": "medium" }]
}`;

  try {
    const text = await generateText(prompt, { temperature: 0.2, maxOutputTokens: 3000 });
    const cleaned = text.trim().replace(/^```json\s*/m, "").replace(/```\s*$/m, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON found in response");
    const raw = JSON.parse(match[0]);
    return DraftSchema.parse(raw);
  } catch (err) {
    console.error("[draftDpiaEdpb] error:", err);
    return { error: en ? "Could not generate the draft. Please fill in the sections manually." : "Impossibile generare la bozza. Compila le sezioni manualmente." };
  }
}
