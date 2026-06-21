// API route: genera il PDF della DPIA guidata on-demand.
// POST /api/dpia-guided/export-pdf
// Body: { doc: DpiaGuidedDoc }
// Response: application/pdf

import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { DPIA_GUIDED_SECTIONS, DPIA_SUBPOINTS, DPIA_TEMPLATE_META } from "@/lib/dpia/dpia-template";
import type { DpiaGuidedDoc } from "@/lib/dpia/dpia-guided-types";

const PAGE_W = 595.28; // A4 pt
const PAGE_H = 841.89;
const MRG    = 48;
const LINE   = 14;
const FONT_S = 10;

function doneVal(doc: DpiaGuidedDoc, id: string): string {
  const a = doc.answers[id];
  return (a?.status === "done" && a.aiConfirmed) ? a.value : "";
}

function splitLines(text: string, maxChars: number): string[] {
  if (!text) return [];
  const out: string[] = [];
  const words = text.replace(/\n/g, " \n ").split(" ");
  let line = "";
  for (const w of words) {
    if (w === "\n") { out.push(line.trim()); line = ""; continue; }
    if ((line + w).length > maxChars) { out.push(line.trim()); line = w + " "; }
    else line += w + " ";
  }
  if (line.trim()) out.push(line.trim());
  return out;
}

