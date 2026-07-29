import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Expose to client for App Bridge
    NEXT_PUBLIC_SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY || "",
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            // Allow Shopify Admin to embed this app in an iframe
            key: "Content-Security-Policy",
            value: "frame-ancestors https://admin.shopify.com https://*.myshopify.com https://shop.app;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
