// C-03 Audit Trail — Hash Chain Integrity Verifier
// Run weekly (cron) or on-demand via /api/audit/verify

import { sha256 } from "@/lib/crypto/hash";
import type { AuditRow, IntegrityReport } from "./audit-types";
import { createAuditClient } from "./audit-trail";

/** Recompute record hash from row data (mirrors SQL compute_record_hash) */
async function recomputeHash(row: AuditRow): Promise<string> {
  const payload = [
    row.output_id,
    row.tenant_id,
    row.input_hash,
    row.output_hash,
    row.model_name,
    row.created_at,
    row.previous_record_hash,
  ].join("|");
  return sha256(payload);
}

/**
 * Verifies the full hash chain for a tenant.
 * Fetches all records ordered by created_at ASC and recomputes each hash.
 * Any mismatch indicates tampering.
 *
 * @param tenantId   UUID of the tenant to verify
 * @param limit      Max records to verify (default: all). Use for incremental runs.
 */
export async function verifyHashChain(
  tenantId: string,
  limit?: number
): Promise<IntegrityReport> {
  const checkedAt = new Date().toISOString();
  const supabase = createAuditClient();

  if (!supabase) {
    return {
      verified: false,
      totalRecords: 0,
      failedRecords: [],
      checkedAt,
      tenantId,
    };
  }

  // Fetch records ordered oldest-first for chain traversal
  // Using raw supabase query since we need full rows
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;
  let query = client
    .from("ai_output_log")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;

  if (error || !data) {
    return {
      verified: false,
      totalRecords: 0,
      failedRecords: [],
      checkedAt,
      tenantId,
    };
  }

  const rows = data as AuditRow[];
  const failed: string[] = [];
  let expectedPreviousHash = "genesis";

  for (const row of rows) {
    // 1. Verify previous_record_hash chain link
    if (row.previous_record_hash !== expectedPreviousHash && !row.gdpr_redacted) {
      failed.push(row.output_id);
    }

    // 2. Recompute and compare record_hash
    const computed = await recomputeHash(row);
    if (computed !== row.record_hash) {
      if (!failed.includes(row.output_id)) {
        failed.push(row.output_id);
      }
    }

    expectedPreviousHash = row.record_hash;
  }

  return {
    verified: failed.length === 0,
    totalRecords: rows.length,
    failedRecords: failed,
    checkedAt,
    tenantId,
  };
}

/**
 * Sends an alert when integrity verification fails.
 * Uses nodemailer (already in package.json).
 */
export async function sendIntegrityAlert(report: IntegrityReport): Promise<void> {
  if (report.verified) return;

  const alertEmail = process.env.AUDIT_ALERT_EMAIL;
  if (!alertEmail) {
    console.error("[AUDIT INTEGRITY ALERT]", JSON.stringify(report, null, 2));
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodemailer = require("nodemailer");
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? "AIComply <noreply@aicomply.local>",
      to: alertEmail,
      subject: `🚨 [AIComply] Violazione integrità audit trail — ${report.failedRecords.length} record`,
      text: [
        "ALERT: Audit trail integrity verification FAILED",
        "",
        `Tenant:          ${report.tenantId}`,
        `Checked at:      ${report.checkedAt}`,
        `Total records:   ${report.totalRecords}`,
        `Failed records:  ${report.failedRecords.length}`,
        "",
        "Tampered output IDs:",
        ...report.failedRecords.map((id) => `  - ${id}`),
        "",
        "Ref: EU AI Act Art. 12 — immediate investigation required.",
      ].join("\n"),
    });
  } catch (err) {
    console.error("[AUDIT] Failed to send integrity alert email:", err);
  }
}
