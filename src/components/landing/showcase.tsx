"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Reveal } from "./reveal";
import { cn } from "@/lib/utils";
import { LineChart, Folder, FileSpreadsheet } from "lucide-react";

type TabId = "tracking" | "workspace" | "compare";

type Tab = {
  id: TabId;
  title: string;
  icon: React.ReactNode;
  caption: string;
};

const TABS: Tab[] = [
  {
    id: "tracking",
    title: "Live tender tracking",
    icon: <LineChart className="size-4" />,
    caption: "Watch matched, unlocked, and submitted in real time.",
  },
  {
    id: "workspace",
    title: "One workspace per project",
    icon: <Folder className="size-4" />,
    caption: "Drawings, specs, scope, and messages — all in one place.",
  },
  {
    id: "compare",
    title: "Side-by-side compare",
    icon: <FileSpreadsheet className="size-4" />,
    caption: "Decide on price, scope, and timeline in one screen.",
  },
];

/**
 * Showcase — three feature pills above one realistic dashboard. The
 * active pill swaps the dashboard view AND lights its perimeter with
 * a slow-running teal beam.
 */
export function Showcase() {
  const [active, setActive] = useState<TabId>("tracking");
  const activeTab = TABS.find((t) => t.id === active)!;

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
              Not stylised mockups. The screens here are the screens you sign
              in to.
            </p>
          </Reveal>
        </div>

        {/* Feature pills — clicking swaps the dashboard */}
        <Reveal delay={0.05}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            {TABS.map((t) => (
              <Pill
                key={t.id}
                tab={t}
                active={active === t.id}
                onClick={() => setActive(t.id)}
              />
            ))}
          </div>
        </Reveal>

        {/* The dashboard — content swaps on tab change. On mobile, the
              inner tables (cost breakdown, tender comparison) carry
              fixed column widths that would overflow a phone-width
              container — we let the outer card scroll horizontally with
              momentum so users can drag through dense screens. The
              card itself stays edge-to-edge of the page section so the
              scroll feels intentional, not accidental. */}
        <Reveal delay={0.1}>
          <div
            className="relative rounded-lg border border-border-subtle shadow-[0_50px_140px_rgba(0,0,0,0.55)] overflow-hidden"
            style={{
              background:
                "linear-gradient(180deg, rgba(8,22,36,0.95), rgba(4,14,24,0.98))",
            }}
          >
            <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
              <div className="min-w-[760px] lg:min-w-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {active === "tracking" && <DashboardTracking />}
                    {active === "workspace" && <DashboardWorkspace />}
                    {active === "compare" && <DashboardCompare />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* caption under the dashboard */}
          <p className="mt-6 text-center text-[13px] text-text-dim">
            <span className="text-accent-light">{activeTab.title}</span>
            {" — "}
            {activeTab.caption}
          </p>
        </Reveal>
      </div>
    </section>
  );
}

// ── pill ─────────────────────────────────────────────────────────────────

function Pill({
  tab,
  active,
  onClick,
}: {
  tab: Tab;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "group relative flex items-center gap-3 px-5 py-4 rounded-md border text-left transition-colors duration-[400ms]",
        active
          ? "border-border-accent bg-[rgba(0,212,200,0.04)]"
          : "border-border-subtle bg-[rgba(255,255,255,0.012)] hover:border-border",
      )}
    >
      {/* Animated perimeter beam — only on active pill */}
      {active ? <PerimeterBeam /> : null}

      <div
        className={cn(
          "relative size-9 rounded-md flex items-center justify-center border shrink-0 transition-colors duration-[400ms]",
          active
            ? "border-border-accent bg-accent-muted text-accent-light"
            : "border-border-subtle bg-[rgba(255,255,255,0.02)] text-text-muted",
        )}
      >
        {tab.icon}
      </div>
      <span
        className={cn(
          "relative text-[13.5px] font-medium transition-colors duration-[400ms]",
          active ? "text-text" : "text-text-muted",
        )}
      >
        {tab.title}
      </span>
    </button>
  );
}

/**
 * Light-runs-around-the-perimeter effect. A linear gradient is set as
 * the *background* of an absolutely positioned overlay; we use a
 * masked padding-box so only the border region is painted, then animate
 * background-position so the gradient appears to run around the box.
 */
function PerimeterBeam() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-md"
      style={{
        padding: "1px",
        background:
          "linear-gradient(90deg, transparent 0%, transparent 30%, rgba(126,245,237,0.95) 50%, transparent 70%, transparent 100%)",
        backgroundSize: "200% 100%",
        animation: "beamPerimeter 2.6s linear infinite",
        WebkitMask:
          "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
        WebkitMaskComposite: "xor",
        mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
        maskComposite: "exclude",
      }}
    />
  );
}

// ── dashboards ───────────────────────────────────────────────────────────

