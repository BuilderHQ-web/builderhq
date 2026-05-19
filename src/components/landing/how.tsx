"use client";

import { useEffect, useRef } from "react";
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
 * HowItWorks v5 — Base44-style layout.
 *
 * Layout (desktop)
 * ────────────────
 *   Sticky pinned panel filling the viewport. Three vertical zones:
 *
 *     · TOP    — section heading, centred. Kicker + display headline.
 *     · MIDDLE — card stack centred horizontally. Numbered progress
 *                rail floats absolute to the left of the card so the
 *                card itself stays optically centred.
 *     · The numbers light teal as the matching card becomes active.
 *
 * Layout (mobile)
 * ───────────────
 *   Same vertical zones but the number rail collapses to a compact
 *   four-dot horizontal indicator above the card. Card takes full
 *   width with safe-area padding.
 *
 * Animation
 * ─────────
 *   Pure imperative DOM mutation inside one requestAnimationFrame
 *   loop. No Motion hooks. Same approach as v4 that finally shipped
 *   without crashing in production.
 *
 *   The RAF reads section position via `getBoundingClientRect`,
 *   computes progress 0→1, then writes:
 *     · `transform: translateY(N%)` on each card (stack-slide).
 *     · `data-active` attribute on each step (CSS handles fade).
 *     · `transform: scaleX(progress)` on the progress fill rail.
 */

const STEPS = [
  {
    n: "01",
    title: "Upload your project",
    desc: "Drop your plans. We pull the address and budget for you.",
  },
  {
    n: "02",
    title: "Verified builders match",
    desc: "Real builders. ABN and licence checked. No tyre-kickers.",
  },
  {
    n: "03",
    title: "Compare side by side",
    desc: "Every tender lined up. Price timing scope all in one view.",
  },
  {
    n: "04",
    title: "Award the winner",
    desc: "One click. The contract opens and the build begins.",
  },
];

const TOTAL = STEPS.length;
const SLIDE_WINDOW = 0.1;

