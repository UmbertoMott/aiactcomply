// C-03 Audit Trail — shared TypeScript types
// EU AI Act Art. 12 | GDPR Art. 5(1)(e)

import type { OutputType } from "@/lib/disclosure/output-id";

export type { OutputType };

export interface AuditRecordInput {
  outputId: string;           // [TIPO]-[YYYYMMDD]-[NNN] — from generateServerOutputId
  tenantId: string;           // UUID of the organisation
  outputTypeCode: OutputType;
  documentType: string;       // human-readable, e.g. "Documentazione Tecnica Art. 11"

  // Content — hashed always; raw text optional
  inputText?: string;         // will be encrypted before storage
  outputText?: string;        // will be encrypted before storage

  // AI metadata
  modelName: string;
  modelVersion?: string;
  systemVersion: string;

  // Actor
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;

  // Chain
  previousRecordHash?: string; // defaults to "genesis" if first record

  // Compliance
  regulationRefs?: string[];
  requiresReview?: boolean;
}

export interface AuditRecord extends AuditRecordInput {
  id: string;                 // UUID PK
  inputHash: string;          // SHA-256 of inputText
  outputHash: string;         // SHA-256 of outputText
  recordHash: string;         // SHA-256 of key fields
  previousRecordHash: string;
  createdAt: string;          // ISO 8601
  expiresAt: string;          // createdAt + 10 years
  gdprRedacted: boolean;
  gdprRedactedAt?: string;
  gdprRedactedBy?: string;
}

/** Row as returned by Supabase */
export interface AuditRow {
  id: string;
  output_id: string;
  tenant_id: string;
  input_hash: string;
  output_hash: string;
  input_text: string | null;
  output_text: string | null;
  document_type: string;
  output_type_code: string;
  model_name: string;
  model_version: string | null;
  system_version: string;
  user_id: string | null;
  user_email: string | null;
  ip_address: string | null;
  user_agent: string | null;
  record_hash: string;
  previous_record_hash: string;
  created_at: string;
  expires_at: string;
  gdpr_redacted: boolean;
  gdpr_redacted_at: string | null;
  gdpr_redacted_by: string | null;
  regulation_refs: string[];
  requires_review: boolean;
}

export interface AuditInsertResult {
  success: boolean;
  outputId: string;
  recordId: string;
  recordHash: string;
  error?: string;
}

export interface IntegrityReport {
  verified: boolean;
  totalRecords: number;
  failedRecords: string[];  // output_ids of tampered records
  checkedAt: string;
  tenantId: string;
}

export const GDPR_REDACTED_PLACEHOLDER = (date: string) =>
  `[REDACTED - GDPR Art. 17 - ${date}]`;
