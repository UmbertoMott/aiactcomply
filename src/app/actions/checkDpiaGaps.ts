"use server";
import { generateText } from "@/lib/rag/rag-vertex";
import { z } from "zod";
import type { DPIAResult } from "@/lib/dossier/storage-schema";

const GapItemSchema = z.object({
  articleRef: z.string(),
  label: z.string(),
  status: z.enum(["ok", "incomplete", "missing"]),
  finding: z.string(),
  cta_step: z.number(),
  cta_label: z.string(),
});

export const DpiaGapCheckSchema = z.object({
  items: z.array(GapItemSchema),
  overall_coverage: z.enum(["complete", "partial", "insufficient"]),
  critical_gaps: z.array(z.string()),
  art36_required: z.boolean(),
  recommendation: z.string(),
});

export type DpiaGapItem = z.infer<typeof GapItemSchema>;
export type DpiaGapCheck = z.infer<typeof DpiaGapCheckSchema>;

function summarizeDpia(doc: DPIAResult): string {
  const d = doc.description;
  const p = doc.proportionality;
  const r = doc.risks;
  const m = doc.measures;

  return JSON.stringify({
    // 35(7)(a) — descrizione sistematica
    systemName: d.system_name,
    processingPurposes: d.processing_purposes?.slice(0, 300),
    personalDataCategories: d.personal_data_categories?.slice(0, 200),
    specialCategories: d.special_categories?.slice(0, 200),
    dataSubjectsCategories: d.data_subjects_categories?.slice(0, 200),
    retention: d.retention_period,
    assetsCount: d.assets?.length ?? 0,
    dpiaRequired: doc.screening.dpia_required,
    dpoConsulted: d.dpo_consulted,
    // 35(7)(b) — necessità e proporzionalità
    necessityJustification: p.necessity_justification?.slice(0, 300),
    propChecksCompliant: p.proportionality_checks?.filter(c => c.status === "compliant").length ?? 0,
    propChecksTotal: p.proportionality_checks?.length ?? 0,
    rightsChecksYes: p.rights_checks?.filter(c => c.applicable === "yes").length ?? 0,
    rightsChecksTotal: p.rights_checks?.length ?? 0,
    // 35(7)(c) — rischi per diritti e libertà
    threatsCount: r.threats?.length ?? 0,
    threatsHighRisk: r.threats?.filter(t => t.risk_level === "high").length ?? 0,
    overallRiskBefore: r.overall_risk_before,
    // 35(7)(d) — misure per affrontare i rischi
    hasTechnicalMeasures: !!(m.technical_measures?.trim()),
    hasOrgMeasures: !!(m.organizational_measures?.trim()),
    overallRiskAfter: m.overall_risk_after,
    priorConsultationRequired: m.prior_consultation_required,
    priorConsultationAuthority: m.prior_consultation_authority,
    // Conclusion
    conclusionCompliant: doc.conclusion.compliant,
    conclusionSummary: doc.conclusion.summary?.slice(0, 200),
  });
}

export async function checkDpiaGaps(doc: DPIAResult): Promise<DpiaGapCheck | { error: string }> {
  const summary = summarizeDpia(doc);

  const prompt = `Sei un esperto legale in GDPR (Art. 35 GDPR) e nella metodologia WP248 rev.01. Analizza la DPIA fornita e verifica la copertura degli elementi obbligatori.

DPIA SUMMARY (dati strutturati):
${summary}

Verifica TUTTI e 4 gli elementi obbligatori dell'Art. 35(7) più il trigger Art. 36:

1. Art. 35(7)(a) — Descrizione sistematica del trattamento: sistema, finalità, basi giuridiche, categorie dati, soggetti, retention, asset
2. Art. 35(7)(b) — Valutazione della necessità e proporzionalità: giustificazione, principi GDPR Art. 5, diritti degli interessati
3. Art. 35(7)(c) — Valutazione dei rischi per i diritti e le libertà degli interessati: identificazione minacce, likelihood/severity per minaccia
4. Art. 35(7)(d) — Misure previste per affrontare i rischi: misure tecniche, organizzative, rischio residuo complessivo
5. Art. 36 — Consultazione preventiva: trigger se rischio residuo alto e misure insufficienti

Per ogni elemento valuta status: "ok" (presente e sufficiente), "incomplete" (presente ma lacunoso), "missing" (assente).

Nota: art36_required = true se overallRiskAfter = "high" e le misure non sembrano sufficienti.

Rispondi SOLO con JSON valido:
{
  "items": [
    {
      "articleRef": "Art. 35(7)(a)",
      "label": "Descrizione sistematica del trattamento",
      "status": "ok|incomplete|missing",
      "finding": "cosa è presente o cosa manca (max 60 parole) [verifica contro il testo vigente del GDPR/WP248]",
      "cta_step": 1,
      "cta_label": "Vai a Step 1 — Descrizione"
    }
  ],
  "overall_coverage": "complete|partial|insufficient",
  "critical_gaps": ["lista gap critici, stringhe brevi"],
  "art36_required": false,
  "recommendation": "Raccomandazione sintetica (1-2 frasi) [verifica contro il testo vigente del GDPR/WP248]"
}`;

  try {
    const text = await generateText(prompt, { temperature: 0.1, maxOutputTokens: 1500 });
    const cleaned = text.trim().replace(/^```json\s*/m, "").replace(/```\s*$/m, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON");
    return DpiaGapCheckSchema.parse(JSON.parse(match[0]));
  } catch {
    return { error: "Impossibile eseguire il gap-check. Riprova." };
  }
}
