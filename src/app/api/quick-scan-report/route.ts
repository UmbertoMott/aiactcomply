import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  evaluateQuickScan,
  getQuickScanAnswer,
  QUICK_SCAN_QUESTIONS,
} from "@/lib/quick-scan/quick-scan";
import { buildQuickScanPdf } from "@/lib/quick-scan/report-pdf";
import { sendQuickScanReport } from "@/lib/auth/email";

const BodySchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  company: z.string().min(1).max(120),
  role: z.string().max(100).optional(),
  marketing: z.boolean().optional().default(true),
  answers: z.record(z.string(), z.string()),
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
  const missing = QUICK_SCAN_QUESTIONS.filter((question) => !data.answers[question.id]);
  if (missing.length > 0) {
    return NextResponse.json(
      { error: "Incomplete scan", missing: missing.map((question) => question.id) },
      { status: 400 }
    );
  }

  const invalid = QUICK_SCAN_QUESTIONS.filter(
    (question) => !getQuickScanAnswer(question.id, data.answers[question.id])
  );
  if (invalid.length > 0) {
    return NextResponse.json(
      { error: "Invalid answers", invalid: invalid.map((question) => question.id) },
      { status: 400 }
    );
  }

  const result = evaluateQuickScan(data.answers);
  const pdf = await buildQuickScanPdf({
    company: data.company,
    name: data.name,
    role: data.role,
    result,
  });

  try {
    await sendQuickScanReport(
      {
        name: data.name,
        email: data.email,
        company: data.company,
        role: data.role,
        marketing: data.marketing,
      },
      result,
      pdf
    );
  } catch (err) {
    console.error("[QUICK SCAN] Report email failed:", err);
  }

  return NextResponse.json({ success: true, result }, { status: 200 });
}