function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr]">
      <Sidebar />
      <div className="p-5 lg:p-7">{children}</div>
    </div>
  );
}

function Sidebar() {
  return (
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
        ].map(([label, isActive]) => (
          <span
            key={label as string}
            className={cn(
              "px-3 py-2 rounded-sm text-[12px] transition-colors",
              isActive
                ? "bg-[rgba(0,212,200,0.06)] text-accent-light"
                : "text-text-muted",
            )}
          >
            {label}
          </span>
        ))}
      </nav>
    </aside>
  );
}

function DashboardHeader({
  eyebrow,
  title,
  badge = "Live",
}: {
  eyebrow: string;
  title: string;
  badge?: string;
}) {
  return (
    <div className="flex items-baseline justify-between mb-5">
      <div>
        <div className="text-[10px] tracking-[0.18em] uppercase text-text-dim mb-1">
          {eyebrow}
        </div>
        <h3 className="font-ui font-bold text-[18px] tracking-[-0.01em] text-text">
          {title}
        </h3>
      </div>
      <span className="px-2.5 py-1 border border-border-accent rounded-sm text-[9px] tracking-[0.16em] uppercase text-accent">
        {badge}
      </span>
    </div>
  );
}

// 1. Live tender tracking
function DashboardTracking() {
  return (
    <DashboardShell>
      <DashboardHeader
        eyebrow="Niddrie Townhouse · VIC 3042"
        title="Tender activity"
      />

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
            <div
              className={cn(
                "mt-1.5 text-[10px]",
                k.up ? "text-accent-light" : "text-text-muted",
              )}
            >
              {k.trend}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-sm border border-border-subtle bg-[rgba(255,255,255,0.012)] p-4 mb-5">
        <div className="flex items-baseline justify-between mb-3">
          <span className="text-[10px] tracking-[0.18em] uppercase text-text-dim">
            Builder interest, last 14 days
          </span>
          <span className="text-[10px] text-text-dim font-mono">114 events</span>
        </div>
        <Sparkline />
      </div>

      <TenderTable />
    </DashboardShell>
  );
}

