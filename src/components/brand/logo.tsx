import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * BuilderHQ wordmark — brand-locked.
 *
 * Renders "BUILDER" + "HQ" in Bebas Neue with the HQ accented in teal,
 * matching the nav and footer treatment in reference/landing/index.html.
 *
 * For most cases use <Logo />. Reach for <LogoMark /> only where the
 * graphical 500x500 mark from /public/brand/ is needed (favicons, OG
 * images, app icons, social avatars).
 */
export function Logo({
  className,
  size = 26,
  inverse = false,
  href,
}: {
  className?: string;
  /** Wordmark height target in px — controls font-size. */
  size?: number;
  /** Render in inverse (dark on light), e.g. on accent backgrounds. */
  inverse?: boolean;
  /** If provided, wraps in <a>. Otherwise renders as <span>. */
  href?: string;
}) {
  const Tag = href ? "a" : "span";
  return (
    <Tag
      {...(href ? { href } : {})}
      aria-label="BuilderHQ"
      className={cn(
        "inline-flex items-baseline leading-none select-none",
        "font-display tracking-[0.08em]",
        inverse ? "text-bg" : "text-text",
        className,
      )}
      style={{ fontSize: size }}
    >
      <span>BUILDER</span>
      <em
        className={cn(
          "not-italic",
          inverse ? "text-bg" : "text-accent",
        )}
      >
        HQ
      </em>
    </Tag>
  );
}

/**
 * LogoMark — the graphical brand mark. Use only where an image asset is
 * required (favicons, OG images, app icons, social avatars). For UI use
 * <Logo /> — it's vector-perfect at every size, recolours via CSS, and
 * works across every breakpoint.
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
