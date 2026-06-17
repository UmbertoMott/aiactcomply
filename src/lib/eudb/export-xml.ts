// EUDB XML/JSON machine-readable export — PROMPT BF
// XML structure based on EAIB technical specifications (placeholder — update when
// official schema is published by the European AI Office).
// [verify against current AI Act text]

import type { EudbDraft } from "@/types/eudb";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function generateEudbXml(draft: EudbDraft): string {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<EUAIActRegistration xmlns="https://aioffice.europa.eu/eudb/schema/v1"
                     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                     exportedAt="${now}">

  <!-- Allegato VIII — Sezione A: Dati del Fornitore [verify against current AI Act text] -->
  <Provider>
    <Name>${escapeXml(draft.providerName)}</Name>
    <Address>${escapeXml(draft.providerAddress)}</Address>
    <Contact>${escapeXml(draft.providerContact)}</Contact>
    <Role>${escapeXml(draft.providerRole)}</Role>
  </Provider>

  <!-- Allegato VIII — Sezione B: Informazioni sul Sistema AI [verify against current AI Act text] -->
  <AISystem>
    <Name>${escapeXml(draft.systemName)}</Name>
    <Version>${escapeXml(draft.systemVersion)}</Version>
    <IntendedPurpose>${escapeXml(draft.intendedPurpose)}</IntendedPurpose>
    <RiskCategory>${escapeXml(draft.riskCategory)}</RiskCategory>
    <AnnexIIIReference>${escapeXml(draft.annexIIIReference)}</AnnexIIIReference>
  </AISystem>

  <!-- Stato allegati obbligatori -->
  <ComplianceDocuments>
    <AnnexIVCompleted>${draft.annexIVCompleted}</AnnexIVCompleted>
    <EUDeclarationOfConformity>${draft.euDeclarationReady}</EUDeclarationOfConformity>
    <InstructionsForUse>${draft.instructionsForUseReady}</InstructionsForUse>
  </ComplianceDocuments>

  <!-- Metadati registrazione -->
  <RegistrationMetadata>
    <InternalSystemId>${escapeXml(draft.systemId)}</InternalSystemId>
    <LastUpdated>${escapeXml(draft.lastUpdated)}</LastUpdated>
    <SubmissionStatus>${escapeXml(draft.submissionStatus)}</SubmissionStatus>
    <GeneratedBy>AIComply v2</GeneratedBy>
  </RegistrationMetadata>

</EUAIActRegistration>`.trim();
}

export function downloadEudbXml(draft: EudbDraft): void {
  if (typeof window === "undefined") return;
  const xml = generateEudbXml(draft);
  const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `eudb_registration_${draft.systemId}_${Date.now()}.xml`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadEudbJson(draft: EudbDraft): void {
  if (typeof window === "undefined") return;
  const payload = {
    exportedAt: new Date().toISOString(),
    schema: "eudb-annex-viii-v1",
    generatedBy: "AIComply v2",
    provider: {
      name: draft.providerName,
      address: draft.providerAddress,
      contact: draft.providerContact,
      role: draft.providerRole,
    },
    aiSystem: {
      name: draft.systemName,
      version: draft.systemVersion,
      intendedPurpose: draft.intendedPurpose,
      riskCategory: draft.riskCategory,
      annexIIIReference: draft.annexIIIReference,
    },
    complianceDocuments: {
      annexIVCompleted: draft.annexIVCompleted,
      euDeclarationOfConformity: draft.euDeclarationReady,
      instructionsForUse: draft.instructionsForUseReady,
    },
    registrationMetadata: {
      internalSystemId: draft.systemId,
      lastUpdated: draft.lastUpdated,
      submissionStatus: draft.submissionStatus,
    },
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `eudb_registration_${draft.systemId}_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
