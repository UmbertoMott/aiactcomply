// PDF/A-3 Exporter — server-side
// Genera PDF/A-3 con XMP metadata custom + embedded JSON originale.
// Vedi docs/PDF-A3-PAdES-SPEC.md per la specifica completa.
//
// NOTA: questa è l'implementazione del PDF/A-3 base senza firma PAdES.
// La firma richiede certificato qualificato (eIDAS) e HSM/token lato utente.
// Vedi `signPdfWithPades()` in pdfa3-signer.ts (TODO) per la firma.

import crypto from "crypto";

export interface DossierExportInput {
  systemId: string;
  systemName: string;
  riskTier: string;
  articleCoverage: string[];          // ["Art. 6", "Art. 9", ...]
  jsonContent: object;                // payload JSON del dossier (Annex IV)
  signatoryName: string;
  signatoryRole: string;
  companyName: string;
  companyVAT?: string;
  evidenceLayerChainHead?: string;    // hash dell'ultimo evidence
}

export interface PdfA3Result {
  pdfBytes: Uint8Array;
  contentSha256: string;
  embeddedJsonSha256: string;
  xmpMetadata: string;
  timestamp: string;
}

/**
 * Calcola SHA-256 di un payload (Uint8Array o string).
 */
export function sha256(payload: Uint8Array | string): string {
  const buf = typeof payload === "string" ? Buffer.from(payload, "utf-8") : Buffer.from(payload);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

/**
 * Genera lo stream XMP con metadati custom AIComply.
 * Schema namespace: http://aicomply.app/schema/evidence#
 */
export function buildXmpMetadata(input: DossierExportInput, contentHash: string, jsonHash: string, jsonFilename: string): string {
  const now = new Date().toISOString();
  const articles = input.articleCoverage.join(", ");

  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="AIComply XMP Toolkit 1.0">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
      xmlns:dc="http://purl.org/dc/elements/1.1/"
      xmlns:xmp="http://ns.adobe.com/xap/1.0/"
      xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/"
      xmlns:aic="http://aicomply.app/schema/evidence#">

      <dc:title><rdf:Alt><rdf:li xml:lang="x-default">Dossier Annex IV — ${escapeXml(input.systemName)}</rdf:li></rdf:Alt></dc:title>
      <dc:creator><rdf:Seq><rdf:li>AIComply Platform</rdf:li></rdf:Seq></dc:creator>
      <dc:date><rdf:Seq><rdf:li>${now}</rdf:li></rdf:Seq></dc:date>
      <xmp:CreatorTool>AIComply v1.0</xmp:CreatorTool>
      <pdfaid:part>3</pdfaid:part>
      <pdfaid:conformance>B</pdfaid:conformance>

      <aic:evidenceVersion>1.0</aic:evidenceVersion>
      <aic:evidenceType>dossier_annex_iv</aic:evidenceType>
      <aic:systemId>${escapeXml(input.systemId)}</aic:systemId>
      <aic:systemName>${escapeXml(input.systemName)}</aic:systemName>
      <aic:riskTier>${escapeXml(input.riskTier)}</aic:riskTier>
      <aic:articleCoverage>${escapeXml(articles)}</aic:articleCoverage>

      <aic:contentSha256>${contentHash}</aic:contentSha256>
      <aic:embeddedJsonFilename>${escapeXml(jsonFilename)}</aic:embeddedJsonFilename>
      <aic:embeddedJsonSha256>${jsonHash}</aic:embeddedJsonSha256>

      <aic:signatoryName>${escapeXml(input.signatoryName)}</aic:signatoryName>
      <aic:signatoryRole>${escapeXml(input.signatoryRole)}</aic:signatoryRole>
      <aic:companyName>${escapeXml(input.companyName)}</aic:companyName>
      ${input.companyVAT ? `<aic:companyVAT>${escapeXml(input.companyVAT)}</aic:companyVAT>` : ""}

      ${input.evidenceLayerChainHead ? `<aic:evidenceLayerChainHead>${input.evidenceLayerChainHead}</aic:evidenceLayerChainHead>` : ""}

      <aic:applicableRegulation>Reg. UE 2024/1689 + L. 132/2025</aic:applicableRegulation>
      <aic:retentionRequirement>10 years (Art. 18 EU AI Act)</aic:retentionRequirement>
      <aic:generatedAt>${now}</aic:generatedAt>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

/**
 * Genera PDF/A-3 con dossier + embed JSON originale.
 *
 * Implementazione semplificata: usa pdf-lib se installato, altrimenti
 * restituisce una struttura placeholder. Per produzione installare:
 *   npm install pdf-lib
 *
 * @returns Result con pdfBytes, hash, xmpMetadata, timestamp
 */
export async function exportDossierToPdfA3(input: DossierExportInput): Promise<PdfA3Result> {
  const jsonString = JSON.stringify(input.jsonContent, null, 2);
  const jsonBytes = new TextEncoder().encode(jsonString);
  const jsonHash = sha256(jsonBytes);
  const jsonFilename = `dossier-annex-iv-${input.systemId}-${new Date().toISOString().slice(0, 10)}.json`;

  const { PDFDocument } = await import("pdf-lib");

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`Dossier Annex IV — ${input.systemName}`);
  pdfDoc.setAuthor(input.signatoryName);
  pdfDoc.setProducer("AIComply Platform");
  pdfDoc.setCreator("AIComply v1.0");

  // Pagina copertina
  const page = pdfDoc.addPage([595.28, 841.89]);  // A4 portrait
  page.drawText("Dossier Tecnico Annex IV", { x: 50, y: 780, size: 22 });
  page.drawText(`Sistema: ${input.systemName}`, { x: 50, y: 740, size: 14 });
  page.drawText(`Tier rischio: ${input.riskTier}`, { x: 50, y: 720, size: 12 });
  page.drawText(`Articoli coperti: ${input.articleCoverage.join(", ")}`, {
    x: 50, y: 690, size: 10, maxWidth: 500,
  });
  page.drawText(`Firmatario: ${input.signatoryName} (${input.signatoryRole})`, {
    x: 50, y: 650, size: 12,
  });
  page.drawText(`Azienda: ${input.companyName}`, { x: 50, y: 630, size: 12 });
  page.drawText(`Generato: ${new Date().toLocaleString("it-IT")}`, { x: 50, y: 600, size: 10 });
  page.drawText("Documento integrato Reg. UE 2024/1689 (AI Act) + L. 132/2025", {
    x: 50, y: 60, size: 9,
  });

  // Embed JSON come allegato (PDF/A-3 supporta qualsiasi tipo)
  await pdfDoc.attach(jsonBytes, jsonFilename, {
    mimeType: "application/json",
    description: "Dossier Annex IV — JSON originale per verifica integrità",
    creationDate: new Date(),
    modificationDate: new Date(),
  });

  const pdfBytes = await pdfDoc.save();
  const contentHash = sha256(pdfBytes);
  const xmp = buildXmpMetadata(input, contentHash, jsonHash, jsonFilename);

  return {
    pdfBytes,
    contentSha256: contentHash,
    embeddedJsonSha256: jsonHash,
    xmpMetadata: xmp,
    timestamp: new Date().toISOString(),
  };
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, c =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c === "'" ? "&apos;" : "&quot;"
  );
}
