// Public Trust Center route — /trust/[slug]  (PROMPT AV + BC)
// Server Component: tenta lookup server-side per metadata e access-check.
// Fallback: TrustCenterPublicView legge da localStorage (finché datastore è placeholder).

import type { Metadata } from "next";
import { getTrustCenterBySlug } from "@/lib/trust-center/get-by-slug";
import TrustCenterPublicView from "./TrustCenterPublicView";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getTrustCenterBySlug(slug);

  if (page?.isPublished) {
    const systemName =
      (page as unknown as Record<string, unknown>).systemName as string | undefined;
    return {
      title: `${systemName ?? "Sistema AI"} — Trasparenza AI | AIComply`,
      description:
        "Pagina di trasparenza AI conforme al Reg. (UE) 2024/1689 (AI Act) — generata con AIComply.",
      robots: page.noindex ? "noindex, nofollow" : "index, follow",
      openGraph: {
        title: `${systemName ?? "Sistema AI"} — Trust Center`,
        url: `https://aicomply.io/trust/${slug}`,
      },
    };
  }

  return {
    title: "Trust Center — AIComply",
    description: "Pagina di trasparenza AI generata con AIComply — Reg. (UE) 2024/1689",
    robots: "noindex, nofollow",
    openGraph: { title: "Trust Center — AIComply", url: `https://aicomply.io/trust/${slug}` },
  };
}

export default async function TrustCenterPublicPage({ params }: Props) {
  const { slug } = await params;

  // Server-side check (returns null while datastore is placeholder → client fallback)
  const serverPage = await getTrustCenterBySlug(slug);

  // If server has data and page is restricted/invite_only, pass accessConfig to client
  const accessConfig = serverPage?.accessConfig ?? null;

  return <TrustCenterPublicView slug={slug} serverAccessConfig={accessConfig} />;
}
