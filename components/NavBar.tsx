import Link from "next/link";

export function NavBar({
  shop,
  active,
}: {
  shop: string;
  active: "reviews" | "qrcodes" | "plans";
}) {
  const items: { key: typeof active; label: string; href: string }[] = [
    { key: "reviews", label: "Reviews", href: `/dashboard/reviews?shop=${shop}` },
    { key: "qrcodes", label: "QR codes", href: `/dashboard/qrcodes?shop=${shop}` },
    { key: "plans", label: "Plans", href: `/dashboard/plans?shop=${shop}` },
  ];

  return (
    <nav className="mb-8 flex gap-1 border-b border-white/10">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
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
