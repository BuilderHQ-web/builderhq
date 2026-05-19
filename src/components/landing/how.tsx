"use client";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionTemplate,
  type MotionValue,
} from "motion/react";
import {
  ArrowRight,
  CheckCircle2,
  FileCheck,
  MapPin,
  ShieldCheck,
  Sparkles,
  Trophy,
  Upload,
  Wallet,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * HowItWorks — Base44-style stack-slide pinned narrative.
 *
 * The section is `500vh` tall. Inside, a `sticky top-0 h-dvh` panel
 * pins to the viewport. As the user scrolls the outer section,
 * Motion's `useScroll` returns a 0→1 progress value, and the four
 * visual cards on the right **stack-slide** through it like a deck:
 *
 *   · Card 0 sits as the base layer.
 *   · Card 1 slides UP from below (`y: 100% → 0%`) over a 10%
 *     progress window, landing on top of Card 0 and hiding it.
 *   · Card 2 slides up over Card 1.
 *   · Card 3 slides up over Card 2.
 *
 * Each card has its own opaque background (gradient + corner glow +
 * hairline sparkle), so when it lands on top it truly hides the one
 * below. Z-indices ascend with index so the stacking order is
 * deterministic. Scrolling back reverses the deck — later cards
 * slide back down off-screen, revealing the earlier ones.
 *
 * Key fix from v1: keypoints no longer use `Math.max(0, …)`. The
 * clamp created duplicate keypoints for step 0, which made
 * `useTransform` return undefined-ish values in the reverse
 * direction (so step 1 wouldn't relight on scroll-up). Now the
 * keypoint range extends naturally past the section boundaries
 * and `useTransform`'s built-in clamping handles the edges.
 *
 * Lenis (mounted at root) pipes wheel events through RAF with
 * exponential ease-out. Motion's `useScroll` reads the native
 * scrollTop Lenis writes to, so the scrub inherits Lenis's
 * smoothness automatically.
 */

const STEPS = [
  {
    n: "01",
    title: "Upload your project",
    desc: "Drag plans, scope, and survey. We extract address, type, and budget — automatically.",
  },
  {
    n: "02",
    title: "Verified builders match",
    desc: "ABN + state-register checked. Filtered by suburb, type, and capacity. No tyre-kickers.",
  },
  {
    n: "03",
    title: "Compare side-by-side",
    desc: "Median, spread, line-items. See where they agree and where they differ — at a glance.",
  },
  {
    n: "04",
    title: "Award. Build. Done.",
    desc: "One click awards the winner, opens the contract, and kicks off the build.",
  },
];

const TOTAL = STEPS.length;
/** How much of the total scroll a single card takes to slide in. */
const SLIDE_WINDOW = 0.10;

export function HowItWorks() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  return (
    <section
      ref={ref}
      id="how"
      className="relative h-[500vh] border-y border-border-subtle"
      style={{
        background:
          "linear-gradient(180deg, rgba(6,18,30,0.5), rgba(3,9,15,0.7))",
      }}
    >
      <div className="sticky top-0 h-dvh flex flex-col overflow-hidden">
        <div className="flex-1 max-w-[1320px] w-full mx-auto px-5 md:px-10 lg:px-16 grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-8 lg:gap-20 items-center pt-20 sm:pt-24 lg:pt-28 pb-12 sm:pb-16 lg:pb-20">
          {/* ── Left: header + steps ─────────────────────────────── */}
          <div className="order-2 lg:order-1 flex flex-col gap-8 lg:gap-10">
            <Header progress={scrollYProgress} />
            <StepList progress={scrollYProgress} />
          </div>

          {/* ── Right: card stack ────────────────────────────────── */}
          <div className="order-1 lg:order-2 relative w-full aspect-[4/3] sm:aspect-[5/4] lg:aspect-[4/3] rounded-2xl border border-[rgba(0,212,200,0.18)] overflow-hidden shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.05)]">
            <VisualCard index={0} progress={scrollYProgress}>
              <UploadContent />
            </VisualCard>
            <VisualCard index={1} progress={scrollYProgress}>
              <MatchContent />
            </VisualCard>
            <VisualCard index={2} progress={scrollYProgress}>
              <CompareContent />
            </VisualCard>
            <VisualCard index={3} progress={scrollYProgress}>
              <AwardContent />
            </VisualCard>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Header (section title + progress bar) ─────────────────────────

function Header({ progress }: { progress: MotionValue<number> }) {
  const fillWidth = useMotionTemplate`${useTransform(progress, [0, 1], [0, 100])}%`;

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <span className="inline-flex items-center gap-2.5 text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-medium">
        <span className="relative flex size-1.5">
          <span className="absolute inset-0 rounded-full bg-accent opacity-75 animate-ping" />
          <span className="relative size-1.5 rounded-full bg-accent shadow-[0_0_10px_rgba(0,212,200,0.8)]" />
        </span>
        How BuilderHQ works
      </span>

      <h2 className="font-display uppercase tracking-[-0.014em] leading-[0.9] text-[clamp(2.25rem,4.5vw+0.75rem,4.25rem)] text-text">
        From plans to{" "}
        <span
          className="text-accent-light"
          style={{
            textShadow:
              "0 0 60px rgba(0,212,200,0.32), 0 0 120px rgba(0,212,200,0.12)",
          }}
        >
          builder
        </span>
        .
        <span className="block text-text">In days, not months.</span>
      </h2>

      <p className="text-[14.5px] sm:text-[15px] leading-[1.65] text-text-subtle max-w-[28rem]">
        Four steps, modelled on how Australian residential projects actually
        tender. Scroll to walk through.
      </p>

      <div className="relative h-px w-full bg-[rgba(255,255,255,0.08)] max-w-[22rem] mt-1">
        <motion.span
          className="absolute inset-y-0 left-0 bg-accent"
          style={{
            width: fillWidth,
            boxShadow: "0 0 12px rgba(0,212,200,0.55)",
          }}
        />
      </div>
    </div>
  );
}

// ── Step list ─────────────────────────────────────────────────────

function StepList({ progress }: { progress: MotionValue<number> }) {
  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {STEPS.map((step, i) => (
        <Step key={i} index={i} progress={progress} {...step} />
      ))}
    </div>
  );
}

function Step({
  index,
  progress,
  n,
  title,
  desc,
}: {
  index: number;
  progress: MotionValue<number>;
  n: string;
  title: string;
  desc: string;
}) {
  const start = index / TOTAL;
  const end = (index + 1) / TOTAL;
  const buffer = 0.05;

  // NO Math.max(0, ...) clamping — keypoints extend cleanly past the
  // section bounds. `useTransform` clamps to the first/last value
  // outside the range, which is exactly what we want.
  const opacity = useTransform(
    progress,
    [start - buffer, start, end, end + buffer],
    [0.3, 1, 1, 0.3],
  );
  const badgeOpacity = useTransform(
    progress,
    [start - buffer, start, end, end + buffer],
    [0, 1, 1, 0],
  );

  return (
    <motion.div
      style={{ opacity }}
      className="flex items-start gap-4 sm:gap-5"
    >
      <div className="relative shrink-0">
        {/* Inactive badge — outline */}
        <span className="size-10 sm:size-11 rounded-full border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.025)] flex items-center justify-center text-[11px] sm:text-[12px] tracking-[0.04em] font-ui font-semibold text-text-muted">
          {n}
        </span>
        {/* Active badge — filled teal with halo */}
        <motion.span
          aria-hidden
          style={{ opacity: badgeOpacity }}
          className="absolute inset-0 size-10 sm:size-11 rounded-full bg-accent text-[11px] sm:text-[12px] tracking-[0.04em] font-ui font-semibold text-accent-contrast flex items-center justify-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3),0_0_0_1px_rgba(0,212,200,0.45),0_0_28px_-2px_rgba(0,212,200,0.65)]"
        >
          {n}
        </motion.span>
      </div>

      <div className="flex-1 min-w-0 pt-1">
        <h3 className="font-ui font-semibold text-[17px] sm:text-[19px] tracking-[-0.008em] text-text leading-[1.25]">
          {title}
        </h3>
        <p className="mt-1.5 text-[13px] sm:text-[13.5px] text-text-muted leading-[1.55]">
          {desc}
        </p>
      </div>
    </motion.div>
  );
}

// ── Visual card (stack-slide) ─────────────────────────────────────

/**
 * Stack-slide card. Each card occupies the full canvas and slides
 * up from below (`y: 100% → 0%`) over a fixed-width progress
 * window that ends just as the card's step index becomes "current".
 * Higher-index cards have higher z-index so they cover the cards
 * beneath when they land.
 *
 * Card 0's slide window is `[-0.10, 0]` — entirely before scroll
 * starts — so it's already in its resting position when the user
 * arrives. That's deliberate; we don't want a "card 0 slides in"
 * gesture on page load, just the subsequent cards stacking on top.
 */
function VisualCard({
  index,
  progress,
  children,
}: {
  index: number;
  progress: MotionValue<number>;
  children: React.ReactNode;
}) {
  const slideEnd = index / TOTAL;
  const slideStart = slideEnd - SLIDE_WINDOW;

  // For index 0 the slide window is negative, so at progress=0 the
  // card is already past its slide-in and sits at y=0. For higher
  // indices the card sits off-screen below (y=100%) until scroll
  // enters its slide window, then animates up.
  const y = useTransform(
    progress,
    [slideStart, slideEnd],
    ["100%", "0%"],
  );

  // Subtle settle: cards finish with a tiny inset shadow scale that
  // tucks them into the stack visually. Done via a separate opacity
  // on a top-edge highlight that fades in at landing.
  const settleOpacity = useTransform(
    progress,
    [slideStart, slideEnd - 0.005, slideEnd, 1],
    [0, 0, 1, 1],
  );

  return (
    <motion.div
      style={{
        y,
        zIndex: index + 1,
        background:
          "linear-gradient(180deg, rgba(0,212,200,0.045), rgba(6,18,30,0.7))",
      }}
      className="absolute inset-0 overflow-hidden p-5 sm:p-7 lg:p-10 flex items-center justify-center"
    >
      {/* Corner glow — same language as PulseTile. */}
      <span
        aria-hidden
        className="absolute -top-24 -right-24 size-96 rounded-full opacity-60 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(0,212,200,0.22), transparent 70%)",
        }}
      />
      {/* Top-edge hairline that fades in on landing. */}
      <motion.span
        aria-hidden
        style={{ opacity: settleOpacity }}
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent"
      />
      {/* Step-index chip in the corner — orienting affordance. */}
      <span className="absolute top-4 left-4 sm:top-5 sm:left-5 text-[9.5px] tracking-[0.22em] uppercase text-text-faint font-ui font-semibold">
        {STEPS[index]?.n} / {String(TOTAL).padStart(2, "0")}
      </span>

      <div className="relative w-full max-w-md">{children}</div>
    </motion.div>
  );
}

