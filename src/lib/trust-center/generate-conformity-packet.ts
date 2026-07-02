// Export pacchetto di conformità — PROMPT BC (Art. 11, Annex IV)
// Aggrega stato Trust Center + documenti collegati in un JSON scaricabile.
// Conversione PDF delegata a prompt futuro.

import type { TrustCenterPage } from "./trust-center-types";

export interface ConformityDocument {
  type: "dpia" | "fria" | "annex_iv" | "eu_declaration" | "instructions_for_use";
  title: string;
  status: "completed" | "draft" | "missing";
  generatedAt?: string;
}

export interface ConformityPacket {
  exportedAt: string;
  systemId: string;
  systemName: string;
  riskTier: string | null;
  trustCenter: TrustCenterPage;
  documents: ConformityDocument[];
  attestation: {
    iso42001: boolean;
    euAiActAnnexIV: boolean;
  };
}

function readDocumentStatus(): ConformityDocument[] {
  const docs: ConformityDocument[] = [];
  if (typeof window === "undefined") return docs;

  const dpiaRaw = localStorage.getItem("aicomply_dpia_v2");
  docs.push({
    type: "dpia",
    title: "Data Protection Impact Assessment (DPIA)",
    status: dpiaRaw ? "completed" : "missing",
    generatedAt: dpiaRaw
      ? (JSON.parse(dpiaRaw) as Record<string, unknown>).updatedAt as string | undefined
      : undefined,
  });

  const friaRaw = localStorage.getItem("aicomply_fria_v1");
  docs.push({
    type: "fria",
    title: "Fundamental Rights Impact Assessment (FRIA)",
    status: friaRaw ? "completed" : "missing",
    generatedAt: friaRaw
      ? (JSON.parse(friaRaw) as Record<string, unknown>).updatedAt as string | undefined
      : undefined,
  });

  const docuRaw = localStorage.getItem("aicomply_docugen_result");
  const docuParsed = docuRaw ? (JSON.parse(docuRaw) as Record<string, unknown>) : null;
  docs.push({
    type: "annex_iv",
    title: "Documentazione tecnica — Annex IV",
    status: docuParsed ? "completed" : "missing",
    generatedAt: docuParsed?.generatedAt as string | undefined,
  });

  docs.push({
    type: "eu_declaration",
    title: "Dichiarazione UE di conformità (Art. 47)",
    status: docuParsed?.declarationDrafted ? "completed" : "draft",
    generatedAt: docuParsed?.declarationDate as string | undefined,
  });

  return docs;
}

export function generateConformityPacket(
  systemId: string,
  page: TrustCenterPage,
  systemName: string,
  riskTier: string | null
): ConformityPacket {
  const documents = readDocumentStatus();
  const annexIVCompleted = documents.find(d => d.type === "annex_iv")?.status === "completed";

  return {
    exportedAt: new Date().toISOString(),
    systemId,
    systemName,
    riskTier,
    trustCenter: page,
    documents,
    attestation: {
      iso42001: false, // TODO: collegare a modulo certificazione
      euAiActAnnexIV: annexIVCompleted,
    },
  };
}
