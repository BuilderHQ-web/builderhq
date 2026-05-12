import { cn } from "@/lib/utils";

/**
 * Standard page header for any (app)/* dashboard page. Pure typography
 * with generous whitespace — Lando-tier editorial rhythm. Eyebrow is a
 * tight uppercase line; the title is Bebas Neue at hero scale; the
 * description sits in a max-width prose column so long lines don't drag.
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
    <div className={cn("border-b border-border-subtle", className)}>
      {/* Inner wrapper matches the content column max-width below the
          header. Without this cap, on ultrawide displays the title +
          actions stretch full-viewport while the content cards beneath
          remain centred at ~1320px — leaving the "Approved" badge
          marooned in the right gutter, miles from the rest of the UI. */}
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-10 py-9 lg:py-12 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="flex flex-col gap-3 min-w-0">
          {eyebrow ? (
            <span className="text-[11px] tracking-[0.18em] uppercase text-accent font-ui font-medium">
              {eyebrow}
            </span>
          ) : null}
          <h1 className="font-display uppercase tracking-[-0.02em] text-[clamp(2.5rem,4vw+1rem,4rem)] leading-[0.95] text-text">
            {title}
          </h1>
          {description ? (
            <p className="text-[14px] leading-[22px] text-text-muted max-w-[58ch]">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">{actions}</div> : null}
      </div>
    </div>
  );
}

/**
 * KPI / stat card — generous whitespace, Bebas display number, hairline
 * border that nearly disappears, no fill. The number does the work.
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
        "relative rounded-md border border-border-subtle bg-surface-1/40 p-6",
        "transition-[border-color,background] duration-[160ms] ease-[var(--ease-out)]",
        "hover:border-border hover:bg-surface-1",
      )}
    >
      <div className="text-[10px] tracking-[0.18em] uppercase text-text-dim font-ui font-medium">
        {label}
      </div>
      <div className="mt-3 font-display tracking-[-0.01em] text-[44px] leading-none text-text tabular-nums">
        {value}
      </div>
      {(trend || hint) ? (
        <div className="mt-2 flex items-center gap-2 text-[12px] text-text-dim">
          {trend ? <span className={cn("tabular-nums", trendColor)}>{trend.text}</span> : null}
          {hint ? <span>{hint}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Empty state — characterful, single CTA, plenty of room. Sits inside
 * a card, doesn't wrap itself. Comes with a soft accent glow and a
 * gradient orb around the icon — the same family as the FBA card so
 * the visual language stays cohesive across the app.
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
    <div className="relative flex flex-col items-center text-center gap-4 px-6 py-16 lg:py-20 overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 60% 45% at 50% 0%, rgba(0,212,200,0.07), transparent 65%)",
        }}
      />
      {icon ? (
        <div
          className={cn(
            "relative size-14 rounded-full border border-border-subtle flex items-center justify-center text-accent-light",
          )}
          style={{
            background:
              "radial-gradient(circle at 50% 30%, rgba(0,212,200,0.18), rgba(255,255,255,0.018))",
          }}
        >
          {icon}
        </div>
      ) : null}
      <h3 className="relative font-display uppercase tracking-[-0.012em] text-[22px] leading-[1.05] text-text">
        {title}
      </h3>
      {description ? (
        <p className="relative text-[13px] leading-[22px] text-text-muted max-w-md">
          {description}
        </p>
      ) : null}
      {action ? <div className="relative mt-2">{action}</div> : null}
    </div>
  );
}
