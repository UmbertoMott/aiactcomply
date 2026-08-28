// Component 4 — Export Footer
// Returns the footer text for Word (.docx) and PDF exports.
// Non-removable: injected by the export helpers, not exposed to user.
// SSR-safe (no localStorage access — values passed as props).

import { getAIModelName, getSystemVersion, getPlatformName } from "@/lib/disclosure/ai-config";

export interface ExportFooterData {
  outputId: string;
  companyName?: string;
  systemName?: string;
  generatedAt?: string;  // ISO string or pre-formatted
  lang?: "it" | "en";
}

/** Returns the footer as a plain string (for docx/pdf insertion) */
export function buildExportFooterText({
  outputId,
  companyName = "—",
  systemName = "—",
  generatedAt,
  lang = "it",
}: ExportFooterData): string {
  const model = getAIModelName();
  const version = getSystemVersion();
  const platform = getPlatformName();
  const dt = generatedAt
    ? new Date(generatedAt).toLocaleString(lang === "it" ? "it-IT" : "en-GB")
    : new Date().toLocaleString(lang === "it" ? "it-IT" : "en-GB");
  const sep = "─".repeat(64);

  if (lang === "en") {
    return [
      sep,
      `AI-ASSISTED DOCUMENT — INTERNAL WORKING DRAFT`,
      `Platform: ${platform} v${version} | Output ID: ${outputId}`,
      `AI Model: ${model} | Generated: ${dt}`,
      `Operator: ${companyName} | AI System: ${systemName}`,
      ``,
      `⚠ LEGAL NOTICE: This document is an internal working draft produced with the`,
      `support of an artificial intelligence system, pursuant to Art. 50 of Regulation`,
      `(EU) 2024/1689 (AI Act). It does not constitute a final deliverable or legal`,
      `advice. The opinion and the final compliance documents are a professional`,
      `service rendered by the Lawyer within an engagement.`,
      ``,
      `Audit Trail Reference: ${outputId} | ${platform} Platform © 2024-2026`,
      sep,
    ].join("\n");
  }

  return [
    sep,
    `DOCUMENTO ASSISTITO DA IA — BOZZA INTERNA DI LAVORAZIONE`,
    `Piattaforma: ${platform} v${version} | ID Output: ${outputId}`,
    `Modello AI: ${model} | Generato il: ${dt}`,
    `Operatore: ${companyName} | Sistema AI: ${systemName}`,
    ``,
    `⚠ AVVERTENZA LEGALE: Il presente documento è una bozza interna di lavorazione,`,
    `elaborata con il supporto di un sistema di intelligenza artificiale ai sensi`,
    `dell'Art. 50 del Regolamento UE 2024/1689 (AI Act). Non costituisce deliverable`,
    `finale né parere legale. Il parere e i documenti di conformità definitivi`,
    `costituiscono prestazione professionale resa dall'Avvocato nell'ambito di un incarico.`,
    ``,
    `Audit Trail Reference: ${outputId} | ${platform} Platform © 2024-2026`,
    sep,
  ].join("\n");
}

/** React component — renders footer visually in UI previews */
export default function ExportFooter({ outputId, companyName, systemName, generatedAt, lang = "it" }: ExportFooterData) {
  const text = buildExportFooterText({ outputId, companyName, systemName, generatedAt, lang });

  return (
    <div
      className="mt-8 pt-4 text-[9px] leading-relaxed font-mono"
      style={{
        borderTop: "2px solid #0C447C",
        color: "rgba(0,0,0,0.55)",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {text}
    </div>
  );
}
