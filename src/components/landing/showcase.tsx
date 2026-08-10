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
    caption: "Drawings, specs, scope, and messages, all in one place.",
  },
  {
    id: "compare",
    title: "Side-by-side compare",
    icon: <FileSpreadsheet className="size-4" />,
    caption: "Decide on price, scope, and timeline in one screen.",
  },
];

/**
 * Showcase — three feature pills above one realistic dashboard. Clicking
 * a pill swaps the dashboard view AND lights its perimeter with a slow
 * teal beam.
 *
 * No GSAP ScrollTrigger pin here. We tried it briefly to get a Linear-
 * style scroll-tied tab swap, but pinning interacted badly with the
 * adjacent sections' motion-react transforms (the testimonials section
 * was drawing on top of the pinned showcase). The unfixable variant is
 * cheaper than the version that nearly works — Lenis-driven smooth
 * scroll alone (mounted at the marketing layout root via <SmoothScroll />)
 * already does the heavy lifting for the "feels premium" upgrade.
 */
export function Showcase() {
  const [active, setActive] = useState<TabId>("tracking");
  const activeTab = TABS.find((t) => t.id === active)!;

  return (
    <section id="showcase" className="relative px-5 md:px-10 py-20 lg:py-32">
      <div className="mx-auto max-w-[1320px]">
        <div className="text-center mb-10 lg:mb-16">
          <Reveal>
            <span className="text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-medium">
              See it in motion
            </span>
            <h2 className="mt-5 font-display tracking-[-0.018em] text-[clamp(2.5rem,4vw+0.5rem,4.5rem)] leading-[1] mx-auto max-w-[20ch]">
              <span className="text-text">The actual</span>{" "}
              <span className="accent-italic">interface</span>.
            </h2>
            <p className="mt-7 mx-auto max-w-[60ch] text-[15px] leading-[1.7] text-text-subtle">
              Not stylised mockups. The screens here are the screens you sign
              in to.
            </p>
          </Reveal>
        </div>

        {/* Feature pills — desktop. Click to swap the big dashboard. */}
        <Reveal delay={0.05}>
          <div className="hidden lg:grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            {TABS.map((t) => (
              <Pill
                key={t.id}
                tab={t}
                active={active === t.id}
                onClick={() => setActive(t.id)}
              />
            ))}
          </div>

          {/* MOBILE — three clickable feature cards then a single
                compact preview that swaps based on active tab.
                Resend-style: card list → small mockup pinned underneath
                so the reader gets both the value-prop and a visual.
                The mini-preview is purpose-built for mobile (no fake
                sidebar, no 5-tile data strip) and renders fully inside
                the 375px viewport with no horizontal scroll. */}
          <div className="lg:hidden flex flex-col gap-2.5">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActive(t.id)}
                aria-pressed={active === t.id}
                className={cn(
                  "group relative flex items-start gap-3.5 rounded-md border p-4 text-left transition-colors duration-[260ms]",
                  active === t.id
                    ? "border-border-accent bg-[rgba(0,212,200,0.04)]"
                    : "border-border-subtle bg-[rgba(255,255,255,0.012)] active:border-border",
                )}
              >
                {active === t.id ? (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-md"
                    style={{
                      padding: "1px",
                      background:
                        "linear-gradient(90deg, transparent 0%, transparent 30%, rgba(126,245,237,0.7) 50%, transparent 70%, transparent 100%)",
                      backgroundSize: "200% 100%",
                      animation: "beamPerimeter 2.6s linear infinite",
                      WebkitMask:
                        "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                      WebkitMaskComposite: "xor",
                      mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                      maskComposite: "exclude",
                    }}
                  />
                ) : null}
                <div
                  className={cn(
                    "shrink-0 size-9 rounded-md flex items-center justify-center border transition-colors duration-[260ms]",
                    active === t.id
                      ? "border-border-accent bg-accent-muted text-accent-light"
                      : "border-border-subtle bg-[rgba(255,255,255,0.02)] text-text-muted",
                  )}
                >
                  {t.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      "text-[15px] font-medium leading-snug transition-colors duration-[260ms]",
                      active === t.id ? "text-text" : "text-text-muted",
                    )}
                  >
                    {t.title}
                  </div>
                  <p className="mt-1 text-[12.5px] leading-[1.5] text-text-subtle">
                    {t.caption}
                  </p>
                </div>
              </button>
            ))}

            {/* Mobile mini-mockup. Single small preview that swaps. */}
            <div
              className="mt-4 relative rounded-md border border-border-subtle overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
              style={{
                background:
                  "linear-gradient(180deg, rgba(8,22,36,0.95), rgba(4,14,24,0.98))",
              }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="p-4"
                >
                  {active === "tracking" && <MobileTrackingMini />}
                  {active === "workspace" && <MobileWorkspaceMini />}
                  {active === "compare" && <MobileCompareMini />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </Reveal>

        {/* The dashboard — DESKTOP ONLY. Content swaps on tab change. */}
        <Reveal delay={0.1}>
          <div
            className="hidden lg:block relative rounded-lg border border-border-subtle shadow-[0_50px_140px_rgba(0,0,0,0.55)] overflow-hidden"
            style={{
              background:
                "linear-gradient(180deg, rgba(8,22,36,0.95), rgba(4,14,24,0.98))",
            }}
          >
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

          {/* caption under the desktop dashboard */}
          <p className="hidden lg:block mt-6 text-center text-[13px] text-text-dim">
            <span className="text-accent-light">{activeTab.title}</span>
            {" · "}
            {activeTab.caption}
          </p>
        </Reveal>
      </div>
    </section>
  );
}

