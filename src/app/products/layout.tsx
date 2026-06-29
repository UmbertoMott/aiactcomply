import type { Metadata } from "next";

const BASE_URL = "https://aicomply-omega.vercel.app";

export const metadata: Metadata = {
  title: "Prodotti RegulaeOS — Moduli per la Conformità EU AI Act",
  description:
    "Triage, Legal Assistant, Risk Manager, EUDB, Trust Center e molto altro. RegulaeOS copre ogni obbligo dell'EU AI Act con strumenti specializzati per team prodotto, legal e compliance.",
  openGraph: {
    title: "Prodotti RegulaeOS — Conformità EU AI Act",
    description:
      "Ogni modulo, un obbligo coperto. Triage, Risk Manager, FRIA, DPIA, EUDB e Trust Center.",
    url: `${BASE_URL}/products`,
    siteName: "RegulaeOS",
    locale: "it_IT",
    type: "website",
  },
  alternates: {
    canonical: `${BASE_URL}/products`,
  },
};

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
