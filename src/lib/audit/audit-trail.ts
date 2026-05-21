// C-03 Audit Trail — core insert function
// Server-side only. Uses Supabase service role key to bypass RLS.
// FAIL-SAFE: throws if INSERT fails — caller must NOT show output on error.

import { sha256 } from "@/lib/crypto/hash";
import type { AuditRecordInput, AuditInsertResult } from "./audit-types";

const ENCRYPTION_KEY = process.env.AUDIT_ENCRYPTION_KEY ?? "";

/** SHA-256 of a string; returns "empty" hash for null/undefined */
async function hashField(value: string | undefined | null): Promise<string> {
  if (!value) return await sha256("__empty__");
  return sha256(value);
}

/** Compute the record-level hash (mirrors PostgreSQL compute_record_hash) */
async function computeRecordHash(fields: {
  outputId: string;
  tenantId: string;
  inputHash: string;
  outputHash: string;
  modelName: string;
  createdAt: string;
  previousHash: string;
}): Promise<string> {
  const payload = [
    fields.outputId,
    fields.tenantId,
    fields.inputHash,
    fields.outputHash,
    fields.modelName,
    fields.createdAt,
    fields.previousHash,
  ].join("|");
  return sha256(payload);
}

/**
 * Encrypt text using pgcrypto pgp_sym_encrypt via Supabase RPC.
 * Falls back to plain text if key not configured (dev mode).
 */
async function encryptField(
  value: string,
  supabase: SupabaseServiceClient
): Promise<string> {
  if (!ENCRYPTION_KEY) return value; // dev-mode: no encryption
  try {
    const { data, error } = await supabase.rpc("pgp_sym_encrypt_wrapper", {
      p_value: value,
      p_key: ENCRYPTION_KEY,
    });
    if (error || !data) throw new Error("encrypt failed");
    return data as string;
  } catch {
    // If RPC not available, return plain (acceptable degradation)
    return value;
  }
}

/** Minimal Supabase service client shape needed */
interface SupabaseServiceClient {
  from: (table: string) => {
    insert: (data: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
    select: (cols?: string) => {
      eq: (col: string, val: string) => {
        order: (col: string, opts: { ascending: boolean }) => {
          limit: (n: number) => Promise<{ data: { record_hash: string }[] | null; error: unknown }>;
        };
      };
    };
  };
  rpc: (fn: string, args: Record<string, string>) => Promise<{ data: unknown; error: unknown }>;
}

/**
 * Creates a Supabase service-role client for audit writes.
 * Requires SUPABASE_SERVICE_ROLE_KEY env var.
 */
export function createAuditClient(): SupabaseServiceClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url?.startsWith("http") || !key) return null;

  // Dynamic import to avoid bundling supabase in client
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require("@supabase/supabase-js");
  return createClient(url, key, { auth: { persistSession: false } }) as SupabaseServiceClient;
}

/**
 * Fetches the most recent record_hash for a tenant (for chain linking).
 * Returns "genesis" if no records exist yet.
 */
async function getLastRecordHash(
  tenantId: string,
  supabase: SupabaseServiceClient
): Promise<string> {
  try {
    const { data } = await supabase
      .from("ai_output_log")
      .select("record_hash")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(1);
    if (Array.isArray(data) && data.length > 0) {
      return (data[0] as { record_hash: string }).record_hash;
    }
  } catch {
    // non-critical — return genesis
  }
  return "genesis";
}

/**
 * FAIL-SAFE audit insert.
 * Must be called BEFORE returning the AI output to the user.
 * If this throws, the caller must NOT display the output.
 */
export async function insertAuditRecord(
  input: AuditRecordInput
): Promise<AuditInsertResult> {
  const supabase = createAuditClient();

  // If Supabase not configured, log to console in dev and continue gracefully
  if (!supabase) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[AUDIT] Supabase service role not configured — skipping audit insert.", {
        outputId: input.outputId,
      });
      return {
        success: false,
        outputId: input.outputId,
        recordId: "offline",
        recordHash: "offline",
        error: "Supabase service role not configured",
      };
    }
    // In production: fail hard
    throw new Error(
      "AUDIT_FAIL_SAFE: impossibile inserire nel log di audit — " +
      "SUPABASE_SERVICE_ROLE_KEY non configurata. Output non mostrato."
    );
  }

  const createdAt = new Date().toISOString();
  const inputHash = await hashField(input.inputText);
  const outputHash = await hashField(input.outputText);
  const previousHash = input.previousRecordHash
    ?? await getLastRecordHash(input.tenantId, supabase);

  const recordHash = await computeRecordHash({
    outputId:     input.outputId,
    tenantId:     input.tenantId,
    inputHash,
    outputHash,
    modelName:    input.modelName,
    createdAt,
    previousHash,
  });

  // Encrypt content fields if key available
  const encryptedInput = input.inputText
    ? await encryptField(input.inputText, supabase)
    : null;
  const encryptedOutput = input.outputText
    ? await encryptField(input.outputText, supabase)
    : null;

  const row: Record<string, unknown> = {
    output_id:            input.outputId,
    tenant_id:            input.tenantId,
    input_hash:           inputHash,
    output_hash:          outputHash,
    input_text:           encryptedInput,
    output_text:          encryptedOutput,
    document_type:        input.documentType,
    output_type_code:     input.outputTypeCode,
    model_name:           input.modelName,
    model_version:        input.modelVersion ?? null,
    system_version:       input.systemVersion,
    user_id:              input.userId ?? null,
    user_email:           input.userEmail ?? null,
    ip_address:           input.ipAddress ?? null,
    user_agent:           input.userAgent ?? null,
    record_hash:          recordHash,
    previous_record_hash: previousHash,
    created_at:           createdAt,
    gdpr_redacted:        false,
    regulation_refs:      input.regulationRefs ?? [
      "EU-AI-Act-2024/1689-Art12",
      "EU-AI-Act-2024/1689-Art50",
    ],
    requires_review:      input.requiresReview ?? true,
  };

  const { data, error } = await supabase.from("ai_output_log").insert(row);

  if (error) {
    // FAIL-SAFE: propagate — caller must not show output
    throw new Error(`AUDIT_FAIL_SAFE: insert fallito — ${error.message}`);
  }

  void data; // data is null on insert with no returning
  return {
    success: true,
    outputId: input.outputId,
    recordId: row["id"] as string ?? "inserted",
    recordHash,
  };
}
