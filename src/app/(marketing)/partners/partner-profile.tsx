import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Award, Check, Globe, Landmark, Star } from "lucide-react";

import { PartnerForm } from "@/components/landing/v2/partner-form";
import { cn } from "@/lib/utils";

import { PARTNERS, type Partner } from "./partners-data";
import { PartnerAvatar, PartnerWorkCard, partnerHue } from "./partner-ui";

/**
 * PartnerProfileSections — the body of a partner's page, shared by the
 * public route (/partners/[slug]) and the private preview route
 * (/partners/preview/[slug]). In `preview` mode the links that lead into
 * the wider directory are dropped, so a partner reviewing their own draft
 * only ever sees their own page.
 */

const STAR_GOLD = "#e0a63c";

export const KIND_LABEL = {
  architect: "Architecture practice",
  finance: "Finance partner",
} as const;

/** The label under "Preferred Partner", accurate to what the partner is
 *  (a building designer is not a registered architect, for instance). */
export function kindLabel(partner: Partner) {
  return partner.roleLabel ?? KIND_LABEL[partner.kind];
}

/** The identity header props, shared so both routes render the same title
 *  block (the public route hands these to MarketingPageShell). */
export function partnerHeaderProps(partner: Partner) {
  return {
    kicker: `Preferred Partner · ${kindLabel(partner)}`,
    title: partner.name,
    sub: partner.tagline,
    meta: `${partner.suburb}, ${partner.state} · In the network since ${partner.joined}`,
  };
}

