// RAG Answer API — full retrieval-augmented generation with Gemini
// POST /api/rag/answer
// Body: { query: string, topK?: number, documentFilter?: string, minSimilarity?: number, articleHint?: string, lang?: "it" | "en" }
// Returns: RagAnswer { answer, sources, citations, confidence, model, latencyMs }

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { retrieveContext } from "@/lib/rag/rag-retrieve";
import { answerWithRAG } from "@/lib/rag/rag-answer";

const RequestSchema = z.object({
  query:          z.string().min(3).max(1000),
  topK:           z.number().int().min(1).max(20).optional(),
  documentFilter: z.string().max(100).optional(),
  minSimilarity:  z.number().min(0).max(1).optional(),
  articleHint:    z.string().max(50).optional(),
  lang:           z.enum(["it", "en"]).optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { query, topK, documentFilter, minSimilarity, articleHint, lang = "it" } = parsed.data;

  try {
    // Step 1: retrieve relevant chunks
    const { chunks, latencyMs: retrieveMs } = await retrieveContext({
      query,
      topK,
      documentFilter,
      minSimilarity,
      articleHint,
    });

    // Step 2: generate cited answer
    const ragAnswer = await answerWithRAG(query, chunks, lang);

    // Merge retrieval latency into total
    return NextResponse.json({
      ...ragAnswer,
      latencyMs: ragAnswer.latencyMs + retrieveMs,
      retrieveMs,
      generateMs: ragAnswer.latencyMs,
      chunksFound: chunks.length,
      chunkTexts: chunks.map((c) => c.chunkText),
    });
  } catch (err) {
    console.error("[RAG answer] Error:", err);
    return NextResponse.json(
      { error: "RAG generation failed", message: String(err) },
      { status: 500 }
    );
  }
}
