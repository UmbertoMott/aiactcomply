// Titoli e descrizioni della lista Risorse per lingua (URL: /risorse e /en/risorse).
export const RISORSE_META = {
  it: {
    title: "Risorse AI Act — Guide, Normativa e Aggiornamenti | RegulaeOS",
    description:
      "Guide pratiche sull'EU AI Act, aggiornamenti normativi e risorse per la compliance AI in Italia. Scadenze, obblighi, Annex III, GPAI e molto altro.",
    ogTitle: "Risorse AI Act | RegulaeOS",
    ogDescription:
      "Guide pratiche sull'EU AI Act, aggiornamenti normativi e risorse per la compliance AI in Italia.",
    pageTitle: (n: number) => `Risorse AI Act — Pagina ${n} | RegulaeOS`,
    pageDescription: (n: number) =>
      `Guide pratiche sull'EU AI Act e sulla NIS2, aggiornamenti normativi e risorse per la compliance in Italia. Pagina ${n}.`,
  },
  en: {
    title: "AI Act Resources — Guides, Regulation and Updates | RegulaeOS",
    description:
      "Practical guides to the EU AI Act and NIS2, regulatory updates and compliance resources. Deadlines, obligations, Annex III, GPAI and more.",
    ogTitle: "AI Act Resources | RegulaeOS",
    ogDescription:
      "Practical guides to the EU AI Act and NIS2, regulatory updates and compliance resources.",
    pageTitle: (n: number) => `AI Act Resources — Page ${n} | RegulaeOS`,
    pageDescription: (n: number) =>
      `Practical guides to the EU AI Act and NIS2, regulatory updates and compliance resources. Page ${n}.`,
  },
} as const;
