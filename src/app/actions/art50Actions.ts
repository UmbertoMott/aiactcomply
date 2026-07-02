"use server";
import { generateText } from "@/lib/rag/rag-vertex";

export interface LabellingProposal {
  contentType: "text" | "audio" | "image" | "video";
  suggestedMethod: "embedded_metadata" | "visible_watermark" | "invisible_watermark" | "disclosure_statement_only" | "none";
  rationale: string;
  exemptionId?: string;
  exemptionJustification?: string;
}

export interface ProposeLabellingPlanResult {
  proposals: LabellingProposal[];
  aiWarning: string;
}

export async function proposeLabellingPlan(input: {
  systemName: string;
  intendedPurpose: string;
  contentTypes: string[];
  systemType: string;
}): Promise<ProposeLabellingPlanResult> {
  const prompt = `Sei un esperto di conformità AI Act UE (Reg. 2024/1689), specializzato in obblighi di trasparenza e marcatura contenuti sintetici (Art. 50(2) [verify against current AI Act text]).

Sistema AI:
- Nome: ${input.systemName}
- Tipo: ${input.systemType}
- Finalità prevista: ${input.intendedPurpose}
- Tipi di contenuto generato: ${input.contentTypes.join(", ")}

Per ciascun tipo di contenuto generato, proponi il metodo di labelling più appropriato tra:
- embedded_metadata: metadati incorporati (C2PA, IPTC, XMP) — machine-readable e human-readable
- visible_watermark: watermark visibile nell'output
- invisible_watermark: watermark invisibile, solo machine-readable
- disclosure_statement_only: sola dichiarazione testuale — ATTENZIONE: non soddisfa Art. 50(2) machine-readable senza eccezione
- none: nessun meccanismo — NON conforme senza eccezione documentata

Se applicabile, indica se una delle eccezioni Art. 50(2) [verify against current AI Act text] si applica:
- assistive_editing: editing assistivo senza alterazione sostanziale
- no_substantial_alteration: output non altera sostanzialmente l'input
- law_enforcement: autorizzato per indagini penali

Considera le best practice di settore: per testo generato da AI il metodo minimo accettabile è embedded_metadata o disclosure_statement_only con eccezione documentata; per audio/video/immagine è raccomandato embedded_metadata (C2PA).

Ogni citazione deve terminare con [verify against current AI Act text].

Rispondi SOLO nel formato JSON:
<extract>
{
  "proposals": [
    {
      "contentType": "text",
      "suggestedMethod": "disclosure_statement_only",
      "rationale": "Per output testuali di editing assistivo senza alterazione sostanziale...",
      "exemptionId": "assistive_editing",
      "exemptionJustification": "Il sistema modifica testi dell'utente senza stravolgerne il significato..."
    }
  ]
}
</extract>`;

  const raw = await generateText(prompt);
  const match = raw.match(/<extract>([\s\S]*?)<\/extract>/);
  if (!match) throw new Error("L'AI non ha restituito un blocco <extract> valido.");

  let parsed: { proposals: LabellingProposal[] };
  try { parsed = JSON.parse(match[1].trim()); }
  catch { throw new Error("Errore parsing JSON dalla risposta AI."); }

  return { proposals: parsed.proposals, aiWarning: "✦ AI — verifica e conferma" };
}
