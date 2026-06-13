"use server";
import { generateText } from "@/lib/rag/rag-vertex";
import { OVERSIGHT_REQUIREMENTS } from "@/lib/oversight/oversight-requirements";
import type { MeasureImplementationType, OversightRequirementStatus } from "@/lib/oversight/oversight-types";

// ── suggestOversightMeasures ───────────────────────────────────────────────
// Propone per ciascuno dei 5 requisiti Art. 14(4) una bozza di misura concreta.

export interface SuggestedMeasure {
  requirementId: string;
  implementationType: MeasureImplementationType;
  implementationTypeRationale: string;
  measureDescription: string;
  status: OversightRequirementStatus;
}

export interface SuggestOversightMeasuresResult {
  measures: SuggestedMeasure[];
  aiWarning: string;
}

export async function suggestOversightMeasures(input: {
  systemName: string;
  systemDescription: string;
  riskTier: string;
  annexIIIArea?: string;
  intendedPurpose?: string;
}): Promise<SuggestOversightMeasuresResult> {
  const requirementsList = OVERSIGHT_REQUIREMENTS.map(
    (r, i) => `${i + 1}. id="${r.id}" — ${r.label} (${r.primaryReference})`
  ).join("\n");

  const prompt = `Sei un esperto di conformità AI Act UE (Reg. 2024/1689), specializzato in Art. 14 (supervisione umana per sistemi AI ad alto rischio).

Sistema AI da analizzare:
- Nome: ${input.systemName}
- Descrizione: ${input.systemDescription}
- Tier di rischio: ${input.riskTier}
- Area Allegato III: ${input.annexIIIArea ?? "n.d."}
- Finalità prevista: ${input.intendedPurpose ?? "n.d."}

Per ciascuno dei 5 requisiti operativi Art. 14(4) elencati di seguito, proponi:
1. implementationType: uno tra ["provider_built_in", "deployer_implemented", "both", "not_specified"]
   - "provider_built_in" = misura tecnicamente integrata dal provider (Art. 14(3)(a) [verify against current AI Act text])
   - "deployer_implemented" = misura da implementare dal deployer (Art. 14(3)(b) [verify against current AI Act text])
2. implementationTypeRationale: motivazione breve (1 frase, italiano)
3. measureDescription: 2-4 frasi concrete e specifiche per questo sistema — NON placeholder generici.
   - Per intervention_stop: descrivi esattamente lo "stato sicuro" operativo (es. cosa succede alle decisioni in sospeso, chi può riattivare, entro quanto)
   - Per automation_bias_awareness: descrivi misure concrete (es. obbligo di visualizzare confidence score, rotazione operatori, audit periodicoPer tutte le citazioni includi il suffisso: [verificare sul testo AI Act vigente]

I 5 requisiti:
${requirementsList}

Rispondi ESCLUSIVAMENTE nel formato JSON seguente, senza testo aggiuntivo:
<extract>
{
  "measures": [
    {
      "requirementId": "understanding_capabilities",
      "implementationType": "deployer_implemented",
      "implementationTypeRationale": "Motivazione breve [verificare sul testo AI Act vigente]",
      "measureDescription": "Descrizione concreta 2-4 frasi [verificare sul testo AI Act vigente]",
      "status": "not_started"
    },
    {
      "requirementId": "automation_bias_awareness",
      "implementationType": "deployer_implemented",
      "implementationTypeRationale": "Motivazione breve [verificare sul testo AI Act vigente]",
      "measureDescription": "Descrizione concreta con misure specifiche anti-automation-bias [verificare sul testo AI Act vigente]",
      "status": "not_started"
    },
    {
      "requirementId": "output_interpretation",
      "implementationType": "both",
      "implementationTypeRationale": "Motivazione breve [verificare sul testo AI Act vigente]",
      "measureDescription": "Descrizione concreta [verificare sul testo AI Act vigente]",
      "status": "not_started"
    },
    {
      "requirementId": "override_non_use",
      "implementationType": "deployer_implemented",
      "implementationTypeRationale": "Motivazione breve [verificare sul testo AI Act vigente]",
      "measureDescription": "Procedura override concreta [verificare sul testo AI Act vigente]",
      "status": "not_started"
    },
    {
      "requirementId": "intervention_stop",
      "implementationType": "deployer_implemented",
      "implementationTypeRationale": "Motivazione breve [verificare sul testo AI Act vigente]",
      "measureDescription": "Stato sicuro: descrizione operativa di cosa succede alle decisioni in sospeso, chi riattiva, entro quanto [verificare sul testo AI Act vigente]",
      "status": "not_started"
    }
  ]
}
</extract>`;

  const raw = await generateText(prompt);
  const match = raw.match(/<extract>([\s\S]*?)<\/extract>/);
  if (!match) throw new Error("L'AI non ha restituito un blocco <extract> valido.");

  let parsed: { measures: SuggestedMeasure[] };
  try { parsed = JSON.parse(match[1].trim()); }
  catch { throw new Error("Errore parsing JSON dalla risposta AI."); }

  return { measures: parsed.measures, aiWarning: "✦ AI — verifica e conferma" };
}

// ── assessFourEyesApplicability ────────────────────────────────────────────
// Propone se il modulo four-eyes Art. 14(5) è applicabile, usato solo come fallback
// quando la classificazione Annex III punto 1(a) non è disponibile da AI Inventory.

export interface FourEyesApplicabilityResult {
  applicable: "yes" | "no" | "unspecified";
  rationale: string;
  aiWarning: string;
}

export async function assessFourEyesApplicability(input: {
  systemName: string;
  systemDescription: string;
  intendedPurpose?: string;
  riskTier?: string;
}): Promise<FourEyesApplicabilityResult> {
  const prompt = `Sei un esperto di AI Act UE (Reg. 2024/1689).
Devi determinare se il seguente sistema AI rientra nell'Allegato III punto 1(a) — cioè se è un sistema di identificazione biometrica e/o categorizzazione biometrica — ai fini dell'applicazione della verifica a due persone di cui all'Art. 14(5) [verify against current AI Act text].

Sistema:
- Nome: ${input.systemName}
- Descrizione: ${input.systemDescription}
- Finalità: ${input.intendedPurpose ?? "n.d."}
- Tier di rischio: ${input.riskTier ?? "n.d."}

Rispondi SOLO con JSON:
<extract>
{
  "applicable": "yes|no|unspecified",
  "rationale": "Motivazione breve (1-2 frasi in italiano). Concludi con [verificare sul testo AI Act vigente]"
}
</extract>

Usa "yes" solo se il sistema identifica o categorizza persone fisiche tramite dati biometrici (volto, voce, impronta, andatura ecc.). Usa "no" se chiaramente non è un sistema biometrico. Usa "unspecified" se l'informazione è insufficiente.`;

  const raw = await generateText(prompt);
  const match = raw.match(/<extract>([\s\S]*?)<\/extract>/);
  if (!match) throw new Error("L'AI non ha restituito un blocco <extract> valido.");

  let parsed: { applicable: "yes" | "no" | "unspecified"; rationale: string };
  try { parsed = JSON.parse(match[1].trim()); }
  catch { throw new Error("Errore parsing JSON."); }

  return { ...parsed, aiWarning: "✦ AI — verifica e conferma" };
}
