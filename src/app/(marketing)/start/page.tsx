/**
 * /start — Google Ads conversion landing.
 *
 * Single-purpose page: convert paid traffic into a project upload.
 * Hero + 3 trust tiles + one social-proof row + secondary CTA. Total
 * scroll = ~1.5 viewports on a phone, fits one viewport on a 1440p
 * desktop.
 *
 * Visual language inherits from the main landing (Bebas display +
 * Space Grotesk UI + DM Sans body, teal accent) but drops the
 * heavier flourishes (FibreCanvas, marquee, multi-card hero deck)
 * so LCP stays under 2s on mobile — a Quality Score win and a
 * conversion win.
 *
 * The hero CTA always points at /start/type to begin the funnel.
 * Optional URL params (?utm_source=...) get preserved through every
 * step via the StartCta client component.
 */

import { Suspense } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import { StartCta } from "./_components/start-cta";
import { ErrorBanner } from "./_components/error-banner";

export default function StartLandingPage() {
  return (
    <div className="relative">
      {/* Magic-link redemption can bounce back here with ?err=. Banner
              is RSC-friendly (reads searchParams via the wrapping
              Suspense). */}
      <Suspense fallback={null}>
        <ErrorBanner />
      </Suspense>

      <section className="relative isolate pt-14 sm:pt-20 lg:pt-28 pb-12 px-5 md:px-10">
        <div className="mx-auto max-w-[1180px]">
          {/* Brand mark — minimal. Don't link out (no escape hatch). */}
          <div className="flex items-center gap-2 mb-10 sm:mb-14">
            <span className="relative flex size-2">
              <span className="absolute inset-0 rounded-full bg-accent opacity-75 animate-ping" />
              <span className="relative size-2 rounded-full bg-accent shadow-[0_0_10px_rgba(0,212,200,0.8)]" />
            </span>
            <span className="font-display text-xl tracking-[0.04em] text-text">
              BuilderHQ
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-20 items-center">
            <div>
              <span className="inline-flex items-center gap-2.5 text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-semibold">
                <span className="size-1.5 rounded-full bg-accent" />
                Residential builds · Australia-wide
              </span>

              <h1 className="mt-5 font-display uppercase tracking-[-0.018em] leading-[0.92] text-[clamp(2.5rem,7vw+0.8rem,5.5rem)]">
                <span className="block text-text">Verified builders.</span>
                <span className="block text-accent">Tendering for you.</span>
              </h1>

              <p className="mt-6 text-text-muted text-[17px] sm:text-[18px] leading-[1.55] max-w-[560px] font-body">
                BuilderHQ is the only Australian marketplace where verified
                residential builders compete to build what you&apos;ve designed.
                <span className="text-text"> Free for owners. </span>
                Up to three tenders per project — so you compare apples to
                apples, not twenty random quotes.
              </p>

              <div className="mt-9 flex flex-col sm:flex-row gap-3 sm:items-center">
                <StartCta>
                  Upload your project
                  <ArrowRight
                    size={16}
                    strokeWidth={2.2}
                    className="ml-0.5"
                  />
                </StartCta>
                <span className="text-text-faint text-[12.5px] font-ui">
                  90 seconds · no card · no signup form
                </span>
              </div>

              {/* Compact trust row inline under CTA — answers "is this real?"
                  before the user has to scroll. */}
              <ul className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
                <TrustTile
                  icon={
                    <ShieldCheck
                      size={16}
                      strokeWidth={1.8}
                      className="text-accent-light"
                    />
                  }
                  title="Every builder verified"
                  copy="ABN active in ABR + state builder licence current. We check the registers ourselves."
                />
                <TrustTile
                  icon={
                    <Wallet
                      size={16}
                      strokeWidth={1.8}
                      className="text-accent-light"
                    />
                  }
                  title="Free for owners"
                  copy="No subscription, no commission, no surprise fees. Builders pay to unlock; you pay nothing."
                />
                <TrustTile
                  icon={
                    <CheckCircle2
                      size={16}
                      strokeWidth={1.8}
                      className="text-accent-light"
                    />
                  }
                  title="3 tenders. 1 choice."
                  copy="We cap unlocks at three so quotes are comparable — and so builders bid like they want to win."
                />
              </ul>
            </div>

            {/* Right column — visual anchor. A clean "preview card"
                showing what a typical tender comparison looks like.
                Reads as proof + product visualisation in one beat. */}
            <PreviewCard />
          </div>

          {/* Social proof — single thin band, optional metrics. Lives
              under the hero so it's the first thing they scroll into. */}
          <ProofBand />

          {/* Secondary CTA — for users who scrolled the band. */}
          <div className="mt-12 sm:mt-16 flex flex-col items-center gap-4">
            <p className="text-text-muted text-[15px] text-center max-w-[460px] font-body">
              Ready when you are. Project type, address, budget — about 90
              seconds and your project is in front of verified builders.
            </p>
            <StartCta>
              Upload your project
              <ArrowRight size={16} strokeWidth={2.2} className="ml-0.5" />
            </StartCta>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Tiles + preview card ────────────────────────────────────────────

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
        <h3 className="font-ui font-semibold text-[13.5px] text-text tracking-[-0.005em]">
          {title}
        </h3>
      </div>
      <p className="text-text-muted text-[12.5px] leading-[1.55] font-body">
        {copy}
      </p>
    </li>
  );
}