// ── Card content — Upload ─────────────────────────────────────────

function UploadContent() {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.18em] uppercase text-text-dim font-ui font-medium">
          <MapPin size={10} strokeWidth={2} />
          Brunswick · VIC
        </span>
        <span className="text-[10px] tracking-[0.18em] uppercase text-accent font-ui font-medium">
          Single dwelling
        </span>
      </div>

      <div className="rounded-xl border border-dashed border-[rgba(0,212,200,0.3)] bg-[rgba(0,212,200,0.04)] p-4 sm:p-5 flex flex-col items-center gap-1">
        <div className="size-9 rounded-full bg-[rgba(0,212,200,0.10)] flex items-center justify-center text-accent-light">
          <Upload size={15} strokeWidth={2} />
        </div>
        <p className="text-[12.5px] text-text font-ui font-semibold mt-1">
          Drop your plans + scope
        </p>
        <p className="text-[10.5px] text-text-dim">
          PDF, DWG, DOC · up to 50 MB
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <FileChip name="architectural-plans-v3.pdf" size="12.4 MB" />
        <FileChip name="site-survey.pdf" size="2.1 MB" />
        <FileChip name="scope-of-works.docx" size="188 KB" />
      </div>

      <div className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.025)] px-3.5 py-2.5">
        <div className="flex items-center gap-1.5 text-[9.5px] tracking-[0.18em] uppercase text-accent-light font-ui font-semibold mb-1.5">
          <Sparkles size={10} strokeWidth={2.4} />
          Auto-extracted
        </div>
        <p className="text-[11.5px] text-text-muted leading-[1.5]">
          45 Sydney Rd, Brunswick VIC · Land 450 m² · Budget $500k–$750k
        </p>
      </div>
    </div>
  );
}

