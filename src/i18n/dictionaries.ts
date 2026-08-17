import type { Locale } from "./config";

// Dizionari di traduzione, organizzati per namespace (sezione) → chiave → testo.
// Precisione legale: i riferimenti agli articoli (Art. 50, Art. 99…) restano
// invariati; la terminologia EN segue la versione ufficiale del Reg. (UE) 2024/1689.
//
// Man mano che rendiamo bilingue nuove pagine, si aggiungono namespace qui.

type Namespace = Record<string, string>;
export type Dictionary = Record<string, Namespace>;

export const DICTIONARIES: Record<Locale, Dictionary> = {
  it: {
    nav: {
      product: "Prodotto",
      pricing: "Prezzi",
      scanner: "Scanner Art. 50",
      resources: "Risorse",
      login: "Accedi",
      bookDemo: "Prenota demo",
      contents: "Contenuti",
      tools: "Strumenti",
      blogLabel: "Blog & Articoli",
      blogDesc: "Analisi e aggiornamenti sull'EU AI Act.",
      roiToolLabel: "Calcolatore ROI sanzioni",
      roiToolDesc: "Stima l'esposizione alle sanzioni AI Act e il ROI della prevenzione.",
      productToolLabel: "Il prodotto",
      productToolDesc: "I sei moduli per l'intero ciclo di conformità.",
      roiCardKicker: "Esposizione fino a",
      roiCardTurnover: "del fatturato · Art. 99 AI Act",
      roiCardTitle: "Calcolatore ROI — Evita le sanzioni",
      roiCardDesc: "Stima la tua esposizione e il ritorno della prevenzione in base al fatturato e al tipo di violazione.",
    },
  },
  en: {
    nav: {
      product: "Product",
      pricing: "Pricing",
      scanner: "Art. 50 Scanner",
      resources: "Resources",
      login: "Log in",
      bookDemo: "Book a demo",
      contents: "Contents",
      tools: "Tools",
      blogLabel: "Blog & Articles",
      blogDesc: "Analysis and updates on the EU AI Act.",
      roiToolLabel: "Penalty ROI Calculator",
      roiToolDesc: "Estimate your AI Act penalty exposure and the ROI of prevention.",
      productToolLabel: "The product",
      productToolDesc: "The six modules covering the full compliance lifecycle.",
      roiCardKicker: "Exposure up to",
      roiCardTurnover: "of annual turnover · Art. 99 AI Act",
      roiCardTitle: "ROI Calculator — Avoid the penalties",
      roiCardDesc: "Estimate your exposure and the return on prevention based on turnover and type of infringement.",
    },
  },
};

// Traduce con fallback: locale richiesto → italiano → la chiave stessa.
export function translate(locale: Locale, ns: string, key: string): string {
  return (
    DICTIONARIES[locale]?.[ns]?.[key] ??
    DICTIONARIES.it?.[ns]?.[key] ??
    key
  );
}