function PreviewCard() {
  return (
    <div className="relative hidden lg:block">
      {/* Hairline halo */}
      <div
        aria-hidden
        className="absolute -inset-3 rounded-[28px] bg-gradient-to-br from-accent/12 via-transparent to-blue-500/10 blur-xl"
      />
      <div className="relative rounded-[22px] border border-border bg-surface-1/50 backdrop-blur-md p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <span className="text-accent-light text-[10px] tracking-[0.22em] uppercase font-ui font-semibold">
            Tenders received
          </span>
          <span className="text-text-faint text-[11px] font-ui">Live for 7d</span>
        </div>
        <div className="flex items-baseline gap-2 mb-4">
          <span className="font-display text-[36px] tracking-[-0.01em] text-text leading-none">
            3
          </span>
          <span className="text-text-muted text-[13px] font-body">
            of 3 builder slots filled
          </span>
        </div>
        <div className="space-y-2">
          {SAMPLE_TENDERS.map((t) => (
            <div
              key={t.name}
              className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface-0/40 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-text text-[12.5px] font-ui font-semibold truncate">
                  {t.name}
                </p>
                <p className="text-text-faint text-[10.5px] mt-0.5 font-body">
                  {t.location} · {t.experience}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-display text-[16px] text-text leading-none tracking-[-0.005em]">
                  {t.price}
                </p>
                <p className="text-text-faint text-[10px] mt-1 font-ui">
                  {t.weeks} weeks
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 text-[10.5px] text-text-faint font-ui">
          <ShieldCheck size={12} className="text-accent-light" strokeWidth={1.8} />
          <span>All three ABN + licence verified</span>
        </div>
      </div>
    </div>
  );
}

const SAMPLE_TENDERS = [
  {
    name: "Synergy Building Group",
    location: "VIC",
    experience: "12 yrs",
    price: "$1.42M",
    weeks: 26,
  },
  {
    name: "Northline Builders",
    location: "VIC",
    experience: "8 yrs",
    price: "$1.51M",
    weeks: 24,
  },
  {
    name: "Madison & Sons Construction",
    location: "VIC",
    experience: "21 yrs",
    price: "$1.58M",
    weeks: 28,
  },
] as const;

function ProofBand() {
  return (
    <div className="mt-14 sm:mt-20 rounded-2xl border border-border-subtle bg-surface-0/40 backdrop-blur-sm">
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border-subtle">
        <Metric value="100%" label="Builders verified" />
        <Metric value="$0" label="Owner fees" />
        <Metric value="3" label="Builder slots/project" />
        <Metric value="AU" label="Australia-wide" />
      </div>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-5 py-5 sm:py-6 flex flex-col items-center text-center">
      <span className="font-display text-[26px] sm:text-[30px] text-text leading-none tracking-[-0.005em]">
        {value}
      </span>
      <span className="mt-1.5 text-[11px] tracking-[0.16em] uppercase text-text-faint font-ui font-semibold">
        {label}
      </span>
    </div>
  );
}
