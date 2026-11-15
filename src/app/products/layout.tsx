import type { Metadata } from "next";
import { getLocale } from "@/i18n/server";
import { absoluteLocalizedUrl, localeAlternates, ogLocale } from "@/i18n/seo";

const PRODUCTS_META = {
  it: {
    title: "Prodotti RegulaeOS — Moduli per la Conformità EU AI Act",
    description:
      "Triage, Legal Assistant, Risk Manager, EUDB, Trust Center e molto altro. RegulaeOS copre ogni obbligo dell'EU AI Act con strumenti specializzati per team prodotto, legal e compliance.",
    ogTitle: "Prodotti RegulaeOS — Conformità EU AI Act",
    ogDescription:
      "Ogni modulo, un obbligo coperto. Triage, Risk Manager, FRIA, DPIA, EUDB e Trust Center.",
  },
  en: {
    title: "RegulaeOS Products — EU AI Act Compliance Modules",
    description:
      "Triage, Legal Assistant, Risk Manager, EUDB, Trust Center and more. RegulaeOS covers every EU AI Act obligation with specialised tools for product, legal and compliance teams.",
    ogTitle: "RegulaeOS Products — EU AI Act compliance",
    ogDescription:
      "Every module covers an obligation. Triage, Risk Manager, FRIA, DPIA, EUDB and Trust Center.",
  },
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const m = PRODUCTS_META[locale];
  return {
    title: { absolute: m.title },
    description: m.description,
    openGraph: {
      title: m.ogTitle,
      description: m.ogDescription,
      url: absoluteLocalizedUrl("/products", locale),
      siteName: "RegulaeOS",
      locale: ogLocale(locale),
      type: "website",
    },
    alternates: localeAlternates("/products", locale),
  };
}

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
