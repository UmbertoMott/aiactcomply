// API route: genera il PDF della DPIA guidata on-demand.
// POST /api/dpia-guided/export-pdf
// Stile visivo allineato a compliance/export-pdf (Risk Register).

import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { DPIA_SUBPOINTS, DPIA_TEMPLATE_META } from "@/lib/dpia/dpia-template";
import type { DpiaGuidedDoc } from "@/lib/dpia/dpia-guided-types";

const PAGE_W  = 595.28;
const PAGE_H  = 841.89;
const MRG     = 56;
const LINE    = 15;
const FONT_S  = 10;
const H1_SIZE = 18;
const H2_SIZE = 13;

const GREEN = rgb(0.137, 0.251, 0.227); // #23403a brand
const DARK  = rgb(0.067, 0.063, 0.086);
const MUTED = rgb(0.42, 0.42, 0.42);
const FAINT = rgb(0.65, 0.65, 0.65);
const AMBER = rgb(0.706, 0.322, 0.035);

function doneVal(doc: DpiaGuidedDoc, id: string): string {
  const a = doc.answers[id];
  return (a?.status === "done" && a.aiConfirmed) ? a.value : "";
}

function sanitize(t: string): string {
  return (t ?? "")
    .replace(/['']/g, "'").replace(/[""]/g, '"')
    .replace(/–/g, "-").replace(/—/g, "--")
    .replace(/[^\x00-\xFF]/g, "?");
}