// 2. One workspace per project
function DashboardWorkspace() {
  return (
    <DashboardShell>
      <DashboardHeader
        eyebrow="Niddrie Townhouse · Documents"
        title="Project workspace"
        badge="v3"
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
        {/* file list */}
        <div className="rounded-sm border border-border-subtle overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-2.5 bg-[rgba(255,255,255,0.018)] border-b border-border-subtle text-[9px] tracking-[0.16em] uppercase text-text-dim">
            <span className="flex-1">File</span>
            <span className="w-16 text-right">Size</span>
            <span className="w-20 text-right">Updated</span>
            <span className="w-14 text-right">Status</span>
          </div>
          {[
            ["Architectural plans v3.pdf", "2.4 MB", "2h ago", "Latest"],
            ["Specifications.pdf", "1.1 MB", "Yesterday", "Latest"],
            ["Scope of works.docx", "164 KB", "Yesterday", "Latest"],
            ["Site survey.pdf", "3.8 MB", "3d ago", "Latest"],
            ["Engineering report.pdf", "920 KB", "5d ago", "v2"],
            ["Soil test.pdf", "412 KB", "1w ago", "Latest"],
          ].map(([name, size, when, status], i, arr) => (
            <div
              key={name}
              className={cn(
                "flex items-center gap-3 px-4 py-3 text-[12px] transition-colors hover:bg-[rgba(255,255,255,0.022)]",
                i === arr.length - 1 ? "" : "border-b border-border-subtle",
              )}
            >
              <span className="flex-1 truncate text-text font-medium">
                <span className="text-text-dim mr-2">📄</span>
                {name}
              </span>
              <span className="w-16 text-right text-text-dim tabular-nums">
                {size}
              </span>
              <span className="w-20 text-right text-text-dim">{when}</span>
              <span
                className={cn(
                  "w-14 text-right text-[9.5px] tracking-[0.12em] uppercase",
                  status === "Latest" ? "text-accent-light" : "text-warning",
                )}
              >
                {status}
              </span>
            </div>
          ))}
        </div>

        {/* activity panel */}
        <div className="rounded-sm border border-border-subtle bg-[rgba(255,255,255,0.012)] p-4">
          <div className="text-[10px] tracking-[0.18em] uppercase text-text-dim mb-3">
            Recent activity
          </div>
          <ul className="flex flex-col gap-3">
            {[
              ["Plans v3 uploaded", "by Aryan · 2h ago"],
              ["Smith Builders unlocked", "Builder · 4h ago"],
              ["RFI: structural beam", "Chen · 1d ago"],
              ["Engineering report v2", "by Aryan · 3d ago"],
            ].map(([title, sub]) => (
              <li key={title} className="flex items-start gap-2">
                <span className="mt-[5px] size-1.5 rounded-full bg-accent-light shrink-0" />
                <div className="min-w-0">
                  <div className="text-[12px] font-medium text-text truncate">
                    {title}
                  </div>
                  <div className="text-[10px] text-text-dim truncate">{sub}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </DashboardShell>
  );
}

// 3. Side-by-side compare
function DashboardCompare() {
  const builders = [
    {
      initials: "JS",
      name: "Jordan Smith",
      company: "Smith Builders",
      price: "$1.78M",
      timeline: "26 weeks",
      inclusions: 14,
      exclusions: 2,
      primary: true,
    },
    {
      initials: "AC",
      name: "Alex Chen",
      company: "Chen Construction",
      price: "$1.91M",
      timeline: "30 weeks",
      inclusions: 16,
      exclusions: 1,
      primary: false,
    },
    {
      initials: "MR",
      name: "Mia Roberts",
      company: "Roberts & Co",
      price: "$1.88M",
      timeline: "28 weeks",
      inclusions: 13,
      exclusions: 3,
      primary: false,
    },
  ];

  return (
    <DashboardShell>
      <DashboardHeader
        eyebrow="Niddrie Townhouse · 3 tenders"
        title="Compare tenders"
        badge="Open"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {builders.map((b) => (
          <div
            key={b.initials}
            className={cn(
              "rounded-sm border p-4 transition-colors",
              b.primary
                ? "border-border-accent bg-[rgba(0,212,200,0.04)]"
                : "border-border-subtle bg-[rgba(255,255,255,0.012)]",
            )}
          >
            <div className="flex items-center gap-3 mb-4">
              <span
                className="size-9 rounded-full flex items-center justify-center text-[11px] font-bold border border-border-accent text-accent-light shrink-0"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(0,212,200,0.30), rgba(26,95,212,0.30))",
                }}
              >
                {b.initials}
              </span>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-text truncate">
                  {b.name}
                </div>
                <div className="text-[10.5px] text-text-dim truncate">
                  {b.company}
                </div>
              </div>
              {b.primary ? (
                <span className="ml-auto text-[8.5px] tracking-[0.16em] uppercase text-accent border border-border-accent px-1.5 py-0.5 rounded-sm">
                  Lead
                </span>
              ) : null}
            </div>

            <div
              className={cn(
                "font-display text-[34px] leading-none tabular-nums mb-2",
                b.primary ? "text-accent-light" : "text-text",
              )}
            >
              {b.price}
            </div>
            <div className="text-[11px] text-text-dim mb-4">
              Timeline · {b.timeline}
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <Stat label="Inclusions" value={b.inclusions} good />
              <Stat label="Exclusions" value={b.exclusions} good={false} />
            </div>

            <button
              type="button"
              className={cn(
                "w-full px-3 h-8 rounded-sm text-[11px] tracking-[0.12em] uppercase border transition-colors",
                b.primary
                  ? "border-border-accent bg-accent-muted/40 text-accent-light hover:bg-accent-muted/70"
                  : "border-border-subtle text-text-muted hover:text-text hover:border-border",
              )}
            >
              View full tender
            </button>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}

function Stat({
  label,
  value,
  good,
}: {
  label: string;
  value: number;
  good: boolean;
}) {
  return (
    <div className="px-3 py-2 rounded-sm border border-border-subtle bg-[rgba(255,255,255,0.018)]">
      <div className="text-[8.5px] tracking-[0.16em] uppercase text-text-dim mb-0.5">
        {label}
      </div>
      <div
        className={cn(
          "font-display tracking-[-0.01em] text-[18px] leading-none tabular-nums",
          good ? "text-accent-light" : "text-text-muted",
        )}
      >
        {value}
      </div>
    </div>
  );
}

// ── shared atoms ─────────────────────────────────────────────────────────

function TenderTable() {
  return (
    <div className="rounded-sm border border-border-subtle overflow-hidden">
      <div className="grid grid-cols-[1.6fr_1fr_1fr_auto] gap-4 px-4 py-2.5 bg-[rgba(255,255,255,0.018)] border-b border-border-subtle">
        {["Builder", "Price", "Timeline", ""].map((h, i) => (
          <span
            key={i}
            className="text-[9px] tracking-[0.16em] uppercase text-text-dim"
          >
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
              <div className="text-[12px] font-semibold text-text truncate">
                {b.name}
              </div>
              <div className="text-[10px] text-text-dim truncate">
                {b.company}
              </div>
            </div>
          </div>
          <div
            className={cn(
              "font-display text-[18px] tabular-nums",
              b.primary ? "text-accent-light" : "text-text",
            )}
          >
            {b.price}
          </div>
          <div className="text-[12px] text-text-muted tabular-nums">
            {b.time}
          </div>
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
  );
}

function Sparkline() {
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
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
      >
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
