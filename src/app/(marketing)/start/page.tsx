/**
 * /start — Google Ads conversion landing.
 *
 * Resend-style minimalism: one headline, one subline, one CTA,
 * massive negative space, premium 3D-feeling product visual. The
 * tender comparison card is the visual anchor (and a literal preview
 * of the product), while typography + spacing carry the rest of the
 * weight.
 *
 * Every element fades in with a staggered timeline on mount so the
 * page reads like a thoughtful reveal rather than a static dump.
 *
 * Copy discipline: every word earns its place. Removed all
 * marketplace mechanics chatter ("builders pay to unlock", "no
 * commission", "side-by-side"). Three trust micro-tiles → gone.
 * Single CTA in hero + one in sticky header.
 */

import { Suspense } from "react";
import { ArrowRight } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { StartCta } from "./_components/start-cta";
import { ErrorBanner } from "./_components/error-banner";
import { LandingHero } from "./_components/landing-hero";
import { ProofBand } from "./_components/proof-band";
import { LiveTenderCard } from "./_components/live-tender-card";

export default function StartLandingPage() {
  return (
    <div className="relative min-h-svh flex flex-col">
      <LandingHeader />

      <Suspense fallback={null}>
        <ErrorBanner />
      </Suspense>

      <section className="flex-1 flex items-center px-5 md:px-10 pt-4 sm:pt-10 pb-12">
        <div className="mx-auto max-w-[1280px] w-full">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.85fr] gap-12 lg:gap-20 items-center min-h-[58vh]">
            <LandingHero />
            <div className="relative">
              <LiveTenderCard />
            </div>
          </div>

          <ProofBand />
        </div>
      </section>
    </div>
  );
}

// ── Sticky glass header ─────────────────────────────────────────────

function LandingHeader() {
  return (
    <header className="sticky top-0 z-40">
      <div
        aria-hidden
        className="absolute inset-0 bg-bg/72 backdrop-blur-xl"
        style={{
          maskImage: "linear-gradient(to bottom, black 70%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 70%, transparent 100%)",
        }}
      />
      <div className="relative px-5 md:px-10 pt-5 pb-3">
        <div className="mx-auto max-w-[1280px] flex items-center justify-between gap-5">
          <Logo height={22} />
          <Suspense fallback={null}>
            <StartCta size="md">
              Get started
              <ArrowRight size={14} strokeWidth={2.2} className="ml-0.5" />
            </StartCta>
          </Suspense>
        </div>
      </div>
    </header>
  );
}