// ── mobile mini-mockups ──────────────────────────────────────────────────
//
// Compact previews used in the mobile showcase — purpose-built for
// narrow viewports so we don't squeeze the desktop dashboards through
// a horizontal scroll. Each renders in ~180–220px of vertical height
// and stays fully within a 375px container.

function MobileTrackingMini() {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[8.5px] tracking-[0.16em] uppercase text-text-dim mb-0.5">
            Tenders received
          </div>
          <div className="text-[14px] font-semibold text-text">Compare &amp; decide</div>
        </div>
        <span className="px-1.5 py-0.5 border border-border-accent rounded-sm text-[8px] tracking-[0.14em] uppercase text-accent">
          Live
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <MiniKpi label="Tenders" value="3" />
        <MiniKpi label="Median" value="$1.86M" />
        <MiniKpi label="Spread" value="7%" tone="accent" />
      </div>
      <div className="space-y-1.5">
        <MiniTenderRow initials="JS" name="Smith Builders" price="$1.78M" delta="-4%" highlight />
        <MiniTenderRow initials="AC" name="Chen Construction" price="$1.91M" delta="+3%" />
        <MiniTenderRow initials="MR" name="Roberts &amp; Co" price="$1.88M" delta="+1%" />
      </div>
    </div>
  );
}

