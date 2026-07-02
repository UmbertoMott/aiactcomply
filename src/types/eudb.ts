// EudbDraft — flat type for Annex VIII validation and XML export — PROMPT BF

import type { EUDBDoc } from "@/lib/eudb/eudb-prefill";

export interface EudbDraft {
  // Allegato VIII — Sezione A: Fornitore
  providerName: string;
  providerAddress: string;
  providerContact: string;
  providerRole: string;
  // Allegato VIII — Sezione B: Sistema AI
  systemName: string;
  systemVersion: string;
  intendedPurpose: string;
  riskCategory: string;
  annexIIIReference: string;
  // Allegati obbligatori (gate submission)
  annexIVCompleted: boolean;
  euDeclarationReady: boolean;
  instructionsForUseReady: boolean;
  // Meta
  systemId: string;
  lastUpdated: string;
  submissionStatus: "draft" | "submitted";
}

/** Converts existing EUDBDoc to the flat EudbDraft for validation/export */
export function toEudbDraft(doc: EUDBDoc): EudbDraft {
  const p = doc.provider;
  const s = doc.system;
  const addr = [p.provider_address, p.provider_country].filter(Boolean).join(", ");
  return {
    providerName: p.provider_name,
    providerAddress: addr,
    providerContact: p.contact_email || p.contact_name,
    providerRole: p.has_authorized_rep ? "authorized_representative" : "provider",
    systemName: s.system_name,
    systemVersion: s.system_version,
    intendedPurpose: s.intended_purpose,
    riskCategory: s.risk_classification,
    annexIIIReference: s.annex_reference,
    annexIVCompleted: !!s.technical_doc_url,
    euDeclarationReady: !!s.conformity_declaration_number,
    instructionsForUseReady: !!s.instructions_url,
    systemId: doc.eudb_registration_number ?? "draft",
    lastUpdated: doc.updatedAt,
    submissionStatus: doc.eudb_registration_number ? "submitted" : "draft",
  };
}
