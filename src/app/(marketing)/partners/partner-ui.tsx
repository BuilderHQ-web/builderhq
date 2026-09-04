/**
 * Partner UI primitives — the controlled image + rating system.
 *
 * <PartnerAvatar> is the answer to "how do we show partner imagery
 * without different photos wrecking the aesthetic": whatever portrait a
 * partner supplies is rendered grayscale, under a role-hued duotone tint,
 * in a fixed frame. Mismatched sources come out looking like one system.
 * With no portrait, an elegant role-tinted monogram tile renders instead,
 * so the register never looks half-finished during onboarding.
 *
 * <GoogleRating> presents a verified rating as a single confident stat,
 * never a five-star directory row.
 *
 * <PartnerWorkCard> is the portfolio tile: one project, rendered
 * black-and-white and blooming to full colour on hover, lifting as a
 * single, unified motion. All of its hover timing flows from WORK_HOVER,
 * so every partner's grid animates identically and future tuning is one
 * edit.
 */

import type { CSSProperties } from "react";
import { ArrowUpRight, Image as ImageIcon, Star } from "lucide-react";

import { ROLE_PALETTE } from "@/components/landing/v2/content";
import { cn } from "@/lib/utils";
import type { Partner, PartnerKind, PartnerWork } from "./partners-data";

export function partnerHue(kind: PartnerKind) {
  return ROLE_PALETTE[kind];
}

type PartnerHue = ReturnType<typeof partnerHue>;

export function PartnerAvatar({
  partner,
  size = 56,
  className,
}: {
  partner: Partner;
  size?: number;
  className?: string;
}) {
  const h = partnerHue(partner.kind);
  const radius = size >= 96 ? 20 : size >= 72 ? 16 : 14;

  // A logo is not a photo — render it clean, never grayscale/duotoned.
  if (partner.logo) {
    // Light-on-dark logo: it carries its own dark background, so let it
    // fill the tile edge to edge rather than sit on white (where a white
    // wordmark would disappear).
    if (partner.logoDark) {
      return (
        <span
          className={cn("relative block shrink-0 overflow-hidden border", className)}
          style={{ width: size, height: size, borderRadius: radius, background: "#0d0d0d", borderColor: h.accent + "33" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={partner.logo}
            alt={partner.name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </span>
      );
    }
    // Otherwise, a dark mark on light: contained on a white tile with quiet
    // breathing room.
    return (
      <span
        className={cn("relative flex shrink-0 items-center justify-center overflow-hidden border bg-white", className)}
        style={{ width: size, height: size, borderRadius: radius, borderColor: h.accent + "26" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={partner.logo}
          alt={partner.name}
          loading="lazy"
          className="object-contain"
          // A square mark is limited by height and sits at 74% as before.
          // A wide lockup is limited by width, where 74% left the mark
          // looking undersized in the tile, so width may run to 88%.
          // logoScale lifts both caps for a mark that still reads small
          // at them, clamped so it never reaches the tile edge.
          style={{
            maxWidth: `${Math.min(94, 88 * (partner.logoScale ?? 1))}%`,
            maxHeight: `${Math.min(94, 74 * (partner.logoScale ?? 1))}%`,
          }}
        />
      </span>
    );
  }

  if (partner.portrait) {
    return (
      <span
        className={cn("relative block shrink-0 overflow-hidden border", className)}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          borderColor: h.accent + "38",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={partner.portrait}
          alt={partner.principal ? `${partner.principal}, ${partner.name}` : partner.name}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover grayscale contrast-[1.03]"
        />
        {/* Role-hued duotone: normalises any source photo into the palette. */}
        <span
          aria-hidden
          className="absolute inset-0 mix-blend-multiply"
          style={{ background: `linear-gradient(160deg, ${h.accent}1f, ${h.accentSoft}2e)` }}
        />
        {/* Catch-light so the frame reads as a designed surface. */}
        <span
          aria-hidden
          className="absolute inset-0"
          style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), inset 0 0 0 1px rgba(24,34,44,0.05)" }}
        />
      </span>
    );
  }

  // Monogram fallback — an intentional brand tile, not a missing image.
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden border font-ui font-semibold tracking-[-0.02em]",
        className,
      )}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        fontSize: Math.round(size * 0.3),
        background: `linear-gradient(155deg, ${h.accent}1c, ${h.accent}0d)`,
        borderColor: h.accent + "33",
        color: h.accentSoft,
      }}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1/2"
        style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.45), transparent)" }}
      />
      <span className="relative">{partner.monogram}</span>
    </span>
  );
}

/**
 * <StateBadge> — the state identifier chip, same family as the Google
 * rating chip: a quiet pill with the accent dot, so a row reads
 * "who · where · how rated" at a glance as the register goes national.
 */
export function StateBadge({
  state,
  className,
}: {
  state: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface-2 px-2.5 h-[26px] text-[11px] font-ui font-semibold tracking-[0.1em] text-text",
        className,
      )}
    >
      <span aria-hidden className="size-[5px] rounded-full bg-accent-light" />
      <span className="sr-only">Based in </span>
      {state}
    </span>
  );
}

