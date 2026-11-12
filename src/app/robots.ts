import { MetadataRoute } from "next";

const BASE_URL = "https://www.regulaeos.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/inizia", "/risorse", "/scanner"],
        disallow: ["/dashboard/", "/api/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
