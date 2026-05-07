"use client";

import { motion } from "motion/react";
import { Reveal } from "./reveal";
import { cn } from "@/lib/utils";
import { LineChart, Folder, FileSpreadsheet } from "lucide-react";

/**
 * Showcase — Resend-style. Three feature pills sit above one big,
 * realistic-looking dashboard. The dashboard is the single visual
 * focal point of the section.
 */
export function Showcase() {
  return (
    <section id="showcase" className="relative px-6 md:px-10 py-24 lg:py-32">
      <div className="mx-auto max-w-[1320px]">
        <div className="text-center mb-12 lg:mb-16">
          <Reveal>
            <span className="text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-medium">
              See it in motion
            </span>
            <h2 className="mt-5 font-display uppercase tracking-[-0.02em] text-[clamp(2.75rem,4.5vw+1rem,5.5rem)] leading-[0.92]">
              <span
                className="text-transparent"
                style={{ WebkitTextStroke: "1.2px rgba(142,252,244,0.55)" }}
              >
                The actual
              </span>{" "}
              <span className="text-accent-light">interface</span>.
            </h2>
            <p className="mt-7 mx-auto max-w-[60ch] text-[15px] leading-[1.7] text-text-subtle">
              Not stylised mockups. The screens you see here are the screens
              you sign in to.
            </p>
          </Reveal>
        </div>

        {/* Feature pills */}
        <Reveal delay={0.05}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <Pill icon={<LineChart className="size-4" />} title="Live tender tracking" active />
            <Pill icon={<Folder className="size-4" />} title="One workspace per project" />
            <Pill icon={<FileSpreadsheet className="size-4" />} title="Side-by-side compare" />
          </div>
        </Reveal>

        {/* The dashboard */}
        <Reveal delay={0.1}>
          <Dashboard />
        </Reveal>
      </div>
    </section>
  );
}

function Pill({
  icon,
  title,
  active,
}: {
  icon: React.ReactNode;
  title: string;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-5 py-4 rounded-md border transition-colors duration-[400ms]",
        active
          ? "border-border-accent bg-[rgba(0,212,200,0.04)]"
          : "border-border-subtle bg-[rgba(255,255,255,0.012)] hover:border-border",
      )}
    >
      <div
        className={cn(
          "size-9 rounded-md flex items-center justify-center border",
          active
            ? "border-border-accent bg-accent-muted text-accent-light"
            : "border-border-subtle bg-[rgba(255,255,255,0.02)] text-text-muted",
        )}
      >
        {icon}
      </div>
      <span className={cn("text-[13.5px] font-medium", active ? "text-text" : "text-text-muted")}>
        {title}
      </span>
    </div>
  );
}

// ── the dashboard mock ───────────────────────────────────────────────────

