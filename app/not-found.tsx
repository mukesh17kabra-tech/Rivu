import { StatusScreen } from "@/components/StatusScreen";

/**
 * Catches unknown paths so a mistyped or stale URL renders in-app UI instead
 * of a bare 404 page — Shopify's review explicitly rejects 404s reached
 * inside the app.
 */
export default function NotFound() {
  return (
    <StatusScreen
      title="That page doesn't exist"
      body="The link may be out of date. Everything in Rivu is reachable from the dashboard."
      primaryAction={{ label: "Back to dashboard", href: "/" }}
    />
  );
}
