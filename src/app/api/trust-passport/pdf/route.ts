// POST /api/trust-passport/pdf
// Genera il PDF/A-3 del Trust Passport con XMP custom + embed JSON.
// Riceve il passport JSON dal client (che lo legge da localStorage).

import { NextResponse } from "next/server";
import { exportDossierToPdfA3 } from "@/lib/evidence/pdfa3-exporter";
import type { TrustPassport } from "@/lib/trust/passport-engine";

export async function POST(req: Request) {
  try {
    const passport = (await req.json()) as TrustPassport;

    if (!passport?.systemId || !passport?.systemName) {
      return NextResponse.json({ error: "Invalid passport payload" }, { status: 400 });
    }

    const result = await exportDossierToPdfA3({
      systemId:    passport.systemId,
      systemName:  passport.systemName,
      riskTier:    passport.riskTier,
      articleCoverage: [
        "Art. 6 (classificazione)",
        "Art. 10 (governance dati)",
        "Art. 13 (trasparenza)",
        "Art. 15 (robustezza)",
        passport.statements.italian_law_132 ? "L. 132/2025" : "",
      ].filter(Boolean),
      jsonContent: passport as unknown as object,
      signatoryName: "—",
      signatoryRole: "Trust Officer",
      companyName: passport.companyName,
    });

    return new NextResponse(Buffer.from(result.pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ai-trust-passport-${passport.systemId}.pdf"`,
        "X-Content-Sha256": result.contentSha256,
        "X-Embedded-Json-Sha256": result.embeddedJsonSha256,
      },
    });
  } catch (e) {
    console.error("[trust-passport/pdf]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
