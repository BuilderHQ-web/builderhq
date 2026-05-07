import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * BuilderHQ logo.
 *
 * The source PNG is 500×500 with the visible mark+wordmark in a
 * 327×80 strip centred at (221.5, 245) — i.e. *not* centred in the
 * canvas (it's offset 28.5px left of horizontal centre). Rendering
 * the raw image and setting `height` makes the empty padding huge
 * and the glyph tiny, so we render it as a `background-image` and
 * scale + offset the bitmap so the visible glyph sits exactly inside
 * the box at the requested height.
 *
 * Accepts `size` (legacy alias) or `height`. Both control the height
 * of the *visible* logo, not the full canvas.
 */

// Measured directly from the source PNG (Pillow getbbox).
const SRC_PX = 500;
const GLYPH_W = 327;
const GLYPH_H = 80;
const GLYPH_CX = 221.5;
const GLYPH_CY = 245;
const GLYPH_ASPECT = GLYPH_W / GLYPH_H; // ~4.09
const SCALE = SRC_PX / GLYPH_H; // ~6.25

export function Logo({
  className,
  size,
  height,
  alt = "BuilderHQ",
}: {
  className?: string;
  /** Legacy alias for `height`. */
  size?: number;
  /** Visible logo height in px (not the full canvas). */
  height?: number;
  alt?: string;
}) {
  const h = height ?? size ?? 28;
  const w = h * GLYPH_ASPECT;

  // Scaled bitmap dimensions (square, since source is square).
  const bgSize = h * SCALE;

  // Per-pixel scale from source space to rendered space.
  const px = h / GLYPH_H;

  // We want the glyph centre to sit at the box centre. With
  // background-position (x, y), we offset the background image so
  // that the *glyph centre* aligns with (w/2, h/2).
  // Required: positionX - GLYPH_CX*px = w/2 - bgSize/2 (when glyph
  // would have been at canvas centre). Simpler: top-left of bg goes
  // to (w/2 - GLYPH_CX*px, h/2 - GLYPH_CY*px).
  const bgX = w / 2 - GLYPH_CX * px;
  const bgY = h / 2 - GLYPH_CY * px;

  return (
    <span
      role="img"
      aria-label={alt}
      className={cn("inline-block select-none align-middle", className)}
      style={{
        height: h,
        width: w,
        backgroundImage: 'url("/brand/BuilderHQ_White_Text.png")',
        backgroundRepeat: "no-repeat",
        backgroundPosition: `${bgX}px ${bgY}px`,
        backgroundSize: `${bgSize}px ${bgSize}px`,
      }}
    />
  );
}

/**
 * LogoMark — kept for legacy callers that wanted the raw square asset
 * (favicons, OG images, social avatars). Same source as <Logo />.
 */
export function LogoMark({
  size = 48,
  className,
  alt = "BuilderHQ",
}: {
  size?: number;
  className?: string;
  alt?: string;
}) {
  return (
    <Image
      src="/brand/BuilderHQ_White_Text.png"
      alt={alt}
      width={size}
      height={size}
      priority={false}
      className={cn("inline-block", className)}
    />
  );
}
