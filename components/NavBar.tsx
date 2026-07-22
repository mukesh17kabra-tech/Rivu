import Link from "next/link";

export function NavBar({
  shop,
  host,
  active,
}: {
  shop: string;
  host?: string | null;
  active: "home" | "reviews" | "qrcodes" | "plans" | "installation" | "widget-settings" | "email-requests";
}) {
  const qs = new URLSearchParams({ shop });
  if (host) qs.set("host", host);
  const query = qs.toString();

  const items: { key: typeof active; label: string; href: string }[] = [
    { key: "home", label: "Dashboard", href: `/dashboard/home?${query}` },
    { key: "reviews", label: "Reviews", href: `/dashboard/reviews?${query}` },
    { key: "qrcodes", label: "QR codes", href: `/dashboard/qrcodes?${query}` },
    { key: "plans", label: "Plans", href: `/dashboard/plans?${query}` },
    { key: "installation", label: "Installation", href: `/dashboard/installation?${query}` },
    { key: "widget-settings", label: "Widget Settings", href: `/dashboard/widget-settings?${query}` },
    { key: "email-requests", label: "Email Requests", href: `/dashboard/email-requests?${query}` },
  ];

  return (
    <nav className="mb-8 flex flex-wrap gap-1 border-b border-white/10">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
            active === item.key
              ? "border-emerald-400 text-white"
              : "border-transparent text-white/50 hover:text-white/80"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
