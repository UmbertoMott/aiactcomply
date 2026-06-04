// src/app/api/mog231/route.ts
// MOG 231 + L. 132/2025 API
// D.Lgs. 231/2001 + Legge Italiana sull'AI 132/2025

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Campi obbligatori MOG 231 per compliance completa
const MOG_REQUIRED_FLAGS = [
  "l132_deepfake_compliant",
  "l132_minors_protection",
  "l132_hr_transparency",
  "l132_content_labeling",
  "criminal_risk_acknowledged",
] as const;

function computeMogCompleteness(data: Record<string, unknown>): number {
  let score = 0;
  const weights: Record<string, number> = {
    part_a_risk_areas: 20,
    part_b_protocols: 25,
    part_c_odv: 20,
    part_d_training: 15,
    l132_flags: 20, // tutti i flag L132
  };

  if (data.part_a_risk_areas && Object.keys(data.part_a_risk_areas as object).length > 0)
    score += weights.part_a_risk_areas;
  if (data.part_b_protocols && Object.keys(data.part_b_protocols as object).length > 0)
    score += weights.part_b_protocols;
  if (data.part_c_odv && Object.keys(data.part_c_odv as object).length > 0)
    score += weights.part_c_odv;
  if (data.part_d_training && Object.keys(data.part_d_training as object).length > 0)
    score += weights.part_d_training;

  // Flag L132
  const flagsSet = MOG_REQUIRED_FLAGS.filter(f => data[f] === true).length;
  score += Math.round((flagsSet / MOG_REQUIRED_FLAGS.length) * weights.l132_flags);

  return Math.min(score, 100);
}

function detectCriticalGaps(data: Record<string, unknown>): string[] {
  const gaps: string[] = [];

  if (!data.l132_deepfake_compliant)
    gaps.push("⚠️ Rischio penale: deepfake non consensuali — reclusione fino a 5 anni (Art. L.132)");
  if (!data.l132_minors_protection)
    gaps.push("⚠️ Tutela minori under 14: consenso genitoriale obbligatorio non implementato");
  if (!data.l132_hr_transparency)
    gaps.push("⚠️ Trasparenza HR: mancata informativa su uso AI nelle decisioni lavorative");
  if (!data.criminal_risk_acknowledged)
    gaps.push("⚠️ Rischio penale D.Lgs. 231: protocolli anticollusione AI non documentati");
  if (!data.part_c_odv || Object.keys(data.part_c_odv as object || {}).length === 0)
    gaps.push("⚠️ ODV non configurato: obbligo di vigilanza ex D.Lgs. 231/2001");

  return gaps;
}

// GET /api/mog231?ai_system_id=xxx
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const aiSystemId = searchParams.get("ai_system_id");

  let query = supabase
    .from("mog_231_protocols")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (aiSystemId) query = query.eq("ai_system_id", aiSystemId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Arricchisce risposta con gap critici
  const enriched = (data || []).map(record => ({
    ...record,
    critical_gaps: detectCriticalGaps(record as Record<string, unknown>),
    is_critical: detectCriticalGaps(record as Record<string, unknown>).length > 0,
  }));

  return NextResponse.json({ data: enriched });
}

// POST /api/mog231 — crea o aggiorna protocollo
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { ai_system_id, mog_id, updates } = body;

  if (!ai_system_id) {
    return NextResponse.json({ error: "ai_system_id required" }, { status: 400 });
  }

  // Verifica ownership sistema AI
  const { data: system } = await supabase
    .from("ai_systems")
    .select("id, is_high_risk")
    .eq("id", ai_system_id)
    .eq("user_id", user.id)
    .single();

  if (!system) return NextResponse.json({ error: "System not found" }, { status: 404 });

  const updateData = {
    ...updates,
    completeness_score: computeCompleteness({ ...updates }),
  };

  if (mog_id) {
    // Aggiorna esistente
    const { data: existing } = await supabase
      .from("mog_231_protocols")
      .select("*")
      .eq("id", mog_id)
      .single();

    const merged = { ...existing, ...updateData };
    merged.completeness_score = computeMogCompleteness(merged);

    const { data, error } = await supabase
      .from("mog_231_protocols")
      .update(merged)
      .eq("id", mog_id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      data,
      critical_gaps: detectCriticalGaps(data as Record<string, unknown>),
    });
  } else {
    // Crea nuovo
    const newProtocol = {
      ai_system_id,
      user_id: user.id,
      status: "draft",
      completeness_score: 0,
      ...updateData,
    };
    newProtocol.completeness_score = computeMogCompleteness(newProtocol);

    const { data, error } = await supabase
      .from("mog_231_protocols")
      .insert(newProtocol)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      data,
      critical_gaps: detectCriticalGaps(data as Record<string, unknown>),
    }, { status: 201 });
  }
}

function computeCompleteness(data: Record<string, unknown>): number {
  return computeMogCompleteness(data);
}
