// API route: genera il PDF della DPIA sul Template EDPB 2026 on-demand.
// POST /api/dpia-edpb/export-pdf  { doc: DpiaEdpbDoc, locale?: "it"|"en" }
// Stile visivo allineato alle altre export PDF del prodotto (pdf-lib).

import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { translate } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import type { DpiaEdpbDoc, EdpbMeasure, MeasureStatus, RiskLevel } from "@/lib/dpia/edpb-schema";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MRG = 56;
const FONT_S = 10;
const H1_SIZE = 18;
const H2_SIZE = 13;

const GREEN = rgb(0.137, 0.251, 0.227);
const DARK = rgb(0.067, 0.063, 0.086);
const MUTED = rgb(0.42, 0.42, 0.42);
const FAINT = rgb(0.65, 0.65, 0.65);

function sanitize(t: string): string {
  return (t ?? "")
    .replace(/['']/g, "'").replace(/[""]/g, '"')
    .replace(/–/g, "-").replace(/—/g, "--")
    .replace(/[^\x00-\xFF]/g, "?");
}

export async function POST(req: NextRequest) {
  let body: { doc: DpiaEdpbDoc; locale?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const doc = body.doc;
  if (!doc) return NextResponse.json({ error: "Missing doc" }, { status: 400 });
  const locale = (body.locale === "en" ? "en" : "it") as Locale;
  const t = (k: string) => translate(locale, "dpiaEdpb", k);
  const today = new Date().toLocaleDateString(locale === "en" ? "en-GB" : "it-IT", { year: "numeric", month: "long", day: "numeric" });

  const statusLabel = (s: MeasureStatus) => t(`status_${s}`);
  const levelLabel = (l: RiskLevel) => t(`level_${l}`);

  const pdfDoc = await PDFDocument.create();
  const fReg = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fMono = await pdfDoc.embedFont(StandardFonts.Courier);

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MRG;
  const maxW = PAGE_W - MRG * 2;

  function drawFooter() {
    const fy = 30;
    page.drawLine({ start: { x: MRG, y: fy + 14 }, end: { x: PAGE_W - MRG, y: fy + 14 }, thickness: 0.5, color: rgb(0, 0, 0), opacity: 0.1 });
    page.drawText(sanitize("AIComply - DPIA Art. 35 GDPR - EDPB Template 2026"), { x: MRG, y: fy, size: 7, font: fReg, color: FAINT });
    page.drawText(String(pdfDoc.getPageCount()), { x: PAGE_W - MRG - 10, y: fy, size: 7, font: fReg, color: FAINT });
  }
  function newPage() { page = pdfDoc.addPage([PAGE_W, PAGE_H]); y = PAGE_H - MRG; drawFooter(); }
  function ensureY(needed: number) { if (y - needed < MRG + 50) newPage(); }

  function drawText(txt: string, opts: { size?: number; font?: typeof fReg; color?: ReturnType<typeof rgb>; indent?: number } = {}) {
    const { size = FONT_S, font = fReg, color = DARK, indent = 0 } = opts;
    const drawX = MRG + indent;
    const words = sanitize(txt).split(" ");
    let line = "";
    const lines: string[] = [];
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(test, size) > maxW - indent && line) { lines.push(line); line = w; }
      else line = test;
    }
    if (line) lines.push(line);
    for (const l of lines) { ensureY(size + 4); page.drawText(l, { x: drawX, y, size, font, color }); y -= size + 4; }
  }

  function drawHRule() {
    ensureY(8);
    page.drawLine({ start: { x: MRG, y }, end: { x: PAGE_W - MRG, y }, thickness: 0.5, color: rgb(0, 0, 0), opacity: 0.1 });
    y -= 8;
  }
  function sectionHeader(title: string) {
    ensureY(34);
    y -= 6;
    drawHRule();
    drawText(title, { size: H2_SIZE, font: fBold, color: GREEN });
    y -= 2;
  }
  function subHeader(title: string) { ensureY(20); drawText(title, { size: 10.5, font: fBold, color: DARK }); y -= 1; }
  function spacer(h = 8) { y -= h; }

  function field(label: string, value: string) {
    const val = (value ?? "").trim();
    ensureY(18);
    drawText(label.toUpperCase(), { size: 7, font: fBold, color: MUTED });
    if (!val) { drawText(t("pdfToFill"), { size: FONT_S, indent: 4, color: FAINT }); }
    else for (const ln of sanitize(val).split(/\n/)) drawText(ln || " ", { size: FONT_S, indent: 4, color: DARK });
    y -= 4;
  }

  function measures(list: EdpbMeasure[]) {
    if (!list.length) { drawText(t("pdfToFill"), { size: FONT_S, indent: 4, color: FAINT }); y -= 4; return; }
    list.forEach((m, i) => {
      ensureY(16);
      drawText(`${i + 1}. [${statusLabel(m.status)}]`, { size: 8, font: fBold, color: GREEN, indent: 4 });
      drawText(m.description || t("pdfToFill"), { size: FONT_S, indent: 12, color: m.description ? DARK : FAINT });
      y -= 2;
    });
    y -= 4;
  }

  // ── COPERTINA ────────────────────────────────────────────────────────────────
  drawFooter();
  page.drawRectangle({ x: 0, y: PAGE_H - 6, width: PAGE_W, height: 6, color: GREEN });
  y = PAGE_H - MRG - 10;
  drawText(doc.processingName || t("pdfCoverFallback"), { size: H1_SIZE, font: fBold });
  y -= 4;
  drawText(t("pdfTitle"), { size: 12, font: fBold, color: GREEN });
  drawText(t("pdfSubtitle"), { size: 9, color: MUTED });
  drawText(`${t("pdfGeneratedBy")} - ${today}`, { size: 9, color: FAINT });
  y -= 12;
  drawHRule();
  drawText(t("pdfDisclaimer"), { size: 8, color: MUTED });
  y -= 14;

  // ── 0. OVERVIEW ──────────────────────────────────────────────────────────────
  sectionHeader(`0. ${t("sec0Tab")}`);
  subHeader(`0.1 ${t("controllersTitle")}`);
  if (doc.controllers.length) doc.controllers.forEach((p, i) => {
    field(`${t("partyName")} #${i + 1}`, p.name);
    field(t("partyRole"), p.role); field(t("partyContact"), p.contact); field(t("partyObligations"), p.obligations);
  }); else field(t("controllersTitle"), "");
  subHeader(`0.2 ${t("processorsTitle")}`);
  if (doc.processors.length) doc.processors.forEach((p, i) => {
    field(`${t("partyName")} #${i + 1}`, p.name);
    field(t("partyRole"), p.role); field(t("partyContact"), p.contact); field(t("partyObligations"), p.obligations);
  }); else field(t("processorsTitle"), "");
  subHeader(`0.3 ${t("nameTitle")}`);
  field(t("processingName"), doc.processingName); field(t("processingVersion"), doc.processingVersion);
  subHeader(`0.4 ${t("planningTitle")}`);
  field(t("launchDate"), doc.launchDate); field(t("endDate"), doc.endDate);
  subHeader(`0.5 ${t("techSheetTitle")}`);
  field(t("templateVersion"), doc.templateVersion); field(t("versionLog"), doc.versionLog);
  field(t("teamTitle"), doc.team.map(m => `${m.name} - ${m.role}${m.raci ? ` (${m.raci})` : ""}`).join("\n"));
  field(t("references"), doc.references);
  {
    const r = doc.reasons;
    const picked: string[] = [];
    if (r.mandatory) picked.push(t("reasonMandatory"));
    if (r.art35_3a) picked.push(t("reasonArt35a"));
    if (r.art35_3b) picked.push(t("reasonArt35b"));
    if (r.art35_3c) picked.push(t("reasonArt35c"));
    if (r.beneficial) picked.push(t("reasonBeneficial"));
    if (r.other) picked.push(r.other);
    field(t("pdfReasonsLabel"), picked.map(p => `- ${p}`).join("\n"));
  }
  field(t("scopeField"), doc.scope);
  field(t("completionDate"), doc.completionDate); field(t("validationDate"), doc.validationDate);
  field(t("publication"), doc.publication);
  spacer();

  // ── 1. DESCRIZIONE SISTEMATICA ───────────────────────────────────────────────
  sectionHeader(`1. ${t("sec1Tab")}`);
  field(`1.1.1 ${t("personalData")}`, doc.personalData);
  field(t("specialCategories"), doc.specialCategories);
  subHeader(`1.1.2 ${t("purposesTitle")}`);
  if (doc.purposes.length) doc.purposes.forEach((p, i) => {
    field(`${t("purposeField")} #${i + 1}`, p.purpose); field(t("purposeLegalBasis"), p.legalBasis);
  }); else field(t("purposesTitle"), "");
  field(`1.1.3 ${t("secondaryUses")}`, doc.secondaryUses);
  subHeader(`1.1.4 ${t("natureTitle")}`);
  field(t("nature"), doc.nature); field(t("scopeDesc"), doc.scopeDesc); field(t("context"), doc.context);
  field(`1.2 ${t("functionalDescription")}`, doc.functionalDescription);
  subHeader(t("lifecycleTitle"));
  field(t("lcCollection"), doc.lifecycle.collection); field(t("lcUse"), doc.lifecycle.use);
  field(t("lcStorage"), doc.lifecycle.storage); field(t("lcSharing"), doc.lifecycle.sharing);
  field(t("lcDeletion"), doc.lifecycle.deletion);
  subHeader(`1.3 ${t("assetsTitle")}`);
  if (doc.assets.length) doc.assets.forEach((a, i) => {
    field(`${t("assetName")} #${i + 1}`, `${a.name}${a.group ? ` [${a.group}]` : ""}${a.type ? ` - ${a.type}` : ""}`);
    if (a.description) field(t("assetDescription"), a.description);
  }); else field(t("assetsTitle"), "");
  field(t("architecture"), doc.architecture);
  field(`1.4 ${t("codesOfConduct")}`, doc.codesOfConduct);
  spacer();

  // ── 2. ANALISI ───────────────────────────────────────────────────────────────
  sectionHeader(`2. ${t("sec2Tab")}`);
  field(`2.1.1 ${t("legalBasisAnalysis")}`, doc.legalBasisAnalysis);
  field(`2.1.2 ${t("liftProhibition")}`, doc.liftProhibition);
  field(`2.2.1 ${t("minimisationRetention")}`, doc.minimisationRetention);
  field(`2.2.2 ${t("dataQuality")}`, doc.dataQuality);
  subHeader(`2.3.1 ${t("mArt5Title")}`); measures(doc.measuresArt5);
  subHeader(`2.3.2 ${t("mRightsTitle")}`); measures(doc.measuresRights);
  subHeader(`2.3.3 ${t("mOtherTitle")}`); measures(doc.measuresOther);
  subHeader(`2.3.4 ${t("mDpbddTitle")}`); measures(doc.measuresDpbdd);
  subHeader(`2.3.5 ${t("mSecurityTitle")}`); measures(doc.measuresSecurity);
  spacer();

  // ── 3. NECESSITÀ E PROPORZIONALITÀ ───────────────────────────────────────────
  sectionHeader(`3. ${t("sec3Tab")}`);
  field(`3.1 ${t("impactsRightsFreedoms")}`, doc.impactsRightsFreedoms);
  field(`3.2 ${t("necessity")}`, doc.necessity);
  field(`3.3 ${t("proportionality")}`, doc.proportionality);
  spacer();

  // ── 4. RISCHIO ───────────────────────────────────────────────────────────────
  sectionHeader(`4. ${t("sec4Tab")}`);
  field(`4.1.1 ${t("eventImpacts")}`, doc.eventImpacts);
  field(`4.1.2 ${t("riskMethod")}`, doc.riskMethod);
  subHeader(`4.1.3 ${t("inherentRiskTitle")}`);
  if (doc.risks.length) doc.risks.forEach((r, i) => {
    drawText(`${t("riskLabel")} #${i + 1} - ${t("riskLikelihood")}: ${levelLabel(r.likelihood)} / ${t("riskSeverity")}: ${levelLabel(r.severity)}${r.acceptable ? "" : "  [!]"}`, { size: 9, font: fBold, color: GREEN, indent: 4 });
    field(t("riskScenario"), r.scenario);
    if (r.threat) field(t("riskThreat"), r.threat);
    if (r.riskSource) field(t("riskSource"), r.riskSource);
    if (r.impact) field(t("riskImpact"), r.impact);
    if (r.modulating) field(t("riskModulating"), r.modulating);
  }); else field(t("inherentRiskTitle"), "");
  subHeader(`4.2.1 ${t("mitigationsTitle")}`);
  if (doc.mitigations.length) doc.mitigations.forEach((m, i) => {
    drawText(`${i + 1}. [${statusLabel(m.status)}]${m.targetsRisk ? ` -> ${m.targetsRisk}` : ""}`, { size: 8, font: fBold, color: GREEN, indent: 4 });
    drawText(m.description || t("pdfToFill"), { size: FONT_S, indent: 12, color: m.description ? DARK : FAINT });
    y -= 2;
  }); else field(t("mitigationsTitle"), "");
  field(`4.2.2 ${t("residualRisk")}`, doc.residualRisk);
  field(`4.2.3 ${t("actionPlan")}`, doc.actionPlan);
  spacer();

  // ── 5. COINVOLGIMENTO PARTI ──────────────────────────────────────────────────
  sectionHeader(`5. ${t("sec5Tab")}`);
  field(`5.1 ${t("dpoAdvice")}`, doc.dpoAdvice);
  field(t("dpoFollowUp"), doc.dpoFollowUp);
  field(`5.2 ${t("dataSubjectsViews")}`, doc.dataSubjectsViews);
  field(t("dataSubjectsParticipation"), doc.dataSubjectsParticipation);
  spacer();

  // ── 6. CONCLUSIONE ───────────────────────────────────────────────────────────
  sectionHeader(`6. ${t("sec6Tab")}`);
  const decKey = doc.decision === "abandon" ? "decisionAbandon"
    : doc.decision === "consult_sa" ? "decisionConsult"
    : doc.decision === "proceed" ? "decisionProceed"
    : doc.decision === "conditional" ? "decisionConditional" : "";
  field(t("decisionLabel"), decKey ? t(decKey) : "");
  if (doc.decision === "conditional") field(t("decisionConditions"), doc.decisionConditions);
  field(t("decisionJustification"), doc.decisionJustification);
  spacer(14);

  // Righe firma
  ensureY(60);
  page.drawLine({ start: { x: MRG, y: y - 20 }, end: { x: MRG + 140, y: y - 20 }, thickness: 0.5, color: MUTED });
  page.drawText(sanitize(t("pdfSignController")), { x: MRG, y: y - 30, size: 7, font: fReg, color: MUTED });
  page.drawLine({ start: { x: MRG + 200, y: y - 20 }, end: { x: MRG + 340, y: y - 20 }, thickness: 0.5, color: MUTED });
  page.drawText(sanitize(t("pdfSignDpo")), { x: MRG + 200, y: y - 30, size: 7, font: fReg, color: MUTED });
  y -= 50;

  // Hash documento
  ensureY(30);
  const contentHash = [...new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(doc)))
  )].map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 48);
  drawHRule();
  drawText(`SHA-256: ${contentHash}...`, { size: 7.5, font: fMono, color: FAINT });

  // Watermark bozza
  pdfDoc.getPage(0).drawText("AICOMPLY - DRAFT", {
    x: PAGE_W - 170, y: PAGE_H - 30, size: 8, font: fReg, color: rgb(0, 0, 0), opacity: 0.08,
  });

  const pdfBytes = await pdfDoc.save();
  const name = (doc.processingName || "dpia").replace(/[^a-zA-Z0-9\-]/g, "_").slice(0, 40);
  const filename = `DPIA_EDPB_${name}_${new Date().toISOString().slice(0, 10)}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
