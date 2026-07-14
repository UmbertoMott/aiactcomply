// Modello ROI prevenzione sanzioni EU AI Act — condiviso tra client (calcolatore)
// e server (report email), così i numeri sono sempre gli stessi.

export const TIERS = [
  { key: "vietate",    label: "Pratiche vietate (Art. 5)",         pct: 0.07,  cap: 35_000_000, note: "Manipolazione, social scoring, biometria proibita." },
  { key: "altorischio",label: "Obblighi alto rischio / GPAI",      pct: 0.03,  cap: 15_000_000, note: "Violazione obblighi per sistemi ad alto rischio o GPAI." },
  { key: "info",       label: "Informazioni errate alle autorità", pct: 0.015, cap: 7_500_000,  note: "Dati falsi, incompleti o fuorvianti alle autorità." },
] as const;

export type TierKey = (typeof TIERS)[number]["key"];

// Maturità dell'enforcement: cresce mentre l'AI Act entra pienamente in vigore (2026→2028).
export const RAMP = [1, 1.5, 2];

export function computeRoi(fatturato: number, tierKey: string, probPct: number, costo: number) {
  const tier = TIERS.find((t) => t.key === tierKey) ?? TIERS[1];
  const E = Math.max(tier.cap, tier.pct * Math.max(fatturato || 0, 0));
  const p = Math.min(Math.max(probPct, 0) / 100, 1);
  const rischio = RAMP.map((r) => E * Math.min(p * r, 1));
  const costoY  = RAMP.map(() => Math.max(costo || 0, 0));
  const netto   = rischio.map((r, i) => r - costoY[i]);
  const totRischio = rischio.reduce((a, b) => a + b, 0);
  const totCosto   = costoY.reduce((a, b) => a + b, 0);
  const totNetto   = netto.reduce((a, b) => a + b, 0);
  const roi = totCosto > 0 ? totRischio / totCosto : 0;
  return { tier, E, rischio, costoY, netto, totRischio, totCosto, totNetto, roi };
}

export const fmtFull = (n: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

export const fmtCompact = (n: number) =>
  new Intl.NumberFormat("it-IT", { notation: "compact", style: "currency", currency: "EUR", maximumFractionDigits: 1 }).format(n);
