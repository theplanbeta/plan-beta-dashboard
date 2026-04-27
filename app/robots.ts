import type { MetadataRoute } from "next"
import { headers } from "next/headers"

/**
 * Domain-aware robots.txt.
 *
 * Both theplanbeta.com and dayzero.xyz serve the same Next.js app, so
 * we detect the incoming host and return the correct sitemap/host
 * pair. Previously this always pointed at theplanbeta.com, which meant
 * dayzero.xyz's robots.txt was cross-referencing a sitemap on the
 * wrong domain and no dayzero URLs were being indexed.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host") ?? "theplanbeta.com"
  const isDayZero = host.includes("dayzero.xyz")
  const base = isDayZero ? "https://dayzero.xyz" : "https://theplanbeta.com"

  if (isDayZero) {
    return {
      rules: [
        {
          userAgent: "*",
          allow: ["/", "/jobs-app", "/jobs-app/jobs", "/jobs-app/job"],
          disallow: [
            "/dashboard/",
            "/api/",
            "/login",
            "/_next/",
            "/site/",
            "/jobs-app/auth",
            "/jobs-app/settings",
            "/jobs-app/applications",
            "/jobs-app/cv-archive",
            "/jobs-app/onboarding",
          ],
        },
        { userAgent: "Googlebot", allow: "/" },
        { userAgent: "Bingbot", allow: "/" },
      ],
      sitemap: `${base}/sitemap.xml`,
      host: base,
    }
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/privacy", "/terms"],
        disallow: ["/dashboard/", "/api/", "/login", "/_next/"],
      },
      { userAgent: "Googlebot", allow: "/" },
      { userAgent: "Bingbot", allow: "/" },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
