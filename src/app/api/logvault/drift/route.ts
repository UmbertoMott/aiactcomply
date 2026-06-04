// src/app/api/logvault/drift/route.ts
// Real-time drift detection per sistemi AI — Art. 12 EU AI Act
// Analizza gli ultimi N log e rileva deviazioni dai parametri di conformità

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface DriftAlert {
  metric:        string;
  current:       number;
  baseline:      number;
  deviation_pct: number;
  severity:      "warning" | "critical";
  description:   string;
  art_reference: string;
}

interface DriftReport {
  ai_system_id:   string | null;
  window_hours:   number;
  events_analyzed: number;
  alerts:         DriftAlert[];
  is_drifting:    boolean;
  compliance_ok:  boolean;
  generated_at:   string;
}

// Soglie di conformità (configurabili per sistema)
const THRESHOLDS = {
  latency_p99_ms:      5000,   // 5s — soglia latenza p99
  error_rate_pct:      5,      // 5% — tasso errori
  flagged_rate_pct:    2,      // 2% — eventi flaggati
  guardrail_breach_pct: 1,     // 1% — uscite dai guardrail
  token_spike_pct:     50,     // +50% token vs baseline
};

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const aiSystemId = searchParams.get("ai_system_id");
  const windowHours = parseInt(searchParams.get("window_hours") || "24");

  // Recupera log della finestra temporale
  const windowStart = new Date(Date.now() - windowHours * 3600 * 1000).toISOString();

  let query = supabase
    .from("compliance_logs")
    .select("*")
    .eq("user_id", user.id)
    .gte("created_at", windowStart)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (aiSystemId) query = query.eq("ai_system_id", aiSystemId);

  const { data: logs, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!logs || logs.length === 0) {
    return NextResponse.json({
      ai_system_id: aiSystemId,
      window_hours: windowHours,
      events_analyzed: 0,
      alerts: [],
      is_drifting: false,
      compliance_ok: true,
      generated_at: new Date().toISOString(),
      message: "Nessun log nella finestra temporale specificata",
    });
  }

  const alerts: DriftAlert[] = [];

  // ─── 1. Analisi latenza ───────────────────────────────────────────────────
  const latencies = logs
    .filter((l) => l.latency_ms != null)
    .map((l) => l.latency_ms as number)
    .sort((a, b) => a - b);

  if (latencies.length > 0) {
    const p99idx = Math.floor(latencies.length * 0.99);
    const p99 = latencies[p99idx] || latencies[latencies.length - 1];
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;

    if (p99 > THRESHOLDS.latency_p99_ms) {
      alerts.push({
        metric: "latency_p99_ms",
        current: p99,
        baseline: THRESHOLDS.latency_p99_ms,
        deviation_pct: Math.round(((p99 - THRESHOLDS.latency_p99_ms) / THRESHOLDS.latency_p99_ms) * 100),
        severity: p99 > THRESHOLDS.latency_p99_ms * 2 ? "critical" : "warning",
        description: `Latenza p99 = ${p99}ms (soglia: ${THRESHOLDS.latency_p99_ms}ms). Media: ${Math.round(avgLatency)}ms`,
        art_reference: "Art. 9 — Gestione dei rischi: performance degradation",
      });
    }
  }

  // ─── 2. Tasso di errori ───────────────────────────────────────────────────
  const errorEvents = logs.filter((l) => l.event_type === "error").length;
  const errorRate = (errorEvents / logs.length) * 100;

  if (errorRate > THRESHOLDS.error_rate_pct) {
    alerts.push({
      metric: "error_rate_pct",
      current: Math.round(errorRate * 10) / 10,
      baseline: THRESHOLDS.error_rate_pct,
      deviation_pct: Math.round(((errorRate - THRESHOLDS.error_rate_pct) / THRESHOLDS.error_rate_pct) * 100),
      severity: errorRate > THRESHOLDS.error_rate_pct * 3 ? "critical" : "warning",
      description: `${errorEvents} errori su ${logs.length} eventi (${errorRate.toFixed(1)}%)`,
      art_reference: "Art. 12 — Logging: error pattern anomaly",
    });
  }

  // ─── 3. Tasso eventi flaggati ─────────────────────────────────────────────
  const flaggedEvents = logs.filter((l) => l.flagged === true).length;
  const flaggedRate = (flaggedEvents / logs.length) * 100;

  if (flaggedRate > THRESHOLDS.flagged_rate_pct) {
    alerts.push({
      metric: "flagged_rate_pct",
      current: Math.round(flaggedRate * 10) / 10,
      baseline: THRESHOLDS.flagged_rate_pct,
      deviation_pct: Math.round(((flaggedRate - THRESHOLDS.flagged_rate_pct) / THRESHOLDS.flagged_rate_pct) * 100),
      severity: flaggedRate > 10 ? "critical" : "warning",
      description: `${flaggedEvents} eventi flaggati (${flaggedRate.toFixed(1)}%). Soglia: ${THRESHOLDS.flagged_rate_pct}%`,
      art_reference: "Art. 9 — Gestione rischi: compliance flag rate anomaly",
    });
  }

  // ─── 4. Violazioni guardrail ──────────────────────────────────────────────
  const guardrailBreaches = logs.filter((l) => l.within_guardrails === false).length;
  const breachRate = (guardrailBreaches / logs.length) * 100;

  if (breachRate > THRESHOLDS.guardrail_breach_pct) {
    alerts.push({
      metric: "guardrail_breach_pct",
      current: Math.round(breachRate * 10) / 10,
      baseline: THRESHOLDS.guardrail_breach_pct,
      deviation_pct: Math.round(((breachRate - THRESHOLDS.guardrail_breach_pct) / THRESHOLDS.guardrail_breach_pct) * 100),
      severity: "critical",
      description: `${guardrailBreaches} violazioni guardrail (${breachRate.toFixed(1)}%). Richiede revisione immediata.`,
      art_reference: "Art. 14 — Supervisione umana: guardrail breach requires human review",
    });
  }

  // ─── 5. Token spike (possibile data injection) ────────────────────────────
  const tokenCounts = logs
    .filter((l) => l.token_count != null)
    .map((l) => l.token_count as number);

  if (tokenCounts.length > 10) {
    const avgTokens = tokenCounts.reduce((a, b) => a + b, 0) / tokenCounts.length;
    const recentTokens = tokenCounts.slice(0, Math.min(10, tokenCounts.length));
    const recentAvg = recentTokens.reduce((a, b) => a + b, 0) / recentTokens.length;
    const tokenSpike = ((recentAvg - avgTokens) / avgTokens) * 100;

    if (tokenSpike > THRESHOLDS.token_spike_pct) {
      alerts.push({
        metric: "token_spike_pct",
        current: Math.round(recentAvg),
        baseline: Math.round(avgTokens),
        deviation_pct: Math.round(tokenSpike),
        severity: tokenSpike > 100 ? "critical" : "warning",
        description: `Spike token recenti: ${Math.round(recentAvg)} vs baseline ${Math.round(avgTokens)} (+${Math.round(tokenSpike)}%). Possibile prompt injection.`,
        art_reference: "Art. 15 — Sicurezza: anomalia input potenzialmente malevola",
      });
    }
  }

  const report: DriftReport = {
    ai_system_id: aiSystemId,
    window_hours: windowHours,
    events_analyzed: logs.length,
    alerts,
    is_drifting: alerts.length > 0,
    compliance_ok: !alerts.some((a) => a.severity === "critical"),
    generated_at: new Date().toISOString(),
  };

  // Salva il report drift come log di audit
  if (alerts.length > 0) {
    await supabase.from("compliance_logs").insert({
      ai_system_id: aiSystemId,
      user_id: user.id,
      event_type: "drift",
      flagged: alerts.some((a) => a.severity === "critical"),
      flag_severity: alerts.some((a) => a.severity === "critical") ? "critical" : "warning",
      flag_reason: `Drift rilevato: ${alerts.map((a) => a.metric).join(", ")}`,
      within_guardrails: report.compliance_ok,
      metadata: { drift_report: report },
    });
  }

  return NextResponse.json(report);
}
