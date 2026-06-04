// src/app/api/logvault/ingest/route.ts
// LogVault SDK Ingest Endpoint — Art. 12 EU AI Act
// Riceve eventi da SDK Python/JS e li salva con hash chain

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import crypto from "crypto";

interface LogEvent {
  ai_system_id?: string;
  event_type: "inference" | "alert" | "drift" | "audit" | "error";
  model_id?: string;
  model_version?: string;
  prompt?: string;           // testo originale (opzionale, può essere omesso per privacy)
  prompt_hash?: string;      // SHA-256 del prompt (obbligatorio se prompt assente)
  output?: string;
  output_hash?: string;
  latency_ms?: number;
  token_count?: number;
  within_guardrails?: boolean;
  metadata?: Record<string, unknown>;
}

interface BatchPayload {
  api_key: string;
  events: LogEvent[];
}

// Verifica API key e restituisce user_id
async function verifyApiKey(apiKey: string): Promise<string | null> {
  // In produzione: lookup da tabella api_keys
  // Per ora verifica che sia un UUID valido e non vuoto
  if (!apiKey || apiKey.length < 16) return null;
  // TODO: implementare lookup DB quando tabella api_keys sarà creata
  return "verified"; // placeholder
}

function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function detectGuardrailViolation(event: LogEvent): { flagged: boolean; reason: string | null; severity: string } {
  // Analisi automatica per violazioni guardrail
  const output = event.output?.toLowerCase() || "";
  const prompt = event.prompt?.toLowerCase() || "";

  // Segnali di violazione
  if (output.includes("biometric") && output.includes("categoriz")) {
    return { flagged: true, reason: "Potential biometric categorization output — Art. 5(1)(g)", severity: "critical" };
  }
  if (output.includes("emotion") && output.includes("detect")) {
    return { flagged: true, reason: "Potential emotion recognition output — Art. 5(1)(f)", severity: "critical" };
  }
  if (prompt.includes("social score") || prompt.includes("citizen rank")) {
    return { flagged: true, reason: "Social scoring request detected — Art. 5(1)(c)", severity: "critical" };
  }
  if (event.latency_ms && event.latency_ms > 30000) {
    return { flagged: true, reason: "Latency threshold exceeded — performance drift", severity: "warning" };
  }
  if (event.within_guardrails === false) {
    return { flagged: true, reason: "System reported out-of-guardrails", severity: "warning" };
  }

  return { flagged: false, reason: null, severity: "info" };
}

// POST /api/logvault/ingest — singolo evento o batch
export async function POST(req: Request) {
  const body = await req.json();

  // Supporta sia singolo evento che batch
  const isBatch = Array.isArray(body.events);
  const apiKey: string = body.api_key || req.headers.get("X-AIComply-Key") || "";
  const events: LogEvent[] = isBatch ? body.events : [body];

  // Verifica autenticazione
  const userId = await verifyApiKey(apiKey);
  if (!userId && !process.env.LOGVAULT_SKIP_AUTH) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const supabase = await createClient();

  // Recupera hash dell'ultimo log per hash chain
  const { data: lastLog } = await supabase
    .from("compliance_logs")
    .select("record_hash")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  let previousHash = lastLog?.record_hash || "genesis";
  const insertedIds: string[] = [];
  const alerts: { event_index: number; reason: string; severity: string }[] = [];

  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    // Calcola hash contenuto
    const promptHash = event.prompt_hash || (event.prompt ? hashContent(event.prompt) : null);
    const outputHash = event.output_hash || (event.output ? hashContent(event.output) : null);

    // Analisi guardrail
    const { flagged, reason, severity } = detectGuardrailViolation(event);
    if (flagged && reason) {
      alerts.push({ event_index: i, reason, severity });
    }

    // Costruisce hash chain (Art. 12 — integrità log)
    const recordContent = JSON.stringify({
      event_type: event.event_type,
      prompt_hash: promptHash,
      output_hash: outputHash,
      model_id: event.model_id,
      timestamp: new Date().toISOString(),
      previous: previousHash,
    });
    const recordHash = hashContent(recordContent);

    const logEntry = {
      ai_system_id: event.ai_system_id || null,
      event_type: event.event_type,
      model_id: event.model_id || null,
      model_version: event.model_version || null,
      prompt_hash: promptHash,
      output_hash: outputHash,
      // Preview solo se esplicitamente fornito (privacy by default)
      prompt_preview: event.prompt ? event.prompt.slice(0, 200) : null,
      latency_ms: event.latency_ms || null,
      token_count: event.token_count || null,
      flagged,
      flag_reason: reason,
      flag_severity: severity,
      within_guardrails: event.within_guardrails ?? !flagged,
      metadata: {
        ...event.metadata,
        api_key_prefix: apiKey.slice(0, 8),
        sdk_version: req.headers.get("X-AIComply-SDK-Version") || "unknown",
      },
      record_hash: recordHash,
      previous_hash: previousHash,
    };

    const { data, error } = await supabase
      .from("compliance_logs")
      .insert(logEntry)
      .select("id, record_hash")
      .single();

    if (error) {
      console.error("LogVault ingest error:", error);
      continue;
    }

    insertedIds.push(data.id);
    previousHash = data.record_hash;
  }

  return NextResponse.json({
    success: true,
    logged: insertedIds.length,
    ids: insertedIds,
    alerts: alerts.length > 0 ? alerts : null,
    chain_head: previousHash,
  }, { status: 201 });
}

// GET /api/logvault/ingest — health check per SDK
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "AIComply LogVault",
    version: "1.0.0",
    spec: "EU AI Act Art. 12",
  });
}
