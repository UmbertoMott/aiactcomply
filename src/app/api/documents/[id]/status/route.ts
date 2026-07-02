// src/app/api/documents/[id]/status/route.ts
// Polling endpoint per controllare lo stato di elaborazione di un documento

import { NextRequest, NextResponse } from "next/server";
import { getDbClient } from "@/lib/db/client";
import { getOrCreateOrganization } from "@/lib/auth/rbac";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await getDbClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

    const orgId = await getOrCreateOrganization(user.id);
    if (!orgId) return NextResponse.json({ error: "Org non trovata" }, { status: 400 });

    const { data: doc, error } = await supabase
      .from("documents")
      .select("id, processing_status")
      .eq("id", id)
      .eq("organization_id", orgId)
      .single();

    if (error || !doc) {
      return NextResponse.json({ error: "Documento non trovato" }, { status: 404 });
    }

    // Conta fatti estratti
    const { count } = await supabase
      .from("extracted_facts")
      .select("id", { count: "exact", head: true })
      .eq("document_id", id)
      .eq("organization_id", orgId);

    return NextResponse.json({
      status: doc.processing_status,
      factsCount: count ?? 0,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
