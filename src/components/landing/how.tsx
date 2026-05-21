"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, Users, FileSpreadsheet } from "lucide-react";
import { Reveal } from "./reveal";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const steps: Array<{
  n: string;
  title: string;
  description: string;
  points: string[];
  icon: LucideIcon;
}> = [
  {
    n: "Step 01",
    icon: Upload,
    title: "Upload your project",
    description: "Drawings, specs, scope, address. One form. Ten minutes.",
    points: [
      "Smart fields by build type",
      "Drag & drop docs, autosaved",
      "Preview vs full visibility controls",
    ],
  },
  {
    n: "Step 02",
    icon: Users,
    title: "Builders unlock",
    description:
      "Matched builders preview, then unlock the full package to tender.",
    points: [
      "Filtered by suburb, type, licence",
      "Founding access — first 50 builders free",
      "Paid unlocks after launch",
    ],
  },
  {
    n: "Step 03",
    icon: FileSpreadsheet,
    title: "Compare and decide",
    description:
      "Structured tenders, side-by-side. Message in-thread. Decide.",
    points: [
      "Diff view across price, scope, timeline",
      "Threaded messaging per project",
      "Shortlist · award · reject in one click",
    ],
  },
];

export function HowItWorks() {
  return (
    <section
      id="how"
      className="relative px-5 md:px-10 py-20 lg:py-32 border-y border-border-subtle"
      style={{
        background:
          "linear-gradient(180deg, rgba(6,18,30,0.5), rgba(3,9,15,0.6))",
      }}
    >
      <div className="mx-auto max-w-[1320px]">
        {/* Heading + subheading stacked — left-aligned on desktop,
            centred on mobile. */}
        <div className="text-center lg:text-left">
          <Reveal>
            <span className="text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-medium">
              How it works
            </span>
            <h2 className="mt-5 font-display tracking-[-0.018em] text-[clamp(2.5rem,4vw+0.5rem,4.5rem)] leading-[1] mx-auto lg:mx-0 max-w-[18ch]">
              <span className="text-text">Three steps,</span>{" "}
              <span className="accent-italic">no chasing</span>.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 lg:mt-7 mx-auto lg:mx-0 max-w-[55ch] text-[15px] leading-[1.7] text-text-subtle">
              From raw drawings to a signed builder. Modelled on how
              Australian residential projects actually tender.
            </p>
          </Reveal>
        </div>

        {/* Mobile + tablet portrait: horizontal scroll-snap carousel.
            Each card peeks the next slide on the right edge so users
            know to swipe. An IntersectionObserver flags the active
            card so it can lift / brighten while the others recede. */}
        <div className="mt-10 lg:hidden">
          <MobileStepsCarousel />
        </div>

        {/* Desktop: original 3-card row with horizontal connectors. */}
        <div className="mt-10 lg:mt-20 hidden lg:grid lg:grid-cols-[1fr_56px_1fr_56px_1fr] gap-y-4 gap-x-0 items-stretch">
          <Reveal>
            <Step {...steps[0]!} />
          </Reveal>
          <Connector />
          <Reveal delay={0.08}>
            <Step {...steps[1]!} />
          </Reveal>
          <Connector />
          <Reveal delay={0.16}>
            <Step {...steps[2]!} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/**
 * Mobile horizontal carousel of step cards. CSS scroll-snap handles
 * the snapping — we layer an IntersectionObserver on top so the
 * card currently centred in the viewport gets a subtle scale + glow
 * lift, and a dot indicator at the bottom moves in sync. Tapping a
 * dot scrolls that card into view. No JS animation in the scroll
 * path — the browser drives it.
 */
function MobileStepsCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const root = trackRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry with the largest intersection ratio — that's
        // the card the user is reading.
        let best: IntersectionObserverEntry | null = null;
        for (const entry of entries) {
          if (!best || entry.intersectionRatio > best.intersectionRatio) {
            best = entry;
          }
        }
        if (best && best.intersectionRatio > 0.5) {
          const idx = cardRefs.current.indexOf(best.target as HTMLDivElement);
          if (idx >= 0) setActive(idx);
        }
      },
      {
        root,
        // Only the centre band of the viewport counts as "active" so the
        // dot updates exactly when a card snaps into place, not while
        // it's drifting past.
        rootMargin: "0px -25% 0px -25%",
        threshold: [0.5, 0.75, 1],
      },
    );

    for (const card of cardRefs.current) {
      if (card) observer.observe(card);
    }
    return () => observer.disconnect();
  }, []);

  const scrollTo = (idx: number) => {
    const card = cardRefs.current[idx];
    if (!card) return;
    card.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  return (
    <div className="relative">
      <div
        ref={trackRef}
        data-lenis-prevent
        className={cn(
          "flex gap-4 overflow-x-auto snap-x snap-mandatory",
          "scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          // Negative inset margin extends the track edge-to-edge while
          // letting the section retain its padded content inset. Inline
          // padding inside the track creates the "peek" of the next
          // card on both sides.
          "-mx-5 px-5 pb-3",
          // Reserve room above so the lift transform doesn't get
          // clipped by the section's vertical rhythm.
          "pt-2",
        )}
        style={{ scrollPaddingInline: "1.25rem" }}
      >
        {steps.map((s, i) => (
          <div
            key={s.n}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            className={cn(
              "snap-center shrink-0 w-[86%] sm:w-[64%]",
              "transition-[transform,opacity] duration-[500ms] ease-[var(--ease-out)]",
              active === i
                ? "scale-100 opacity-100"
                : "scale-[0.96] opacity-70",
            )}
          >
            <Step {...s} active={active === i} />
          </div>
        ))}
      </div>

      {/* Dot indicator — a progress pill on the active slot, plain
          dots elsewhere. Tap to jump. */}
      <div className="mt-6 flex items-center justify-center gap-1.5">
        {steps.map((s, i) => (
          <button
            key={s.n}
            type="button"
            onClick={() => scrollTo(i)}
            aria-label={`Show ${s.title}`}
            className="group inline-flex items-center justify-center h-11 px-1.5"
          >
            <span
              className={cn(
                "relative block h-1.5 rounded-full transition-[width,background-color] duration-[400ms] ease-[var(--ease-out)]",
                active === i
                  ? "w-7 bg-accent shadow-[0_0_10px_rgba(0,212,200,0.6)]"
                  : "w-1.5 bg-text-faint group-hover:bg-text-dim",
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function Connector() {
  return (
    <div
      aria-hidden
      className="relative flex items-center justify-center min-h-[56px] lg:min-h-0"
    >
      {/* line */}
      <span
        className="absolute hidden lg:block left-2 right-2 h-px"
        style={{
          background:
            "linear-gradient(90deg, rgba(0,212,200,0.10), rgba(142,252,244,0.55), rgba(0,212,200,0.10))",
        }}
      />
      <span
        className="absolute lg:hidden top-2 bottom-2 w-px left-1/2 -translate-x-1/2"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,212,200,0.10), rgba(142,252,244,0.55), rgba(0,212,200,0.10))",
        }}
      />

      {/* hub */}
      <span
        className="relative z-[2] size-9 rounded-full border border-[rgba(142,252,244,0.30)] bg-[rgba(6,18,30,0.95)] flex items-center justify-center text-accent-light shadow-[0_0_24px_rgba(0,212,200,0.18)]"
        style={{
          animation: "connPulse 3s ease-in-out infinite",
        }}
      >
        <span aria-hidden className="lg:inline hidden">→</span>
        <span aria-hidden className="lg:hidden inline">↓</span>
      </span>
    </div>
  );
}

function Step({
  n,
  icon: Icon,
  title,
  description,
  points,
  active,
}: {
  n: string;
  icon: LucideIcon;
  title: string;
  description: string;
  points: string[];
  /** Mobile carousel sets this on the centred card so the border /
   *  glow lift to match. Optional — desktop ignores it. */
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "group relative h-full p-7 sm:p-9 rounded-2xl lg:rounded-md border bg-[linear-gradient(180deg,rgba(9,27,42,0.7),rgba(6,20,32,0.85))] transition-[border-color,transform,box-shadow] duration-[600ms] ease-[var(--ease-out)] overflow-hidden",
        active
          ? "border-border-accent shadow-[0_30px_80px_-30px_rgba(0,212,200,0.45)]"
          : "border-border hover:border-border-accent hover:-translate-y-1",
      )}
    >
      {/* Top hairline accent — premium signal on the active card. */}
      {active ? (
        <span
          aria-hidden
          className="absolute top-0 inset-x-8 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(126,245,237,0.6), transparent)",
          }}
        />
      ) : null}
      <span className="font-display tracking-[0.22em] text-[11px] text-accent">
        {n}
      </span>
      <div
        className={cn(
          "mt-6 size-12 rounded-md border flex items-center justify-center transition-colors duration-[400ms]",
          active
            ? "border-border-accent-strong bg-accent-muted text-accent-light"
            : "border-border-accent bg-accent-muted text-accent-light",
        )}
      >
        <Icon className="size-5" />
      </div>
      <h3 className="mt-6 font-ui font-bold tracking-[-0.02em] text-[20px] leading-[1.2] text-text">
        {title}
      </h3>
      <p className="mt-3 text-[14px] leading-[1.65] text-text-subtle">
        {description}
      </p>
      <ul className="mt-5 flex flex-col gap-2.5">
        {points.map((p) => (
          <li
            key={p}
            className="flex gap-2.5 items-start text-[13px] leading-[1.55] text-text-dim"
          >
            <span
              className="size-1 rounded-full shrink-0 mt-[7px]"
              style={{
                background: "linear-gradient(180deg, #7ef5ed, #00d4c8)",
                boxShadow: "0 0 8px rgba(0,212,200,0.5)",
              }}
            />
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}
