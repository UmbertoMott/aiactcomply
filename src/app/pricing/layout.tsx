import type { Metadata } from "next";

const BASE_URL = "https://aicomply-omega.vercel.app";

export const metadata: Metadata = {
  title: "Prezzi RegulaeOS — Piani per la Conformità EU AI Act",
  description:
    "Scegli il piano RegulaeOS adatto alla tua azienda. Dal piano gratuito per PMI al piano Enterprise per provider di sistemi AI ad alto rischio. Conformità EU AI Act a partire da 0€.",
  openGraph: {
    title: "Prezzi RegulaeOS — Conformità EU AI Act",
    description:
      "Piani flessibili per la conformità EU AI Act. Gratis per iniziare, Enterprise per chi sviluppa sistemi AI ad alto rischio.",
    url: `${BASE_URL}/pricing`,
    siteName: "RegulaeOS",
    locale: "it_IT",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Prezzi RegulaeOS — Conformità EU AI Act",
    description:
      "Piani flessibili per la conformità EU AI Act. Gratis per iniziare.",
  },
  alternates: {
    canonical: `${BASE_URL}/pricing`,
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