export async function POST(req: NextRequest) {
  let body: { doc: DpiaGuidedDoc };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body JSON non valido" }, { status: 400 }); }

  const doc  = body.doc as DpiaGuidedDoc;
  const today = new Date().toLocaleDateString("it-IT", { year: "numeric", month: "long", day: "numeric" });

  const pdfDoc  = await PDFDocument.create();
  const fReg    = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fBold   = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fMono   = await pdfDoc.embedFont(StandardFonts.CourierBold);

  const GREEN = rgb(0.137, 0.251, 0.227);  // #23403a
  const DARK  = rgb(0.067, 0.063, 0.086);
  const MUTED = rgb(0.5, 0.5, 0.5);
  const AMBER = rgb(0.706, 0.322, 0.035);

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y    = PAGE_H - MRG;

  const maxW = PAGE_W - MRG * 2;
  const maxCharsBody  = Math.floor(maxW / 5.5);
  const maxCharsSmall = Math.floor(maxW / 4.8);

  function ensureY(needed: number) {
    if (y - needed < MRG + 30) {
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      y    = PAGE_H - MRG;
      drawPageNum();
    }
  }

  function drawPageNum() {
    const n = pdfDoc.getPageCount();
    page.drawText(`Pagina ${n}`, { x: PAGE_W - MRG - 40, y: MRG - 18, size: 7, font: fReg, color: MUTED });
    page.drawText(DPIA_TEMPLATE_META.methodology, { x: MRG, y: MRG - 18, size: 7, font: fReg, color: MUTED });
  }

  function text(t: string, size = FONT_S, font = fReg, color = DARK, indent = 0) {
    const lines = splitLines(t, size <= 8 ? maxCharsSmall : maxCharsBody);
    for (const ln of lines) {
      ensureY(size + 3);
      page.drawText(ln || " ", { x: MRG + indent, y, size, font, color });
      y -= (size + 4);
    }
  }

  function sectionBar(title: string, legalRef: string) {
    ensureY(22);
    page.drawRectangle({ x: MRG, y: y - 16, width: maxW, height: 20, color: GREEN });
    page.drawText(title, { x: MRG + 6, y: y - 10, size: 10, font: fBold, color: rgb(1,1,1) });
    page.drawText(legalRef, { x: PAGE_W - MRG - fReg.widthOfTextAtSize(legalRef, 7), y: y - 10, size: 7, font: fReg, color: rgb(0.8, 0.8, 0.8) });
    y -= 24;
  }

  function field(label: string, value: string, placeholder = "— da compilare —") {
    const val = value || placeholder;
    const isPlaceholder = !value;
    ensureY(LINE + 4);
    page.drawText(label.toUpperCase(), { x: MRG, y, size: 7, font: fBold, color: MUTED });
    y -= LINE;
    const lines = splitLines(val, maxCharsBody);
    for (const ln of lines) {
      ensureY(FONT_S + 3);
      page.drawText(ln || " ", { x: MRG + 6, y, size: FONT_S, font: isPlaceholder ? fReg : fReg, color: isPlaceholder ? MUTED : DARK });
      y -= LINE;
    }
    y -= 4;
  }

  function spacer(h = 8) { y -= h; }

  // ── COPERTINA ──────────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: PAGE_H - 120, width: PAGE_W, height: 120, color: GREEN });
  page.drawText(DPIA_TEMPLATE_META.title, { x: MRG, y: PAGE_H - 54, size: 16, font: fBold, color: rgb(1,1,1) });
  page.drawText(`${DPIA_TEMPLATE_META.legalBasis} · ${DPIA_TEMPLATE_META.methodology}`, { x: MRG, y: PAGE_H - 72, size: 9, font: fReg, color: rgb(0.7,0.8,0.75) });
  page.drawText(`Generato il ${today}`, { x: MRG, y: PAGE_H - 90, size: 8, font: fReg, color: rgb(0.6,0.7,0.65) });
  y = PAGE_H - 148;

  const systemName = doneVal(doc, "a_system_name");
  if (systemName) {
    page.drawText(`Sistema: ${systemName}`, { x: MRG, y, size: 12, font: fBold, color: DARK }); y -= 18;
  }
  spacer(16);
  page.drawText(DPIA_TEMPLATE_META.disclaimer, { x: MRG, y, size: 7, font: fReg, color: MUTED });
  y -= 30;

  // ── SCREENING ──────────────────────────────────────────────────────────────
  sectionBar("Screening — 9 criteri WP248", "GDPR Art. 35(1) + WP248");
  const criterionIds = ["sc_c1","sc_c2","sc_c3","sc_c4","sc_c5","sc_c6","sc_c7","sc_c8","sc_c9"];
  for (let i = 0; i < criterionIds.length; i++) {
    const val = doneVal(doc, criterionIds[i]);
    const applies = val ? (val.toLowerCase().startsWith("sì") || val.toLowerCase().startsWith("si") ? "Sì" : val.toLowerCase().startsWith("no") ? "No" : "Parzialmente") : "—";
    const appColor = applies === "Sì" ? AMBER : applies === "No" ? MUTED : AMBER;
    ensureY(LINE + 2);
    page.drawText(`${i + 1}.`, { x: MRG, y, size: FONT_S, font: fBold, color: MUTED });
    page.drawText(DPIA_SUBPOINTS.find(sp => sp.id === criterionIds[i])?.label ?? "", { x: MRG + 16, y, size: FONT_S, font: fReg, color: DARK });
    page.drawText(`[${applies}]`, { x: PAGE_W - MRG - 50, y, size: FONT_S, font: fBold, color: appColor });
    y -= LINE + 2;
    if (val) { text(`   ${val.length > 100 ? val.slice(0, 97) + "…" : val}`, 8, fReg, MUTED, 16); }
  }
  spacer();

  // ── SEZIONE A ──────────────────────────────────────────────────────────────
  sectionBar("A — Descrizione sistematica del trattamento", "GDPR Art. 35(7)(a)");
  field("Sistema / Titolare", doneVal(doc, "a_system_name"));
  field("Organizzazione",     doneVal(doc, "a_organization"));
  field("DPO",                doneVal(doc, "a_dpo"));
  field("Responsabili (Art. 28)", doneVal(doc, "a_processor"));
  field("Finalità del trattamento", doneVal(doc, "a_processing_purposes"));
  field("Categorie dati personali", doneVal(doc, "a_personal_data_categories"));
  field("Categorie particolari (Art. 9)", doneVal(doc, "a_special_categories"));
  field("Categorie interessati", doneVal(doc, "a_data_subjects_categories"));
  field("Destinatari", doneVal(doc, "a_recipients"));
  field("Periodo conservazione", doneVal(doc, "a_retention_period"));
  field("Archivi e sistemi", doneVal(doc, "a_assets"));
  spacer();

  // ── SEZIONE B ──────────────────────────────────────────────────────────────
  sectionBar("B — Necessità e proporzionalità", "GDPR Art. 35(7)(b)");
  field("Giustificazione di necessità", doneVal(doc, "b_necessity"));
  field("Base giuridica", doneVal(doc, "b_lawful_basis"));
  field("Minimizzazione dei dati", doneVal(doc, "b_data_minimisation"));
  field("Limitazione conservazione", doneVal(doc, "b_storage_limitation"));
  field("Diritti degli interessati (Artt. 12–22)", doneVal(doc, "b_data_subject_rights"));
  field("Proporzionalità", doneVal(doc, "b_proportionality"));
  field("Clausole responsabili (Art. 28)", doneVal(doc, "b_processor_clauses"));
  field("Trasferimenti extra-UE", doneVal(doc, "b_international_transfers"));
  spacer();

  // ── SEZIONE C ──────────────────────────────────────────────────────────────
  sectionBar("C — Valutazione dei rischi", "GDPR Art. 35(7)(c)");
  field("Accesso illegittimo ai dati",  doneVal(doc, "c_threat_access"));
  field("Modifica indesiderata dei dati", doneVal(doc, "c_threat_modification"));
  field("Scomparsa / perdita dei dati", doneVal(doc, "c_threat_disappearance"));
  field("Misure tecniche",              doneVal(doc, "c_technical_measures"));
  field("Misure organizzative",         doneVal(doc, "c_organizational_measures"));
  field("Rischio complessivo ante-misure", doneVal(doc, "c_overall_risk_before"));
  spacer();

  // ── SEZIONE D ──────────────────────────────────────────────────────────────
  sectionBar("D — Parti interessate e misure residue", "WP248 Allegato 2 §D / GDPR Art. 36");
  field("Parere del DPO",             doneVal(doc, "d_dpo_opinion"));
  field("Opinioni degli interessati", doneVal(doc, "d_data_subjects_opinions"));
  field("Rischio residuo post-misure", doneVal(doc, "d_overall_risk_after"));
  field("Consultazione preventiva (Art. 36)", doneVal(doc, "d_prior_consultation"));
  field("Pianificazione riesame",     doneVal(doc, "d_review_schedule"));
  spacer();

  // ── FIRMA / CONCLUSIONE ────────────────────────────────────────────────────
  sectionBar("Firma e conclusione", "GDPR Art. 35 / Art. 36");
  field("Decisione di conformità", doneVal(doc, "e_compliant"));
  field("Condizioni / misure aggiuntive", doneVal(doc, "e_conditions"));
  field("Sintesi esecutiva", doneVal(doc, "e_summary"));
  field("Prossimo riesame", doneVal(doc, "e_next_review_date"));
  spacer(16);

  // Signature area
  ensureY(60);
  page.drawLine({ start: { x: MRG, y: y - 20 }, end: { x: MRG + 140, y: y - 20 }, thickness: 0.5, color: MUTED });
  page.drawText("Firma Titolare / Data", { x: MRG, y: y - 30, size: 7, font: fReg, color: MUTED });
  page.drawLine({ start: { x: MRG + 200, y: y - 20 }, end: { x: MRG + 340, y: y - 20 }, thickness: 0.5, color: MUTED });
  page.drawText("Firma DPO / Data", { x: MRG + 200, y: y - 30, size: 7, font: fReg, color: MUTED });
  y -= 50;

  drawPageNum();

  const pdfBytes = await pdfDoc.save();

  const sysName = (doneVal(doc, "a_system_name") || "dpia").replace(/[^a-zA-Z0-9\-]/g, "_").slice(0, 40);
  const filename = `DPIA_${sysName}_${new Date().toISOString().slice(0, 10)}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
