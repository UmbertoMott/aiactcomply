"use server";
import { generateText } from "@/lib/rag/rag-vertex";
import type { DeployerApplicabilityFlags } from "@/lib/deployer/deployer-types";
import type { AISystem } from "@/lib/inventory/ai-system";

// ── assessDeployerApplicability ────────────────────────────────────────────
// Propone i flag di applicabilità per un sistema AI dal punto di vista
// del deployer (Art. 26). Output: JSON con i 6 flag booleani + rationale.

export interface ApplicabilityAssessmentResult {
  flags: DeployerApplicabilityFlags;
  rationale: Record<keyof DeployerApplicabilityFlags, string>;
  aiWarning: string;
}

export async function assessDeployerApplicability(
  system: Pick<AISystem, "name" | "description" | "tier" | "tierBasis" | "role" | "obligationsNote">
): Promise<ApplicabilityAssessmentResult> {
  const prompt = `Sei un esperto di conformità AI Act UE (Reg. 2024/1689).
Analizza il seguente sistema AI dal punto di vista del DEPLOYER (Art. 26) e proponi i flag di applicabilità degli obblighi condizionali.

Sistema AI:
- Nome: ${system.name}
- Descrizione: ${system.description ?? "n.d."}
- Tier di rischio: ${system.tier}
- Motivazione tier: ${system.tierBasis ?? "n.d."}
- Ruolo organizzazione: ${system.role ?? "deployer"}
- Note obblighi: ${system.obligationsNote ?? "n.d."}

I 6 flag condizionali (rispondi true/false per ciascuno):
1. usesHighRiskSystem — il sistema rientra in Allegato III (alto rischio)?
2. usesInternalProcedures — sono previste/necessarie procedure interne di controllo?
3. employeeImpact — il sistema impatta direttamente i lavoratori (ad es. monitoraggio, selezione, valutazione)?
4. biometricCategorization — il sistema utilizza categorizzazione biometrica o riconoscimento emozioni?
5. eudbRequired — il deployer è un'autorità pubblica che deve registrare in EUDB (Art. 49(2))?
6. rbiApplicable — si applica la registrazione RBI entro 48h (Art. 26(10))?

Rispondi ESCLUSIVAMENTE nel formato JSON seguente, senza testo aggiuntivo:
<extract>
{
  "flags": {
    "usesHighRiskSystem": true,
    "usesInternalProcedures": true,
    "employeeImpact": false,
    "biometricCategorization": false,
    "eudbRequired": false,
    "rbiApplicable": false
  },
  "rationale": {
    "usesHighRiskSystem": "Motivazione breve in italiano [verificare sul testo AI Act vigente]",
    "usesInternalProcedures": "Motivazione breve in italiano [verificare sul testo AI Act vigente]",
    "employeeImpact": "Motivazione breve in italiano [verificare sul testo AI Act vigente]",
    "biometricCategorization": "Motivazione breve in italiano [verificare sul testo AI Act vigente]",
    "eudbRequired": "Motivazione breve in italiano [verificare sul testo AI Act vigente]",
    "rbiApplicable": "Motivazione breve in italiano [verificare sul testo AI Act vigente]"
  }
}
</extract>`;

  const raw = await generateText(prompt);

  const match = raw.match(/<extract>([\s\S]*?)<\/extract>/);
  if (!match) {
    throw new Error("L'AI non ha restituito un blocco <extract> valido.");
  }

  let parsed: { flags: DeployerApplicabilityFlags; rationale: Record<string, string> };
  try {
    parsed = JSON.parse(match[1].trim());
  } catch {
    throw new Error("Errore nel parsing JSON dalla risposta AI.");
  }

  return {
    flags: parsed.flags,
    rationale: parsed.rationale as Record<keyof DeployerApplicabilityFlags, string>,
    aiWarning: "✦ AI — verifica e conferma",
  };
}

// ── draftWorkerInformationNotice ───────────────────────────────────────────
// Genera una bozza di informativa per i lavoratori (Art. 26(7)).

export interface WorkerNoticeResult {
  noticeText: string;
  aiWarning: string;
}

export async function draftWorkerInformationNotice(input: {
  systemName: string;
  systemDescription: string;
  organizationName: string;
  deploymentContext: string;
}): Promise<WorkerNoticeResult> {
  const prompt = `Sei un esperto di diritto del lavoro e conformità AI Act UE (Reg. 2024/1689).
Redigi una bozza di INFORMATIVA AI PER I LAVORATORI ai sensi dell'Art. 26(7) del Regolamento AI Act.

Dati del sistema:
- Nome sistema AI: ${input.systemName}
- Descrizione: ${input.systemDescription}
- Organizzazione deployer: ${input.organizationName}
- Contesto di deployment: ${input.deploymentContext}

L'informativa deve:
1. Essere in italiano formale
2. Indicare il sistema AI utilizzato e il suo scopo
3. Spiegare come interagisce con i lavoratori
4. Descrivere le misure di supervisione umana
5. Indicare i diritti dei lavoratori e i referenti per domande
6. Contenere la dicitura normativa [verificare sul testo AI Act vigente]
7. Essere pronta per la comunicazione sindacale / HR

Restituisci SOLO il testo dell'informativa, senza prefazioni o commenti aggiuntivi.
Inizia con: "INFORMATIVA AI PER I LAVORATORI — Art. 26(7) Regolamento UE 2024/1689"`;

  const noticeText = await generateText(prompt);

  return {
    noticeText,
    aiWarning: "✦ AI — verifica e conferma",
  };
}
