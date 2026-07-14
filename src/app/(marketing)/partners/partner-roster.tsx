import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { PartnerForm } from "@/components/landing/v2/partner-form";

import {
  ARCHITECT_PARTNERS,
  FINANCE_PARTNERS,
  type Partner,
} from "./partners-data";
import {
  AustraliaStateMap,
  SectionCount,
  StateFilteredRows,
  StateFilterProvider,
} from "./partner-state-filter";
import { GoogleRating, PartnerAvatar, StateBadge, partnerHue } from "./partner-ui";

/**
 * PartnersRegister — the body shared by /partners, /partners/architects and
 * /partners/finance-brokers. A register, not a directory: no search, no
 * ratings sort, no result counts. A segmented control switches between the
 * three real routes (SEO + outreach friendly, no hidden dropdown), and the
 * rows read as editorial entries rather than list items.
 */

type Active = "all" | "architect" | "finance";

const SEGMENTS: Array<{ key: Active; label: string; href: string }> = [
  { key: "all", label: "All partners", href: "/partners" },
  { key: "architect", label: "Design partners", href: "/partners/architects" },
  { key: "finance", label: "Finance partners", href: "/partners/finance-brokers" },
];

export function PartnersRegister({ active }: { active: Active }) {
  const activePartners =
    active === "architect"
      ? ARCHITECT_PARTNERS
      : active === "finance"
        ? FINANCE_PARTNERS
        : [...ARCHITECT_PARTNERS, ...FINANCE_PARTNERS];
  const stateCounts: Record<string, number> = {};
  for (const p of activePartners) {
    stateCounts[p.state] = (stateCounts[p.state] ?? 0) + 1;
  }

  return (
    <StateFilterProvider>
      {/* How the register works — the three rules, framed warmly. */}
      <section className="rounded-xl border border-border-subtle bg-white card-elev px-6 sm:px-8 py-6 sm:py-7 mb-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
          <RegisterRule
            title="We reach out first"
            body="Every partner is someone we approached and got to know. There is no open sign-up."
          />
          <RegisterRule
            title="We know their work"
            body="We look at real, recent projects before we make any introduction."
          />
          <RegisterRule
            title="Never pay to appear"
            body="Placement here cannot be bought. It is how we keep the list worth trusting."
          />
        </div>
      </section>

      {/* The toolbar: what kind of partner on the left, where in the
          country on the right — the register's two axes, side by side.
          Top-aligned so the segmented control sits level with the
          "Across Australia" kicker. */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
        <SegmentedNav active={active} />
        <AustraliaStateMap counts={stateCounts} />
      </div>

      <div className="mt-10 flex flex-col gap-16 lg:gap-20">
        {(active === "all" || active === "architect") && (
          <PartnerSection
            label="Design partners"
            intro="Building designers and architects doing considered residential work, who we are glad to point homeowners toward."
            partners={ARCHITECT_PARTNERS}
            emptyLabel="design partners"
          />
        )}
        {(active === "all" || active === "finance") && (
          <PartnerSection
            label="Finance partners"
            intro="Brokers with real construction finance experience, and clients who speak well of them."
            partners={FINANCE_PARTNERS}
            emptyLabel="finance partners"
          />
        )}
      </div>

      {/* Cross-link on the single-type views, so neither side is a dead end. */}
      {active === "architect" ? (
        <CrossLink
          href="/partners/finance-brokers"
          text="Planning the finance too? Meet our finance partners"
        />
      ) : null}
      {active === "finance" ? (
        <CrossLink
          href="/partners/architects"
          text="Still need a designer? Meet our design partners"
        />
      ) : null}

      {/* The two doors. */}
      <section className="mt-16 lg:mt-20 rounded-2xl border border-border-subtle bg-white card-elev overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border-subtle/70">
          <div className="p-7 sm:p-9">
            <p className="text-[11px] tracking-[0.22em] uppercase text-accent-light font-ui font-semibold">
              For practices and brokers
            </p>
            <h3 className="mt-3 font-ui font-semibold tracking-[-0.02em] text-[22px] leading-[1.2] text-text">
              Doing work like this?
            </h3>
            <p className="mt-2.5 text-[14px] leading-[1.65] text-text-muted max-w-[42ch]">
              Introduce yourself and we will take a proper look at your work.
              No fees, no contracts, and leaving takes one email.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <JoinButton href="#join-architect" kind="architect" label="Join as a building designer" />
              <JoinButton href="#join-finance" kind="finance" label="Join as a finance broker" />
            </div>
          </div>

          <div className="p-7 sm:p-9">
            <p className="text-[11px] tracking-[0.22em] uppercase text-accent-light font-ui font-semibold">
              For homeowners
            </p>
            <h3 className="mt-3 font-ui font-semibold tracking-[-0.02em] text-[22px] leading-[1.2] text-text">
              Building soon?
            </h3>
            <p className="mt-2.5 text-[14px] leading-[1.65] text-text-muted max-w-[42ch]">
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

      {/* Sentinel-driven modal (joins + introduction requests). */}
      <PartnerForm />
    </StateFilterProvider>
  );
}

/* ── Pieces ──────────────────────────────────────────────────────────── */

function SegmentedNav({ active }: { active: Active }) {
  return (
    <nav
      aria-label="Filter partners"
      className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-surface-2 p-1"
    >
      {SEGMENTS.map((s) => {
        const on = s.key === active;
        return (
          <Link
            key={s.key}
            href={s.href}
            aria-current={on ? "page" : undefined}
            className={
              on
                ? "inline-flex items-center h-9 px-4 rounded-full bg-white card-elev text-[13px] font-semibold text-text"
                : "inline-flex items-center h-9 px-4 rounded-full text-[13px] font-medium text-text-muted hover:text-text transition-colors"
            }
          >
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}

function RegisterRule({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="flex items-center gap-2 text-[13.5px] font-semibold text-text">
        <span aria-hidden className="size-[5px] rounded-full bg-accent-light shrink-0" />
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
  emptyLabel,
}: {
  label: string;
  intro: string;
  partners: Partner[];
  emptyLabel: string;
}) {
  return (
    <section>
      <div className="flex items-center gap-4">
        <h2 className="text-[12px] tracking-[0.22em] uppercase font-ui font-semibold text-text-dim shrink-0">
          {label}
        </h2>
        <span aria-hidden className="h-px flex-1 bg-[rgba(24,34,44,0.10)]" />
        <span className="text-[12px] tabular-nums text-text-dim shrink-0">
          <SectionCount states={partners.map((p) => p.state)} />
        </span>
      </div>
      <p className="mt-3 max-w-[58ch] text-[14.5px] leading-[1.65] text-text-muted">
        {intro}
      </p>
      <div className="mt-6">
        <StateFilteredRows
          emptyLabel={emptyLabel}
          items={partners.map((p) => ({
            key: p.slug,
            state: p.state,
            node: <PartnerRow partner={p} />,
          }))}
        />
      </div>
    </section>
  );
}

function PartnerRow({ partner }: { partner: Partner }) {
  const h = partnerHue(partner.kind);
  return (
    <Link
      href={`/partners/${partner.slug}`}
      className="group relative block rounded-xl border border-border-subtle bg-white card-elev p-5 sm:p-6 transition-[transform,box-shadow] duration-[260ms] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:card-elev-lg"
    >
      <span
        aria-hidden
        className="absolute top-0 inset-x-8 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-[300ms]"
        style={{ background: `linear-gradient(90deg, transparent, ${h.accent}59, transparent)` }}
      />
      <div className="flex items-start gap-4 sm:gap-5">
        <PartnerAvatar partner={partner} size={60} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="font-ui font-semibold tracking-[-0.015em] text-[17.5px] sm:text-[19px] leading-tight text-text">
              {partner.name}
            </h3>
            <span
              className="inline-flex items-center rounded-full border px-2.5 h-[22px] text-[9.5px] tracking-[0.14em] uppercase font-semibold"
              style={{
                color: h.accentSoft,
                borderColor: h.accent + "40",
                background: h.accent + "0d",
              }}
            >
              Preferred Partner
            </span>
            <span className="ml-auto hidden sm:inline-flex items-center gap-2">
              <StateBadge state={partner.state} />
              {partner.google ? (
                <GoogleRating
                  rating={partner.google.rating}
                  reviews={partner.google.reviews}
                />
              ) : null}
            </span>
          </div>
          <p className="mt-1 text-[12.5px] text-text-dim">
            {partner.suburb}
            <span aria-hidden className="mx-2 text-text-faint">·</span>
            {partner.disciplines.join("  ·  ")}
          </p>
          <p className="mt-2.5 max-w-[60ch] text-[14px] leading-[1.6] text-text-muted">
            {partner.tagline}
          </p>
          <span className="mt-3 flex sm:hidden items-center gap-2">
            <StateBadge state={partner.state} />
            {partner.google ? (
              <GoogleRating
                rating={partner.google.rating}
                reviews={partner.google.reviews}
              />
            ) : null}
          </span>
        </div>

        <ArrowUpRight
          aria-hidden
          className="mt-1 hidden sm:block size-[18px] shrink-0 text-text-faint transition-transform duration-[220ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      </div>
    </Link>
  );
}

function JoinButton({
  href,
  kind,
  label,
}: {
  href: string;
  kind: "architect" | "finance";
  label: string;
}) {
  const h = partnerHue(kind);
  return (
    <a
      href={href}
      className="inline-flex items-center h-11 px-5 rounded-full border text-[13px] font-semibold transition-colors"
      style={{ borderColor: h.accent + "59", color: h.accentSoft }}
    >
      {label}
    </a>
  );
}

function CrossLink({ href, text }: { href: string; text: string }) {
  return (
    <Link
      href={href}
      className="group mt-10 inline-flex items-center gap-2 text-[13.5px] font-medium text-text-muted hover:text-text transition-colors"
    >
      {text}
      <ArrowUpRight className="size-4 transition-transform duration-[180ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </Link>
  );
}
