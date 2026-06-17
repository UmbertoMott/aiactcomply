// GET /api/trust-center/[slug]
// Bridge server → client per la vista pubblica Trust Center.
// Attualmente placeholder: localStorage non è accessibile server-side.
// In produzione: sostituire con query a Supabase/Vercel KV/datastore persistente.
// PROMPT BC — Art. 13 trasparenza, Art. 50 obblighi AI.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  void slug; // TODO: query datastore by slug
  // Finché il datastore non è connesso, il client gestisce il fallback via localStorage.
  return NextResponse.json(null, { status: 404 });
}
