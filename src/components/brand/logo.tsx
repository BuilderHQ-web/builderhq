import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * BuilderHQ logo.
 *
 * The source PNG is 500×500 with the visible mark+wordmark occupying
 * roughly a 260×80 strip in the centre. Rendering it as a normal image
 * and setting `height` makes the *padding* big and the logo itself
 * tiny. So we render it as a `background-image` and scale the bitmap
 * up so the visible glyph sits at exactly `height` pixels tall, then
 * crop the surrounding empty pixels via the box dimensions.
 *
 * Accepts `size` (legacy) or `height` (preferred). Both control the
 * height of the *visible* logo, not the full canvas.
 */

// Empirical measurements of the visible glyph inside the 500×500 PNG.
const SOURCE_PX = 500;
const VISIBLE_HEIGHT_PX = 95;
const VISIBLE_WIDTH_PX = 290;
const VISIBLE_ASPECT = VISIBLE_WIDTH_PX / VISIBLE_HEIGHT_PX; // ~3.05
const SCALE_FACTOR = SOURCE_PX / VISIBLE_HEIGHT_PX; // ~5.26

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
  const w = h * VISIBLE_ASPECT;
  const bgSize = h * SCALE_FACTOR;

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
        backgroundPosition: "center",
        backgroundSize: `${bgSize}px ${bgSize}px`,
      }}
    />
  );
}

/**
 * LogoMark — kept for legacy callers that wanted the raw square asset
 * (favicons, OG, social avatars). Same source as <Logo />.
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
