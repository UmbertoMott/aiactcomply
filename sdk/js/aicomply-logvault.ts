/**
 * AIComply LogVault SDK — TypeScript/JavaScript
 * EU AI Act Art. 12 — Automatic logging for high-risk AI systems
 *
 * Usage:
 *   import { LogVault } from "@aicomply/logvault";
 *
 *   const lv = new LogVault({ apiKey: "your-key", aiSystemId: "uuid" });
 *
 *   // Manual logging
 *   await lv.logInference({ prompt, output, modelId: "gpt-4o", latencyMs: 320 });
 *
 *   // OpenAI auto-interceptor
 *   import OpenAI from "openai";
 *   const openai = lv.wrapOpenAI(new OpenAI());
 *
 *   // Vercel AI SDK middleware
 *   export const runtime = lv.vercelMiddleware();
 */

import crypto from "crypto";

const AICOMPLY_ENDPOINT = "https://aicomply-omega.vercel.app/api/logvault/ingest";
const SDK_VERSION = "1.0.0";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EventType = "inference" | "alert" | "drift" | "audit" | "error";
export type Severity  = "info" | "warning" | "critical";

export interface LogEvent {
  event_type:        EventType;
  ai_system_id?:     string;
  model_id?:         string;
  model_version?:    string;
  prompt?:           string;
  prompt_hash?:      string;
  output?:           string;
  output_hash?:      string;
  latency_ms?:       number;
  token_count?:      number;
  flagged?:          boolean;
  flag_reason?:      string;
  flag_severity?:    Severity;
  within_guardrails?: boolean;
  metadata?:         Record<string, unknown>;
}

export interface LogVaultConfig {
  apiKey:          string;
  aiSystemId?:     string;
  endpoint?:       string;
  batchSize?:      number;
  flushInterval?:  number;  // ms
  privacyMode?:    boolean; // default true — invia solo hash
  enabled?:        boolean;
}

export interface FlushResult {
  logged:   number;
  alerts:   { event_index: number; reason: string; severity: string }[] | null;
  chain_head?: string;
  error?:   string;
}

// ─── LogVault class ───────────────────────────────────────────────────────────

export class LogVault {
  private readonly config:    Required<LogVaultConfig>;
  private readonly queue:     LogEvent[] = [];
  private          timer:     ReturnType<typeof setInterval> | null = null;

  constructor(config: LogVaultConfig) {
    this.config = {
      endpoint:      AICOMPLY_ENDPOINT,
      batchSize:     10,
      flushInterval: 5000,
      privacyMode:   true,
      enabled:       true,
      aiSystemId:    "",
      ...config,
    };

    if (this.config.enabled) {
      this.timer = setInterval(() => this.flush(), this.config.flushInterval);
    }
  }

  // ─── Core logging ───────────────────────────────────────────────────────────

  async logInference(params: {
    prompt:         string;
    output:         string;
    modelId?:       string;
    modelVersion?:  string;
    latencyMs?:     number;
    tokenCount?:    number;
    withinGuardrails?: boolean;
    metadata?:      Record<string, unknown>;
  }): Promise<void> {
    if (!this.config.enabled) return;

    const event: LogEvent = {
      event_type:        "inference",
      model_id:          params.modelId,
      model_version:     params.modelVersion,
      latency_ms:        params.latencyMs,
      token_count:       params.tokenCount,
      within_guardrails: params.withinGuardrails ?? true,
      metadata:          params.metadata,
      prompt_hash:       this.hash(params.prompt),
      output_hash:       this.hash(params.output),
    };

    if (!this.config.privacyMode) {
      event.prompt = params.prompt;
      event.output = params.output;
    }

    if (this.config.aiSystemId) {
      event.ai_system_id = this.config.aiSystemId;
    }

    this.enqueue(event);
  }

