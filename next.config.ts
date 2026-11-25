import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // served from https://ai.ssc.edu.hk/learner behind Caddy
  basePath: "/learner",
  output: "standalone",
  experimental: {
    // keep the bundle honest: the raid is the only client-heavy route
    optimizePackageImports: [],
  },
};

export default nextConfig;
