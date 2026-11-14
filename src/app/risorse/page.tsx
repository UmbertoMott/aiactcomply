import RisorseListing from "./RisorseListing";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/risorse" },
  title: { absolute: "Risorse AI Act — Guide, Normativa e Aggiornamenti | RegulaeOS" },
  description:
    "Guide pratiche sull'EU AI Act, aggiornamenti normativi e risorse per la compliance AI in Italia. Scadenze, obblighi, Annex III, GPAI e molto altro.",
  openGraph: {
    title: "Risorse AI Act | RegulaeOS",
    description:
      "Guide pratiche sull'EU AI Act, aggiornamenti normativi e risorse per la compliance AI in Italia.",
    type: "website",
    url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.regulaeos.com"}/risorse`,
  },
};

// Pagina 1 della lista Risorse (massimo 10 articoli; le successive sono /risorse/pagina/N)
export default function RisorseIndex() {
  return <RisorseListing page={1} />;
}