  async logAlert(params: {
    reason:    string;
    severity?: Severity;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    if (!this.config.enabled) return;

    this.enqueue({
      event_type:        "alert",
      flagged:           true,
      flag_reason:       params.reason,
      flag_severity:     params.severity ?? "warning",
      within_guardrails: false,
      metadata:          params.metadata,
      ai_system_id:      this.config.aiSystemId || undefined,
    });
  }

  async logDrift(params: {
    metric:        string;
    currentValue:  number;
    baselineValue: number;
    threshold:     number;
    metadata?:     Record<string, unknown>;
  }): Promise<void> {
    if (!this.config.enabled) return;

    const deviation = Math.abs(params.currentValue - params.baselineValue)
      / Math.max(Math.abs(params.baselineValue), 1e-9) * 100;

    this.enqueue({
      event_type:        "drift",
      flagged:           deviation > params.threshold,
      flag_reason:       `Drift: ${params.metric} = ${params.currentValue.toFixed(3)} (baseline: ${params.baselineValue.toFixed(3)}, deviation: ${deviation.toFixed(1)}%)`,
      flag_severity:     deviation > params.threshold * 2 ? "critical" : "warning",
      within_guardrails: deviation <= params.threshold,
      metadata: {
        ...params.metadata,
        metric:       params.metric,
        current:      params.currentValue,
        baseline:     params.baselineValue,
        threshold:    params.threshold,
        deviation_pct: Math.round(deviation * 100) / 100,
      },
      ai_system_id: this.config.aiSystemId || undefined,
    });
  }

  // ─── OpenAI wrapper ─────────────────────────────────────────────────────────

  wrapOpenAI<T extends { chat: { completions: { create: (...args: unknown[]) => Promise<unknown> } } }>(client: T): T {
    const lv = this;
    const originalCreate = client.chat.completions.create.bind(client.chat.completions);

    client.chat.completions.create = async (...args: unknown[]) => {
      const start = Date.now();
      const response = await originalCreate(...args) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { total_tokens?: number };
        id?: string;
        model?: string;
      };
      const latencyMs = Date.now() - start;

      try {
        const params = args[0] as {
          messages?: Array<{ content?: string }>;
          model?: string;
        };
        const messages = params?.messages ?? [];
        const prompt = messages.at(-1)?.content ?? "";
        const output = response.choices?.[0]?.message?.content ?? "";

        await lv.logInference({
          prompt,
          output,
          modelId:    response.model ?? params?.model ?? "openai",
          latencyMs,
          tokenCount: response.usage?.total_tokens,
          metadata:   { openai_id: response.id },
        });
      } catch {
        // Mai bloccare il flusso principale
      }

      return response;
    };

    console.log(`[AIComply LogVault] OpenAI wrapper active (privacyMode=${this.config.privacyMode})`);
    return client;
  }

  // ─── Next.js / Edge middleware helper ───────────────────────────────────────

  nextMiddleware() {
    const lv = this;
    return async function logVaultMiddleware(
      req: { method: string; url: string; headers: Headers },
      next: () => Promise<Response>
    ): Promise<Response> {
      const start = Date.now();
      const response = await next();
      const latencyMs = Date.now() - start;

      // Logga solo rotte AI
      if (req.url.includes("/api/ai") || req.url.includes("/api/chat")) {
        await lv.logInference({
          prompt:   `${req.method} ${req.url}`,
          output:   `HTTP ${response.status}`,
          modelId:  "next-api",
          latencyMs,
        });
      }

      return response;
    };
  }

  // ─── Flush ──────────────────────────────────────────────────────────────────

  async flush(): Promise<FlushResult> {
    const events = this.queue.splice(0, this.config.batchSize);
    if (events.length === 0) return { logged: 0, alerts: null };

    try {
      const response = await fetch(this.config.endpoint, {
        method:  "POST",
        headers: {
          "Content-Type":           "application/json",
          "X-AIComply-Key":         this.config.apiKey,
          "X-AIComply-SDK-Version": SDK_VERSION,
        },
        body: JSON.stringify({ api_key: this.config.apiKey, events }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json() as FlushResult;
    } catch (err) {
      // Re-accoda gli eventi non inviati
      this.queue.unshift(...events);
      return { logged: 0, alerts: null, error: String(err) };
    }
  }

  destroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.flush().catch(() => {});
  }

  // ─── Utility ────────────────────────────────────────────────────────────────

  private enqueue(event: LogEvent): void {
    this.queue.push(event);
    if (this.queue.length >= this.config.batchSize) {
      this.flush().catch(() => {});
    }
  }

  private hash(text: string): string {
    return crypto.createHash("sha256").update(text, "utf8").digest("hex");
  }
}

// ─── Singleton helper ────────────────────────────────────────────────────────

let _instance: LogVault | null = null;

export function createLogVault(config: LogVaultConfig): LogVault {
  _instance = new LogVault(config);
  return _instance;
}

export function getLogVault(): LogVault {
  if (!_instance) throw new Error("LogVault not initialized — call createLogVault() first");
  return _instance;
}
