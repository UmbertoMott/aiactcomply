import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import RisorseListing from "../../RisorseListing";
import { getTotalPages } from "@/lib/blog/posts";
import { getLocale } from "@/i18n/server";
import { localizedHref } from "@/i18n/config";
import { localeAlternates } from "@/i18n/seo";
import { RISORSE_META } from "../../meta";

interface Props { params: Promise<{ n: string }>; }

function parsePage(n: string): number | null {
  if (!/^[1-9]\d*$/.test(n)) return null;
  return Number(n);
}

// Niente generateStaticParams: la pagina dipende dalla lingua della richiesta
// (/risorse/pagina/N vs /en/risorse/pagina/N), quindi è renderizzata on demand
// come /risorse e /risorse/[slug].

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await getLocale();
  const page = parsePage((await params).n);
  if (!page || page < 2 || page > getTotalPages()) return {};
  const m = RISORSE_META[locale];
  return {
    title: { absolute: m.pageTitle(page) },
    description: m.pageDescription(page),
    alternates: localeAlternates(`/risorse/pagina/${page}`, locale),
  };
}

export default async function RisorsePagina({ params }: Props) {
  // La lingua si legge prima di redirect/notFound, così il redirect di
  // /pagina/1 resta nella lingua dell'URL (/risorse o /en/risorse).
  const locale = await getLocale();
  const page = parsePage((await params).n);
  if (page === 1) permanentRedirect(localizedHref("/risorse", locale));
  if (!page || page > getTotalPages()) notFound();
  return <RisorseListing page={page} />;
}
