import type { Metadata } from "next";
import Nav from "@/components/Nav";
import BookDemoBanner from "@/components/BookDemoBanner";
import QuickScanClient from "@/components/quick-scan/QuickScanClient";

export const metadata: Metadata = {
  title: "AI Act Quick Scan — Report preliminare in 5 minuti",
  description:
    "Rispondi a 8 domande e scopri potenziali gap AI Act su trasparenza, marcatura tecnica, documentazione e governance. Report preliminare via email.",
  openGraph: {
    title: "AI Act Quick Scan | RegulaeOS",
    description:
      "Quick Scan gratuito per individuare potenziali gap AI Act prima del 2 dicembre 2026.",
    type: "website",
    url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://aicomply-omega.vercel.app"}/quick-scan`,
  },
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://aicomply-omega.vercel.app"}/quick-scan`,
  },
};

export default function QuickScanPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", color: "#0D1016" }}>
      <Nav />
      <QuickScanClient />
      <BookDemoBanner />
    </div>
  );
}
