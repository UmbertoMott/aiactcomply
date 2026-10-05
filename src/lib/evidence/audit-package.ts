// Pacchetto unico di prove per l'audit: dossier, firme di DPIA e FRIA, registro delle evidenze
// con verifica completa della catena, e un'impronta SHA-256 dell'intero pacchetto.
// Sostituisce le esportazioni separate (dossier JSON, "Esporta Chain").

import { sha256 } from "@/lib/crypto/hash";
import { readFromStorage } from "@/lib/dossier/storage-schema";
import { aggregateDossier, getDossierSections, getCompletionPercentage } from "@/lib/dossier/dossier-engine";
import { getAllEvidence, verifyChainDeep } from "./evidence-layer";

export async function buildAuditPackage() {
  const exportedAt = new Date().toISOString();
  const evidence = getAllEvidence();
  const chain = await verifyChainDeep();
  const body = {
    export_type: "Pacchetto di prove — Reg. (UE) 2024/1689",
    exported_at: exportedAt,
    dossier: (() => {
      const data = aggregateDossier();
      const sections = getDossierSections(data);
      return {
        completion_pct: getCompletionPercentage(sections),
        sections: sections.map((s) => ({ id: s.id, article: s.article, title: s.title, status: s.status, completedAt: s.completedAt ?? null })),
        data,
      };
    })(),
    signoffs: {
      dpia: readFromStorage("dpiaSignoff"),
      fria: readFromStorage("friaSignoff"),
    },
    evidence: {
      records: evidence,
      total: evidence.length,
      chain_verification: chain,
      note: "Ogni record contiene l'impronta SHA-256 del proprio contenuto e quella del record precedente. Il registro è conservato nel browser: questo file è la copia da archiviare.",
    },
  };
  const packageHash = await sha256(JSON.stringify(body));
  return { ...body, package_sha256: packageHash };
}

export async function downloadAuditPackage(fileStem: string): Promise<{ valid: boolean; total: number }> {
  const pkg = await buildAuditPackage();
  const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileStem}-${pkg.exported_at.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return { valid: pkg.evidence.chain_verification.valid, total: pkg.evidence.total };
}
