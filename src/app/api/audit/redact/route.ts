// POST /api/audit/redact
// GDPR Art. 17 — Right to Erasure redaction handler.
// Does NOT delete records — replaces content with [REDACTED] token.
// Preserves all hashes, metadata, and hash chain integrity.

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { timingSafeEqual } from "crypto";
import { redactForGDPR } from "@/lib/audit/audit-gdpr";

const BodySchema = z.object({
  tenantId:    z.string().uuid(),
  requestedBy: z.string().min(1),          // DPO name, ticket ref, etc.
  userId:      z.string().uuid().optional(),
  outputIds:   z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  // Protect: only internal service calls or admin role
  const apiKey = process.env.GDPR_API_KEY;
  if (!apiKey) {
    console.error("[SECURITY] GDPR_API_KEY env var not set — endpoint disabled");
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
  const auth = request.headers.get("x-api-key") ?? "";
  const apiKeyBuf = Buffer.from(apiKey);
  const authBuf   = Buffer.from(auth.padEnd(apiKey.length, "\0").slice(0, apiKey.length));
  if (auth.length !== apiKey.length || !timingSafeEqual(apiKeyBuf, authBuf)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  if (!data.userId && (!data.outputIds || data.outputIds.length === 0)) {
    return NextResponse.json(
      { error: "Provide userId or outputIds" },
      { status: 400 }
    );
  }

  const result = await redactForGDPR({
    tenantId:    data.tenantId,
    requestedBy: data.requestedBy,
    userId:      data.userId,
    outputIds:   data.outputIds,
  });

  return NextResponse.json(result, {
    status: result.success ? 200 : 500,
  });
}
