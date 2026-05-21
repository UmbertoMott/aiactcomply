// C-03 Audit Trail — GDPR Art. 17 Redaction Handler
// RIGHT TO ERASURE: do NOT delete records — redact content, preserve metadata + hashes.
// The immutability trigger allows this specific UPDATE path (gdpr_redacted: false → true).

import { GDPR_REDACTED_PLACEHOLDER } from "./audit-types";
import { createAuditClient } from "./audit-trail";

export interface GdprRedactionResult {
  success: boolean;
  redactedCount: number;
  outputIds: string[];
  redactedAt: string;
  error?: string;
}

/**
 * Redacts AI output content for GDPR Art. 17 (Right to Erasure).
 *
 * What IS changed:
 *   - input_text → [REDACTED - GDPR Art. 17 - {date}]
 *   - output_text → [REDACTED - GDPR Art. 17 - {date}]
 *   - gdpr_redacted → true
 *   - gdpr_redacted_at → now()
 *   - gdpr_redacted_by → requestedBy
 *
 * What is NOT changed (preserved for audit integrity):
 *   - id, output_id, tenant_id
 *   - input_hash, output_hash, record_hash, previous_record_hash
 *   - created_at, expires_at, regulation_refs
 *   - model_name, document_type, user_id (metadata retained)
 */
export async function redactForGDPR(opts: {
  tenantId: string;
  /** Redact by user_id — all records for this user */
  userId?: string;
  /** Redact specific output IDs */
  outputIds?: string[];
  /** Who requested the erasure (DPO name, ticket ref, etc.) */
  requestedBy: string;
}): Promise<GdprRedactionResult> {
  const redactedAt = new Date().toISOString();
  const placeholder = GDPR_REDACTED_PLACEHOLDER(redactedAt.slice(0, 10));

  const supabase = createAuditClient();
  if (!supabase) {
    return {
      success: false,
      redactedCount: 0,
      outputIds: [],
      redactedAt,
      error: "Supabase service role not configured",
    };
  }

  if (!opts.userId && (!opts.outputIds || opts.outputIds.length === 0)) {
    return {
      success: false,
      redactedCount: 0,
      outputIds: [],
      redactedAt,
      error: "Provide userId or outputIds",
    };
  }

  // Use raw client for the permitted UPDATE (triggers allows gdpr_redacted: false → true)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;

  const updatePayload = {
    input_text:       placeholder,
    output_text:      placeholder,
    gdpr_redacted:    true,
    gdpr_redacted_at: redactedAt,
    gdpr_redacted_by: opts.requestedBy,
  };

  let query = client
    .from("ai_output_log")
    .update(updatePayload)
    .eq("tenant_id", opts.tenantId)
    .eq("gdpr_redacted", false); // only redact once

  if (opts.userId) {
    query = query.eq("user_id", opts.userId);
  } else if (opts.outputIds && opts.outputIds.length > 0) {
    query = query.in("output_id", opts.outputIds);
  }

  const { data, error } = await query.select("output_id");

  if (error) {
    return {
      success: false,
      redactedCount: 0,
      outputIds: [],
      redactedAt,
      error: error.message,
    };
  }

  const redactedIds: string[] = Array.isArray(data)
    ? (data as { output_id: string }[]).map((r) => r.output_id)
    : [];

  return {
    success: true,
    redactedCount: redactedIds.length,
    outputIds: redactedIds,
    redactedAt,
  };
}
