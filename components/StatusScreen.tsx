import Link from "next/link";

/**
 * Shared full-page state screen.
 *
 * Every "something isn't right" state in the app renders through this so
 * merchants always get real in-app UI with something to click, instead of
 * a bare sentence or a framework error page.
 */
export function StatusScreen({
  eyebrow = "Rivu",
  title,
  body,
  primaryAction,
  secondaryAction,
  tone = "neutral",
}: {
  eyebrow?: string;
  title: string;
  body: React.ReactNode;
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
  tone?: "neutral" | "warning";
}) {
  const accent = tone === "warning" ? "text-amber-400/90" : "text-emerald-700/80";

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 text-[#1a1d21]">
      <div className="w-full max-w-md text-center">
        <p className={`mb-2 text-[13px] uppercase tracking-[0.2em] ${accent}`}>
          {eyebrow}
        </p>
        <h1 className="mb-3 text-2xl font-semibold tracking-tight">{title}</h1>
        <div className="text-[15px] leading-relaxed text-black/68">{body}</div>

        {(primaryAction || secondaryAction) && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {primaryAction && (
              <Link
                href={primaryAction.href}
                className="rounded-md bg-[#111418] px-4 py-2 text-[15px] font-medium text-white transition-colors hover:bg-[#2a2f35]"
              >
                {primaryAction.label}
              </Link>
            )}
            {secondaryAction && (
              <Link
                href={secondaryAction.href}
                className="rounded-md border border-black/[0.14] px-4 py-2 text-[15px] font-medium text-black/78 transition-colors hover:border-black/[0.25] hover:text-[#111418]"
              >
                {secondaryAction.label}
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
