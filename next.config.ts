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
            // Allow Shopify Admin to embed this app in an iframe.
            //
            // 'self' is here for the design page's live preview, which frames
            // /widget-preview.html so the real storefront widget renders in
            // isolation. It only lets the app frame its own pages — the hosts
            // allowed to frame the app are unchanged.
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://admin.shopify.com https://*.myshopify.com https://shop.app;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