function MobileWorkspaceMini() {
  const rows: Array<[string, string, "Latest" | "v2"]> = [
    ["Architectural plans v3.pdf", "2.4 MB", "Latest"],
    ["Specifications.pdf", "1.1 MB", "Latest"],
    ["Scope of works.docx", "164 KB", "Latest"],
    ["Engineering report.pdf", "920 KB", "v2"],
  ];
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[8.5px] tracking-[0.16em] uppercase text-text-dim mb-0.5">
            Documents
          </div>
          <div className="text-[14px] font-semibold text-text">Project workspace</div>
        </div>
        <span className="px-1.5 py-0.5 border border-border-accent rounded-sm text-[8px] tracking-[0.14em] uppercase text-accent">
          v3
        </span>
      </div>
      <div className="rounded-sm border border-border-subtle overflow-hidden">
        {rows.map(([name, size, status], i) => (
          <div
            key={name}
            className={cn(
              "flex items-center gap-2 px-2.5 py-2 text-[11px]",
              i < rows.length - 1 && "border-b border-border-subtle",
            )}
          >
            <span className="size-4 rounded-[2px] bg-[rgba(0,212,200,0.12)] border border-border-accent/40 inline-flex items-center justify-center text-[7px] text-accent-light shrink-0">
              ▣
            </span>
            <span className="flex-1 truncate text-text font-medium">{name}</span>
            <span className="text-text-dim font-mono text-[9px] tabular-nums shrink-0">
              {size}
            </span>
            <span
              className={cn(
                "shrink-0 text-[8.5px] tracking-[0.12em] uppercase",
                status === "Latest" ? "text-accent-light" : "text-warning",
              )}
            >
              {status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MobileCompareMini() {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[8.5px] tracking-[0.16em] uppercase text-text-dim mb-0.5">
            3 tenders · ranked
          </div>
          <div className="text-[14px] font-semibold text-text">Side-by-side</div>
        </div>
        <span className="px-1.5 py-0.5 border border-border-accent rounded-sm text-[8px] tracking-[0.14em] uppercase text-accent">
          Comparing
        </span>
      </div>
      <div className="space-y-2">
        <MobileCompareCard
          initials="JS"
          name="Smith Builders"
          price="$1.78M"
          duration="26w"
          completeness={100}
          badge="Best value"
          highlight
        />
        <MobileCompareCard
          initials="AC"
          name="Chen Construction"
          price="$1.91M"
          duration="30w"
          completeness={88}
        />
      </div>
    </div>
  );
}

function MiniKpi({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: string;
  tone?: "muted" | "accent";
}) {
  return (
    <div className="rounded-sm border border-border-subtle bg-[rgba(255,255,255,0.018)] px-2 py-2">
      <div className="text-[7.5px] tracking-[0.18em] uppercase text-text-dim mb-1">
        {label}
      </div>
      <div
        className={cn(
          "font-display tabular-nums leading-none",
          tone === "accent" ? "text-accent-light" : "text-text",
        )}
        style={{ fontSize: 15 }}
      >
        {value}
      </div>
    </div>
  );
}

function MiniTenderRow({
  initials,
  name,
  price,
  delta,
  highlight = false,
}: {
  initials: string;
  name: string;
  price: string;
  delta: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2.5 py-2 rounded-sm border",
        highlight
          ? "border-border-accent/55 bg-[rgba(0,212,200,0.05)]"
          : "border-border-subtle bg-[rgba(255,255,255,0.018)]",
      )}
    >
      <span
        className="size-6 rounded-full flex items-center justify-center text-[9px] font-bold border border-border-accent text-accent-light shrink-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(0,212,200,0.30), rgba(26,95,212,0.30))",
        }}
      >
        {initials}
      </span>
      <span
        className="min-w-0 flex-1 truncate text-[11px] font-semibold text-text"
        dangerouslySetInnerHTML={{ __html: name }}
      />
      <span
        className={cn(
          "shrink-0 font-display tabular-nums leading-none",
          highlight ? "text-accent-light" : "text-text",
        )}
        style={{ fontSize: 13 }}
      >
        {price}
      </span>
      <span
        className={cn(
          "shrink-0 text-[9px] tabular-nums",
          highlight ? "text-accent-light/80" : "text-text-dim",
        )}
      >
        {delta}
      </span>
    </div>
  );
}

