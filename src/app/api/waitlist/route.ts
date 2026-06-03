// POST /api/waitlist
// Insert a waitlist entry. Public endpoint — no auth required.
// Returns { success: true } on insert or duplicate email.

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAuditClient } from "@/lib/audit/audit-trail";
import { sendWaitlistNotification } from "@/lib/auth/email";

const BodySchema = z.object({
  name:       z.string().min(2).max(100),
  email:      z.string().email(),
  company:    z.string().min(1).max(100),
  role:       z.string().optional(),
  ai_systems: z.enum(["1", "2-5", "6-20", "20+"]),
  plan:       z.enum(["starter", "professional"]).default("starter"),
});

export async function POST(request: NextRequest) {
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
  const supabase = createAuditClient();

  if (!supabase) {
    console.error("[WAITLIST] Supabase service role client unavailable");
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const { error } = await supabase.from("waitlist").insert({
    name:       data.name,
    email:      data.email,
    company:    data.company,
    role:       data.role ?? null,
    ai_systems: data.ai_systems,
    plan:       data.plan,
  });

  if (error) {
    // Unique constraint violation on email — gentle response, not an error
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json({ success: true, already: true }, { status: 200 });
    }
    console.error("[WAITLIST] Insert failed:", error);
    return NextResponse.json({ error: "Insert failed" }, { status: 500 });
  }

  // Fire-and-forget — do not await (don't let email failure block the response)
  sendWaitlistNotification({
    name:       data.name,
    email:      data.email,
    company:    data.company,
    role:       data.role,
    ai_systems: data.ai_systems,
    plan:       data.plan,
  }).catch((err) => console.error("[WAITLIST] Email notification failed:", err));

  return NextResponse.json({ success: true }, { status: 201 });
}
