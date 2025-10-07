import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dashboard is a dynamic app - build will skip problematic static pages
  eslint: {
    // Disable ESLint during production builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Already type-checking in CI, skip during builds for faster deploys
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
