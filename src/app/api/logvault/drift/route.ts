import { NextResponse } from "next/server";

// Servizio dismesso: RegulaeOS non riceve né conserva i log dei sistemi di IA dei clienti.
// La conservazione dei log resta a carico del fornitore o del deployer (Artt. 19 e 26(6) Reg. (UE) 2024/1689).
const GONE = {
  error: "Servizio dismesso: RegulaeOS non riceve né conserva i log dei sistemi di IA. Conserva i log nei tuoi sistemi (Artt. 19 e 26(6) Reg. (UE) 2024/1689).",
  code: "gone",
};

export function GET() {
  return NextResponse.json(GONE, { status: 410 });
}

export function POST() {
  return NextResponse.json(GONE, { status: 410 });
}
