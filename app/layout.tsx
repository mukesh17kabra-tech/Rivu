import type { Metadata } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

/**
 * Plus Jakarta Sans rather than Geist.
 *
 * Geist is a neutral UI face — correct, but it has little personality at
 * heading sizes, which is what made the app read as flat. Jakarta has more
 * character in its bolder weights and tightens up well, so headings carry
 * weight while body copy stays readable. The 800 weight is loaded explicitly
 * because the page and section titles rely on it.
 */
const displaySans = Plus_Jakarta_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rivu — Reviews & UGC",
  description: "Collect and display product reviews with Rivu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // API key must be available at build/runtime. Falls back to the known
  // client ID so the meta tag is never empty even if the env var is unset.
  const apiKey =
    process.env.SHOPIFY_API_KEY ||
    process.env.NEXT_PUBLIC_SHOPIFY_API_KEY ||
    "2135e06e19ed7ba1e0303c3a1f48116a";

  return (
    <html
      lang="en"
      className={`${displaySans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* App Bridge v4 — MUST load first and synchronously (no async/defer)
            so Shopify can inject session tokens into fetch requests. */}
        <meta name="shopify-api-key" content={apiKey} />
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
