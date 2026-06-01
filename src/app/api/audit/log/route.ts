// POST /api/audit/log
// Insert an AI output record into the immutable audit trail.
// FAIL-SAFE: returns 500 if insert fails — caller must not show output.
// Auth: requires valid session (Supabase auth) + service role for insert.

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { insertAuditRecord } from "@/lib/audit/audit-trail";
import { generateServerOutputId } from "@/lib/audit/output-id-server";
import { createAuditClient } from "@/lib/audit/audit-trail";
import { getAIModelName, getSystemVersion } from "@/lib/disclosure/ai-config";
import { getSession } from "@/lib/auth/mock-auth";

const BodySchema = z.object({
  tenantId:      z.string().uuid(),
  outputType:    z.string().min(2).max(5),
  documentType:  z.string().min(1),
  inputText:     z.string().optional(),
  outputText:    z.string().optional(),
  modelVersion:  z.string().optional(),
  userId:        z.string().uuid().optional(),
  userEmail:     z.string().email().optional(),
  requiresReview: z.boolean().optional(),
  regulationRefs: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  // Require authenticated session
  const session = await getSession();
  if (!session) {
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

  // Override identity fields from verified session — never trust client-supplied values
  const userId    = session.id;
  const userEmail = session.email;
  const supabase = createAuditClient();

  // Generate server-side output ID (PostgreSQL sequence)
  let outputId: string;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    outputId = await generateServerOutputId(data.outputType as any, supabase as any);
  } catch {
    outputId = `${data.outputType}-${new Date().toISOString().slice(0,10).replace(/-/g,"")}-ERR`;
  }

  try {
    const result = await insertAuditRecord({
      outputId,
      tenantId:     data.tenantId,
      outputTypeCode: data.outputType as import("@/lib/disclosure/output-id").OutputType,
      documentType: data.documentType,
      inputText:    data.inputText,
      outputText:   data.outputText,
      modelName:    getAIModelName(),
      modelVersion: data.modelVersion,
      systemVersion: getSystemVersion(),
      userId:       userId,
      userEmail:    userEmail,
      ipAddress:    request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? undefined,
      userAgent:    request.headers.get("user-agent") ?? undefined,
      requiresReview: data.requiresReview ?? true,
      regulationRefs: data.regulationRefs,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    // FAIL-SAFE: return 500 — the calling code must NOT show the output
    console.error("[AUDIT] Insert failed:", err);
    return NextResponse.json(
      {
        error: "AUDIT_FAIL_SAFE",
        message: err instanceof Error ? err.message : "Audit insert failed",
      },
      { status: 500 }
    );
  }
}
