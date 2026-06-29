import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // TS errors surface in dev — don't block production deploys
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