function FileChip({ name, size }: { name: string; size: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
      <div className="flex items-center gap-2.5 min-w-0">
        <FileCheck size={13} strokeWidth={2} className="text-accent-light shrink-0" />
        <span className="text-[11.5px] text-text font-ui truncate">{name}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] text-text-dim font-mono tabular-nums">{size}</span>
        <CheckCircle2 size={12} strokeWidth={2.2} className="text-accent-light" />
      </div>
    </div>
  );
}

// ── Card content — Match ──────────────────────────────────────────

function MatchContent() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] tracking-[0.18em] uppercase text-text-dim font-ui font-medium">
          3 verified builders matched
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] tracking-[0.18em] uppercase text-accent font-ui font-medium">
          <span className="relative flex size-1.5">
            <span className="absolute inset-0 rounded-full bg-accent opacity-75 animate-ping" />
            <span className="relative size-1.5 rounded-full bg-accent" />
          </span>
          Live
        </span>
      </div>

      <BuilderCard
        initials="AB"
        gradient="from-[#00d4c8] to-[#1a5fd4]"
        name="Atlas Build Co"
        area="Inner West VIC · 6 km"
        badge="verified"
        stats="5 active · 95% on-time"
      />
      <BuilderCard
        initials="NB"
        gradient="from-[#7ef5ed] to-[#00d4c8]"
        name="Northline Builders"
        area="Brunswick · 4 km"
        badge="verified"
        stats="12 won · 100% on-time"
      />
      <BuilderCard
        initials="HG"
        gradient="from-[#1a5fd4] to-[#7ef5ed]"
        name="Heritage Group"
        area="CBD + North · 8 km"
        badge="founding"
        stats="Founding builder"
      />
    </div>
  );
}

