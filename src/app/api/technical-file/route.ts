// src/app/api/technical-file/route.ts
// Annex IV Technical File Builder API
// EU AI Act Art. 11 + Annex IV

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Sezioni obbligatorie Annex IV con peso completeness
const ANNEX_IV_SECTIONS = {
  s1_general:        { label: "Descrizione generale", weight: 20 },
  s2_components:     { label: "Componenti del sistema", weight: 15 },
  s3_data_governance:{ label: "Governance dei dati", weight: 20 },
  s4_monitoring:     { label: "Monitoraggio e controllo", weight: 20 },
  s5_transparency:   { label: "Trasparenza", weight: 10 },
  s6_performance:    { label: "Accuratezza e sicurezza", weight: 10 },
  s7_declaration:    { label: "Dichiarazione di conformità", weight: 5 },
} as const;

function computeCompleteness(data: Record<string, unknown>): number {
  let score = 0;
  for (const [key, { weight }] of Object.entries(ANNEX_IV_SECTIONS)) {
    const section = data[key];
    if (section && typeof section === "object" && Object.keys(section).length > 0) {
      score += weight;
    }
  }
  return score;
}

// GET /api/technical-file?ai_system_id=xxx
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const aiSystemId = searchParams.get("ai_system_id");

  let query = supabase
    .from("technical_files")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (aiSystemId) query = query.eq("ai_system_id", aiSystemId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}

// POST /api/technical-file — crea o aggiorna sezione
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { ai_system_id, technical_file_id, section, section_data } = body;

  if (!ai_system_id) {
    return NextResponse.json({ error: "ai_system_id required" }, { status: 400 });
  }

  // Verifica ownership sistema AI
  const { data: system } = await supabase
    .from("ai_systems")
    .select("id")
    .eq("id", ai_system_id)
    .eq("user_id", user.id)
    .single();

  if (!system) return NextResponse.json({ error: "System not found" }, { status: 404 });

  if (technical_file_id) {
    // Aggiorna sezione esistente
    const updateData: Record<string, unknown> = {};
    if (section && section_data) {
      updateData[section] = section_data;
    }

    // Ricalcola completeness
    const { data: existing } = await supabase
      .from("technical_files")
      .select("*")
      .eq("id", technical_file_id)
      .single();

    if (existing) {
      const merged = { ...existing, ...updateData };
      updateData.completeness_score = computeCompleteness(merged);
      const completed = Object.keys(ANNEX_IV_SECTIONS).filter(
        k => merged[k] && Object.keys(merged[k] as object).length > 0
      );
      updateData.sections_complete = completed;
      updateData.status = completed.length === Object.keys(ANNEX_IV_SECTIONS).length
        ? "complete" : "draft";
    }

    const { data, error } = await supabase
      .from("technical_files")
      .update(updateData)
      .eq("id", technical_file_id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } else {
    // Crea nuovo technical file
    const newFile: Record<string, unknown> = {
      ai_system_id,
      user_id: user.id,
      version: 1,
      status: "draft",
      completeness_score: 0,
      sections_complete: [],
    };
    if (section && section_data) {
      newFile[section] = section_data;
      newFile.completeness_score = computeCompleteness(newFile);
    }

    const { data, error } = await supabase
      .from("technical_files")
      .insert(newFile)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  }
}

// DELETE /api/technical-file?id=xxx
export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabase
    .from("technical_files")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