export function PartnerProfileSections({
  partner,
  preview = false,
}: {
  partner: Partner;
  preview?: boolean;
}) {
  const h = partnerHue(partner.kind);

  // Three headline figures max — the band reads as a considered set, not
  // a table. Rating leads when we have one (with the review count folded
  // in beneath); a signature stat carries the third slot when it exists.
  // Hand-authored stats win outright; otherwise build the band from the
  // rating, founding year and a signature (or experience) stat.
  const figures: Array<{
    label: string;
    value: string;
    star?: boolean;
    sub?: string;
  }> = partner.stats ? [...partner.stats] : [];
  if (!partner.stats) {
    if (partner.google) {
      figures.push({
        label: "Google rating",
        value: partner.google.rating.toFixed(1),
        star: true,
        sub: `${partner.google.reviews} reviews`,
      });
    }
    if (partner.facts.established) {
      figures.push({ label: "Established", value: partner.facts.established });
    }
    if (partner.signature) {
      figures.push({ label: partner.signature.label, value: partner.signature.value });
    } else if (partner.facts.experience) {
      figures.push({ label: "Experience", value: partner.facts.experience });
    }
  }

  const others = preview
    ? []
    : [
        ...PARTNERS.filter(
          (p) => !p.draft && p.kind === partner.kind && p.slug !== partner.slug,
        ),
        ...PARTNERS.filter((p) => !p.draft && p.kind !== partner.kind),
      ].slice(0, 2);

  const showWorkImages =
    partner.work?.some((w) => w.image) || partner.workImagesPending;

  // Honours board data: the first award is the headline, the rest support.
  const awards = partner.awards ?? [];
  const heroAward = awards[0];

  return (
    <>
      {preview ? null : (
        <Link
          href="/partners"
          className="group inline-flex items-center gap-1.5 text-[13px] font-medium text-text-muted hover:text-text transition-colors mb-9"
        >
          <ArrowLeft className="size-3.5 transition-transform duration-[180ms] group-hover:-translate-x-0.5" />
          All Preferred Partners
        </Link>
      )}

      {/* Identity + headline figures — open on the canvas, big centred numbers. */}
      <section className="mb-8 lg:mb-10">
        <div className="flex flex-col items-center gap-10 sm:flex-row sm:items-center sm:gap-12 lg:gap-16">
          <div className="relative shrink-0">
            <span
              aria-hidden
              className="pointer-events-none absolute -inset-8"
              style={{ background: `radial-gradient(closest-side, ${h.glow1}, transparent 72%)` }}
            />
            {/* A face reads smaller than a full-bleed logo tile at the same
                box, so portraits get a 20% larger frame. */}
            <PartnerAvatar partner={partner} size={partner.portrait && !partner.logo ? 214 : 178} className="relative" />
          </div>
          {/* A real 3-row grid (label / value / sub-label) rather than
              independent flex columns: every value sits on the same
              baseline no matter how many lines a label wraps to. */}
          <dl
            className="grid w-full gap-x-6 sm:w-auto sm:flex-1"
            style={{
              gridTemplateColumns: `repeat(${figures.length}, minmax(0, 1fr))`,
              gridTemplateRows: "auto auto auto",
            }}
          >
            {figures.map((f, i) => (
              <dt
                key={`label-${f.label}`}
                className="text-[10.5px] tracking-[0.16em] uppercase text-text-dim font-medium text-center self-end"
                style={{ gridColumn: i + 1, gridRow: 1 }}
              >
                {f.label}
              </dt>
            ))}
            {figures.map((f, i) => (
              <dd
                key={`value-${f.label}`}
                className="mt-2.5 font-ui font-semibold tracking-[-0.02em] leading-none text-text tabular-nums text-[clamp(2.1rem,1.6vw+1.4rem,2.9rem)] text-center"
                style={{ gridColumn: i + 1, gridRow: 2 }}
              >
                <span className="inline-flex items-center gap-1.5">
                  {f.value}
                  {f.star ? (
                    <Star className="size-[0.6em]" style={{ color: STAR_GOLD, fill: STAR_GOLD }} />
                  ) : null}
                </span>
              </dd>
            ))}
            {figures.map((f, i) => (
              <p
                key={`sub-${f.label}`}
                className="mt-2 text-[11px] leading-none text-text-dim text-center"
                style={{ gridColumn: i + 1, gridRow: 3 }}
              >
                {f.sub ?? ""}
              </p>
            ))}
          </dl>
        </div>
      </section>

      {/* Institution credential — for individuals who carry a bank or firm
          behind them, the affiliation is the credibility. */}
      {partner.institution ? (
        <section className="mt-2 flex items-center gap-4 rounded-2xl border border-border-subtle bg-white card-elev px-6 sm:px-7 py-5">
          {partner.institution.logo ? (
            // The institution's own mark, full colour — a brand is its own
            // credential, so no tint and no disc behind it.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={partner.institution.logo}
              alt={partner.institution.name}
              loading="lazy"
              className="size-11 shrink-0 object-contain"
            />
          ) : (
            <span
              className="flex size-11 shrink-0 items-center justify-center rounded-full"
              style={{ background: `${h.accent}12`, color: h.accentSoft }}
            >
              <Landmark className="size-5" strokeWidth={1.75} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-ui font-semibold text-[15px] tracking-[-0.01em] text-text">
              {partner.institution.name}
            </p>
            {partner.institution.role ? (
              <p className="mt-0.5 text-[12.5px] text-text-muted">{partner.institution.role}</p>
            ) : null}
          </div>
          {partner.institution.note ? (
            <p className="hidden sm:block shrink-0 text-[11px] tracking-[0.14em] uppercase text-text-dim">
              {partner.institution.note}
            </p>
          ) : null}
        </section>
      ) : null}

      {/* Recognition — an honours board, not a list. The page's only dark
          moment: gold on deep ink, a medallion seal, the headline award
          carried large, and the supporting honours beneath a fine rule. */}
      {heroAward ? (
        <section
          className="relative mt-5 overflow-hidden rounded-2xl border card-elev px-6 sm:px-10 py-8 sm:py-9 text-center"
          style={{
            background: "linear-gradient(180deg, #161d26 0%, #10151c 100%)",
            borderColor: "rgba(224,166,60,0.32)",
          }}
        >
          {/* Gold bloom rising behind the seal. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(58% 70% at 50% 0%, rgba(224,166,60,0.13), transparent 72%)" }}
          />
          {/* Medallion seal. */}
          <span
            className="relative mx-auto flex size-12 items-center justify-center rounded-full border"
            style={{
              borderColor: "rgba(224,166,60,0.45)",
              background: "rgba(224,166,60,0.10)",
              color: "#e0b25c",
              boxShadow: "0 0 24px rgba(224,166,60,0.18)",
            }}
          >
            <Award className="size-5" strokeWidth={1.6} />
          </span>
          <p
            className="relative mt-4 font-ui font-semibold text-[10.5px] tracking-[0.3em] uppercase"
            style={{ color: "rgba(224,166,60,0.72)" }}
          >
            Recognition
          </p>
          <p className="relative mx-auto mt-3 max-w-[26ch] font-ui font-semibold tracking-[-0.02em] leading-[1.2] text-[clamp(1.3rem,1.2vw+0.95rem,1.7rem)] text-white">
            {heroAward.label}
          </p>
          {heroAward.sub ? (
            <p className="relative mt-2.5 text-[12.5px] tracking-[0.04em]" style={{ color: "rgba(224,178,92,0.92)" }}>
              {heroAward.sub}
            </p>
          ) : null}
          {awards.length > 1 ? (
            <>
              {/* Fine rule with a centre diamond, like an engraved plate. */}
              <div aria-hidden className="relative mx-auto mt-7 flex max-w-[380px] items-center gap-3">
                <span
                  className="h-px flex-1"
                  style={{ background: "linear-gradient(90deg, transparent, rgba(224,166,60,0.42))" }}
                />
                <span className="size-1.5 rotate-45" style={{ background: "rgba(224,166,60,0.6)" }} />
                <span
                  className="h-px flex-1"
                  style={{ background: "linear-gradient(90deg, rgba(224,166,60,0.42), transparent)" }}
                />
              </div>
              {/* A lone supporting honour sits centred; a pair divides. */}
              <div
                className={cn(
                  "relative mt-6 grid grid-cols-1 gap-5",
                  awards.length > 2 &&
                    "sm:grid-cols-2 sm:gap-0 sm:divide-x sm:divide-[rgba(224,166,60,0.16)]",
                )}
              >
                {awards.slice(1, 3).map((a) => (
                  <div key={a.label} className="sm:px-6">
                    <p className="font-ui font-medium text-[13.5px] leading-snug text-white/90">
                      {a.label}
                    </p>
                    {a.sub ? <p className="mt-1.5 text-[11.5px] leading-snug text-white/45">{a.sub}</p> : null}
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      {/* Why we introduce them — the curatorial note. */}
      <section className="relative mt-5 rounded-2xl border border-border-subtle bg-white card-elev px-7 sm:px-9 py-8 sm:py-9 overflow-hidden">
        <span
          aria-hidden
          className="absolute top-0 inset-x-10 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${h.accent}59, transparent)` }}
        />
        <p
          className="text-[11px] tracking-[0.22em] uppercase font-ui font-semibold"
          style={{ color: h.accent }}
        >
          Why we introduce them
        </p>
        <p className="mt-5 max-w-[62ch] font-ui text-[17px] sm:text-[18px] leading-[1.75] text-text">
          {partner.why}
        </p>
        <p className="mt-6 text-[12px] text-text-dim">
          Chosen and introduced by the BuilderHQ team.
        </p>
      </section>

      {/* The practice. */}
      <section className="mt-12 lg:mt-16">
        <SectionLabel hue={h.accent}>
          {partner.aboutLabel ?? (partner.kind === "architect" ? "The practice" : "The business")}
        </SectionLabel>
        <p className="mt-4 max-w-[62ch] text-[15px] leading-[1.8] text-text-subtle">
          {partner.about}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          {partner.principal ? (
            <p className="text-[13px] text-text-muted">
              Led by <span className="font-medium text-text">{partner.principal}</span>
            </p>
          ) : null}
          <p className="text-[13px] text-text-muted">
            Serves <span className="font-medium text-text">{partner.facts.serves}</span>
          </p>
          {/* Links, as one quiet cluster: the primary link as a labelled
              pill, socials as compact circles beside it. */}
          <span className="inline-flex items-center gap-2.5">
            {partner.website ? (
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
            ) : partner.instagram ? (
              <a
                href={partner.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-9 px-4 rounded-full border border-border-subtle bg-surface-2 text-[12.5px] font-medium text-text transition-colors hover:border-border-strong"
              >
                <InstagramGlyph className="size-3.5 text-text-dim" />
                View on Instagram
                <ArrowUpRight className="size-3 text-text-dim" />
              </a>
            ) : null}
            {partner.website && partner.instagram ? (
              <a
                href={partner.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${partner.name} on Instagram`}
                className="inline-flex size-9 items-center justify-center rounded-full border border-border-subtle bg-surface-2 text-text-muted transition-colors hover:border-border-strong hover:text-text"
              >
                <InstagramGlyph className="size-4" />
              </a>
            ) : null}
            {partner.facebook ? (
              <a
                href={partner.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${partner.name} on Facebook`}
                className="inline-flex size-9 items-center justify-center rounded-full border border-border-subtle bg-surface-2 text-text-muted transition-colors hover:border-border-strong hover:text-text"
              >
                <FacebookGlyph className="size-4" />
              </a>
            ) : null}
            {partner.linkedin ? (
              <a
                href={partner.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${partner.name} on LinkedIn`}
                className="inline-flex size-9 items-center justify-center rounded-full border border-border-subtle bg-surface-2 text-text-muted transition-colors hover:border-border-strong hover:text-text"
              >
                <LinkedInGlyph className="size-4" />
              </a>
            ) : null}
          </span>
        </div>
      </section>

      {/* Selected work (architects). */}
      {partner.work?.length ? (
        <section className="mt-12 lg:mt-16">
          <div className="flex items-end justify-between gap-4">
            <SectionLabel hue={h.accent}>Selected work</SectionLabel>
            {partner.galleryUrl ? (
              <a
                href={partner.galleryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group -mb-0.5 inline-flex shrink-0 items-center gap-1.5 text-[12.5px] font-ui font-medium text-text-muted transition-colors duration-[200ms] hover:text-text"
              >
                View full gallery
                <ArrowUpRight className="size-3.5 transition-transform duration-[200ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            ) : null}
          </div>
          {showWorkImages ? (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
              {partner.work.map((w) => (
                // Keyed by image: two projects may share a suburb title.
                <PartnerWorkCard key={w.image ?? w.title} work={w} hue={h} href={w.href ?? partner.galleryUrl} />
              ))}
            </div>
          ) : (
            <ul className="mt-5 rounded-xl border border-border-subtle bg-white card-elev overflow-hidden divide-y divide-border-subtle/60">
              {partner.work.map((w) => (
                <li key={w.title} className="flex items-baseline gap-4 px-6 sm:px-8 py-5">
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
                  {w.year ? (
                    <span className="font-mono text-[12px] tabular-nums text-text-dim shrink-0">
                      {w.year}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {/* Where they help (brokers). */}
      {partner.services?.length ? (
        <section className="mt-12 lg:mt-16">
          <SectionLabel hue={h.accent}>{partner.servicesLabel ?? "Where they help"}</SectionLabel>
          <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {partner.services.map((s) => (
              <li
                key={s}
                className="flex items-start gap-3 rounded-xl border border-border-subtle bg-white card-elev px-5 py-4 text-[14px] leading-[1.5] text-text"
              >
                <span
                  className="mt-[2px] inline-flex size-[18px] items-center justify-center rounded-full shrink-0"
                  style={{ background: h.accent + "1f", color: h.accentSoft }}
                >
                  <Check className="size-3" strokeWidth={3} />
                </span>
                {s}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* How an introduction works. */}
      <section className="mt-12 lg:mt-16">
        <SectionLabel hue={h.accent}>How an introduction works</SectionLabel>
        <div className="mt-5 rounded-xl border border-border-subtle bg-white card-elev px-6 sm:px-8 py-6 sm:py-7">
          <ol className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            <IntroStep n="01" title="Ask us">
              Tell us what your build needs. Two minutes, no account required.
            </IntroStep>
            <IntroStep n="02" title="We introduce">
              We connect you with {partner.name} directly, with a little
              context on your project.
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
          style={{ background: `radial-gradient(circle, ${h.glow1}, transparent 70%)` }}
        />
        <p
          className="relative text-[11px] tracking-[0.22em] uppercase font-ui font-semibold"
          style={{ color: h.accent }}
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
          {preview ? null : (
            <Link
              href="/partners"
              className="inline-flex items-center gap-1.5 h-12 px-4 text-[13px] font-medium text-text-muted hover:text-text transition-colors"
            >
              Browse all partners
            </Link>
          )}
        </div>
      </section>

      {/* More from the network — public only. */}
      {others.length ? (
        <section className="mt-12 lg:mt-16">
          <SectionLabel hue="var(--color-accent-light)">
            More from the network
          </SectionLabel>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {others.map((o) => (
              <MiniPartner key={o.slug} partner={o} />
            ))}
          </div>
        </section>
      ) : null}

      <PartnerForm />
    </>
  );
}

/* ── Pieces ──────────────────────────────────────────────────────────── */

/* Brand glyphs, inlined: this lucide-react build ships no brand icons. */

function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function FacebookGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function LinkedInGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function SectionLabel({
  children,
  hue,
}: {
  children: React.ReactNode;
  hue: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <h2
        className="text-[12px] tracking-[0.22em] uppercase font-ui font-semibold shrink-0"
        style={{ color: hue }}
      >
        {children}
      </h2>
      <span aria-hidden className="h-px flex-1 bg-[rgba(24,34,44,0.10)]" />
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
        <span className="font-mono text-[12px] tabular-nums text-text-dim">{n}</span>
        <span className="text-[14px] font-semibold text-text">{title}</span>
      </p>
      <p className="text-[13px] leading-[1.6] text-text-muted pl-[30px]">
        {children}
      </p>
    </li>
  );
}

function MiniPartner({ partner }: { partner: Partner }) {
  return (
    <Link
      href={`/partners/${partner.slug}`}
      className="group flex items-center gap-3.5 rounded-xl border border-border-subtle bg-white card-elev p-4 transition-[transform,box-shadow] duration-[240ms] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:card-elev-lg"
    >
      <PartnerAvatar partner={partner} size={44} />
      <span className="min-w-0 flex-1">
        <span className="block font-ui font-semibold text-[14.5px] tracking-[-0.01em] text-text truncate">
          {partner.name}
        </span>
        <span className="block text-[12px] text-text-dim truncate">
          {kindLabel(partner)}
          <span aria-hidden className="mx-1.5 text-text-faint">·</span>
          {partner.suburb}, {partner.state}
        </span>
      </span>
      <ArrowUpRight className="size-4 shrink-0 text-text-faint transition-transform duration-[200ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </Link>
  );
}