export function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const stepRefs = useRef<Array<HTMLDivElement | null>>(
    Array(TOTAL).fill(null),
  );
  const dotRefs = useRef<Array<HTMLSpanElement | null>>(
    Array(TOTAL).fill(null),
  );
  const cardRefs = useRef<Array<HTMLDivElement | null>>(
    Array(TOTAL).fill(null),
  );

  useEffect(() => {
    let raf = 0;
    let lastActive = -1;

    const update = () => {
      raf = requestAnimationFrame(update);
      const section = sectionRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      if (rect.bottom < 0 || rect.top > vh) return;

      const scrollableDist = section.offsetHeight - vh;
      if (scrollableDist <= 0) return;

      const scrolled = -rect.top;
      const progress = Math.max(0, Math.min(1, scrolled / scrollableDist));

      // Progress rail fill
      const fill = fillRef.current;
      if (fill) {
        fill.style.transform = `scaleY(${progress})`;
      }

      // Active step
      const activeIndex = Math.min(
        TOTAL - 1,
        Math.max(0, Math.floor(progress * TOTAL + 1e-6)),
      );
      if (activeIndex !== lastActive) {
        for (let i = 0; i < TOTAL; i++) {
          const step = stepRefs.current[i];
          if (step) step.dataset.active = i === activeIndex ? "true" : "false";
          const dot = dotRefs.current[i];
          if (dot) dot.dataset.active = i === activeIndex ? "true" : "false";
        }
        lastActive = activeIndex;
      }

      // Card stack-slide
      for (let i = 0; i < TOTAL; i++) {
        const card = cardRefs.current[i];
        if (!card) continue;
        const slideEnd = i / TOTAL;
        const slideStart = slideEnd - SLIDE_WINDOW;
        let y: number;
        if (progress >= slideEnd) y = 0;
        else if (progress <= slideStart) y = 100;
        else y = ((slideEnd - progress) / SLIDE_WINDOW) * 100;
        card.style.transform = `translateY(${y}%)`;
      }
    };

    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section
      ref={sectionRef}
      id="how"
      className="relative h-[500vh] border-y border-border-subtle"
      style={{
        background:
          "linear-gradient(180deg, rgba(6,18,30,0.5), rgba(3,9,15,0.7))",
      }}
    >
      <div className="sticky top-0 h-dvh flex flex-col overflow-hidden">
        {/* ── Heading at top ─────────────────────────────────────── */}
        <header className="px-5 md:px-10 pt-12 sm:pt-16 lg:pt-20 pb-6 sm:pb-8 max-w-3xl mx-auto w-full text-center">
          <span className="inline-flex items-center gap-2.5 text-[10px] tracking-[0.28em] uppercase text-accent font-ui font-semibold mb-5">
            <span className="relative flex size-1.5">
              <span className="absolute inset-0 rounded-full bg-accent opacity-75 animate-ping" />
              <span className="relative size-1.5 rounded-full bg-accent shadow-[0_0_10px_rgba(0,212,200,0.8)]" />
            </span>
            How BuilderHQ works
          </span>

          <h2 className="font-display uppercase tracking-[-0.014em] leading-[0.92] text-[clamp(2.25rem,4vw+0.75rem,4.5rem)] text-text">
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
            <span className="block">In days. Not months.</span>
          </h2>
        </header>

        {/* ── Card area + side rail ──────────────────────────────── */}
        <div className="flex-1 relative w-full max-w-[1280px] mx-auto px-5 md:px-10 pb-10 sm:pb-12 lg:pb-16 flex items-center">
          {/* Desktop: numbered rail floats absolute to the left so
              the card stays optically centred. Hidden under lg. */}
          <div className="hidden lg:flex absolute left-10 top-1/2 -translate-y-1/2 z-10">
            <NumberRail stepRefs={stepRefs} fillRef={fillRef} />
          </div>

          {/* Mobile: compact horizontal dot indicator above the card. */}
          <div className="lg:hidden absolute left-1/2 -translate-x-1/2 top-0 z-10">
            <DotIndicator dotRefs={dotRefs} />
          </div>

          {/* Card stack — centred. */}
          <div className="mx-auto w-full max-w-[640px] mt-10 lg:mt-0">
            <div className="relative w-full aspect-[5/4] sm:aspect-[5/4] rounded-2xl border border-[rgba(0,212,200,0.18)] overflow-hidden shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.05)]">
              <VisualCard
                ref={(el) => {
                  cardRefs.current[0] = el;
                }}
                index={0}
              >
                <UploadContent />
              </VisualCard>
              <VisualCard
                ref={(el) => {
                  cardRefs.current[1] = el;
                }}
                index={1}
              >
                <MatchContent />
              </VisualCard>
              <VisualCard
                ref={(el) => {
                  cardRefs.current[2] = el;
                }}
                index={2}
              >
                <CompareContent />
              </VisualCard>
              <VisualCard
                ref={(el) => {
                  cardRefs.current[3] = el;
                }}
                index={3}
              >
                <AwardContent />
              </VisualCard>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Numbered rail (desktop) ───────────────────────────────────────

function NumberRail({
  stepRefs,
  fillRef,
}: {
  stepRefs: React.RefObject<Array<HTMLDivElement | null>>;
  fillRef: React.RefObject<HTMLSpanElement | null>;
}) {
  return (
    <div className="relative flex flex-col gap-9 pl-6">
      {/* Vertical track + scroll-progress fill */}
      <span
        aria-hidden
        className="absolute left-[15px] top-2 bottom-2 w-px bg-[rgba(255,255,255,0.08)]"
      />
      <span
        ref={fillRef}
        aria-hidden
        className="absolute left-[15px] top-2 bottom-2 w-px bg-accent origin-top"
        style={{
          transform: "scaleY(0)",
          boxShadow: "0 0 12px rgba(0,212,200,0.55)",
          willChange: "transform",
        }}
      />

      {STEPS.map((step, i) => (
        <RailStep
          key={i}
          n={step.n}
          title={step.title}
          desc={step.desc}
          assignRef={(el) => {
            stepRefs.current[i] = el;
          }}
        />
      ))}
    </div>
  );
}

function RailStep({
  n,
  title,
  desc,
  assignRef,
}: {
  n: string;
  title: string;
  desc: string;
  assignRef: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div
      ref={assignRef}
      data-active="false"
      className="group relative flex items-start gap-4 pl-2 transition-opacity duration-300 ease-out opacity-[0.4] data-[active=true]:opacity-100"
    >
      {/* Number dot — outline by default, fills teal when active. */}
      <div className="relative shrink-0 -ml-6">
        <span className="size-9 rounded-full border border-[rgba(255,255,255,0.18)] bg-[#06121e] flex items-center justify-center text-[11px] tracking-[0.05em] font-ui font-semibold text-text-muted">
          {n}
        </span>
        <span
          aria-hidden
          className="absolute inset-0 size-9 rounded-full bg-accent text-[11px] tracking-[0.05em] font-ui font-semibold text-accent-contrast flex items-center justify-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3),0_0_0_1px_rgba(0,212,200,0.45),0_0_24px_-2px_rgba(0,212,200,0.7)] opacity-0 group-data-[active=true]:opacity-100 transition-opacity duration-300 ease-out"
        >
          {n}
        </span>
      </div>

      <div className="pt-1 max-w-[180px]">
        <h3 className="font-ui font-semibold text-[14px] tracking-[-0.005em] text-text leading-[1.3]">
          {title}
        </h3>
        <p className="mt-1 text-[12px] text-text-muted leading-[1.45]">
          {desc}
        </p>
      </div>
    </div>
  );
}

// ── Compact dot indicator (mobile) ────────────────────────────────

function DotIndicator({
  dotRefs,
}: {
  dotRefs: React.RefObject<Array<HTMLSpanElement | null>>;
}) {
  return (
    <div className="flex items-center gap-2 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-full px-3 py-1.5">
      {STEPS.map((step, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            ref={(el) => {
              dotRefs.current[i] = el;
            }}
            data-active="false"
            className="size-1.5 rounded-full bg-[rgba(255,255,255,0.18)] data-[active=true]:bg-accent data-[active=true]:shadow-[0_0_8px_rgba(0,212,200,0.7)] transition-colors duration-300"
          />
          {i < STEPS.length - 1 ? (
            <span className="size-0.5 rounded-full bg-[rgba(255,255,255,0.15)]" />
          ) : null}
        </div>
      ))}
      <span className="ml-1 text-[9px] tracking-[0.18em] uppercase text-text-faint font-ui font-semibold">
        {STEPS.length} steps
      </span>
    </div>
  );
}

// ── Visual card (stack-slide via DOM transform) ───────────────────

interface VisualCardProps {
  ref: (el: HTMLDivElement | null) => void;
  index: number;
  children: React.ReactNode;
}

function VisualCard({ ref, index, children }: VisualCardProps) {
  const initialY = index === 0 ? 0 : 100;
  return (
    <div
      ref={ref}
      style={{
        transform: `translateY(${initialY}%)`,
        zIndex: index + 1,
        background: "linear-gradient(180deg, #0a1f29 0%, #06121e 100%)",
        willChange: "transform",
      }}
      className="absolute inset-0 overflow-hidden p-5 sm:p-7 lg:p-8 flex flex-col"
    >
      <span
        aria-hidden
        className="absolute -top-24 -right-24 size-96 rounded-full opacity-60 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(0,212,200,0.22), transparent 70%)",
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/14 to-transparent"
      />

      <div className="relative w-full h-full flex flex-col">{children}</div>
    </div>
  );
}

// ── Card 1 — Upload ───────────────────────────────────────────────

function UploadContent() {
  return (
    <>
      <CardHeader
        left={
          <>
            <MapPin size={11} strokeWidth={2} />
            Brunswick VIC
          </>
        }
        right="Single dwelling"
      />

      <div className="mt-4 rounded-xl border border-dashed border-[rgba(0,212,200,0.35)] bg-[rgba(0,212,200,0.05)] p-5 sm:p-6 flex flex-col items-center gap-2">
        <div className="size-11 rounded-full bg-[rgba(0,212,200,0.12)] flex items-center justify-center text-accent-light">
          <Upload size={17} strokeWidth={2} />
        </div>
        <p className="text-[13.5px] text-text font-ui font-semibold mt-1">
          Drop your plans here
        </p>
        <p className="text-[11px] text-text-dim">
          PDF DWG DOC. Up to 50 MB.
        </p>
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        <FileChip name="architectural-plans-v3.pdf" size="12.4 MB" />
        <FileChip name="site-survey.pdf" size="2.1 MB" />
        <FileChip name="scope-of-works.docx" size="188 KB" />
      </div>

      <div className="mt-auto pt-3 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.025)] px-3.5 py-2.5 flex items-start gap-2.5">
        <Sparkles
          size={13}
          strokeWidth={2.4}
          className="text-accent-light mt-0.5 shrink-0"
        />
        <div>
          <div className="text-[9.5px] tracking-[0.18em] uppercase text-accent-light font-ui font-semibold mb-0.5">
            Auto-extracted
          </div>
          <p className="text-[11.5px] text-text-muted leading-[1.5]">
            45 Sydney Rd Brunswick VIC. 450 m². Budget $500k to $750k.
          </p>
        </div>
      </div>
    </>
  );
}

function FileChip({ name, size }: { name: string; size: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
      <div className="flex items-center gap-2.5 min-w-0">
        <FileCheck
          size={13}
          strokeWidth={2}
          className="text-accent-light shrink-0"
        />
        <span className="text-[11.5px] text-text font-ui truncate">{name}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] text-text-dim font-mono tabular-nums">
          {size}
        </span>
        <CheckCircle2 size={12} strokeWidth={2.2} className="text-accent-light" />
      </div>
    </div>
  );
}

// ── Card 2 — Match ────────────────────────────────────────────────

function MatchContent() {
  return (
    <>
      <CardHeader
        left="3 verified builders matched"
        right={
          <>
            <span className="relative flex size-1.5">
              <span className="absolute inset-0 rounded-full bg-accent opacity-75 animate-ping" />
              <span className="relative size-1.5 rounded-full bg-accent" />
            </span>
            Live
          </>
        }
      />

      <div className="mt-4 flex flex-col gap-2.5">
        <BuilderCard
          initials="AB"
          gradient="from-[#00d4c8] to-[#1a5fd4]"
          name="Atlas Build Co"
          area="Inner West VIC. 6 km away."
          badge="verified"
          stats="5 active projects. 95% on-time."
        />
        <BuilderCard
          initials="NB"
          gradient="from-[#7ef5ed] to-[#00d4c8]"
          name="Northline Builders"
          area="Brunswick. 4 km away."
          badge="verified"
          stats="12 won. 100% on-time."
        />
        <BuilderCard
          initials="HG"
          gradient="from-[#1a5fd4] to-[#7ef5ed]"
          name="Heritage Group"
          area="CBD and North. 8 km away."
          badge="founding"
          stats="Founding builder."
        />
      </div>

      <div className="mt-auto pt-4 flex items-center gap-2 text-[10.5px] text-text-dim">
        <ShieldCheck size={12} strokeWidth={2} className="text-accent-light" />
        Every match passes ABN and state register checks.
      </div>
    </>
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
    <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.025)]">
      <div
        className={cn(
          "size-10 rounded-full bg-gradient-to-br flex items-center justify-center text-[12px] font-bold text-accent-contrast shrink-0",
          gradient,
        )}
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[13px] font-ui font-semibold text-text truncate">
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
        <p className="text-[10.5px] text-text-dim mt-0.5 truncate">
          {area} {stats}
        </p>
      </div>
      <ArrowRight
        size={12}
        strokeWidth={2}
        className="text-text-faint shrink-0"
      />
    </div>
  );
}

