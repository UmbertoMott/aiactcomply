// RAG Retrieval — semantic search via Supabase pgvector RPC
// Server-side only (uses service role key).

import type { RagChunk, RagQueryOptions, RagQueryResult } from "./rag-types";
import { embedQuery } from "./rag-vertex";

/** Minimal Supabase client interface needed for RPC calls */
interface SupabaseRpcClient {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{
    data: unknown;
    error: { message: string } | null;
  }>;
}

function createClient(): SupabaseRpcClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url?.startsWith("http") || !key) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient: sc } = require("@supabase/supabase-js");
  return sc(url, key, { auth: { persistSession: false } }) as SupabaseRpcClient;
}

/** Extract article hint from query, e.g. "Art. 6" from "Art. 6(3) requirements" */
function extractArticleHint(query: string): string | null {
  const m = query.match(/Art(?:icle|icolo|\.)\s*(\d+)/i);
  return m ? `Art. ${m[1]}` : null;
}

/**
 * Retrieve top-k relevant chunks for a query using pgvector cosine similarity.
 * Uses the boosted RPC if an article hint is detected in the query.
 */
export async function retrieveContext(
  opts: RagQueryOptions
): Promise<RagQueryResult> {
  const t0 = Date.now();
  const {
    query,
    topK = 5,
    documentFilter,
    minSimilarity = 0.3,
    articleHint: explicitHint,
  } = opts;

  const articleHint = explicitHint ?? extractArticleHint(query);

  // Embed the query (RETRIEVAL_QUERY task type)
  const embedding = await embedQuery(query);

  const client = createClient();
  if (!client) {
    // Dev mode: return empty result
    console.warn("[RAG] Supabase service role not configured — returning empty context");
    return { chunks: [], query, latencyMs: Date.now() - t0 };
  }

  // Choose RPC function: boosted (with article hint) or standard
  const rpcName = articleHint ? "search_rag_chunks_boosted" : "search_rag_chunks";
  const rpcArgs: Record<string, unknown> = {
    query_embedding: `[${embedding.join(",")}]`,
    match_count:     topK,
    min_similarity:  minSimilarity,
    filter_document: documentFilter ?? null,
  };
  if (articleHint) {
    rpcArgs.article_hint = articleHint;
  }

  const { data, error } = await client.rpc(rpcName, rpcArgs);

  if (error) {
    throw new Error(`RAG retrieval failed: ${error.message}`);
  }

  const rows = (data as Record<string, unknown>[]) ?? [];
  const chunks: RagChunk[] = rows.map((row) => ({
    id:            String(row.id),
    documentId:    String(row.document_id),
    documentTitle: String(row.document_title),
    documentDate:  row.document_date ? String(row.document_date) : undefined,
    chunkIndex:    Number(row.chunk_index),
    sectionRef:    row.section_ref ? String(row.section_ref) : undefined,
    pageNumber:    row.page_number ? Number(row.page_number) : undefined,
    chunkText:     String(row.chunk_text),
    similarity:    Number(row.boosted_similarity ?? row.similarity),
  }));

  return { chunks, query, latencyMs: Date.now() - t0 };
}
