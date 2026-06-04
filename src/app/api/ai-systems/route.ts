// src/app/api/ai-systems/route.ts
// Registro centrale sistemi AI dell'organizzazione

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/ai-systems
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const riskTier = searchParams.get("risk_tier");
  const status = searchParams.get("status");

  let query = supabase
    .from("ai_systems")
    .select(`
      *,
      technical_files(id, status, completeness_score, updated_at),
      mog_231_protocols(id, status, completeness_score, updated_at)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (riskTier) query = query.eq("risk_tier", riskTier);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}

// POST /api/ai-systems — registra nuovo sistema AI
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    name, description, provider, deployer,
    risk_tier, annex3_category, framework,
    intended_purpose, sector, is_high_risk, is_gpai
  } = body;

  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const { data, error } = await supabase
    .from("ai_systems")
    .insert({
      user_id: user.id,
      name,
      description,
      provider,
      deployer,
      risk_tier: risk_tier || "unknown",
      annex3_category,
      framework: framework || ["eu_ai_act"],
      intended_purpose,
      sector,
      is_high_risk: is_high_risk || false,
      is_gpai: is_gpai || false,
      status: "active",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Se ad alto rischio, crea automaticamente technical file e mog231 vuoti
  if (is_high_risk) {
    await supabase.from("technical_files").insert({
      ai_system_id: data.id,
      user_id: user.id,
      version: 1,
      status: "draft",
    });
    await supabase.from("mog_231_protocols").insert({
      ai_system_id: data.id,
      user_id: user.id,
      status: "draft",
    });
  }

  return NextResponse.json({ data }, { status: 201 });
}

// PATCH /api/ai-systems?id=xxx
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const updates = await req.json();

  const { data, error } = await supabase
    .from("ai_systems")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
