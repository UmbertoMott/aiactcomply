// src/app/api/compliance/export-pdf/route.ts
// Genera PDF del dossier usando pdf-lib (già installato).
// Produce un documento A4 con footer SHA-256 verificabile.
// Per documenti multi-pagina complessi considerare in futuro puppeteer-core + @sparticuz/chromium.

import { NextRequest, NextResponse } from "next/server"
import { PDFDocument, rgb, StandardFonts } from "pdf-lib"
import crypto from "crypto"

const PAGE_WIDTH  = 595.28  // A4 points
const PAGE_HEIGHT = 841.89
const MARGIN      = 56
const LINE_HEIGHT = 16
const FONT_SIZE   = 10
const H1_SIZE     = 18
const H2_SIZE     = 13

interface ExportSection {
  title: string
  article?: string
  content: string
  status?: "complete" | "partial" | "empty"
}

interface ExportRequest {
  systemName: string
  systemId?: string
  classifierHash?: string
  sections: ExportSection[]
}

function truncate(text: string, maxLen = 80): string {
  if (!text) return ""
  return text.length > maxLen ? text.slice(0, maxLen - 1) + "…" : text
}

function sanitize(text: string): string {
  // Rimuovi caratteri non supportati da StandardFonts
  return (text ?? "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/–/g, "-")
    .replace(/—/g, "--")
    .replace(/[^\x00-\xFF]/g, "?")
}

export async function POST(req: NextRequest) {
  let body: ExportRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { systemName = "Sistema AI", systemId, classifierHash, sections = [] } = body

  // ── SHA-256 del contenuto ───────────────────────────────────────────────────
  const contentForHash = sections.map(s => `${s.title}:${s.content}`).join("|")
  const contentHash = crypto
    .createHash("sha256")
    .update(contentForHash + systemId + new Date().toISOString().slice(0, 10))
    .digest("hex")

  // ── Crea documento PDF ──────────────────────────────────────────────────────
  const pdfDoc  = await PDFDocument.create()
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold= await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontMono= await pdfDoc.embedFont(StandardFonts.Courier)

  const today = new Date().toLocaleDateString("it-IT", {
    year: "numeric", month: "long", day: "numeric"
  })

  let page    = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let y       = PAGE_HEIGHT - MARGIN

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function newPage() {
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    y    = PAGE_HEIGHT - MARGIN
    drawFooter()
  }

  function ensureSpace(needed: number) {
    if (y - needed < MARGIN + 60) newPage()
  }

  function drawText(
    text: string,
    options: {
      size?: number
      font?: typeof fontReg
      color?: ReturnType<typeof rgb>
      x?: number
      indent?: number
    } = {}
  ) {
    const {
      size = FONT_SIZE,
      font = fontReg,
      color = rgb(0.067, 0.063, 0.086),
      x,
      indent = 0,
    } = options

    const drawX = x ?? MARGIN + indent
    const maxW  = PAGE_WIDTH - MARGIN - drawX

    // Word-wrap
    const words     = sanitize(text).split(" ")
    let   line      = ""
    const lines: string[] = []

    for (const word of words) {
      const test = line ? `${line} ${word}` : word
      const w    = font.widthOfTextAtSize(test, size)
      if (w > maxW && line) {
        lines.push(line)
        line = word
      } else {
        line = test
      }
    }
    if (line) lines.push(line)

    for (const l of lines) {
      ensureSpace(size + 4)
      page.drawText(l, { x: drawX, y, size, font, color })
      y -= size + 4
    }
  }

  function drawHRule(color = rgb(0, 0, 0), opacity = 0.08) {
    ensureSpace(8)
    page.drawLine({
      start: { x: MARGIN, y },
      end:   { x: PAGE_WIDTH - MARGIN, y },
      thickness: 0.5,
      color,
      opacity,
    })
    y -= 8
  }

  function drawFooter() {
    const footerY = 30
    page.drawLine({
      start: { x: MARGIN, y: footerY + 14 },
      end:   { x: PAGE_WIDTH - MARGIN, y: footerY + 14 },
      thickness: 0.5, color: rgb(0, 0, 0), opacity: 0.1,
    })
    page.drawText(
      sanitize(`AIComply · ${sanitize(systemName)} · Reg. UE 2024/1689`),
      { x: MARGIN, y: footerY, size: 7, font: fontReg, color: rgb(0.6, 0.6, 0.6) }
    )
    const pageNum = String(pdfDoc.getPageCount())
    page.drawText(pageNum,
      { x: PAGE_WIDTH - MARGIN - 20, y: footerY, size: 7, font: fontReg, color: rgb(0.6, 0.6, 0.6) }
    )
  }

  // ── COPERTINA ───────────────────────────────────────────────────────────────
  drawFooter()

  // Barra colorata in alto
  page.drawRectangle({
    x: 0, y: PAGE_HEIGHT - 6,
    width: PAGE_WIDTH, height: 6,
    color: rgb(0.145, 0.063, 0.086),
  })

  y = PAGE_HEIGHT - MARGIN - 10

  drawText(sanitize(systemName), { size: H1_SIZE, font: fontBold })
  y -= 6
  drawText("Technical File — EU AI Act (Reg. UE 2024/1689)", {
    size: 12, font: fontReg, color: rgb(0.42, 0.42, 0.42)
  })
  y -= 4
  drawText(`Generato da AIComply · ${today}`, {
    size: 9, font: fontReg, color: rgb(0.6, 0.6, 0.6)
  })
  y -= 16
  drawHRule()

  // Sommario
  drawText("Indice sezioni", { size: 11, font: fontBold })
  y -= 4
  for (const s of sections) {
    const statusDot = s.status === "complete" ? "✓" : s.status === "partial" ? "~" : "○"
    drawText(`${statusDot}  ${sanitize(s.title)}${s.article ? `  (${s.article})` : ""}`,
      { size: 9, indent: 10 })
  }

  y -= 20

  // ── SEZIONI ─────────────────────────────────────────────────────────────────
  for (const section of sections) {
    ensureSpace(60)
    drawHRule()
    drawText(sanitize(section.title), { size: H2_SIZE, font: fontBold })
    if (section.article) {
      drawText(sanitize(section.article), {
        size: 9, color: rgb(0.42, 0.42, 0.42)
      })
    }
    y -= 6
    if (section.content) {
      drawText(sanitize(section.content), { indent: 4 })
    } else {
      drawText("[Sezione non completata]", {
        size: FONT_SIZE, color: rgb(0.7, 0.7, 0.7), indent: 4
      })
    }
    y -= 12
  }

  // ── FOOTER VERIFICABILE ─────────────────────────────────────────────────────
  ensureSpace(100)
  y -= 10
  drawHRule(rgb(0, 0, 0), 0.15)
  drawText("Documento Verificabile di Conformità — AIComply", { size: 10, font: fontBold })
  y -= 4
  drawText(`SHA-256: ${contentHash}`, { size: 8, font: fontMono, color: rgb(0.22, 0.22, 0.22) })
  if (classifierHash) {
    drawText(`Classifier Hash: ${classifierHash}`, {
      size: 8, font: fontMono, color: rgb(0.22, 0.22, 0.22)
    })
  }
  y -= 4
  drawText(
    sanitize(
      `ID sistema: ${systemId ?? "N/A"} · Generato: ${new Date().toISOString()} · ` +
      `I tag [verify against current AI Act text] indicano campi che richiedono verifica legale professionale.`
    ),
    { size: 7, color: rgb(0.6, 0.6, 0.6) }
  )

  // Watermark DRAFT in alto a destra
  const firstPage = pdfDoc.getPage(0)
  firstPage.drawText("AICOMPLY · DRAFT", {
    x: PAGE_WIDTH - 170, y: PAGE_HEIGHT - 30,
    size: 8, font: fontReg, color: rgb(0, 0, 0),
    opacity: 0.1,
  })

  // ── Serializza ──────────────────────────────────────────────────────────────
  const pdfBytes = await pdfDoc.save()
  const filename  = `AIComply_${systemName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Document-Hash": contentHash,
    },
  })
}