function BuilderCard({
  initials,
  gradient,
  name,
  area,
  badge,
  stats,
}: {
  initials: string;
  gradient: string;
  name: string;
  area: string;
  badge: "verified" | "founding";
  stats: string;
}) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.025)]">
      <div
        className={cn(
          "size-9 sm:size-10 rounded-full bg-gradient-to-br flex items-center justify-center text-[11px] sm:text-[12px] font-bold text-accent-contrast shrink-0",
          gradient,
        )}
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[12.5px] sm:text-[13px] font-ui font-semibold text-text truncate">
            {name}
          </span>
          {badge === "verified" ? (
            <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-sm border border-border-accent/40 bg-accent-muted/40 text-[8px] tracking-[0.10em] uppercase text-accent-light">
              <ShieldCheck size={8} strokeWidth={2.4} />
              ABN+L
            </span>
          ) : (
            <span className="inline-flex items-center px-1 py-0.5 rounded-sm border border-warning/40 bg-[rgba(251,184,64,0.10)] text-[8px] tracking-[0.10em] uppercase text-warning">
              Founding
            </span>
          )}
        </div>
        <p className="text-[10px] sm:text-[10.5px] text-text-dim mt-0.5 truncate">
          {area} · {stats}
        </p>
      </div>
    </div>
  );
}

// ── Card content — Compare ────────────────────────────────────────

function CompareContent() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] tracking-[0.18em] uppercase text-text-dim font-ui font-medium">
          Tender comparison · 3 received
        </span>
        <span className="text-[10px] tracking-[0.18em] uppercase text-accent font-ui font-medium">
          Median $1.86M
        </span>
      </div>

      <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.025)] p-3.5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[9.5px] tracking-[0.18em] uppercase text-text-dim">
            Price distribution
          </span>
          <span className="text-[10px] text-accent-light font-ui font-semibold">
            7% spread · tight
          </span>
        </div>
        <div className="relative h-1.5 rounded-full bg-[rgba(255,255,255,0.05)]">
          <div className="absolute inset-y-0 left-[8%] right-[16%] rounded-full bg-gradient-to-r from-[rgba(0,212,200,0.25)] via-accent/80 to-[rgba(0,212,200,0.25)]" />
          <span className="absolute top-1/2 -translate-y-1/2 left-[8%] -translate-x-1/2 size-2.5 rounded-full bg-accent shadow-[0_0_8px_rgba(0,212,200,0.8)]" />
          <span className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 size-3.5 rounded-full bg-accent border-2 border-[rgba(6,18,30,1)] shadow-[0_0_14px_rgba(0,212,200,1)]" />
          <span className="absolute top-1/2 -translate-y-1/2 right-[16%] translate-x-1/2 size-2.5 rounded-full bg-accent shadow-[0_0_8px_rgba(0,212,200,0.8)]" />
        </div>
        <div className="flex items-center justify-between mt-2 text-[10px] tabular-nums">
          <span className="text-text-dim font-mono">$1.78M</span>
          <span className="text-accent-light font-mono font-semibold">
            $1.86M ←
          </span>
          <span className="text-text-dim font-mono">$1.91M</span>
        </div>
      </div>

      <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.025)] overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-3.5 py-2 border-b border-[rgba(255,255,255,0.04)] items-center bg-[rgba(255,255,255,0.012)]">
          <span />
          <span className="text-[9px] tracking-[0.10em] uppercase text-text-dim font-ui w-12 text-right">AB</span>
          <span className="text-[9px] tracking-[0.10em] uppercase text-accent-light font-ui w-12 text-right">NB</span>
          <span className="text-[9px] tracking-[0.10em] uppercase text-text-dim font-ui w-12 text-right">HG</span>
        </div>
        <ComparisonRow label="ABN + Licence" values={["✓", "✓", "✓"]} highlight={1} accent />
        <ComparisonRow label="Start date" values={["Sep 26", "Sep 26", "Oct 26"]} highlight={1} />
        <ComparisonRow label="Validity" values={["28d", "30d", "25d"]} highlight={1} />
        <ComparisonRow label="Allowances" values={["3", "5", "2"]} highlight={1} />
      </div>
    </div>
  );
}

