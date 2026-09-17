// API route: genera il PDF della DPIA guidata on-demand.
// POST /api/dpia-guided/export-pdf
// Stile visivo allineato a compliance/export-pdf (Risk Register).

import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { getDpiaSubpoints, getDpiaGuidedSections, getDpiaTemplateMeta } from "@/lib/dpia/dpia-template";
import { translate } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
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
  let body: { doc: DpiaGuidedDoc; locale?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const doc    = body.doc as DpiaGuidedDoc;
  const locale = (body.locale === "en" ? "en" : "it") as Locale;
  const tG = (k: string) => translate(locale, "dpiaGuided", k);
  const tD = (k: string) => translate(locale, "toolDpia", k);
  const SUBS = getDpiaSubpoints(locale, tG);
  const SECS = getDpiaGuidedSections(locale, tG);
  const META = getDpiaTemplateMeta(locale, tD);
  const lbl = (id: string) => SUBS.find(sp => sp.id === id)?.label ?? id;
  const secOf = (key: string) => SECS.find(s => s.key === key);
  const today = new Date().toLocaleDateString(locale === "en" ? "en-GB" : "it-IT", { year: "numeric", month: "long", day: "numeric" });

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
    page.drawText(sanitize(`AIComply · DPIA Art. 35 GDPR · ${META.methodology}`),
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
    const val = value || tD("pdf_toFill");
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
  drawText(sysName || tD("pdf_coverFallback"), { size: H1_SIZE, font: fBold });
  y -= 4;
  drawText(META.title, { size: 12, font: fBold, color: GREEN });
  drawText(`${META.legalBasis} · ${META.methodology}`, { size: 9, color: MUTED });
  drawText(`${tD("pdf_generatedBy")} · ${today}`, { size: 9, color: FAINT });
  y -= 12;
  drawHRule();

  // Disclaimer
  drawText(sanitize(META.disclaimer), { size: 8, color: MUTED });
  y -= 16;

  // ── SCREENING ──────────────────────────────────────────────────────────────
  sectionHeader(secOf("screening")?.label ?? "Screening", secOf("screening")?.legalRef ?? "GDPR Art. 35(1) + WP248");
  const criterionIds = ["sc_c1","sc_c2","sc_c3","sc_c4","sc_c5","sc_c6","sc_c7","sc_c8","sc_c9"];
  for (let i = 0; i < criterionIds.length; i++) {
    const val = doneVal(doc, criterionIds[i]);
    const appliesKey = !val ? "" : (val.toLowerCase().startsWith("sì") || val.toLowerCase().startsWith("si") || val.toLowerCase().startsWith("yes")) ? "yes" : val.toLowerCase().startsWith("no") ? "no" : "partial";
    const applies = !appliesKey ? "—" : appliesKey === "yes" ? tD("yes") : appliesKey === "no" ? tD("no") : tD("partial");
    const appColor = appliesKey === "yes" ? AMBER : appliesKey === "no" ? GREEN : MUTED;
    ensureY(LINE + 2);
    page.drawText(`${i + 1}.`, { x: MRG, y, size: FONT_S, font: fBold, color: MUTED });
    const label = lbl(criterionIds[i]);
    page.drawText(sanitize(label), { x: MRG + 16, y, size: FONT_S, font: fReg, color: DARK });
    page.drawText(`[${applies}]`, { x: PAGE_W - MRG - 52, y, size: FONT_S, font: fBold, color: appColor });
    y -= LINE + 2;
    if (val) drawText(`   ${val.length > 100 ? val.slice(0, 97) + "…" : val}`, { size: 8, color: MUTED, indent: 12 });
  }
  spacer();

  // ── SEZIONE A ──────────────────────────────────────────────────────────────
  { const sec = secOf("descr"); sectionHeader(sec?.label ?? "A", sec?.legalRef ?? "GDPR Art. 35(7)(a)"); }
  field(lbl("a_system_name"),              doneVal(doc, "a_system_name"));
  field(lbl("a_organization"),             doneVal(doc, "a_organization"));
  field("DPO",                             doneVal(doc, "a_dpo"));
  field(lbl("a_processor"),                doneVal(doc, "a_processor"));
  field(lbl("a_processing_purposes"),      doneVal(doc, "a_processing_purposes"));
  field(lbl("a_personal_data_categories"), doneVal(doc, "a_personal_data_categories"));
  field(lbl("a_special_categories"),       doneVal(doc, "a_special_categories"));
  field(lbl("a_data_subjects_categories"), doneVal(doc, "a_data_subjects_categories"));
  field(lbl("a_recipients"),               doneVal(doc, "a_recipients"));
  field(lbl("a_retention_period"),         doneVal(doc, "a_retention_period"));
  field(lbl("a_assets"),                   doneVal(doc, "a_assets"));
  spacer();

  // ── SEZIONE B ──────────────────────────────────────────────────────────────
  { const sec = secOf("necessity"); sectionHeader(sec?.label ?? "B", sec?.legalRef ?? "GDPR Art. 35(7)(b)"); }
  field(lbl("b_necessity"),            doneVal(doc, "b_necessity"));
  field(lbl("b_lawful_basis"),         doneVal(doc, "b_lawful_basis"));
  field(lbl("b_data_minimisation"),    doneVal(doc, "b_data_minimisation"));
  field(lbl("b_storage_limitation"),   doneVal(doc, "b_storage_limitation"));
  field(lbl("b_data_subject_rights"),  doneVal(doc, "b_data_subject_rights"));
  field(lbl("b_proportionality"),      doneVal(doc, "b_proportionality"));
  field(lbl("b_processor_clauses"),    doneVal(doc, "b_processor_clauses"));
  field(lbl("b_international_transfers"), doneVal(doc, "b_international_transfers"));
  spacer();

  // ── SEZIONE C ──────────────────────────────────────────────────────────────
  { const sec = secOf("risks"); sectionHeader(sec?.label ?? "C", sec?.legalRef ?? "GDPR Art. 35(7)(c)"); }
  field(lbl("c_threat_access"),           doneVal(doc, "c_threat_access"));
  field(lbl("c_threat_modification"),     doneVal(doc, "c_threat_modification"));
  field(lbl("c_threat_disappearance"),    doneVal(doc, "c_threat_disappearance"));
  field(lbl("c_technical_measures"),      doneVal(doc, "c_technical_measures"));
  field(lbl("c_organizational_measures"), doneVal(doc, "c_organizational_measures"));
  field(lbl("c_overall_risk_before"),     doneVal(doc, "c_overall_risk_before"));
  spacer();

  // ── SEZIONE D ──────────────────────────────────────────────────────────────
  { const sec = secOf("parties"); sectionHeader(sec?.label ?? "D", sec?.legalRef ?? "WP248 Allegato 2 §D / GDPR Art. 36"); }
  field(lbl("d_dpo_opinion"),            doneVal(doc, "d_dpo_opinion"));
  field(lbl("d_data_subjects_opinions"), doneVal(doc, "d_data_subjects_opinions"));
  field(lbl("d_overall_risk_after"),     doneVal(doc, "d_overall_risk_after"));
  field(lbl("d_prior_consultation"),     doneVal(doc, "d_prior_consultation"));
  field(lbl("d_review_schedule"),        doneVal(doc, "d_review_schedule"));
  spacer();

  // ── FIRMA / CONCLUSIONE ────────────────────────────────────────────────────
  { const sec = secOf("signoff"); sectionHeader(sec?.label ?? "Firma", sec?.legalRef ?? "GDPR Art. 35 / Art. 36"); }
  field(lbl("e_compliant"),         doneVal(doc, "e_compliant"));
  field(lbl("e_conditions"),        doneVal(doc, "e_conditions"));
  field(lbl("e_summary"),           doneVal(doc, "e_summary"));
  field(lbl("e_next_review_date"),  doneVal(doc, "e_next_review_date"));
  spacer(14);

  // Righe firma
  ensureY(60);
  page.drawLine({ start: { x: MRG, y: y - 20 }, end: { x: MRG + 140, y: y - 20 }, thickness: 0.5, color: MUTED });
  page.drawText(sanitize(tD("pdf_signController")), { x: MRG, y: y - 30, size: 7, font: fReg, color: MUTED });
  page.drawLine({ start: { x: MRG + 200, y: y - 20 }, end: { x: MRG + 340, y: y - 20 }, thickness: 0.5, color: MUTED });
  page.drawText(sanitize(tD("pdf_signDpo")), { x: MRG + 200, y: y - 30, size: 7, font: fReg, color: MUTED });
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
