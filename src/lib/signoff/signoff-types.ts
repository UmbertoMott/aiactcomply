// src/lib/signoff/signoff-types.ts
// Tipi canonici per Sign-off (Bucket A) e Integrity Seal (Bucket B).
// Allineati all'AI Act: Art. 11, 12, 17, 18, 19, 22, 47, All. V/VII.

import { z } from "zod";

// ─── Bucket A — Sign-off ─────────────────────────────────────────────────────

export const SignerSchema = z.object({
  name:     z.string().min(1),
  role:     z.string().min(1),
  email:    z.string().email().optional(),
  onBehalf: z.string().optional(), // "per conto di" — All. V §8 per declaration_art47
});

export const QualifiedTimestampTokenSchema = z.object({
  token: z.string(),
  tsa:   z.string(),
  at:    z.string(), // ISO 8601 UTC
});

export const SignEnvelopeSchema = z.object({
  envelopeId: z.string(),
  provider:   z.string(),
});

export const SignOffRecordSchema = z.object({
  id:              z.string().uuid(),
  toolKey:         z.string(),
  scopeId:         z.string(), // es. project ID o org ID
  aiSystemId:      z.string().optional(),

  documentVersion: z.string(), // es. "v2.1" o hash-based tag
  contentHash:     z.string(), // SHA-256 del documento canonicalizzato al momento della firma

  signer:          SignerSchema,

  signedAt:        z.string(), // ISO 8601 UTC (fonte oraria server)
  signatureLevel:  z.enum(["ses", "ades", "qes"]).default("ses"),

  qualifiedTimestamp: QualifiedTimestampTokenSchema.nullable().optional(),
  providerRef:        SignEnvelopeSchema.nullable().optional(),

  legalRef:       z.string(), // es. "Art. 47 + Allegato V"
  retentionUntil: z.string(), // ISO 8601 UTC — signedAt + 10 anni (Art. 18)

  prevRecordHash: z.string().nullable(), // hash-chain; null per il primo record
  recordHash:     z.string(),            // SHA-256(canonical(record senza recordHash))
});

export type SignOffRecord = z.infer<typeof SignOffRecordSchema>;
export type Signer = z.infer<typeof SignerSchema>;

// ─── Bucket B — Integrity Seal ───────────────────────────────────────────────

export const IntegritySealSchema = z.object({
  id:        z.string().uuid(),
  toolKey:   z.string(),
  scopeId:   z.string(),
  logRef:    z.string(), // es. batch ID o range di record

  contentHash: z.string(), // SHA-256 del batch di log
  sealedAt:    z.string(), // ISO 8601 UTC

  qualifiedTimestamp: QualifiedTimestampTokenSchema.nullable().optional(),

  retentionUntil: z.string(), // sealedAt + retention (≥ 6 mesi, Art. 19)

  prevSealHash: z.string().nullable(),
  sealHash:     z.string(),
});

export type IntegritySeal = z.infer<typeof IntegritySealSchema>;

// ─── Mappa toolKey → legalRef + bucket ───────────────────────────────────────

export interface ToolSignOffConfig {
  toolKey:    string;
  legalRef:   string;
  bucket:     "A" | "B" | "C";
  requiresOnBehalf?: boolean; // All. V §8
  qtspRecommended?: boolean;  // highlight upgrade QTSP
}

export const TOOL_SIGNOFF_CONFIG: ToolSignOffConfig[] = [
  // Bucket A — firma obbligatoria o accountability
  { toolKey: "declaration_art47",    legalRef: "Art. 47 + Allegato V",          bucket: "A", requiresOnBehalf: true, qtspRecommended: true },
  { toolKey: "authorized_rep_art22", legalRef: "Art. 22",                        bucket: "A", qtspRecommended: true },
  { toolKey: "test_report_annexVII", legalRef: "Allegato VII",                   bucket: "A" },
  { toolKey: "tech_doc_annexIV",     legalRef: "Art. 11 / Allegato IV",          bucket: "A" },
  { toolKey: "qms_art17",            legalRef: "Art. 17",                         bucket: "A" },
  { toolKey: "risk_register",        legalRef: "Art. 9",                          bucket: "A" },
  { toolKey: "dpia",                 legalRef: "GDPR Art. 35 + AI Act Art. 9",   bucket: "A" },
  { toolKey: "fria",                 legalRef: "Art. 27",                         bucket: "A" },
  { toolKey: "post_market_art72",    legalRef: "Art. 72",                         bucket: "A" },
  { toolKey: "incident_art73",       legalRef: "Art. 73",                         bucket: "A" },
  { toolKey: "gpai_doc",             legalRef: "Art. 53/55",                      bucket: "A" },
  // Bucket B — integrity seal (nessun firmatario)
  { toolKey: "logvault_art12",   legalRef: "Art. 12 / 19 / 26(6)", bucket: "B" },
  { toolKey: "data_audit_art10", legalRef: "Art. 10",               bucket: "B" },
  { toolKey: "oversight_art14",  legalRef: "Art. 14",               bucket: "B" },
  // Bucket C — nessuna firma
  { toolKey: "triage",          legalRef: "", bucket: "C" },
  { toolKey: "classifier",      legalRef: "", bucket: "C" },
  { toolKey: "transparency",    legalRef: "", bucket: "C" },
];

export function getToolConfig(toolKey: string): ToolSignOffConfig | undefined {
  return TOOL_SIGNOFF_CONFIG.find(c => c.toolKey === toolKey);
}

export function retentionDate(from: string, years = 10): string {
  const d = new Date(from);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString();
}
