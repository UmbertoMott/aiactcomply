// RAG Query API — semantic similarity search
// POST /api/rag/query
// Body: { query: string, topK?: number, documentFilter?: string, minSimilarity?: number, articleHint?: string }
// Returns: { chunks: RagChunk[], latencyMs: number }

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { retrieveContext } from "@/lib/rag/rag-retrieve";

const RequestSchema = z.object({
  query:          z.string().min(3).max(1000),
  topK:           z.number().int().min(1).max(20).optional(),
  documentFilter: z.string().max(100).optional(),
  minSimilarity:  z.number().min(0).max(1).optional(),
  articleHint:    z.string().max(50).optional(),
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

  try {
    const result = await retrieveContext(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[RAG query] Error:", err);
    return NextResponse.json(
      { error: "Retrieval failed", message: String(err) },
      { status: 500 }
    );
  }
}
