import RisorseListing from "./RisorseListing";
import type { Metadata } from "next";
import { getLocale } from "@/i18n/server";
import { absoluteLocalizedUrl, localeAlternates, ogLocale } from "@/i18n/seo";
import { RISORSE_META } from "./meta";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const m = RISORSE_META[locale];
  return {
    alternates: localeAlternates("/risorse", locale),
    title: { absolute: m.title },
    description: m.description,
    openGraph: {
      title: m.ogTitle,
      description: m.ogDescription,
      type: "website",
      url: absoluteLocalizedUrl("/risorse", locale),
      locale: ogLocale(locale),
    },
  };
}

// Pagina 1 della lista Risorse (massimo 10 articoli; le successive sono /risorse/pagina/N)
export default function RisorseIndex() {
  return <RisorseListing page={1} />;
}
