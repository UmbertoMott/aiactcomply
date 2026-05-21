// GET /api/audit/backup?tenantId=UUID
// S3 Object Lock backup job — run hourly via cron.
// Uploads all new audit records (last 2 hours) to S3 WORM storage.
//
// Cron setup (Vercel):
//   vercel.json: { "crons": [{ "path": "/api/audit/backup", "schedule": "0 * * * *" }] }
//
// Requires: CRON_SECRET, AUDIT_S3_BUCKET, AWS_* env vars.
// Requires: npm install @aws-sdk/client-s3

import { type NextRequest, NextResponse } from "next/server";
import { backupNewRecordsToS3 } from "@/lib/audit/audit-s3";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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

  const sinceHoursRaw = request.nextUrl.searchParams.get("sinceHours");
  const sinceHours = sinceHoursRaw ? parseInt(sinceHoursRaw, 10) : 2;

  const result = await backupNewRecordsToS3(tenantId, sinceHours);

  return NextResponse.json({
    ...result,
    tenantId,
    sinceHours,
    backedUpAt: new Date().toISOString(),
  }, {
    status: result.errors > 0 ? 207 : 200,
  });
}
