// POST /api/rag/refresh — Trigger manuale pipeline aggiornamento RAG
// Riservato a service-role / cron job (richiede X-Cron-Secret).
// Pipeline reale eseguita da Python (rag/auto_update.py) — questo endpoint
// è il trigger HTTP che può essere chiamato da Vercel Cron, GitHub Actions,
// o manualmente da un admin.

import { NextResponse } from "next/server";

const CRON_SECRET = process.env.CRON_SECRET || "";
const PYTHON_PIPELINE_URL = process.env.RAG_PIPELINE_URL || ""; // URL al worker Python esterno

export async function POST(req: Request) {
  const provided = req.headers.get("x-cron-secret");
  if (!CRON_SECRET || provided !== CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // In produzione il pipeline Python gira in un container separato (es. Cloud Run / fly.io)
  // o è schedulato direttamente come job docker compose rag-auto-update.
  // Qui forniamo il trigger HTTP che lo invoca.
  if (!PYTHON_PIPELINE_URL) {
    return NextResponse.json({
      ok: false,
      reason: "RAG_PIPELINE_URL non configurato — pipeline eseguibile solo via docker exec o cron",
      manual_command: "docker compose exec rag-ingestor python auto_update.py scheduled",
    });
  }

  try {
    const res = await fetch(PYTHON_PIPELINE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Cron-Secret": CRON_SECRET },
      body: JSON.stringify({ source: "scheduled" }),
    });
    const data = await res.json();
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

// GET /api/rag/refresh — Status dell'ultima ingestion run
export async function GET() {
  // TODO: leggere da rag_ingestion_runs ORDER BY started_at DESC LIMIT 1
  return NextResponse.json({
    info: "Status pipeline RAG. Vedi rag_ingestion_runs in Supabase per dettagli.",
  });
}
