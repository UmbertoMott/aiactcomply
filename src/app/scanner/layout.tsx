import type { Metadata } from "next";
import { getLocale } from "@/i18n/server";
import { localeAlternates, ogLocale } from "@/i18n/seo";

const SCANNER_META = {
  it: {
    title: "Scanner AI Act — Verifica rapida del tuo sistema di IA",
    description:
      "Verifica in pochi minuti ruolo, livello di rischio e obblighi del tuo sistema di IA secondo il Regolamento (UE) 2024/1689, come modificato dal Reg. (UE) 2026/1744.",
  },
  en: {
    title: "AI Act Scanner — Quick check of your AI system",
    description:
      "Check in a few minutes the role, risk level and obligations of your AI system under Regulation (EU) 2024/1689, as amended by Regulation (EU) 2026/1744.",
  },
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const m = SCANNER_META[locale];
  return {
    title: m.title,
    description: m.description,
    alternates: localeAlternates("/scanner", locale),
    openGraph: { title: m.title, description: m.description, locale: ogLocale(locale) },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
