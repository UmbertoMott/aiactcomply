import { z } from "zod";

export const ContentTypeEnum = z.enum(["text", "audio", "image", "video"]);
export type ContentType = z.infer<typeof ContentTypeEnum>;

export const LabellingMethodEnum = z.enum([
  "embedded_metadata",       // C2PA, IPTC, XMP — machine-readable + human-readable
  "visible_watermark",       // human-readable; machineReadable a discrezione
  "invisible_watermark",     // machine-readable; not directly human-readable
  "disclosure_statement_only", // solo testuale — NON machine-readable → avviso non conformità
  "none",                    // nessun meccanismo → avviso non conformità
]);
export type LabellingMethod = z.infer<typeof LabellingMethodEnum>;

// Mappa fissa metodo → machineReadable/humanReadable
export const LABELLING_METHOD_CAPABILITIES: Record<LabellingMethod, { machineReadable: boolean; humanReadable: boolean }> = {
  embedded_metadata:          { machineReadable: true,  humanReadable: true  },
  visible_watermark:          { machineReadable: false, humanReadable: true  },
  invisible_watermark:        { machineReadable: true,  humanReadable: false },
  disclosure_statement_only:  { machineReadable: false, humanReadable: true  },
  none:                       { machineReadable: false, humanReadable: false },
};

export const LabellingMethodLabels: Record<LabellingMethod, string> = {
  embedded_metadata:          "Metadati incorporati (C2PA / IPTC / XMP)",
  visible_watermark:          "Watermark visibile",
  invisible_watermark:        "Watermark invisibile (machine-readable)",
  disclosure_statement_only:  "Solo dichiarazione testuale (non machine-readable)",
  none:                       "Nessun meccanismo",
};

export const DirectInteractionChecklistSchema = z.object({
  systemId: z.string(),
  presentsAsAi: z.enum(["yes", "no", "unspecified"]).default("unspecified"),
  clearAndDistinguishable: z.enum(["yes", "no", "unspecified"]).default("unspecified"),
  obviousExemptionClaimed: z.boolean().default(false),
  obviousExemptionJustification: z.string().optional(),
  status: z.enum(["compliant", "partial", "gap", "n/a"]).default("n/a"),
  notes: z.string().optional(),
});
export type DirectInteractionChecklist = z.infer<typeof DirectInteractionChecklistSchema>;

export const SyntheticContentLabelSchema = z.object({
  systemId: z.string(),
  contentType: ContentTypeEnum,
  labellingMethod: LabellingMethodEnum.default("none"),
  machineReadable: z.boolean().default(false),
  humanReadable: z.boolean().default(false),
  exemptionClaimed: z.string().optional(),
  exemptionJustification: z.string().optional(),
  notes: z.string().optional(),
  aiConfirmed: z.boolean().default(false),
});
export type SyntheticContentLabel = z.infer<typeof SyntheticContentLabelSchema>;

export const DeepfakeDisclosureSchema = z.object({
  systemId: z.string(),
  applicable: z.enum(["yes", "no", "unspecified"]).default("unspecified"),
  contentTypes: z.array(ContentTypeEnum).default([]),
  disclosureMechanism: z.string().optional(),
  exemptionClaimed: z.string().optional(),
  exemptionJustification: z.string().optional(),
  aiConfirmed: z.boolean().default(false),
});
export type DeepfakeDisclosure = z.infer<typeof DeepfakeDisclosureSchema>;

export const Art50SystemRecordSchema = z.object({
  systemId: z.string(),
  directInteraction: DirectInteractionChecklistSchema.optional(),
  syntheticContentLabels: z.array(SyntheticContentLabelSchema).default([]),
  deepfakeDisclosure: DeepfakeDisclosureSchema.optional(),
  emotionBiometricLinkAcknowledged: z.boolean().default(false),
  selectedContentTypes: z.array(ContentTypeEnum).default([]),
  updatedAt: z.string().optional(),
});
export type Art50SystemRecord = z.infer<typeof Art50SystemRecordSchema>;

export const SelfComplianceStatusEnum = z.enum(["compliant", "partial", "gap", "n/a"]);
export type SelfComplianceStatus = z.infer<typeof SelfComplianceStatusEnum>;

export const SelfComplianceItemSchema = z.object({
  id: z.string(),
  obligationId: z.string(),
  area: z.string(),
  status: SelfComplianceStatusEnum.default("gap"),
  evidence: z.string().optional(),
  remediationNotes: z.string().optional(),
});
export type SelfComplianceItem = z.infer<typeof SelfComplianceItemSchema>;

export const Art50RecordSchema = z.object({
  systemRecords: z.record(z.string(), Art50SystemRecordSchema).default({}),
  selfCompliance: z.array(SelfComplianceItemSchema).default([]),
  updatedAt: z.string().optional(),
});
export type Art50Record = z.infer<typeof Art50RecordSchema>;

const STORAGE_KEY = "aicomply_art50_record_v1";

export function loadArt50Record(): Art50Record {
  if (typeof window === "undefined") return { systemRecords: {}, selfCompliance: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { systemRecords: {}, selfCompliance: [] };
  } catch { return { systemRecords: {}, selfCompliance: [] }; }
}

export function saveArt50Record(r: Art50Record): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...r, updatedAt: new Date().toISOString() }));
}

export function getSystemRecord(r: Art50Record, systemId: string): Art50SystemRecord {
  return r.systemRecords[systemId] ?? { systemId, syntheticContentLabels: [], selectedContentTypes: [], emotionBiometricLinkAcknowledged: false };
}

export function setSystemRecord(r: Art50Record, systemId: string, rec: Art50SystemRecord): Art50Record {
  return { ...r, systemRecords: { ...r.systemRecords, [systemId]: rec } };
}
