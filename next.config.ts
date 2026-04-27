import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure consistent URLs for SEO (no trailing slash duplicates)
  trailingSlash: false,
  // Puppeteer + the @sparticuz/chromium binary must be treated as external
  // server packages so Next 15's App Router bundler does not try to inline
  // them (which would blow past the function size limit and break the
  // headless Chrome launcher). They are only used by the CV / Anschreiben
  // generation routes.
  serverExternalPackages: [
    "puppeteer-core",
    "@sparticuz/chromium",
  ],
  // Dashboard is a dynamic app - build will skip problematic static pages
  eslint: {
    // Disable ESLint during production builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Skip type-checking during builds to reduce memory usage on Vercel (8GB limit)
    // Types are verified locally with `npx tsc --noEmit`
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
