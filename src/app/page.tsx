import type { Metadata } from "next";
import { preload } from "react-dom";
import Nav from "@/components/Nav";
import Hero from "@/components/sections/Hero";
import PlatformSection from "@/components/sections/PlatformSection";
import Pain from "@/components/sections/Pain";
import Stepper from "@/components/sections/Stepper";
import Stats from "@/components/sections/Stats";
import VideoShowcase from "@/components/sections/VideoShowcase";
import Quote from "@/components/sections/Quote";
import CtaFinal from "@/components/sections/CtaFinal";
import ChiEroga from "@/components/sections/ChiEroga";
import Footer from "@/components/sections/Footer";
import BookDemoBanner from "@/components/BookDemoBanner";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aicomply-omega.vercel.app";

export const metadata: Metadata = {
  title: "RegulaeOS — Assistenza professionale alla conformità EU AI Act",
  description:
    "RegulaeOS eroga assistenza professionale alla conformità al Regolamento EU AI Act (2024/1689), erogata da un avvocato iscritto all'albo. Risk assessment, FRIA, DPIA e documentazione tecnica: ogni valutazione è assistita dallo strumento e validata dall'avvocato.",
  keywords: [
    "EU AI Act compliance",
    "conformità AI Act",
    "software EU AI Act",
    "classificazione sistema AI",
    "documentazione tecnica AI",
    "AI Act obblighi",
    "AI governance platform",
    "AI Act Italia",
    "RegulaeOS",
  ],
  openGraph: {
    title: "RegulaeOS — Conformità EU AI Act",
    description:
      "Classifica il rischio del tuo sistema AI, genera documentazione tecnica e gestisci gli obblighi EU AI Act. Scadenza agosto 2026.",
    url: BASE_URL,
    siteName: "RegulaeOS",
    images: [
      {
        url: `${BASE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "RegulaeOS — Conformità EU AI Act",
      },
    ],
    locale: "it_IT",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RegulaeOS — Conformità EU AI Act",
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
      "@type": "LegalService",
      "@id": `${BASE_URL}/#organization`,
      name: "RegulaeOS",
      url: BASE_URL,
      description:
        "Servizio di assistenza professionale alla conformità al Regolamento EU AI Act 2024/1689, erogato dall'Avv. Umberto Mottola, iscritto all'Ordine degli Avvocati di Napoli.",
      foundingDate: "2024",
      areaServed: "EU",
      knowsAbout: ["EU AI Act", "AI Governance", "AI Compliance", "Intelligenza Artificiale"],
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${BASE_URL}/#software`,
      name: "RegulaeOS",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: BASE_URL,
      description:
        "Software SaaS per la conformità al Regolamento EU AI Act (2024/1689). Classificazione rischio AI, documentazione tecnica, FRIA, DPIA e gestione scadenze normative.",
      featureList: [
        "Classificazione rischio AI (Art. 6)",
        "Risk Manager (Art. 9)",
        "Data Audit bias metrics (Art. 10)",
        "Logging hash-chained (Art. 12)",
        "Documentazione tecnica Annex IV (Art. 11)",
        "FRIA valutazione diritti fondamentali (Art. 27)",
        "DPIA integrata",
        "GPAI compliance (Art. 51-55)",
        "Legal Assistant RAG EU AI Act",
        "Scanner Art. 50 gratuito",
      ],
      offers: [
        {
          "@type": "Offer",
          name: "Scanner",
          price: "0",
          priceCurrency: "EUR",
          description: "Scanner Art. 50 gratuito e anonimo",
        },
        {
          "@type": "Offer",
          name: "Starter",
          price: "49",
          priceCurrency: "EUR",
          priceSpecification: { "@type": "UnitPriceSpecification", billingDuration: "P1M" },
          description: "1 sistema AI, compliance Art. 50 completa",
        },
        {
          "@type": "Offer",
          name: "Professional",
          price: "199",
          priceCurrency: "EUR",
          priceSpecification: { "@type": "UnitPriceSpecification", billingDuration: "P1M" },
          description: "5 sistemi AI, dossier completo, Legal Assistant RAG",
        },
      ],
      author: {
        "@id": `${BASE_URL}/#organization`,
      },
      inLanguage: "it",
      audience: {
        "@type": "Audience",
        audienceType: "Business",
        geographicArea: { "@type": "Country", name: "Italy" },
      },
    },
    {
      "@type": "WebSite",
      "@id": `${BASE_URL}/#website`,
      url: BASE_URL,
      name: "RegulaeOS",
      description: "Servizio di assistenza professionale alla conformità al Regolamento EU AI Act in italiano, erogato da un avvocato iscritto all'albo.",
      inLanguage: "it",
      publisher: { "@id": `${BASE_URL}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${BASE_URL}/risorse?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function Home() {
  preload("/videos/hero-demo.mp4", { as: "video", type: "video/mp4" });
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Nav />
      <main>
        <Hero />
        <PlatformSection />
        <Pain />
        <BookDemoBanner />
        <Stepper />
        <Stats />
        <VideoShowcase />
        <BookDemoBanner />
        <Quote />
        <ChiEroga />
        <CtaFinal />
      </main>
      <Footer />
    </>
  );
}
