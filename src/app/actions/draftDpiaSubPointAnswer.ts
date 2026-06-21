"use server";
// Propone una bozza di risposta per un singolo sotto-punto della DPIA guidata.
// Usa il ghost data (Classifier, DataAudit) + gli examples[] del template.
// L'output è sempre marcato con il badge ✦ AI — mai salvato automaticamente.
import { generateText } from "@/lib/rag/rag-vertex";
import { DPIA_SUBPOINTS } from "@/lib/dpia/dpia-template";
import type { ClassifierResult, DataAuditResult } from "@/lib/dossier/storage-schema";

export interface DpiaSubPointDraftInput {
  subPointId: string;
  ghostClassifier?: ClassifierResult | null;
  ghostDataAudit?: DataAuditResult | null;
  previousAnswers?: Record<string, string>;
}

export interface DpiaSubPointDraftResult {
  subPointId: string;
  draft: string;
  confidence: "high" | "medium" | "low";
}

export async function draftDpiaSubPointAnswer(
  input: DpiaSubPointDraftInput
): Promise<DpiaSubPointDraftResult | { error: string }> {
  const sp = DPIA_SUBPOINTS.find(s => s.id === input.subPointId);
  if (!sp) return { error: `Sotto-punto non trovato: ${input.subPointId}` };

  const classifier = input.ghostClassifier;
  const audit = input.ghostDataAudit;

  const ghostContext = [
    classifier && `Sistema: ${classifier.systemName || "n.d."}`,
    classifier && `Descrizione: ${classifier.systemDescription || "n.d."}`,
    classifier && `Risk tier EU AI Act: ${classifier.riskLevel || "n.d."}`,
    classifier && `Annex III: ${classifier.annexIII ? "Sì" : "No"}`,
    classifier && `Ruolo: ${classifier.role || "n.d."}`,
    audit?.datasets?.length && `Dataset: ${audit.datasets.map(d => d.name).join(", ")}`,
    audit?.datasets?.some(d => d.personalData) && `Dati personali: presenti`,
    input.previousAnswers?.["a_system_name"] && `Nome sistema (già risposto): ${input.previousAnswers["a_system_name"]}`,
    input.previousAnswers?.["a_processing_purposes"] && `Finalità (già risposta): ${input.previousAnswers["a_processing_purposes"]}`,
  ].filter(Boolean).join("\n");

  const examplesText = sp.examples.slice(0, 3).map((ex, i) => `Esempio ${i + 1}: "${ex}"`).join("\n");

  const prompt = `Sei un esperto di GDPR e DPIA (Art. 35 GDPR). Devi proporre una bozza di risposta per il sotto-punto seguente della DPIA guidata.

SOTTO-PUNTO: ${sp.label}
DOMANDA: ${sp.question}
RIFERIMENTO NORMATIVO: ${sp.ref}

CONTESTO DEL SISTEMA (ghost data — già validato dall'utente):
${ghostContext || "Nessun ghost data disponibile — proponi una risposta generica basata sugli esempi."}

ESEMPI DI RISPOSTE ACCETTABILI (da Template_DPIA_Guidato_WP248_Annex2):
${examplesText}

ISTRUZIONI:
1. Proponi UNA bozza concisa e specifica basata sul contesto del sistema.
2. Se il contesto non è sufficiente per una risposta specifica, usa l'Esempio 1 come base e segnalalo.
3. La risposta deve essere in italiano, diretta e utilizzabile immediatamente.
4. NON aggiungere intestazioni, prefissi come "Bozza:", "Proposta:" — solo il testo della risposta.
5. Termina sempre con: [verifica contro il testo vigente del GDPR/WP248]
6. Massimo 150 parole.`;

  try {
    const raw = await generateText(prompt, { temperature: 0.2, maxOutputTokens: 400 });
    const draft = raw.trim();

    const confidence: DpiaSubPointDraftResult["confidence"] =
      ghostContext.length > 100 ? "high"
      : ghostContext.length > 0 ? "medium"
      : "low";

    return { subPointId: input.subPointId, draft, confidence };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `Errore AI: ${msg}` };
  }
}
