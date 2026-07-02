import type { Metadata } from "next";

const BASE_URL = "https://aicomply-omega.vercel.app";

export const metadata: Metadata = {
  title: "Assistenza EU AI Act — Piani Essenziale, Studio, Su misura | AIComply",
  description:
    "Assistenza professionale in abbonamento per la conformità EU AI Act. Tre piani: Essenziale €49/mese, Studio €149/mese, Su misura. Ogni valutazione validata da un avvocato.",
  openGraph: {
    title: "Assistenza EU AI Act in abbonamento | AIComply",
    description:
      "Piani di assistenza professionale per la conformità EU AI Act. Essenziale €49/mese · Studio €149/mese · Su misura. Validato da avvocato.",
    url: `${BASE_URL}/pricing`,
    siteName: "AIComply",
    locale: "it_IT",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Prezzi AIComply — Conformità EU AI Act",
    description:
      "Assistenza in abbonamento per la conformità EU AI Act, validata da avvocato.",
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
