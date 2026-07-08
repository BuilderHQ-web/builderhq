import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { MarketingPageShell } from "@/components/landing/page-shell";
import { PartnerForm } from "@/components/landing/v2/partner-form";
import { ROLE_PALETTE } from "@/components/landing/v2/content";

import {
  ARCHITECT_PARTNERS,
  FINANCE_PARTNERS,
  type Partner,
} from "./partners-data";

/**
 * /partners — the Preferred Partner register.
 *
 * Deliberately NOT a directory: no search, no filters, no ratings, no
 * result counts. A register you are invited onto, presented the way a
 * gallery presents its artists: large editorial entries, a curatorial
 * voice, and the one sentence no directory can write, "no one can pay
 * to appear on this page." Small numbers read as curation, not scarcity.
 *
 * Two audiences, one page:
 *   homeowners  → find someone trustworthy, request an introduction
 *   partners    → see the prestige of membership, want in (Join CTAs)
 */

export const metadata: Metadata = {
  title: "Preferred Partners",
  description:
    "The architects and finance brokers BuilderHQ features, refers and introduces. Every partner personally invited and reviewed. No one can pay to appear.",
  alternates: { canonical: "/partners" },
};

const HUE = {
  architect: ROLE_PALETTE.architect,
  finance: ROLE_PALETTE.finance,
} as const;

export default function PartnersPage() {
  return (
    <MarketingPageShell
      kicker="Our Partners"
      title="The people we put our name behind."
      sub="Architects and finance brokers we feature, refer and introduce, each one personally invited and spoken with before joining. No one can pay to appear on this page."
    >
      {/* How the register works — the three rules that make it credible. */}
      <section className="rounded-xl border border-border-subtle bg-white card-elev px-6 sm:px-8 py-6 sm:py-7 mb-14 lg:mb-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
          <RegisterRule
            title="Personally invited"
            body="There is no open listing. We research, then we pick up the phone."
          />
          <RegisterRule
            title="Work reviewed first"
            body="Active, well documented residential work, checked before any invitation."
          />
          <RegisterRule
            title="No pay-to-appear"
            body="Membership is free and cannot be bought. Being here is earned."
          />
        </div>
      </section>

      {/* ── Architecture practices ──────────────────────────────────── */}
      <PartnerSection
        label="Architecture practices"
        intro="Practices with active, well documented residential work, chosen for the quality of what they build and how builders price it."
        partners={ARCHITECT_PARTNERS}
        hue={HUE.architect}
      />

      {/* ── Finance partners ────────────────────────────────────────── */}
      <PartnerSection
        label="Finance partners"
        intro="Brokers with genuine construction finance experience, chosen for how well their clients say they are looked after."
        partners={FINANCE_PARTNERS}
        hue={HUE.finance}
        className="mt-16 lg:mt-24"
      />

      {/* ── The two doors ───────────────────────────────────────────── */}
      <section className="mt-16 lg:mt-24 rounded-2xl border border-border-subtle bg-white card-elev overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border-subtle/70">
          <div className="p-7 sm:p-9">
            <p className="text-[11px] tracking-[0.22em] uppercase text-accent-light font-ui font-semibold">
              For practices and brokers
            </p>
            <h3 className="mt-3 font-ui font-semibold tracking-[-0.02em] text-[22px] leading-[1.2] text-text">
              Think you belong here?
            </h3>
            <p className="mt-2.5 text-[14px] leading-[1.65] text-text-muted max-w-[40ch]">
              Register your interest and we will take a proper look at your
              work. No fees, no contracts, and leaving takes one email.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <a
                href="#join-architect"
                className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full border text-[13px] font-semibold transition-colors hover:bg-[rgba(189,125,23,0.07)]"
                style={{ borderColor: HUE.architect.accent + "59", color: HUE.architect.accentSoft }}
              >
                Join as an architect
              </a>
              <a
                href="#join-finance"
                className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full border text-[13px] font-semibold transition-colors hover:bg-[rgba(106,63,202,0.07)]"
                style={{ borderColor: HUE.finance.accent + "59", color: HUE.finance.accentSoft }}
              >
                Join as a finance broker
              </a>
            </div>
          </div>

          <div className="p-7 sm:p-9">
            <p className="text-[11px] tracking-[0.22em] uppercase text-accent-light font-ui font-semibold">
              For homeowners
            </p>
            <h3 className="mt-3 font-ui font-semibold tracking-[-0.02em] text-[22px] leading-[1.2] text-text">
              Building soon?
            </h3>
            <p className="mt-2.5 text-[14px] leading-[1.65] text-text-muted max-w-[40ch]">
              Tell us what your build needs and we will introduce the partner
              who fits. No charge, no obligation.
            </p>
            <div className="mt-6">
              <a
                href="#request-intro"
                className="group inline-flex items-center gap-2 h-11 px-6 rounded-full bg-accent text-accent-contrast text-[13.5px] font-semibold hover:bg-accent-hover transition-colors"
              >
                Request an introduction
                <ArrowUpRight className="size-4 transition-transform duration-[180ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Sentinel-driven modal (join + introduction requests). */}
      <PartnerForm />
    </MarketingPageShell>
  );
}