export async function POST(req: NextRequest) {
  let body: { doc: DpiaGuidedDoc };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body JSON non valido" }, { status: 400 }); }

  const doc   = body.doc as DpiaGuidedDoc;
  const today = new Date().toLocaleDateString("it-IT", { year: "numeric", month: "long", day: "numeric" });

  const pdfDoc = await PDFDocument.create();
  const fReg   = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fBold  = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fMono  = await pdfDoc.embedFont(StandardFonts.Courier);

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y    = PAGE_H - MRG;
  const maxW = PAGE_W - MRG * 2;

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function newPage() {
    page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    y    = PAGE_H - MRG;
    drawFooter();
  }

  function ensureY(needed: number) {
    if (y - needed < MRG + 50) newPage();
  }

  function drawFooter() {
    const fy = 30;
    page.drawLine({ start: { x: MRG, y: fy + 14 }, end: { x: PAGE_W - MRG, y: fy + 14 }, thickness: 0.5, color: rgb(0,0,0), opacity: 0.1 });
    page.drawText(sanitize(`AIComply · DPIA Art. 35 GDPR · ${DPIA_TEMPLATE_META.methodology}`),
      { x: MRG, y: fy, size: 7, font: fReg, color: FAINT });
    page.drawText(String(pdfDoc.getPageCount()),
      { x: PAGE_W - MRG - 10, y: fy, size: 7, font: fReg, color: FAINT });
  }

  function drawText(
    t: string,
    opts: { size?: number; font?: typeof fReg; color?: ReturnType<typeof rgb>; indent?: number } = {}
  ) {
    const { size = FONT_S, font = fReg, color = DARK, indent = 0 } = opts;
    const drawX = MRG + indent;
    const words = sanitize(t).split(" ");
    let line = "";
    const lines: string[] = [];
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(test, size) > maxW - indent && line) {
        lines.push(line); line = w;
      } else line = test;
    }
    if (line) lines.push(line);
    for (const l of lines) {
      ensureY(size + 4);
      page.drawText(l, { x: drawX, y, size, font, color });
      y -= size + 4;
    }
  }

  function drawHRule() {
    ensureY(8);
    page.drawLine({ start: { x: MRG, y }, end: { x: PAGE_W - MRG, y }, thickness: 0.5, color: rgb(0,0,0), opacity: 0.1 });
    y -= 8;
  }

  function sectionHeader(title: string, legalRef: string) {
    ensureY(36);
    drawHRule();
    drawText(title, { size: H2_SIZE, font: fBold, color: GREEN });
    drawText(legalRef, { size: 9, color: MUTED });
    y -= 4;
  }

  function field(label: string, value: string) {
    const val = value || "— da compilare —";
    const isEmpty = !value;
    ensureY(LINE + 4);
    drawText(label.toUpperCase(), { size: 7, font: fBold, color: MUTED });
    const lines = sanitize(val).split(/\n/);
    for (const ln of lines) {
      drawText(ln || " ", { size: FONT_S, indent: 4, color: isEmpty ? FAINT : DARK });
    }
    y -= 4;
  }

  function spacer(h = 8) { y -= h; }

  // ── COPERTINA ──────────────────────────────────────────────────────────────
  drawFooter();

  // Sottile barra brand in cima
  page.drawRectangle({ x: 0, y: PAGE_H - 6, width: PAGE_W, height: 6, color: GREEN });

  y = PAGE_H - MRG - 10;
  const sysName = doneVal(doc, "a_system_name");
  drawText(sysName || "Sistema AI", { size: H1_SIZE, font: fBold });
  y -= 4;
  drawText(DPIA_TEMPLATE_META.title, { size: 12, font: fBold, color: GREEN });
  drawText(`${DPIA_TEMPLATE_META.legalBasis} · ${DPIA_TEMPLATE_META.methodology}`, { size: 9, color: MUTED });
  drawText(`Generato da AIComply · ${today}`, { size: 9, color: FAINT });
  y -= 12;
  drawHRule();

  // Disclaimer
  drawText(sanitize(DPIA_TEMPLATE_META.disclaimer), { size: 8, color: MUTED });
  y -= 16;

  // ── SCREENING ──────────────────────────────────────────────────────────────
  sectionHeader("Screening — 9 criteri WP248", "GDPR Art. 35(1) + WP248");
  const criterionIds = ["sc_c1","sc_c2","sc_c3","sc_c4","sc_c5","sc_c6","sc_c7","sc_c8","sc_c9"];
  for (let i = 0; i < criterionIds.length; i++) {
    const val = doneVal(doc, criterionIds[i]);
    const applies = !val ? "—" : (val.toLowerCase().startsWith("sì") || val.toLowerCase().startsWith("si")) ? "Sì" : val.toLowerCase().startsWith("no") ? "No" : "Parzialmente";
    const appColor = applies === "Sì" ? AMBER : applies === "No" ? GREEN : MUTED;
    ensureY(LINE + 2);
    page.drawText(`${i + 1}.`, { x: MRG, y, size: FONT_S, font: fBold, color: MUTED });
    const label = DPIA_SUBPOINTS.find(sp => sp.id === criterionIds[i])?.label ?? "";
    page.drawText(sanitize(label), { x: MRG + 16, y, size: FONT_S, font: fReg, color: DARK });
    page.drawText(`[${applies}]`, { x: PAGE_W - MRG - 52, y, size: FONT_S, font: fBold, color: appColor });
    y -= LINE + 2;
    if (val) drawText(`   ${val.length > 100 ? val.slice(0, 97) + "…" : val}`, { size: 8, color: MUTED, indent: 12 });
  }
  spacer();

  // ── SEZIONE A ──────────────────────────────────────────────────────────────
  sectionHeader("A — Descrizione sistematica del trattamento", "GDPR Art. 35(7)(a)");
  field("Sistema / Titolare",           doneVal(doc, "a_system_name"));
  field("Organizzazione",               doneVal(doc, "a_organization"));
  field("DPO",                          doneVal(doc, "a_dpo"));
  field("Responsabili (Art. 28)",       doneVal(doc, "a_processor"));
  field("Finalità del trattamento",     doneVal(doc, "a_processing_purposes"));
  field("Categorie dati personali",     doneVal(doc, "a_personal_data_categories"));
  field("Categorie particolari (Art. 9)", doneVal(doc, "a_special_categories"));
  field("Categorie interessati",        doneVal(doc, "a_data_subjects_categories"));
  field("Destinatari",                  doneVal(doc, "a_recipients"));
  field("Periodo conservazione",        doneVal(doc, "a_retention_period"));
  field("Archivi e sistemi",            doneVal(doc, "a_assets"));
  spacer();

  // ── SEZIONE B ──────────────────────────────────────────────────────────────
  sectionHeader("B — Necessità e proporzionalità", "GDPR Art. 35(7)(b)");
  field("Giustificazione di necessità",       doneVal(doc, "b_necessity"));
  field("Base giuridica",                     doneVal(doc, "b_lawful_basis"));
  field("Minimizzazione dei dati",            doneVal(doc, "b_data_minimisation"));
  field("Limitazione conservazione",          doneVal(doc, "b_storage_limitation"));
  field("Diritti degli interessati (Artt. 12–22)", doneVal(doc, "b_data_subject_rights"));
  field("Proporzionalità",                    doneVal(doc, "b_proportionality"));
  field("Clausole responsabili (Art. 28)",    doneVal(doc, "b_processor_clauses"));
  field("Trasferimenti extra-UE",             doneVal(doc, "b_international_transfers"));
  spacer();

  // ── SEZIONE C ──────────────────────────────────────────────────────────────
  sectionHeader("C — Valutazione dei rischi", "GDPR Art. 35(7)(c)");
  field("Accesso illegittimo ai dati",        doneVal(doc, "c_threat_access"));
  field("Modifica indesiderata dei dati",     doneVal(doc, "c_threat_modification"));
  field("Scomparsa / perdita dei dati",       doneVal(doc, "c_threat_disappearance"));
  field("Misure tecniche",                    doneVal(doc, "c_technical_measures"));
  field("Misure organizzative",               doneVal(doc, "c_organizational_measures"));
  field("Rischio complessivo ante-misure",    doneVal(doc, "c_overall_risk_before"));
  spacer();

  // ── SEZIONE D ──────────────────────────────────────────────────────────────
  sectionHeader("D — Parti interessate e misure residue", "WP248 Allegato 2 §D / GDPR Art. 36");
  field("Parere del DPO",                     doneVal(doc, "d_dpo_opinion"));
  field("Opinioni degli interessati",         doneVal(doc, "d_data_subjects_opinions"));
  field("Rischio residuo post-misure",        doneVal(doc, "d_overall_risk_after"));
  field("Consultazione preventiva (Art. 36)", doneVal(doc, "d_prior_consultation"));
  field("Pianificazione riesame",             doneVal(doc, "d_review_schedule"));
  spacer();

  // ── FIRMA / CONCLUSIONE ────────────────────────────────────────────────────
  sectionHeader("Firma e conclusione", "GDPR Art. 35 / Art. 36");
  field("Decisione di conformità",            doneVal(doc, "e_compliant"));
  field("Condizioni / misure aggiuntive",     doneVal(doc, "e_conditions"));
  field("Sintesi esecutiva",                  doneVal(doc, "e_summary"));
  field("Prossimo riesame",                   doneVal(doc, "e_next_review_date"));
  spacer(14);

  // Righe firma
  ensureY(60);
  page.drawLine({ start: { x: MRG, y: y - 20 }, end: { x: MRG + 140, y: y - 20 }, thickness: 0.5, color: MUTED });
  page.drawText("Firma Titolare / Data", { x: MRG, y: y - 30, size: 7, font: fReg, color: MUTED });
  page.drawLine({ start: { x: MRG + 200, y: y - 20 }, end: { x: MRG + 340, y: y - 20 }, thickness: 0.5, color: MUTED });
  page.drawText("Firma DPO / Data", { x: MRG + 200, y: y - 30, size: 7, font: fReg, color: MUTED });
  y -= 50;

  // Hash documento
  ensureY(40);
  const contentHash = [...new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(doc.answers)))
  )].map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 48);
  drawHRule();
  drawText(`SHA-256: ${contentHash}…`, { size: 7.5, font: fMono, color: FAINT });

  // Watermark
  pdfDoc.getPage(0).drawText("AICOMPLY · DRAFT", {
    x: PAGE_W - 170, y: PAGE_H - 30, size: 8, font: fReg, color: rgb(0,0,0), opacity: 0.08,
  });

  const pdfBytes = await pdfDoc.save();
  const name = (doneVal(doc, "a_system_name") || "dpia").replace(/[^a-zA-Z0-9\-]/g, "_").slice(0, 40);
  const filename = `DPIA_${name}_${new Date().toISOString().slice(0, 10)}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
