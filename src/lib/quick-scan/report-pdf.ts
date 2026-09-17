import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { QuickScanGap, QuickScanResult } from "@/lib/quick-scan/quick-scan";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 52;
const TEXT = rgb(0.051, 0.063, 0.086);
const MUTED = rgb(0.38, 0.40, 0.44);
const BORDER = rgb(0.88, 0.89, 0.9);

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) lines.push(current);
  return lines;
}

function severityLabel(gap: QuickScanGap): string {
  if (gap.severity === "critical") return "Area critica";
  if (gap.severity === "high") return "Alta priorita";
  return "Da approfondire";
}

export async function buildQuickScanPdf(params: {
  company: string;
  name: string;
  role?: string;
  result: QuickScanResult;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);

  let y = PAGE_HEIGHT - MARGIN;

  page.drawText("RegulaeOS", { x: MARGIN, y, size: 12, font: bold, color: TEXT });
  page.drawText("AI Act Quick Scan", { x: MARGIN, y: y - 18, size: 10, font: regular, color: MUTED });

  y -= 78;
  page.drawText(`AI Act Quick Scan - ${params.company}`, {
    x: MARGIN,
    y,
    size: 26,
    font: serif,
    color: TEXT,
  });

  y -= 30;
  page.drawText(`Report preliminare per ${params.name}${params.role ? ` - ${params.role}` : ""}`, {
    x: MARGIN,
    y,
    size: 11,
    font: regular,
    color: MUTED,
  });

  y -= 54;
  page.drawRectangle({
    x: MARGIN,
    y: y - 64,
    width: PAGE_WIDTH - MARGIN * 2,
    height: 92,
    borderColor: TEXT,
    borderWidth: 1,
    color: rgb(0.98, 0.98, 0.98),
  });
  page.drawText("Preliminary readiness", { x: MARGIN + 22, y: y, size: 10, font: regular, color: MUTED });
  page.drawText(`${params.result.score}/100`, { x: MARGIN + 22, y: y - 38, size: 34, font: bold, color: TEXT });
  page.drawText(`${params.result.potentialGaps} potential gaps`, { x: 342, y: y - 8, size: 13, font: bold, color: TEXT });
  page.drawText(`${params.result.documentGaps} document gaps`, { x: 342, y: y - 30, size: 11, font: regular, color: MUTED });
  page.drawText(`${params.result.criticalAreas} critical / ${params.result.highPriorityAreas} high priority`, {
    x: 342,
    y: y - 50,
    size: 11,
    font: regular,
    color: MUTED,
  });

  y -= 120;
  page.drawText("Principali gap individuati", { x: MARGIN, y, size: 17, font: serif, color: TEXT });
  y -= 24;

  const gaps = params.result.topGaps.length > 0
    ? params.result.topGaps
    : [{
        area: "Readiness preliminare",
        label: "Nessun gap prioritario emerso",
        severity: "medium" as const,
        evidence: "Le risposte non evidenziano gap immediati nel perimetro del quick scan.",
        recommendation: "Confermare il risultato con un assessment documentale completo.",
        documentGap: false,
      }];

  gaps.forEach((gap, index) => {
    const boxHeight = 104;
    page.drawRectangle({
      x: MARGIN,
      y: y - boxHeight + 10,
      width: PAGE_WIDTH - MARGIN * 2,
      height: boxHeight,
      borderColor: BORDER,
      borderWidth: 1,
      color: rgb(1, 1, 1),
    });

    page.drawText(`${index + 1}. ${gap.area}`, { x: MARGIN + 18, y: y - 12, size: 12, font: bold, color: TEXT });
    page.drawText(severityLabel(gap), { x: 420, y: y - 12, size: 9, font: regular, color: MUTED });
    page.drawText(gap.label, { x: MARGIN + 18, y: y - 34, size: 11, font: bold, color: TEXT });

    wrapText(gap.evidence, 74).slice(0, 2).forEach((line, lineIndex) => {
      page.drawText(line, { x: MARGIN + 18, y: y - 54 - lineIndex * 14, size: 9.5, font: regular, color: MUTED });
    });
    wrapText(`Next step: ${gap.recommendation}`, 76).slice(0, 2).forEach((line, lineIndex) => {
      page.drawText(line, { x: MARGIN + 18, y: y - 82 - lineIndex * 14, size: 9.5, font: regular, color: TEXT });
    });

    y -= boxHeight + 14;
  });

  y -= 8;
  page.drawText("Prossimo step consigliato", { x: MARGIN, y, size: 17, font: serif, color: TEXT });
  y -= 22;
  wrapText(
    "Eseguire il Full AI Act Assessment per collegare ogni gap ai documenti da preparare, ai test da effettuare e alle responsabilita interne.",
    86
  ).forEach((line, lineIndex) => {
    page.drawText(line, { x: MARGIN, y: y - lineIndex * 15, size: 10.5, font: regular, color: MUTED });
  });

  page.drawText("https://www.regulaeos.com/quick-scan", {
    x: MARGIN,
    y: 46,
    size: 9,
    font: regular,
    color: MUTED,
  });
  page.drawText("Preliminary assessment - not legal advice or certification.", {
    x: MARGIN,
    y: 32,
    size: 8.5,
    font: regular,
    color: MUTED,
  });

  return pdf.save();
}
