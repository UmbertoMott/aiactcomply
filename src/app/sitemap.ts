import { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog/posts";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.regulaeos.com";

// Date di ultima modifica STABILI: se cambiano a ogni richiesta Google smette
// di fidarsi del campo lastmod. Aggiornare PAGES_UPDATED quando cambiano le pagine.
const PAGES_UPDATED = new Date("2026-11-12");

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();
  const latestPost = posts.reduce(
    (max, p) => (new Date(p.dateISO) > max ? new Date(p.dateISO) : max),
    PAGES_UPDATED,
  );

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: latestPost,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/scanner`,
      lastModified: PAGES_UPDATED,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/products`,
      lastModified: PAGES_UPDATED,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/quick-scan`,
      lastModified: PAGES_UPDATED,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/roi`,
      lastModified: PAGES_UPDATED,
      changeFrequency: "monthly",
      priority: 0.6,
    },
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
    {
      url: `${BASE_URL}/risorse`,
      lastModified: latestPost,
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];

  const blogPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${BASE_URL}/risorse/${post.slug}`,
    lastModified: new Date(post.dateISO),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...blogPages];
}
