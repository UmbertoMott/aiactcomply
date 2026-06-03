import { MetadataRoute } from "next";

const BASE_URL = "https://aicomply-omega.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/risorse", "/scanner"],
        disallow: ["/dashboard/", "/api/", "/login", "/register"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
