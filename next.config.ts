import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure consistent URLs for SEO (no trailing slash duplicates)
  trailingSlash: false,
  // We use the bundled fork of @react-pdf/renderer because the upstream 4.x
  // line silently fails renderToBuffer in Next 15 App Router serverless
  // functions (the bundler strips React.Component / react-reconciler
  // internals). The bundled fork ships its own React + reconciler so it's
  // immune. Marking it as a server external package keeps the bundling
  // hands-off. See: https://github.com/diegomura/react-pdf/issues/2350
  serverExternalPackages: ["@joshuajaco/react-pdf-renderer-bundled"],
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
