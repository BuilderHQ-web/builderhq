import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft } from "lucide-react";

/**
 * Auth shell — silk composition over a brand-rendered backdrop.
 *
 * The backdrop is a single high-resolution JPG (`/brand/auth-silk.jpg`)
 * — photographic-quality teal silk drapes anchored in the top-right
 * and bottom-left corners with a dark dialogue space through the
 * middle for the form. Pre-rendered images are the right tool for
 * this look: CSS gradients and SVG can fake the *shape* of silk but
 * not the sub-surface light scattering and micro-texture that make
 * real fabric feel physical.
 *
 * Next.js's `<Image fill priority />` ensures the image loads first-
 * paint and is served in optimised formats (AVIF/WebP) per device.
 * `object-cover` keeps both drapes in frame across aspect ratios.
 *
 * Locked to `h-dvh overflow-hidden` so the silk never crops or
 * scrolls — every auth page composes itself to fit a single screen.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative h-dvh overflow-hidden bg-[#01040b] antialiased">
      {/* Brand silk backdrop. */}
      <Image
        src="/brand/auth-silk-v3.jpg"
        alt=""
        fill
        priority
        quality={95}
        sizes="100vw"
        className="object-cover pointer-events-none select-none"
        aria-hidden
      />

      {/* Subtle inner vignette — pushes the form a touch further
          into the dialogue space without dulling the silk peaks. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 42% 48% at 50% 50%, rgba(0,0,0,0.42), transparent 78%)",
        }}
      />

      {/* Top-left back-to-home affordance. */}
      <Link
        href="/"
        aria-label="Back to home"
        className="absolute z-20 top-5 left-5 sm:top-7 sm:left-8 inline-flex items-center gap-1.5 text-[13px] text-text-muted hover:text-text transition-colors font-ui font-medium"
        style={{ paddingTop: "max(0px, env(safe-area-inset-top))" }}
      >
        <ChevronLeft size={15} strokeWidth={2.2} />
        Home
      </Link>

      <main className="relative z-10 h-full flex items-center justify-center px-5 sm:px-8">
        <div className="w-full max-w-[420px] reveal">{children}</div>
      </main>
    </div>
  );
}
