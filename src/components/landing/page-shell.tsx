/**
 * MarketingPageShell — shared chrome for /about, /terms, /privacy,
 * /faq, and any future content-led marketing page.
 *
 * The home page has its own dense backdrop (ambient orbs, fibre canvas,
 * grid overlay, custom cursor). Long-form pages don't need that drama —
 * a calm gradient + the same nav/footer is enough. This shell:
 *
 *   - Renders <LandingNav/> at the top with the same scroll behaviour
 *   - Adds a soft backdrop (subtle radial glow + faint grid + noise)
 *   - Renders a "page hero" with kicker / title / sub
 *   - Slots in the page body
 *   - Renders <Footer/> at the bottom
 *
 * Pages drop in like:
 *   <MarketingPageShell kicker="Legal" title="Terms of use" sub="…">
 *     <body content here>
 *   </MarketingPageShell>
 */

import { LandingNav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";

interface Props {
  kicker: string;
  title: string;
  sub?: string;
  /** Date string under the title (e.g. "Last updated · 10 May 2026"). */
  meta?: string;
  children: React.ReactNode;
}

export function MarketingPageShell({
  kicker,
  title,
  sub,
  meta,
  children,
}: Props) {
  return (
    <>
      {/* Calm backdrop — single radial glow at the top so the page
          doesn't feel flat without the home-page's heavy ambient
          stack. Fixed so it stays in place while the user scrolls. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 60% at 50% -10%, rgba(0,212,200,0.08), transparent 65%), radial-gradient(ellipse 70% 50% at 50% 110%, rgba(26,95,212,0.06), transparent 60%)",
        }}
      />
      {/* Faint grid for texture */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(142,252,244,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(142,252,244,0.6) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage:
            "radial-gradient(ellipse 80% 70% at 50% 50%, black, transparent 80%)",
        }}
      />

      <LandingNav />

      <main className="relative z-10 pt-28 lg:pt-40 pb-20 lg:pb-32 px-5 md:px-10">
        <div className="mx-auto max-w-[860px]">
          {/* Page header */}
          <header className="mb-12 lg:mb-20">
            <span className="inline-flex items-center gap-2.5 text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-medium">
              <span className="size-1.5 rounded-full bg-accent shadow-[0_0_10px_rgba(0,212,200,0.8)]" />
              {kicker}
            </span>
            <h1 className="mt-6 font-display tracking-[-0.018em] leading-[1.0] text-[clamp(2.5rem,5.5vw+1rem,5.5rem)] break-words">
              {title}
            </h1>
            {sub ? (
              <p className="mt-6 max-w-[55ch] text-[15.5px] leading-[1.75] text-text-subtle">
                {sub}
              </p>
            ) : null}
            {meta ? (
              <p className="mt-5 text-[11px] tracking-[0.18em] uppercase text-text-dim">
                {meta}
              </p>
            ) : null}
          </header>

          {/* Body */}
          <div className="relative">{children}</div>
        </div>
      </main>

      <Footer />
    </>
  );
}
