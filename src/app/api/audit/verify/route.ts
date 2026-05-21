// GET /api/audit/verify?tenantId=UUID
// Integrity verification job — run weekly via cron.
// Recomputes the full hash chain and alerts on any discrepancy.
//
// Cron setup (Vercel):
//   vercel.json: { "crons": [{ "path": "/api/audit/verify", "schedule": "0 3 * * 0" }] }
//
// Cron setup (GitHub Actions):
//   schedule: '0 3 * * 0' → GET https://yourapp.com/api/audit/verify
//
// Requires: CRON_SECRET env var to protect this endpoint from public access.

import { type NextRequest, NextResponse } from "next/server";
import { verifyHashChain, sendIntegrityAlert } from "@/lib/audit/audit-verify";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Protect with shared secret (set in Vercel env + cron Authorization header)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const tenantId = request.nextUrl.searchParams.get("tenantId");
  if (!tenantId) {
    return NextResponse.json({ error: "tenantId required" }, { status: 400 });
  }

  const report = await verifyHashChain(tenantId);

  // Send alert if verification failed
  if (!report.verified) {
    await sendIntegrityAlert(report);
  }

  return NextResponse.json(report, {
    status: report.verified ? 200 : 500,
  });
}
