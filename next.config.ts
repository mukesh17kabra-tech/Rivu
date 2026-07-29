import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Expose API key to client for App Bridge initialization
    NEXT_PUBLIC_SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY || "",
  },
};

export default nextConfig;