// ── Card 3 — Compare ──────────────────────────────────────────────

function CompareContent() {
  return (
    <>
      <CardHeader
        left="Tender comparison. 3 received."
        right="Median $1.86M"
      />

      <div className="mt-4 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.025)] p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[9.5px] tracking-[0.18em] uppercase text-text-dim">
            Price distribution
          </span>
          <span className="text-[10px] text-accent-light font-ui font-semibold">
            7% spread. Tight.
          </span>
        </div>
        <div className="relative h-1.5 rounded-full bg-[rgba(255,255,255,0.05)]">
          <div className="absolute inset-y-0 left-[8%] right-[16%] rounded-full bg-gradient-to-r from-[rgba(0,212,200,0.25)] via-accent/80 to-[rgba(0,212,200,0.25)]" />
          <span className="absolute top-1/2 -translate-y-1/2 left-[8%] -translate-x-1/2 size-2.5 rounded-full bg-accent shadow-[0_0_8px_rgba(0,212,200,0.8)]" />
          <span className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 size-3.5 rounded-full bg-accent border-2 border-[#06121e] shadow-[0_0_14px_rgba(0,212,200,1)]" />
          <span className="absolute top-1/2 -translate-y-1/2 right-[16%] translate-x-1/2 size-2.5 rounded-full bg-accent shadow-[0_0_8px_rgba(0,212,200,0.8)]" />
        </div>
        <div className="flex items-center justify-between mt-2 text-[10px] tabular-nums">
          <span className="text-text-dim font-mono">$1.78M</span>
          <span className="text-accent-light font-mono font-semibold">
            $1.86M
          </span>
          <span className="text-text-dim font-mono">$1.91M</span>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.025)] overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-3.5 py-2 border-b border-[rgba(255,255,255,0.04)] items-center bg-[rgba(255,255,255,0.012)]">
          <span />
          <span className="text-[9px] tracking-[0.10em] uppercase text-text-dim font-ui w-14 text-right">
            AB
          </span>
          <span className="text-[9px] tracking-[0.10em] uppercase text-accent-light font-ui w-14 text-right">
            NB
          </span>
          <span className="text-[9px] tracking-[0.10em] uppercase text-text-dim font-ui w-14 text-right">
            HG
          </span>
        </div>
        <ComparisonRow
          label="ABN and licence"
          values={["Yes", "Yes", "Yes"]}
          highlight={1}
        />
        <ComparisonRow
          label="Start date"
          values={["Sep 26", "Sep 26", "Oct 26"]}
          highlight={1}
        />
        <ComparisonRow
          label="Validity"
          values={["28 d", "30 d", "25 d"]}
          highlight={1}
        />
        <ComparisonRow
          label="Total"
          values={["$1.78M", "$1.86M", "$1.91M"]}
          highlight={1}
          accent
        />
      </div>
    </>
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
    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-3.5 py-2.5 border-b border-[rgba(255,255,255,0.04)] last:border-b-0 items-center">
      <span className="text-[10px] tracking-[0.12em] uppercase text-text-dim font-ui">
        {label}
      </span>
      {values.map((v, i) => (
        <span
          key={i}
          className={cn(
            "text-[11px] font-mono tabular-nums w-14 text-right",
            i === highlight ? "text-accent-light font-semibold" : "text-text",
            accent && i === highlight && "text-accent-light font-bold",
          )}
        >
          {v}
        </span>
      ))}
    </div>
  );
}

