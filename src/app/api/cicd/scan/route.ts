// src/app/api/cicd/scan/route.ts
// Webhook endpoint per GitHub Action AIComply Scanner (Progetto C)
// Riceve risultati scansione e li salva nel compliance log

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import crypto from "crypto";

interface ScanFindings {
  external_ai: string;
  ml_libraries: string;
  prohibited: string;
  critical: boolean;
}

interface ScanPayload {
  repository: string;
  commit: string;
  branch: string;
  run_id: string;
  findings: ScanFindings;
  dashboard_url: string;
}

export async function POST(req: Request) {
  // Verifica API key
  const apiKey = req.headers.get("X-AIComply-Key");
  const validKey = process.env.AICOMPLY_WEBHOOK_SECRET;

  if (validKey && apiKey !== validKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload: ScanPayload = await req.json();
  const { repository, commit, branch, run_id, findings } = payload;

  // Salva su Supabase come compliance log
  const supabase = await createClient();

  const logEntry = {
    event_type: findings.critical ? "alert" : "audit",
    model_id: "github-action-scanner",
    flagged: findings.critical,
    flag_reason: findings.critical
      ? `Prohibited AI detected: ${findings.prohibited}`
      : null,
    flag_severity: findings.critical ? "critical" : findings.ml_libraries ? "warning" : "info",
    within_guardrails: !findings.critical,
    metadata: {
      source: "github_action",
      repository,
      commit: commit.slice(0, 8),
      branch,
      run_id,
      findings: {
        external_ai: findings.external_ai ? findings.external_ai.split(",").filter(Boolean) : [],
        ml_libraries: findings.ml_libraries ? findings.ml_libraries.split(",").filter(Boolean) : [],
        prohibited: findings.prohibited ? findings.prohibited.split(",").filter(Boolean) : [],
      },
    },
    record_hash: crypto
      .createHash("sha256")
      .update(`${repository}:${commit}:${run_id}`)
      .digest("hex"),
  };

  const { data, error } = await supabase
    .from("compliance_logs")
    .insert(logEntry)
    .select()
    .single();

  if (error) {
    console.error("Scan log error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Se violazione critica, crea alert nel sistema
  if (findings.critical) {
    console.warn(`🚨 CRITICAL AI Act violation detected in ${repository}@${commit}`);
    // TODO: invia notifica email/Slack
  }

  return NextResponse.json({
    success: true,
    log_id: data.id,
    critical: findings.critical,
    message: findings.critical
      ? "Critical violations logged — build should be blocked"
      : "Scan completed — no critical violations",
  });
}

// GET /api/cicd/scan — lista scansioni recenti
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "20");

  const { data, error } = await supabase
    .from("compliance_logs")
    .select("*")
    .eq("user_id", user.id)
    .eq("model_id", "github-action-scanner")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}
