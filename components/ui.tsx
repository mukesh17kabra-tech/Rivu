import type { ReactNode } from "react";

/**
 * Shared page furniture for the embedded app.
 *
 * Every dashboard page used to carry its own <main> wrapper and heading
 * markup, so spacing and type drifted between them. Defined once here.
 *
 * Type is deliberately heavier than before: titles at 800 weight with tight
 * tracking, and a clear size jump between page title, section title and body.
 * The old 600-weight headings at the same size as body copy were what made
 * the app read as flat.
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
    <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-extrabold leading-tight tracking-[-0.03em] text-white">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-[13px] text-white/45">{description}</p>
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
      className={`rounded-xl border border-white/[0.08] bg-white/[0.025] ${
        padded ? "p-5" : ""
      } ${className}`}
    >
      {children}
    </section>
  );
}

/**
 * A titled block inside a page. Breaks long configuration pages into steps a
 * merchant can scan, instead of one undifferentiated wall of inputs.
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
      <div className="mb-5 flex items-start justify-between gap-4 border-b border-white/[0.07] pb-4">
        <div className="flex items-start gap-3">
          {step !== undefined && (
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-[11px] font-extrabold text-black">
              {step}
            </span>
          )}
          <div>
            <h2 className="text-[17px] font-bold tracking-[-0.01em] text-white">{title}</h2>
            {description && (
              <p className="mt-1 text-[13px] leading-relaxed text-white/45">{description}</p>
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
      <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-white/35">
        {label}
      </p>
      <p className="mt-2.5 text-[32px] font-extrabold leading-none tracking-[-0.03em] text-white tabular-nums">
        {value}
        {suffix}
      </p>
      {hint && <p className="mt-2 text-xs text-white/35">{hint}</p>}
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
    neutral: "bg-white/[0.06] text-white/60 ring-white/10",
    success: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/20",
    warning: "bg-amber-400/10 text-amber-300 ring-amber-400/20",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] ring-1 ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