function Dashboard() {
  return (
    <div
      className="relative rounded-lg border border-border-subtle overflow-hidden shadow-[0_50px_140px_rgba(0,0,0,0.55)]"
      style={{
        background:
          "linear-gradient(180deg, rgba(8,22,36,0.95), rgba(4,14,24,0.98))",
      }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr]">
        {/* Sidebar */}
        <aside className="border-b lg:border-b-0 lg:border-r border-border-subtle bg-[rgba(255,255,255,0.012)] p-4">
          <div className="flex items-center gap-2 mb-6 px-2 py-2">
            <span className="size-6 rounded-sm bg-accent-muted border border-border-accent flex items-center justify-center text-[10px] font-bold text-accent-light">
              b
            </span>
            <span className="text-[12px] font-semibold text-text">BuilderHQ</span>
            <span className="ml-auto text-[8.5px] tracking-[0.16em] uppercase text-accent border border-border-accent px-1.5 py-0.5 rounded-sm">
              Owner
            </span>
          </div>
          <nav className="flex flex-col gap-1">
            {[
              ["Dashboard", true],
              ["Projects", false],
              ["Tenders", false],
              ["Messages", false],
              ["Builders", false],
              ["Settings", false],
            ].map(([label, active]) => (
              <a
                key={label as string}
                className={cn(
                  "px-3 py-2 rounded-sm text-[12px] transition-colors",
                  active
                    ? "bg-[rgba(0,212,200,0.06)] text-accent-light"
                    : "text-text-muted hover:text-text hover:bg-[rgba(255,255,255,0.02)]",
                )}
              >
                {label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <div className="p-5 lg:p-7">
          <div className="flex items-baseline justify-between mb-5">
            <div>
              <div className="text-[10px] tracking-[0.18em] uppercase text-text-dim mb-1">
                Niddrie Townhouse · VIC 3042
              </div>
              <h3 className="font-ui font-bold text-[18px] tracking-[-0.01em] text-text">
                Tender activity
              </h3>
            </div>
            <span className="px-2.5 py-1 border border-border-accent rounded-sm text-[9px] tracking-[0.16em] uppercase text-accent">
              Live
            </span>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-5">
            {[
              { label: "Builders matched", value: "18", trend: "+4 this week", up: true },
              { label: "Unlocked", value: "12", trend: "67% of matched", up: true },
              { label: "Tenders received", value: "03", trend: "Awaiting 9", up: true },
              { label: "Avg. price", value: "$1.86M", trend: "Range $1.78–1.91M", up: false },
            ].map((k) => (
              <div
                key={k.label}
                className="px-4 py-3.5 rounded-sm border border-border-subtle bg-[rgba(255,255,255,0.018)]"
              >
                <div className="text-[9px] tracking-[0.16em] uppercase text-text-dim mb-1.5">
                  {k.label}
                </div>
                <div className="font-display tracking-[-0.01em] text-[28px] leading-none text-text tabular-nums">
                  {k.value}
                </div>
                <div className={cn("mt-1.5 text-[10px]", k.up ? "text-accent-light" : "text-text-muted")}>
                  {k.trend}
                </div>
              </div>
            ))}
          </div>

          {/* Chart strip */}
          <div className="rounded-sm border border-border-subtle bg-[rgba(255,255,255,0.012)] p-4 mb-5">
            <div className="flex items-baseline justify-between mb-3">
              <span className="text-[10px] tracking-[0.18em] uppercase text-text-dim">
                Builder interest, last 14 days
              </span>
              <span className="text-[10px] text-text-dim font-mono">114 events</span>
            </div>
            <Chart />
          </div>

          {/* Tender table */}
          <div className="rounded-sm border border-border-subtle overflow-hidden">
            <div className="grid grid-cols-[1.6fr_1fr_1fr_auto] gap-4 px-4 py-2.5 bg-[rgba(255,255,255,0.018)] border-b border-border-subtle">
              {["Builder", "Price", "Timeline", ""].map((h) => (
                <span key={h} className="text-[9px] tracking-[0.16em] uppercase text-text-dim">
                  {h}
                </span>
              ))}
            </div>
            {[
              { initials: "JS", name: "Jordan Smith", company: "Smith Builders", price: "$1.78M", time: "26 weeks", primary: true },
              { initials: "AC", name: "Alex Chen", company: "Chen Construction", price: "$1.91M", time: "30 weeks", primary: false },
              { initials: "MR", name: "Mia Roberts", company: "Roberts & Co", price: "$1.88M", time: "28 weeks", primary: false },
            ].map((b, i, arr) => (
              <div
                key={b.initials}
                className={cn(
                  "grid grid-cols-[1.6fr_1fr_1fr_auto] gap-4 px-4 py-3 items-center transition-colors hover:bg-[rgba(255,255,255,0.022)]",
                  i === arr.length - 1 ? "" : "border-b border-border-subtle",
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="size-7 rounded-full flex items-center justify-center text-[10px] font-bold border border-border-accent text-accent-light shrink-0"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(0,212,200,0.30), rgba(26,95,212,0.30))",
                    }}
                  >
                    {b.initials}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold text-text truncate">{b.name}</div>
                    <div className="text-[10px] text-text-dim truncate">{b.company}</div>
                  </div>
                </div>
                <div className={cn("font-display text-[18px] tabular-nums", b.primary ? "text-accent-light" : "text-text")}>
                  {b.price}
                </div>
                <div className="text-[12px] text-text-muted tabular-nums">{b.time}</div>
                <button
                  type="button"
                  className={cn(
                    "px-3 h-7 rounded-sm text-[10px] tracking-[0.12em] uppercase border transition-colors",
                    b.primary
                      ? "border-border-accent bg-accent-muted/40 text-accent-light hover:bg-accent-muted/70"
                      : "border-border-subtle text-text-muted hover:text-text hover:border-border",
                  )}
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Chart() {
  // Sparkline-style svg, animated dash-in.
  const points = [22, 30, 28, 38, 34, 46, 50, 48, 58, 62, 58, 70, 76, 84];
  const max = Math.max(...points);
  const w = 100;
  const h = 100;
  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - (p / max) * h;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  const area = `${path} L ${w} ${h} L 0 ${h} Z`;

  return (
    <div className="relative h-[140px]">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(0,212,200,0.30)" />
            <stop offset="100%" stopColor="rgba(0,212,200,0)" />
          </linearGradient>
        </defs>
        <motion.path
          d={area}
          fill="url(#chartFill)"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.path
          d={path}
          fill="none"
          stroke="#7ef5ed"
          strokeWidth="0.6"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      {/* baseline gridlines */}
      {[0, 25, 50, 75].map((y) => (
        <span
          key={y}
          aria-hidden
          className="absolute left-0 right-0 h-px bg-[rgba(255,255,255,0.04)]"
          style={{ top: `${y}%` }}
        />
      ))}
    </div>
  );
}
