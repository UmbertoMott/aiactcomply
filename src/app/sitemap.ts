import { MetadataRoute } from "next";
import { getAllPosts, getTotalPages } from "@/lib/blog/posts";
import type { Locale } from "@/i18n/config";
import { absoluteLocalizedUrl } from "@/i18n/seo";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.regulaeos.com";

// Date di ultima modifica STABILI: se cambiano a ogni richiesta Google smette
// di fidarsi del campo lastmod. Aggiornare PAGES_UPDATED quando cambiano le pagine.
const PAGES_UPDATED = new Date("2026-11-12");

/**
 * Voci della sitemap per una pagina localizzata: una per lingua, ognuna con
 * gli hreflang (it, en, x-default) di tutte le versioni.
 */
function localizedEntries(
  basePath: string,
  locales: readonly Locale[],
  entry: Omit<MetadataRoute.Sitemap[number], "url" | "alternates">,
): MetadataRoute.Sitemap {
  const alternates =
    locales.length > 1
      ? {
          languages: {
            ...Object.fromEntries(locales.map((l) => [l, absoluteLocalizedUrl(basePath, l)])),
            "x-default": absoluteLocalizedUrl(basePath, "it"),
          },
        }
      : undefined;
  return locales.map((l) => ({
    ...entry,
    url: absoluteLocalizedUrl(basePath, l),
    ...(alternates ? { alternates } : {}),
  }));
}

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();
  const latestPost = posts.reduce(
    (max, p) => (new Date(p.dateISO) > max ? new Date(p.dateISO) : max),
    PAGES_UPDATED,
  );

  const staticPages: MetadataRoute.Sitemap = [
    ...localizedEntries("/", ["it", "en"], {
      lastModified: latestPost,
      changeFrequency: "weekly",
      priority: 1,
    }),
    ...localizedEntries("/scanner", ["it", "en"], {
      lastModified: PAGES_UPDATED,
      changeFrequency: "monthly",
      priority: 0.8,
    }),
    ...localizedEntries("/products", ["it", "en"], {
      lastModified: PAGES_UPDATED,
      changeFrequency: "monthly",
      priority: 0.8,
    }),
    {
      url: `${BASE_URL}/quick-scan`,
      lastModified: PAGES_UPDATED,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...localizedEntries("/roi", ["it", "en"], {
      lastModified: PAGES_UPDATED,
      changeFrequency: "monthly",
      priority: 0.6,
    }),
    {
      url: `${BASE_URL}/inizia`,
      lastModified: PAGES_UPDATED,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/contatti`,
      lastModified: PAGES_UPDATED,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...localizedEntries("/risorse", ["it", "en"], {
      lastModified: latestPost,
      changeFrequency: "weekly",
      priority: 0.9,
    }),
  ];

  // Articoli: versione italiana (/risorse/...) e, se tradotti, inglese (/en/risorse/...)
  const blogPages: MetadataRoute.Sitemap = posts.flatMap((post) =>
    localizedEntries(`/risorse/${post.slug}`, post.locales ?? ["it"], {
      lastModified: new Date(post.dateModifiedISO ?? post.dateISO),
      changeFrequency: "monthly",
      priority: 0.7,
    }),
  );

  // Pagine 2..N della lista Risorse
  const listPages: MetadataRoute.Sitemap = Array.from({ length: getTotalPages() - 1 }, (_, i) =>
    localizedEntries(`/risorse/pagina/${i + 2}`, ["it", "en"], {
      lastModified: latestPost,
      changeFrequency: "weekly",
      priority: 0.5,
    }),
  ).flat();

  return [...staticPages, ...listPages, ...blogPages];
}
