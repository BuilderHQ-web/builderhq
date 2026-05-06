import { cn } from "@/lib/utils";

/**
 * Standard page header for any (app)/* dashboard page. Title row + optional
 * description + optional right-side actions slot. Sits flush with the topbar
 * border above and provides consistent vertical rhythm across pages.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border-b border-border-subtle bg-bg/40", className)}>
      <div className="px-6 lg:px-8 py-7 lg:py-9 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="flex flex-col gap-2 min-w-0">
          {eyebrow ? (
            <span className="text-[10px] tracking-[0.22em] uppercase text-text-dim font-ui font-medium">
              {eyebrow}
            </span>
          ) : null}
          <h1 className="font-ui font-semibold tracking-[-0.02em] text-[26px] leading-[1.15] text-text">
            {title}
          </h1>
          {description ? (
            <p className="text-[14px] leading-[22px] text-text-muted max-w-prose">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-2 shrink-0">{actions}</div> : null}
      </div>
    </div>
  );
}

/**
 * KPI / stat card. tabular-nums on the value so dashboards never jitter.
 */
export function StatCard({
  label,
  value,
  hint,
  trend,
}: {
  label: string;
  value: string;
  hint?: string;
  trend?: { direction: "up" | "down" | "flat"; text: string };
}) {
  const trendColor =
    trend?.direction === "up"
      ? "text-success"
      : trend?.direction === "down"
        ? "text-danger"
        : "text-text-dim";

  return (
    <div
      className={cn(
        "relative isolate rounded-md border border-border-subtle bg-surface-1 p-5",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]",
        "transition-[border-color,box-shadow,transform] duration-[200ms] ease-[var(--ease-out)]",
        "hover:border-border hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_8px_24px_-12px_rgba(0,0,0,0.5)]",
      )}
    >
      <div className="text-[10px] tracking-[0.18em] uppercase text-text-dim font-ui font-medium">
        {label}
      </div>
      <div className="mt-2.5 font-display tracking-[-0.01em] text-[44px] leading-none text-text tabular-nums">
        {value}
      </div>
      <div className="mt-2 flex items-center gap-2 text-[12px] text-text-muted">
        {trend ? <span className={cn("tabular-nums", trendColor)}>{trend.text}</span> : null}
        {hint ? <span className="text-text-dim">{hint}</span> : null}
      </div>
    </div>
  );
}

/**
 * Empty-state row used everywhere data is missing. Don't wrap in a card —
 * it's intended to sit inside one.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-3 px-6 py-12 lg:py-16">
      {icon ? (
        <div className="size-10 rounded-full border border-border bg-surface-2 flex items-center justify-center text-text-muted">
          {icon}
        </div>
      ) : null}
      <h3 className="font-ui font-semibold text-[15px] tracking-[-0.01em] text-text">{title}</h3>
      {description ? (
        <p className="text-[13px] leading-[20px] text-text-muted max-w-md">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
