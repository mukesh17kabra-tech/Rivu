"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Vertical navigation for the embedded app.
 *
 * Grouped rather than a flat list: the old horizontal tab bar put seven
 * unrelated destinations in one row, so nothing signalled which pages were
 * about collecting reviews versus configuring the storefront versus account
 * admin. The groups below are that signal.
 */

type Item = { key: string; label: string; href: string; icon: React.ReactNode };
type Group = { title: string; items: Item[] };

function Icon({ path }: { path: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

const ICONS = {
  home: "M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5",
  reviews: "M12 3.5l2.7 5.5 6 .9-4.35 4.2 1.03 6-5.38-2.83L6.62 20.1l1.03-6L3.3 9.9l6-.9L12 3.5z",
  qr: "M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 3h3m0 0h3m-3 0v3m0-6v.01",
  email: "M3 6.5h18v11H3v-11zm0 .5 9 6.5 9-6.5",
  widget: "M4 5h16v5H4V5zm0 9h7v5H4v-5zm11 0h5v5h-5v-5z",
  install: "M12 3v11m0 0 4-4m-4 4-4-4M4 17v3h16v-3",
  plan: "M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5L12 3z",
} as const;

function buildGroups(query: string): Group[] {
  return [
    {
      title: "Reviews",
      items: [
        { key: "home", label: "Dashboard", href: `/dashboard/home?${query}`, icon: <Icon path={ICONS.home} /> },
        { key: "reviews", label: "All reviews", href: `/dashboard/reviews?${query}`, icon: <Icon path={ICONS.reviews} /> },
      ],
    },
    {
      title: "Collect",
      items: [
        { key: "email-requests", label: "Email requests", href: `/dashboard/email-requests?${query}`, icon: <Icon path={ICONS.email} /> },
        { key: "qrcodes", label: "QR codes", href: `/dashboard/qrcodes?${query}`, icon: <Icon path={ICONS.qr} /> },
      ],
    },
    {
      title: "Storefront",
      items: [
        { key: "widget-settings", label: "Widget design", href: `/dashboard/widget-settings?${query}`, icon: <Icon path={ICONS.widget} /> },
        { key: "installation", label: "Installation", href: `/dashboard/installation?${query}`, icon: <Icon path={ICONS.install} /> },
      ],
    },
    {
      title: "Account",
      items: [
        { key: "plans", label: "Plan", href: `/dashboard/plans?${query}`, icon: <Icon path={ICONS.plan} /> },
      ],
    },
  ];
}

export function Sidebar({
  shop,
  host,
  plan,
}: {
  shop: string;
  host?: string | null;
  plan?: string;
}) {
  const pathname = usePathname();

  const qs = new URLSearchParams({ shop });
  if (host) qs.set("host", host);
  const groups = buildGroups(qs.toString());

  return (
    <aside className="w-full shrink-0 border-b border-slate-200 bg-white md:h-full md:w-[248px] md:border-b-0 md:border-r">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
          R
        </span>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-slate-900">Rivu</p>
          {plan && (
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              {plan} plan
            </p>
          )}
        </div>
      </div>

      <nav className="px-3 pb-6">
        {groups.map((group) => (
          <div key={group.title} className="mb-5">
            <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
              {group.title}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href.split("?")[0];
                return (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                        isActive
                          ? "bg-slate-100 font-semibold text-slate-900"
                          : "font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <span className={isActive ? "text-slate-900" : "text-slate-400"}>
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
