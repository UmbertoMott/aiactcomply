"use server";
import { generateText } from "@/lib/rag/rag-vertex";

export interface NextStepRationale {
  rationale: string; // 1-2 sentences Italian explaining why this is the next step
}

export async function draftNextStepRationale(params: {
  stepKey: string;
  stepTitle: string;
  systemName: string;
  friaSummary: string; // condensed JSON string of key FRIA state
}): Promise<NextStepRationale | { error: string }> {
  const prompt = `Sei un esperto di AI Act EU (Reg. 2024/1689) e metodologie FRIA (Fundamental Rights Impact Assessment, DIHR/ECNL).

Il sistema AI valutato si chiama: ${params.systemName}
Stato attuale della FRIA: ${params.friaSummary}
Prossimo step raccomandato: ${params.stepTitle}

Scrivi in italiano 1-2 frasi che spiegano PERCHÉ questo specifico step è il prossimo passo utile per questa FRIA, facendo riferimento ai dati specifici del sistema.
Sii concreto: cita numeri (es. "3 scenari senza misure di mitigazione"), stati specifici, o gap normativi.
Termina con [verifica contro il testo vigente dell'AI Act].`;

  try {
    const text = await generateText(prompt, { temperature: 0.3, maxOutputTokens: 200 });
    return { rationale: text.trim() };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Errore generazione AI" };
  }
}
