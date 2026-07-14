// POST /api/roi-report
// Riceve i dati del lead + gli input del calcolatore, ricalcola i numeri lato
// server e invia il report ROI dettagliato via email al lead (bcc a noi).

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { computeRoi, fmtFull, fmtCompact } from "@/lib/roi";
import { sendRoiReport } from "@/lib/auth/email";

const BodySchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName:  z.string().min(1).max(100),
  email:     z.string().email(),
  company:   z.string().min(1).max(120),
  country:   z.string().min(1).max(80),
  marketing: z.boolean().optional().default(true),
  fatturato: z.number().min(0).max(1e13),
  tierKey:   z.enum(["vietate", "altorischio", "info"]),
  prob:      z.number().min(0).max(100),
  costo:     z.number().min(0).max(1e11),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const m = computeRoi(d.fatturato, d.tierKey, d.prob, d.costo);

  const fig = {
    esposizione: fmtFull(m.E),
    tier:        m.tier.label,
    fatturato:   fmtFull(d.fatturato),
    rischio:     m.rischio.map(fmtCompact),
    costo:       m.costoY.map((c) => fmtCompact(-c)),
    netto:       m.netto.map(fmtCompact),
    totRischio:  fmtCompact(m.totRischio),
    totCosto:    fmtCompact(-m.totCosto),
    totNetto:    fmtCompact(m.totNetto),
    roi:         Math.round(m.roi).toLocaleString("it-IT"),
  };

  try {
    await sendRoiReport(
      { firstName: d.firstName, lastName: d.lastName, email: d.email, company: d.company, country: d.country },
      fig
    );
  } catch (err) {
    // Non blocchiamo lo sblocco dei numeri lato client se l'email fallisce
    console.error("[ROI REPORT] Invio email fallito:", err);
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
