import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * BuilderHQ logo.
 *
 * Renders the official PNG asset (mark + wordmark) so the brand reads
 * consistently everywhere. The PNG canvas is 500×500 with the visible
 * logo centred — `w-auto` preserves the aspect ratio at any height.
 *
 * Accepts `size` (legacy) or `height` (preferred). Both set the same
 * rendered height in pixels; width auto-scales.
 */
export function Logo({
  className,
  size,
  height,
  alt = "BuilderHQ",
}: {
  className?: string;
  /** Legacy alias for `height`. Either prop works. */
  size?: number;
  /** Rendered height in px. Width auto-scales by aspect ratio. */
  height?: number;
  alt?: string;
}) {
  const h = height ?? size ?? 28;
  return (
    <Image
      src="/brand/BuilderHQ_White_Text.png"
      alt={alt}
      width={500}
      height={500}
      priority
      className={cn("inline-block w-auto select-none", className)}
      style={{ height: h }}
    />
  );
}

/**
 * LogoMark — kept for legacy callers that wanted a square graphical
 * asset (favicons, OG images, app icons, social avatars).
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
