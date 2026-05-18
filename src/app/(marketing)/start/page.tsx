/**
 * /start — Google Ads conversion landing.
 *
 * Single-purpose page: convert paid traffic into a project upload.
 * Designed for one viewport on desktop, ~1.2 viewports on mobile.
 *
 * Visual signature:
 *   · Sticky glass header (BuilderHQ logo + single "Get started" CTA)
 *   · Hero copy on the left, animated tender-comparison card on the
 *     right (lives + breathes, doesn't shout)
 *   · 3 trust micro-tiles inline beneath the headline (no scroll
 *     to read them on desktop)
 *   · Single proof band with count-up metrics
 *   · One secondary CTA at the bottom
 *
 * Copy discipline: ruthless. Removed anything that mentions builders
 * paying to unlock (not a benefit owners care about). Removed "no
 * commission" (compressed into "Free for owners"). Every sentence
 * earns its place.
 */

import { Suspense } from "react";
import { ArrowRight, CheckCircle2, ShieldCheck, Wallet } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { StartCta } from "./_components/start-cta";
import { ErrorBanner } from "./_components/error-banner";
import { AnimatedCount } from "./_components/animated-count";
import { LiveTenderCard } from "./_components/live-tender-card";

export default function StartLandingPage() {
  return (
    <div className="relative min-h-svh flex flex-col">
      <LandingHeader />

      <Suspense fallback={null}>
        <ErrorBanner />
      </Suspense>

      <section className="flex-1 flex items-center px-5 md:px-10 pt-8 pb-12">
        <div className="mx-auto max-w-[1240px] w-full">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-16 items-center">
            <div>
              <span className="inline-flex items-center gap-2.5 text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-semibold">
                <span className="relative flex size-1.5">
                  <span className="absolute inset-0 rounded-full bg-accent opacity-75 animate-ping" />
                  <span className="relative size-1.5 rounded-full bg-accent shadow-[0_0_10px_rgba(0,212,200,0.8)]" />
                </span>
                Residential builds · Australia
              </span>

              <h1 className="mt-5 font-display uppercase tracking-[-0.018em] leading-[0.92] text-[clamp(2.6rem,6.5vw+0.8rem,5.6rem)]">
                <span className="block text-text">Verified builders.</span>
                <span className="block text-accent">Tendering for you.</span>
              </h1>

              <p className="mt-5 text-text-muted text-[15.5px] sm:text-[16.5px] leading-[1.55] max-w-[520px] font-body">
                The only Australian marketplace where vetted builders
                compete on your project. Three tenders, side-by-side,
                <span className="text-text"> free for owners.</span>
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:items-center">
                <StartCta>
                  Upload your project
                  <ArrowRight size={16} strokeWidth={2.2} className="ml-0.5" />
                </StartCta>
                <span className="text-text-faint text-[12px] font-ui">
                  90 seconds · no card · no spam
                </span>
              </div>

              <ul className="mt-9 grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3.5">
                <TrustTile
                  icon={
                    <ShieldCheck
                      size={15}
                      strokeWidth={1.8}
                      className="text-accent-light"
                    />
                  }
                  title="Every builder verified"
                  copy="ABN + state builder licence current. We check, every time."
                />
                <TrustTile
                  icon={
                    <Wallet
                      size={15}
                      strokeWidth={1.8}
                      className="text-accent-light"
                    />
                  }
                  title="Free for owners"
                  copy="No subscription. No fees. Ever."
                />
                <TrustTile
                  icon={
                    <CheckCircle2
                      size={15}
                      strokeWidth={1.8}
                      className="text-accent-light"
                    />
                  }
                  title="3 tenders. 1 choice."
                  copy="Capped so quotes are comparable. Builders bid like it."
                />
              </ul>
            </div>

            {/* Live tender-comparison card — the visual anchor. Cycles
                through subtle accent animations to feel alive. */}
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
          maskImage:
            "linear-gradient(to bottom, black 70%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 70%, transparent 100%)",
        }}
      />
      <div className="relative px-5 md:px-10 pt-5 pb-3">
        <div className="mx-auto max-w-[1240px] flex items-center justify-between gap-5">
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

// ── Trust tiles ─────────────────────────────────────────────────────

function TrustTile({
  icon,
  title,
  copy,
}: {
  icon: React.ReactNode;
  title: string;
  copy: string;
}) {
  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-ui font-semibold text-[13px] text-text tracking-[-0.005em]">
          {title}
        </h3>
      </div>
      <p className="text-text-muted text-[12px] leading-[1.55] font-body">
        {copy}
      </p>
    </li>
  );
}

// ── Proof band ──────────────────────────────────────────────────────

function ProofBand() {
  return (
    <div className="mt-10 sm:mt-12 rounded-2xl border border-border-subtle bg-surface-0/40 backdrop-blur-sm">
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border-subtle">
        <Metric
          value={<AnimatedCount value={100} format="{n}%" />}
          label="Builders verified"
        />
        <Metric
          value={<AnimatedCount value={0} format="${n}" />}
          label="Owner fees"
        />
        <Metric
          value={<AnimatedCount value={3} format="{n}" />}
          label="Builder slots / project"
        />
        <Metric value="AU" label="Australia-wide" />
      </div>
    </div>
  );
}

function Metric({
  value,
  label,
}: {
  value: React.ReactNode;
  label: string;
}) {
  return (
    <div className="px-5 py-5 sm:py-6 flex flex-col items-center text-center">
      <span className="font-display text-[26px] sm:text-[30px] text-text leading-none tracking-[-0.005em]">
        {value}
      </span>
      <span className="mt-1.5 text-[10.5px] tracking-[0.16em] uppercase text-text-faint font-ui font-semibold">
        {label}
      </span>
    </div>
  );
}
