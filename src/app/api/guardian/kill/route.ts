// src/app/api/guardian/kill/route.ts
// Kill Switch server-side (Art. 14 EU AI Act — Supervisione umana)
// Invia HTTP POST firmato con HMAC SHA-256 all'endpoint dell'infrastruttura cliente
// Registra l'evento nel LogVault server-side

import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { appendLogDB } from "@/lib/db/logvault";

interface KillPayload {
  event: "AICOMPLY_KILL_SWITCH";
  timestamp: string;
  source: "aicomply-guardian-agent";
  organizationToken?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      webhookUrl?: string;
      secret?: string;
    };

    if (!body.webhookUrl || typeof body.webhookUrl !== "string") {
      return NextResponse.json(
        { error: "Campo 'webhookUrl' obbligatorio" },
        { status: 400 }
      );
    }

    // Validazione URL: deve essere https in produzione
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(body.webhookUrl);
    } catch {
      return NextResponse.json({ error: "URL webhook non valido" }, { status: 400 });
    }

    if (
      process.env.NODE_ENV === "production" &&
      parsedUrl.protocol !== "https:"
    ) {
      return NextResponse.json(
        { error: "Il webhook deve usare HTTPS in produzione" },
        { status: 400 }
      );
    }

    const payload: KillPayload = {
      event: "AICOMPLY_KILL_SWITCH",
      timestamp: new Date().toISOString(),
      source: "aicomply-guardian-agent",
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "AIComply-Guardian/1.0",
    };

    // Firma HMAC SHA-256 se il segreto è configurato
    if (body.secret && typeof body.secret === "string" && body.secret.length > 0) {
      const signature = createHmac("sha256", body.secret)
        .update(JSON.stringify(payload))
        .digest("hex");
      headers["X-AIComply-Signature"] = `sha256=${signature}`;
    }

    // Invia il webhook con timeout di 10 secondi
    const response = await fetch(body.webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });

    // Registra l'evento nel LogVault server-side indipendentemente dall'esito
    const logEvent = response.ok
      ? `KILL_SWITCH_ACTIVATED → ${parsedUrl.hostname} [HTTP ${response.status}]`
      : `KILL_SWITCH_FAILED → ${parsedUrl.hostname} [HTTP ${response.status}]`;

    try {
      await appendLogDB(logEvent, response.ok ? "critical" : "error", "guardian-agent");
    } catch {
      // Il log non deve bloccare la risposta al client
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Il webhook ha risposto con HTTP ${response.status}`,
          webhookStatus: response.status,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      webhookStatus: response.status,
      timestamp: payload.timestamp,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    // Timeout
    if (message.includes("TimeoutError") || message.includes("AbortError")) {
      return NextResponse.json(
        { error: "Timeout: il webhook non ha risposto entro 10 secondi" },
        { status: 504 }
      );
    }

    console.error("[Guardian Kill API]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