/* ── Pieces ──────────────────────────────────────────────────────────── */

function RegisterRule({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="flex items-center gap-2 text-[13.5px] font-semibold text-text">
        <span
          aria-hidden
          className="size-[5px] rounded-full bg-accent-light shrink-0"
        />
        {title}
      </p>
      <p className="text-[12.5px] leading-[1.6] text-text-muted pl-[13px]">
        {body}
      </p>
    </div>
  );
}

function PartnerSection({
  label,
  intro,
  partners,
  hue,
  className,
}: {
  label: string;
  intro: string;
  partners: Partner[];
  hue: (typeof HUE)[keyof typeof HUE];
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="flex items-center gap-4">
        <h2
          className="text-[12px] tracking-[0.22em] uppercase font-ui font-semibold shrink-0"
          style={{ color: hue.accent }}
        >
          {label}
        </h2>
        <span aria-hidden className="h-px flex-1 bg-[rgba(24,34,44,0.10)]" />
      </div>
      <p className="mt-3 max-w-[58ch] text-[14.5px] leading-[1.65] text-text-muted">
        {intro}
      </p>

      <div className="mt-7 flex flex-col gap-3.5">
        {partners.map((p) => (
          <PartnerRow key={p.slug} partner={p} hue={hue} />
        ))}
      </div>
    </section>
  );
}

function PartnerRow({
  partner,
  hue,
}: {
  partner: Partner;
  hue: (typeof HUE)[keyof typeof HUE];
}) {
  return (
    <Link
      href={`/partners/${partner.slug}`}
      className="group relative block rounded-xl border border-border-subtle bg-white card-elev p-6 sm:p-7 transition-[border-color,transform,box-shadow] duration-[260ms] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:card-elev-lg"
      style={{ borderColor: undefined }}
    >
      {/* Role-hued top hairline, the same device the ecosystem cards use. */}
      <span
        aria-hidden
        className="absolute top-0 inset-x-8 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-[300ms]"
        style={{
          background: `linear-gradient(90deg, transparent, ${hue.accent}59, transparent)`,
        }}
      />
      <div className="flex items-start gap-4 sm:gap-5">
        {/* Monogram tile — carries the discipline hue. Swaps for a real
            logo when the partner supplies one. */}
        <span
          className="flex size-13 sm:size-14 shrink-0 items-center justify-center rounded-xl border font-ui font-semibold text-[17px] tracking-[-0.02em]"
          style={{
            background: hue.accent + "12",
            borderColor: hue.accent + "30",
            color: hue.accentSoft,
          }}
        >
          {partner.monogram}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h3 className="font-ui font-semibold tracking-[-0.015em] text-[18px] sm:text-[19px] leading-tight text-text">
              {partner.name}
            </h3>
            <span
              className="inline-flex items-center rounded-full border px-2.5 h-[22px] text-[9.5px] tracking-[0.14em] uppercase font-semibold"
              style={{
                color: hue.accentSoft,
                borderColor: hue.accent + "40",
                background: hue.accent + "0d",
              }}
            >
              Preferred Partner
            </span>
          </div>
          <p className="mt-1 text-[12.5px] text-text-dim">
            {partner.suburb}, {partner.state}
            <span aria-hidden className="mx-2 text-text-faint">·</span>
            {partner.disciplines.join("  ·  ")}
          </p>
          <p className="mt-2.5 max-w-[58ch] text-[14px] leading-[1.6] text-text-muted">
            {partner.tagline}
          </p>
        </div>

        <ArrowUpRight
          aria-hidden
          className="mt-1 size-[18px] shrink-0 text-text-faint transition-all duration-[220ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          style={{ color: undefined }}
        />
      </div>
    </Link>
  );
}
