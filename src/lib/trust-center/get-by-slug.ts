// Server-side lookup per slug pubblico Trust Center — PROMPT BC
// Chiama l'API route che legge dal datastore server-side.
// Finché il datastore è placeholder, ritorna null e il client gestisce il fallback.

import type { TrustCenterPage } from "./trust-center-types";

export async function getTrustCenterBySlug(
  slug: string
): Promise<TrustCenterPage | null> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/trust-center/${encodeURIComponent(slug)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json() as Promise<TrustCenterPage>;
  } catch {
    return null;
  }
}
