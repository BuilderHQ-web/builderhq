import Link from "next/link";
import { ArrowUpRight, ShieldCheck, Hammer, Map, Layers } from "lucide-react";

import { MarketingPageShell } from "@/components/landing/page-shell";

export const metadata = {
  title: "About",
  description:
    "BuilderHQ is Australia's residential tendering platform — built so owners and builders can find each other on real terms, fast.",
};

export default function AboutPage() {
  return (
    <MarketingPageShell
      kicker="About"
      title="Built for the residential build."
      sub="BuilderHQ is the missing layer between Australian project owners and the builders who quote them. We make tendering structured, comparable, and trusted — so the right team gets the job, faster."
    >
      {/* Mission statement */}
      <section className="rounded-md border border-border-subtle bg-[linear-gradient(180deg,rgba(10,28,44,0.45),rgba(6,18,30,0.55))] px-7 lg:px-10 py-10 lg:py-12 mb-14 lg:mb-20 relative overflow-hidden">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full opacity-50"
          style={{
            background:
              "radial-gradient(circle, rgba(0,212,200,0.14), transparent 70%)",
          }}
        />
        <span className="relative text-[10px] tracking-[0.22em] uppercase text-accent font-ui font-medium">
          Our mission
        </span>
        <h2 className="relative mt-4 font-display uppercase tracking-[-0.012em] text-[clamp(1.6rem,2.6vw+0.5rem,2.6rem)] leading-[1.05] text-text">
          To make building a home in Australia
          <br />
          <span className="text-accent-light">feel less like chasing</span>.
        </h2>
        <p className="relative mt-6 max-w-[60ch] text-[14.5px] leading-[1.75] text-text-subtle">
          Tendering a residential build today means three PDFs from three
          different builders, written in three different formats, with three
          different scope assumptions buried in the fine print. Owners can&apos;t
          actually compare. Builders can&apos;t stand out for the right reasons.
          Architects waste hours playing telephone. We&apos;re fixing that
          with structured tenders, live verification, and a single workspace
          everyone can trust.
        </p>
      </section>

      {/* Pillars */}
      <section className="mb-14 lg:mb-20">
        <span className="text-[10px] tracking-[0.22em] uppercase text-accent font-ui font-medium">
          What we believe
        </span>
        <h2 className="mt-4 font-display uppercase tracking-[-0.012em] text-[clamp(1.5rem,2.4vw+0.5rem,2.4rem)] leading-[1.05] text-text mb-8">
          Four principles, no compromise.
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Pillar
            icon={<ShieldCheck className="size-4" />}
            title="Verified before tender"
            body="Every builder runs through live ABR + state-register checks before they tender. Trust shouldn't depend on whether you read the fine print."
          />
          <Pillar
            icon={<Layers className="size-4" />}
            title="Structured by default"
            body="Tenders use the same scope, fields, and format. When you compare three builders, you're actually comparing the same thing — not three writing styles."
          />
          <Pillar
            icon={<Hammer className="size-4" />}
            title="Australian residential only"
            body="No commercial bleed. No foreign builders quoting from offshore. Just the people who build homes here, on the ground."
          />
          <Pillar
            icon={<Map className="size-4" />}
            title="Free for owners — forever"
            body="No fees to publish, match, or award. We make money from a small unlock fee builders pay to access private project details. Never from you."
          />
        </div>
      </section>

      {/* Founder note */}
      <section className="rounded-md border border-border-subtle bg-[linear-gradient(180deg,rgba(10,28,44,0.45),rgba(6,18,30,0.55))] px-7 lg:px-10 py-10 lg:py-12 mb-14 lg:mb-20">
        <span className="text-[10px] tracking-[0.22em] uppercase text-accent font-ui font-medium">
          A note from the founder
        </span>
        <p className="mt-5 text-[15px] leading-[1.85] text-text-subtle">
          BuilderHQ started after I watched friends and family go through
          residential builds the way most Australians do — three quotes from
          three trades-of-trades contacts, gut-feel decisions, and weeks of
          back-and-forth on emails that should have been one comparison view.
        </p>
        <p className="mt-5 text-[15px] leading-[1.85] text-text-subtle">
          The platform you&apos;re looking at is the version I wished existed
          then: structured tenders, verified builders, and a single
          comparison page that makes the decision obvious. We built it
          alongside owners, architects, and builders who&apos;ve been around
          residential building for decades, and we&apos;re still listening.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <span
            className="size-10 rounded-full flex items-center justify-center text-[12px] font-bold border border-border-accent text-accent-light shrink-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(0,212,200,0.30), rgba(26,95,212,0.30))",
            }}
          >
            AV
          </span>
          <div>
            <div className="text-[13px] font-semibold text-text">
              Aryan Vadera
            </div>
            <div className="text-[11px] text-text-dim">
              Founder · BuilderHQ
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-16 text-center">
        <h2 className="font-display uppercase tracking-[-0.012em] text-[clamp(2rem,3.6vw+0.5rem,3.6rem)] leading-[1.0] text-text">
          Ready to{" "}
          <span
            className="text-accent-light"
            style={{
              textShadow:
                "0 0 60px rgba(0,212,200,0.28), 0 0 120px rgba(0,212,200,0.10)",
            }}
          >
            build it
          </span>
          ?
        </h2>
        <p className="mt-5 mx-auto max-w-[44ch] text-[14px] leading-[1.7] text-text-subtle">
          Two minutes to publish your project. Verified builders take it
          from there.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 h-12 px-7 rounded-full bg-accent text-accent-contrast text-[13px] font-semibold tracking-[0.04em] hover:bg-accent-hover transition-colors duration-[160ms] shadow-[0_0_0_1px_rgba(0,212,200,0.4),_0_8px_28px_-8px_rgba(0,212,200,0.55)]"
          >
            Get started
            <ArrowUpRight className="size-4 transition-transform duration-[160ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
          <Link
            href="/faq"
            className="group inline-flex items-center gap-1.5 text-[13px] tracking-[0.02em] text-text-muted hover:text-text transition-colors duration-[160ms]"
          >
            Read the FAQ
            <ArrowUpRight className="size-3.5 opacity-60 transition-transform duration-[160ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
          </Link>
        </div>
      </section>
    </MarketingPageShell>
  );
}

function Pillar({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <article className="group relative rounded-md border border-border-subtle bg-[linear-gradient(180deg,rgba(10,26,42,0.55),rgba(6,18,30,0.78))] px-6 py-6 transition-[border-color,background-color] duration-[400ms] hover:border-border-accent/55 hover:bg-[linear-gradient(180deg,rgba(10,32,52,0.65),rgba(6,18,30,0.82))]">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-[400ms]"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,212,200,0.06), transparent 70%)",
        }}
      />
      <div className="relative flex items-start gap-3">
        <span className="size-9 rounded-md border border-border-accent/45 bg-[rgba(0,212,200,0.06)] text-accent-light flex items-center justify-center shrink-0">
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className="font-ui font-bold text-[15px] tracking-[-0.005em] text-text">
            {title}
          </h3>
          <p className="mt-1.5 text-[13px] leading-[1.65] text-text-subtle">
            {body}
          </p>
        </div>
      </div>
    </article>
  );
}
