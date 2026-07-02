"use server";

// Server Action — Art. 26(1) AI Instructions Reader — PROMPT BD
// Usa Vertex AI (generateText da src/lib/rag/rag-vertex.ts)
// ✦ AI — verifica e conferma finché aiConfirmed !== true

import { generateText } from "@/lib/rag/rag-vertex";

export interface InstructionsInsights {
  operationalLimits: string[];
  correctInputParams: string[];
  emergencyStopProcedure: string[];
  aiConfirmed: boolean;
}

export async function extractInstructionsInsights(
  rawText: string
): Promise<InstructionsInsights> {
  const prompt = `
Analizza questo documento "Instructions for Use" di un sistema AI ad alto rischio (EU AI Act Art. 13).
Estrai esattamente:
1. LIMITI OPERATIVI: contesti o condizioni in cui il sistema NON deve essere usato
2. PARAMETRI INPUT CORRETTI: formato, range e qualità degli input ammessi
3. PROCEDURA SOSPENSIONE: passi per fermare il sistema in caso di malfunzionamento

Risposta SOLO in JSON valido, nessun testo fuori dal JSON:
{ "operationalLimits": [], "correctInputParams": [], "emergencyStopProcedure": [] }

Massimo 5 voci per categoria. Linguaggio chiaro, non tecnico. In italiano.

DOCUMENTO:
${rawText.slice(0, 8000)}
  `.trim();

  try {
    const raw = await generateText(prompt);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const parsed = JSON.parse(jsonMatch[0]) as {
      operationalLimits?: string[];
      correctInputParams?: string[];
      emergencyStopProcedure?: string[];
    };
    return {
      operationalLimits: parsed.operationalLimits ?? [],
      correctInputParams: parsed.correctInputParams ?? [],
      emergencyStopProcedure: parsed.emergencyStopProcedure ?? [],
      aiConfirmed: false, // ✦ AI — richiede conferma esplicita
    };
  } catch {
    return {
      operationalLimits: [],
      correctInputParams: [],
      emergencyStopProcedure: [],
      aiConfirmed: false,
    };
  }
}
