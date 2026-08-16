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
  const accent = tone === "warning" ? "text-amber-400/90" : "text-slate-400";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-slate-900">
      <div className="w-full max-w-md text-center">
        <p className={`mb-2 text-xs uppercase tracking-[0.2em] ${accent}`}>
          {eyebrow}
        </p>
        <h1 className="mb-3 text-2xl font-semibold tracking-tight">{title}</h1>
        <div className="text-sm leading-relaxed text-slate-500">{body}</div>

        {(primaryAction || secondaryAction) && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {primaryAction && (
              <Link
                href={primaryAction.href}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
              >
                {primaryAction.label}
              </Link>
            )}
            {secondaryAction && (
              <Link
                href={secondaryAction.href}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900"
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