function MobileCompareCard({
  initials,
  name,
  price,
  duration,
  completeness,
  badge,
  highlight = false,
}: {
  initials: string;
  name: string;
  price: string;
  duration: string;
  completeness: number;
  badge?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-sm border p-2.5",
        highlight
          ? "border-border-accent/60 bg-[linear-gradient(160deg,rgba(0,212,200,0.10),rgba(6,18,30,0.78))]"
          : "border-border-subtle bg-[rgba(255,255,255,0.018)]",
      )}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="size-7 rounded-full flex items-center justify-center text-[10px] font-bold border border-border-accent text-accent-light shrink-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(0,212,200,0.30), rgba(26,95,212,0.30))",
          }}
        >
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-text truncate">
              {name}
            </span>
            {badge ? (
              <span className="inline-flex items-center px-1 py-0.5 rounded-sm border border-border-accent bg-accent-muted/40 text-[7px] tracking-[0.14em] uppercase text-accent-light font-semibold">
                {badge}
              </span>
            ) : null}
          </div>
          <div className="text-[9px] text-text-dim">ABN ✓ · Licence ✓ · {duration}</div>
        </div>
        <div
          className={cn(
            "shrink-0 font-display tabular-nums leading-none",
            highlight ? "text-accent-light" : "text-text",
          )}
          style={{ fontSize: 15 }}
        >
          {price}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <div className="flex-1 h-[3px] rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
          <span
            className={cn(
              "block h-full rounded-full",
              completeness >= 90 ? "bg-accent" : "bg-warning",
            )}
            style={{ width: `${completeness}%` }}
          />
        </div>
        <span
          className={cn(
            "text-[9px] tabular-nums",
            completeness >= 90 ? "text-accent-light" : "text-warning",
          )}
        >
          {completeness}%
        </span>
      </div>
    </div>
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

function DashboardShell({
  children,
  active = "Tenders",
}: {
  children: React.ReactNode;
  active?: string;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr]">
      <Sidebar active={active} />
      <div className="p-5 lg:p-7">{children}</div>
    </div>
  );
}

/**
 * Sidebar mock — mirrors the actual owner-side app shell. The active
 * highlight matches whichever dashboard tab is being shown so the
 * route context reads as honest.
 */
