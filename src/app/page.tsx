import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Hero from "@/components/sections/Hero";
import Pain from "@/components/sections/Pain";
import Stepper from "@/components/sections/Stepper";
import Stats from "@/components/sections/Stats";
import ToolGallery from "@/components/sections/ToolGallery";
import CtaFinal from "@/components/sections/CtaFinal";

const BASE_URL = "https://aicomply-omega.vercel.app";

export const metadata: Metadata = {
  title: "AIComply — Software Conformità EU AI Act | Classificazione e Documentazione",
  description:
    "AIComply è la piattaforma SaaS per la conformità al Regolamento EU AI Act (2024/1689). Classifica il rischio del tuo sistema AI, genera documentazione tecnica e gestisci gli obblighi normativi. Scadenza agosto 2026.",
  keywords: [
    "EU AI Act compliance",
    "conformità AI Act",
    "software EU AI Act",
    "classificazione sistema AI",
    "documentazione tecnica AI",
    "AI Act obblighi",
    "AI governance platform",
    "AI Act Italia",
  ],
  openGraph: {
    title: "AIComply — Software Conformità EU AI Act",
    description:
      "Classifica il rischio del tuo sistema AI, genera documentazione tecnica e gestisci gli obblighi EU AI Act. Scadenza agosto 2026.",
    url: BASE_URL,
    siteName: "AIComply",
    images: [
      {
        url: `${BASE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "AIComply — Conformità EU AI Act",
      },
    ],
    locale: "it_IT",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AIComply — Software Conformità EU AI Act",
    description:
      "Classifica il rischio del tuo sistema AI e gestisci gli obblighi EU AI Act. Scadenza agosto 2026.",
    images: [`${BASE_URL}/og-image.png`],
  },
  alternates: {
    canonical: BASE_URL,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${BASE_URL}/#organization`,
      name: "AIComply",
      url: BASE_URL,
      description:
        "Piattaforma SaaS per la conformità al Regolamento EU AI Act 2024/1689. Classificazione del rischio, documentazione tecnica e gestione degli obblighi normativi.",
      foundingDate: "2024",
      areaServed: "EU",
      knowsAbout: ["EU AI Act", "AI Governance", "AI Compliance", "Intelligenza Artificiale"],
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${BASE_URL}/#software`,
      name: "AIComply",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: BASE_URL,
      description:
        "Software SaaS per la conformità al Regolamento EU AI Act (2024/1689). Classificazione rischio AI, documentazione tecnica, FRIA, DPIA e gestione scadenze normative.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "EUR",
        description: "Piano gratuito disponibile",
      },
      author: {
        "@id": `${BASE_URL}/#organization`,
      },
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Nav />
      <main>
        <Hero />
        <Pain />
        <Stepper />
        <Stats />
        <ToolGallery />
        <CtaFinal />
      </main>
    </>
  );
}
