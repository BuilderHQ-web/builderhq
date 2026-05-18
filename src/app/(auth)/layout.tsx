import * as React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { GridOverlay } from "@/components/landing/grid-overlay";

/**
 * Auth shell — same atmospheric recipe as the landing.
 *
 * Three layered components sit behind the form:
 *
 *   1. **AuthAmbient** — two faint corner orbs (teal bottom-left,
 *      blue bottom-right). Same colour pulse as the landing's
 *      ambient, but tucked at the base of the viewport so they
 *      frame the centred form rather than crowd it.
 *   2. **GridOverlay** — the blueprint grid with the radial fade,
 *      imported directly from the landing.
 *   3. **NoiseLayer** — the inline fractal-noise overlay at 2.2%
 *      opacity. Same fine grain the landing has so the page reads
 *      as part of the same product.
 *
 * Base colour matches the landing (`#03080e`) so the auth surface
 * and the marketing surface share one canvas — login should feel
 * like a step inward, not a different building.
 *
 * Locked to `h-dvh overflow-hidden` so the composition stays put
 * — every auth page fits a single screen.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative h-dvh overflow-hidden bg-[#03080e] antialiased">
      <AuthAmbient />
      <GridOverlay />
      <NoiseLayer />

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

/**
 * Auth-tuned variant of the landing's <Ambient />. Same colour
 * pulses (teal + brand blue), but both orbs sit at the base of
 * the viewport — left for teal, right for blue — and opacity is
 * roughly half the landing's so they whisper rather than glow.
 */
function AuthAmbient() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div
        className="absolute -left-[12vw] -bottom-[14vw] w-[42vw] h-[42vw] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(0,212,200,0.30), transparent 60%)",
          filter: "blur(80px)",
          opacity: 0.22,
          animation: "ambFloat 22s ease-in-out infinite",
        }}
      />
      <div
        className="absolute -right-[12vw] -bottom-[14vw] w-[42vw] h-[42vw] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(26,95,212,0.30), transparent 60%)",
          filter: "blur(80px)",
          opacity: 0.20,
          animation: "ambFloat 18s ease-in-out infinite reverse",
        }}
      />
    </div>
  );
}

/** Same fractal-noise overlay the landing hero uses. */
function NoiseLayer() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[1] opacity-[0.022]"
      style={{
        backgroundImage:
          'url("data:image/svg+xml,%3Csvg viewBox=%270 0 200 200%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%27.75%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")',
        backgroundSize: "220px 220px",
      }}
    />
  );
}