function Sidebar({ active = "Tenders" }: { active?: string }) {
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
        {["Dashboard", "Projects", "Tenders", "Messages", "Settings"].map(
          (label) => {
            const isActive = label === active;
            return (
              <span
                key={label}
                className={cn(
                  "px-3 py-2 rounded-sm text-[12px] transition-colors",
                  isActive
                    ? "bg-[rgba(0,212,200,0.06)] text-accent-light"
                    : "text-text-muted",
                )}
              >
                {label}
              </span>
            );
          },
        )}
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

// 1. Live tender tracking — mirrors /owner/projects/[slug]/tenders
//
// Two stacked surfaces from the real product:
//   • ProjectPulseHeader (5-tile KPI strip + price-distribution
//     sparkline) — the "what's happening with my project, in 5
//     seconds" view that owners land on after publish.
//   • A compact tender list with verification chips, recommendation
//     badges, median-delta pills.
function DashboardTracking() {
  return (
    <DashboardShell active="Tenders">
      <DashboardHeader
        eyebrow="Niddrie Townhouse · 3 tenders received"
        title="Compare & decide"
        badge="Comparing"
      />

      {/* Project pulse — same five tiles + sparkline as the real page. */}
      <div className="rounded-sm border border-border-subtle bg-[linear-gradient(180deg,rgba(10,28,44,0.55),rgba(6,18,30,0.78))] overflow-hidden mb-5">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle/60">
          <span className="size-5 rounded-sm border border-border-accent/35 bg-[rgba(0,212,200,0.06)] text-accent-light flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="text-[9px] tracking-[0.18em] uppercase text-accent font-medium">
            Project pulse
          </span>
        </div>
        <div className="grid grid-cols-5 divide-x divide-border-subtle/60">
          <PulseTile label="Tenders" value="3" sub="2 unique" />
          <PulseTile label="Median" value="$1.86M" sub="$1.78M – $1.91M" />
          <PulseTile
            label="Spread"
            value="7%"
            sub="Tight, agreement"
            tone="accent"
          />
          <PulseTile
            label="Verified"
            value="100%"
            sub="ABN + Licence"
            tone="accent"
          />
          <PulseTile label="Latest" value="2h ago" sub="Live 2d" />
        </div>
        <div className="px-4 py-3 border-t border-border-subtle/60">
          <div className="text-[8.5px] tracking-[0.18em] uppercase text-text-dim mb-2">
            Price distribution
          </div>
          <PriceDistributionRail />
        </div>
      </div>

      {/* Compact tender list — same chips + recommendation badges as
          the real comparison cards, rendered as rows for the showcase
          (a 3-col grid here would be too cramped). */}
      <div className="space-y-2">
        <TenderRow
          initials="JS"
          builder="Smith Builders"
          chips={["ABN ✓", "Licence ✓", "12y trading", "Won 3 on BHQ"]}
          badge="Best value"
          price="$1.78M"
          medianDelta="-4% median"
          duration="26w"
          completeness={100}
          highlight
        />
        <TenderRow
          initials="AC"
          builder="Chen Construction"
          chips={["ABN ✓", "Licence ✓", "8y trading"]}
          price="$1.91M"
          medianDelta="+3% median"
          duration="30w"
          completeness={88}
        />
        <TenderRow
          initials="MR"
          builder="Roberts & Co"
          chips={["ABN ✓", "Licence ✓", "15y trading"]}
          price="$1.88M"
          medianDelta="+1% median"
          duration="28w"
          completeness={75}
        />
      </div>
    </DashboardShell>
  );
}

// Pulse tile — single column on the strip up top.
function PulseTile({
  label,
  value,
  sub,
  tone = "muted",
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "muted" | "accent";
}) {
  return (
    <div className="px-3 py-3.5">
      <div className="text-[8.5px] tracking-[0.18em] uppercase text-text-dim mb-1">
        {label}
      </div>
      <div
        className={cn(
          "font-display tabular-nums leading-none",
          tone === "accent" ? "text-accent-light" : "text-text",
        )}
        style={{ fontSize: 18 }}
      >
        {value}
      </div>
      <div className="text-[10px] text-text-dim mt-1 truncate">{sub}</div>
    </div>
  );
}

// Mini price-distribution sparkline — three ticks on a rail with the
// median marker centred. Same language as the real product.
function PriceDistributionRail() {
  return (
    <div className="relative h-7">
      <div className="absolute inset-x-0 top-1/2 h-px bg-border-subtle -translate-y-1/2" />
      <div
        className="absolute top-1/2 h-px bg-accent/40 -translate-y-1/2"
        style={{ left: 0, width: "50%" }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-px h-3.5 bg-text"
        style={{ left: "50%" }}
      />
      <span className="absolute left-0 -bottom-0.5 text-[8.5px] text-text-dim tabular-nums">
        $1.78M
      </span>
      <span className="absolute right-0 -bottom-0.5 text-[8.5px] text-text-dim tabular-nums">
        $1.91M
      </span>
      {[15, 50, 85].map((pct, idx) => (
        <span
          key={idx}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-2 rounded-full bg-accent border border-border-accent shadow-[0_0_0_2px_rgba(0,212,200,0.20)]"
          style={{ left: `${pct}%` }}
        />
      ))}
    </div>
  );
}

// Tender row — compact horizontal version of the real TenderCard.
// All the same signals are present (verification chips, recommendation
// badge, median delta, completeness) but laid out as a single line so
// three rows fit naturally in the showcase frame.
function TenderRow({
  initials,
  builder,
  chips,
  badge,
  price,
  medianDelta,
  duration,
  completeness,
  highlight = false,
}: {
  initials: string;
  builder: string;
  chips: string[];
  badge?: string;
  price: string;
  medianDelta: string;
  duration: string;
  completeness: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-sm border px-4 py-3 transition-colors",
        highlight
          ? "border-border-accent/55 bg-[rgba(0,212,200,0.05)]"
          : "border-border-subtle bg-[rgba(255,255,255,0.018)]",
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className="size-9 rounded-full flex items-center justify-center text-[11px] font-bold border border-border-accent text-accent-light shrink-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(0,212,200,0.30), rgba(26,95,212,0.30))",
          }}
        >
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12.5px] font-semibold text-text truncate">
              {builder}
            </span>
            {badge ? (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm border border-border-accent bg-accent-muted/40 text-[8.5px] tracking-[0.16em] uppercase text-accent-light font-semibold">
                {badge}
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {chips.map((c) => (
              <span
                key={c}
                className="text-[9px] tracking-[0.06em] uppercase px-1.5 py-0.5 rounded-sm border border-border-subtle bg-[rgba(255,255,255,0.022)] text-text-dim"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div
            className={cn(
              "font-display tabular-nums leading-none",
              highlight ? "text-accent-light" : "text-text",
            )}
            style={{ fontSize: 20 }}
          >
            {price}
          </div>
          <div
            className={cn(
              "mt-1 text-[9.5px] tabular-nums",
              highlight ? "text-accent-light/80" : "text-text-dim",
            )}
          >
            {medianDelta} · {duration}
          </div>
        </div>
      </div>
      {/* Completeness bar — same UX as the real TenderCard */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-[8.5px] tracking-[0.18em] uppercase text-text-dim">
          Completeness
        </span>
        <div className="flex-1 h-[3px] rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
          <span
            className={cn(
              "block h-full rounded-full",
              completeness >= 90
                ? "bg-accent"
                : completeness >= 60
                  ? "bg-warning"
                  : "bg-danger",
            )}
            style={{ width: `${completeness}%` }}
          />
        </div>
        <span
          className={cn(
            "text-[10px] tabular-nums",
            completeness >= 90
              ? "text-accent-light"
              : completeness >= 60
                ? "text-warning"
                : "text-danger",
          )}
        >
          {completeness}%
        </span>
      </div>
    </div>
  );
}

// 2. One workspace per project — same documents-list view owners
// land on inside a project. Sidebar context is "Projects" since
// they're inside the project workspace, not the tenders page.
function DashboardWorkspace() {
  return (
    <DashboardShell active="Projects">
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

// 3. Side-by-side compare — full TenderCard mock per column
//
// Mirrors the real TenderCard component on the comparison page:
// recommendation banner, builder identity, trust chips, status pill,
// big price + median-delta pill, stats grid (Duration / Start /
// Expires), completeness bar, action buttons, doc-count footer.
//
// All three columns kept on the same vertical rhythm (every row
// matches across cards — no jumpy alignment).
function DashboardCompare() {
  return (
    <DashboardShell active="Tenders">
      <DashboardHeader
        eyebrow="Niddrie Townhouse · 3 tenders · sorted by price"
        title="Compare side-by-side"
        badge="Comparing"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <TenderCardMock
          initials="JS"
          company="Smith Builders"
          person="Jordan Smith"
          recommendation="Best value"
          status="Submitted"
          chips={[
            ["ABN verified", "ok"],
            ["Licence verified", "ok"],
            ["12y trading", "muted"],
            ["Won 3 on BHQ", "accent"],
          ]}
          price="$1.78M"
          priceTone="lowest"
          medianDelta="-4% below median"
          duration="26w"
          start="Jul 2026"
          expires="14d"
          completeness={100}
          missing="All sections complete"
          docs={4}
          highlight
        />
        <TenderCardMock
          initials="AC"
          company="Chen Construction"
          person="Alex Chen"
          status="Shortlisted"
          chips={[
            ["ABN verified", "ok"],
            ["Licence verified", "ok"],
            ["8y trading", "muted"],
          ]}
          price="$1.91M"
          medianDelta="+3% above median"
          duration="30w"
          start="Jul 2026"
          expires="9d"
          completeness={88}
          missing="Missing: Pitch"
          docs={3}
        />
        <TenderCardMock
          initials="MR"
          company="Roberts & Co"
          person="Mia Roberts"
          status="Submitted"
          chips={[
            ["ABN verified", "ok"],
            ["Licence verified", "ok"],
            ["15y trading", "muted"],
          ]}
          price="$1.88M"
          medianDelta="+1% above median"
          duration="28w"
          start="Aug 2026"
          expires="11d"
          completeness={75}
          missing="Missing: Pitch · Documents"
          docs={1}
        />
      </div>
    </DashboardShell>
  );
}

// Marketing-side mock of the real TenderCard. Visually identical to
// what owners see on /owner/projects/[slug]/tenders so the showcase
// promises what it delivers.
function TenderCardMock({
  initials,
  company,
  person,
  recommendation,
  status,
  chips,
  price,
  priceTone = "default",
  medianDelta,
  duration,
  start,
  expires,
  completeness,
  missing,
  docs,
  highlight = false,
}: {
  initials: string;
  company: string;
  person: string;
  recommendation?: string;
  status: "Submitted" | "Shortlisted" | "Awarded" | "Rejected";
  chips: Array<[string, "ok" | "muted" | "accent"]>;
  price: string;
  priceTone?: "default" | "lowest";
  medianDelta: string;
  duration: string;
  start: string;
  expires: string;
  completeness: number;
  missing: string;
  docs: number;
  highlight?: boolean;
}) {
  const statusCls = (() => {
    switch (status) {
      case "Shortlisted":
        return "border-[rgba(126,245,237,0.55)] bg-[rgba(126,245,237,0.10)] text-accent-light";
      case "Awarded":
        return "border-[rgba(126,245,237,0.70)] bg-[rgba(126,245,237,0.18)] text-accent-light";
      case "Rejected":
        return "border-[rgba(255,120,120,0.40)] bg-[rgba(255,120,120,0.06)] text-[rgba(255,160,160,0.95)]";
      default:
        return "border-border-accent bg-accent-muted/40 text-accent-light";
    }
  })();

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md border p-4 shadow-[0_14px_36px_-22px_rgba(0,0,0,0.55)]",
        highlight
          ? "border-border-accent/60 bg-[linear-gradient(160deg,rgba(0,212,200,0.10),rgba(6,18,30,0.78))]"
          : "border-border-subtle bg-[linear-gradient(180deg,rgba(10,28,44,0.55),rgba(6,18,30,0.78))]",
      )}
    >
      {highlight ? (
        <span
          aria-hidden
          className="pointer-events-none absolute -top-12 -right-12 size-44 rounded-full opacity-50"
          style={{
            background:
              "radial-gradient(circle, rgba(0,212,200,0.30), transparent 70%)",
          }}
        />
      ) : null}

      <div className="relative">
        {/* Reserved-height recommendation slot so card rows align */}
        <div className="h-[24px] mb-2 flex items-center">
          {recommendation ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm border border-border-accent bg-accent-muted/40 text-[9px] tracking-[0.16em] uppercase text-accent-light font-semibold">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3"><path d="M6 9H4.5a2.5 2.5 0 010-5H6m12 5h1.5a2.5 2.5 0 000-5H18M6 4h12v8a6 6 0 11-12 0V4zm6 14v4m-3 0h6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {recommendation}
            </span>
          ) : null}
        </div>

        {/* Builder identity */}
        <div className="flex items-start gap-2.5 mb-3">
          <span
            className="size-9 rounded-full flex items-center justify-center text-[11px] font-bold border border-border-accent text-accent-light shrink-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(0,212,200,0.30), rgba(26,95,212,0.30))",
            }}
          >
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-text truncate">
              {company}
            </div>
            <div className="text-[10.5px] text-text-dim truncate">
              {person}
            </div>
          </div>
        </div>

        {/* Trust chips */}
        <div className="flex flex-wrap gap-1 mb-2.5">
          {chips.map(([label, tone]) => (
            <span
              key={label}
              className={cn(
                "inline-flex items-center px-1.5 py-0.5 rounded-sm border text-[8.5px] tracking-[0.06em] uppercase",
                tone === "ok" &&
                  "border-border-accent/45 bg-[rgba(0,212,200,0.06)] text-accent-light",
                tone === "accent" &&
                  "border-border-accent/45 bg-[rgba(0,212,200,0.06)] text-accent-light",
                tone === "muted" &&
                  "border-border-subtle bg-[rgba(255,255,255,0.022)] text-text-dim",
              )}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Status pill */}
        <span
          className={cn(
            "inline-flex items-center px-1.5 py-0.5 border rounded-sm text-[8.5px] tracking-[0.16em] uppercase",
            statusCls,
          )}
        >
          {status}
        </span>

        {/* Price + median delta */}
        <div className="mt-4">
          <div className="text-[9.5px] tracking-[0.18em] uppercase text-text-dim mb-1">
            Total price
          </div>
          <div
            className={cn(
              "font-display tabular-nums leading-none",
              priceTone === "lowest" ? "text-accent-light" : "text-text",
            )}
            style={{ fontSize: 26 }}
          >
            {price}
          </div>
          <div className="mt-1.5 min-h-[18px] flex flex-wrap items-center gap-1.5">
            {priceTone === "lowest" ? (
              <span className="inline-flex items-center gap-1 text-[9.5px] tracking-[0.14em] uppercase text-accent-light">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3"><path d="M12 2v4m0 12v4M2 12h4m12 0h4M5 5l3 3m8 8l3 3M5 19l3-3m8-8l3-3" strokeLinecap="round" /></svg>
                Lowest of selected
              </span>
            ) : null}
            <span
              className={cn(
                "inline-flex items-center px-1.5 py-0.5 rounded-sm border text-[9px] tracking-[0.06em] uppercase",
                medianDelta.startsWith("-")
                  ? "border-border-accent/45 bg-[rgba(0,212,200,0.06)] text-accent-light"
                  : "border-warning/30 bg-[rgba(255,181,71,0.06)] text-warning",
              )}
            >
              {medianDelta}
            </span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="mt-4 pt-3 grid grid-cols-3 gap-2 border-t border-border-subtle/60">
          <MiniStat label="Duration" value={duration} />
          <MiniStat label="Start" value={start} />
          <MiniStat
            label="Expires"
            value={expires}
            tone={expires.endsWith("d") && parseInt(expires) <= 7 ? "warn" : "default"}
          />
        </div>

        {/* Completeness */}
        <div className="mt-3 pt-3 border-t border-border-subtle/60">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-[8.5px] tracking-[0.18em] uppercase text-text-dim">
              Completeness
            </span>
            <span
              className={cn(
                "text-[10px] tabular-nums",
                completeness >= 90
                  ? "text-accent-light"
                  : completeness >= 60
                    ? "text-warning"
                    : "text-danger",
              )}
            >
              {completeness}%
            </span>
          </div>
          <div className="h-1 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
            <span
              className={cn(
                "block h-full rounded-full",
                completeness >= 90
                  ? "bg-accent"
                  : completeness >= 60
                    ? "bg-warning"
                    : "bg-danger",
              )}
              style={{ width: `${completeness}%` }}
            />
          </div>
          <div className="mt-1 text-[9.5px] text-text-dim leading-[1.4]">
            {missing}
          </div>
        </div>

        {/* Action row */}
        <div className="mt-3 pt-3 border-t border-border-subtle/60 flex flex-wrap gap-1.5">
          <ActionPill label="Shortlist" />
          <ActionPill label="Award" tone="primary" />
          <ActionPill label="Reject" tone="danger" />
        </div>

        {/* Doc footer */}
        <div className="mt-3 pt-2 border-t border-border-subtle/60 flex items-center gap-1.5 text-[10px] text-text-dim">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-4 13l4 4-4-4z" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {docs} document{docs === 1 ? "" : "s"} attached
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warn";
}) {
  return (
    <div>
      <div className="text-[8.5px] tracking-[0.16em] uppercase text-text-dim mb-0.5">
        {label}
      </div>
      <div
        className={cn(
          "text-[12px] tabular-nums font-semibold",
          tone === "warn" ? "text-warning" : "text-text",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function ActionPill({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "primary" | "danger";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 h-7 px-2.5 rounded-sm text-[9.5px] tracking-[0.10em] uppercase border",
        tone === "primary"
          ? "border-border-accent bg-accent-muted/60 text-accent-light"
          : tone === "danger"
            ? "border-[rgba(255,120,120,0.30)] text-[rgba(255,160,160,0.95)]"
            : "border-border-subtle text-text-muted",
      )}
    >
      {label}
    </span>
  );
}

