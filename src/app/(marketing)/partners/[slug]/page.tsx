import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Check, Globe } from "lucide-react";

import { MarketingPageShell } from "@/components/landing/page-shell";
import { PartnerForm } from "@/components/landing/v2/partner-form";
import { ROLE_PALETTE } from "@/components/landing/v2/content";

import { PARTNERS, getPartner, type Partner } from "../partners-data";

/**
 * /partners/[slug] — a Preferred Partner's page.
 *
 * Designed to be share-worthy: the partner's own clients and followers
 * should see a page the partner is proud to link. The centrepiece is the
 * curatorial note ("Why they're in the network"), written by BuilderHQ,
 * because an introduction from us has to mean something. Everything else
 * is quiet particulars: the practice, the work, how an introduction runs.
 */

export function generateStaticParams() {
  return PARTNERS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const partner = getPartner(slug);
  if (!partner) return {};
  return {
    title: `${partner.name} · Preferred Partner`,
    description: partner.tagline,
    alternates: { canonical: `/partners/${slug}` },
  };
}

const KIND_LABEL = {
  architect: "Architecture practice",
  finance: "Finance partner",
} as const;

export default async function PartnerProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const partner = getPartner(slug);
  if (!partner) notFound();

  const hue = ROLE_PALETTE[partner.kind];
  const others = [
    ...PARTNERS.filter((p) => p.kind === partner.kind && p.slug !== partner.slug),
    ...PARTNERS.filter((p) => p.kind !== partner.kind),
  ].slice(0, 2);

  return (
    <MarketingPageShell
      kicker={`Preferred Partner · ${KIND_LABEL[partner.kind]}`}
      title={partner.name}
      sub={partner.tagline}
      meta={`${partner.suburb}, ${partner.state} · In the network since ${partner.joined}`}
    >
      {/* Back to the register */}
      <Link
        href="/partners"
        className="group inline-flex items-center gap-1.5 text-[13px] font-medium text-text-muted hover:text-text transition-colors mb-10"
      >
        <ArrowLeft className="size-3.5 transition-transform duration-[180ms] group-hover:-translate-x-0.5" />
        All Preferred Partners
      </Link>

      {/* Why they're in the network — the curatorial note. This is the
          page's centrepiece and the thing no directory can offer. */}
      <section className="relative rounded-xl border border-border-subtle bg-white card-elev px-7 sm:px-9 py-8 sm:py-9 overflow-hidden">
        <span
          aria-hidden
          className="absolute top-0 inset-x-10 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${hue.accent}59, transparent)`,
          }}
        />
        <p
          className="text-[11px] tracking-[0.22em] uppercase font-ui font-semibold"
          style={{ color: hue.accent }}
        >
          Why they&rsquo;re in the network
        </p>
        <p className="mt-5 max-w-[62ch] font-ui text-[17px] sm:text-[18px] leading-[1.75] text-text">
          {partner.why}
        </p>
        <p className="mt-6 text-[12px] text-text-dim">
          Reviewed and invited by the BuilderHQ team.
        </p>
      </section>

      {/* The practice — about + particulars. */}
      <section className="mt-12 lg:mt-16">
        <SectionLabel hueAccent={hue.accent}>
          {partner.kind === "architect" ? "The practice" : "The business"}
        </SectionLabel>
        <p className="mt-4 max-w-[62ch] text-[15px] leading-[1.8] text-text-subtle">
          {partner.about}
        </p>

        <div className="mt-7 rounded-xl border border-border-subtle bg-white card-elev px-6 sm:px-8 py-6">
          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5">
            <Fact label="Established" value={partner.facts.established} />
            <Fact label="Based in" value={partner.facts.basedIn} />
            <Fact label="Serves" value={partner.facts.serves} />
            <Fact label="Focus" value={partner.facts.focus} />
          </dl>
          {partner.website ? (
            <div className="mt-6 pt-5 border-t border-border-subtle/70">
              <a
                href={partner.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-9 px-4 rounded-full border border-border-subtle bg-surface-2 text-[12.5px] font-medium text-text transition-colors hover:border-border-strong"
              >
                <Globe className="size-3.5 text-text-dim" />
                Visit website
                <ArrowUpRight className="size-3 text-text-dim" />
              </a>
            </div>
          ) : null}
        </div>
      </section>

      {/* Selected work (architects) / Where they help (brokers). */}
      {partner.work?.length ? (
        <section className="mt-12 lg:mt-16">
          <SectionLabel hueAccent={hue.accent}>Selected work</SectionLabel>
          <ul className="mt-5 rounded-xl border border-border-subtle bg-white card-elev overflow-hidden divide-y divide-border-subtle/60">
            {partner.work.map((w) => (
              <li
                key={w.title}
                className="flex items-baseline gap-4 px-6 sm:px-8 py-5"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-ui font-semibold text-[15px] tracking-[-0.01em] text-text">
                    {w.title}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-text-muted">
                    {w.suburb}
                    <span aria-hidden className="mx-2 text-text-faint">·</span>
                    {w.type}
                  </p>
                </div>
                <span className="font-mono text-[12px] tabular-nums text-text-dim shrink-0">
                  {w.year}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] text-text-dim">
            A sample of recent residential projects, shared with the
            practice&rsquo;s approval.
          </p>
        </section>
      ) : null}

      {partner.services?.length ? (
        <section className="mt-12 lg:mt-16">
          <SectionLabel hueAccent={hue.accent}>Where they help</SectionLabel>
          <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {partner.services.map((s) => (
              <li
                key={s}
                className="flex items-start gap-3 rounded-xl border border-border-subtle bg-white card-elev px-5 py-4 text-[14px] leading-[1.5] text-text"
              >
                <span
                  className="mt-[2px] inline-flex size-[18px] items-center justify-center rounded-full shrink-0"
                  style={{ background: hue.accent + "1f", color: hue.accentSoft }}
                >
                  <Check className="size-3" strokeWidth={3} />
                </span>
                {s}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* How an introduction works — the homeowner's next step, demystified. */}
      <section className="mt-12 lg:mt-16">
        <SectionLabel hueAccent={hue.accent}>
          How an introduction works
        </SectionLabel>
        <div className="mt-5 rounded-xl border border-border-subtle bg-white card-elev px-6 sm:px-8 py-6 sm:py-7">
          <ol className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            <IntroStep n="01" title="Ask us">
              Tell us what your build needs, two minutes, no account required.
            </IntroStep>
            <IntroStep n="02" title="We introduce">
              We connect you with {partner.name} directly, with context on
              your project.
            </IntroStep>
            <IntroStep n="03" title="You take it from there">
              The relationship is yours. We take no commission and no cut.
            </IntroStep>
          </ol>
          <p className="mt-6 pt-5 border-t border-border-subtle/70 text-[12.5px] text-text-dim">
            No charge, no obligation, and no detail shared without your say.
          </p>
        </div>
      </section>

      {/* The ask. */}
      <section className="mt-12 lg:mt-16 rounded-2xl border border-border-subtle bg-white card-elev px-7 sm:px-10 py-9 sm:py-11 text-center relative overflow-hidden">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 size-72 rounded-full opacity-60"
          style={{
            background: `radial-gradient(circle, ${hue.glow1}, transparent 70%)`,
          }}
        />
        <p
          className="relative text-[11px] tracking-[0.22em] uppercase font-ui font-semibold"
          style={{ color: hue.accent }}
        >
          Work with {partner.name}
        </p>
        <h2 className="relative mt-3 mx-auto max-w-[22ch] font-ui font-semibold tracking-[-0.03em] text-[clamp(1.7rem,2.6vw+0.5rem,2.4rem)] leading-[1.1] text-text">
          Start with an introduction.
        </h2>
        <p className="relative mt-3 mx-auto max-w-[46ch] text-[14px] leading-[1.65] text-text-muted">
          Ask us to connect you and we will make the introduction personally,
          with your project&rsquo;s context attached.
        </p>
        <div className="relative mt-7 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#request-intro"
            className="group inline-flex items-center gap-2 h-12 px-7 rounded-full bg-accent text-accent-contrast text-[13.5px] font-semibold hover:bg-accent-hover transition-colors"
          >
            Request an introduction
            <ArrowUpRight className="size-4 transition-transform duration-[180ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
          <Link
            href="/partners"
            className="inline-flex items-center gap-1.5 h-12 px-4 text-[13px] font-medium text-text-muted hover:text-text transition-colors"
          >
            Browse all partners
          </Link>
        </div>
      </section>

      {/* More from the network. */}
      {others.length ? (
        <section className="mt-12 lg:mt-16">
          <SectionLabel hueAccent="var(--color-accent-light)">
            More from the network
          </SectionLabel>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {others.map((o) => (
              <MiniPartner key={o.slug} partner={o} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Sentinel-driven modal (introduction requests + joins). */}
      <PartnerForm />
    </MarketingPageShell>
  );
}

/* ── Pieces ──────────────────────────────────────────────────────────── */

function SectionLabel({
  children,
  hueAccent,
}: {
  children: React.ReactNode;
  hueAccent: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <h2
        className="text-[12px] tracking-[0.22em] uppercase font-ui font-semibold shrink-0"
        style={{ color: hueAccent }}
      >
        {children}
      </h2>
      <span aria-hidden className="h-px flex-1 bg-[rgba(24,34,44,0.10)]" />
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10.5px] tracking-[0.16em] uppercase text-text-dim font-medium">
        {label}
      </dt>
      <dd className="mt-1.5 text-[13.5px] leading-[1.45] font-medium text-text">
        {value}
      </dd>
    </div>
  );
}

function IntroStep({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex flex-col gap-1.5">
      <p className="flex items-baseline gap-2.5">
        <span className="font-mono text-[12px] tabular-nums text-text-dim">
          {n}
        </span>
        <span className="text-[14px] font-semibold text-text">{title}</span>
      </p>
      <p className="text-[13px] leading-[1.6] text-text-muted pl-[30px]">
        {children}
      </p>
    </li>
  );
}

function MiniPartner({ partner }: { partner: Partner }) {
  const hue = ROLE_PALETTE[partner.kind];
  return (
    <Link
      href={`/partners/${partner.slug}`}
      className="group flex items-center gap-3.5 rounded-xl border border-border-subtle bg-white card-elev p-4 transition-[transform,box-shadow] duration-[240ms] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:card-elev-lg"
    >
      <span
        className="flex size-11 shrink-0 items-center justify-center rounded-lg border font-ui font-semibold text-[14px]"
        style={{
          background: hue.accent + "12",
          borderColor: hue.accent + "30",
          color: hue.accentSoft,
        }}
      >
        {partner.monogram}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-ui font-semibold text-[14.5px] tracking-[-0.01em] text-text truncate">
          {partner.name}
        </span>
        <span className="block text-[12px] text-text-dim truncate">
          {KIND_LABEL[partner.kind]}
          <span aria-hidden className="mx-1.5 text-text-faint">·</span>
          {partner.suburb}, {partner.state}
        </span>
      </span>
      <ArrowUpRight className="size-4 shrink-0 text-text-faint transition-transform duration-[200ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </Link>
  );
}
