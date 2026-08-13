import Link from "next/link";
import {
  ArrowUpRight,
  BadgeDollarSign,
  Calculator,
  ClipboardCheck,
  Gavel,
  Layers,
  Mail,
  Percent,
  Phone,
  Ruler,
  Scale,
  ShieldCheck,
} from "lucide-react";

import { MarketingPageShell } from "@/components/landing/page-shell";

export const metadata = {
  title: "About",
  description:
    "BuilderHQ prepares one scope of works for a residential project, runs the tender on it, and sets out every difference between the prices. Melbourne based.",
};

export default function AboutPage() {
  return (
    <MarketingPageShell
      kicker="About"
      title="Built for Australian residential construction."
      sub="BuilderHQ prepares one scope of works for a residential project, runs the tender on it, and sets out every difference between the tenders that come back. Melbourne based, operating Australia wide."
      meta="Last updated · 11 August 2026"
    >
      {/* What we are, plus the problem stated as an industry fact rather
          than a complaint. The paragraph a homeowner reads first. */}
      <section className="rounded-xl border border-border-subtle bg-white card-elev px-6 sm:px-7 lg:px-10 py-8 sm:py-10 lg:py-12 mb-12 lg:mb-20 relative overflow-hidden">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full opacity-50"
          style={{
            background:
              "radial-gradient(circle, rgba(0,212,200,0.14), transparent 70%)",
          }}
        />
        <span className="relative text-[11px] tracking-[0.22em] uppercase text-accent-light font-ui font-medium">
          What we are
        </span>
        <h2 className="relative mt-4 font-ui font-semibold tracking-[-0.03em] text-[clamp(1.6rem,2.6vw+0.5rem,2.6rem)] leading-[1.05] text-text">
          One scope of works,
          <br />
          <span className="text-accent-light">priced by every builder</span>.
        </h2>
        <p className="relative mt-6 max-w-[62ch] text-[15px] leading-[1.85] text-text-subtle">
          You upload the drawings, reports and specifications for your
          project. Our software reads them and writes out every item of work
          they cover, in plain language, with each line pointing back to the
          document, page and revision it came from. On a typical single
          dwelling that runs to roughly 242 items across 29 trades. Verified
          builders then price that same list, line by line, and answer the
          same questions under signature. You see where the prices differ
          before you choose one.
        </p>
        <p className="relative mt-5 max-w-[62ch] text-[15px] leading-[1.85] text-text-subtle">
          The reason we exist is a plain fact of the industry. Residential
          quotes are priced against no shared standard, so three prices for
          the same house cover three different sets of work and cannot be
          compared on the number alone. What nobody priced does not go away.
          It returns during construction as a variation, at a price nobody
          competed on.
        </p>
      </section>

      {/* Pillars */}
      <section className="mb-12 lg:mb-20">
        <span className="text-[11px] tracking-[0.22em] uppercase text-accent-light font-ui font-medium">
          Platform integrity
        </span>
        <h2 className="mt-4 font-ui font-semibold tracking-[-0.03em] text-[clamp(1.5rem,2.4vw+0.5rem,2.4rem)] leading-[1.05] text-text mb-6 sm:mb-8">
          Four principles, every round.
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Pillar
            icon={<ShieldCheck className="size-4" />}
            title="Verified before pricing"
            body="We check each builder’s ABN against the Australian Business Register, and their licence against the state register where one connects and by our team where it does not. Insurances are declared under signature with the tender."
          />
          <Pillar
            icon={<Layers className="size-4" />}
            title="One shared scope"
            body="The client approves one scope of works. Every builder prices that same list, marking each item included, provisional sum, excluded or not applicable."
          />
          <Pillar
            icon={<Scale className="size-4" />}
            title="Open, weighted scoring"
            body="Six dimensions with fixed weights, published before the round opens and applied to every tender on it. Each score sets out the points earned and the points not earned."
          />
          <Pillar
            icon={<BadgeDollarSign className="size-4" />}
            title="Free for clients"
            body="Homeowners and design practices pay nothing. A builder pays a one off fee for a spot on an open round, from $49 for a renovation to $199 for multi dwelling work. Builders you invite pay nothing."
          />
        </div>
      </section>

      {/* How the scope is produced, and the two human gates it passes
          through before a builder ever sees it. */}
      <section className="rounded-xl border border-border-subtle bg-white card-elev px-6 sm:px-7 lg:px-10 py-8 sm:py-10 lg:py-12 mb-12 lg:mb-20 relative overflow-hidden">
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-20 size-72 rounded-full opacity-50"
          style={{
            background:
              "radial-gradient(circle, rgba(26,95,212,0.16), transparent 70%)",
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-2.5">
            <span className="size-9 rounded-md border border-border-accent/45 bg-[rgba(0,212,200,0.06)] text-accent-light flex items-center justify-center shrink-0">
              <ClipboardCheck className="size-4" />
            </span>
            <span className="text-[11px] tracking-[0.22em] uppercase text-accent-light font-ui font-medium">
              How the scope is made
            </span>
          </div>
          <h2 className="mt-5 font-ui font-semibold tracking-[-0.03em] text-[clamp(1.6rem,2.6vw+0.5rem,2.6rem)] leading-[1.05] text-text">
            Written from your documents,
            <br />
            <span className="text-accent-light">checked by two people</span>.
          </h2>
          <p className="mt-6 max-w-[62ch] text-[15px] leading-[1.85] text-text-subtle">
            The software reads every drawing, report and specification on the
            project and drafts the scope of works from them. Every line names
            the document, page and revision it came from. Anything that cannot
            be traced back to a document is removed.
          </p>
          <p className="mt-5 max-w-[62ch] text-[15px] leading-[1.85] text-text-subtle">
            Then two people check it. A member of our team reviews every line
            before it leaves us. The client reviews it after that, and nothing
            reaches a builder until the client approves it.
          </p>

          {/* The three stages, so the two gates are visible at a glance
              rather than buried in the prose above. */}
          <div className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <StagePill
              label="Drafted from the documents"
              detail="Every line cited to its source"
            />
            <StagePill
              label="Checked by our team"
              detail="Line by line, before it goes out"
            />
            <StagePill
              label="Approved by the client"
              detail="Nothing moves until it is"
            />
          </div>
        </div>
      </section>

      {/* The refusals. On a tender, what the party running it will not do
          matters as much as what it does. */}
      <section className="mb-12 lg:mb-20">
        <span className="text-[11px] tracking-[0.22em] uppercase text-accent-light font-ui font-medium">
          Where we stop
        </span>
        <h2 className="mt-4 font-ui font-semibold tracking-[-0.03em] text-[clamp(1.5rem,2.4vw+0.5rem,2.4rem)] leading-[1.05] text-text">
          What we will not do.
        </h2>
        <p className="mt-5 mb-6 sm:mb-8 max-w-[62ch] text-[14.5px] leading-[1.8] text-text-subtle">
          A tender is only worth running if the party running it has no stake
          in the result. These are the lines we hold.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Limit
            icon={<Ruler className="size-4" />}
            title="We do not measure"
            body="BuilderHQ takes no quantities off a drawing. The scope lists the work. Each builder measures and prices it themselves."
          />
          <Limit
            icon={<Calculator className="size-4" />}
            title="We do not estimate"
            body="We put no cost, rate or allowance against any item. Every figure on your round comes from a builder, not from us."
          />
          <Limit
            icon={<Gavel className="size-4" />}
            title="We do not recommend"
            body="We score every tender the same way and set out the differences item by item. We never name a preferred builder and we never choose one for you."
          />
          <Limit
            icon={<Percent className="size-4" />}
            title="We take no commission"
            body="The building contract is between the client and the builder. We are not a party to it, we hold no construction funds, and we take nothing from either side."
          />
        </div>
      </section>

      {/* Who’s behind it. Real particulars, the section a sceptic comes
          to the About page for. */}
      <section className="rounded-xl border border-border-subtle bg-white card-elev px-6 sm:px-7 lg:px-10 py-8 sm:py-10 lg:py-12 mb-12 lg:mb-20 relative overflow-hidden">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-24 -left-20 size-72 rounded-full opacity-50"
          style={{
            background:
              "radial-gradient(circle, rgba(0,212,200,0.12), transparent 70%)",
          }}
        />
        <div className="relative">
          <span className="text-[11px] tracking-[0.22em] uppercase text-accent-light font-ui font-medium">
            Who’s behind it
          </span>
          <h2 className="mt-4 font-ui font-semibold tracking-[-0.03em] text-[clamp(1.6rem,2.6vw+0.5rem,2.6rem)] leading-[1.05] text-text">
            Australian, and
            <br />
            <span className="text-accent-light">based in Melbourne</span>.
          </h2>
          <p className="mt-6 max-w-[62ch] text-[15px] leading-[1.85] text-text-subtle">
            BuilderHQ is an Australian company, built and run from Melbourne,
            and working with clients and builders across the country. It was
            built by people who have worked in residential construction and
            saw the same problem from the inside: three quotes for one job,
            none of them covering the same work. The platform is made for
            Australian residential construction: the way homes here are
            documented, the way state licensing works, and the way a
            residential contract is signed directly between a client and a
            builder.
          </p>
          <p className="mt-5 max-w-[62ch] text-[15px] leading-[1.85] text-text-subtle">
            BuilderHQ is in association with the Housing Industry
            Association, Australia&rsquo;s peak body for residential building.
          </p>
          <p className="mt-5 max-w-[62ch] text-[15px] leading-[1.85] text-text-subtle">
            Every builder application is reviewed by a person. Every scope of
            works is checked by a person before the client sees it. If you
            would like to speak to someone before you sign up, our details are
            below.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            <ContactChip
              icon={<Phone className="size-3.5" />}
              label="0416 926 380"
              href="tel:0416926380"
            />
            <ContactChip
              icon={<Phone className="size-3.5" />}
              label="0452 280 062"
              href="tel:0452280062"
            />
            <ContactChip
              icon={<Mail className="size-3.5" />}
              label="info@builderhq.com.au"
              href="mailto:info@builderhq.com.au"
            />
          </div>

          <p className="mt-8 pt-6 border-t border-border-subtle/70 text-[12px] leading-[1.7] text-text-dim">
            BuilderHQ · ABN 70 697 584 722 · Melbourne, Victoria, Australia
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-12 sm:mt-16 text-center">
        <h2 className="font-ui font-semibold tracking-[-0.03em] text-[clamp(2rem,3.6vw+0.5rem,3.6rem)] leading-[1.0] text-text">
          Ready to <span className="text-accent-light">build it</span>?
        </h2>
        <p className="mt-5 mx-auto max-w-[46ch] text-[14px] leading-[1.7] text-text-subtle">
          Upload the drawings. We prepare the scope of works, and verified
          builders price it.
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
            className="group inline-flex items-center gap-1.5 h-12 px-3 text-[13px] tracking-[0.02em] text-text-muted hover:text-text transition-colors duration-[160ms]"
          >
            Read the FAQ
            <ArrowUpRight className="size-3.5 opacity-60 transition-transform duration-[160ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
          </Link>
        </div>
      </section>
    </MarketingPageShell>
  );
}

function ContactChip({
  icon,
  label,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 h-10 px-4 rounded-full border border-border-subtle bg-surface-2 text-[13px] font-medium text-text transition-colors hover:border-border-accent/50 hover:bg-[rgba(0,212,200,0.05)]"
    >
      <span className="text-accent-light">{icon}</span>
      {label}
    </a>
  );
}

function StagePill({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="px-4 py-3 rounded-lg border border-border-accent/30 bg-[rgba(0,212,200,0.04)]">
      <div className="text-[12px] font-semibold text-text">{label}</div>
      <div className="text-[10.5px] text-text-dim mt-0.5">{detail}</div>
    </div>
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
    <article className="group relative rounded-xl border border-border-subtle bg-white card-elev px-6 py-6 transition-[border-color,box-shadow] duration-[400ms] hover:border-border-accent/55 hover:shadow-[0_12px_32px_-20px_rgba(24,34,44,0.3)]">
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

/**
 * Same card as Pillar, in a deliberately quieter register: the icon
 * chip is neutral rather than teal, so the refusals read as statements
 * of fact rather than features being sold.
 */
function Limit({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <article className="relative rounded-xl border border-border-subtle bg-white card-elev px-6 py-6">
      <div className="flex items-start gap-3">
        <span className="size-9 rounded-md border border-border-subtle bg-surface-2 text-text-muted flex items-center justify-center shrink-0">
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
