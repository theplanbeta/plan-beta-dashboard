import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure consistent URLs for SEO (no trailing slash duplicates)
  trailingSlash: false,
  // @react-pdf/renderer relies on react-reconciler internals that the Next 15
  // App Router strips when bundling for the serverless target. Marking it as
  // an external server package + transpiling sources keeps it intact so
  // renderToBuffer() works in production. Without this, the CV/Anschreiben
  // generation routes silently throw on every invocation. See:
  // https://github.com/diegomura/react-pdf/issues/2350 and #3074
  serverExternalPackages: ["@react-pdf/renderer"],
  transpilePackages: ["@react-pdf/renderer"],
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
