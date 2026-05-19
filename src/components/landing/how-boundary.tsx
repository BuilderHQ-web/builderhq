"use client";

import { Component, type ReactNode } from "react";

import { HowItWorks } from "./how";

/**
 * Error boundary specifically for the HowItWorks section.
 *
 * The pinned-scroll narrative is the most complex Motion-driven
 * section on the marketing page. It uses `useScroll` with a ref
 * target, multiple `useTransform` chains, sticky positioning, and
 * sits inside a Lenis-smoothed scroll context. That's a lot of
 * surface area where something can go wrong in a production-only
 * way (Turbopack / SWC minification edge cases, hydration timing,
 * etc.), and the v2 + v3 stack-slide rebuilds both crashed in
 * production despite passing local builds.
 *
 * Without a boundary, any throw in this section bubbles up to
 * `app/error.tsx` and takes down the whole landing page. With it,
 * the static fallback below renders in place of the broken section
 * and everything else (hero, marquee, features, FAQ, CTA) stays
 * intact.
 *
 * The boundary also logs to console so we can see the actual error
 * in browser dev tools — the kind of signal we needed for the v2/v3
 * crashes but couldn't get because the page crashed before any
 * useful log fired.
 */
export function HowItWorksWithBoundary() {
  return (
    <HowItWorksBoundary>
      <HowItWorks />
    </HowItWorksBoundary>
  );
}

interface BoundaryState {
  hasError: boolean;
  error?: Error;
}

class HowItWorksBoundary extends Component<
  { children: ReactNode },
  BoundaryState
> {
  override state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(
    error: Error,
    info: { componentStack?: string | null },
  ) {
    // Surface the actual error so we can diagnose without taking
    // down the page. Visible in browser dev tools.
    if (typeof window !== "undefined") {
      console.error(
        "[HowItWorks] crashed and fell back to static section:",
        error,
        info,
      );
    }
  }

  override render() {
    if (this.state.hasError) {
      return <StaticFallback />;
    }
    return this.props.children;
  }
}

/**
 * Static, motion-free fallback. Shown when the animated version
 * crashes. Preserves the brand message (the headline + four step
 * names) so the page still tells the story even without animation.
 */
function StaticFallback() {
  const steps = [
    { n: "01", title: "Upload your project" },
    { n: "02", title: "Verified builders match" },
    { n: "03", title: "Compare side-by-side" },
    { n: "04", title: "Award. Build. Done." },
  ];
  return (
    <section
      id="how"
      className="relative px-5 md:px-10 py-20 lg:py-32 border-y border-border-subtle"
      style={{
        background:
          "linear-gradient(180deg, rgba(6,18,30,0.5), rgba(3,9,15,0.7))",
      }}
    >
      <div className="mx-auto max-w-[1320px] flex flex-col items-center text-center gap-10">
        <span className="inline-flex items-center gap-2.5 text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-medium">
          <span className="size-1.5 rounded-full bg-accent shadow-[0_0_10px_rgba(0,212,200,0.8)]" />
          How BuilderHQ works
        </span>
        <h2 className="font-display uppercase tracking-[-0.014em] leading-[0.9] text-[clamp(2.5rem,4.5vw+1rem,5rem)] text-text max-w-[18ch]">
          From plans to{" "}
          <span className="text-accent-light">builder</span>. In days, not
          months.
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-[960px] mt-4">
          {steps.map((s) => (
            <div
              key={s.n}
              className="rounded-2xl border border-border-subtle bg-[rgba(255,255,255,0.025)] p-5 text-left"
            >
              <span className="text-[10px] tracking-[0.22em] uppercase text-accent font-ui font-semibold">
                {s.n} · Step
              </span>
              <h3 className="mt-3 font-ui font-semibold text-[16px] tracking-[-0.005em] text-text leading-[1.25]">
                {s.title}
              </h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