const STAR_GOLD = "#e0a63c";

export function GoogleRating({
  rating,
  reviews,
  variant = "chip",
  className,
}: {
  rating: number;
  reviews: number;
  variant?: "chip" | "stat";
  className?: string;
}) {
  if (variant === "stat") {
    return (
      <div className={className}>
        <p className="flex items-baseline gap-1.5">
          <span className="font-ui font-semibold text-[19px] tracking-[-0.02em] text-text tabular-nums">
            {rating.toFixed(1)}
          </span>
          <Star className="size-4 translate-y-[-1px]" style={{ color: STAR_GOLD, fill: STAR_GOLD }} />
        </p>
        <p className="mt-1 text-[11px] leading-tight text-text-dim">
          Google · {reviews} reviews
        </p>
      </div>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface-2 pl-2 pr-2.5 h-[26px] text-[12px] font-medium text-text",
        className,
      )}
    >
      <Star className="size-3" style={{ color: STAR_GOLD, fill: STAR_GOLD }} />
      <span className="tabular-nums font-semibold">{rating.toFixed(1)}</span>
      <span className="text-text-dim">Google</span>
    </span>
  );
}

/**
 * The single source of truth for the portfolio hover — the house craft-tile
 * motion: a long 1.4s run on a fast-start, slow-settle curve, so the colour
 * return and zoom bloom in gradually and land without a snap (and reverse
 * just as gently). Every animated layer shares this one clock, so colour,
 * zoom, lift, ring and badge move as a single motion. Tune here once and
 * every partner grid follows.
 */
const WORK_HOVER: CSSProperties = {
  transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
  transitionDuration: "1400ms",
};

export function PartnerWorkCard({
  work,
  hue,
  href,
}: {
  work: PartnerWork;
  hue: PartnerHue;
  href?: string;
}) {
  const media = (
    <>
      <div
        className="relative aspect-square overflow-hidden rounded-2xl bg-black/[0.03] card-elev will-change-transform group-hover:-translate-y-1 group-hover:card-elev-lg"
        style={{ ...WORK_HOVER, transitionProperty: "transform, box-shadow" }}
      >
        {work.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={work.image}
            alt={`${work.title}, ${work.type}`}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover grayscale will-change-transform group-hover:scale-[1.04] group-hover:grayscale-0"
            style={{ ...WORK_HOVER, transitionProperty: "transform, filter" }}
          />
        ) : (
          <span
            className="absolute inset-0 flex flex-col items-center justify-center gap-2.5"
            style={{ background: `linear-gradient(155deg, ${hue.accent}12, ${hue.accent}06)` }}
          >
            <span
              className="flex size-11 items-center justify-center rounded-full"
              style={{ background: `${hue.accent}14`, color: hue.accentSoft }}
            >
              <ImageIcon className="size-5" strokeWidth={1.5} />
            </span>
            <span className="text-[11px] font-medium tracking-[0.02em]" style={{ color: hue.accentSoft }}>
              Photo to come
            </span>
          </span>
        )}
        {/* Resting edge — a whisper of a hairline, never a hard border. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{ boxShadow: "inset 0 0 0 1px rgba(20,28,36,0.05)" }}
        />
        {/* Accent edge, cross-fading in on the same clock as everything else. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100"
          style={{ ...WORK_HOVER, transitionProperty: "opacity", boxShadow: `inset 0 0 0 1px ${hue.accent}40` }}
        />
        {href ? (
          <span
            className="absolute right-3.5 top-3.5 inline-flex size-8 translate-y-0.5 items-center justify-center rounded-full bg-white/95 text-[#161c22] opacity-0 shadow-sm backdrop-blur-sm group-hover:translate-y-0 group-hover:opacity-100"
            style={{ ...WORK_HOVER, transitionProperty: "opacity, transform" }}
          >
            <ArrowUpRight className="size-4" />
          </span>
        ) : null}
      </div>
      <div className="mt-3.5">
        <p
          className="font-ui font-semibold text-[15px] tracking-[-0.01em] text-text group-hover:text-[var(--acc)]"
          style={{ ...WORK_HOVER, transitionProperty: "color" }}
        >
          {work.title}
        </p>
        <p className="mt-0.5 text-[12.5px] text-text-muted">
          {work.type}
          {work.year ? (
            <>
              <span aria-hidden className="mx-1.5 text-text-faint">·</span>
              {work.year}
            </>
          ) : null}
        </p>
      </div>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="group block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f4f1ea]"
        style={{ "--acc": hue.accentSoft, "--tw-ring-color": hue.accent + "99" } as CSSProperties}
      >
        {media}
      </a>
    );
  }
  return (
    <div className="group block" style={{ "--acc": hue.accentSoft } as CSSProperties}>
      {media}
    </div>
  );
}
