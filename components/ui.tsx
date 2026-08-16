import type { ReactNode } from "react";

/**
 * Shared page furniture for the embedded app.
 *
 * Every dashboard page used to carry its own dark <main> wrapper and heading
 * markup, so spacing and type drifted between them. These are the light-theme
 * equivalents, defined once.
 */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-[26px] font-bold tracking-[-0.02em] text-slate-900">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,.04)] ${
        padded ? "p-5" : ""
      } ${className}`}
    >
      {children}
    </section>
  );
}

/**
 * A titled block inside a page. Used to break long configuration pages into
 * steps the merchant can scan, instead of one undifferentiated wall of inputs.
 */
export function Section({
  title,
  description,
  step,
  children,
  actions,
}: {
  title: string;
  description?: ReactNode;
  /** Optional ordinal, shown as a numbered chip, for pages that read as a flow. */
  step?: number;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Card className="mb-5">
      <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
        <div className="flex items-start gap-3">
          {step !== undefined && (
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
              {step}
            </span>
          )}
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
            {description && (
              <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500">{description}</p>
            )}
          </div>
        </div>
        {actions}
      </div>
      {children}
    </Card>
  );
}

export function Stat({
  label,
  value,
  suffix = "",
  hint,
}: {
  label: string;
  value: ReactNode;
  suffix?: string;
  hint?: string;
}) {
  return (
    <Card>
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-[30px] font-bold leading-none tracking-[-0.02em] text-slate-900 tabular-nums">
        {value}
        {suffix}
      </p>
      {hint && <p className="mt-1.5 text-xs text-slate-400">{hint}</p>}
    </Card>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning";
}) {
  const tones = {
    neutral: "bg-slate-100 text-slate-600",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
