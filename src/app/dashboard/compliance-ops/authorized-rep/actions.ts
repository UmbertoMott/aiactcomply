"use server";

// Mandate content validation — PROMPT BG
// Uses Vertex AI (generateText) — server-side only

import { generateText } from "@/lib/rag/rag-vertex";
import { MANDATORY_DUTIES } from "@/types/authorized-rep";

export interface MandateValidationResult {
  status: "valid" | "missing_duties" | "not_validated";
  missingDuties: string[];
  presentDuties: string[];
}

export async function validateMandateContent(
  mandateText: string
): Promise<MandateValidationResult> {
  if (!mandateText.trim() || mandateText.length < 50) {
    return { status: "not_validated", missingDuties: [], presentDuties: [] };
  }

  const dutiesList = MANDATORY_DUTIES.map(d => `- ${d.duty} (${d.artRef})`).join("\n");
  const prompt = `Analizza questo testo di mandato per Rappresentante Autorizzato (EU AI Act Art. 22).
Verifica che contenga ESPLICITAMENTE ognuno di questi compiti obbligatori:
${dutiesList}

Per ogni compito indica se è presente (sì/no) nel testo del mandato.
Rispondi SOLO con JSON valido, senza markdown:
{ "present": ["compito1", "compito2"], "missing": ["compito3"] }

TESTO MANDATO:
${mandateText.slice(0, 6000)}`.trim();

  try {
    const raw = await generateText(prompt, { temperature: 0.05, maxOutputTokens: 600 });
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as { present: string[]; missing: string[] };
    return {
      status: parsed.missing.length === 0 ? "valid" : "missing_duties",
      presentDuties: parsed.present,
      missingDuties: parsed.missing,
    };
  } catch {
    return { status: "not_validated", missingDuties: [], presentDuties: [] };
  }
}
