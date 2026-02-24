import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/site/", "/privacy", "/terms"],
        disallow: ["/dashboard/", "/api/", "/login", "/_next/"],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
      },
      {
        userAgent: "Bingbot",
        allow: "/",
      },
    ],
    sitemap: "https://planbeta.in/sitemap.xml",
    host: "https://planbeta.in",
  }
}
