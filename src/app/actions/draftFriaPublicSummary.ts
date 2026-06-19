"use server";
import { generateText } from "@/lib/rag/rag-vertex";
import type { FRIADocument } from "@/lib/simulation/fria-engine";

export async function draftFriaPublicSummary(
  doc: FRIADocument
): Promise<{ summary: string } | { error: string }> {
  const highImpacts = doc.scenarios.flatMap((s) =>
    s.right_impacts.filter(
      (ri) =>
        ri.severity?.computed_severity === "high" ||
        ri.severity?.computed_severity === "critical"
    )
  );
  const criticalCount = highImpacts.filter(
    (ri) => ri.severity?.computed_severity === "critical"
  ).length;
  const highCount = highImpacts.filter(
    (ri) => ri.severity?.computed_severity === "high"
  ).length;

  const mitigationDescriptions = doc.scenarios
    .flatMap((s) => s.right_impacts.flatMap((ri) => ri.mitigations))
    .map((m) => m.description)
    .filter(Boolean)
    .slice(0, 5)
    .join("; ") || "nessuna misura documentata";

  const prompt = `Sei un esperto legale specializzato nell'AI Act europeo e nella comunicazione pubblica.

Devi redigere una sintesi pubblica ai sensi dell'Art. 27 del Regolamento UE sull'Intelligenza Artificiale (AI Act).

Dati della FRIA (Valutazione d'Impatto sui Diritti Fondamentali):
- Sistema AI: ${doc.system_name || "Sistema AI non specificato"}
- Organizzazione: ${doc.organization || "non specificata"}
- Scopo previsto: ${doc.context.intended_purpose_explanation || "non specificato"}
- Categorie di persone interessate: ${doc.context.affected_persons || "non specificato"}
- Numero di scenari analizzati: ${doc.scenarios.length}
- Impatti ad alta severità identificati: ${highCount}
- Impatti critici identificati: ${criticalCount}
- Raccomandazione di deployment: ${doc.deployment.recommendation || "non determinata"}
- Principali misure di mitigazione: ${mitigationDescriptions}

Genera una sintesi pubblica in italiano che copra obbligatoriamente questi 5 punti:
1. Sistema valutato: descrivi il sistema AI, la sua finalità e il contesto di utilizzo
2. Categorie di persone interessate: chi è soggetto all'utilizzo del sistema
3. Principali rischi identificati: i rischi sui diritti fondamentali emersi dalla valutazione
4. Misure adottate: le misure di mitigazione implementate per ridurre i rischi
5. Decisione di deployment: la raccomandazione finale e le eventuali condizioni

Tono: formale, accessibile al pubblico, conforme alle linee guida ECNL/DIHR.
Lunghezza: 400-600 parole.
Lingua: italiano.

Rispondi SOLO con il testo della sintesi, senza intestazioni aggiuntive, senza JSON, senza markdown.`;

  try {
    const text = await generateText(prompt, { temperature: 0.2, maxOutputTokens: 800 });
    const summary = text.trim() + "\n\n[verifica contro il testo vigente dell'AI Act]";
    return { summary };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `Impossibile generare la sintesi AI: ${message}` };
  }
}
