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
 */

import { Star } from "lucide-react";

import { ROLE_PALETTE } from "@/components/landing/v2/content";
import { cn } from "@/lib/utils";
import type { Partner, PartnerKind } from "./partners-data";

export function partnerHue(kind: PartnerKind) {
  return ROLE_PALETTE[kind];
}

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
          style={{ width: "74%", height: "74%" }}
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
