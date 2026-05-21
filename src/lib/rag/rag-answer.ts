// RAG Generation — Gemini 2.0 Flash via Vertex AI
// Builds the RAG prompt with cited sources, calls generation model,
// extracts [Fonte: ...] citations from the answer.

import type { RagChunk, RagAnswer, RagSource } from "./rag-types";
import { generateText, MODEL_NAME } from "./rag-vertex";

const CITATION_RE = /\[Fonte:[^\]]{5,200}\]/gi;

const SYSTEM_PROMPT_IT = `Sei un esperto di EU AI Act (Regolamento UE 2024/1689) e normativa AI.
Rispondi ESCLUSIVAMENTE in base ai documenti forniti nel contesto.

FORMATO OBBLIGATORIO — rispetta SEMPRE queste regole:
1. Scrivi UNA frase introduttiva opzionale (senza citazione).
2. Poi elenca i punti come bullet con "* " all'inizio di ogni riga.
3. Ogni bullet DEVE terminare con la citazione inline:
   [Fonte: {titolo_documento} — {sezione_ref}, p. {numero_pagina}]
4. Non usare mai prosa continua per le affermazioni principali.
5. Se le informazioni sono parziali, cita quello che trovi come bullet e segnala i limiti.
6. Se l'informazione è completamente assente, scrivi un solo bullet:
   * Informazione non disponibile nei documenti indicizzati. [Fonte: nessun documento pertinente]
Non inventare riferimenti normativi.`;

const SYSTEM_PROMPT_EN = `You are an expert on the EU AI Act (Regulation EU 2024/1689) and AI regulation.
Answer EXCLUSIVELY based on the documents provided in the context.

MANDATORY FORMAT — always follow these rules:
1. Write ONE optional introductory sentence (no citation).
2. Then list points as bullets starting with "* " on each line.
3. Every bullet MUST end with an inline citation:
   [Source: {document_title} — {section_ref}, p. {page_number}]
4. Never use continuous prose for main statements.
5. If information is partial, cite what you find as bullets and note the limits.
6. If information is completely absent, write a single bullet:
   * Information not available in the indexed documents. [Source: no relevant document]
Do not invent regulatory references.`;

function buildPrompt(
  query: string,
  chunks: RagChunk[],
  lang: "it" | "en" = "it"
): string {
  const systemPrompt = lang === "it" ? SYSTEM_PROMPT_IT : SYSTEM_PROMPT_EN;

  if (chunks.length === 0) {
    return (
      `${systemPrompt}\n\n` +
      `CONTESTO: nessun documento rilevante trovato.\n\n` +
      `Domanda: ${query}\n\n` +
      `Risposta: Questa informazione non è disponibile nei documenti indicizzati.`
    );
  }

  const contextParts = chunks.map((c, i) => {
    const ref   = c.sectionRef ?? "sezione sconosciuta";
    const page  = c.pageNumber ?? "?";
    const title = c.documentTitle;
    const sim   = c.similarity.toFixed(2);
    return (
      `[FONTE ${i + 1}] ${title} — ${ref} (p. ${page}) [rilevanza: ${sim}]\n` +
      `${c.chunkText}`
    );
  });

  const contextBlock = contextParts.join("\n\n---\n\n");
  const instruction  = lang === "it"
    ? "Risposta (includi citazioni [Fonte:...] per ogni affermazione):"
    : "Answer (include [Source:...] citations for each statement):";

  return (
    `${systemPrompt}\n\n` +
    `CONTESTO (${chunks.length} fonti):\n` +
    `${contextBlock}\n\n` +
    `Domanda: ${query}\n\n` +
    `${instruction}`
  );
}

function parseCitations(text: string): string[] {
  return text.match(CITATION_RE) ?? [];
}

function computeConfidence(
  citations: string[],
  chunks: RagChunk[]
): "LOW" | "MEDIUM" | "HIGH" {
  const avgSim =
    chunks.reduce((s, c) => s + c.similarity, 0) / Math.max(chunks.length, 1);
  if (citations.length > 0 && avgSim >= 0.7) return "HIGH";
  if (citations.length > 0 && avgSim >= 0.4) return "MEDIUM";
  return "LOW";
}

/**
 * Generate a cited answer using Gemini 2.0 Flash with retrieved context.
 */
export async function answerWithRAG(
  query: string,
  chunks: RagChunk[],
  lang: "it" | "en" = "it"
): Promise<RagAnswer> {
  const t0 = Date.now();
  const prompt = buildPrompt(query, chunks, lang);

  let rawAnswer: string;
  try {
    rawAnswer = await generateText(prompt, {
      temperature:     0.1,
      maxOutputTokens: 2048,
    });
  } catch (err) {
    // Graceful degradation: return error message as answer
    rawAnswer =
      lang === "it"
        ? "Errore nella generazione della risposta. Riprova più tardi."
        : "Answer generation failed. Please try again.";
    console.error("[RAG] Generation error:", err);
  }

  const citations = parseCitations(rawAnswer);
  const confidence = computeConfidence(citations, chunks);

  const sources: RagSource[] = chunks.map((c) => ({
    documentTitle: c.documentTitle,
    sectionRef:    c.sectionRef,
    pageNumber:    c.pageNumber,
    similarity:    Math.round(c.similarity * 1000) / 1000,
  }));

  return {
    answer:     rawAnswer.trim(),
    sources,
    citations,
    confidence,
    model:      MODEL_NAME,
    latencyMs:  Date.now() - t0,
  };
}
