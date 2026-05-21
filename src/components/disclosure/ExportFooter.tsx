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
      `DOCUMENT GENERATED WITH ARTIFICIAL INTELLIGENCE SUPPORT`,
      `Platform: ${platform} v${version} | Output ID: ${outputId}`,
      `AI Model: ${model} | Generated: ${dt}`,
      `Operator: ${companyName} | AI System: ${systemName}`,
      ``,
      `⚠ LEGAL NOTICE: This document was produced with the support of an artificial`,
      `intelligence system pursuant to Art. 50 of Regulation (EU) 2024/1689 (AI Act).`,
      `The content does not constitute professional legal advice and must be reviewed`,
      `by a qualified professional before any official use, regulatory filing, or`,
      `submission in legal proceedings. The operator using this document is responsible`,
      `for verifying its compliance with applicable regulatory requirements.`,
      ``,
      `Audit Trail Reference: ${outputId} | ${platform} Platform © 2024-2026`,
      sep,
    ].join("\n");
  }

  return [
    sep,
    `DOCUMENTO GENERATO CON SUPPORTO DI INTELLIGENZA ARTIFICIALE`,
    `Piattaforma: ${platform} v${version} | ID Output: ${outputId}`,
    `Modello AI: ${model} | Generato il: ${dt}`,
    `Operatore: ${companyName} | Sistema AI: ${systemName}`,
    ``,
    `⚠ AVVERTENZA LEGALE: Il presente documento è stato elaborato con il supporto`,
    `di un sistema di intelligenza artificiale ai sensi dell'Art. 50 del Regolamento`,
    `UE 2024/1689 (AI Act). Il contenuto non costituisce parere legale professionale`,
    `e deve essere sottoposto a revisione da parte di un professionista qualificato`,
    `prima di qualsiasi utilizzo ufficiale, deposito regolatorio o produzione in`,
    `giudizio. L'operatore che utilizza questo documento è responsabile della`,
    `verifica della sua conformità ai requisiti normativi applicabili.`,
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
