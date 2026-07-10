/**
 * MarketingPageShell — shared chrome for /about, /terms, /privacy,
 * /faq, and any future content-led marketing page.
 *
 * Wears the landing's light system (`.lp-light` token override, cream
 * canvas, Geist headings, v2 floating nav + footer) so the whole site
 * reads as one product. Nav/footer hash links resolve back to the home
 * page (`homeAnchors`) since these pages don't carry those sections.
 *
 * Pages drop in like:
 *   <MarketingPageShell kicker="Legal" title="Terms of use" sub="…">
 *     <body content here>
 *   </MarketingPageShell>
 */

import { partnerNavGroups } from "@/app/(marketing)/partners/partners-data";
import { RoleProvider } from "@/components/landing/v2/role";
import { LandingNav } from "@/components/landing/v2/nav";
import { Footer } from "@/components/landing/v2/footer";

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
    <div className="lp-light">
      {/* The landing's canvas, calm edition: warm off-white, a soft teal
          bloom at the top, the faint blueprint grid. Fixed so it holds
          while the page scrolls. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0" style={{ background: "#f4f1ea" }}>
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 55% at 50% -12%, rgba(0,170,158,0.10), transparent 62%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "linear-gradient(rgba(20,40,60,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(20,40,60,0.05) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(ellipse 90% 70% at 50% 20%, black, transparent 85%)",
            WebkitMaskImage: "radial-gradient(ellipse 90% 70% at 50% 20%, black, transparent 85%)",
          }}
        />
      </div>

      <RoleProvider>
        <LandingNav authedHref={null} homeAnchors partnerNav={partnerNavGroups()} />

        <main className="relative z-10 pt-32 lg:pt-40 pb-20 lg:pb-28 px-5 md:px-10">
          <div className="mx-auto max-w-[860px]">
            {/* Page header */}
            <header className="mb-12 lg:mb-16">
              <span className="inline-flex items-center gap-2.5 text-[11px] tracking-[0.24em] uppercase text-accent-light font-ui font-semibold">
                <span className="size-1.5 rounded-full bg-accent shadow-[0_0_10px_rgba(0,212,200,0.7)]" />
                {kicker}
              </span>
              <h1 className="mt-6 font-ui font-semibold tracking-[-0.04em] leading-[1.04] text-[clamp(2.5rem,4.6vw+1rem,4.6rem)] text-text break-words">
                {title}
              </h1>
              {sub ? (
                <p className="mt-6 max-w-[58ch] text-[16px] leading-[1.7] text-text-muted">
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

        <Footer homeAnchors />
      </RoleProvider>
    </div>
  );
}
