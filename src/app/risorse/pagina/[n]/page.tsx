import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import RisorseListing from "../../RisorseListing";
import { getTotalPages } from "@/lib/blog/posts";

interface Props { params: Promise<{ n: string }>; }

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.regulaeos.com";

function parsePage(n: string): number | null {
  if (!/^[1-9]\d*$/.test(n)) return null;
  return Number(n);
}

export async function generateStaticParams() {
  return Array.from({ length: Math.max(0, getTotalPages() - 1) }, (_, i) => ({ n: String(i + 2) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = parsePage((await params).n);
  if (!page || page < 2 || page > getTotalPages()) return {};
  return {
    title: { absolute: `Risorse AI Act — Pagina ${page} | RegulaeOS` },
    description: `Guide pratiche sull'EU AI Act e sulla NIS2, aggiornamenti normativi e risorse per la compliance in Italia. Pagina ${page}.`,
    alternates: { canonical: `${BASE_URL}/risorse/pagina/${page}` },
  };
}

export default async function RisorsePagina({ params }: Props) {
  const page = parsePage((await params).n);
  if (page === 1) permanentRedirect("/risorse");
  if (!page || page > getTotalPages()) notFound();
  return <RisorseListing page={page} />;
}
