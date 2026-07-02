"use server";
import { generateText } from "@/lib/rag/rag-vertex";
import {
  EMOTION_RECOGNITION_HINTS,
  BIOMETRIC_CATEGORIZATION_HINTS,
  WORKPLACE_EDUCATION_HINTS,
  SENSITIVE_INFERENCE_CATEGORIES,
} from "@/lib/art5/art5-prohibited-practices";

export interface EmotionBiometricTriageProposal {
  inferEmotions: "yes" | "no" | "unspecified";
  appliesToWorkplaceOrEducation: "yes" | "no" | "unspecified";
  performsBiometricCategorization: "yes" | "no" | "unspecified";
  inferredCategories: string[];
  rationale: string;
}

export interface ProposeEmotionBiometricTriageResult {
  proposal: EmotionBiometricTriageProposal;
  aiWarning: string;
}

export async function proposeEmotionBiometricTriage(input: {
  systemName: string;
  intendedPurpose: string;
  description: string;
}): Promise<ProposeEmotionBiometricTriageResult> {
  const prompt = `Sei un esperto di conformità AI Act UE (Reg. 2024/1689), specializzato nell'Art. 5 — pratiche vietate.
Devi analizzare un sistema AI e proporre una valutazione iniziale (triage) per due specifiche pratiche vietate.

SISTEMA AI DA ANALIZZARE:
- Nome: ${input.systemName}
- Finalità dichiarata: ${input.intendedPurpose}
- Descrizione: ${input.description}

PRATICA 1 — Art. 5(1)(f) [verify against current AI Act text]:
Sistemi che inferiscono le emozioni di persone fisiche in luoghi di lavoro o istituti di istruzione.
Keyword di attenzione: ${EMOTION_RECOGNITION_HINTS.join(", ")}.
Contesti di rischio: ${WORKPLACE_EDUCATION_HINTS.join(", ")}.

PRATICA 2 — Art. 5(1)(g) [verify against current AI Act text]:
Sistemi di categorizzazione biometrica che classificano individui sulla base di dati biometrici
per inferire: ${SENSITIVE_INFERENCE_CATEGORIES.join(", ")}.
Keyword di attenzione: ${BIOMETRIC_CATEGORIZATION_HINTS.join(", ")}.

ISTRUZIONI:
1. Analizza la descrizione del sistema (anche in inglese o con formulazioni indirette).
2. Proponi valori iniziali per i seguenti campi (usa "unspecified" se non hai elementi sufficienti):
   - inferEmotions: "yes" | "no" | "unspecified" — il sistema inferisce/rileva emozioni?
   - appliesToWorkplaceOrEducation: "yes" | "no" | "unspecified" — il contesto è lavoro o istruzione?
   - performsBiometricCategorization: "yes" | "no" | "unspecified" — categorizza individui con dati biometrici?
   - inferredCategories: array di categorie sensibili tra [${SENSITIVE_INFERENCE_CATEGORIES.join(", ")}] (vuoto se non applicabile)
3. Fornisci una rationale breve (max 3 frasi) in italiano.

IMPORTANTE: Le tue proposte sono solo un punto di partenza (✦ AI — verifica e conferma).
L'utente DEVE confermare o correggere ogni campo. Non proporre mai un esito definitivo.

Rispondi SOLO nel formato JSON:
<extract>
{
  "inferEmotions": "yes" | "no" | "unspecified",
  "appliesToWorkplaceOrEducation": "yes" | "no" | "unspecified",
  "performsBiometricCategorization": "yes" | "no" | "unspecified",
  "inferredCategories": [],
  "rationale": "..."
}
</extract>`;

  const raw = await generateText(prompt);
  const match = raw.match(/<extract>([\s\S]*?)<\/extract>/);
  if (!match) throw new Error("L'AI non ha restituito un blocco <extract> valido.");

  let parsed: EmotionBiometricTriageProposal;
  try { parsed = JSON.parse(match[1].trim()); }
  catch { throw new Error("Errore parsing JSON dalla risposta AI."); }

  return { proposal: parsed, aiWarning: "✦ AI — verifica e conferma" };
}