function ComparisonRow({
  label,
  values,
  highlight,
  accent,
}: {
  label: string;
  values: string[];
  highlight?: number;
  accent?: boolean;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-3.5 py-2 border-b border-[rgba(255,255,255,0.04)] last:border-b-0 items-center">
      <span className="text-[10px] tracking-[0.12em] uppercase text-text-dim font-ui">
        {label}
      </span>
      {values.map((v, i) => (
        <span
          key={i}
          className={cn(
            "text-[11px] font-mono tabular-nums w-12 text-right",
            i === highlight ? "text-accent-light font-semibold" : "text-text",
            accent && "text-accent-light",
          )}
        >
          {v}
        </span>
      ))}
    </div>
  );
}

// ── Card content — Award ──────────────────────────────────────────

function AwardContent() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] tracking-[0.18em] uppercase text-text-dim font-ui font-medium">
          Decision made
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] tracking-[0.18em] uppercase text-accent font-ui font-medium">
          <Trophy size={10} strokeWidth={2.4} />
          Awarded
        </span>
      </div>

      <div
        className="relative rounded-xl border border-[rgba(0,212,200,0.45)] p-4 overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,212,200,0.10), rgba(6,18,30,0.6))",
        }}
      >
        <span
          aria-hidden
          className="absolute -top-14 -right-14 size-44 rounded-full opacity-55 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(0,212,200,0.32), transparent 70%)",
          }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent"
        />

        <div className="relative flex items-start gap-3">
          <div className="size-12 rounded-full bg-gradient-to-br from-[#7ef5ed] to-[#00d4c8] flex items-center justify-center text-[13px] font-bold text-accent-contrast shrink-0 shadow-[0_0_0_2px_rgba(0,212,200,0.35)]">
            NB
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[14px] font-ui font-semibold text-text">
                Northline Builders
              </span>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm border border-border-accent bg-accent-muted/40 text-[8.5px] tracking-[0.10em] uppercase text-accent-light">
                <Trophy size={8} strokeWidth={2.4} />
                Winner
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-text-muted">
              <Wallet size={10} strokeWidth={2} className="text-accent-light" />
              <span className="font-mono tabular-nums text-text font-semibold">
                $1.86M
              </span>
              <span className="text-text-faint">·</span>
              <span>30d validity</span>
              <span className="text-text-faint">·</span>
              <span>Sep 26 start</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.025)] p-3.5">
        <span className="text-[9.5px] tracking-[0.18em] uppercase text-text-dim font-ui font-semibold mb-3 block">
          Next steps
        </span>
        <div className="flex flex-col gap-2.5">
          <TimelineRow status="done" text="Tender awarded · 12:32 PM" />
          <TimelineRow status="active" text="Contract drafting" />
          <TimelineRow status="pending" text="Site visit · scheduled" />
          <TimelineRow status="pending" text="Build kick-off · TBD" />
        </div>
      </div>
    </div>
  );
}

function TimelineRow({
  status,
  text,
}: {
  status: "done" | "active" | "pending";
  text: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          "size-4 rounded-full flex items-center justify-center shrink-0",
          status === "done" &&
            "bg-accent text-accent-contrast shadow-[0_0_8px_rgba(0,212,200,0.6)]",
          status === "active" &&
            "border border-accent bg-accent-muted/40",
          status === "pending" &&
            "border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.02)]",
        )}
      >
        {status === "done" ? (
          <CheckCircle2 size={10} strokeWidth={2.4} />
        ) : status === "active" ? (
          <span className="size-1.5 rounded-full bg-accent animate-pulse" />
        ) : null}
      </span>
      <span
        className={cn(
          "text-[11.5px] font-ui",
          status === "done" || status === "active"
            ? "text-text"
            : "text-text-dim",
        )}
      >
        {text}
      </span>
      {status === "active" ? (
        <ArrowRight
          size={11}
          strokeWidth={2}
          className="text-accent-light ml-auto"
        />
      ) : null}
    </div>
  );
}
