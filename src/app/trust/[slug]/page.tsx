// Public Trust Center route — /trust/[slug]  (PROMPT AV)
// Data lives in localStorage — server component renders metadata + delegates to client view.
// 404 logic (unpublished / no public sections / unknown slug) handled in TrustCenterPublicView.

import type { Metadata } from "next";
import TrustCenterPublicView from "./TrustCenterPublicView";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: "Trust Center — AIComply",
    description: "Pagina di trasparenza AI generata con AIComply — Reg. (UE) 2024/1689",
    robots: "noindex, nofollow", // conservative default; noindex managed per-page client-side
    openGraph: { title: "Trust Center — AIComply", url: `https://aicomply.io/trust/${slug}` },
  };
}

export default async function TrustCenterPublicPage({ params }: Props) {
  const { slug } = await params;
  return <TrustCenterPublicView slug={slug} />;
}