// ── Card 4 — Award ────────────────────────────────────────────────

function AwardContent() {
  return (
    <>
      <CardHeader
        left="Decision made"
        right={
          <>
            <Trophy size={11} strokeWidth={2.4} />
            Awarded
          </>
        }
      />

      <div
        className="mt-4 relative rounded-xl border border-[rgba(0,212,200,0.45)] p-4 overflow-hidden"
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
              <span className="text-[14.5px] font-ui font-semibold text-text">
                Northline Builders
              </span>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm border border-border-accent bg-accent-muted/40 text-[8.5px] tracking-[0.10em] uppercase text-accent-light">
                <Trophy size={8} strokeWidth={2.4} />
                Winner
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11.5px] text-text-muted flex-wrap">
              <Wallet size={11} strokeWidth={2} className="text-accent-light" />
              <span className="font-mono tabular-nums text-text font-semibold">
                $1.86M
              </span>
              <span className="text-text-faint">·</span>
              <span>30 day validity</span>
              <span className="text-text-faint">·</span>
              <span>Sep 26 start</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.025)] p-4">
        <span className="text-[9.5px] tracking-[0.18em] uppercase text-text-dim font-ui font-semibold mb-3 block">
          Next steps
        </span>
        <div className="flex flex-col gap-2.5">
          <TimelineRow status="done" text="Tender awarded. 12:32 PM." />
          <TimelineRow status="active" text="Contract drafting." />
          <TimelineRow status="pending" text="Site visit scheduled." />
          <TimelineRow status="pending" text="Build kick-off." />
        </div>
      </div>
    </>
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
          status === "active" && "border border-accent bg-accent-muted/40",
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
          "text-[12px] font-ui",
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

// ── Shared card header ────────────────────────────────────────────

function CardHeader({
  left,
  right,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-[10px] tracking-[0.18em] uppercase font-ui font-semibold">
      <span className="inline-flex items-center gap-1.5 text-text-dim">
        {left}
      </span>
      <span className="inline-flex items-center gap-1.5 text-accent">
        {right}
      </span>
    </div>
  );
}
