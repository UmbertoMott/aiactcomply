// RAG Knowledge Base — TypeScript types (query time)

export interface RagChunk {
  id: string;
  documentId: string;
  documentTitle: string;
  documentDate?: string;
  chunkIndex: number;
  sectionRef?: string;
  pageNumber?: number;
  chunkText: string;
  similarity: number;
}

export interface RagQueryOptions {
  query: string;
  topK?: number;
  documentFilter?: string;      // restrict to specific document_id
  minSimilarity?: number;       // 0-1, default 0.3
  articleHint?: string;         // e.g. "Art. 6" — enables boosted retrieval
  lang?: "it" | "en";
}

export interface RagAnswer {
  answer: string;
  sources: RagSource[];
  citations: string[];           // [Fonte: ...] strings extracted from answer
  confidence: "LOW" | "MEDIUM" | "HIGH";
  model: string;                 // model used for generation
  latencyMs: number;
}

export interface RagSource {
  documentTitle: string;
  sectionRef?: string;
  pageNumber?: number;
  similarity: number;
}

export interface RagQueryResult {
  chunks: RagChunk[];
  query: string;
  latencyMs: number;
}
