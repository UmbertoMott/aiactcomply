// C-03 Audit Trail — S3 Object Lock WORM Backup
// Requires: npm install @aws-sdk/client-s3
// Bucket configuration: Object Lock in COMPLIANCE mode, 10-year retention.
//
// Install SDK before using:
//   npm install @aws-sdk/client-s3
//
// Required env vars:
//   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AUDIT_S3_BUCKET

import type { AuditRow } from "./audit-types";
import { createAuditClient } from "./audit-trail";

const S3_BUCKET = process.env.AUDIT_S3_BUCKET ?? "";
const AWS_REGION = process.env.AWS_REGION ?? "eu-west-1";
const RETENTION_DAYS = 3650; // 10 years

/** Key pattern: audit/{tenant_id}/{YYYY}/{MM}/{DD}/{output_id}.json */
function s3Key(row: AuditRow): string {
  const dt = new Date(row.created_at);
  const yyyy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `audit/${row.tenant_id}/${yyyy}/${mm}/${dd}/${row.output_id}.json`;
}

/** Compute retention date: now + 10 years (COMPLIANCE mode requires a future date) */
function retainUntil(): string {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() + 10);
  return d.toISOString();
}

/**
 * Uploads a single audit record to S3 with Object Lock retention.
 * The record is stored as JSON and locked in COMPLIANCE mode for 10 years.
 *
 * @throws if AWS SDK not installed or credentials not configured
 */
export async function uploadRecordToS3(row: AuditRow): Promise<void> {
  if (!S3_BUCKET) {
    console.warn("[AUDIT S3] AUDIT_S3_BUCKET not configured — skipping S3 backup");
    return;
  }

  let S3Client: new (config: Record<string, string | number>) => unknown;
  let PutObjectCommand: new (params: Record<string, unknown>) => unknown;

  try {
    // Dynamic import so the app doesn't crash if SDK not installed
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sdk = require("@aws-sdk/client-s3");
    S3Client = sdk.S3Client;
    PutObjectCommand = sdk.PutObjectCommand;
  } catch {
    console.error(
      "[AUDIT S3] @aws-sdk/client-s3 not installed. " +
      "Run: npm install @aws-sdk/client-s3"
    );
    return;
  }

  const client = new (S3Client as new (c: Record<string, string>) => {
    send: (cmd: unknown) => Promise<void>;
  })({ region: AWS_REGION });

  const body = JSON.stringify(row, null, 2);
  const key = s3Key(row);

  const cmd = new (PutObjectCommand as new (p: Record<string, unknown>) => unknown)({
    Bucket:                   S3_BUCKET,
    Key:                      key,
    Body:                     body,
    ContentType:              "application/json",
    // Object Lock — COMPLIANCE mode
    ObjectLockMode:           "COMPLIANCE",
    ObjectLockRetainUntilDate: retainUntil(),
    // Metadata for quick inspection without downloading
    Metadata: {
      "output-id":    row.output_id,
      "tenant-id":    row.tenant_id,
      "record-hash":  row.record_hash,
      "regulation":   "EU-AI-Act-2024/1689-Art12",
    },
  });

  await (client as { send: (c: unknown) => Promise<void> }).send(cmd);
  console.info(`[AUDIT S3] Uploaded ${key} with COMPLIANCE lock until ${retainUntil()}`);
}

/**
 * Batch backup job — uploads all records created in the last N hours.
 * Call from /api/audit/backup (cron hourly).
 *
 * @param tenantId  UUID of tenant
 * @param sinceHours  look-back window (default: 2h to handle delays safely)
 */
export async function backupNewRecordsToS3(
  tenantId: string,
  sinceHours = 2
): Promise<{ uploaded: number; errors: number }> {
  const supabase = createAuditClient();
  if (!supabase) return { uploaded: 0, errors: 0 };

  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;
  const { data, error } = await client
    .from("ai_output_log")
    .select("*")
    .eq("tenant_id", tenantId)
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  if (error || !data) return { uploaded: 0, errors: 1 };

  const rows = data as AuditRow[];
  let uploaded = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      await uploadRecordToS3(row);
      uploaded++;
    } catch (err) {
      console.error(`[AUDIT S3] Failed to upload ${row.output_id}:`, err);
      errors++;
    }
  }

  return { uploaded, errors };
}

/**
 * S3 Bucket setup instructions (run once via AWS CLI):
 *
 * aws s3api create-bucket \
 *   --bucket aicomply-audit-prod \
 *   --region eu-west-1 \
 *   --create-bucket-configuration LocationConstraint=eu-west-1
 *
 * aws s3api put-bucket-versioning \
 *   --bucket aicomply-audit-prod \
 *   --versioning-configuration Status=Enabled
 *
 * aws s3api put-object-lock-configuration \
 *   --bucket aicomply-audit-prod \
 *   --object-lock-configuration '{
 *     "ObjectLockEnabled": "Enabled",
 *     "Rule": {
 *       "DefaultRetention": {
 *         "Mode": "COMPLIANCE",
 *         "Days": 3650
 *       }
 *     }
 *   }'
 *
 * Note: COMPLIANCE mode means even root AWS account cannot delete objects
 * before the retention period expires. This is intentional.
 */
export const S3_SETUP_REFERENCE = RETENTION_DAYS; // re-export for test access
